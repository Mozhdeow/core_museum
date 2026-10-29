import {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
    type CSSProperties,
} from 'react'
import {useTranslation} from 'react-i18next'

import {useMediaQuery} from '@/hooks/usePreferences'
import {markIntroSeen, type IntroMode} from '../hooks/useIntroState'
import {monitorAssets} from '../config/monitorGeometry'
import {DesktopMonitorShell} from './DesktopMonitorShell'

type IntroLineKey =
    | 'eyebrowPrimary'
    | 'eyebrowSecondary'
    | 'core'
    | 'preparing'
    | 'status'
    | 'progressLabel'
    | 'kernel'
    | 'module'
    | 'year'

type TypingLine = {
    key: IntroLineKey
    text: string
    charDelay: number
    pause: number
}

type TypingTextProps = {
    text: string
    sourceText?: string
    active: boolean
    className?: string
}

function TypingText({
                        text,
                        sourceText,
                        active,
                        className = '',
                    }: TypingTextProps) {
    const fullText = sourceText ?? text

    const direction =
        /[\u0590-\u08ff]/.test(fullText)
            ? 'rtl'
            : 'ltr'

    return (
        <span
            className={`landing-intro__typing-text ${className}`.trim()}
            dir={direction}
            aria-label={fullText}
        >
            <span
                className="landing-intro__typing-measure"
                aria-hidden="true"
            >
                {fullText || '\u00a0'}
            </span>

            <span
                className="landing-intro__typing-value"
                aria-hidden="true"
            >
                {text}

                {active && (
                    <i
                        className="landing-intro__typing-caret"
                        aria-hidden="true"
                    />
                )}
            </span>
        </span>
    )
}

export function LandingIntro({
                                 mode,
                                 onComplete,
                             }: {
    mode: IntroMode
    onComplete: () => void
}) {
    const {t} = useTranslation('landing')

    const isMobileViewport =
        useMediaQuery('(max-width: 600px)')

    const [mobileAssetFailed, setMobileAssetFailed] =
        useState(false)

    const [progress, setProgress] =
        useState(0)

    const [typedLines, setTypedLines] =
        useState<Partial<Record<IntroLineKey, string>>>({})

    const [typingKey, setTypingKey] =
        useState<IntroLineKey | null>(null)

    const [typingDone, setTypingDone] =
        useState(false)

    const [resourcesReady, setResourcesReady] =
        useState(false)

    const [completed, setCompleted] =
        useState(false)

    const [exiting, setExiting] =
        useState(false)

    const progressRef = useRef(0)
    const finished = useRef(false)

    const completionTimer =
        useRef<number | null>(null)

    const exitTimer =
        useRef<number | null>(null)

    const statusCopy =
        t('introStatus')

    const progressLabel =
        mode === 'short'
            ? t('introEntering')
            : t('introLoading')

    const introAsset =
        isMobileViewport && !mobileAssetFailed
            ? monitorAssets.mobileIntro
            : monitorAssets.desktop

    /*
     * The progress UI becomes visible as soon as
     * we REACH the loading line.
     */
    const progressStageStarted =
        typingKey === 'progressLabel'
        || Boolean(typedLines.progressLabel)
        || Boolean(typedLines.kernel)
        || Boolean(typedLines.module)
        || Boolean(typedLines.year)
        || typingDone

    /*
     * But actual fill starts only after the
     * loading label has completely finished typing.
     */
    const progressFillReady =
        typedLines.progressLabel === progressLabel

    const typingLines = useMemo<TypingLine[]>(
        () => [
            {
                key: 'eyebrowPrimary',
                text: 'CORE SYSTEM',
                charDelay: 56,
                pause: 230,
            },
            {
                key: 'eyebrowSecondary',
                text: 'ARCHIVE INITIALIZATION',
                charDelay: 43,
                pause: 250,
            },
            {
                key: 'core',
                text: 'CORE',
                charDelay: 78,
                pause: 280,
            },
            {
                key: 'preparing',
                text: t('introPreparing'),
                charDelay: 52,
                pause: 260,
            },
            {
                key: 'status',
                text: statusCopy,
                charDelay: 58,
                pause: 310,
            },
            {
                key: 'progressLabel',
                text: progressLabel,
                charDelay: 48,
                pause: 300,
            },
            {
                key: 'kernel',
                text: 'ARCHIVE KERNEL',
                charDelay: 42,
                pause: 180,
            },
            {
                key: 'module',
                text: 'MODULE 01 / DISPLAY',
                charDelay: 39,
                pause: 180,
            },
            {
                key: 'year',
                text: 'CORE / 2026',
                charDelay: 43,
                pause: 200,
            },
        ],
        [
            progressLabel,
            statusCopy,
            t,
        ],
    )

    /*
     * Final completion transition.
     */
    const finish = useCallback(() => {
        if (finished.current) return

        finished.current = true

        if (mode !== 'skip') {
            markIntroSeen(mode)
        }

        progressRef.current = 1
        setProgress(1)
        setCompleted(true)

        /*
         * Let the 100% state breathe.
         */
        completionTimer.current =
            window.setTimeout(() => {
                setExiting(true)

                exitTimer.current =
                    window.setTimeout(
                        onComplete,
                        520,
                    )
            }, 480)
    }, [
        mode,
        onComplete,
    ])

    /*
     * SKIP mode should not unnecessarily mount
     * the visible sequence.
     */
    useEffect(() => {
        if (mode !== 'skip') return
        if (finished.current) return

        finished.current = true
        onComplete()
    }, [
        mode,
        onComplete,
    ])

    /*
     * Keep mutable progress value synchronized.
     */
    useEffect(() => {
        progressRef.current = progress
    }, [progress])

    /*
     * Reset when a new non-skip intro begins.
     */
    useEffect(() => {
        if (mode === 'skip') return

        finished.current = false

        progressRef.current = 0

        setProgress(0)
        setTypedLines({})
        setTypingKey(null)
        setTypingDone(false)
        setResourcesReady(false)
        setCompleted(false)
        setExiting(false)
    }, [mode])

    /*
     * ------------------------------------------------
     * TYPEWRITER SEQUENCE
     * ------------------------------------------------
     */
    useEffect(() => {
        if (mode === 'skip') return

        let cancelled = false
        let timer: number | null = null

        const speedFactor =
            mode === 'short'
                ? 0.4
                : .55

        const initialDelay =
            mode === 'short'
                ? 220
                : 520

        const typeLine = (
            lineIndex: number,
        ) => {
            if (cancelled) return

            const line =
                typingLines[lineIndex]

            if (!line) {
                setTypingKey(null)
                setTypingDone(true)
                return
            }

            setTypingKey(line.key)

            let characterIndex = 0

            const typeCharacter = () => {
                if (cancelled) return

                characterIndex += 1

                setTypedLines(previous => ({
                    ...previous,
                    [line.key]:
                        line.text.slice(
                            0,
                            characterIndex,
                        ),
                }))

                const lineFinished =
                    characterIndex
                    >= line.text.length

                if (lineFinished) {
                    timer =
                        window.setTimeout(
                            () =>
                                typeLine(
                                    lineIndex + 1,
                                ),
                            Math.round(
                                line.pause
                                * speedFactor,
                            ),
                        )

                    return
                }

                timer =
                    window.setTimeout(
                        typeCharacter,
                        Math.max(
                            14,
                            Math.round(
                                line.charDelay
                                * speedFactor,
                            ),
                        ),
                    )
            }

            /*
             * Tiny breathing delay before
             * first character of every line.
             */
            timer =
                window.setTimeout(
                    typeCharacter,
                    Math.max(
                        30,
                        Math.round(
                            line.charDelay
                            * speedFactor,
                        ),
                    ),
                )
        }

        timer =
            window.setTimeout(
                () => typeLine(0),
                initialDelay,
            )

        return () => {
            cancelled = true

            if (timer !== null) {
                window.clearTimeout(timer)
            }
        }
    }, [
        mode,
        typingLines,
    ])

    /*
     * ------------------------------------------------
     * LOCK PAGE SCROLL WHILE INTRO IS ACTIVE
     * ------------------------------------------------
     */
    useEffect(() => {
        if (mode === 'skip') return

        const bodyOverflow =
            document.body.style.overflow

        const bodyOverflowX =
            document.body.style.overflowX

        const bodyOverflowY =
            document.body.style.overflowY

        const bodyOverscroll =
            document.body.style.overscrollBehavior

        const bodyTouchAction =
            document.body.style.touchAction

        const html =
            document.documentElement

        const documentOverflow =
            html.style.overflow

        const documentOverflowX =
            html.style.overflowX

        const documentOverflowY =
            html.style.overflowY

        const documentOverscroll =
            html.style.overscrollBehavior

        const documentTouchAction =
            html.style.touchAction

        const preventScroll = (
            event: Event,
        ) => {
            event.preventDefault()
        }

        const preventKeyboardScroll = (
            event: KeyboardEvent,
        ) => {
            const target = event.target

            if (
                target instanceof Element
                && target.closest(
                    'button, a, input, textarea, select, [contenteditable="true"]',
                )
            ) {
                return
            }

            if (
                [
                    'ArrowDown',
                    'ArrowUp',
                    'PageDown',
                    'PageUp',
                    'Home',
                    'End',
                    ' ',
                ].includes(event.key)
            ) {
                event.preventDefault()
            }
        }

        document.body.style.overflow =
            'hidden'

        document.body.style.overflowX =
            'hidden'

        document.body.style.overflowY =
            'hidden'

        document.body.style.overscrollBehavior =
            'none'

        document.body.style.touchAction =
            'none'

        html.style.overflow =
            'hidden'

        html.style.overflowX =
            'hidden'

        html.style.overflowY =
            'hidden'

        html.style.overscrollBehavior =
            'none'

        html.style.touchAction =
            'none'

        document.addEventListener(
            'wheel',
            preventScroll,
            {
                capture: true,
                passive: false,
            },
        )

        document.addEventListener(
            'touchmove',
            preventScroll,
            {
                capture: true,
                passive: false,
            },
        )

        document.addEventListener(
            'keydown',
            preventKeyboardScroll,
            true,
        )

        return () => {
            document.removeEventListener(
                'wheel',
                preventScroll,
                true,
            )

            document.removeEventListener(
                'touchmove',
                preventScroll,
                true,
            )

            document.removeEventListener(
                'keydown',
                preventKeyboardScroll,
                true,
            )

            document.body.style.overflow =
                bodyOverflow

            document.body.style.overflowX =
                bodyOverflowX

            document.body.style.overflowY =
                bodyOverflowY

            document.body.style.overscrollBehavior =
                bodyOverscroll

            document.body.style.touchAction =
                bodyTouchAction

            html.style.overflow =
                documentOverflow

            html.style.overflowX =
                documentOverflowX

            html.style.overflowY =
                documentOverflowY

            html.style.overscrollBehavior =
                documentOverscroll

            html.style.touchAction =
                documentTouchAction
        }
    }, [mode])

    /*
     * ------------------------------------------------
     * PRELOAD CRITICAL RESOURCES
     * ------------------------------------------------
     */
    useEffect(() => {
        if (mode === 'skip') return

        let cancelled = false

        setResourcesReady(false)

        const sources = [
            monitorAssets.desktop.src,
            introAsset.src,
            '/images/landing/hero/hero_desktop_setup.png',
        ].filter(
            (
                source,
                index,
                allSources,
            ) =>
                allSources.indexOf(source)
                === index,
        )

        const imagePromises =
            sources.map(
                source =>
                    new Promise<void>(
                        resolve => {
                            const image =
                                new Image()

                            image.onload =
                                () => resolve()

                            /*
                             * A failed optional image
                             * must not trap the intro.
                             */
                            image.onerror =
                                () => resolve()

                            image.src = source
                        },
                    ),
            )

        Promise.all([
            ...imagePromises,
            document.fonts?.ready
            ?? Promise.resolve(),
        ]).then(() => {
            if (cancelled) return

            setResourcesReady(true)
        })

        return () => {
            cancelled = true
        }
    }, [
        introAsset.src,
        mode,
    ])

    useEffect(() => {
        if (mode === 'skip') return
        if (!progressFillReady) return

        let frame = 0

        let previousTime = performance.now()

        let value =
            progressRef.current

        /*
         * Full intro = slower cinematic fill.
         * Short intro = quicker.
         */
        const duration =
            mode === 'short'
                ? 1300
                : 3000

        const tick = (
            now: number,
        ) => {
            const delta =
                Math.min(now - previousTime, 50,)

            previousTime = now

            const maximum =
                resourcesReady
                    ? 1
                    : 0.88

            value =
                Math.min(
                    maximum,
                    value
                    + delta / duration,
                )

            progressRef.current =
                value

            setProgress(value)

            if (value < 1) {
                frame =
                    requestAnimationFrame(
                        tick,
                    )
            }
        }

        frame =
            requestAnimationFrame(
                tick,
            )

        return () => {
            cancelAnimationFrame(frame)
        }
    }, [
        mode,
        progressFillReady,
        resourcesReady,
    ])

    /*
     * ------------------------------------------------
     * FINISH ONLY WHEN EVERYTHING IS READY
     * ------------------------------------------------
     */
    useEffect(() => {
        if (mode === 'skip') return

        if (!typingDone) return

        if (progress < 0.999) return

        if (!resourcesReady) return

        if (finished.current) return

        const timer =
            window.setTimeout(
                finish,
                380,
            )

        return () => {
            window.clearTimeout(timer)
        }
    }, [
        finish,
        mode,
        progress,
        resourcesReady,
        typingDone,
    ])

    /*
     * Cleanup completion timers.
     */
    useEffect(() => {
        return () => {
            if (
                completionTimer.current
                !== null
            ) {
                window.clearTimeout(
                    completionTimer.current,
                )
            }

            if (
                exitTimer.current
                !== null
            ) {
                window.clearTimeout(
                    exitTimer.current,
                )
            }
        }
    }, [])

    if (mode === 'skip') {
        return null
    }

    const percent =
        Math.round(progress * 100)

    const sceneStyle = {
        '--intro-scene-ratio':
            String(
                introAsset.width
                / introAsset.height,
            ),
    } as CSSProperties

    return (
        <div
            className={[
                'landing-intro',
                `landing-intro--${mode}`,
                completed
                    ? 'is-complete'
                    : '',
                exiting
                    ? 'is-exiting'
                    : '',
            ]
                .filter(Boolean)
                .join(' ')}
            role="dialog"
            aria-modal="true"
            aria-label={t('introPreparing')}
        >
            <div
                className="landing-intro__frame"
                style={sceneStyle}
            >
                <DesktopMonitorShell
                    intro
                    imageSrc={introAsset.src}
                    geometry={
                        introAsset.geometry
                    }
                    aspectRatio={
                        introAsset.width
                        / introAsset.height
                    }
                    onImageError={
                        isMobileViewport
                        && !mobileAssetFailed
                            ? () =>
                                setMobileAssetFailed(
                                    true,
                                )
                            : undefined
                    }
                >
                    <div
                        className="landing-intro__field"
                        aria-hidden="true"
                    >
                        <div className="landing-intro__orbit landing-intro__orbit--outer">
                            <i/>
                            <i/>
                        </div>

                        <div className="landing-intro__orbit landing-intro__orbit--inner">
                            <i/>
                            <i/>
                        </div>

                        <div className="landing-intro__arc landing-intro__arc--left"/>

                        <div className="landing-intro__arc landing-intro__arc--right"/>

                        {Array.from(
                            {length: 14},
                            (_, index) => (
                                <i
                                    className={`landing-intro__firefly landing-intro__firefly--${index + 1}`}
                                    key={
                                        index
                                    }
                                />
                            ),
                        )}

                        <div className="landing-intro__scanline"/>
                    </div>

                    <div className="landing-intro__screen-content">
                        <span className="landing-intro__eyebrow">
                            <TypingText
                                text={
                                    typedLines.eyebrowPrimary
                                    ?? ''
                                }
                                sourceText="CORE SYSTEM"
                                active={
                                    typingKey
                                    === 'eyebrowPrimary'
                                }
                            />

                            <i/>

                            <TypingText
                                text={
                                    typedLines.eyebrowSecondary
                                    ?? ''
                                }
                                sourceText="ARCHIVE INITIALIZATION"
                                active={
                                    typingKey
                                    === 'eyebrowSecondary'
                                }
                            />
                        </span>

                        <div className="landing-intro__title-block">
                            <strong>
                                <TypingText
                                    text={
                                        typedLines.core
                                        ?? ''
                                    }
                                    sourceText="CORE"
                                    active={
                                        typingKey
                                        === 'core'
                                    }
                                />

                                <em>
                                    <TypingText
                                        text={
                                            typedLines.preparing
                                            ?? ''
                                        }
                                        sourceText={t(
                                            'introPreparing',
                                        )}
                                        active={
                                            typingKey
                                            === 'preparing'
                                        }
                                    />
                                </em>
                            </strong>

                            <TypingText
                                className="landing-intro__typed"
                                text={
                                    typedLines.status
                                    ?? ''
                                }
                                sourceText={
                                    statusCopy
                                }
                                active={
                                    typingKey
                                    === 'status'
                                }
                            />
                        </div>

                        <div
                            className={[
                                'landing-intro__progress-wrap',
                                progressStageStarted
                                    ? 'is-visible'
                                    : '',
                            ]
                                .filter(Boolean)
                                .join(' ')}
                            aria-hidden={
                                !progressStageStarted
                            }
                        >
                            <div className="landing-intro__progress-label">
                                <TypingText
                                    text={
                                        typedLines.progressLabel
                                        ?? ''
                                    }
                                    sourceText={
                                        progressLabel
                                    }
                                    active={
                                        typingKey
                                        === 'progressLabel'
                                    }
                                />

                                <b>
                                    {String(
                                        percent,
                                    ).padStart(
                                        3,
                                        '0',
                                    )}
                                    %
                                </b>
                            </div>

                            <div
                                className="landing-intro__progress"
                                aria-hidden="true"
                            >
                                <i
                                    style={{
                                        transform:
                                            `scaleX(${progress})`,
                                    }}
                                />
                            </div>
                        </div>

                        <div className="landing-intro__metadata">
                            <span>
                                <TypingText
                                    text={
                                        typedLines.kernel
                                        ?? ''
                                    }
                                    sourceText="ARCHIVE KERNEL"
                                    active={
                                        typingKey
                                        === 'kernel'
                                    }
                                />
                            </span>

                            <span>
                                <TypingText
                                    text={
                                        typedLines.module
                                        ?? ''
                                    }
                                    sourceText="MODULE 01 / DISPLAY"
                                    active={
                                        typingKey
                                        === 'module'
                                    }
                                />
                            </span>

                            <span>
                                <TypingText
                                    text={
                                        typedLines.year
                                        ?? ''
                                    }
                                    sourceText="CORE / 2026"
                                    active={
                                        typingKey
                                        === 'year'
                                    }
                                />
                            </span>
                        </div>
                    </div>

                    <div
                        className="landing-intro__screen-flare"
                        aria-hidden="true"
                    />
                </DesktopMonitorShell>
            </div>

            <div className="landing-intro__veil"/>

            <button
                className="landing-intro__skip"
                type="button"
                onClick={finish}
            >
                {t('skipIntro')}
            </button>
        </div>
    )
}