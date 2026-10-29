import {useEffect, useMemo, useRef} from 'react'
import {useFrame} from '@react-three/fiber'
import {useTranslation} from 'react-i18next'
import {BoxGeometry, type Group} from 'three'
import {useMuseumNavigation} from '@/features/museum/navigationState'
import {Block, Sign} from './MuseumPrimitives'
import {EntranceArtifact, EntranceBatch, type EntrancePart} from './EntranceArtifacts'
import {EntrancePanel, type EntrancePanelContent} from './EntrancePanels'
import {EntranceStoneFloor} from './EntranceStoneFloor'
import {EntranceStudy} from './EntranceStudy'
import {MuseumPlaque} from './MuseumPlaque'
import {useMuseumVisualResources} from './MuseumVisualResources'
import {entranceBayMap,entranceSurplusPlates} from './entranceBayMap'
import {entranceWall,entranceColumns,entrancePosterY,entrancePosterWall} from './entranceWallLayout'
import type {MuseumStory,StoryPoint} from './museumStoryDrawing'

const gold = '#ffb547', bronze = '#756044'
// Keep every case outside the existing ±5.5 m walking envelope. The route stays unchanged.
const entranceCases = entranceBayMap

function OrbitalCeiling({reduced}: {reduced: boolean}) {
    const orbital = useRef<Group>(null), phase = useRef(0)
    useFrame((_, dt) => {
        const nav = useMuseumNavigation.getState()
        if (reduced || nav.atmospherePaused || nav.overlay || nav.mode === 'inspect' || document.hidden ||
            (nav.mode === 'guided' && !nav.playing && nav.progress > .01 && nav.progress < .99)) return
        phase.current += Math.min(dt, .05) * .065
        if (orbital.current) orbital.current.rotation.y = phase.current
    })
    return <group name="entrance-orbital-ceiling" position={[0, 5.25, 8.5]}>
        <mesh>
            <cylinderGeometry args={[3.25, 3.25, .2, 64]}/>
            <meshStandardMaterial color="#17191c" metalness={.7} roughness={.32}/>
        </mesh>
        {[3.12, 2.72, 1.82].map((r, i) => <group key={r}>
            <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, -.15 - i * .045, 0]}>
                <torusGeometry args={[r, .045, 6, 64]}/>
                <meshStandardMaterial color={bronze} metalness={.8} roughness={.25}/>
            </mesh>
            <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, -.2 - i * .045, 0]}>
                <torusGeometry args={[r, .012, 5, 64]}/>
                <meshBasicMaterial color={gold} toneMapped={false}/>
            </mesh>
        </group>)}
        <Block at={[0, -.65, 0]} size={[.012, 1.25, .012]} color={bronze}/>
        <group ref={orbital} name="entrance-orbits" position={[0, -1.1, 0]}>
            <mesh><sphereGeometry args={[.37, 24, 16]}/><meshStandardMaterial color="#6e5d40" metalness={.65} roughness={.25}/></mesh>
            {[0, 1, 2].map(i => <mesh key={`meridian:${i}`} rotation={[0, i * Math.PI / 3, 0]}>
                <torusGeometry args={[.374, .003, 4, 32]}/><meshBasicMaterial color={gold}/>
            </mesh>)}
            {[0, 1, 2].map(i => <mesh key={i} rotation={[.4 + i * .7, i * .8, .3]}>
                <torusGeometry args={[.72 + i * .15, .009, 5, 48]}/>
                <meshBasicMaterial color={gold} toneMapped={false}/>
            </mesh>)}
        </group>
    </group>
}

export function EntranceGallery({reduced}: {mobile: boolean; reduced: boolean}) {
    const {t,i18n} = useTranslation('museum'), rtl = i18n.language === 'fa', visual = useMuseumVisualResources()
    const storyContent=(kind:string):EntrancePanelContent=>({eyebrow:t('storyPlates.eyebrow'),title:t(`storyPlates.${kind}.title`),lines:t(`storyPlates.${kind}.caption`,{returnObjects:true}) as string[],footer:t('entrancePlates.educational'),story:{kind,labels:t(`storyPlates.${kind}.labels`,{returnObjects:true}) as string[],...(kind.endsWith('Timeline')?{milestones:t(`storyPlates.${kind}.milestones`,{returnObjects:true}) as StoryPoint[]}:{} )} as MuseumStory})
    const glassGeometry = useMemo(() => new BoxGeometry(1.015, 1.34, 1.315), [])
    useEffect(() => () => glassGeometry.dispose(), [glassGeometry])
    const parts = useMemo(() => {
        const dark: EntrancePart[] = [], trim: EntrancePart[] = [], light: EntrancePart[] = [], stone: EntrancePart[] = []
        const add = (list: EntrancePart[], at: EntrancePart['at'], size: EntrancePart['size']) => list.push({at, size})
        add(dark, [0, 6.3, 10.5], [14, .35, 19])
        for (const side of [-1, 1]) {
            add(dark, [side * entranceWall.x, entranceWall.height/2, entranceWall.centerZ], [entranceWall.thickness, entranceWall.height, entranceWall.length])
            add(stone, [side * 5.1, 2.65, 2.7], [3.4, 5.3, .65])
            for (const z of entranceColumns) {
                add(trim, [side * 6.8, 3.05, z], [.18, 6.1, entranceWall.columnWidth])
                add(light, [side * 6.68, 3.05, z], [.018, 5.9, .025])
            }
            add(trim, [side * 6.75, .12, 10.5], [.22, .24, 18.5])
            add(light, [side * 6.61, .15, 10.5], [.018, .035, 18.5])
            add(light, [side * 6.65, 5.8, 10.5], [.025, .025, 18.5])
            add(light, [side * 4.8, .002, 10.4], [.012, .008, 14.8])
            add(trim, [side * 3.35, 2.65, 2.98], [.3, 5.3, .54])
            add(light, [side * 3.16, 2.65, 3.27], [.025, 5.15, .018])
        }
        for (const z of [3.2, 4.05, 17.8, 19.1]) {
            add(trim, [0, entranceWall.ceilingBeamCenterY, z], [13.65, entranceWall.ceilingBeamHeight, .28])
            add(light, [0, entranceWall.ceilingLightCenterY, z + .02], [13.3, entranceWall.ceilingLightHeight, .025])
        }
        add(stone, [0, 4.8, 2.7], [6.3, .95, .65])
        add(light, [0, 4.3, 3.06], [6.25, .022, .025])
        for (const {x, z} of entranceCases) {
            add(dark, [x, .61, z], [1.02, 1.2, 1.32])
            add(trim, [x, 1.23, z], [1.06, .06, 1.36])
            add(light, [x, .1, z], [1.04, .035, 1.34])
            add(dark, [x, 1.27, z], [1.04, .018, 1.34])
            for (const dx of [-.51, .51]) add(light, [x + dx, 1.28, z], [.012, .012, 1.34])
            for (const dz of [-.66, .66]) add(light, [x, 1.28, z + dz], [1.04, .012, .012])
            add(dark, [x, 1.36, z], [.58, .12, .58])
            add(dark, [x, 1.61, z - .1], [.035, .45, .035])
            for (const dx of [-.51, .51]) for (const dz of [-.66, .66])
                add(trim, [x + dx, 1.95, z + dz], [.016, 1.36, .016])
            for (const dx of [-.51, .51]) add(trim, [x + dx, 2.63, z], [.018, .018, 1.34])
            for (const dz of [-.66, .66]) add(trim, [x, 2.63, z + dz], [1.04, .018, .018])
        }
        return {dark, trim, light, stone}
    }, [])
    const intro: EntrancePanelContent = rtl ? {
        eyebrow: '۰۱ / راهنمای مسیر', title: 'داستان رایانش، داستان ماست.',
        lines: ['کاوش در ماشین‌ها، ایده‌ها و آدم‌هایی', 'که جهان دیجیتال را ساختند.', 'فناوری، نوآوری و انسان.'], footer: 'نمایشگاه‌ها  /  مجموعه  /  تور راهنما', diagram: 'intro',
    } : {
        eyebrow: '01 / ORIENTATION', title: 'Computing connects us.',
        lines: ['Explore the machines, ideas and people', 'that shaped our digital world.', 'Technology. Innovation. Humanity.'], footer: 'EXHIBITIONS  /  COLLECTION  /  GUIDED TOUR', diagram: 'intro',
    }
    const people: EntrancePanelContent[] = rtl ? [
        {eyebrow: '۱۸۴۳  /  فراتر از محاسبه', title: 'آدا لاولیس', lines: ['چشم‌اندازی فراتر', 'از عدد و محاسبه.'], footer: 'یادداشت‌های ماشین تحلیلی', portrait: '/images/museum/entrance/ada-lovelace.jpg'},
        {eyebrow: '۱۹۳۶  /  ماشین همگانی', title: 'آلن تورینگ', lines: ['یک ماشین،', 'دستورهای بسیار.'], footer: 'بنیان‌های رایانش', portrait: '/images/museum/entrance/alan-turing.jpg'},
    ] : [
        {eyebrow: '1843  /  BEYOND CALCULATION', title: 'Ada Lovelace', lines: ['Imagining more', 'than numbers.'], footer: 'NOTES ON THE ANALYTICAL ENGINE', portrait: '/images/museum/entrance/ada-lovelace.jpg'},
        {eyebrow: '1936  /  THE UNIVERSAL MACHINE', title: 'Alan Turing', lines: ['One machine.', 'Many instructions.'], footer: 'FOUNDATIONS OF COMPUTING', portrait: '/images/museum/entrance/alan-turing.jpg'},
    ]
    return <group name="museum-entrance-gallery" userData={{locale: rtl ? 'fa' : 'en', decorative: true,wallLayout:entrancePosterWall}}>
        <EntranceStoneFloor/>
        <EntranceBatch name="entrance-graphite" parts={parts.dark} color="#45474b"/>
        <EntranceBatch name="entrance-stone" parts={parts.stone} color="#3c3e43"/>
        <EntranceBatch name="entrance-bronze" parts={parts.trim} color={bronze}/>
        <EntranceBatch name="entrance-light-trim" parts={parts.light} color={gold} luminous/>
        <OrbitalCeiling reduced={reduced}/>
        <Sign at={[0, 5, 3.08]} width={4.5} title="C O R E" subtitle={rtl ? 'آرشیو به‌هم‌پیوسته' : 'THE CONNECTED ARCHIVE'} center/>
        <Sign at={[0, 4.53, 3.09]} width={3.3} title={rtl ? 'موزهٔ تعاملی کامپیوتر' : 'INTERACTIVE COMPUTER MUSEUM'} subtitle="" center/>
        <EntrancePanel content={intro} at={[-5.06, 2.73, 3.08]} width={2.9} height={4.55} rtl={rtl}/>
        {people.map((content, i) => <EntrancePanel key={i} content={content} at={[4.26 + i * 1.6, 2.65, 3.08]} width={1.48} height={3.95} rtl={rtl}/>)}
        {entranceBayMap.map(bay => <EntrancePanel key={bay.kind} width={entranceWall.posterWidth} height={entranceWall.posterHeight} at={[Math.sign(bay.x)*6.775,entrancePosterY,bay.z]} rotation={-Math.sign(bay.x)*Math.PI/2} rtl={rtl} content={storyContent(bay.story)}/>)}
        {entranceSurplusPlates.map(plate=><EntrancePanel key={`rear:${plate.side}`} width={entranceWall.posterWidth} height={entranceWall.posterHeight} at={[plate.side*6.775,entrancePosterY,plate.z]} rotation={-plate.side*Math.PI/2} rtl={rtl} content={storyContent(plate.story)}/>)}
        {entranceCases.map(({x, z, kind, en, fa}, i) => <group key={kind} name={`entrance-vitrine:${kind}`} position={[x, 0, z]}>
            <EntranceStudy kind={kind} index={i}><EntranceArtifact kind={kind}/></EntranceStudy>
            <mesh name="museum-case-glass" position={[0, 1.95, 0]} renderOrder={30} raycast={()=>null} material={visual.glass} geometry={glassGeometry} dispose={null}/>
            <group position={[-Math.sign(x)*.535,.73,.02]} rotation={[0,-Math.sign(x)*Math.PI/2,0]}>
                <MuseumPlaque title={rtl?fa:en} secondary={t(`entrancePlates.hardware.${kind}`)} tag={`${String(i+1).padStart(2,'0')} / ${t('entrancePlates.prototype')}`} rtl={rtl}/>
            </group>
        </group>)}
        {/* Flush floor medallion: an arrival marker, never a collision obstacle. */}
        <group position={[0, .001, 12]} rotation={[-Math.PI / 2, 0, 0]}>
            {[1.25, 1.7].map(r => <mesh key={r}><ringGeometry args={[r, r + .012, 64]}/><meshBasicMaterial color={bronze}/></mesh>)}
        </group>
    </group>
}
