import { chromium } from '@playwright/test'
import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { platform } from 'node:os'

const arg = (name, fallback) => {
  const index = process.argv.indexOf(`--${name}`)
  return index >= 0 ? process.argv[index + 1] : fallback
}
const url = arg('url', 'http://127.0.0.1:4317/velora-atelier/')
const label = arg('label', 'local')
if (!/^[a-z0-9-]+$/.test(label)) throw new Error('Use a plain audit label')
const runs = Number(arg('runs', '3'))
if (!Number.isInteger(runs) || runs < 1 || runs > 5) throw new Error('Audit runs must be 1–5')
const installed = 'C:/Users/gokusen/AppData/Local/ms-playwright/chromium-1248/chrome-win64/chrome.exe'
const browser = await chromium.launch({
  headless: true,
  ...(process.env.BROWSER_CHANNEL ? { channel: process.env.BROWSER_CHANNEL } : existsSync(installed) ? { executablePath: installed } : {}),
})
const report = {
  timestamp: new Date().toISOString(), url,
  conditions: { browser: browser.version(), platform: platform(), headless: true, viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1, cpuThrottle: 4, network: 'unthrottled', cache: 'new context per trial', workers: 1, observationMilliseconds: 3000 },
  trials: [],
  lifecycle: null,
}
try {
  for (let trial = 1; trial <= runs; trial += 1) {
    const context = await browser.newContext({ viewport: report.conditions.viewport, deviceScaleFactor: 1 })
    const page = await context.newPage()
    const cdp = await context.newCDPSession(page)
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 })
    await cdp.send('Performance.enable')
    await page.addInitScript(() => {
      window.__veloraAudit = { lcp: [], cls: 0, longTasks: [], sceneReadyTime: null }
      const sceneObserver = new MutationObserver(() => {
        if (document.querySelector('.velora-scene[data-renderer="webgl"]')) {
          window.__veloraAudit.sceneReadyTime = performance.now()
          sceneObserver.disconnect()
        }
      })
      sceneObserver.observe(document, { childList: true, subtree: true, attributes: true, attributeFilter: ['data-renderer'] })
      new PerformanceObserver(list => {
        for (const item of list.getEntries()) window.__veloraAudit.lcp.push({ startTime: item.startTime, size: item.size, element: item.element?.tagName })
      }).observe({ type: 'largest-contentful-paint', buffered: true })
      new PerformanceObserver(list => {
        for (const item of list.getEntries()) if (!item.hadRecentInput) window.__veloraAudit.cls += item.value
      }).observe({ type: 'layout-shift', buffered: true })
      new PerformanceObserver(list => {
        for (const item of list.getEntries()) window.__veloraAudit.longTasks.push({ startTime: item.startTime, duration: item.duration })
      }).observe({ type: 'longtask', buffered: true })
    })
    const pageErrors = []
    const consoleMessages = []
    const failedRequests = []
    const httpErrors = []
    page.on('pageerror', error => pageErrors.push(error.message))
    page.on('console', message => { if (['warning', 'error'].includes(message.type())) consoleMessages.push({ type: message.type(), text: message.text() }) })
    page.on('requestfailed', request => failedRequests.push({ url: request.url(), error: request.failure()?.errorText }))
    page.on('response', response => { if (response.status() >= 400) httpErrors.push({ url: response.url(), status: response.status() }) })
    await page.goto(url, { waitUntil: 'networkidle' })
    await page.waitForTimeout(3000)
    const runtime = await page.evaluate(() => {
      const navigation = performance.getEntriesByType('navigation')[0]
      return {
        title: document.title,
        sceneRenderer: document.querySelector('.velora-scene')?.getAttribute('data-renderer') || 'fallback',
        webglCanvases: document.querySelectorAll('canvas').length,
        documentWidth: document.documentElement.scrollWidth,
        viewportWidth: window.innerWidth,
        domNodes: document.querySelectorAll('*').length,
        navigation: navigation ? { responseStart: navigation.responseStart, domContentLoaded: navigation.domContentLoadedEventEnd, load: navigation.loadEventEnd, transferSize: navigation.transferSize } : null,
        paints: performance.getEntriesByType('paint').map(item => ({ name: item.name, startTime: item.startTime })),
        observed: window.__veloraAudit,
        resources: performance.getEntriesByType('resource').map(item => ({ name: item.name, type: item.initiatorType, duration: item.duration, transferSize: item.transferSize, encodedBodySize: item.encodedBodySize, decodedBodySize: item.decodedBodySize })),
      }
    })
    const metrics = await cdp.send('Performance.getMetrics')
    report.trials.push({ trial, ...runtime, metrics: Object.fromEntries(metrics.metrics.filter(item => ['JSHeapUsedSize', 'JSHeapTotalSize', 'Nodes', 'Documents', 'LayoutCount', 'RecalcStyleCount', 'TaskDuration', 'ScriptDuration'].includes(item.name)).map(item => [item.name, item.value])), pageErrors, consoleMessages, failedRequests, httpErrors })
    await context.close()
  }
  if (process.argv.includes('--lifecycle')) {
    const measureFrames = async page => {
      const before = await page.evaluate(() => window.__veloraFrameCount)
      await page.waitForTimeout(1000)
      return (await page.evaluate(() => window.__veloraFrameCount)) - before
    }
    const countFrames = () => {
      window.__veloraFrameCount = 0
      const original = window.requestAnimationFrame.bind(window)
      window.requestAnimationFrame = callback => original(time => { window.__veloraFrameCount += 1; callback(time) })
    }
    const context = await browser.newContext({ viewport: report.conditions.viewport, deviceScaleFactor: 1 })
    const page = await context.newPage()
    await page.addInitScript(countFrames)
    await page.goto(url, { waitUntil: 'networkidle' })
    await page.locator('.velora-scene[data-renderer="webgl"]').waitFor()
    await page.waitForTimeout(500)
    const activeFrames = await measureFrames(page)
    await page.locator('.motion-control').click()
    await page.waitForTimeout(500)
    const pausedFrames = await measureFrames(page)
    await page.locator('.motion-control').click()
    await page.evaluate(() => { document.querySelector('footer').scrollIntoView({ behavior: 'instant' }) })
    await page.waitForTimeout(500)
    const offscreenFrames = await measureFrames(page)
    await context.close()
    const reducedContext = await browser.newContext({ viewport: report.conditions.viewport, reducedMotion: 'reduce' })
    const reducedPage = await reducedContext.newPage()
    await reducedPage.addInitScript(countFrames)
    await reducedPage.goto(url, { waitUntil: 'networkidle' })
    await reducedPage.locator('.velora-scene[data-renderer="webgl"]').waitFor()
    await reducedPage.waitForTimeout(500)
    const reducedFrames = await measureFrames(reducedPage)
    report.lifecycle = { observationMilliseconds: 1000, settleMilliseconds: 500, activeFrames, pausedFrames, offscreenFrames, reducedFrames, pass: activeFrames > 0 && pausedFrames === 0 && offscreenFrames === 0 && reducedFrames === 0 }
    await reducedContext.close()
  }
} finally {
  await browser.close()
}
mkdirSync('qa', { recursive: true })
const destination = `qa/performance-${label}.json`
writeFileSync(destination, `${JSON.stringify(report, null, 2)}\n`)
console.log(JSON.stringify({ destination, conditions: report.conditions, lifecycle: report.lifecycle, trials: report.trials.map(item => ({ trial: item.trial, paints: item.paints, lcp: item.observed.lcp.at(-1), sceneRenderer: item.sceneRenderer, sceneReadyTime: item.observed.sceneReadyTime, cls: item.observed.cls, longTaskCount: item.observed.longTasks.length, heapUsed: item.metrics.JSHeapUsedSize, resourceTransferBytes: item.resources.reduce((sum, resource) => sum + resource.transferSize, 0), pageErrors: item.pageErrors, failedRequests: item.failedRequests, httpErrors: item.httpErrors })) }, null, 2))
