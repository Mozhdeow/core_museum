import type {PropsWithChildren, RefObject} from 'react'

export function MuseumSection({id, className = '', children, sectionRef}: PropsWithChildren<{
    id: string;
    className?: string;
    sectionRef?: RefObject<HTMLElement | null>
}>) {
    return <section id={id} ref={sectionRef} className={`landing-section ${className}`}>{children}</section>
}
