import type {InputHTMLAttributes} from 'react'

export function Input({label, dir, type, ...props}: InputHTMLAttributes<HTMLInputElement> & { label: string }) {
    const inputDirection = dir ?? (type === 'email' || type === 'password' ? 'ltr' : undefined);
    return <label className="field-label">
        <span>{label}</span>
        <input {...props} type={type} dir={inputDirection} className="field-input"/>
    </label>
}
