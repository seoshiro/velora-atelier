export type SpaceId = 'atrium' | 'water' | 'garden'
export type LightId = 'morning' | 'noon' | 'dusk'
export type Experience = Readonly<{ space: SpaceId; light: LightId }>

export const SPACES = [
  {
    id: 'atrium', number: '01', title: 'Atrium of Light', subtitle: 'A threshold between worlds.',
    description: 'An open arch catches the first light. Beyond it, a still pool turns the sky into another room. A place to arrive, then forget the hurry.',
    material: 'Warm limestone', area: '240 m²', ritual: 'Pause at the threshold.',
  },
  {
    id: 'water', number: '02', title: 'Water Court', subtitle: 'Where the day becomes still.',
    description: 'Long walls frame a narrow ribbon of water. Light moves across the stone while the surface holds everything quiet. Architecture measured in reflections.',
    material: 'Honed travertine', area: '180 m²', ritual: 'Follow the reflection.',
  },
  {
    id: 'garden', number: '03', title: 'Quiet Garden', subtitle: 'A little room for the sky.',
    description: 'A sheltered garden opens to the changing sky. Rounded stone, a single tree and a place to sit. Nothing to complete. Only a moment to notice.',
    material: 'Weathered sandstone', area: '160 m²', ritual: 'Sit with the changing light.',
  },
] as const satisfies readonly { id: SpaceId; number: string; title: string; subtitle: string; description: string; material: string; area: string; ritual: string }[]

export const LIGHTS = [
  { id: 'morning', label: 'Morning', time: '07:30', description: 'Soft light. Long shadows. A slow beginning.' },
  { id: 'noon', label: 'Midday', time: '12:00', description: 'Clear light reveals the grain of the stone.' },
  { id: 'dusk', label: 'Dusk', time: '18:40', description: 'Warm stone holds the last light of the day.' },
] as const satisfies readonly { id: LightId; label: string; time: string; description: string }[]

function normalizeExperience(state: { space?: unknown; light?: unknown }): Experience {
  return {
    space: SPACES.find(space => space.id === state.space)?.id ?? 'atrium',
    light: LIGHTS.find(light => light.id === state.light)?.id ?? 'morning',
  }
}

export function parseExperience(search: string): Experience {
  const params = new URLSearchParams(search)
  return normalizeExperience({ space: params.get('space'), light: params.get('light') })
}

export function experienceSearch(state: Experience): string {
  const safe = normalizeExperience(state)
  return `?${new URLSearchParams({ space: safe.space, light: safe.light }).toString()}`
}

const escapeXml = (value: string) => value.replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[character]!)

const cardPalettes = {
  morning: { sky: '#d9dfd0', stone: '#c9b99c', stoneSide: '#a39073', shade: '#756e58', water: '#8aaba2', ink: '#263c32' },
  noon: { sky: '#d5e2db', stone: '#e0cfaa', stoneSide: '#b6a080', shade: '#80745d', water: '#77a59a', ink: '#263c32' },
  dusk: { sky: '#d8b09a', stone: '#c99d7b', stoneSide: '#a77760', shade: '#6e6054', water: '#718e89', ink: '#263c32' },
} as const

function architectureStudy(space: SpaceId, light: LightId): string {
  const palette = cardPalettes[light]
  const ground = `<path d="M100 700 600 495 1100 700 600 965Z" fill="${palette.stone}"/><path d="M100 700v35l500 230v-35Z" fill="${palette.stoneSide}"/><path d="m600 930 500-230v35L600 965Z" fill="${palette.shade}"/>`
  const water = `<path d="m285 738 315-129 315 129-315 143Z" fill="${palette.water}"/><path d="m340 737 260-106 260 106-260 118Z" fill="none" stroke="#e1e5cf" stroke-width="2" opacity=".45"/><path d="m390 756 210-87 210 87m-335 36 125-53 125 53m-171 26 46-19 46 19" fill="none" stroke="#e1e5cf" stroke-width="2" opacity=".5"/>`
  if (space === 'water') {
    return `${ground}<path d="m205 656 122-51 333 139-120 53Z" fill="${palette.shade}" opacity=".4"/><path d="M205 656V383l84-35v273Z" fill="${palette.stoneSide}"/><path d="M205 383 600 221l84 35-395 165Z" fill="${palette.stone}"/><path d="M600 221v274l84 36V256Z" fill="${palette.shade}"/><path d="M289 421 684 256v275l-43-18V317L332 446v200l-43-25Z" fill="${palette.stone}"/><path d="m600 540 315 129-315 143-315-143Z" fill="${palette.water}"/><path d="M397 664 600 580l203 84m-342 31 139-58 139 58m-253 43 114-50 114 50" fill="none" stroke="#e1e5cf" opacity=".5" stroke-width="2"/><path d="M790 655V400l52-21v255Zm52-276 93 39v256l-51-21V452l-42-18Z" fill="${palette.stone}"/><path d="m842 379 45-19 93 39-45 19Z" fill="${palette.stoneSide}"/><path d="M935 418 980 399v256l-45 19Z" fill="${palette.shade}"/>`
  }
  if (space === 'garden') {
    return `${ground}<path d="M202 650V395L600 232l382 157v264L600 815Z" fill="${palette.stoneSide}"/><path d="M246 632V420L600 276l338 139v217L600 775Z" fill="${palette.sky}"/><path d="M246 632V420l66 27v215Z" fill="${palette.shade}"/><path d="m312 662 288-118 338 88-338 143Z" fill="${palette.stone}"/><path d="m395 680 205-85 185 76-205 92Z" fill="${palette.shade}" opacity=".25"/><ellipse cx="608" cy="656" rx="96" ry="42" fill="#9a9b7e"/><path d="M608 655c-3-83-24-114-13-219m9 129-51-77m49 30 48-77" stroke="#696d51" stroke-width="11" fill="none" stroke-linecap="round"/><g fill="#73866b"><ellipse cx="556" cy="441" rx="63" ry="38" transform="rotate(-22 556 441)"/><ellipse cx="633" cy="400" rx="66" ry="45" transform="rotate(25 633 400)"/><ellipse cx="674" cy="460" rx="49" ry="37" transform="rotate(-29 674 460)"/><ellipse cx="578" cy="380" rx="42" ry="31" transform="rotate(-42 578 380)"/></g><path d="m729 707 93-38 96 40-93 42Z" fill="${palette.stoneSide}"/><path d="m729 707 96 44v27l-96-43Zm96 44 93-42v27l-93 42Z" fill="${palette.shade}"/>`
  }
  return `${ground}${water}<path d="M315 668 487 595 781 715 608 791Z" fill="${palette.shade}" opacity=".36"/><path d="M317 660V388c0-115 76-208 171-208s171 93 171 208v143l-59 26V384c0-78-50-141-112-141S376 306 376 384v250Z" fill="${palette.stoneSide}"/><path d="m317 660 55 23 59-26-55-23Zm342-129 55 23-59 26-55-23Z" fill="${palette.shade}"/><path d="M372 683V411c0-115 76-208 171-208s171 93 171 208v143l-59 26V407c0-78-50-141-112-141S431 329 431 407v250Z" fill="${palette.stone}"/><path d="M317 388c0-115 76-208 171-208 23 0 45 5 66 15-96-3-182 92-182 216Z" fill="${palette.stone}"/><path d="m431 657-55-23V384c0-78 50-141 112-141 18 0 35 5 51 15-60 3-108 66-108 149Z" fill="${palette.shade}"/><path d="m814 625 100-41 0 66-100 43Z" fill="${palette.stoneSide}"/><path d="m814 625 100-41 58 24-100 43Z" fill="${palette.stone}"/><path d="m872 651 100-43v66l-100 43Z" fill="${palette.shade}"/>`
}

export function createDesignCard(state: Experience): string {
  const safe = normalizeExperience(state)
  const space = SPACES.find(space => space.id === safe.space)!
  const light = LIGHTS.find(light => light.id === safe.light)!
  const palette = cardPalettes[safe.light]
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="1600" viewBox="0 0 1200 1600" role="img" aria-labelledby="title description"><title id="title">VELORA — ${escapeXml(space.title)} / ${escapeXml(light.label)}</title><desc id="description">Original architectural design study. Fictional architecture concept. ${escapeXml(space.ritual)}</desc><rect width="1200" height="1600" fill="#ede9de"/><path d="M80 123H1120M80 1120H1120M80 1460H1120" stroke="#879082" stroke-width="1"/><g fill="${palette.ink}"><text x="80" y="93" font-family="Georgia,serif" font-size="51" letter-spacing="7">VELORA</text><text x="1120" y="86" text-anchor="end" font-family="Arial,sans-serif" font-size="15" letter-spacing="3">SPATIAL STUDY / ${space.number}</text></g><rect x="80" y="155" width="1040" height="890" fill="${palette.sky}"/><g transform="translate(0 32)">${architectureStudy(safe.space, safe.light)}</g><text x="110" y="1005" fill="${palette.ink}" font-family="Arial,sans-serif" font-size="14" letter-spacing="2">ORIGINAL AXONOMETRIC STUDY · ${escapeXml(light.label.toUpperCase())} / ${light.time}</text><g fill="${palette.ink}"><text x="80" y="1200" font-family="Georgia,serif" font-size="70">${escapeXml(space.title)}</text><text x="82" y="1245" font-family="Georgia,serif" font-size="28" font-style="italic">${escapeXml(space.subtitle)}</text><g font-family="Arial,sans-serif" font-size="15" letter-spacing="2"><text x="82" y="1325">MATERIAL</text><text x="505" y="1325">LIGHT</text><text x="870" y="1325">CONCEPT AREA</text></g><g font-family="Georgia,serif" font-size="25"><text x="82" y="1364">${escapeXml(space.material)}</text><text x="505" y="1364">${escapeXml(light.label)} · ${light.time}</text><text x="870" y="1364">${escapeXml(space.area)}</text></g><text x="82" y="1420" font-family="Georgia,serif" font-size="24">${escapeXml(space.ritual)}</text><text x="82" y="1506" font-family="Arial,sans-serif" font-size="16">Fictional architecture concept · No physical venue or booking service.</text><text x="82" y="1542" font-family="Arial,sans-serif" font-size="14">Original artwork and design, VELORA. Released under CC BY 4.0.</text></g></svg>`
}

export function designCardFilename(state: Experience): string {
  const safe = normalizeExperience(state)
  return `velora-${safe.space}-${safe.light}.svg`
}
