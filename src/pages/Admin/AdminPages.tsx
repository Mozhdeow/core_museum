import {useEffect, useMemo, useState} from 'react';
import {Link, useLocation, useNavigate} from 'react-router-dom';
import {
    ArrowUpRight,
    Box,
    ImagePlus,
    Link2,
    MoreHorizontal,
    Plus,
    Search,
    Save,
    ShieldCheck,
    Upload
} from 'lucide-react';
import {useTranslation} from 'react-i18next';
import {Input} from '@/components/ui/Input';
import {Button} from '@/components/ui/Button';
import {useAuthStore} from '@/features/auth/authStore';
import {useMuseumItems} from '@/hooks/useMuseumItems';
import {museumItemsService, supabaseAdminService} from '@/lib/services';
import {mockSections} from '@/data/mock/museum';
import {ITEM_STATUS, CATEGORY_IDS, type MuseumItem, type LocalizedText} from '@/types/museum';

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
                    navigate('/admin/dashboard', {replace: true})
                } catch { setError(t('unauthorized', {ns:'common'}));
                }
            }}><Input label={t('email')} type="email" value={email} onChange={e => setEmail(e.target.value)}/><Input
                label={t('password')} type="password" value={password}
                onChange={e => setPassword(e.target.value)}/>{error && <p className="text-xs text-red" role="alert">{error}</p>}<Button className="mt-3 w-full" type="submit">{t('signIn')}
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

export function ItemsPage() {
    const {t} = useTranslation(['common', 'admin']);
    const {items, refresh} = useMuseumItems();
    const [query, setQuery] = useState('');
    const navigate = useNavigate();
    const filtered = useMemo(() => items.filter(item => item.title.en.toLowerCase().includes(query.toLowerCase()) || item.brand.toLowerCase().includes(query.toLowerCase())), [items, query]);
    return <div className="p-5 md:p-8"><AdminHeading eyebrow="CORE / ARCHIVE" title={t('itemsTitle', {ns: 'admin'})}
                                                     action={<Button onClick={() => navigate('/admin/items/new')}><Plus
                                                         size={15}/>{t('addNew')}</Button>}/>
        <div className="mb-5 flex max-w-sm items-center gap-2 border-b border-border pb-2 text-muted"><Search
            size={15}/><input value={query} onChange={e => setQuery(e.target.value)} placeholder={t('search')}
                              className="w-full bg-transparent text-sm outline-none"/></div>
        <div className="overflow-x-auto border border-border">
            <table className="w-full min-w-[760px] text-start">
                <thead className="border-b border-border bg-surface">
                <tr>{[t('title'), t('category'), t('brand'), t('releaseYear'), t('museumSection'), t('status'), t('actions')].map(label =>
                    <th key={label}
                        className="px-4 py-4 text-start font-mono text-[10px] uppercase tracking-widest text-muted">{label}</th>)}</tr>
                </thead>
                <tbody>{filtered.map(item => <tr key={item.id}
                                                 className="border-b border-border/70 last:border-0 hover:bg-surface">
                    <td className="px-4 py-4">
                        <div className="flex items-center gap-3"><img src={item.thumbnail} alt=""
                                                                      className="h-9 w-12 object-cover"/><span
                            className="font-medium" dir="auto">{item.title.en}</span></div>
                    </td>
                    <td className="px-4 py-4 font-mono text-xs text-muted">{item.category.toUpperCase()}</td>
                    <td className="px-4 py-4 text-sm text-muted">{item.brand}</td>
                    <td className="px-4 py-4 font-mono text-xs">{item.releaseYear}</td>
                    <td className="px-4 py-4 text-sm text-muted">{t(item.museumSection, {ns: 'museum'})}</td>
                    <td className="px-4 py-4"><span
                        className="border border-cyan/30 px-2 py-1 font-mono text-[9px] uppercase tracking-widest text-cyan">{t(item.status)}</span>
                    </td>
                    <td className="px-4 py-4"><div className="flex items-center gap-3"><Link to={`/admin/items/${item.id}/edit`} className="text-muted hover:text-orange" aria-label={t('edit')}><MoreHorizontal size={18}/></Link><button type="button" className="font-mono text-[9px] text-red" onClick={() => { if(window.confirm(t('deleteConfirm'))) void museumItemsService.remove(item.id).then(() => refresh()) }}>{t('delete')}</button></div></td>
                </tr>)}</tbody>
            </table>
            {filtered.length === 0 && <p className="p-10 text-center text-sm text-muted">{t('noItems')}</p>}</div>
        <button className="mt-5 font-mono text-[10px] uppercase tracking-widest text-muted hover:text-orange"
                onClick={() => void refresh()}>â†» refresh data
        </button>
    </div>
}

const blankItem: MuseumItem = {
    id: '',
    title: {en: '', fa: ''},
    slug: '',
    brand: '',
    category: 'gpu',
    releaseYear: 2025,
    shortDescription: {en: '', fa: ''},
    description: {en: '', fa: ''},
    specifications: [{label: {en: '', fa: ''}, value: ''}, {label: {en: '', fa: ''}, value: ''}, {
        label: {
            en: '',
            fa: ''
        }, value: ''
    }],
    thumbnail: '/images/landing/studies/gpu-study.svg',
    galleryImages: [],
    model3DUrl: null,
    museumSection: 'gpu',
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
    const {t} = useTranslation(['common', 'admin']);
    const location = useLocation();
    const navigate = useNavigate();
    const {items} = useMuseumItems();
    const editId = location.pathname.includes('/edit') ? location.pathname.split('/').at(-2) : undefined;
    const existing = editId ? items.find(item => item.id === editId) : undefined;
    const [item, setItem] = useState<MuseumItem>(existing ?? {...blankItem, id: crypto.randomUUID()});
    const [galleryFiles,setGalleryFiles] = useState<File[]>([]); const [thumbnailFile,setThumbnailFile] = useState<File>(); const [modelFile,setModelFile] = useState<File>(); const [saving,setSaving] = useState(false); const [error,setError] = useState('');
    const [sourceUrl, setSourceUrl] = useState('');
    const [license, setLicense] = useState('museum-owned');
    // The route mounts a fresh form for each edit target.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    useEffect(() => { if (existing) { setItem(existing); setSourceUrl(existing.sourceUrl ?? ''); setLicense(existing.license ?? 'museum-owned') } }, [existing]);
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
    const save = async (event: React.FormEvent) => { event.preventDefault(); if(saving)return; setSaving(true); setError(''); const requestedStatus=item.status; try { const id=await supabaseAdminService.saveDomainItem({...item,status:'draft'}); const thumbPath=thumbnailFile ? `items/${id}/thumbnail/${crypto.randomUUID()}-${thumbnailFile.name.replace(/[^a-zA-Z0-9._-]/g,'_')}` : undefined; const modelPath=modelFile ? supabaseAdminService.storage.modelPath(id) : undefined; const galleryPaths=galleryFiles.map(file=>`items/${id}/gallery/${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g,'_')}`); if(thumbnailFile) await supabaseAdminService.storage.upload('museum-images',thumbPath!,thumbnailFile); for(let i=0;i<galleryFiles.length;i++) await supabaseAdminService.storage.upload('museum-images',galleryPaths[i],galleryFiles[i]); if(modelFile) await supabaseAdminService.storage.upload('museum-models',modelPath!,modelFile); if(thumbPath||modelPath||galleryPaths.length) await supabaseAdminService.updateMedia(id,{thumbnail_path:thumbPath,model_path:modelPath,model_original_filename:modelFile?.name,model_file_size:modelFile?.size,galleries:galleryPaths}); await supabaseAdminService.setItemStatus(id,requestedStatus); navigate('/admin/items') } catch(e) { setError(e instanceof Error ? e.message : 'Unable to save item; it remains a draft') } finally { setSaving(false) } };
    return <div className="p-5 md:p-8">
        <AdminHeading eyebrow="CORE / ARCHIVE / ITEM" title={editId ? t('editItem') : t('newItem')}/>
        <form onSubmit={save} className="max-w-4xl space-y-5">
            <FormSection number="01" icon={Box} title={t('basicInformation')} hint={t('basicInformationHint')}>
                <div className="grid gap-5 md:grid-cols-2"><Input dir="ltr" label={t('slug')} value={item.slug}
                                                                  onChange={event => set('slug', event.target.value)}/><Input
                    dir="ltr" label={t('brand')} value={item.brand}
                    onChange={event => set('brand', event.target.value)}/><Input dir="ltr" label={t('releaseYear')}
                                                                                 type="number" value={item.releaseYear}
                                                                                 onChange={event => set('releaseYear', Number(event.target.value))}/><label
                    className="field-label"><span>{t('category')}</span><select className="field-input"
                                                                                value={item.category}
                                                                                onChange={event => set('category', event.target.value as MuseumItem['category'])}>{CATEGORY_IDS.map(category =>
                    <option key={category} value={category}>{category.toUpperCase()}</option>)}</select></label></div>
            </FormSection>
            <FormSection number="02" icon={Link2} title={t('localizedContent')} hint={t('localizedContentHint')}>
                <div className="space-y-5">
                    <div className="grid gap-5 md:grid-cols-2"><Input dir="ltr"
                                                                      label={`${t('title')} / ${t('english')}`}
                                                                      value={item.title.en}
                                                                      onChange={event => setLocalized('title', 'en', event.target.value)}/><Input
                        label={`${t('title')} / ${t('persian')}`} dir="rtl" value={item.title.fa}
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
                <div className="space-y-3">{item.specifications.map((spec, index) => <div key={index}
                                                                                          className="grid gap-3 md:grid-cols-2 md:items-end">
                    <Input dir="ltr" label={`${t('specification')} ${String(index + 1)} / ${t('english')}`}
                           value={spec.label.en}
                           onChange={event => updateSpecification(index, 'label', event.target.value, 'en')}/><Input
                    dir="ltr" label={t('specValue')} value={spec.value}
                    onChange={event => updateSpecification(index, 'value', event.target.value)}/></div>)}</div>
            </FormSection>
            <FormSection number="04" icon={Box} title={t('threeDModel')} hint={t('uploadPlaceholder')}>
                <label className="upload-tile cursor-pointer"><input type="file" accept=".glb,model/gltf-binary,application/octet-stream"
                                                                     className="sr-only" onChange={e => {const file=e.target.files?.[0]; if(file && file.name.toLowerCase().endsWith('.glb')) setModelFile(file)}}/><span
                    className="flex flex-col items-center gap-2"><Upload size={18}/><span
                    className="font-mono text-[10px] uppercase tracking-widest">{modelFile?.name ?? t('choose3DModel')}</span><span
                    className="text-xs text-muted">.GLB {modelFile ? `${Math.round(modelFile.size / 1024)} KB` : t('uploadPlaceholder')}</span></span></label>
            </FormSection>
            <FormSection number="05" icon={ImagePlus} title={t('gallerySection')} hint={t('galleryHint')}>
                <label className="upload-tile mb-3 cursor-pointer"><input type="file" accept="image/jpeg,image/png,image/webp,image/avif" className="sr-only" onChange={e => setThumbnailFile(e.target.files?.[0])}/><span className="flex flex-col items-center gap-2"><ImagePlus size={18}/><span className="font-mono text-[10px] uppercase tracking-widest">{thumbnailFile?.name ?? t('thumbnail')}</span><span className="text-xs text-muted">{thumbnailFile ? `${Math.round(thumbnailFile.size / 1024)} KB` : t('chooseImages')}</span></span></label>
                <label className="upload-tile cursor-pointer"><input type="file" accept="image/jpeg,image/png,image/webp,image/avif" multiple
                                                                     className="sr-only" onChange={e => setGalleryFiles(Array.from(e.target.files ?? []))}/><span
                    className="flex flex-col items-center gap-2"><ImagePlus size={18}/><span
                    className="font-mono text-[10px] uppercase tracking-widest">{galleryFiles.length ? `${galleryFiles.length} ${t('chooseImages')}` : t('chooseImages')}</span><span
                    className="text-xs text-muted">JPG / PNG / WEBP</span></span></label>
                {item.galleryImages.map((image,index)=><div key={image.id} className="mt-3 grid gap-2 border border-border p-3 md:grid-cols-[96px_1fr_auto]"><img src={image.url} alt="" className="h-16 w-24 object-cover"/><div className="grid gap-2 md:grid-cols-2"><Input label={`${t('caption')} / ${t('english')}`} defaultValue={image.caption.en} onBlur={e=>void supabaseAdminService.updateGalleryImage(image.id,{caption_en:e.target.value})}/><Input label={`${t('caption')} / ${t('persian')}`} defaultValue={image.caption.fa} dir="rtl" onBlur={e=>void supabaseAdminService.updateGalleryImage(image.id,{caption_fa:e.target.value})}/></div><div className="flex items-center gap-2"><button type="button" className="text-xs text-muted" disabled={index===0} onClick={()=>{const previous=item.galleryImages[index-1]; if(previous) void Promise.all([supabaseAdminService.updateGalleryImage(image.id,{sort_order:index-1}),supabaseAdminService.updateGalleryImage(previous.id,{sort_order:index})])}}>â†‘</button><button type="button" className="text-xs text-muted" disabled={index===item.galleryImages.length-1} onClick={()=>{const next=item.galleryImages[index+1]; if(next) void Promise.all([supabaseAdminService.updateGalleryImage(image.id,{sort_order:index+1}),supabaseAdminService.updateGalleryImage(next.id,{sort_order:index})])}}>â†“</button><button type="button" className="text-xs text-red" onClick={()=>void supabaseAdminService.deleteGalleryImage(image.id,image.storagePath)}>{t('delete')}</button></div></div>)}
            </FormSection>
            <FormSection number="06" icon={Box} title={t('museumPlacement')} hint={t('museumPlacementHint')}>
                <div className="grid gap-5 md:grid-cols-3"><label
                    className="field-label md:col-span-2"><span>{t('museumSection')}</span><select
                    className="field-input" value={item.museumSection}
                    onChange={event => set('museumSection', event.target.value as MuseumItem['museumSection'])}>{mockSections.map(section =>
                    <option key={section.id} value={section.id}>{section.title.en}</option>)}</select></label><Input
                    label={t('sortOrder')} type="number" value={item.sortOrder}
                    onChange={event => set('sortOrder', Number(event.target.value))}/><label
                    className="field-label"><span>{t('status')}</span><select className="field-input"
                                                                              value={item.status}
                                                                              onChange={event => set('status', event.target.value as MuseumItem['status'])}>
                    <option value={ITEM_STATUS.draft}>{t('draft')}</option>
                    <option value={ITEM_STATUS.published}>{t('published')}</option>
                </select></label><label className="flex items-center gap-3 self-end pb-3 text-xs text-muted"><input
                    type="checkbox" checked={item.featured} onChange={event => set('featured', event.target.checked)}
                    className="h-4 w-4 accent-orange"/>{t('featured')}</label></div>
            </FormSection>
            <FormSection number="07" icon={ShieldCheck} title={t('sourceLicense')} hint={t('sourceLicenseHint')}>
                <div className="grid gap-5 md:grid-cols-2"><Input dir="ltr" label={t('sourcePlatform')} value={item.sourcePlatform ?? ''} onChange={event => set('sourcePlatform',event.target.value)}/><Input dir="ltr" label={t('creator')} value={item.creator ?? ''} onChange={event => set('creator',event.target.value)}/><Input dir="ltr" label={t('sourceUrl')} type="url"
                                                                  value={sourceUrl || item.sourceUrl || ''}
                                                                  onChange={event => {setSourceUrl(event.target.value);set('sourceUrl',event.target.value)}}
                                                                  placeholder="https://"/><label
                    className="field-label"><span>{t('license')}</span><select className="field-input" value={license}
                                                                               onChange={event => {setLicense(event.target.value);set('license',event.target.value)}}>
                    <option value="museum-owned">{t('museumOwned')}</option>
                    <option value="licensed">{t('licensed')}</option>
                    <option value="public-domain">{t('publicDomain')}</option>
                </select></label><label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={item.attributionRequired ?? false} onChange={event => set('attributionRequired',event.target.checked)}/>{t('attributionRequired')}</label><Input label={t('attributionText')} value={item.attributionText ?? ''} onChange={event => set('attributionText',event.target.value)}/></div>
            </FormSection>
            {error && <p className="text-xs text-red" role="alert">{error}</p>}<div className="flex flex-wrap gap-3 pt-2"><Button type="submit" disabled={saving}><Save size={15}/>{saving ? t('loading') : t('saveItem')}
            </Button><Button type="button" variant="ghost"
                             onClick={() => navigate('/admin/items')}>{t('cancel')}</Button></div>
        </form>
    </div>
}

export function PlaceholderAdminPage({section}: { section: 'categories' | 'sections' | 'users' }) {
    const {t} = useTranslation(['common', 'admin']);
    const titles = {
        categories: t('categoriesTitle', {ns: 'admin'}),
        sections: t('sectionsTitle', {ns: 'admin'}),
        users: t('usersTitle', {ns: 'admin'})
    };
    const [rows,setRows] = useState<Array<Record<string, unknown>>>([]); const [error,setError] = useState(''); const [slug,setSlug]=useState(''); const [nameEn,setNameEn]=useState(''); const [nameFa,setNameFa]=useState(''); const [sortOrder,setSortOrder]=useState(0); const [active,setActive]=useState(true); const [editingId,setEditingId]=useState<string>();
    useEffect(() => { const request = section === 'users' ? supabaseAdminService.users() : supabaseAdminService.taxonomy(section as 'categories'|'sections'); void request.then(data => setRows(data as Array<Record<string, unknown>>)).catch(() => setError(t('dataError'))) }, [section,t]);
    const save = async (event: React.FormEvent) => { event.preventDefault(); const kind=section as 'categories'|'sections'; try { await supabaseAdminService.saveTaxonomy(kind,{id:editingId,slug,sort_order:sortOrder,active,...(kind === 'categories' ? {name_en:nameEn,name_fa:nameFa} : {title_en:nameEn,title_fa:nameFa,description_en:'',description_fa:''})}); const data=await supabaseAdminService.taxonomy(kind); setRows(data as Array<Record<string, unknown>>); setSlug('');setNameEn('');setNameFa('');setEditingId(undefined) } catch { setError(t('dataError')) } };
    return <div className="p-5 md:p-8"><AdminHeading eyebrow={`CORE / ${section.toUpperCase()}`} title={titles[section]}/>{error && <p className="mb-4 text-xs text-red">{error}</p>}{section !== 'users' && <form onSubmit={save} className="mb-5 grid gap-3 border border-border bg-surface p-4 md:grid-cols-5"><Input label={t('slug')} value={slug} onChange={e=>setSlug(e.target.value)}/><Input label={`${t('title')} / ${t('english')}`} value={nameEn} onChange={e=>setNameEn(e.target.value)}/><Input label={`${t('title')} / ${t('persian')}`} value={nameFa} onChange={e=>setNameFa(e.target.value)}/><Input label={t('sortOrder')} type="number" value={sortOrder} onChange={e=>setSortOrder(Number(e.target.value))}/><div className="flex items-end gap-3"><label className="mb-3 flex gap-2 text-xs"><input type="checkbox" checked={active} onChange={e=>setActive(e.target.checked)}/>{t('online')}</label><Button type="submit">{t('save')}</Button></div></form>}<div className="overflow-x-auto border border-border bg-surface"><table className="w-full text-sm"><tbody>{rows.map(row=><tr key={String(row.id)} className="border-b border-border/60"><td className="p-3 font-mono text-xs">{String(row.slug ?? row.email ?? '')}</td><td className="p-3">{String(row.name_en ?? row.title_en ?? row.full_name ?? '')}</td><td className="p-3">{section !== 'users' && <><button type="button" className="me-3 text-xs text-orange" onClick={()=>{setEditingId(String(row.id));setSlug(String(row.slug??''));setNameEn(String(row.name_en??row.title_en??''));setNameFa(String(row.name_fa??row.title_fa??''));setSortOrder(Number(row.sort_order??0));setActive(Boolean(row.active))}}>{t('edit')}</button><button type="button" className="text-xs text-red" onClick={()=>{if(window.confirm(t('deleteConfirm'))) void supabaseAdminService.deleteTaxonomy(section as 'categories'|'sections',String(row.id)).then(()=>setRows(rows.filter(r=>r.id!==row.id))).catch(()=>setError(t('dataError')))}}>{t('delete')}</button></>}</td></tr>)}</tbody></table>{!rows.length && <p className="p-10 text-center text-sm text-muted">{t('empty')}</p>}</div></div>
}




