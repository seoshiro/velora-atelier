import { readFileSync, writeFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
const base = new URL(process.argv[2] || 'https://seoshiro.github.io/velora-atelier/')
if (!['http:', 'https:'].includes(base.protocol)) throw new Error('Expected an HTTP site URL')
const local = JSON.parse(readFileSync('dist/release.json', 'utf8'))
async function get(path) {
  const url = new URL(path, base)
  url.searchParams.set('release', local.commit)
  const response = await fetch(url, { cache: 'no-store' })
  if (!response.ok) throw new Error(`${response.status} ${url.pathname}`)
  return response
}
const remote = await (await get('release.json')).json()
if (remote.commit !== local.commit) throw new Error(`Deployment SHA mismatch: expected ${local.commit}, received ${remote.commit}`)
if (JSON.stringify(remote.assets) !== JSON.stringify(local.assets)) throw new Error('Deployment manifest differs from local build')
if (JSON.stringify(remote.entrypoints) !== JSON.stringify(local.entrypoints)) throw new Error('Deployment entrypoint manifest differs from local build')
const verified = []
const files = { ...local.entrypoints, ...Object.fromEntries(Object.entries(local.assets).map(([name, hash]) => [`assets/${name}`, hash])) }
for (const [name, expected] of Object.entries(files)) {
  const data = await (await get(name)).arrayBuffer()
  const actual = createHash('sha256').update(Buffer.from(data)).digest('hex')
  if (actual !== expected) throw new Error(`Asset hash mismatch: ${name}`)
  verified.push({ name, sha256: actual, bytes: data.byteLength })
}
const evidence = { url: base.href, verifiedAt: new Date().toISOString(), commit: remote.commit, assets: verified }
writeFileSync('qa/release-verification.json', JSON.stringify(evidence, null, 2))
console.log(`PASS exact commit ${remote.commit}; HTML, favicon and ${verified.length - 2} asset SHA-256 hashes match ${base.href}`)
