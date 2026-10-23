import { useEffect, useId, useRef, useState, type ReactNode, type DragEvent } from 'react';
import { ArrowRight, ArrowLeft, Check, ChevronRight, ChevronDown, Clock3, Coins, Image as ImageIcon, UploadCloud, Play, Menu, X, Info, Music2, Film, SlidersHorizontal, ScanFace, Download, Plus, LockKeyhole, LoaderCircle, CircleAlert, MoreVertical, PersonStanding } from 'lucide-react';
import { envConfigs } from '@/config';
import { Link } from '@/core/i18n/navigation';
import { m } from '@/paraglide/messages.js';
import '@/styles/dance.css';

export type DanceSlug = 'love-options-dance' | 'stateside-dance';
const art = (name: string) => '/design/' + name + '.webp';
const isStateside = (slug: DanceSlug) => slug === 'stateside-dance';
const title = (slug: DanceSlug) => isStateside(slug) ? 'Stateside' : 'Love Options';
function copy() {
  return {
    choose: m['fidelity.choose'](), upload: m['fidelity.upload'](), drop: m['fidelity.drop'](), tap: m['fidelity.tap'](),
    choosePhoto: m['dance.upload'](), requirements: m['fidelity.requirements'](), expect: m['dance.limits'](),
    pending: m['fidelity.pending'](), soon: m['dance.soon'](), duration: m['fidelity.duration'](), credits: m['fidelity.credits'](),
    generate: m['fidelity.generate'](), notice: m['fidelity.notice'](), illustration: m['fidelity.illustration'](),
    format: m['dance.output'](), faq: m['fidelity.faq'](), next: m['dance.browse'](), local: m['dance.local'](),
  };
}
function Logo() { return <Link className="dt-logo" href="/"><span className="dt-brand-mark"><img className="dt-brand-person" src="/design/brand-person.png" alt="" /><img className="dt-brand-wave" src="/design/brand-wave.png" alt="" /></span><span>{envConfigs.app_name}</span></Link>; }
export function DanceShell({ children, page = '' }: { children: ReactNode; page?: string }) {
  const [menu, setMenu] = useState(false);
  return <div className={'dt-site ' + page}><a className="dt-skip" href="#dance-main">{m['dance.skip']()}</a>
    <header className="dt-header"><Logo /><nav className={menu ? 'open' : ''} aria-label={m['dance.templates']()}>
      <Link className={page === 'dt-directory' || page.includes('dt-detail') ? 'active' : ''} href="/templates">{m['fidelity.navTemplates']()}</Link>
      <Link href="/#how-it-works">{m['dance.how']()}</Link><Link className={page === 'dt-pricing' ? 'active' : ''} href="/pricing">{m['dance.pricing']()}</Link>
      <Link className={page === 'dt-videos' ? 'active' : ''} href="/settings/videos">{m['fidelity.myVideos']()}</Link>
    </nav><Link className="dt-signin" href="/sign-in">{m['dance.signin']()}</Link>
    <button className="dt-menu" type="button" onClick={() => setMenu(!menu)} aria-expanded={menu} aria-label={m['fidelity.menu']()}>{menu ? <X /> : <Menu />}</button></header>
    <main id="dance-main">{children}</main><footer className="dt-footer"><Logo /><span>phototodancevideo.com</span><div><Link href="/privacy-policy">{m['dance.privacy']()}</Link><Link href="/terms-of-service">{m['dance.terms']()}</Link></div></footer>
  </div>;
}
function Breadcrumb({ current, template = false }: { current: string; template?: boolean }) {
  return <nav className="dt-breadcrumb" aria-label={m['fidelity.breadcrumb']()}><Link href="/">{m['dance.home']()}</Link><span>/</span>{template && current !== m['fidelity.navTemplates']() ? <><Link href="/templates">{m['fidelity.navTemplates']()}</Link><span>/</span></> : null}<span aria-current="page">{current}</span></nav>;
}
function Still({ src, label, className = '' }: { src: string; label: string; className?: string }) {
  const [open, setOpen] = useState(false);
  return <div className={'dt-still ' + className}><img src={art(src)} alt={label} />
    <button type="button" className="dt-play" aria-label={m['fidelity.previewAction']()} onClick={() => setOpen(true)}><Play fill="currentColor" aria-hidden="true" /></button>
    {open ? <div className="dt-still-note" role="status"><button type="button" onClick={() => setOpen(false)} aria-label={m['fidelity.close']()}><X /></button><p>{m['fidelity.stillNotice']()}</p></div> : null}
  </div>;
}
function PhotoPicker({ examples = false, unavailable = false, onPhoto }: { examples?: boolean; unavailable?: boolean; onPhoto?: (photo: File | null) => void }) {
  const c = copy(); const id = useId();
  const [photo, setPhoto] = useState<File | null>(null); const [url, setUrl] = useState(''); const [error, setError] = useState(''); const [drag, setDrag] = useState(false);
  useEffect(() => { if (!photo) { setUrl(''); return; } const u = URL.createObjectURL(photo); setUrl(u); return () => URL.revokeObjectURL(u); }, [photo]);
  function select(file?: File) { if (!file || unavailable) return; if (!['image/jpeg','image/png','image/webp'].includes(file.type)) { setError(m['dance.invalid']()); return; } setError(''); setPhoto(file); onPhoto?.(file); }
  function drop(event: DragEvent) { event.preventDefault(); setDrag(false); select(event.dataTransfer.files[0]); }
  return <div className="dt-photo"><h3><label htmlFor={id}>{examples ? <><span className="desktop-only">{m['fidelity.uploadNumber']()}</span><span className="mobile-only">{c.upload}</span></> : c.upload}</label></h3>
    <div className={'dt-upload ' + (drag ? 'dragging ' : '') + (url ? 'with-photo' : '')} onDragOver={e => { e.preventDefault(); if (!unavailable) setDrag(true); }} onDragLeave={() => setDrag(false)} onDrop={drop}>
      {url ? <img src={url} alt={m['dance.photoAlt']()} onError={() => { setPhoto(null); setError(m['dance.broken']()); }} /> : <><UploadCloud className="dt-upload-icon desktop-only" /><ImageIcon className="dt-upload-icon mobile-only" /></>}
      {!url ? <><p className="desktop-only">{unavailable ? m['fidelity.uploadLaunch']() : c.drop}</p><p className="mobile-only">{unavailable ? m['fidelity.uploadLaunch']() : c.tap}</p></> : null}
      {!unavailable ? <label className="dt-file-button" htmlFor={id}>{url ? m['fidelity.replace']() : c.choosePhoto}</label> : null}
      <input className="dt-file-input" id={id} type="file" accept="image/jpeg,image/png,image/webp" disabled={unavailable} aria-describedby={id + '-help'} onChange={e => { select(e.target.files?.[0]); e.target.value = ''; }} />
      <span className="dt-file-types">JPG, PNG, WEBP</span>
    </div>
    <span id={id + '-help'} className="dt-photo-help">{url ? c.local : examples ? '' : m['fidelity.photoRequirement']()}</span>
    {photo ? <button type="button" className="dt-remove" onClick={() => { setPhoto(null); onPhoto?.(null); }}>{m['dance.remove']()}</button> : null}
    {error ? <p role="alert">{error}</p> : null}
    {examples ? <div className="dt-examples"><span>{m['fidelity.photoExamples']()}</span><div>{['home-face','home-side','home-back','home-full'].map(x => <img key={x} src={art(x)} alt={m['fidelity.examplePhoto']()} />)}</div></div> : null}
  </div>;
}
function Specs({ detailed = false, stateside = false }: { detailed?: boolean; stateside?: boolean }) {
  const c = copy(); return <div className={'dt-specs ' + (detailed ? 'detailed' : '') + (stateside ? 'stateside' : '')}>
    <div><Clock3 /><span>{c.duration}<small>{c.pending}</small></span></div><div><Coins /><span>{c.credits}<small>{c.pending}</small></span></div>
    {detailed ? <><div><Film /><span>9:16 MP4</span></div><div><Music2 /><span>{m['fidelity.noMusic']()}</span></div></> : null}
  </div>;
}
type DanceAvailability = { enabled: boolean; credits: number | null };
function useDanceAvailability(slug: DanceSlug): DanceAvailability {
  const [templates, setTemplates] = useState<Array<DanceAvailability & { slug: string }>>([]);
  useEffect(() => {
    let live = true;
    fetch('/api/dance/templates').then(r => r.json()).then(j => {
      if (live && Array.isArray(j.data)) setTemplates(j.data);
    }).catch(() => {});
    return () => { live = false; };
  }, []);
  return templates.find(t => t.slug === slug) || { enabled: false, credits: null };
}
function GenerateButton({ home = false, stateside = false, slug, photo, availability }: {
  home?: boolean; stateside?: boolean; slug: DanceSlug;
  photo: File | null; availability: DanceAvailability;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [created, setCreated] = useState(false);
  const requestKey = useRef<string | null>(null);
  const uploaded = useRef<{ file: File; key: string } | null>(null);
  useEffect(() => {
    requestKey.current = null;
    uploaded.current = null;
    setError('');
    setCreated(false);
  }, [photo, slug]);
  async function submit() {
    if (!photo || !availability.enabled || busy) return;
    setBusy(true); setError('');
    try {
      if (!requestKey.current) requestKey.current = crypto.randomUUID();
      let key = uploaded.current?.file === photo ? uploaded.current.key : '';
      if (!key) {
        const form = new FormData();
        form.append('file', photo);
        const response = await fetch('/api/dance/upload', { method: 'POST', body: form });
        const asset = await response.json();
        if (!response.ok || !asset.data?.key) throw new Error(asset.error || 'Photo upload failed');
        key = asset.data.key;
        uploaded.current = { file: photo, key };
      }
      const response = await fetch('/api/dance/tasks', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, key, idempotencyKey: requestKey.current }),
      });
      const task = await response.json();
      if (!response.ok) throw new Error(task.error || 'Unable to create video');
      setCreated(true);
    } catch (e) { setError(e instanceof Error ? e.message : 'Generation failed'); }
    finally { setBusy(false); }
  }
  return <>
    <button className={'dt-primary dt-generate ' + (home ? 'home-generate' : '')}
      type="button" disabled={!availability.enabled || !photo || busy || created} onClick={submit}>
      <span>{busy ? 'Submitting…' : !availability.enabled ? m['dance.soon']() : created ? 'Task created' : m['fidelity.generate']()}</span>
      {home ? <ArrowRight /> : null}
    </button>
    {created ? <p role="status"><Link href="/settings/videos">View your generation progress →</Link></p> : null}
    {error ? <p role="alert">{error}</p> : null}
    <p className="dt-generate-note">{availability.enabled ? 'Credits are deducted only after a task is accepted. Technical failures are refunded.' : m['fidelity.notice']()}</p>
  </>;
}
function HowItWorks() { return <section className="dt-how" id="how-it-works"><h2>{m['dance.how']()}</h2><div>{[ImageIcon,UploadCloud,Play].map((Icon,i) => <article key={i}><div><span>{i+1}</span><i><Icon /></i></div><h3>{[m['fidelity.step1'](),m['fidelity.step2'](),m['fidelity.step3']()][i]}</h3><p>{[m['fidelity.step1Body'](),m['fidelity.step2Body'](),m['fidelity.step3Body']()][i]}</p></article>)}</div></section>; }
function HomeCollection() { return <section className="dt-home-collection"><h2>{m['fidelity.find']()}</h2><div>
  <Link className="dt-mini-card" href="/templates/love-options-dance"><img src={art('home-choice')} alt="Love Options" /><div><h3>Love Options</h3><ArrowRight /><span>{m['fidelity.useTemplate']()}</span></div></Link>
  <Link className="dt-mini-card muted" href="/templates/stateside-dance"><img src={art('directory-stateside')} alt="Stateside" /><div><h3>Stateside</h3><span className="dt-pill">{m['dance.soon']()}</span></div></Link>
  <div className="dt-mini-more"><PersonStanding /><strong>{m['fidelity.moreDances']()}</strong></div></div></section>; }
export function DanceHome() {
  const [slug, setSlug] = useState<DanceSlug>('love-options-dance');
  const [selectedInfo,setSelectedInfo] = useState(false);
  const [photo, setPhoto] = useState<File | null>(null);
  const availability = useDanceAvailability(slug);
  return <DanceShell page="dt-home"><section className="dt-hero"><p className="dt-eyebrow">{m['dance.eyebrow']()}</p><h1>{m['dance.title']()}</h1><p className="desktop-only">{m['fidelity.homeIntro']()}</p><p className="mobile-only">{m['fidelity.mobileIntro']()}</p></section>
    <div className="dt-home-generator"><section className="dt-home-controls">
      <div className="dt-choose desktop-only"><h3>{m['fidelity.chooseNumber']()}</h3><div>{(['love-options-dance','stateside-dance'] as DanceSlug[]).map(s => <button type="button" key={s} aria-pressed={slug === s} onClick={() => setSlug(s)} className={isStateside(s) ? 'coming' : ''}><div><img src={art(isStateside(s) ? 'home-coming' : 'home-choice')} alt={title(s)} />{slug === s ? <i><Check /></i> : null}{isStateside(s) ? <span className="dt-pill">{m['dance.soon']()}</span> : null}</div><strong>{title(s)}</strong></button>)}</div></div>
      <Link className="dt-mobile-template mobile-only" href={'/templates/' + slug}><img src={art('mobile-love')} alt={title(slug)} /><div><h2>{title(slug)}</h2><p>{m['fidelity.mobileIntro']()}</p></div><ChevronRight /></Link>
      <PhotoPicker examples onPhoto={setPhoto} /><p className="dt-output"><Info />{m['fidelity.vertical']()}</p><div className="mobile-only"><Specs /></div><GenerateButton home slug={slug} photo={photo} availability={availability} />
    </section><section className="dt-home-preview desktop-only"><div className="dt-preview-heading"><h2>{title(slug)}</h2><span className="dt-pill">{m['dance.preview']()}</span></div>
      <div className="dt-stage" style={{backgroundImage:'url(' + art(isStateside(slug) ? 'directory-stateside' : 'home-dance') + ')'}}><div className="dt-stage-shade" />
        <figure className="dt-original"><img src={art('home-original')} alt={m['fidelity.original']()} /><figcaption>{m['fidelity.original']()}</figcaption></figure>
        <div className="dt-stage-main"><img src={art(isStateside(slug) ? 'directory-stateside' : 'home-dance')} alt={m['fidelity.illustration']()} /><button className="dt-play" onClick={() => setSelectedInfo(true)} aria-label={m['fidelity.previewAction']()}><Play fill="currentColor" /></button>
          <div className="dt-player-controls"><Play fill="currentColor" /><span /><small>{m['fidelity.still']()}</small></div></div>
        <p className="dt-stage-caption">{m['fidelity.resultExample']()}</p>
        {selectedInfo ? <div className="dt-still-note" role="status"><button onClick={() => setSelectedInfo(false)} aria-label={m['fidelity.close']()}><X /></button><p>{m['fidelity.stillNotice']()}</p></div> : null}
      </div><p className="dt-concept-label">{m['fidelity.exampleNotice']()}</p>
    </section></div><div className="dt-home-bottom"><HomeCollection /><HowItWorks /></div>
    <div className="dt-home-faq"><DanceFAQ /></div>
  </DanceShell>;
}
export function DanceCollection() { return <div className="dt-directory-cards">{(['love-options-dance','stateside-dance'] as DanceSlug[]).map(slug => <article className={'dt-template-card ' + (isStateside(slug) ? 'coming' : '')} key={slug}><div className="dt-card-image"><Still src={isStateside(slug) ? 'directory-stateside' : 'directory-love'} label={title(slug)} /><span className="dt-image-label">{m['dance.preview']()}</span><span className="dt-card-status dt-pill">{m['fidelity.pending']()}</span></div><div className="dt-card-copy"><h2>{title(slug)}</h2><p>{isStateside(slug) ? m['fidelity.statesideShort']() : m['fidelity.loveShort']()}</p><small>{m['dance.output']()}</small><Link className={'dt-primary ' + (isStateside(slug) ? 'secondary' : '')} href={'/templates/' + slug}>{isStateside(slug) ? m['dance.soon']() : m['fidelity.useTemplate']()}<ArrowRight /></Link></div></article>)}</div>; }
export function DanceDirectory() { return <DanceShell page="dt-directory"><Breadcrumb current={m['fidelity.navTemplates']()} /><section className="dt-hero"><p className="dt-eyebrow">{m['dance.templates']()}</p><h1>{m['dance.browse']()}</h1><p>{m['fidelity.directoryIntro']()}</p></section><DanceCollection /><div className="dt-directory-how"><HowItWorks /><p>{m['fidelity.privatePhoto']()}</p></div></DanceShell>; }
function Requirements({ stateside = false }: { stateside?: boolean }) { return <section className={'dt-requirements ' + (stateside ? 'state-notes' : '')}><div><h2>{m['fidelity.clearPhoto']()}</h2><p>{m['fidelity.clearPhotoBody']()}</p><div className="dt-requirement-photos">{['love-original','love-face','love-original'].map((img,i)=><article key={i}><div><img src={art(img)} alt={[m['fidelity.onePerson'](),m['fidelity.clearFace'](),m['fidelity.fullBody']()][i]} /><i><Check /></i></div><h3>{[m['fidelity.onePerson'](),m['fidelity.clearFace'](),m['fidelity.fullBody']()][i]}</h3><p>{[m['fidelity.onePersonBody'](),m['fidelity.clearFaceBody'](),m['fidelity.fullBodyBody']()][i]}</p></article>)}</div></div>
    <aside><h2>{m['dance.limits']()}</h2><p><ScanFace /><span>{m['fidelity.limitFace']()}</span></p><p><SlidersHorizontal /><span>{m['fidelity.limitMotion']()}</span></p></aside></section>; }
export function DanceFAQ() { const questions=[m['fidelity.faqPerson'](),m['fidelity.faqCost'](),m['fidelity.faqMusic'](),m['fidelity.faqFailure']()]; const answers=[m['fidelity.faqPersonBody'](),m['fidelity.faqCostBody'](),m['dance.a2'](),m['fidelity.faqFailureBody']()];return <section className="dt-faq"><h2>{m['fidelity.faq']()}</h2>{questions.map((q,i)=><details key={q}><summary><span>{i+1}. &nbsp;{q}</span><ChevronRight /></summary><p>{answers[i]}</p></details>)}</section>; }
function Related({ stateside = false }: { stateside?: boolean }) { return <section className="dt-related"><h2>{m['fidelity.related']()}</h2><Link href={'/templates/' + (stateside ? 'love-options-dance' : 'stateside-dance')}><img src={art(stateside ? 'love-dance' : 'directory-stateside')} alt={stateside ? 'Love Options' : 'Stateside'} /><div><h3>{stateside ? 'Love Options' : 'Stateside'}</h3><span className="dt-pill">{m['dance.soon']()}</span><p>{stateside ? m['fidelity.loveDescription']() : m['fidelity.stateDescription']()}</p></div><ChevronRight /></Link></section>; }
export function DanceTemplatePage({ slug }: { slug: DanceSlug }) {
  const state = isStateside(slug); const c=copy();
  const [photo, setPhoto] = useState<File | null>(null);
  const availability = useDanceAvailability(slug);
  return <DanceShell page={'dt-detail ' + (state ? 'dt-stateside' : 'dt-love')}><Breadcrumb current={title(slug)} template /><div className="dt-detail-grid">
    <section className="dt-detail-left"><div className="dt-detail-title"><p className="dt-eyebrow">{m['fidelity.danceTemplate']()}</p><h1><span className="mobile-only"><ArrowLeft /></span>{title(slug)} Dance AI</h1><p>{state ? m['fidelity.stateIntro']() : m['fidelity.loveIntro']()}</p>{state ? <span className="dt-pill mobile-only">{c.soon}</span> : null}</div>
      <div className="dt-detail-form"><div className="dt-template-summary"><img className="desktop-only" src={art(state ? 'stateside-dance' : 'love-dance')} alt={title(slug)} /><img className="mobile-only" src={art(state ? 'mobile-state-concept' : 'mobile-love')} alt={title(slug)} /><div><h2 className={state ? "desktop-only" : ""}>{title(slug)} {state ? <span className="dt-pill">{c.soon}</span> : null}</h2>{state ? <h2 className="mobile-only">{m['fidelity.stateConcept']()}</h2> : null}<p className={state ? "desktop-only" : ""}>{state ? m['fidelity.stateDescription']() : m['fidelity.loveDescription']()}</p>{state ? <p className="mobile-only">{m['fidelity.stateConceptBody']()}</p> : null}</div></div>
        <PhotoPicker unavailable={!availability.enabled && state} onPhoto={setPhoto} /><Specs detailed stateside={state} /><p className="dt-output mobile-only"><Film />{c.format}</p>
        {!state ? <div className="dt-info desktop-only"><Info />{m['fidelity.previewNotice']()}</div> : <p className="dt-output desktop-only"><Film />{c.format}</p>}<GenerateButton stateside={state} slug={slug} photo={photo} availability={availability} />
      </div></section>
    <section className="dt-detail-visual desktop-only"><figure className="dt-detail-preview"><figcaption>{state ? m['fidelity.conceptPreview']() : m['dance.preview']()}</figcaption><Still src={state ? 'stateside-dance' : 'love-dance'} label={c.illustration} /><small>{m['fidelity.illustration']()}</small></figure>{!state ? <figure className="dt-detail-original"><figcaption>{m['fidelity.originalExample']()}</figcaption><img src={art('love-original')} alt={m['fidelity.originalExample']()} /></figure> : null}</section>
    </div><div className="desktop-only"><Requirements stateside={state} /></div>
    <div className="dt-mobile-accordions mobile-only"><details><summary>{c.requirements}<ChevronDown /></summary><p>{m['fidelity.photoRequirement']()}</p></details>{state ? <details><summary>{c.expect}<ChevronDown /></summary><p>{m['fidelity.limitFace']()}</p></details> : null}<details className="dt-mobile-faq"><summary>{state ? m['fidelity.faqShort']() : c.faq}<ChevronDown /></summary><DanceFAQ /></details></div>
    <div className="dt-detail-bottom"><Related stateside={state} /><DanceFAQ /></div>
  </DanceShell>;
}
export function DancePricing() { return <DanceShell page="dt-pricing"><Breadcrumb current={m['dance.pricing']()} /><section className="dt-hero"><p className="dt-eyebrow">{m['fidelity.creditPacks']()}</p><h1 className="desktop-only">{m['fidelity.pricingTitle']()}</h1><h1 className="mobile-only">{m['fidelity.creditPacks']()}</h1><p>{m['fidelity.pricingIntro']()}</p></section><div className="dt-info"><Info />{m['fidelity.pricingNotice']()}</div><div className="dt-packs">{[m['fidelity.smallPack'](),m['fidelity.mediumPack'](),m['fidelity.largePack']()].map((pack,i)=><article className={i===1?'featured':''} key={pack}><img src={art(['pack-small','pack-medium','pack-large'][i])} alt="" /><h2><Coins className="dt-pack-icon" aria-hidden="true" />{pack}</h2><strong>$—</strong><p>{m['fidelity.pricePending']()}</p><h3>— {m['fidelity.creditUnit']()}</h3><ul><li><Coins />{m['fidelity.oneTime']()}</li><li><Play />{m['fidelity.useCredits']()}</li><li><Film />{m['fidelity.costBefore']()}</li></ul><button className="dt-primary" disabled>{m['fidelity.launch']()}</button></article>)}</div><div className="dt-pricing-notes"><article><Coins /><div><h3>{m['fidelity.choosePack']()}</h3><p>{m['fidelity.choosePackBody']()}</p></div></article><article><Film /><div><h3>{m['fidelity.costBefore']()}</h3><p>{m['fidelity.faqCostBody']()}</p></div></article><article><Info /><div><h3>{m['fidelity.faqFailure']()}</h3><p>{m['fidelity.faqFailureBody']()}</p></div></article></div><PricingFacts /></DanceShell>; }
type DanceVideoTask = {
  id: string; slug: string | null; status: string;
  credits: number; createdAt: string; fileUrl: string | null;
};
export function DanceVideos() {
  const [filter, setFilter] = useState('all');
  const [tasks, setTasks] = useState<DanceVideoTask[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let live = true;
    async function refresh() {
      try {
        const res = await fetch('/api/dance/tasks', { cache: 'no-store' });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Unable to load videos');
        if (live) { setTasks(data.data || []); setError(''); }
      } catch (err) {
        if (live) setError(err instanceof Error ? err.message : 'Unable to load videos');
      } finally { if (live) setLoading(false); }
    }
    void refresh();
    const interval = setInterval(() => void refresh(), 15000);
    return () => { live = false; clearInterval(interval); };
  }, []);
  const statuses = [['all', 'All'], ['processing', 'Processing'], ['success', 'Completed'], ['failed', 'Failed']];
  const visible = tasks.filter(task => filter === 'all' ||
    (filter === 'processing' ? ['pending', 'processing'].includes(task.status) : task.status === filter));
  return <DanceShell page="dt-videos">
    <Breadcrumb current={m['fidelity.myVideos']()} />
    <section className="dt-videos-heading">
      <div><p className="dt-eyebrow">{m['fidelity.myVideos']()}</p><h1>{m['fidelity.videosTitle']()}</h1>
        <p>Your private generation history. Pending tasks update automatically.</p></div>
      <Link className="dt-primary" href="/"><Plus />{m['fidelity.create']()}</Link>
    </section>
    <div className="dt-filters">{statuses.map(([value, label]) =>
      <button key={value} aria-pressed={filter === value} onClick={() => setFilter(value)}>{label}</button>)}
    </div>
    {loading ? <p role="status">Loading videos…</p> : null}
    {error ? <p role="alert">{error} <Link href="/sign-in">Sign in</Link></p> : null}
    {!loading && !error && visible.length === 0 ? <p>No videos in this category yet.</p> : null}
    <div className="dt-video-cards">{visible.map(task =>
      <article key={task.id}>
        <div className="dt-video-image">
          <span className={'dt-status ' + task.status}>
            {task.status === 'success' ? <Check /> :
              task.status === 'failed' ? <CircleAlert /> : <LoaderCircle />}
            {task.status === 'success' ? 'Completed' : task.status}
          </span>
          {task.fileUrl ? <video controls preload="metadata" playsInline src={task.fileUrl} aria-label="Your generated dance video"/> :
            <div className="dt-task-message"><Film /><h3>{task.status === 'failed' ? 'Generation failed' : 'Generation in progress'}</h3>
              <p>{task.status === 'failed' ? 'Technical failures are refunded automatically.' : 'You can leave this page and return later.'}</p></div>}
        </div>
        <div className="dt-video-copy">
          <h2>{task.slug === 'stateside-dance' ? 'Stateside' : 'Love Options'}</h2>
          <small>9:16 MP4 · No music</small>
          <p>{task.credits} credits</p>
          {task.fileUrl ? <a className="dt-primary" href={task.fileUrl} download="dance.mp4"><Download />Download MP4</a> : null}
        </div>
      </article>)}</div>
    <p className="dt-private"><LockKeyhole />Only you can access your original photos and completed videos.</p>
  </DanceShell>;
}

function PricingFacts() {
  const rows = [
    [m['fidelity.faqCost'](), m['fidelity.faqCostBody']()],
    [m['fidelity.faqFailure'](), m['fidelity.faqFailureBody']()],
    [m['fidelity.faqMusic'](), m['dance.a2']()],
  ];
  return <section className="dt-pricing-facts"><h2>{m['fidelity.goodToKnow']()}</h2><dl>{rows.map(([question,answer]) => <div key={question}><dt>{question}</dt><dd>{answer}</dd></div>)}</dl></section>;
}
