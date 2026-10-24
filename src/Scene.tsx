import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import ArchitectureArt, { type LightId, type SpaceId } from './ArchitectureArt'
import treeModels from './art/garden-trees.json'
import './scene.css'

type SceneProps = { space: SpaceId; light: LightId; motion: boolean }
type LiveScene = { render: () => void; apply: (props: SceneProps) => void }

const lightPalettes = {
  morning: { sky: '#ded5bf', ground: '#d9ccb0', sun: '#fff1d2', sunX: -9, sunY: 12, exposure: 1.15, water: '#739d95' },
  noon: { sky: '#e8e1d2', ground: '#e3d8c0', sun: '#fff9e6', sunX: 3, sunY: 18, exposure: 1.17, water: '#79aaa2' },
  dusk: { sky: '#c9b5a3', ground: '#c6b497', sun: '#ffbb83', sunX: -15, sunY: 5, exposure: 1.05, water: '#557c7b' },
} as const

function stoneTexture() {
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = 256
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = '#e2d5b8'
  ctx.fillRect(0, 0, 256, 256)
  let seed = 18
  const random = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647 }
  for (let i = 0; i < 12000; i++) {
    const x = random() * 256, y = random() * 256
    ctx.fillStyle = random() > .5 ? 'rgba(97,81,55,.09)' : 'rgba(255,251,229,.3)'
    ctx.fillRect(x, y, random() * 3 + .3, random() * .6 + .3)
  }
  for (let y = 0; y < 256; y += 21) {
    ctx.strokeStyle = 'rgba(105,91,64,.06)'
    ctx.beginPath(); ctx.moveTo(0, y); ctx.bezierCurveTo(70, y - 3, 180, y + 3, 256, y - 1); ctx.stroke()
  }
  const texture = new THREE.CanvasTexture(canvas)
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping
  texture.repeat.set(2, 2)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = 2
  return texture
}

function portal(width: number, height: number, thickness: number, openings: number, material: THREE.Material) {
  const shape = new THREE.Shape()
  shape.moveTo(-width / 2, 0); shape.lineTo(width / 2, 0); shape.lineTo(width / 2, height); shape.lineTo(-width / 2, height); shape.closePath()
  const archWidth = openings === 1 ? width * .45 : width * .29
  for (let i = 0; i < openings; i++) {
    const middle = openings === 1 ? 0 : (i === 0 ? -width * .23 : width * .23)
    const radius = archWidth / 2
    const spring = height * .51
    const path = new THREE.Path()
    path.moveTo(middle - radius, .005)
    path.lineTo(middle - radius, spring)
    path.absarc(middle, spring, radius, Math.PI, 0, true)
    path.lineTo(middle + radius, .005)
    path.closePath()
    shape.holes.push(path)
  }
  const geometry = new THREE.ExtrudeGeometry(shape, { depth: thickness, bevelEnabled: true, bevelThickness: .025, bevelSize: .025, bevelSegments: 1, curveSegments: 36, steps: 1 })
  const mesh = new THREE.Mesh(geometry, material)
  mesh.castShadow = mesh.receiveShadow = true
  return mesh
}

function box(w: number, h: number, d: number, material: THREE.Material, x: number, y: number, z: number) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material)
  mesh.position.set(x, y, z)
  mesh.castShadow = mesh.receiveShadow = true
  return mesh
}

/** Indexed meshes and smooth normals authored and exported in Blender 5.2. */
function gardenTree(kind: 'cypress' | 'olive', material: THREE.Material, trunkMaterial: THREE.Material, x: number, z: number, scale = 1) {
  const tree = new THREE.Group()
  for (const part of treeModels.models[kind]) {
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(Float32Array.from(part.positions, value => value / treeModels.positionScale), 3))
    geometry.setAttribute('normal', new THREE.BufferAttribute(Float32Array.from(part.normals, value => value / treeModels.normalScale), 3))
    geometry.setIndex(part.indices)
    const mesh = new THREE.Mesh(geometry, part.material === 'foliage' ? material : trunkMaterial)
    mesh.castShadow = mesh.receiveShadow = true
    tree.add(mesh)
  }
  tree.position.set(x, .2, z); tree.scale.setScalar(scale)
  return tree
}

export default function Scene(props: SceneProps) {
  const { space, light, motion } = props
  const outer = useRef<HTMLDivElement>(null)
  const mount = useRef<HTMLDivElement>(null)
  const current = useRef(props)
  const live = useRef<LiveScene | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => { const next = { space, light, motion }; current.current = next; live.current?.apply(next) }, [space, light, motion])

  useEffect(() => {
    const holder = mount.current
    const wrapper = outer.current
    if (!holder || !wrapper) return
    let renderer: THREE.WebGLRenderer
    try {
      const canvas = document.createElement('canvas')
      const context = canvas.getContext('webgl2', { antialias: true, alpha: false, powerPreference: 'low-power' })
      if (!context) return
      renderer = new THREE.WebGLRenderer({ canvas, context, antialias: true, alpha: false, powerPreference: 'low-power' })
    } catch { return }
    let disposed = false, lost = false, inView = false, hasRendered = false, frame = 0, lastTime = 0, elapsed = 0
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
    const canMove = () => current.current.motion && !reducedMotion.matches
    const pointer = new THREE.Vector2(), target = new THREE.Vector2()
    let scroll = 0
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5))
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFShadowMap
    renderer.shadowMap.autoUpdate = false
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.domElement.setAttribute('aria-hidden', 'true')
    holder.appendChild(renderer.domElement)

    const scene = new THREE.Scene()
    scene.background = new THREE.Color(lightPalettes.morning.sky)
    scene.fog = new THREE.Fog(lightPalettes.morning.sky, 32, 85)
    const camera = new THREE.PerspectiveCamera(34, 1, .1, 140)
    const lookAt = new THREE.Vector3(0, 1.65, .6)
    const baseCamera = new THREE.Vector3(12.5, 9.8, 16.5)
    camera.position.copy(baseCamera)
    camera.lookAt(lookAt)
    const texture = stoneTexture()
    const limestone = new THREE.MeshStandardMaterial({ color: '#d9c6a5', map: texture, roughness: .9, metalness: 0 })
    const paleStone = new THREE.MeshStandardMaterial({ color: '#e6d8b9', map: texture, roughness: .85 })
    const shadowStone = new THREE.MeshStandardMaterial({ color: '#b3a187', map: texture, roughness: 1 })
    const foliage = new THREE.MeshStandardMaterial({ color: '#596a4d', roughness: 1 })
    const trunk = new THREE.MeshStandardMaterial({ color: '#6b6044', roughness: 1 })
    const groundMaterial = new THREE.MeshStandardMaterial({ color: lightPalettes.morning.ground, roughness: 1 })
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(180, 180), groundMaterial)
    ground.rotation.x = -Math.PI / 2; ground.position.y = -.28; ground.receiveShadow = true; scene.add(ground)

    const ambient = new THREE.HemisphereLight('#fff9e8', '#a59674', 2.2)
    scene.add(ambient)
    const sun = new THREE.DirectionalLight('#fff1d2', 4)
    sun.position.set(-9, 12, 7)
    sun.castShadow = true
    sun.shadow.mapSize.set(2048, 2048)
    Object.assign(sun.shadow.camera, { left: -15, right: 15, top: 15, bottom: -15, near: 1, far: 50 })
    sun.shadow.normalBias = .035; sun.shadow.bias = -.0002
    sun.shadow.radius = 4
    sun.target.position.set(0, 0, 1); scene.add(sun, sun.target)

    const architecture = new THREE.Group()
    scene.add(architecture)
    // The platform is a continuous architectural landscape, rather than a floating object.
    architecture.add(box(13, .38, 12.7, paleStone, 0, -.03, .35))
    architecture.add(box(3.2, .035, 10.7, shadowStone, .1, .177, 1.1))
    const waterUniforms = { uTime: { value: 0 }, uColor: { value: new THREE.Color('#739d95') }, uLight: { value: 1 } }
    const waterMaterial = new THREE.ShaderMaterial({
      uniforms: waterUniforms,
      vertexShader: 'varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
      fragmentShader: `varying vec2 vUv; uniform float uTime; uniform vec3 uColor; uniform float uLight;
        void main(){vec2 p=vUv;float t=uTime*.15;float a=sin(p.y*135.+sin(p.x*34.+t)*1.4+t);float b=sin(p.y*170.-p.x*26.-t);float glint=pow(max(0.,a*b),12.);float caustic=pow(max(0.,sin(p.x*105.+sin(p.y*34.+t)*2.)*sin(p.y*110.+sin(p.x*21.)*2.)),8.);float reflection=smoothstep(.02,.16,p.y)*(1.-smoothstep(.16,.58,p.y));float archShadow=(1.-smoothstep(.08,.13,abs(p.x-.24)))+(1.-smoothstep(.08,.13,abs(p.x-.73)));vec3 c=uColor*(.88+.12*sin(p.y*2.5));c=mix(c,c*.56,reflection*min(1.,archShadow)*.45);c+=vec3(.18,.2,.13)*(glint*.55+caustic*.22)*uLight;gl_FragColor=vec4(c,1.);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
        }`,
      side: THREE.DoubleSide,
    })
    const water = new THREE.Mesh(new THREE.PlaneGeometry(3.18, 10.68), waterMaterial)
    water.rotation.x = -Math.PI / 2; water.position.set(.1, .202, 1.1); architecture.add(water)
    // Pool coping and individual broad approach steps.
    architecture.add(box(.18, .12, 10.9, paleStone, -1.6, .22, 1.1), box(.18, .12, 10.9, paleStone, 1.8, .22, 1.1))
    for (let i = 0; i < 4; i++) architecture.add(box(3.9, .16 * (4 - i), .7, paleStone, -4.9, -.18 + .08 * (4 - i), 3.55 + i * .7))
    // A low sitting wall anchors the right-hand edge of the water.
    architecture.add(box(.5, .68, 4.2, limestone, 5.75, .35, 1.7))
    architecture.add(gardenTree('cypress', foliage, trunk, 4.4, 3.4, 1.08))
    architecture.add(gardenTree('cypress', foliage, trunk, -5.3, -4.9, .75))

    const spaces: Record<SpaceId, THREE.Group> = { atrium: new THREE.Group(), water: new THREE.Group(), garden: new THREE.Group() }
    Object.values(spaces).forEach(group => architecture.add(group))
    const doublePortal = portal(8.2, 6.4, .7, 2, limestone)
    doublePortal.position.set(-.2, .2, -3.5); spaces.atrium.add(doublePortal)
    spaces.atrium.add(box(.7, 3.8, 4.2, limestone, -4.65, 2.1, -2.1))
    spaces.atrium.add(box(2.7, .45, 1.1, paleStone, -3.7, .42, .4))
    const tallPortal = portal(5.7, 6.8, .85, 1, paleStone)
    tallPortal.position.set(-1.8, .2, -3.8); spaces.water.add(tallPortal)
    const sidePortal = portal(4.5, 4.2, .65, 1, limestone)
    sidePortal.rotation.y = -Math.PI / 2; sidePortal.position.set(4.5, .2, -2.4); spaces.water.add(sidePortal)
    spaces.water.add(box(2.8, .55, 1.25, limestone, -4.2, .47, .5))
    // Rhythm of a pergola and a softly rounded olive crown for the garden.
    spaces.garden.add(box(8.6, 4.5, .6, limestone, -.5, 2.45, -4.25))
    const gardenPortal = portal(3.5, 4.5, .6, 1, paleStone)
    gardenPortal.position.set(-4.45, .2, -2.1); gardenPortal.rotation.y = Math.PI / 2; spaces.garden.add(gardenPortal)
    for (let i = 0; i < 7; i++) {
      const x = -3.5 + i * 1.15
      spaces.garden.add(box(.15, 3.55, .17, paleStone, x, 1.97, 1.2), box(.18, .22, 6, paleStone, x, 3.85, -1.45))
    }
    spaces.garden.add(gardenTree('olive', foliage, trunk, 3.4, -1.1))

    const render = () => {
      if (disposed || lost || !inView || document.hidden) return
      pointer.lerp(target, .035)
      const moving = canMove()
      camera.position.set(baseCamera.x + (moving ? pointer.x * 1.05 : 0), baseCamera.y + (moving ? pointer.y * .55 + scroll * .7 : 0), baseCamera.z + (moving ? scroll * .6 : 0))
      camera.lookAt(lookAt)
      waterUniforms.uTime.value = moving ? elapsed : 0
      renderer.render(scene, camera)
      if (!hasRendered) { hasRendered = true; setReady(true) }
    }
    const loop = (time: number) => {
      frame = 0
      if (disposed || lost || !inView || document.hidden) return
      if (time - lastTime > 32) { elapsed = time / 1000; lastTime = time; render() }
      if (canMove()) frame = requestAnimationFrame(loop)
    }
    const schedule = () => { if (!frame && inView && !document.hidden && !disposed && !lost) frame = requestAnimationFrame(loop) }
    const apply = ({ space, light }: SceneProps) => {
      const palette = lightPalettes[light]
      Object.entries(spaces).forEach(([id, group]) => { group.visible = id === space })
      scene.background = new THREE.Color(palette.sky)
      if (scene.fog) scene.fog.color.set(palette.sky)
      groundMaterial.color.set(palette.ground)
      sun.color.set(palette.sun); sun.position.set(palette.sunX, palette.sunY, 7)
      ambient.intensity = light === 'dusk' ? 1.6 : 2.2
      sun.intensity = light === 'dusk' ? 3.5 : 4
      renderer.toneMappingExposure = palette.exposure
      waterUniforms.uColor.value.set(palette.water); waterUniforms.uLight.value = light === 'dusk' ? .6 : 1
      renderer.shadowMap.needsUpdate = true
      render(); schedule()
    }
    live.current = { render, apply }
    const resize = () => {
      if (disposed || lost || !inView || document.hidden) return
      const { width, height } = wrapper.getBoundingClientRect()
      if (!width || !height) return
      renderer.setSize(width, height)
      camera.aspect = width / height
      // Keep the whole architecture legible on narrow screens without cropping portals.
      camera.fov = camera.aspect < .9 ? 50 : camera.aspect < 1.3 ? 43 : 34
      camera.updateProjectionMatrix(); render(); schedule()
    }
    const onPointer = (event: PointerEvent) => {
      if (event.pointerType !== 'mouse' || !canMove()) return
      const rect = wrapper.getBoundingClientRect()
      target.set((event.clientX - rect.left) / rect.width * 2 - 1, (event.clientY - rect.top) / rect.height * 2 - 1)
      schedule()
    }
    const resetPointer = () => { target.set(0, 0); schedule() }
    const onScroll = () => {
      if (!inView || !canMove()) return
      const rect = wrapper.getBoundingClientRect()
      scroll = THREE.MathUtils.clamp((rect.top + rect.height / 2 - innerHeight / 2) / innerHeight, -1, 1)
      schedule()
    }
    const onVisibility = () => { if (document.hidden) { cancelAnimationFrame(frame); frame = 0 } else { resize(); schedule() } }
    const onReducedMotion = () => { render(); schedule() }
    const onContextLost = (event: Event) => { event.preventDefault(); lost = true; hasRendered = false; setReady(false); cancelAnimationFrame(frame); frame = 0 }
    const onContextRestored = () => { lost = false; apply(current.current); resize() }
    const resizeObserver = new ResizeObserver(resize)
    const intersection = new IntersectionObserver(entries => {
      inView = entries[0].isIntersecting
      if (inView) { resize(); schedule() } else { cancelAnimationFrame(frame); frame = 0 }
    }, { rootMargin: '40px' })
    resizeObserver.observe(wrapper); intersection.observe(wrapper)
    wrapper.addEventListener('pointermove', onPointer)
    wrapper.addEventListener('pointerleave', resetPointer)
    window.addEventListener('scroll', onScroll, { passive: true })
    document.addEventListener('visibilitychange', onVisibility)
    reducedMotion.addEventListener('change', onReducedMotion)
    renderer.domElement.addEventListener('webglcontextlost', onContextLost)
    renderer.domElement.addEventListener('webglcontextrestored', onContextRestored)
    apply(current.current); resize(); schedule()
    return () => {
      disposed = true; cancelAnimationFrame(frame); live.current = null
      resizeObserver.disconnect(); intersection.disconnect()
      wrapper.removeEventListener('pointermove', onPointer); wrapper.removeEventListener('pointerleave', resetPointer)
      window.removeEventListener('scroll', onScroll); document.removeEventListener('visibilitychange', onVisibility)
      reducedMotion.removeEventListener('change', onReducedMotion)
      renderer.domElement.removeEventListener('webglcontextlost', onContextLost)
      renderer.domElement.removeEventListener('webglcontextrestored', onContextRestored)
      const geometries = new Set<THREE.BufferGeometry>(), materials = new Set<THREE.Material>()
      scene.traverse(object => { if (object instanceof THREE.Mesh) { geometries.add(object.geometry); (Array.isArray(object.material) ? object.material : [object.material]).forEach(material => materials.add(material)) } })
      geometries.forEach(geometry => geometry.dispose()); materials.forEach(material => material.dispose()); texture.dispose()
      sun.shadow.map?.dispose(); renderer.dispose(); renderer.forceContextLoss(); renderer.domElement.remove()
    }
  }, [])

  return <div ref={outer} className="velora-scene" data-renderer={ready ? 'webgl' : 'illustration'} data-space={props.space} data-light={props.light}>
    <ArchitectureArt space={props.space} light={props.light} />
    <div ref={mount} className="velora-scene__canvas" />
  </div>
}
