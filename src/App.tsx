import { Component, lazy, Suspense, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { SPACES, LIGHTS, createDesignCard, designCardFilename } from './model'
import type { SpaceId } from './model'
import useExperience from './useExperience'
import ArchitectureArt from './ArchitectureArt'

const Scene = lazy(() => import('./Scene'))

class SceneBoundary extends Component<{ children: ReactNode; fallback: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  render() { return this.state.failed ? this.props.fallback : this.props.children }
}

function Arrow({ diagonal = false }: { diagonal?: boolean }) {
  return <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d={diagonal ? 'M5 19 19 5M5 5h14v14' : 'M4 12h15m-6-6 6 6-6 6'} stroke="currentColor" strokeWidth="1.3" /></svg>
}

function Mark() {
  return <svg viewBox="0 0 36 36" fill="none" aria-hidden="true"><path d="M6 9 18 31 30 9M11 9l7 13 7-13" stroke="currentColor" strokeWidth="1.2"/><path d="M4 5h28" stroke="currentColor" strokeWidth=".7"/></svg>
}

function App() {
  const { space, light, setSpace, setLight } = useExperience()
  const [motion, setMotion] = useState(() => !window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  const [reducedMotion, setReducedMotion] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  const [downloadStatus, setDownloadStatus] = useState('')
  const current = SPACES.find(item => item.id === space)!
  const currentLight = LIGHTS.find(item => item.id === light)!
  const sceneHint = reducedMotion ? 'Still by preference. Follow the light.' : motion ? 'Move your pointer. Let the space unfold.' : 'Motion paused. Follow the light.'

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    const change = () => { setReducedMotion(media.matches); if (media.matches) setMotion(false) }
    media.addEventListener('change', change)
    return () => media.removeEventListener('change', change)
  }, [])

  function enterSpace(id: SpaceId) {
    setSpace(id)
    document.getElementById(`space-${id}`)?.focus({ preventScroll: true })
    document.getElementById('explore')?.scrollIntoView({ behavior: motion ? 'smooth' : 'instant', block: 'start' })
  }

  function downloadCard() {
    let url: string | undefined
    let anchor: HTMLAnchorElement | undefined
    let launched = false
    try {
      const blob = new Blob([createDesignCard({ space, light })], { type: 'image/svg+xml;charset=utf-8' })
      url = URL.createObjectURL(blob)
      anchor = document.createElement('a')
      anchor.href = url
      anchor.download = designCardFilename({ space, light })
      document.body.appendChild(anchor)
      anchor.click()
      launched = true
      const downloadUrl = url
      window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000)
      setDownloadStatus(`Design card prepared: ${current.title}, ${currentLight.label}. SVG image, free to keep.`)
    } catch {
      setDownloadStatus('The card could not be prepared. Please try again in a browser that supports file downloads.')
    } finally {
      anchor?.remove()
      if (url && !launched) URL.revokeObjectURL(url)
    }
  }

  return <div className="site" data-motion={motion ? 'on' : 'off'}>
    <a className="skip-link" href="#main">Skip to content</a>
    <header className="site-header">
      <a className="wordmark" href="#top" aria-label="VELORA ATELIER, back to top"><Mark />VELORA{' '}<span>ATELIER</span></a>
      <nav aria-label="Main navigation"><a href="#spaces">Spaces <span>03</span></a><a href="#philosophy">Philosophy</a><a href="#notes">Design notes <Arrow diagonal /></a></nav>
      <span className="concept-label"><span className="small-dot" />An imagined place</span>
    </header>

    <main id="main">
      <section className="hero" id="top" aria-labelledby="hero-title">
        <div className="hero-kicker"><span>Architecture for a quieter state of mind</span><span>Concept studies — Vol. 01 / 2026</span></div>
        <div className="hero-title-row"><h1 id="hero-title">VELORA<span className="title-period">.</span></h1><div className="hero-intro"><span className="eyebrow">Stone. Water. Stillness.</span><p>Some spaces ask you<br/>to do less. <em>To feel more.</em></p><a href="#explore" className="text-link">Enter the experience <span className="circle-arrow"><Arrow /></span></a></div></div>
        <div className="experience" id="explore" aria-label="Interactive architectural experience">
          <div className="scene-frame" data-light={light}>
            <SceneBoundary fallback={<ArchitectureArt space={space} light={light} className="scene-loading-art" />}><Suspense fallback={<ArchitectureArt space={space} light={light} className="scene-loading-art" />}><Scene space={space} light={light} motion={motion}/></Suspense></SceneBoundary>
            <div className="scene-topline"><span>VELORA / SPATIAL STUDY {current.number}</span><button className="motion-control" onClick={() => setMotion(value => !value)} disabled={reducedMotion} aria-label={reducedMotion ? 'Reduced motion: disabled by system preference' : motion ? 'Pause spatial motion' : 'Enable spatial motion'} aria-pressed={motion}><svg viewBox="0 0 12 12" aria-hidden="true" fill="none"><path d={motion ? 'M4 2v8M8 2v8' : 'm3 2 7 4-7 4Z'} stroke="currentColor" strokeWidth="1"/></svg>{reducedMotion ? 'Reduced motion' : motion ? 'Pause spatial motion' : 'Enable spatial motion'}</button></div>
            <div className="scene-title"><span className="eyebrow">{current.subtitle}</span><h2>{current.title}</h2></div>
            <div className="scene-caption"><span className="coordinate-cross" aria-hidden="true">+</span><span>Original digital architecture<br/>{sceneHint}</span></div>
            <div className="light-control" role="group" aria-label="Time of day"><span className="light-label">Follow the light</span>{LIGHTS.map(item => <button key={item.id} aria-pressed={light === item.id} onClick={() => setLight(item.id)} aria-label={item.label}><span className={`sun-icon sun-${item.id}`} aria-hidden="true"/><span>{item.label}</span></button>)}</div>
          </div>
          <div className="experience-bottom"><div className="space-switcher" role="group" aria-label="Choose a space">{SPACES.map(item => <button id={`space-${item.id}`} key={item.id} className={space === item.id ? 'selected' : ''} aria-label={`Explore ${item.number} ${item.title}`} aria-pressed={space === item.id} onClick={() => setSpace(item.id)}><span className="tab-number" aria-hidden="true">{item.number}</span>{' '}<span>{item.title}</span><Arrow /></button>)}</div><span className="experience-note">Three spaces.<br/>One slower rhythm.</span></div>
          <p className="sr-only" role="status">{current.title}. {currentLight.label}. {current.description}</p>
        </div>
      </section>

      <section className="philosophy section-shell" id="philosophy" aria-labelledby="philosophy-title">
        <div className="section-label"><span className="section-index">01 / THE PHILOSOPHY</span><span className="vertical-rule" /></div>
        <div className="philosophy-body"><h2 id="philosophy-title">Not another destination.<br/><em>A different pace.</em></h2><div className="philosophy-copy"><span className="asterisk" aria-hidden="true">✳</span><p>We imagine architecture that makes room for the things you can’t measure. The warmth of stone underfoot. A reflection that moves across a wall. The quiet between two thoughts.</p><p>VELORA is an independent fictional design study in spaces for rest. No reservations. No rush. Just an invitation to look a little longer.</p></div><div className="principle-row"><span>01 — Form follows feeling</span><span>02 — Less, but considered</span><span>03 — Light is a material</span></div></div>
      </section>

      <section className="spaces-section section-shell" id="spaces" aria-labelledby="spaces-title">
        <div className="section-label"><span className="section-index">02 / THE COLLECTION</span><span className="section-aside">Three studies in slowing down.</span></div>
        <div className="section-heading"><h2 id="spaces-title">A place for <em>every pause.</em></h2><p>Move between spaces.<br/>Notice what changes within you.</p></div>
        <div className="space-grid">{SPACES.map((item, index) => <article className={`space-card space-card-${index}`} key={item.id}><button className="space-art-button" aria-label={`Enter V / ${item.number} ${item.title}`} onClick={() => enterSpace(item.id)}><ArchitectureArt space={item.id} light={index === 2 ? 'dusk' : 'morning'} className="space-card-art"/><span className="art-number" aria-hidden="true">V / {item.number}</span><span className="art-enter"><Arrow diagonal /></span></button><div className="space-card-heading"><span>{item.number}</span><h3>{item.title}</h3></div><p>{item.description}</p><div className="space-card-meta"><span>{item.material}</span><span>{item.area}</span></div></article>)}</div>
      </section>

      <section className="material-section" id="notes" aria-labelledby="notes-title">
        <div className="material-inner"><div className="material-sculpture" aria-hidden="true"><div className="material-orbit"/><div className="stone-slab slab-back"/><div className="stone-slab slab-front"/><div className="material-water"/><span className="material-caption">Material study No. 01<br/>Travertine / water / daylight</span></div><div className="material-copy"><span className="section-index">03 / THE MATERIAL LANGUAGE</span><h2 id="notes-title">Made of earth.<br/><em>Shaped by light.</em></h2><p>A restrained palette, an expansive feeling. Pale mineral surfaces hold the warmth of the day. Water softens the geometry. Deep green marks a moment of shade.</p><div className="swatches"><div><span className="swatch swatch-stone"/>Travertine<span>#C8B599</span></div><div><span className="swatch swatch-water"/>Still water<span>#8BA9A0</span></div><div><span className="swatch swatch-ink"/>Garden shade<span>#263C32</span></div></div><a className="text-link" href="#design-card">Take a piece of the feeling <Arrow /></a></div></div>
      </section>

      <section className="design-section section-shell" id="design-card" aria-labelledby="card-title"><span className="section-index">04 / A SMALL MEMENTO</span><div className="design-content"><h2 id="card-title">Keep a little<br/><em>stillness.</em></h2><div className="download-copy"><p>Your chosen space. Your light.<br/>An original design card, yours to keep.</p><div className="selection-summary"><span>{current.number} / {current.title}</span><span>{currentLight.time} — {currentLight.label}</span></div><button className="download-button" onClick={downloadCard}>Download design card<Arrow diagonal /></button><span className="download-format">SVG image · Original artwork · No sign-up</span><p role="status" className="download-status">{downloadStatus}</p></div></div></section>
    </main>

    <footer className="site-footer"><div className="footer-top"><a href="#top" className="footer-logo" aria-label="VELORA, back to top">VELORA<sup>©</sup></a><p>A study in the art<br/>of <em>being here.</em></p><a href="#top" className="back-top">Back to top <Arrow diagonal /></a></div><div className="footer-bottom"><span>Fictional architecture atelier · Independent concept, 2026</span><span>Original procedural artwork. No real property or booking service.</span><a href="https://github.com/seoshiro/velora-atelier" target="_blank" rel="noreferrer">Colophon & source <Arrow diagonal /></a></div></footer>
  </div>
}

export default App
