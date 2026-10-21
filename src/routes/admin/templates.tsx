import { useEffect, useState, type FormEvent } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';

type Template = {
  slug: string; name: string; model: string | null;
  referenceUrl: string | null; credits: number | null;
  prompt: string; enabled: boolean;
};
function DanceTemplateAdmin() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selected, setSelected] = useState<string>('love-options-dance');
  const [form, setForm] = useState<Template | null>(null);
  const [publish, setPublish] = useState(false);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    fetch('/api/admin/dance/templates', { cache: 'no-store' }).then(r => r.json()).then(json => {
      if (!Array.isArray(json.data)) throw new Error(json.error || 'Unable to load templates');
      setTemplates(json.data);
      setForm(json.data[0] || null);
    }).catch(e => setMessage(e instanceof Error ? e.message : 'Unable to load templates'));
  }, []);
  function choose(slug: string) {
    setSelected(slug);
    setForm(templates.find(t => t.slug === slug) || null);
    setPublish(false);
    setMessage('');
  }
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!form || busy) return;
    setBusy(true); setMessage('');
    try {
      const res = await fetch('/api/admin/dance/templates', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, enabled: publish }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Could not save template');
      setTemplates(previous => previous.map(t => t.slug === form.slug ? json.data : t));
      setForm(json.data);
      setPublish(false);
      setMessage(json.data.enabled ? 'Published and ready for generation.' :
        'Saved. Generation remains unavailable until all model and infrastructure gates are satisfied.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to save template');
    } finally { setBusy(false); }
  }
  const update = (changes: Partial<Template>) => setForm(current => current ? { ...current, ...changes } : current);
  return <section className="max-w-3xl space-y-6 p-6">
    <header><h1 className="text-2xl font-semibold">Dance template configuration</h1>
      <p className="text-muted-foreground">Configure verified models and licensed reference action videos. Publishing requires production safety gates.</p></header>
    <div className="flex gap-2">{templates.map(t =>
      <Button variant={selected === t.slug ? 'default' : 'outline'} onClick={() => choose(t.slug)} key={t.slug}>{t.name}</Button>)}</div>
    {form ? <form className="space-y-4" onSubmit={submit}>
      <label className="block text-sm font-medium">Replicate model (owner/name)
        <input required value={form.model || ''} onChange={e => update({ model: e.target.value })} className="mt-2 w-full rounded-md border p-2" /></label>
      <label className="block text-sm font-medium">Licensed HTTPS reference action URL
        <input required type="url" value={form.referenceUrl || ''} onChange={e => update({ referenceUrl: e.target.value })} className="mt-2 w-full rounded-md border p-2" /></label>
      <label className="block text-sm font-medium">Credits per generation
        <input required type="number" min={1} step={1} value={form.credits || ''} onChange={e => update({ credits: Number(e.target.value) })} className="mt-2 w-full rounded-md border p-2" /></label>
      <label className="block text-sm font-medium">Fixed model prompt
        <textarea required rows={4} value={form.prompt} onChange={e => update({ prompt: e.target.value })} className="mt-2 w-full rounded-md border p-2" /></label>
      <p>Current runtime status: <strong>{form.enabled ? 'Available' : 'Not available'}</strong></p>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={publish} onChange={e => setPublish(e.target.checked)} />
        Publish this template — I confirm the reference rights, real output quality and per-video cost have been checked.
      </label>
      <Button type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save template'}</Button>
    </form> : <p>Loading templates…</p>}
    {message ? <p role="status">{message}</p> : null}
  </section>;
}
export const Route = createFileRoute('/admin/templates')({ component: DanceTemplateAdmin });
