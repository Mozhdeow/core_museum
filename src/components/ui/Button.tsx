import type {ButtonHTMLAttributes, PropsWithChildren} from 'react'

export function Button({
                           variant = 'primary',
                           children,
                           className = '',
                           ...props
                       }: PropsWithChildren<ButtonHTMLAttributes<HTMLButtonElement>> & {
    variant?: 'primary' | 'ghost' | 'outline';
    className?: string
}) {
    return <button {...props}
                   className={`button button-${variant} inline-flex items-center justify-center gap-2 ${className}`}>{children}</button>
}
