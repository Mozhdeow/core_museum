import type {CSSProperties, PropsWithChildren} from 'react'
import type {ScreenRect} from '../config/monitorGeometry'

export function MonitorViewport({geometry, className = '', children}: PropsWithChildren<{
    geometry: ScreenRect;
    className?: string
}>) {
    return <div className={`monitor-viewport ${className}`.trim()} style={{
        '--screen-left': `${geometry.left}%`,
        '--screen-top': `${geometry.top}%`,
        '--screen-width': `${geometry.width}%`,
        '--screen-height': `${geometry.height}%`,
    } as CSSProperties}>{children}</div>
}
