import {useEffect, useRef, useState} from 'react';
import {Link, useLocation, useNavigate} from 'react-router-dom';
import {
    ArrowUpRight,
    Box,
    ImagePlus,
    Link2,
    Save,
    ShieldCheck,
} from 'lucide-react';
import {useTranslation} from 'react-i18next';
import {Input} from '@/components/ui/Input';
import {Button} from '@/components/ui/Button';
import {useAuthStore} from '@/features/auth/authStore';
import {useCmsTaxonomy,useExhibit} from '@/hooks/useCmsData';
import {TaxonomySelect} from './TaxonomySelect';
import {normalizeExhibit,ExhibitValidationError,moveEntry,type ExhibitIssue} from '@/lib/services/supabase/exhibitValidation';
import {supabaseAdminService} from '@/lib/services';
import {errorMessage} from '@/lib/services/errors';
import {ExhibitSaveError, type SaveStage} from '@/lib/services/supabase/itemIntegrity';
import {AssetPicker} from './AssetPicker';
import {useContentAccess} from '@/hooks/useContentAccess';
import {PermissionDenied} from '@/components/common/PermissionDenied';
import {ITEM_STATUS, type MuseumItem, type LocalizedText} from '@/types/museum';

export function AdminLoginPage() {
    const {t} = useTranslation(['admin', 'auth']);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error,setError] = useState('');
    const signIn = useAuthStore(s => s.signIn);
    const navigate = useNavigate();
    return <div className="flex min-h-screen items-center justify-center bg-void p-5">
        <div className="w-full max-w-sm border border-border bg-surface p-7 md:p-10"><span
            className="eyebrow">{t('loginTitle')}</span><h1 className="mt-5 font-display text-3xl">{t('loginCopy')}</h1>
            <form className="mt-8 space-y-4" onSubmit={async e => {
                e.preventDefault();
                try {
                    await signIn({email, password});
                    // Auth events can supersede the sign-in restore; wait for a current profile before choosing the workspace.
                    if(useAuthStore.getState().isLoading)await useAuthStore.getState().initialize();
                    if(!useAuthStore.getState().isAuthenticated)throw new Error('Session unavailable');
                    const role=useAuthStore.getState().user?.role;
                    navigate(role==='admin'?'/admin/dashboard':role==='editor'?'/admin/items':'/museum', {replace:true})
                } catch { setError(t('unauthorized', {ns:'common'}));
                }
            }}><Input label={t('email', {ns:'auth'})} type="email" value={email} onChange={e => setEmail(e.target.value)}/><Input
                label={t('password', {ns:'auth'})} type="password" value={password}
                onChange={e => setPassword(e.target.value)}/>{error && <p className="text-xs text-red" role="alert">{error}</p>}<Button className="mt-3 w-full" type="submit">{t('signIn', {ns:'auth'})}
                <ArrowUpRight size={15}/></Button></form>
            <Link to="/"
                  className="mt-7 block text-center font-mono text-[10px] uppercase tracking-widest text-muted hover:text-orange">CORE
                / HOME</Link></div>
    </div>
}

function AdminHeading({eyebrow, title, action}: { eyebrow: string; title: string; action?: React.ReactNode }) {
    return <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
        <div><span className="eyebrow">{eyebrow}</span><h1
            className="mt-3 font-display text-4xl md:text-5xl">{title}</h1></div>
        {action}</div>
}

export function DashboardPage() {
    const {t} = useTranslation(['common', 'admin']);
    const [counts,setCounts] = useState({items:0,categories:0,users:0,published:0}); const [error,setError] = useState(false);
    useEffect(() => { void supabaseAdminService.counts().then(setCounts).catch(() => setError(true)) }, []);
    const stats = [{
        label: t('itemsCount', {ns: 'admin'}),
        value: String(counts.items).padStart(2,'0'),
        accent: 'text-orange'
    }, {
        label: t('categoriesCount', {ns: 'admin'}),
        value: String(counts.categories).padStart(2,'0'),
        accent: 'text-cyan'
    }, {
        label: t('usersCount', {ns: 'admin'}),
        value: String(counts.users).padStart(2,'0'),
        accent: 'text-amber'
    }, {label: t('publishedCount', {ns: 'admin'}), value: String(counts.published).padStart(2,'0'), accent: 'text-red'}];
    return <div className="p-5 md:p-8"><AdminHeading eyebrow="CORE / ADMIN" title={t('dashboardTitle', {ns: 'admin'})}/>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{stats.map(stat => <div key={stat.label}
                                                                                          className="border border-border bg-surface p-5">
            <span className="font-mono text-[10px] uppercase tracking-widest text-muted">{stat.label}</span><strong
            className={`mt-8 block font-display text-4xl ${stat.accent}`}>{stat.value}</strong>
            <div className="mt-5 h-px bg-border">
                <div className="h-px w-1/2 bg-current opacity-60"/>
            </div>
        </div>)}</div>
        <div className="mt-10 border border-border bg-surface p-5 md:p-7"><span className="eyebrow">SYSTEM / NOTE</span>
            {error && <p className="mt-3 text-xs text-red">{t('dataError')}</p>}
            <p className="mt-4 max-w-xl text-sm leading-7 text-muted">{t('mockNotice')}</p></div>
    </div>
}

export {ItemsPage} from './ExhibitList';

const blankItem: MuseumItem = {
    id: '',
    title: {en: '', fa: ''},
    slug: '',
    brand: '',
    category: '',
    categoryId: '',
    releaseYear: 2025,
    shortDescription: {en: '', fa: ''},
    description: {en: '', fa: ''},
    specifications: [],
    thumbnail: '',
    galleryImages: [],
    model3DUrl: null,
    museumSection: '',
    sectionId: '',
    license: 'museum-owned',
    sortOrder: 1,
    featured: false,
    status: ITEM_STATUS.draft
}

function FormSection({number, icon: Icon, title, hint, children}: {
    number: string;
    icon: typeof Box;
    title: string;
    hint: string;
    children: React.ReactNode
}) {
    return <section className="form-section p-5 md:p-7">
        <div className="form-section-heading">
            <div className="flex items-center gap-3"><span
                className="grid h-8 w-8 place-items-center border border-orange/40 bg-orange/5 font-mono text-[10px] text-orange">{number}</span>
                <div><h2 className="font-display text-lg text-ink">{title}</h2><p
                    className="mt-1 text-xs text-muted">{hint}</p></div>
            </div>
            <Icon size={17} className="text-muted" aria-hidden="true"/></div>
        <div className="mt-6">{children}</div>
    </section>
}

export function ItemFormPage() {
    const location = useLocation();
    const user=useAuthStore(state=>state.user);
    return <ItemFormContent key={`${location.pathname}:${user?.id}:${user?.role}`}/>;
}

function ItemFormContent() {
    const {t} = useTranslation(['common', 'admin']);
    const location = useLocation();
    const navigate = useNavigate();
    const editId = location.pathname.includes('/edit') ? location.pathname.split('/').at(-2) : undefined;
    const {data:existing,loading,error:loadError,refresh} = useExhibit(editId);
    const taxonomy=useCmsTaxonomy();
    const {role,canWrite}=useContentAccess();
    const [item, setItem] = useState<MuseumItem>(existing ?? {...blankItem, id: crypto.randomUUID()});
    const [galleryFiles,setGalleryFiles] = useState<File[]>([]); const [thumbnailFile,setThumbnailFile] = useState<File>(); const [modelFile,setModelFile] = useState<File>(); const [saving,setSaving] = useState(false); const [error,setError] = useState('');
    const [galleryCaptions,setGalleryCaptions]=useState<LocalizedText[]>([]);
    const [saveMode, setSaveMode] = useState<'create' | 'update'>(editId ? 'update' : 'create');
    const [retryBlocked, setRetryBlocked] = useState(false);
    const [stage, setStage] = useState<SaveStage>('validating');
    const [assetBlocked, setAssetBlocked] = useState({thumbnail: false, gallery: false, model: false});
    const selectionBlocked = Object.values(assetBlocked).some(Boolean);
    const [issues,setIssues]=useState<ExhibitIssue[]>([]);
    const feedback=useRef<HTMLDivElement>(null);
    useEffect(()=>{if(error)feedback.current?.focus()},[error]);
    const fieldProps=(field:string)=>({'aria-invalid':issues.some(issue=>issue.field===field),'aria-describedby':issues.some(issue=>issue.field===field)?'exhibit-validation':undefined});
    const issueLabel=(field:string)=>{const parts=field.split('.');const key=parts[0]==='categoryId'?'category':parts[0]==='sectionId'?'museumSection':parts[0]==='specifications'?'specification':parts[0]==='galleryImages'?'caption':parts[0];return `${t(key)}${parts.length>1&&/^\d+$/.test(parts[1])?` ${Number(parts[1])+1}`:''}${parts.at(-1)==='en'?` / ${t('english')}`:parts.at(-1)==='fa'?` / ${t('persian')}`:''}`};
    const [conflict,setConflict]=useState(false);
    const categories=taxonomy.data?.categories??[];
    const sections=taxonomy.data?.sections??[];
    const categoryId=item.categoryId??categories.find(c=>c.slug===item.category)?.id??'';
    const sectionId=item.sectionId??sections.find(s=>s.slug===item.museumSection)?.id??'';
    // Async loading supplies the existing row; route keys reset all state between targets.
    useEffect(() => { if (existing) { setItem(existing) } }, [existing]);
    const set = <K extends keyof MuseumItem>(key: K, value: MuseumItem[K]) => setItem(current => ({
        ...current,
        [key]: value
    }));
    const setLocalized = (key: 'title' | 'shortDescription' | 'description', locale: keyof LocalizedText, value: string) => setItem(current => ({
        ...current,
        [key]: {...current[key], [locale]: value}
    }));
    const updateSpecification = (index: number, field: 'label' | 'value', value: string, locale?: keyof LocalizedText) => setItem(current => ({
        ...current,
        specifications: current.specifications.map((spec, specIndex) => specIndex !== index ? spec : field === 'value' ? {
            ...spec,
            value
        } : {...spec, label: {...spec.label, [locale ?? 'en']: value}})
    }));
    const save = async (event: React.FormEvent) => {
        event.preventDefault();
        if (!canWrite || (role==='editor' && item.status!=='draft') || saving || retryBlocked || selectionBlocked || taxonomy.loading || taxonomy.error || (editId && !existing)) return;
        setSaving(true); setStage('validating'); setError(''); setIssues([]); setConflict(false);
        const owner=useAuthStore.getState().user?.id;
        const operation: {stage: SaveStage} = {stage: 'validating'};
        try {
            const result = await supabaseAdminService.saveExhibit(normalizeExhibit(item), {mode: saveMode,
                files: {thumbnail: thumbnailFile, model: modelFile, gallery: galleryFiles},galleryCaptions,
                onStage: value => {operation.stage = value; setStage(value)}});
            if(useAuthStore.getState().user?.role!==role||useAuthStore.getState().user?.id!==owner)return;
            navigate('/admin/items', {state: {integrityWarning: result.cleanupFailed, saveConfirmed: true}});
        } catch (error) {
            if(useAuthStore.getState().user?.role!==role||useAuthStore.getState().user?.id!==owner)return;
            const validation=error instanceof ExhibitValidationError?error:error instanceof Error&&error.cause instanceof ExhibitValidationError?error.cause:undefined;
            if(validation)setIssues(validation.issues);
            setConflict((error as {code?:string})?.code==='40001');
            let message = errorMessage(error);
            if (operation.stage === 'uploading') message = `${t('uploadFailed', {ns: 'phase2'})} ${message}`;
            if (error instanceof ExhibitSaveError) {
                if (error.createdDraft) {
                    setSaveMode('update');
                    setItem(current => ({...current, id: error.createdDraft!.id, updatedAt: error.createdDraft!.updated_at}));
                    message += ` ${t('draftRetained', {ns: 'phase2'})}`;
                }
                if (error.commitUncertain) {
                    setRetryBlocked(true);
                    message += ` ${t('saveUncertain', {ns: 'phase2'})}`;
                }
                if (error.cleanup.cleanupFailed) message += ` ${t('cleanupWarning', {ns: 'phase2'})}`;
            }
            setError(message);
        } finally { setSaving(false) }
    };
    const moveGallery = (index:number,direction:number)=>setItem(current=>({...current,galleryImages:moveEntry(current.galleryImages,index,direction)}));
    if(editId && loading)return <div className="p-8" role="status">{t('loading')}</div>;
    if(editId && loadError)return <div className="p-8"><p role="alert">{t('dataError')}</p><Button onClick={()=>void refresh()}>{t('cms.retry',{ns:'admin'})}</Button></div>;
    if(role==='editor' && editId && (!existing || existing.status!=='draft'))return <PermissionDenied/>;
    if(editId && !existing)return <div className="p-8"><p role="alert">{t('cms.notFound',{ns:'admin'})}</p><Link to="/admin/items">{t('cancel')}</Link></div>;
    return <div className="p-5 md:p-8">
        <AdminHeading eyebrow="CORE / ARCHIVE / ITEM" title={editId ? t('editItem') : t('newItem')}/>
        {role==='editor' && !canWrite && <p role="status" className="mb-5 text-sm text-amber">{t('rbac.writeGate',{ns:'admin'})}</p>}
        {taxonomy.loading&&<p role="status">{t('loading')}</p>}
        {Boolean(taxonomy.error)&&<p role="alert">{t('cms.taxonomyError',{ns:'admin'})}<button type="button" onClick={()=>void taxonomy.refresh()} className="ms-3 text-orange">{t('cms.retry',{ns:'admin'})}</button></p>}
        <form onSubmit={save} noValidate className="max-w-4xl"><fieldset disabled={saving || !canWrite} className="space-y-5">
            <FormSection number="01" icon={Box} title={t('basicInformation')} hint={t('basicInformationHint')}>
                <div className="grid gap-5 md:grid-cols-2"><Input dir="ltr" label={t('slug')} {...fieldProps('slug')} value={item.slug}
                                                                  onChange={event => set('slug', event.target.value)}/><Input
                    dir="ltr" label={t('brand')} value={item.brand}
                    onChange={event => set('brand', event.target.value)}/><Input dir="ltr" label={t('releaseYear')}
                                                                                 type="number" {...fieldProps('releaseYear')} value={item.releaseYear}
                                                                                 onChange={event => set('releaseYear', Number(event.target.value))}/><TaxonomySelect label={t('category')} value={categoryId} options={categories.map(c=>({...c,label:c.name}))} disabled={taxonomy.loading||Boolean(taxonomy.error)} onChange={id=>setItem(current=>({...current,categoryId:id,category:categories.find(c=>c.id===id)?.slug??''}))}/>
                </div>
            </FormSection>
            <FormSection number="02" icon={Link2} title={t('localizedContent')} hint={t('localizedContentHint')}>
                <div className="space-y-5">
                    <div className="grid gap-5 md:grid-cols-2"><Input dir="ltr"
                                                                      label={`${t('title')} / ${t('english')}`}
                                                                      {...fieldProps('title.en')} value={item.title.en}
                                                                      onChange={event => setLocalized('title', 'en', event.target.value)}/><Input
                        label={`${t('title')} / ${t('persian')}`} dir="rtl" {...fieldProps('title.fa')} value={item.title.fa}
                        onChange={event => setLocalized('title', 'fa', event.target.value)}/></div>
                    {(['shortDescription', 'description'] as const).map(key => <div key={key}
                                                                                    className="grid gap-5 md:grid-cols-2">
                        <label className="field-label"><span>{t(key)} / {t('english')}</span><textarea dir="ltr"
                                                                                                       className="field-input min-h-24"
                                                                                                       value={item[key].en}
                                                                                                       onChange={event => setLocalized(key, 'en', event.target.value)}/></label><label
                        className="field-label"><span>{t(key)} / {t('persian')}</span><textarea dir="rtl"
                                                                                                className="field-input min-h-24"
                                                                                                value={item[key].fa}
                                                                                                onChange={event => setLocalized(key, 'fa', event.target.value)}/></label>
                    </div>)}</div>
            </FormSection>
            <FormSection number="03" icon={ShieldCheck} title={t('specificationsSection')}
                         hint={t('specificationsHint')}>
                <div className="space-y-3">{item.specifications.map((spec,index)=><div key={index} className="grid gap-3 border border-border p-3 md:grid-cols-3">
                    <Input dir="ltr" label={`${t('specification')} ${index+1} / ${t('english')}`} {...fieldProps(`specifications.${index}.label.en`)} value={spec.label.en} onChange={e=>updateSpecification(index,'label',e.target.value,'en')}/>
                    <Input dir="rtl" label={`${t('specification')} ${index+1} / ${t('persian')}`} {...fieldProps(`specifications.${index}.label.fa`)} value={spec.label.fa} onChange={e=>updateSpecification(index,'label',e.target.value,'fa')}/>
                    <Input label={`${t('specValue')} ${index+1}`} {...fieldProps(`specifications.${index}.value`)} value={spec.value} onChange={e=>updateSpecification(index,'value',e.target.value)}/>
                    <div className="flex gap-4 md:col-span-3"><button type="button" disabled={index===0} aria-label={t('cms.moveSpecUp',{ns:'admin',index:index+1})} onClick={()=>set('specifications',moveEntry(item.specifications,index,-1))}>↑</button><button type="button" disabled={index===item.specifications.length-1} aria-label={t('cms.moveSpecDown',{ns:'admin',index:index+1})} onClick={()=>set('specifications',moveEntry(item.specifications,index,1))}>↓</button><button type="button" className="text-red" aria-label={t('cms.removeSpec',{ns:'admin',index:index+1})} onClick={()=>set('specifications',item.specifications.filter((_,i)=>i!==index))}>{t('delete')}</button></div>
                </div>)}</div><button type="button" disabled={item.specifications.length>=100} className="mt-4 text-sm text-orange" onClick={()=>set('specifications',[...item.specifications,{label:{en:'',fa:''},value:''}])}>{t('cms.addSpec',{ns:'admin'})}</button>
            </FormSection>
            <FormSection number="04" icon={Box} title={t('threeDModel')} hint={t('modelUploadHint', {ns: 'phase2'})}>
                <AssetPicker kind="model" disabled={saving || !canWrite} existingModel={{name: item.modelOriginalFilename, bytes: item.modelFileSize}}
                    onChange={files => setModelFile(files[0])} onValidity={blocked => setAssetBlocked(current => ({...current, model: blocked}))}/>
            </FormSection>
            <FormSection number="05" icon={ImagePlus} title={t('gallerySection')} hint={t('galleryHint')}>
                <AssetPicker kind="thumbnail" disabled={saving || !canWrite} existingImage={existing?.thumbnail}
                    onChange={files => setThumbnailFile(files[0])} onValidity={blocked => setAssetBlocked(current => ({...current, thumbnail: blocked}))}/>
                <AssetPicker kind="gallery" disabled={saving || !canWrite} onChange={files=>{setGalleryFiles(files);setGalleryCaptions(files.map(()=>({en:'',fa:''})))}}
                    onValidity={blocked => setAssetBlocked(current => ({...current, gallery: blocked}))}/>
                {galleryFiles.map((file,index)=><div key={`${index}:${file.name}`} className="my-3 grid gap-3 border border-orange/30 p-3 md:grid-cols-2"><p dir="auto" className="text-sm md:col-span-2">{file.name}</p>{(['en','fa'] as const).map(locale=><Input key={locale} dir={locale==='fa'?'rtl':'ltr'} label={`${t('cms.pendingCaption',{ns:'admin',index:index+1})} / ${t(locale==='en'?'english':'persian')}`} value={galleryCaptions[index]?.[locale]??''} onChange={e=>setGalleryCaptions(current=>current.map((caption,i)=>i===index?{...caption,[locale]:e.target.value}:caption))}/>)}<div className="flex gap-4 md:col-span-2"><button type="button" disabled={index===0} aria-label={t('cms.movePendingUp',{ns:'admin',index:index+1})} onClick={()=>{setGalleryFiles(moveEntry(galleryFiles,index,-1));setGalleryCaptions(moveEntry(galleryCaptions,index,-1))}}>↑</button><button type="button" disabled={index===galleryFiles.length-1} aria-label={t('cms.movePendingDown',{ns:'admin',index:index+1})} onClick={()=>{setGalleryFiles(moveEntry(galleryFiles,index,1));setGalleryCaptions(moveEntry(galleryCaptions,index,1))}}>↓</button></div></div>)}
                {item.galleryImages.map((image,index)=><div key={image.id} className="mt-3 grid gap-2 border border-border p-3 md:grid-cols-[96px_1fr_auto]"><img src={image.url} alt="" className="h-16 w-24 object-cover"/><div className="grid gap-2 md:grid-cols-2"><Input label={`${t('caption')} / ${t('english')}`} value={image.caption.en} onChange={e=>setItem(current=>({...current,galleryImages:current.galleryImages.map(g=>g.id===image.id ? {...g,caption:{...g.caption,en:e.target.value}} : g)}))}/><Input label={`${t('caption')} / ${t('persian')}`} value={image.caption.fa} dir="rtl" onChange={e=>setItem(current=>({...current,galleryImages:current.galleryImages.map(g=>g.id===image.id ? {...g,caption:{...g.caption,fa:e.target.value}} : g)}))}/></div><div className="flex items-center gap-2"><button type="button" className="text-xs text-muted" disabled={index===0} aria-label={t('cms.moveGalleryUp',{ns:'admin',index:index+1})} onClick={()=>moveGallery(index,-1)}>↑</button><button type="button" className="text-xs text-muted" disabled={index===item.galleryImages.length-1} aria-label={t('cms.moveGalleryDown',{ns:'admin',index:index+1})} onClick={()=>moveGallery(index,1)}>↓</button><button type="button" className="text-xs text-red" onClick={()=>setItem(current=>({...current,galleryImages:current.galleryImages.filter(g=>g.id!==image.id)}))}>{t('delete')}</button></div></div>)}
            </FormSection>
            <FormSection number="06" icon={Box} title={t('museumPlacement')} hint={t('museumPlacementHint')}>
                <div className="grid gap-5 md:grid-cols-3"><TaxonomySelect label={t('museumSection')} value={sectionId} options={sections.map(s=>({...s,label:s.title,active:s.available}))} disabled={taxonomy.loading||Boolean(taxonomy.error)} onChange={id=>setItem(current=>({...current,sectionId:id,museumSection:sections.find(s=>s.id===id)?.slug??''}))}/><Input
                    label={t('sortOrder')} type="number" {...fieldProps('sortOrder')} value={item.sortOrder}
                    onChange={event => set('sortOrder', Number(event.target.value))}/><label
                    className="field-label"><span>{t('status')}</span><select aria-label={t('status')} className="field-input"
                                                                              value={item.status} disabled={role!=='admin'}
                                                                              onChange={event => set('status', event.target.value as MuseumItem['status'])}>
                    <option value={ITEM_STATUS.draft}>{t('draft')}</option>
                    {role==='admin' && <option value={ITEM_STATUS.published}>{t('published')}</option>}
                </select></label>{role==='admin' && <label className="flex items-center gap-3 self-end pb-3 text-xs text-muted"><input
                    type="checkbox" checked={item.featured} onChange={event => set('featured', event.target.checked)}
                    className="h-4 w-4 accent-orange"/>{t('featured')}</label>}</div>
            </FormSection>
            <FormSection number="07" icon={ShieldCheck} title={t('sourceLicense')} hint={t('sourceLicenseHint')}>
                <div className="grid gap-5 md:grid-cols-2"><Input dir="ltr" label={t('sourcePlatform')} value={item.sourcePlatform ?? ''} onChange={event => set('sourcePlatform',event.target.value)}/><Input dir="ltr" label={t('creator')} value={item.creator ?? ''} onChange={event => set('creator',event.target.value)}/><Input dir="ltr" label={t('sourceUrl')} type="url"
                                                                  {...fieldProps('sourceUrl')} value={item.sourceUrl??''}
                                                                  onChange={event => set('sourceUrl',event.target.value)}
                                                                  placeholder="https://"/><label
                    className="field-label"><span>{t('license')}</span><select aria-label={t('license')} className="field-input" value={item.license??'museum-owned'}
                                                                               onChange={event => set('license',event.target.value)}>
                    {item.license&&!['museum-owned','licensed','public-domain'].includes(item.license)&&<option value={item.license}>{item.license}</option>}
                    <option value="">{t('cms.unassigned',{ns:'admin'})}</option>
                    <option value="museum-owned">{t('museumOwned')}</option>
                    <option value="licensed">{t('licensed')}</option>
                    <option value="public-domain">{t('publicDomain')}</option>
                </select></label><label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={item.attributionRequired ?? false} onChange={event => set('attributionRequired',event.target.checked)}/>{t('attributionRequired')}</label><Input label={t('attributionText')} value={item.attributionText ?? ''} onChange={event => set('attributionText',event.target.value)}/></div>
            </FormSection>
            {saving && <p role="status" className="text-xs text-muted">{t(`saveStage.${stage}`, {ns: 'phase2'})}</p>}
            {error && <div className="text-xs text-red" role="alert" id="exhibit-validation" tabIndex={-1} ref={feedback}><p>{error}</p>{issues.length>0&&<ul className="mt-2 list-inside list-disc">{issues.map((issue,index)=><li key={index}>{issueLabel(issue.field)}: {t(`cms.validation.${issue.key}`,{ns:'admin'})}</li>)}</ul>}</div>}
            {conflict&&<Button type="button" variant="ghost" onClick={()=>{if(window.confirm(t('cms.discardReload',{ns:'admin'}))){setError('');setIssues([]);setConflict(false);setThumbnailFile(undefined);setModelFile(undefined);setGalleryFiles([]);setGalleryCaptions([]);void refresh()}}}>{t('cms.reloadItem',{ns:'admin'})}</Button>}
            {retryBlocked&&<Link className="block text-sm text-orange" to="/admin/items">{t('cms.inspectBeforeRetry',{ns:'admin'})}</Link>}
            <div className="flex flex-wrap gap-3 pt-2"><Button type="submit" disabled={!canWrite || saving || retryBlocked || selectionBlocked || taxonomy.loading || Boolean(taxonomy.error) || Boolean(editId && !existing)}><Save size={15}/>{saving ? t('loading') : t('saveItem')}
            </Button><Button type="button" variant="ghost"
                             onClick={() => navigate('/admin/items')}>{t('cancel')}</Button></div>
            </fieldset></form>
    </div>
}

export function PlaceholderAdminPage({section}: { section: 'categories' | 'sections' }) {
    const {t} = useTranslation(['common', 'admin']);
    const titles = {
        categories: t('categoriesTitle', {ns: 'admin'}),
        sections: t('sectionsTitle', {ns: 'admin'}),
    };
    const [rows,setRows] = useState<Array<Record<string, unknown>>>([]); const [error,setError] = useState(''); const [slug,setSlug]=useState(''); const [nameEn,setNameEn]=useState(''); const [nameFa,setNameFa]=useState(''); const [sortOrder,setSortOrder]=useState(0); const [active,setActive]=useState(true); const [editingId,setEditingId]=useState<string>();
    useEffect(() => { const request = supabaseAdminService.taxonomy(section); void request.then(data => setRows(data as Array<Record<string, unknown>>)).catch(() => setError(t('dataError'))) }, [section,t]);
    const save = async (event: React.FormEvent) => { event.preventDefault(); const kind=section as 'categories'|'sections'; try { await supabaseAdminService.saveTaxonomy(kind,{id:editingId,slug,sort_order:sortOrder,active,...(kind === 'categories' ? {name_en:nameEn,name_fa:nameFa} : {title_en:nameEn,title_fa:nameFa,description_en:'',description_fa:''})}); const data=await supabaseAdminService.taxonomy(kind); setRows(data as Array<Record<string, unknown>>); setSlug('');setNameEn('');setNameFa('');setEditingId(undefined) } catch { setError(t('dataError')) } };
    return <div className="p-5 md:p-8"><AdminHeading eyebrow={`CORE / ${section.toUpperCase()}`} title={titles[section]}/>{error && <p className="mb-4 text-xs text-red">{error}</p>}{<form onSubmit={save} className="mb-5 grid gap-3 border border-border bg-surface p-4 md:grid-cols-5"><Input label={t('slug')} value={slug} onChange={e=>setSlug(e.target.value)}/><Input label={`${t('title')} / ${t('english')}`} value={nameEn} onChange={e=>setNameEn(e.target.value)}/><Input label={`${t('title')} / ${t('persian')}`} value={nameFa} onChange={e=>setNameFa(e.target.value)}/><Input label={t('sortOrder')} type="number" value={sortOrder} onChange={e=>setSortOrder(Number(e.target.value))}/><div className="flex items-end gap-3"><label className="mb-3 flex gap-2 text-xs"><input type="checkbox" checked={active} onChange={e=>setActive(e.target.checked)}/>{t('online')}</label><Button type="submit">{t('save')}</Button></div></form>}<div className="overflow-x-auto border border-border bg-surface"><table className="w-full text-sm"><tbody>{rows.map(row=><tr key={String(row.id)} className="border-b border-border/60"><td className="p-3 font-mono text-xs">{String(row.slug ?? row.email ?? '')}</td><td className="p-3">{String(row.name_en ?? row.title_en ?? row.full_name ?? '')}</td><td className="p-3">{<><button type="button" className="me-3 text-xs text-orange" onClick={()=>{setEditingId(String(row.id));setSlug(String(row.slug??''));setNameEn(String(row.name_en??row.title_en??''));setNameFa(String(row.name_fa??row.title_fa??''));setSortOrder(Number(row.sort_order??0));setActive(Boolean(row.active))}}>{t('edit')}</button><button type="button" className="text-xs text-red" onClick={()=>{if(window.confirm(t('deleteConfirm'))) void supabaseAdminService.deleteTaxonomy(section as 'categories'|'sections',String(row.id)).then(()=>setRows(rows.filter(r=>r.id!==row.id))).catch(()=>setError(t('dataError')))}}>{t('delete')}</button></>}</td></tr>)}</tbody></table>{!rows.length && <p className="p-10 text-center text-sm text-muted">{t('empty')}</p>}</div></div>
}




