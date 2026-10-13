import type {CSSProperties, PropsWithChildren, ReactEventHandler} from 'react'
import {monitorAssets, monitorGeometry, type ScreenRect} from '../config/monitorGeometry'
import {MonitorViewport} from './MonitorViewport'

export function DesktopMonitorShell({children, className = '', imageClassName = '', intro = false,
    imageSrc = monitorAssets.desktop.src, geometry = monitorGeometry.desktop,
    aspectRatio = monitorAssets.desktop.width / monitorAssets.desktop.height,
    onImageError}: PropsWithChildren<{
    className?: string;
    imageClassName?: string;
    intro?: boolean;
    imageSrc?: string;
    geometry?: ScreenRect;
    aspectRatio?: number;
    onImageError?: ReactEventHandler<HTMLImageElement>;
}>) {
    return <div className={`desktop-monitor-shell${intro ? ' desktop-monitor-shell--intro' : ''} ${className}`.trim()}
        style={{
            '--monitor-shell-ratio': String(aspectRatio),
            '--monitor-screen-left': `${geometry.left}%`,
            '--monitor-screen-top': `${geometry.top}%`,
            '--monitor-screen-width': `${geometry.width}%`,
            '--monitor-screen-height': `${geometry.height}%`,
        } as CSSProperties}>
        <img className={`desktop-monitor-shell__image ${imageClassName}`.trim()} src={imageSrc}
             alt="" aria-hidden="true" onError={onImageError}/>
        <MonitorViewport geometry={geometry}>{children}</MonitorViewport>
    </div>
}
