import {useEffect, useRef, useState, type ReactNode} from 'react'
import {Link} from 'react-router-dom'
import {useTranslation} from 'react-i18next'
import {Plus, Search} from 'lucide-react'
import {Button} from '@/components/ui/Button'
import {Input} from '@/components/ui/Input'
import {useAuthStore} from '@/features/auth/authStore'
import {supabaseAdminService} from '@/lib/services'
import {UserManagementError, type AdminUser, type UserFields, type UserQuery, type UserCapabilities,
    type UserMutation, type OperationResult} from '@/lib/services/supabase/adminUsersClient'

type Pending = {operationId: string; action: UserMutation['action']}
type Editor = {kind:'invite'} | {kind:'update' | 'delete'; user:AdminUser}
function savedOperation(key: string): Pending | null {
    try {
        const value = JSON.parse(sessionStorage.getItem(key) ?? 'null') as Pending | null
        return value && /^[0-9a-f-]{36}$/.test(value.operationId) && ['invite','update','delete'].includes(value.action) ? value : null
    } catch {return null}
}
function UserDialog({title, busy, close, children}: {title:string; busy:boolean; close:()=>void; children:ReactNode}) {
    const dialog = useRef<HTMLDialogElement>(null)
    const validating=useAuthStore(state=>state.isLoading)
    // Native modal dialogs escape ancestor inertness. Close the top layer during
    // revalidation while preserving its in-memory input, never persisting account edits.
    useEffect(()=>{const node=dialog.current;if(!validating)node?.showModal();else node?.close();return()=>node?.close()},[validating])
    return <dialog ref={dialog} inert={validating||undefined} aria-labelledby="user-dialog-title" onCancel={event=>{event.preventDefault();if(!busy)close()}}
        className="m-auto max-h-[85vh] w-[min(94vw,40rem)] overflow-y-auto border border-border bg-surface p-5 text-ink backdrop:bg-black/70 md:p-7">
        <h2 id="user-dialog-title" className="mb-6 font-display text-2xl">{title}</h2>{children}
    </dialog>
}
function UserEditor({editor, owner, capabilities, busy, blocked, error, close, submit}: {
    editor:Editor; owner:string; capabilities:UserCapabilities; busy:boolean; blocked:boolean; error:string; close:()=>void
    submit:(fields:UserFields & {email:string;confirmation:string})=>void
}) {
    const {t}=useTranslation('admin',{keyPrefix:'userManagement'})
    const user=editor.kind==='invite' ? undefined : editor.user
    const [fullName,setFullName]=useState(user?.fullName ?? '')
    const [locale,setLocale]=useState<'en'|'fa'>(user?.preferredLocale ?? 'en')
    const [role,setRole]=useState<'user'|'editor'|'admin'>(user?.role ?? 'user')
    const [email,setEmail]=useState(''), [confirmation,setConfirmation]=useState('')
    const deleting=editor.kind==='delete'
    return <UserDialog title={t(editor.kind)} busy={busy} close={close}>
        <form className="space-y-4" onSubmit={event=>{event.preventDefault();submit({fullName,preferredLocale:locale,role,email,confirmation})}}>
            {error && <p role="alert" className="text-sm leading-7 text-red">{t(`errors.${error}`)}</p>}
            {blocked && !busy && <p role="status" className="text-sm leading-7 text-amber">{t('pendingDialog')}</p>}
            <fieldset disabled={busy || blocked} className="space-y-4">
                {deleting ? <><p className="text-sm leading-7 text-muted">{t('deleteWarning')}</p>
                    <p dir="ltr" className="break-all text-sm">{user?.email}</p>
                    <Input autoFocus dir="ltr" required label={t('confirmEmail')} value={confirmation} maxLength={254} onChange={event=>setConfirmation(event.target.value)}/>
                </> : <>
                    {editor.kind==='invite' ? <Input autoFocus label={t('email')} type="email" dir="ltr" required maxLength={254} value={email} onChange={event=>setEmail(event.target.value)}/>
                        : <p dir="ltr" className="break-all text-sm text-muted">{user?.email}</p>}
                    <Input autoFocus={editor.kind==='update'} label={t('fullName')} value={fullName} maxLength={200} onChange={event=>setFullName(event.target.value)}/>
                    <label className="field-label"><span>{t('language')}</span><select className="field-input" value={locale} onChange={event=>setLocale(event.target.value as 'en'|'fa')}>
                        <option value="en">English</option><option value="fa">فارسی</option></select></label>
                    <label className="field-label"><span>{t('role')}</span><select className="field-input" value={role} disabled={!capabilities.canChangeRoles || user?.id===owner} onChange={event=>setRole(event.target.value as 'user'|'editor'|'admin')}>
                        <option value="user">{t('roles.user')}</option><option value="editor">{t('roles.editor')}</option><option value="admin">{t('roles.admin')}</option></select></label>
                    {editor.kind==='invite' && <p className="text-xs leading-6 text-muted">{t('inviteHint')}</p>}
                </>}
                <Button type="submit" disabled={blocked || (deleting && (!user?.email || confirmation.trim().toLowerCase()!==user.email.toLowerCase()))}>
                    {t(busy ? 'working' : editor.kind==='invite' ? 'sendInvite' : deleting ? 'confirmDelete' : 'save')}
                </Button>
            </fieldset>
            <Button type="button" variant="ghost" disabled={busy} onClick={close}>{t('close')}</Button>
        </form>
    </UserDialog>
}
export function AdminUsersPage() {
    const owner=useAuthStore(state=>state.user?.id)
    return owner ? <UsersContent key={owner} owner={owner}/> : null
}
function UsersContent({owner}:{owner:string}) {
    const {t,i18n}=useTranslation('admin',{keyPrefix:'userManagement'})
    const storageKey=`core-admin-user-operation:${owner}`
    const [pending,setPending]=useState<Pending|null>(()=>savedOperation(storageKey))
    const [query,setQuery]=useState<UserQuery>({page:1,perPage:25,search:'',role:'all',status:'all'})
    const [search,setSearch]=useState(''), [revision,setRevision]=useState(0)
    const [data,setData]=useState<{users:AdminUser[];total:number}>(), [loading,setLoading]=useState(true)
    const [capabilities,setCapabilities]=useState<UserCapabilities|null>(null)
    const [error,setError]=useState(''), [notice,setNotice]=useState(''), [busy,setBusy]=useState(false)
    const [editor,setEditor]=useState<Editor|null>(null)
    useEffect(()=>{
        let cancelled=false
        void Promise.all([supabaseAdminService.users(query),supabaseAdminService.userCapabilities()]).then(([page,allowed])=>{
            if (!cancelled) {
                setData(page);setCapabilities(allowed)
                if(page.pendingOperation && !savedOperation(storageKey)) {
                    try {sessionStorage.setItem(storageKey,JSON.stringify(page.pendingOperation))} catch { /* Server retains the receipt. */ }
                    setPending(page.pendingOperation)
                }
            }
        }).catch(failure=>{if(!cancelled)setError(failure instanceof UserManagementError ? failure.code : 'serviceUnavailable')})
            .finally(()=>{if(!cancelled)setLoading(false)})
        return ()=>{cancelled=true}
    },[query,revision,storageKey])
    const reload=()=>{setLoading(true);setError('');setData(undefined);setCapabilities(null);setRevision(value=>value+1)}
    const changeQuery=(patch:Partial<UserQuery>)=>{setLoading(true);setError('');setData(undefined);setCapabilities(null);setQuery(current=>({...current,...patch}))}
    const remember=(value:Pending|null)=>{
        // If a receipt cannot be persisted, do not dispatch a mutation.
        if(value)sessionStorage.setItem(storageKey,JSON.stringify(value));else sessionStorage.removeItem(storageKey)
        setPending(value)
    }
    const finish=(result:OperationResult,kind:Pending['action'])=>{
        if(result.state==='pending'){setError('operationUncertain');return}
        remember(null)
        if(result.state==='failed'){setError(result.code ?? 'requestFailed');return}
        setError('');setNotice(result.state==='cancelled' ? 'cancelled' : kind==='invite' ? 'inviteAccepted' : kind==='delete' ? 'deleted' : 'saved')
        if(result.state==='succeeded')setEditor(null)
        reload()
    }
    const handleError=(failure:unknown)=>{
        const known=failure instanceof UserManagementError
        if(!known || failure.uncertain)setError('operationUncertain')
        else {remember(null);setError(failure.code)}
        if(known && ['forbidden','unauthorized'].includes(failure.code)){setCapabilities(null);setData(undefined)}
    }
    const submit=async(fields:UserFields & {email:string;confirmation:string})=>{
        if(!editor || busy || pending)return
        const receipt:Pending={operationId:crypto.randomUUID(),action:editor.kind}
        try {remember(receipt)} catch {setError('receiptUnavailable');return}
        setBusy(true);setError('');setNotice('')
        const request:UserMutation=editor.kind==='invite'
            ? {action:'invite',operationId:receipt.operationId,email:fields.email,fullName:fields.fullName,role:fields.role,preferredLocale:fields.preferredLocale}
            : editor.kind==='delete' ? {action:'delete',operationId:receipt.operationId,id:editor.user.id,expectedUpdatedAt:editor.user.updatedAt,confirmation:fields.confirmation}
                : {action:'update',operationId:receipt.operationId,id:editor.user.id,expectedUpdatedAt:editor.user.updatedAt,fullName:fields.fullName,preferredLocale:fields.preferredLocale,role:fields.role}
        try {finish(await supabaseAdminService.manageUser(request),receipt.action)} catch(failure){handleError(failure)} finally {setBusy(false)}
    }
    const reconcile=async()=>{
        if(!pending || busy)return
        setBusy(true);setError('')
        try {finish(await supabaseAdminService.reconcileUserOperation(pending.operationId),pending.action)}
        catch(failure){
            setError(failure instanceof UserManagementError ? failure.code : 'serviceUnavailable')
            // Keep the unresolved receipt, but stop displaying privileged data after authorization is lost.
            if(failure instanceof UserManagementError && ['forbidden','unauthorized'].includes(failure.code)){setCapabilities(null);setData(undefined)}
        }
        finally{setBusy(false)}
    }
    const formatDate=(value:string|null)=>value && Number.isFinite(Date.parse(value)) ? new Intl.DateTimeFormat(i18n.language==='fa'?'fa-IR':'en-US',{dateStyle:'medium',timeStyle:'short'}).format(new Date(value)) : '—'
    const blocked=busy || Boolean(pending) || loading || !data
    return <div className="min-w-0 p-5 pt-10 md:p-8">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4"><div><span className="eyebrow">CORE / ADMIN</span><h1 className="mt-3 font-display text-4xl">{t('title')}</h1></div>
            <Button disabled={blocked || !capabilities?.canInvite} onClick={()=>{setEditor({kind:'invite'});setError('')}}><Plus size={15}/>{t('addUser')}</Button></div>
        <form className="mb-5 grid gap-3 border border-border bg-surface p-4 md:grid-cols-4" onSubmit={event=>{event.preventDefault();changeQuery({search:search.trim(),page:1})}}>
            <Input label={t('search')} maxLength={200} value={search} onChange={event=>setSearch(event.target.value)}/>
            <label className="field-label"><span>{t('role')}</span><select className="field-input" value={query.role} onChange={event=>changeQuery({role:event.target.value as UserQuery['role'],page:1})}>
                {(['all','user','editor','admin'] as const).map(role=><option key={role} value={role}>{t(`roles.${role}`)}</option>)}</select></label>
            <label className="field-label"><span>{t('status')}</span><select className="field-input" value={query.status} onChange={event=>changeQuery({status:event.target.value as UserQuery['status'],page:1})}>
                {(['all','active','invited','unconfirmed','banned','deleting'] as const).map(status=><option key={status} value={status}>{t(`statuses.${status}`)}</option>)}</select></label>
            <Button type="submit" className="self-end"><Search size={15}/>{t('applySearch')}</Button>
        </form>
        {pending && <div role="status" className="mb-4 border border-amber/40 p-4 text-sm leading-7 text-amber"><p>{t('pending')}</p><Button type="button" variant="outline" disabled={busy} onClick={()=>void reconcile()}>{t(busy?'working':'checkResult')}</Button></div>}
        {notice && <p role="status" className="mb-4 text-sm leading-7 text-cyan">{t(notice)}</p>}
        {error && (!editor || !capabilities) && <div role="alert" className="mb-4 text-sm leading-7 text-red"><p>{t(`errors.${error}`)}</p>
            {error==='unauthorized' && <Link className="underline" to="/admin">{t('signIn')}</Link>}</div>}
        {capabilities && (!capabilities.canChangeRoles || !capabilities.canDelete) && <p className="mb-4 text-xs leading-6 text-muted">{t('guardNotice')}</p>}
        {capabilities && !capabilities.canEdit && <p className="mb-4 text-xs leading-6 text-muted">{t('writesNotice')}</p>}
        <div aria-busy={loading} className="max-w-full overflow-x-auto border border-border bg-surface">
            {loading ? <p role="status" className="p-8 text-muted">{t('loading')}</p> : data?.users.length ? <table className="w-full min-w-[940px] text-start text-sm">
                <thead><tr>{['email','fullName','id','role','created','lastSignIn','status','actions'].map(key=><th key={key} scope="col" className="border-b border-border p-3 text-start font-mono text-[10px] uppercase tracking-widest text-muted">{t(key)}</th>)}</tr></thead>
                <tbody>{data.users.map(user=><tr key={user.id} className="border-b border-border/60">
                    <td dir="ltr" className="max-w-48 break-all p-3">{user.email ?? '—'}</td><td dir="auto" className="max-w-40 break-all p-3">{user.fullName || '—'}</td>
                    <td dir="ltr" className="max-w-40 break-all p-3 font-mono text-[10px] text-muted">{user.id}</td><td className="p-3 text-orange">{t(`roles.${user.role}`)}</td>
                    <td className="p-3 text-xs">{formatDate(user.createdAt)}</td><td className="p-3 text-xs">{formatDate(user.lastSignInAt)}</td><td className="p-3 text-xs">{t(`statuses.${user.status}`)}</td>
                    <td className="p-3"><div className="flex gap-3"><button type="button" className="text-orange disabled:opacity-40" disabled={blocked || !capabilities?.canEdit || user.status==='deleting'} aria-label={t('editNamed',{email:user.email})} onClick={()=>{setEditor({kind:'update',user});setError('')}}>{t('update')}</button>
                        <button type="button" className="text-red disabled:opacity-40" disabled={blocked || !capabilities?.canDelete || owner===user.id || user.status==='deleting' || !user.email} title={owner===user.id?t('errors.selfProtected'):undefined} aria-label={t('deleteNamed',{email:user.email})} onClick={()=>{setEditor({kind:'delete',user});setError('')}}>{t('delete')}</button></div></td>
                </tr>)}</tbody></table> : <p className="p-8 text-muted">{t(error?'unavailable':'empty')}</p>}
        </div>
        <div className="mt-5 flex flex-wrap items-center gap-3"><Button variant="outline" disabled={loading || query.page<=1} onClick={()=>changeQuery({page:query.page-1})}>{t('previous')}</Button>
            <span className="text-xs text-muted">{t('page',{page:query.page,total:data?.total ?? 0})}</span>
            <Button variant="outline" disabled={loading || !data || query.page*query.perPage>=data.total} onClick={()=>changeQuery({page:query.page+1})}>{t('next')}</Button>
            <label className="field-label"><span>{t('perPage')}</span><select className="field-input" value={query.perPage} onChange={event=>changeQuery({perPage:Number(event.target.value),page:1})}>{[10,25,50].map(size=><option key={size} value={size}>{size}</option>)}</select></label>
            <Button variant="ghost" disabled={loading || busy} onClick={reload}>{t('reload')}</Button></div>
        {editor && capabilities && <UserEditor key={editor.kind==='invite'?'invite':`${editor.kind}:${editor.user.id}`} editor={editor} owner={owner} capabilities={capabilities}
            busy={busy} blocked={Boolean(pending)} error={error} close={()=>setEditor(null)} submit={fields=>void submit(fields)}/>}
    </div>
}
