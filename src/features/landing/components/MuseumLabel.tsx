import type {PropsWithChildren} from 'react'

export function MuseumLabel({number, children}: PropsWithChildren<{ number: string }>) {
    return <div className="museum-label"><span>{number}</span><strong>{children}</strong></div>
}
