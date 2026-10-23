import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
let commit = 'local-uncommitted'
try { commit = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim() } catch { /* Local pre-repository build. */ }
const assets = Object.fromEntries(readdirSync('dist/assets').sort().map(name => [name, createHash('sha256').update(readFileSync(`dist/assets/${name}`)).digest('hex')]))
const entrypoints = Object.fromEntries(['index.html', 'favicon.svg'].map(name => [name, createHash('sha256').update(readFileSync(`dist/${name}`)).digest('hex')]))
writeFileSync('dist/release.json', JSON.stringify({ commit, entrypoints, assets }, null, 2))
