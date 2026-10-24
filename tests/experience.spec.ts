import { expect, test, type Page } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { LIGHTS, SPACES } from '../src/model.ts'
import { isLinuxCiChromeReadbackDiagnostic } from './consolePolicy.ts'

const base = process.env.BASE_URL || 'http://127.0.0.1:4317/velora-atelier/'
const prefix = process.env.QA_PREFIX || (base.startsWith('http://127.0.0.1') ? 'local' : 'live')
const open = async (page: Page, query = '') => {
  await page.goto(`${base}${query}`, { waitUntil: 'networkidle' })
  await page.evaluate(() => document.fonts.ready)
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
}
const assertSelection = async (page: Page, spaceId: string, lightId: string) => {
  const space = SPACES.find(item => item.id === spaceId)!
  const light = LIGHTS.find(item => item.id === lightId)!
  await expect(page.getByRole('button', { name: `Explore ${space.number} ${space.title}`, exact: true })).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByRole('button', { name: light.label, exact: true })).toHaveAttribute('aria-pressed', 'true')
}
const noOverflow = async (page: Page) => {
  const sizes = await page.evaluate(() => ({ viewport: innerWidth, document: document.documentElement.scrollWidth }))
  expect(sizes.document, `horizontal overflow: document ${sizes.document}px, viewport ${sizes.viewport}px`).toBeLessThanOrEqual(sizes.viewport + 1)
}
const capture = async (page: Page, name: string) => {
  await mkdir('qa/screenshots', { recursive: true })
  await page.screenshot({ path: `qa/screenshots/${prefix}-${name}.png`, fullPage: true, animations: 'disabled' })
}

test('three spaces, all light states, interrupted changes and an honest SVG download', async ({ page, browser }, testInfo) => {
  const failures: string[] = []
  const browserVersion = browser.version()
  const classificationContext = { ci: Boolean(process.env.CI), platform: process.platform, browserName: browser.browserType().name(), browserVersion, channel: testInfo.project.use.channel }
  const driverDiagnostics: { type: string; text: string; location: { url: string; lineNumber: number; columnNumber: number }; browserVersion: string }[] = []
  let glInfo: Record<string, unknown> = { unavailable: 'The story did not reach driver metadata collection.' }
  page.on('pageerror', error => failures.push(`pageerror: ${error.message}`))
  page.on('console', message => {
    if (isLinuxCiChromeReadbackDiagnostic(message.type(), message.text(), classificationContext)) {
      driverDiagnostics.push({ type: message.type(), text: message.text(), location: message.location(), browserVersion })
    } else if (['error', 'warning'].includes(message.type())) failures.push(`console ${message.type()}: ${message.text()}`)
  })
  page.on('requestfailed', request => failures.push(`requestfailed: ${request.url()} ${request.failure()?.errorText}`))
  page.on('response', response => { if (response.status() >= 400) failures.push(`HTTP ${response.status()}: ${response.url()}`) })
  try {
  await open(page)
  await expect(page.locator('.velora-scene')).toHaveAttribute('data-renderer', 'webgl')
  await expect(page.getByText(/fictional/i).first()).toBeVisible()
  for (const space of SPACES) {
    await page.getByRole('button', { name: `Explore ${space.number} ${space.title}`, exact: true }).click()
    for (const light of LIGHTS) {
      await page.getByRole('button', { name: light.label, exact: true }).click()
      await assertSelection(page, space.id, light.id)
      expect(new URL(page.url()).searchParams.get('space') ?? 'atrium').toBe(space.id)
      expect(new URL(page.url()).searchParams.get('light') ?? 'morning').toBe(light.id)
      if ((space.id === 'atrium' && light.id === 'morning') || (space.id === 'water' && light.id === 'noon') || (space.id === 'garden' && light.id === 'dusk')) {
        await mkdir('qa/screenshots', { recursive: true })
        await page.locator('.scene-frame').screenshot({ path: `qa/screenshots/${prefix}-scene-${space.id}-${light.id}.png`, animations: 'disabled' })
      }
    }
  }
  // Deliberately reverse an in-flight selection before the visual transition settles.
  for (const space of [SPACES[0], SPACES[2], SPACES[1], SPACES[0], SPACES[1]]) {
    await page.getByRole('button', { name: `Explore ${space.number} ${space.title}`, exact: true }).click()
  }
  await page.getByRole('button', { name: LIGHTS[2].label, exact: true }).click()
  await assertSelection(page, 'water', 'dusk')
  const downloaded = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Download design card', exact: true }).click()
  const download = await downloaded
  expect(download.suggestedFilename()).toBe('velora-water-dusk.svg')
  const downloadPath = await download.path()
  expect(downloadPath).toBeTruthy()
  const card = await readFile(downloadPath!, 'utf8')
  expect(card).toContain('Water Court')
  expect(card).toContain('Dusk')
  expect(card).toMatch(/fictional/i)
  expect(card).toMatch(/^<svg /)
  expect(card).not.toMatch(/<script|<foreignObject|\son\w+=|https?:\/\/(?!www\.w3\.org)/i)
  glInfo = await page.locator('.velora-scene canvas').evaluate(canvas => {
    const context = (canvas as HTMLCanvasElement).getContext('webgl2')
    if (!context) return { unavailable: 'WebGL2 context missing at end of story.' }
    const debug = context.getExtension('WEBGL_debug_renderer_info')
    return {
      version: context.getParameter(context.VERSION), shadingLanguageVersion: context.getParameter(context.SHADING_LANGUAGE_VERSION),
      vendor: context.getParameter(context.VENDOR), renderer: context.getParameter(context.RENDERER),
      unmaskedVendor: debug ? context.getParameter(debug.UNMASKED_VENDOR_WEBGL) : null,
      unmaskedRenderer: debug ? context.getParameter(debug.UNMASKED_RENDERER_WEBGL) : null,
    }
  })
  expect(driverDiagnostics.length, 'the exact classified Linux CI driver diagnostic must remain bounded').toBeLessThanOrEqual(4)
  expect(failures).toEqual([])
  } finally {
    const diagnosticReport = JSON.stringify({ classificationContext, browserVersion, glInfo, count: driverDiagnostics.length, limit: 4, diagnostics: driverDiagnostics, failures }, null, 2)
    await mkdir('qa/screenshots', { recursive: true })
    await writeFile(`qa/screenshots/${prefix}-console-diagnostics.json`, diagnosticReport)
    await testInfo.attach('browser-console-diagnostics', { body: diagnosticReport, contentType: 'application/json' })
  }
})

test('query state survives Back, Forward, reload and invalid direct inputs', async ({ page }) => {
  await open(page, '?space=atrium&light=morning')
  await page.getByRole('button', { name: `Explore ${SPACES[1].number} ${SPACES[1].title}`, exact: true }).click()
  await page.getByRole('button', { name: LIGHTS[2].label, exact: true }).click()
  await assertSelection(page, 'water', 'dusk')
  await page.goBack()
  await assertSelection(page, 'water', 'morning')
  await page.goBack()
  await assertSelection(page, 'atrium', 'morning')
  await page.goForward()
  await assertSelection(page, 'water', 'morning')
  await page.goForward()
  await assertSelection(page, 'water', 'dusk')
  await page.reload({ waitUntil: 'networkidle' })
  await assertSelection(page, 'water', 'dusk')
  await open(page, '?space=%3Cscript%3E&light=midnight#explore')
  await assertSelection(page, 'atrium', 'morning')
  await page.getByRole('button', { name: `Explore ${SPACES[2].number} ${SPACES[2].title}`, exact: true }).click()
  expect(new URL(page.url()).hash).toBe('#explore')
  await expect(page.locator('script:not([src])')).toHaveCount(0)
})

test('navigation, collection entries and every section are usable', async ({ page }) => {
  await open(page)
  for (const [name, hash] of [['Spaces', '#spaces'], ['Philosophy', '#philosophy'], ['Design notes', '#notes']]) {
    await page.getByRole('link', { name: name === 'Spaces' ? /^Spaces/ : name, exact: name !== 'Spaces' }).first().click()
    await expect(page).toHaveURL(new RegExp(`${hash}$`))
    await expect(page.locator(hash)).toBeInViewport()
  }
  await page.getByRole('link', { name: /^Spaces/ }).first().click()
  for (const space of SPACES) {
    await page.getByRole('button', { name: `Enter V / ${space.number} ${space.title}`, exact: true }).click()
    await assertSelection(page, space.id, 'morning')
    await expect(page.getByRole('button', { name: `Explore ${space.number} ${space.title}`, exact: true })).toBeFocused()
    await expect(page.locator('#explore')).toBeInViewport()
    await page.locator('#spaces').scrollIntoViewIfNeeded()
  }
  await page.locator('footer').scrollIntoViewIfNeeded()
  await expect(page.locator('footer')).toBeVisible()
  await noOverflow(page)
})

test('keyboard controls have names, visible focus and a functional motion switch', async ({ page }) => {
  await open(page)
  await page.keyboard.press('Tab')
  const firstFocus = page.locator(':focus')
  await expect(firstFocus).toBeVisible()
  await expect(firstFocus).toHaveAccessibleName(/.+/)
  const space = page.getByRole('button', { name: `Explore ${SPACES[2].number} ${SPACES[2].title}`, exact: true })
  await space.focus()
  const style = await space.evaluate(element => {
    const computed = getComputedStyle(element)
    return { outline: computed.outlineStyle, width: computed.outlineWidth, shadow: computed.boxShadow }
  })
  expect((style.outline !== 'none' && style.width !== '0px') || style.shadow !== 'none').toBe(true)
  await page.keyboard.press('Enter')
  await assertSelection(page, 'garden', 'morning')
  await page.getByRole('button', { name: 'Pause spatial motion', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Enable spatial motion', exact: true })).toBeVisible()
  await expect(page.locator('.scene-caption')).toContainText('Motion paused. Follow the light.')
  await page.getByRole('button', { name: 'Enable spatial motion', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Pause spatial motion', exact: true })).toBeVisible()
})

test('reduced motion and unavailable WebGL retain the full story', async ({ browser }) => {
  const context = await browser.newContext({ reducedMotion: 'reduce', viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })
  await context.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext
    HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, type: string, ...args: unknown[]) {
      if (/webgl/i.test(type)) return null
      return Reflect.apply(original, this, [type, ...args])
    } as typeof original
  })
  const page = await context.newPage()
  await open(page)
  await expect(page.getByRole('button', { name: 'Reduced motion: disabled by system preference', exact: true })).toBeDisabled()
  await expect(page.locator('.scene-caption')).toContainText('Still by preference. Follow the light.')
  await expect(page.locator('.velora-scene')).toHaveAttribute('data-renderer', 'illustration')
  await expect(page.locator('.velora-scene > .architecture-art')).toBeVisible()
  const morningArt = await page.locator('.velora-scene > .architecture-art').innerHTML()
  await page.getByRole('button', { name: LIGHTS[1].label, exact: true }).tap()
  await assertSelection(page, 'atrium', 'noon')
  expect(await page.locator('.velora-scene > .architecture-art').innerHTML()).not.toBe(morningArt)
  await page.getByRole('button', { name: `Explore ${SPACES[1].number} ${SPACES[1].title}`, exact: true }).tap()
  await page.getByRole('button', { name: LIGHTS[2].label, exact: true }).tap()
  await assertSelection(page, 'water', 'dusk')
  await expect(page.getByRole('button', { name: 'Download design card', exact: true })).toBeVisible()
  await noOverflow(page)
  await capture(page, 'mobile-no-webgl-reduced-motion')
  await context.close()
})

test('all nine architectural and light states produce distinct real scene pixels', async ({ page }) => {
  await open(page)
  await expect(page.locator('.velora-scene')).toHaveAttribute('data-renderer', 'webgl')
  await page.getByRole('button', { name: 'Pause spatial motion', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Enable spatial motion', exact: true })).toBeVisible()
  await mkdir('qa/screenshots', { recursive: true })
  const hashes: Record<string, string> = {}
  for (const space of SPACES) {
    await page.getByRole('button', { name: `Explore ${space.number} ${space.title}`, exact: true }).click()
    for (const light of LIGHTS) {
      await page.getByRole('button', { name: light.label, exact: true }).click()
      await assertSelection(page, space.id, light.id)
      const scene = page.locator('.velora-scene')
      await expect(scene).toHaveAttribute('data-space', space.id)
      await expect(scene).toHaveAttribute('data-light', light.id)
      const state = `${space.id}-${light.id}`
      const pixels = await scene.screenshot({ path: `qa/screenshots/${prefix}-paused-${state}.png`, animations: 'disabled', style: '.scene-topline,.scene-title,.scene-caption,.light-control{visibility:hidden!important}' })
      hashes[state] = createHash('sha256').update(pixels).digest('hex')
    }
  }
  await writeFile(`qa/screenshots/${prefix}-visual-hashes.json`, JSON.stringify({ motion: 'paused', renderer: 'webgl', hashes }, null, 2))
  expect(new Set(Object.values(hashes)).size).toBe(9)
})

test('real WebGL context loss and restoration recover the latest chosen space and light', async ({ page, browser }) => {
  const pageErrors: string[] = []
  const consoleEvents: { type: string; text: string }[] = []
  page.on('pageerror', error => pageErrors.push(error.message))
  page.on('console', message => {
    if (['warning', 'error', 'log'].includes(message.type())) consoleEvents.push({ type: message.type(), text: message.text() })
  })
  await open(page)
  const scene = page.locator('.velora-scene')
  await expect(scene).toHaveAttribute('data-renderer', 'webgl')
  await page.getByRole('button', { name: 'Pause spatial motion', exact: true }).click()
  await page.getByRole('button', { name: `Explore ${SPACES[2].number} ${SPACES[2].title}`, exact: true }).click()
  await page.getByRole('button', { name: LIGHTS[2].label, exact: true }).click()
  await assertSelection(page, 'garden', 'dusk')
  await mkdir('qa/screenshots', { recursive: true })
  const sceneCapture = { animations: 'disabled' as const, style: '.scene-topline,.scene-title,.scene-caption,.light-control{visibility:hidden!important}' }
  const expectedPixels = await scene.screenshot({ ...sceneCapture, path: `qa/screenshots/${prefix}-context-expected-garden-dusk.png` })
  const expectedHash = createHash('sha256').update(expectedPixels).digest('hex')
  await page.getByRole('button', { name: `Explore ${SPACES[0].number} ${SPACES[0].title}`, exact: true }).click()
  await page.getByRole('button', { name: LIGHTS[0].label, exact: true }).click()
  const priorPixels = await scene.screenshot(sceneCapture)
  const extensionAvailable = await page.evaluate(() => {
    const canvas = document.querySelector<HTMLCanvasElement>('.velora-scene canvas')
    const context = canvas?.getContext('webgl2')
    const extension = context?.getExtension('WEBGL_lose_context')
    if (!extension) return false
    const qaWindow = window as typeof window & { veloraQaContextLoss?: WEBGL_lose_context }
    qaWindow.veloraQaContextLoss = extension
    extension.loseContext()
    return true
  })
  expect(extensionAvailable, 'real WEBGL_lose_context extension is required for this recovery check').toBe(true)
  await expect(scene).toHaveAttribute('data-renderer', 'illustration')
  await expect(scene.locator('> .architecture-art')).toBeVisible()
  const actuallyLost = await page.locator('.velora-scene canvas').evaluate(canvas => (canvas as HTMLCanvasElement).getContext('webgl2')!.isContextLost())
  expect(actuallyLost).toBe(true)
  await page.getByRole('button', { name: `Explore ${SPACES[2].number} ${SPACES[2].title}`, exact: true }).click()
  await page.getByRole('button', { name: LIGHTS[2].label, exact: true }).click()
  await assertSelection(page, 'garden', 'dusk')
  await page.evaluate(() => {
    const qaWindow = window as typeof window & { veloraQaContextLoss?: WEBGL_lose_context }
    qaWindow.veloraQaContextLoss!.restoreContext()
  })
  await expect(scene).toHaveAttribute('data-renderer', 'webgl')
  await assertSelection(page, 'garden', 'dusk')
  const stillLost = await page.locator('.velora-scene canvas').evaluate(canvas => (canvas as HTMLCanvasElement).getContext('webgl2')!.isContextLost())
  expect(stillLost).toBe(false)
  const restoredPixels = await scene.screenshot({ ...sceneCapture, path: `qa/screenshots/${prefix}-context-restored-garden-dusk.png` })
  const restoredHash = createHash('sha256').update(restoredPixels).digest('hex')
  const pixelComparison = await page.evaluate(async sources => {
    const decoded = await Promise.all(sources.map(async source => {
      const image = new Image()
      image.src = `data:image/png;base64,${source}`
      await image.decode()
      const canvas = document.createElement('canvas')
      canvas.width = image.naturalWidth; canvas.height = image.naturalHeight
      const context = canvas.getContext('2d')!
      context.drawImage(image, 0, 0)
      return { width: canvas.width, height: canvas.height, data: context.getImageData(0, 0, canvas.width, canvas.height).data }
    }))
    const compare = (first: typeof decoded[number], second: typeof decoded[number]) => {
      if (first.width !== second.width || first.height !== second.height) throw new Error('Context recovery screenshot dimensions changed')
      let sum = 0, changed = 0, maximum = 0
      for (let pixel = 0; pixel < first.data.length; pixel += 4) {
        let pixelMax = 0
        for (let color = 0; color < 3; color++) {
          const delta = Math.abs(first.data[pixel + color] - second.data[pixel + color])
          sum += delta; pixelMax = Math.max(pixelMax, delta); maximum = Math.max(maximum, delta)
        }
        if (pixelMax) changed++
      }
      const pixels = first.width * first.height
      return { meanRgbDelta: sum / (pixels * 3), changedRatio: changed / pixels, maximum }
    }
    return { restoredToChosen: compare(decoded[1], decoded[0]), restoredToPrior: compare(decoded[1], decoded[2]) }
  }, [expectedPixels.toString('base64'), restoredPixels.toString('base64'), priorPixels.toString('base64')])
  // GPU context recreation can round a small number of channels by one level.
  // Compare the same-run chosen state with a tight numerical tolerance and require
  // it to be at least 50 times closer than the obsolete state from before the loss.
  expect(pixelComparison.restoredToChosen.meanRgbDelta).toBeLessThan(1)
  expect(pixelComparison.restoredToChosen.meanRgbDelta).toBeLessThan(pixelComparison.restoredToPrior.meanRgbDelta * .02)
  await page.getByRole('button', { name: LIGHTS[1].label, exact: true }).click()
  await assertSelection(page, 'garden', 'noon')
  expect(pageErrors).toEqual([])
  await writeFile(`qa/screenshots/${prefix}-context-recovery.json`, JSON.stringify({ browser: browser.version(), extension: 'WEBGL_lose_context', actuallyLost, stillLost, restoredState: { space: 'garden', light: 'dusk' }, postRestoreControlCheck: { space: 'garden', light: 'noon' }, expectedHash, restoredHash, pixelComparison, pageErrors, consoleEvents }, null, 2))
})

test('an interrupted optional scene chunk preserves controls, text and card export', async ({ page }) => {
  await page.route(/\/assets\/Scene-[^/]+\.js$/, route => route.abort('failed'))
  await open(page)
  await expect(page.locator('.scene-frame .architecture-art')).toBeVisible()
  await page.getByRole('button', { name: `Explore ${SPACES[2].number} ${SPACES[2].title}`, exact: true }).click()
  await page.getByRole('button', { name: LIGHTS[2].label, exact: true }).click()
  await assertSelection(page, 'garden', 'dusk')
  const downloaded = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Download design card', exact: true }).click()
  expect((await downloaded).suggestedFilename()).toBe('velora-garden-dusk.svg')
})

test('offscreen and hidden changes defer GPU draws until the scene is visible', async ({ page }) => {
  await page.addInitScript(() => {
    const counts = { draws: 0 }
    Object.assign(window, { __veloraVisibilityQA: counts })
    for (const name of ['drawArrays', 'drawElements'] as const) {
      const original = WebGL2RenderingContext.prototype[name]
      Object.defineProperty(WebGL2RenderingContext.prototype, name, {
        configurable: true,
        value: function (this: WebGL2RenderingContext, ...args: unknown[]) {
          counts.draws++
          return Reflect.apply(original, this, args)
        },
      })
    }
  })
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await open(page)
  const scene = page.locator('.velora-scene')
  await expect(scene).toHaveAttribute('data-renderer', 'webgl')
  const draws = () => page.evaluate(() => (window as unknown as { __veloraVisibilityQA: { draws: number } }).__veloraVisibilityQA.draws)
  await page.evaluate(() => scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' }))
  await page.waitForTimeout(200)
  const offscreen = await draws()
  expect(offscreen).toBeGreaterThan(0)
  await page.setViewportSize({ width: 1300, height: 900 })
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.evaluate(() => document.querySelector<HTMLButtonElement>('#space-garden')!.click())
  await expect(scene).toHaveAttribute('data-space', 'garden')
  await page.waitForTimeout(200)
  expect(await draws()).toBe(offscreen)
  await scene.scrollIntoViewIfNeeded()
  await expect.poll(draws).toBeGreaterThan(offscreen)
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => true })
    document.dispatchEvent(new Event('visibilitychange'))
  })
  const hidden = await draws()
  await page.setViewportSize({ width: 1440, height: 1000 })
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.waitForTimeout(200)
  expect(await draws()).toBe(hidden)
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => false })
    document.dispatchEvent(new Event('visibilitychange'))
  })
  await expect.poll(draws).toBeGreaterThan(hidden)
})

test('failed card downloads release their URL and temporary anchor, then allow retry', async ({ page }) => {
  await page.addInitScript(() => {
    const active = new Set<string>()
    const state = { failure: 'append', active }
    Object.assign(window, { __cardFailureQA: state })
    const create = URL.createObjectURL.bind(URL)
    const revoke = URL.revokeObjectURL.bind(URL)
    URL.createObjectURL = blob => { const url = create(blob); active.add(url); return url }
    URL.revokeObjectURL = url => { active.delete(url); revoke(url) }
    const append = Node.prototype.appendChild
    Node.prototype.appendChild = function <T extends Node>(child: T): T {
      if (state.failure === 'append' && child instanceof HTMLAnchorElement && child.download.startsWith('velora-')) throw new Error('Injected append failure')
      return append.call(this, child) as T
    }
    const click = HTMLAnchorElement.prototype.click
    HTMLAnchorElement.prototype.click = function () {
      if (state.failure === 'click' && this.download.startsWith('velora-')) throw new Error('Injected click failure')
      click.call(this)
    }
  })
  await open(page)
  for (const failure of ['append', 'click', 'click']) {
    await page.evaluate(value => { (window as unknown as { __cardFailureQA: { failure: string } }).__cardFailureQA.failure = value }, failure)
    await page.getByRole('button', { name: 'Download design card' }).click()
    await expect(page.locator('.download-status')).toContainText('could not be prepared')
    expect(await page.evaluate(() => (window as unknown as { __cardFailureQA: { active: Set<string> } }).__cardFailureQA.active.size)).toBe(0)
    await expect(page.locator('a[download]')).toHaveCount(0)
  }
  await page.evaluate(() => { (window as unknown as { __cardFailureQA: { failure: string } }).__cardFailureQA.failure = '' })
  const downloaded = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Download design card' }).click()
  expect((await downloaded).suggestedFilename()).toBe('velora-atrium-morning.svg')
  await expect(page.locator('a[download]')).toHaveCount(0)
  await expect.poll(() => page.evaluate(() => (window as unknown as { __cardFailureQA: { active: Set<string> } }).__cardFailureQA.active.size)).toBe(0)
})

test('responsive layouts and accessibility: desktop, mobile, 320px and landscape', async ({ page }) => {
  for (const viewport of [
    { width: 1440, height: 1000, name: 'desktop' },
    { width: 390, height: 844, name: 'mobile' },
    { width: 320, height: 740, name: 'narrow-320' },
    { width: 844, height: 390, name: 'mobile-landscape' },
  ]) {
    await page.setViewportSize(viewport)
    await open(page)
    await noOverflow(page)
    for (const section of ['#explore', '#spaces', '#philosophy', '#notes']) {
      await page.locator(section).scrollIntoViewIfNeeded()
      await expect(page.locator(section)).toBeVisible()
      await noOverflow(page)
    }
    await page.evaluate(() => scrollTo({ top: 0, behavior: 'instant' }))
    await capture(page, viewport.name)
    if (viewport.name === 'desktop') {
      await page.evaluate(() => scrollTo({ top: 0, behavior: 'instant' }))
      await page.screenshot({ path: `qa/screenshots/${prefix}-desktop-viewport.png`, fullPage: false, animations: 'disabled' })
      await page.locator('.hero').screenshot({ path: `qa/screenshots/${prefix}-desktop-hero.png`, animations: 'disabled' })
    }
    const accessibility = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze()
    expect.soft(accessibility.violations.map(issue => ({ id: issue.id, impact: issue.impact, nodes: issue.nodes.map(node => node.target) })), `WCAG scan at ${viewport.width} × ${viewport.height}`).toEqual([])
  }
})
