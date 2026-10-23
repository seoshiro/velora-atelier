export type ConsoleClassificationContext = {
  ci: boolean
  platform: string
  browserName: string
  browserVersion: string
  channel: string | undefined
}

const angleReadbackDiagnostic = /^\[\.WebGL-0x[0-9a-fA-F]+\]GL Driver Message \(OpenGL, Performance, GL_CLOSE_PATH_NV, High\): GPU stall due to ReadPixels(?: \(this message will no longer repeat\))?$/

/** Recognized Chrome 155/ANGLE driver warning; errors and other environments stay strict. */
export function isLinuxCiChromeReadbackDiagnostic(type: string, text: string, context: ConsoleClassificationContext): boolean {
  return context.ci && context.platform === 'linux' && context.browserName === 'chromium' && context.channel === 'chrome'
    && /^155\.\d+\.\d+\.\d+$/.test(context.browserVersion)
    && type === 'warning' && !/[\r\n]/.test(text) && angleReadbackDiagnostic.test(text)
}
