import {useEffect, useRef, useState} from 'react'
import {useTranslation} from 'react-i18next'
import {Upload} from 'lucide-react'
import {storageService} from '@/lib/services/supabase/SupabaseStorageService'
import {errorMessage} from '@/lib/services/errors'
import type {AssetReport} from '@/lib/services/supabase/assetValidation'

function PendingImage({file, label}: {file: File; label: string}) {
    const image = useRef<HTMLImageElement>(null)
    useEffect(() => {
        const next = URL.createObjectURL(file)
        if (image.current) image.current.src = next
        return () => URL.revokeObjectURL(next)
    }, [file])
    return <img ref={image} alt={`${label}: ${file.name}`} className="h-28 w-full object-contain"/>
}

// Preview bitmaps only. Model inspection never mounts another WebGL context or GLTF cache.
export function AssetPicker({kind, disabled, existingImage, existingModel,pendingFiles, onChange, onValidity}: {
    kind: 'thumbnail' | 'gallery' | 'model'; disabled: boolean; existingImage?: string
    existingModel?: {name?: string | null; bytes?: number | null}
    pendingFiles?:File[]
    onChange: (files: File[]) => void; onValidity: (blocked: boolean) => void
}) {
    const {t} = useTranslation(['phase2','common'])
    const [files, setFiles] = useState<File[]>(pendingFiles??[])
    const [reports, setReports] = useState<AssetReport[]>([])
    const [error, setError] = useState('')
    const [busy, setBusy] = useState(false)
    const generation = useRef(0)
    const input = useRef<HTMLInputElement>(null)
    useEffect(() => () => {generation.current++}, [])
    const label = t(`assetLabel.${kind}`)
    const choose = async (selected: File[]) => {
        const revision = ++generation.current
        setFiles([]); setReports([]); setError(''); setBusy(true)
        onChange([]); onValidity(true)
        try {
            const validated: AssetReport[] = []
            // Sequential decoding keeps gallery selection from allocating many bitmaps at once.
            for (const file of selected) {
                if (generation.current !== revision) return
                validated.push(await (kind === 'model' ? storageService.validateGlb(file) : storageService.validateImage(file)))
            }
            if (generation.current !== revision) return
            setFiles(selected); setReports(validated); onChange(selected); onValidity(false)
        } catch (failure) {
            if (generation.current !== revision) return
            setError(errorMessage(failure))
        } finally {if (generation.current === revision) setBusy(false)}
    }
    return <div className="mb-4 space-y-3">
        <label className="upload-tile cursor-pointer"><input ref={input} type="file" className="sr-only"
            aria-label={label} disabled={disabled} multiple={kind === 'gallery'}
            accept={kind === 'model' ? '.glb,model/gltf-binary,application/octet-stream' : '.jpg,.jpeg,.png,.webp,.avif,.gif'}
            onChange={event => {const selected = Array.from(event.target.files ?? []); if (selected.length) void choose(selected)}}/>
            <span className="flex flex-col items-center gap-2"><Upload size={18}/><span className="font-mono text-[10px] uppercase tracking-widest">{label}</span>
                <span className="text-xs text-muted">{t(kind === 'model' ? 'modelUploadHint' : 'imageUploadHint')}</span></span>
        </label>
        {busy && <p role="status" className="text-xs text-muted">{t('assetValidating')}</p>}
        {error && <p role="alert" className="text-xs text-red">{error}</p>}
        {(files.length > 0 || error || busy) && <button type="button" disabled={disabled} className="text-xs text-muted hover:text-orange" onClick={() => {
            generation.current++; setFiles([]); setReports([]); setError(''); setBusy(false)
            onChange([]); onValidity(false); if (input.current) input.current.value = ''
        }}>{t('clearSelection', {asset: label})}</button>}
        {files.map((file,index) => <div key={`${index}:${file.name}`} className="border border-border bg-surface p-3 text-xs">
            {kind !== 'model' && <PendingImage file={file} label={t('pendingPreview')}/>}
            <p dir="auto" className="mt-2 break-all">{file.name} · {(file.size / 1024 / 1024).toFixed(2)} MiB</p>
            {reports[index]&&<p className="mt-1 text-muted">{kind === 'model'
                ? t('modelSummary', {triangles: reports[index]?.triangles, materials: reports[index]?.materials, textures: reports[index]?.textures, animations: reports[index]?.animations, memory: ((reports[index]?.bufferBytes ?? 0)/1024/1024).toFixed(2)})
                : `${reports[index]?.width} × ${reports[index]?.height}`}</p>}
            {Boolean(reports[index]?.inspectedTextures) && <p className="mt-1 text-muted">{t('textureSummary', {count: reports[index].inspectedTextures,
                dimension: reports[index].maxTextureDimension, memory: ((reports[index].textureBytesEstimate ?? 0)/1024/1024).toFixed(2)})}</p>}
            {reports[index]?.warnings.map(warning => <p key={warning} className="mt-2 text-amber">{t(warning)}</p>)}
        </div>)}
        {!files.length && existingImage && <img src={existingImage} alt={t('existingPreview')} className="h-28 w-full object-contain"/>}
        {kind === 'model' && !files.length && existingModel?.name && <p dir="auto" className="break-all text-xs text-muted">{t('existingAsset')}: {existingModel.name} · {((existingModel.bytes ?? 0)/1024/1024).toFixed(2)} MiB</p>}
    </div>
}
