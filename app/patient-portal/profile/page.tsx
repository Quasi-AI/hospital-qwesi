'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useTranslations } from '../../hooks/useTranslations';
import { 
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Edit2,
  Save,
  X,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

interface Patient {
  _id: string;
  patientId: string;
  name: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  gender: string;
  address?: string;
  emergencyContact?: {
    name: string;
    phone: string;
    relationship: string;
  };
}

export default function PatientProfilePage() {
  const { data: session } = useSession();
  const { t } = useTranslations();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  
  const [formData, setFormData] = useState({
    phone: '',
    address: '',
    emergencyContactName: '',
    emergencyContactPhone: '',
    emergencyContactRelationship: ''
  });

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await fetch('/api/patient-portal/medical-records');
        const data = await res.json();
        if (data.patient) {
          setPatient(data.patient);
          setFormData({
            phone: data.patient.phone || '',
            address: data.patient.address || '',
            emergencyContactName: data.patient.emergencyContact?.name || '',
            emergencyContactPhone: data.patient.emergencyContact?.phone || '',
            emergencyContactRelationship: data.patient.emergencyContact?.relationship || ''
          });
        }
      } catch (error) {
        console.error('Error fetching profile:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);

    try {
      const res = await fetch('/api/patient-portal/medical-records', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: formData.phone,
          address: formData.address,
          emergencyContact: {
            name: formData.emergencyContactName,
            phone: formData.emergencyContactPhone,
            relationship: formData.emergencyContactRelationship
          }
        })
      });

      if (res.ok) {
        const data = await res.json();
        setPatient(data.patient);
        setEditing(false);
        setMessage({ type: 'success', text: t('patientPortal.profile.updateSuccess') });
      } else {
        throw new Error('Failed to update');
      }
    } catch (error) {
      setMessage({ type: 'error', text: t('patientPortal.profile.updateError') });
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="flex min-h-[320px] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-b-2 border-teal-600" />
          <p className="mt-2 text-sm text-gray-600">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="rounded-lg border border-gray-100 bg-white py-8 text-center">
        <User className="mx-auto mb-2 h-12 w-12 text-gray-300" />
        <h3 className="text-base font-medium text-gray-900">{t('patientPortal.profile.notFound')}</h3>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">{t('patientPortal.profile.title')}</h1>
          <p className="mt-0.5 text-sm text-gray-600">{t('patientPortal.profile.subtitle')}</p>
        </div>
        {!editing ? (
          <button
            onClick={() => setEditing(true)}
            className="inline-flex items-center gap-1.5 rounded-md bg-teal-600 px-3 py-1.5 text-sm text-white transition-colors hover:bg-teal-700"
          >
            <Edit2 className="h-4 w-4" />
            {t('patientPortal.profile.edit')}
          </button>
        ) : (
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setEditing(false)}
              className="inline-flex items-center gap-1.5 rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-700 transition-colors hover:bg-gray-50"
            >
              <X className="h-4 w-4" />
              {t('common.cancel')}
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-1.5 rounded-md bg-teal-600 px-3 py-1.5 text-sm text-white transition-colors hover:bg-teal-700 disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              {saving ? t('common.saving') : t('common.save')}
            </button>
          </div>
        )}
      </div>

      {/* Message */}
      {message && (
        <div className={`flex items-center gap-2 rounded-md p-2 text-sm ${
          message.type === 'success' 
            ? 'border border-green-200 bg-green-50 text-green-800' 
            : 'border border-red-200 bg-red-50 text-red-800'
        }`}>
          {message.type === 'success' ? (
            <CheckCircle2 className="h-4 w-4 shrink-0 text-green-600" />
          ) : (
            <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
          )}
          {message.text}
        </div>
      )}

      {/* Profile Card */}
      <div className="overflow-hidden rounded-lg border border-gray-100 bg-white shadow-sm">
        {/* Profile Header */}
        <div className="bg-gradient-to-r from-teal-600 to-cyan-600 px-4 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-white/20">
              <span className="text-2xl font-bold text-white">
                {patient.name.charAt(0)}
              </span>
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">{patient.name}</h2>
              <p className="text-sm text-teal-100">{patient.patientId}</p>
            </div>
          </div>
        </div>

        {/* Profile Details */}
        <div className="p-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Email (read-only) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Mail className="h-4 w-4 inline mr-2" />
                {t('patientPortal.profile.email')}
              </label>
              <p className="rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700">
                {patient.email}
              </p>
              <p className="text-xs text-gray-500 mt-1">{t('patientPortal.profile.emailReadonly')}</p>
            </div>

            {/* Phone */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Phone className="h-4 w-4 inline mr-2" />
                {t('patientPortal.profile.phone')}
              </label>
              {editing ? (
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-500"
                />
              ) : (
                <p className="rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700">
                  {patient.phone || '-'}
                </p>
              )}
            </div>

            {/* Date of Birth (read-only) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Calendar className="h-4 w-4 inline mr-2" />
                {t('patientPortal.profile.dateOfBirth')}
              </label>
              <p className="rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700">
                {formatDate(patient.dateOfBirth)}
              </p>
            </div>

            {/* Gender (read-only) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <User className="h-4 w-4 inline mr-2" />
                {t('patientPortal.profile.gender')}
              </label>
              <p className="rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm capitalize text-gray-700">
                {patient.gender}
              </p>
            </div>

            {/* Address */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <MapPin className="h-4 w-4 inline mr-2" />
                {t('patientPortal.profile.address')}
              </label>
              {editing ? (
                <textarea
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  rows={2}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-500"
                />
              ) : (
                <p className="rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700">
                  {patient.address || '-'}
                </p>
              )}
            </div>
          </div>

          {/* Emergency Contact */}
          <div className="mt-5 border-t border-gray-200 pt-4">
            <h3 className="mb-3 flex items-center gap-1.5 text-base font-semibold text-gray-900">
              <AlertCircle className="h-4 w-4 text-red-500" />
              {t('patientPortal.profile.emergencyContact')}
            </h3>
            <div className="grid gap-3 md:grid-cols-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('patientPortal.profile.contactName')}
                </label>
                {editing ? (
                  <input
                    type="text"
                    value={formData.emergencyContactName}
                    onChange={(e) => setFormData({ ...formData, emergencyContactName: e.target.value })}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-500"
                  />
                ) : (
                  <p className="rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700">
                    {patient.emergencyContact?.name || '-'}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('patientPortal.profile.contactPhone')}
                </label>
                {editing ? (
                  <input
                    type="tel"
                    value={formData.emergencyContactPhone}
                    onChange={(e) => setFormData({ ...formData, emergencyContactPhone: e.target.value })}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-500"
                  />
                ) : (
                  <p className="rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700">
                    {patient.emergencyContact?.phone || '-'}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('patientPortal.profile.relationship')}
                </label>
                {editing ? (
                  <input
                    type="text"
                    value={formData.emergencyContactRelationship}
                    onChange={(e) => setFormData({ ...formData, emergencyContactRelationship: e.target.value })}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-500"
                  />
                ) : (
                  <p className="rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700">
                    {patient.emergencyContact?.relationship || '-'}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
