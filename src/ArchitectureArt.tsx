import { useId } from 'react'

export type SpaceId = 'atrium' | 'water' | 'garden'
export type LightId = 'morning' | 'noon' | 'dusk'

/** Original architectural illustration: also the always-available WebGL fallback. */
export default function ArchitectureArt({ space = 'atrium', light = 'morning', className = '' }: { space?: SpaceId; light?: LightId; className?: string }) {
  const id = useId().replace(/:/g, '')
  const dusk = light === 'dusk'
  const noon = light === 'noon'
  const stone = dusk ? '#b79b84' : noon ? '#d8cbae' : '#cdbb9d'
  const face = dusk ? '#e1c2a0' : noon ? '#f1e5cb' : '#e7d6b8'
  const dark = dusk ? '#716f65' : noon ? '#a4ab91' : '#8e927c'
  return <svg className={`architecture-art ${className}`} viewBox="0 0 1400 800" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">
    <defs>
      <linearGradient id={`${id}-ground`} x2="0" y2="1"><stop stopColor={dusk ? '#ccbdad' : noon ? '#efe9d9' : '#e6ddc9'} /><stop offset="1" stopColor={dusk ? '#c3b59e' : noon ? '#e4d9bf' : '#d7c9ad'} /></linearGradient>
      <linearGradient id={`${id}-water`} x1="0" y1="1" x2="1" y2="0"><stop stopColor={dusk ? '#557775' : noon ? '#79aaa4' : '#6b9a95'} /><stop offset=".5" stopColor={noon ? '#aed0bd' : '#9db7a9'} /><stop offset="1" stopColor={dusk ? '#bda98f' : '#c3c4a6'} /></linearGradient>
      <linearGradient id={`${id}-inner`} x2="1" y2="0"><stop stopColor="#7b7d68" /><stop offset="1" stopColor="#b9aa8e" /></linearGradient>
      <pattern id={`${id}-ripple`} width="65" height="20" patternUnits="userSpaceOnUse" patternTransform="rotate(-14)"><path d="M0 8 Q15 3 32 8T65 8M0 15 Q20 20 65 15" fill="none" stroke="#dfecd1" strokeWidth="1" opacity=".35" /></pattern>
      <pattern id={`${id}-grain`} width="93" height="57" patternUnits="userSpaceOnUse"><path d="M8 13h17m20 20h30M60 7h12M10 48h32" stroke="#726c5c" strokeWidth=".6" opacity=".16"/><circle cx="37" cy="21" r=".8" fill="#756a54" opacity=".2"/></pattern>
    </defs>
    <rect width="1400" height="800" fill={`url(#${id}-ground)`} />
    <path d="M0 290 700 140 1400 310V800H0Z" fill={dusk ? '#c9b79b' : noon ? '#eadfc6' : '#dfd1b5'}/>
    <path d="m172 414 598-144 392 213-589 164Z" fill="#c4b28f"/>
    <path d="m172 414 401 233v24L172 440Z" fill="#b6a587"/>
    <path d="m573 647 589-164v24L573 671Z" fill="#a79e83"/>
    <path d="m573 647 589-164 175 91-594 180Z" fill="#dad0b6"/>
    <path d="m743 754 594-180v13L743 770Z" fill="#b2a58b"/>
    <path d="m404 438 371-94 435 226-374 110Z" fill={`url(#${id}-water)`}/>
    <path d="m404 438 371-94 435 226-374 110Z" fill={`url(#${id}-ripple)`}/>
    <path d={noon ? 'm567 445 116-29 115 61-116 34Z' : 'm567 445 116-29 292 155-116 34Z'} fill="#556e66" opacity={noon ? '.16' : '.27'}/>
    <path d={noon ? 'm719 414 77-21 110 59-80 25Z' : 'm719 414 77-21 290 155-80 25Z'} fill="#64776b" opacity={noon ? '.12' : '.2'}/>
    {space !== 'garden' ? <>
      <path d="m371 386 0-285 374-89v285l-63 17V183c0-60-86-43-86 23v130l-53 13V218c0-61-86-43-86 24v123Z" fill={face}/>
      <path d="m745 12 48 26v285l-48-26Z" fill={stone}/>
      <path d="m371 101 48 25 374-88-48-26Z" fill="#eddfc4"/>
      <path d="M457 365V242c0-67 86-85 86-24v131l-21-10V220c0-31-42-34-42 18v121Z" fill={`url(#${id}-inner)`}/>
      <path d="M596 336V206c0-66 86-83 86-23v131l-21-11V185c0-31-42-34-42 18v128Z" fill={`url(#${id}-inner)`}/>
      <path d="m371 386 0-285 374-89v285l-63 17V183c0-60-86-43-86 23v130l-53 13V218c0-61-86-43-86 24v123Z" fill={`url(#${id}-grain)`}/>
      {space === 'water' ? <>
        <path d="m824 322 0-198 206 104v199l-206-105Zm51-22 101 52v-81l-101-50Z" fill={face} fillRule="evenodd"/>
        <path d="m1030 228 29-8v199l-29 8Z" fill={stone}/>
        <path d="m824 124 30-8 205 104-29 8Z" fill="#eddfc4"/>
        <path d="m875 300 101 52v-20l-83-43v-59l-18-9Z" fill={dark}/>
      </> : <>
        <path d="m306 353-130-69v-179l130 69Z" fill={stone}/>
        <path d="m306 174 29-8v179l-29 8Z" fill="#b7a78b"/>
        <path d="m176 105 29-8 130 69-29 8Z" fill="#f0e1c2"/>
      </>}
    </> : <>
      <path d="m345 389 0-213 303-73v213l-303 73Z" fill={face}/>
      <path d="m648 103 32 17v213l-32-17Z" fill={stone}/>
      {[0, 1, 2, 3, 4, 5].map(i => <g key={i}><path d={`m${408 + i * 63} ${235 + i * 34}v-141l13-4v141Z`} fill={stone}/><path d={`m${408 + i * 63} ${94 + i * 34} 228-57 15 8-230 58Z`} fill="#ded0af"/><path d={`m${408 + i * 63} ${235 + i * 34} 353 187-12 4-354-187Z`} fill="#7d866f" opacity=".18"/></g>)}
      <path d="m345 176 303-73 217 113-303 73Z" fill="none" stroke="#ede0bd" strokeWidth="13"/>
    </>}
    <path d="m235 494 140-35 119 62-143 39Z" fill="#e8dcbe"/>
    <path d="m235 494v16l116 66v-16Z" fill="#baad91"/>
    <path d="m351 560 143-39v16l-143 39Z" fill="#ab9f83"/>
    <path d="m203 520 145-37 115 62-145 42Z" fill="#e8dcbe"/>
    <path d="m203 520v16l115 67v-16Z" fill="#baad91"/>
    <path d="m318 587 145-42v16l-145 42Z" fill="#ab9f83"/>
    <path d="m171 546 145-37 115 62-145 42Z" fill="#e8dcbe"/>
    <path d="m171 546v16l115 67v-16Z" fill="#baad91"/>
    <path d="m286 613 145-42v16l-145 42Z" fill="#ab9f83"/>
    <path d="m1006 448 56-15 65 33-56 16Z" fill="#c3b391"/>
    <path d="m1070 435 140 77-17 5-140-77Z" fill="#78836b" opacity=".22"/>
    <path d="M1068 445V266" stroke="#766e50" strokeWidth="6"/>
    <path d="M1068 258c-31 39-30 70-17 99-20 14-14 58 17 58 31-1 40-39 20-58 14-26 11-59-20-99Z" fill="#66735c"/>
    <path d="M1068 258c0 58-10 97 0 157 31-1 40-39 20-58 14-26 11-59-20-99Z" fill="#4f6350" opacity=".55"/>
    {space === 'garden' ? <g><path d="M824 390V216" stroke="#766e50" strokeWidth="5"/><path d="M824 219c-52-40-112 8-67 50-25 49 39 80 67 50 28 30 92-1 67-50 45-42-15-90-67-50Z" fill="#71806a"/><path d="m823 390 211 112-46 12-212-110Z" fill="#65725d" opacity=".17"/></g> : null}
    <path d="M0 770Q700 720 1400 770" fill="none" stroke="#e7ddc8" strokeWidth="1" opacity=".8"/>
  </svg>
}
