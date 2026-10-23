import assert from 'node:assert/strict'
import { test } from 'node:test'
import { isLinuxCiChromeReadbackDiagnostic } from './consolePolicy.ts'

const context = { ci: true, platform: 'linux', browserName: 'chromium', browserVersion: '155.0.8059.39', channel: 'chrome' }
const diagnostic = '[.WebGL-0x20dc01d04600]GL Driver Message (OpenGL, Performance, GL_CLOSE_PATH_NV, High): GPU stall due to ReadPixels'

test('only the exact verified ANGLE warning and optional final repetition notice classify', () => {
  assert.equal(isLinuxCiChromeReadbackDiagnostic('warning', diagnostic, context), true)
  assert.equal(isLinuxCiChromeReadbackDiagnostic('warning', `${diagnostic} (this message will no longer repeat)`, context), true)
  assert.equal(isLinuxCiChromeReadbackDiagnostic('warning', diagnostic.replace('20dc01d04600', 'AB01f'), context), true)
})

test('application errors, unknown warnings, changed diagnostics and extra text remain failures', () => {
  assert.equal(isLinuxCiChromeReadbackDiagnostic('error', diagnostic, context), false)
  for (const text of [
    'THREE.WebGLRenderer: unknown rendering problem',
    `prefix ${diagnostic}`, `${diagnostic} suffix`, `${diagnostic}\n`,
    diagnostic.replace('High', 'Low'), diagnostic.replace('ReadPixels', 'other operation'),
    diagnostic.replace('0x20dc01d04600', '0xnothex'),
  ]) assert.equal(isLinuxCiChromeReadbackDiagnostic('warning', text, context), false)
})

test('the diagnostic remains strict outside preinstalled Chrome on Linux CI', () => {
  for (const changed of [
    { ci: false }, { platform: 'win32' }, { platform: 'darwin' },
    { browserName: 'firefox' }, { channel: undefined }, { channel: 'msedge' },
    { browserVersion: '156.0.8078.4' }, { browserVersion: '154.0.0.0' }, { browserVersion: '155.invalid' },
  ]) assert.equal(isLinuxCiChromeReadbackDiagnostic('warning', diagnostic, { ...context, ...changed }), false)
})
