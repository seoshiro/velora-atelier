import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { createDesignCard, designCardFilename, experienceSearch, LIGHTS, parseExperience, SPACES } from './model.ts'

test('Blender tree exports have bounded topology, valid indices and usable smooth normals', () => {
  const data = JSON.parse(readFileSync(new URL('./art/garden-trees.json', import.meta.url), 'utf8')) as {
    positionScale: number; normalScale: number;
    models: Record<string, { material: string; positions: number[]; normals: number[]; indices: number[] }[]>;
  }
  assert.deepEqual(Object.keys(data.models).sort(), ['cypress', 'olive'])
  let triangles = 0
  for (const parts of Object.values(data.models)) for (const part of parts) {
    assert.ok(['trunk', 'foliage'].includes(part.material))
    assert.equal(part.positions.length % 3, 0)
    assert.equal(part.normals.length, part.positions.length)
    assert.equal(part.indices.length % 3, 0)
    assert.ok(part.positions.every(value => Number.isInteger(value) && Math.abs(value) <= 32767))
    assert.ok(part.indices.every(index => Number.isInteger(index) && index >= 0 && index < part.positions.length / 3))
    for (let i = 0; i < part.normals.length; i += 3) {
      const length = Math.hypot(...part.normals.slice(i, i + 3)) / data.normalScale
      assert.ok(Math.abs(length - 1) < .002)
    }
    triangles += part.indices.length / 3
  }
  assert.ok(data.positionScale > 0 && data.normalScale > 0)
  assert.ok(triangles > 0 && triangles < 10000)
})

test('empty and invalid inputs use the real default experience', () => {
  assert.deepEqual(parseExperience(''), { space: 'atrium', light: 'morning' })
  assert.deepEqual(parseExperience('?space=missing&light=midnight'), { space: 'atrium', light: 'morning' })
  assert.deepEqual(parseExperience('?space=%3Csvg%20onload%3Dalert(1)%3E&light=__proto__'), { space: 'atrium', light: 'morning' })
  assert.deepEqual(parseExperience('?space=water&light=invalid'), { space: 'water', light: 'morning' })
})

test('each of the nine valid experiences survives a shared URL round trip', () => {
  for (const space of SPACES) {
    for (const light of LIGHTS) {
      const state = { space: space.id, light: light.id }
      assert.deepEqual(parseExperience(experienceSearch(state)), state)
    }
  }
})

test('query parsing tolerates unrelated data and chooses the first duplicate', () => {
  assert.deepEqual(parseExperience('?utm_source=study&space=garden&light=dusk'), { space: 'garden', light: 'dusk' })
  assert.deepEqual(parseExperience('?space=water&space=garden&light=noon&light=dusk'), { space: 'water', light: 'noon' })
  assert.deepEqual(parseExperience('?space=&light='), { space: 'atrium', light: 'morning' })
})

test('postcard contains selected architecture and light, original SVG and fictional status', () => {
  const card = createDesignCard({ space: 'water', light: 'dusk' })
  assert.match(card, /^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg"/)
  assert.match(card, /Water Court/)
  assert.match(card, /Dusk/)
  assert.match(card, /Fictional architecture concept/)
  assert.match(card, /viewBox="0 0 1200 1600"/)
  assert.doesNotMatch(card, /<script|<foreignObject|\son\w+=|href=|url\(https?:/i)
  assert.equal(designCardFilename({ space: 'water', light: 'dusk' }), 'velora-water-dusk.svg')
})

test('the downloadable study changes for every spatial and light choice', () => {
  const cards = new Set(SPACES.flatMap(space => LIGHTS.map(light => createDesignCard({ space: space.id, light: light.id }))))
  assert.equal(cards.size, 9)
})

test('runtime-invalid export input is normalized and cannot inject SVG markup', () => {
  const card = createDesignCard({ space: '<script>alert(1)</script>', light: '" onload="alert(1)' } as never)
  assert.match(card, /Atrium of Light/)
  assert.match(card, /Morning/)
  assert.doesNotMatch(card, /alert\(1\)|<script|onload/)
  assert.equal(designCardFilename({ space: '../bad', light: '<svg>' } as never), 'velora-atrium-morning.svg')
})
