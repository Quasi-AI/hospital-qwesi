'use client';

import { useEffect, useState } from 'react';
import SidebarLayout from '@/app/components/sidebar-layout';
import { Video, Loader2, CheckCircle2, AlertTriangle } from 'lucide-react';

export default function AiDoctorSettingsPage() {
  const [form, setForm] = useState({ enabled: false, avatarUrl: '', doctorName: 'Qwesi AI Doctor', cameraEnabled: true });
  const [backendOk, setBackendOk] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    fetch('/api/ai-doctor/config').then((r) => r.json()).then((c) => {
      setForm({ enabled: Boolean(c.rawEnabled), avatarUrl: c.avatarUrl || '', doctorName: c.doctorName || 'Qwesi AI Doctor', cameraEnabled: c.cameraEnabled !== false });
      setBackendOk(c.backendConfigured !== false);
    }).finally(() => setLoading(false));
  }, []);

  async function save() {
    setSaving(true); setMsg(null);
    const r = await fetch('/api/ai-doctor/config', { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify(form) });
    const j = await r.json().catch(() => ({}));
    setMsg(r.ok ? { ok: true, text: 'Saved.' } : { ok: false, text: j.error || 'Could not save' });
    setSaving(false);
  }

  const input = 'w-full rounded-xl border border-gray-200 bg-white/80 px-3 py-2 text-sm text-black outline-none focus:border-[#6949ED]';
  return (
    <SidebarLayout title="AI Doctor avatar" description="Video consultation settings">
      <div className="mx-auto max-w-2xl p-4 sm:p-6">
        <div className="rounded-3xl border border-white/60 bg-white/70 p-6 shadow-xl backdrop-blur-xl">
          <div className="mb-4 flex items-center gap-2"><Video className="h-5 w-5 text-[#6949ED]" /><h1 className="text-lg font-semibold text-black">My AI Doctor – video avatar</h1></div>
          {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : (
            <div className="space-y-4">
              {!backendOk && <p className="flex items-start gap-2 rounded-xl bg-amber-50 p-3 text-sm text-amber-800"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />Set <code>QWESI_BACKEND_URL</code> and <code>HOSPITAL_DASHBOARD_API_KEY</code> on this app so the doctor can reach the Qwesi AI backend.</p>}
              <label className="flex items-center gap-2 text-sm text-black"><input type="checkbox" className="accent-[#6949ED]" checked={form.enabled} onChange={(e) => setForm({ ...form, enabled: e.target.checked })} /> Video consultation enabled for patients</label>
              <div><div className="mb-1 text-sm font-medium text-black">Doctor name</div><input className={input} value={form.doctorName} onChange={(e) => setForm({ ...form, doctorName: e.target.value })} /></div>
              <div>
                <div className="mb-1 text-sm font-medium text-black">Male doctor avatar (.glb link)</div>
                <input className={input} placeholder="https://…/doctor.glb" value={form.avatarUrl} onChange={(e) => setForm({ ...form, avatarUrl: e.target.value })} />
                <p className="mt-1 text-xs text-gray-500">A full 3D avatar file with face blendshapes (ARKit and Oculus visemes), for example from Avaturn (type 2), MPFB/Blender or Ready Player Me. Upload it anywhere public over https and paste the link. Check the avatar&apos;s licence allows commercial use.</p>
              </div>
              <label className="flex items-center gap-2 text-sm text-black"><input type="checkbox" className="accent-[#6949ED]" checked={form.cameraEnabled} onChange={(e) => setForm({ ...form, cameraEnabled: e.target.checked })} /> Offer the optional camera (patient must tick consent each time)</label>
              <button onClick={save} disabled={saving} className="rounded-xl bg-[#6949ED] px-5 py-2 text-sm font-semibold text-white disabled:opacity-60">{saving ? 'Saving…' : 'Save'}</button>
              {msg && <p className={`flex items-center gap-1 text-sm ${msg.ok ? 'text-[#6949ED]' : 'text-red-600'}`}>{msg.ok && <CheckCircle2 className="h-4 w-4" />}{msg.text}</p>}
            </div>
          )}
        </div>
      </div>
    </SidebarLayout>
  );
}
