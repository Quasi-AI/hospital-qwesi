'use client';

import { useEffect, useState } from 'react';
import { Plus, Trash2, Users, X } from 'lucide-react';

type FamilyMember = {
  _id: string;
  name: string;
  relationship: string;
  dateOfBirth?: string;
  phone?: string;
  email?: string;
  accessStatus?: string;
  notes?: string;
};

const initialForm = {
  name: '',
  relationship: '',
  dateOfBirth: '',
  phone: '',
  email: '',
  notes: '',
};

export default function PatientFamilyPage() {
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [form, setForm] = useState(initialForm);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const loadMembers = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/patient-portal/family', { cache: 'no-store' });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Failed to load family members');
      setMembers(data.members || []);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Failed to load family members');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMembers();
  }, []);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setMessage('');
    try {
      const response = await fetch('/api/patient-portal/family', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Failed to add family member');
      setMembers((current) => [data.member, ...current]);
      setForm(initialForm);
      setShowForm(false);
      setMessage('Family member added.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Failed to add family member');
    } finally {
      setSaving(false);
    }
  };

  const removeMember = async (member: FamilyMember) => {
    if (!confirm(`Remove ${member.name} from family members?`)) return;
    try {
      const response = await fetch(`/api/patient-portal/family?id=${encodeURIComponent(member._id)}`, {
        method: 'DELETE',
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Failed to remove family member');
      setMembers((current) => current.filter((item) => item._id !== member._id));
      setMessage('Family member removed.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Failed to remove family member');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-950">Family Members</h1>
          <p className="mt-1 text-sm text-slate-600">Linked dependents and family care access.</p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm((value) => !value)}
          className="inline-flex h-9 items-center justify-center gap-2 rounded-md bg-emerald-600 px-3 text-sm font-medium text-white hover:bg-emerald-700"
        >
          {showForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          {showForm ? 'Close' : 'Add member'}
        </button>
      </div>

      {message ? (
        <div className="rounded-md border border-emerald-100 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {message}
        </div>
      ) : null}

      {showForm ? (
        <form onSubmit={handleSubmit} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="grid gap-3 md:grid-cols-2">
            <label className="text-sm font-medium text-slate-700">
              Full name
              <input
                required
                value={form.name}
                onChange={(event) => setForm({ ...form, name: event.target.value })}
                className="mt-1 h-9 w-full rounded-md border border-slate-200 px-3 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </label>
            <label className="text-sm font-medium text-slate-700">
              Relationship
              <input
                required
                value={form.relationship}
                onChange={(event) => setForm({ ...form, relationship: event.target.value })}
                placeholder="Parent, child, spouse..."
                className="mt-1 h-9 w-full rounded-md border border-slate-200 px-3 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </label>
            <label className="text-sm font-medium text-slate-700">
              Date of birth
              <input
                type="date"
                value={form.dateOfBirth}
                onChange={(event) => setForm({ ...form, dateOfBirth: event.target.value })}
                className="mt-1 h-9 w-full rounded-md border border-slate-200 px-3 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </label>
            <label className="text-sm font-medium text-slate-700">
              Phone
              <input
                value={form.phone}
                onChange={(event) => setForm({ ...form, phone: event.target.value })}
                className="mt-1 h-9 w-full rounded-md border border-slate-200 px-3 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </label>
            <label className="text-sm font-medium text-slate-700 md:col-span-2">
              Email
              <input
                type="email"
                value={form.email}
                onChange={(event) => setForm({ ...form, email: event.target.value })}
                className="mt-1 h-9 w-full rounded-md border border-slate-200 px-3 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </label>
            <label className="text-sm font-medium text-slate-700 md:col-span-2">
              Notes
              <textarea
                value={form.notes}
                onChange={(event) => setForm({ ...form, notes: event.target.value })}
                rows={3}
                className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </label>
          </div>
          <div className="mt-4 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex h-9 items-center justify-center rounded-md bg-emerald-600 px-4 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save family member'}
            </button>
          </div>
        </form>
      ) : null}

      {loading ? (
        <div className="flex min-h-40 items-center justify-center rounded-lg border border-slate-200 bg-white">
          <div className="h-7 w-7 animate-spin rounded-full border-b-2 border-emerald-600" />
        </div>
      ) : members.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-200 bg-white p-8 text-center">
          <Users className="mx-auto h-8 w-8 text-gray-300" />
          <h2 className="mt-3 text-sm font-semibold text-slate-950">No family members linked</h2>
          <p className="mt-1 text-sm text-slate-500">Add a family member to keep dependent access and care coordination in one place.</p>
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {members.map((member) => (
            <article key={member._id} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="truncate text-base font-semibold text-slate-950">{member.name}</h2>
                  <p className="mt-1 text-sm text-emerald-700">{member.relationship}</p>
                </div>
                <button
                  type="button"
                  onClick={() => removeMember(member)}
                  className="rounded-md p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                  title="Remove family member"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <div className="mt-3 space-y-1 text-sm text-slate-600">
                {member.dateOfBirth ? <p>Born {new Date(member.dateOfBirth).toLocaleDateString()}</p> : null}
                {member.phone ? <p>{member.phone}</p> : null}
                {member.email ? <p className="break-all">{member.email}</p> : null}
                {member.notes ? <p className="text-slate-500">{member.notes}</p> : null}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
