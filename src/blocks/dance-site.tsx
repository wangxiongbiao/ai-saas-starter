import { useEffect, useId, useState, type ReactNode } from 'react';
import { envConfigs } from '@/config';
import { Link } from '@/core/i18n/navigation';
import { m } from '@/paraglide/messages.js';
import '@/styles/dance.css';

export type DanceSlug = 'love-options-dance' | 'stateside-dance';
const slugs: DanceSlug[] = ['love-options-dance', 'stateside-dance'];
function name(slug: DanceSlug) { return slug === 'love-options-dance' ? m['dance.love']() : m['dance.stateside'](); }
function description(slug: DanceSlug) { return slug === 'love-options-dance' ? m['dance.loveDesc']() : m['dance.statesideDesc'](); }

export function DanceShell({ children }: { children: ReactNode }) {
  return <div className="dance-site">
    <a className="dance-skip" href="#dance-main">{m['dance.skip']()}</a>
    <header className="dance-header"><Link href="/" className="dance-brand">{envConfigs.app_name}</Link>
      <nav aria-label={m['dance.templates']()}><Link href="/templates">{m['dance.templates']()}</Link><Link href="/#how-it-works">{m['dance.how']()}</Link><Link href="/pricing">{m['dance.pricing']()}</Link><Link href="/sign-in">{m['dance.signin']()}</Link></nav>
    </header>
    <main id="dance-main">{children}</main>
    <footer className="dance-footer"><span>{m['dance.footer']()}</span><div><Link href="/privacy-policy">{m['dance.privacy']()}</Link><Link href="/terms-of-service">{m['dance.terms']()}</Link></div></footer>
  </div>;
}

function DancePreview({ slug }: { slug: DanceSlug }) {
  return <div className="dance-preview" aria-label={m['dance.preview']()}>
    <span className="dance-label">{m['dance.preview']()}</span>
    <div className="dance-preview-frame"><span className="dance-mark" aria-hidden="true">↗</span><strong>{name(slug)}</strong><p>{m['dance.pending']()}</p><span className="dance-pill">{m['dance.soon']()}</span></div>
    <p className="dance-caption">{m['dance.output']()}</p>
  </div>;
}

function PhotoPicker() {
  const id = useId();
  const [file, setFile] = useState<File | null>(null);
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');
  useEffect(() => {
    if (!file) { setUrl(''); return; }
    const next = URL.createObjectURL(file);
    setUrl(next);
    return () => URL.revokeObjectURL(next);
  }, [file]);
  return <div className="dance-photo">
    <label htmlFor={id} className="dance-label">{m['dance.photo']()}</label>
    <div className="dance-upload">
      {url ? <img src={url} alt={m['dance.photoAlt']()} onError={() => { setFile(null); setError(m['dance.broken']()); }} /> : <span className="dance-upload-symbol" aria-hidden="true">+</span>}
      <label htmlFor={id} className="dance-file-label">{m['dance.upload']()}</label>
      <input id={id} type="file" accept="image/jpeg,image/png,image/webp" aria-describedby={id + '-help'} onChange={(event) => {
        const chosen = event.currentTarget.files?.[0];
        event.currentTarget.value = '';
        if (!chosen) return;
        if (!['image/jpeg', 'image/png', 'image/webp'].includes(chosen.type)) { setError(m['dance.invalid']()); return; }
        setError(''); setFile(chosen);
      }} />
      <p>{m['dance.formats']()}</p>
    </div>
    {file ? <button type="button" className="dance-text-button" onClick={() => { setFile(null); setError(''); }}>{m['dance.remove']()}</button> : null}
    <p id={id + '-help'} className="dance-caption">{m['dance.local']()}</p>
    {error ? <p role="alert">{error}</p> : null}
    {file && !error ? <p role="status" className="dance-caption">{m['dance.ready']()}</p> : null}
  </div>;
}

export function DanceGenerator({ initial = 'love-options-dance', locked = false }: { initial?: DanceSlug; locked?: boolean }) {
  const [slug, setSlug] = useState<DanceSlug>(initial);
  return <section className="dance-generator">
    <DancePreview slug={slug} />
    <div className="dance-controls"><fieldset><legend className="dance-label">{m['dance.choose']()}</legend>
      <div className="dance-options">{(locked ? [initial] : slugs).map(item => <button type="button" key={item} aria-pressed={slug === item} onClick={() => setSlug(item)} className={slug === item ? 'selected' : ''}><strong>{name(item)}</strong><span>{m['dance.soon']()}</span></button>)}</div>
    </fieldset><PhotoPicker /><div className="dance-output"><p>{m['dance.output']()}</p><p className="dance-caption">{m['dance.cost']()}</p></div>
    <button className="dance-primary" type="button" disabled>{m['dance.generate']()}</button></div>
  </section>;
}

export function DanceCollection() {
  return <section className="dance-section"><div className="dance-section-heading"><h2>{m['dance.related']()}</h2><span className="dance-pill">{m['dance.status']()}</span></div>
    <div className="dance-cards">{slugs.map(slug => <article className="dance-card" key={slug}><div className="dance-card-art" aria-hidden="true">{slug === 'love-options-dance' ? '01' : '02'}</div><span className="dance-pill">{m['dance.soon']()}</span><h3>{name(slug)}</h3><p>{description(slug)}</p><Link href={'/templates/' + slug}>{m['dance.details']()} ↗</Link></article>)}</div>
  </section>;
}

export function DanceFAQ() {
  return <section className="dance-section dance-faq"><h2>{m['dance.faq']()}</h2>
    <details><summary>{m['dance.q1']()}</summary><p>{m['dance.a1']()}</p></details>
    <details><summary>{m['dance.q2']()}</summary><p>{m['dance.a2']()}</p></details>
    <details><summary>{m['dance.q3']()}</summary><p>{m['dance.a3']()}</p></details>
  </section>;
}

export function DanceHome() {
  return <DanceShell><section className="dance-hero"><p className="dance-label">{m['dance.eyebrow']()}</p><h1>{m['dance.title']()}</h1><p>{m['dance.intro']()}</p></section><DanceGenerator /><DanceCollection />
    <section id="how-it-works" className="dance-section"><h2>{m['dance.how']()}</h2><div className="dance-steps">
      <article><span>01</span><h3>{m['dance.step1']()}</h3><p>{m['dance.step1Body']()}</p></article>
      <article><span>02</span><h3>{m['dance.step2']()}</h3><p>{m['dance.step2Body']()}</p></article>
      <article><span>03</span><h3>{m['dance.step3']()}</h3><p>{m['dance.step3Body']()}</p></article>
    </div></section><DanceFAQ /></DanceShell>;
}

export function DanceDirectory() {
  return <DanceShell><section className="dance-hero"><p className="dance-label">{m['dance.templates']()}</p><h1>{m['dance.browse']()}</h1><p>{m['dance.browseIntro']()}</p></section><DanceCollection /></DanceShell>;
}

export function DanceTemplatePage({ slug }: { slug: DanceSlug }) {
  return <DanceShell><nav className="dance-breadcrumb" aria-label={m['dance.templates']()}><Link href="/">{m['dance.home']()}</Link><span>/</span><Link href="/templates">{m['dance.templates']()}</Link><span>/</span><span aria-current="page">{name(slug)}</span></nav>
    <section className="dance-hero"><span className="dance-pill">{m['dance.soon']()}</span><h1>{name(slug)}</h1><p>{description(slug)}</p></section><DanceGenerator key={slug} initial={slug} locked />
    <section className="dance-section dance-notes"><article><h2>{m['dance.requirements']()}</h2><p>{m['dance.requirementsBody']()}</p></article><article><h2>{m['dance.limits']()}</h2><p>{m['dance.limitsBody']()}</p></article></section><DanceFAQ /><DanceCollection /></DanceShell>;
}

export function DancePricing() {
  return <DanceShell><section className="dance-hero"><p className="dance-label">{m['dance.pricing']()}</p><h1>{m['dance.pricingTitle']()}</h1><p>{m['dance.pricingIntro']()}</p></section>
    <section className="dance-section"><span className="dance-pill">{m['dance.soon']()}</span><p>{m['dance.pricingNote']()}</p><p>{m['dance.pricingPolicy']()}</p><Link href="/templates">{m['dance.templates']()} ↗</Link></section><DanceFAQ /></DanceShell>;
}
