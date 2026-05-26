'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from '../../hooks/useTranslations';
import { 
  ClipboardList,
  Heart,
  Droplets,
  AlertCircle,
  Pill,
  UserCircle
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
  medicalHistory: string[];
  allergies: string[];
  currentMedications: string[];
  bloodType?: string;
  assignedDoctor?: string;
}

export default function PatientMedicalRecordsPage() {
  const { t } = useTranslations();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMedicalRecords = async () => {
      try {
        const res = await fetch('/api/patient-portal/medical-records');
        const data = await res.json();
        setPatient(data.patient);
      } catch (error) {
        console.error('Error fetching medical records:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchMedicalRecords();
  }, []);

  const calculateAge = (dateOfBirth: string) => {
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
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
        <ClipboardList className="mx-auto mb-2 h-12 w-12 text-gray-300" />
        <h3 className="text-base font-medium text-gray-900">{t('patientPortal.medicalRecords.notFound')}</h3>
        <p className="mt-0.5 text-sm text-gray-500">{t('patientPortal.medicalRecords.notFoundDesc')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-gray-900">{t('patientPortal.medicalRecords.title')}</h1>
        <p className="mt-0.5 text-sm text-gray-600">{t('patientPortal.medicalRecords.subtitle')}</p>
      </div>

      {/* Patient Info Card */}
      <div className="rounded-xl bg-gradient-to-r from-teal-600 to-cyan-600 p-4 text-white">
        <div className="flex items-center gap-3">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-white/20">
            <UserCircle className="h-9 w-9 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold">{patient.name}</h2>
            <p className="text-sm text-teal-100">{patient.patientId}</p>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-teal-100 sm:text-sm">
              <span>{calculateAge(patient.dateOfBirth)} {t('patientPortal.medicalRecords.yearsOld')}</span>
              <span>•</span>
              <span className="capitalize">{patient.gender}</span>
              {patient.bloodType && (
                <>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Droplets className="h-4 w-4" />
                    {patient.bloodType}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        {/* Medical History */}
        <div className="overflow-hidden rounded-lg border border-gray-100 bg-white shadow-sm">
          <div className="flex items-center gap-1.5 border-b border-gray-100 px-4 py-2.5">
            <Heart className="h-4 w-4 text-red-500" />
            <h3 className="text-sm font-semibold text-gray-900 sm:text-base">{t('patientPortal.medicalRecords.medicalHistory')}</h3>
          </div>
          <div className="p-3 sm:p-4">
            {patient.medicalHistory && patient.medicalHistory.length > 0 ? (
              <ul className="space-y-1.5">
                {patient.medicalHistory.map((item, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-teal-500" />
                    <span className="text-gray-700">{item}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="py-3 text-center text-sm text-gray-500">{t('patientPortal.medicalRecords.noMedicalHistory')}</p>
            )}
          </div>
        </div>

        {/* Allergies */}
        <div className="overflow-hidden rounded-lg border border-gray-100 bg-white shadow-sm">
          <div className="flex items-center gap-1.5 border-b border-gray-100 px-4 py-2.5">
            <AlertCircle className="h-4 w-4 text-orange-500" />
            <h3 className="text-sm font-semibold text-gray-900 sm:text-base">{t('patientPortal.medicalRecords.allergies')}</h3>
          </div>
          <div className="p-3 sm:p-4">
            {patient.allergies && patient.allergies.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {patient.allergies.map((allergy, index) => (
                  <span 
                    key={index} 
                    className="rounded-full border border-orange-200 bg-orange-50 px-2.5 py-0.5 text-xs text-orange-700 sm:text-sm"
                  >
                    {allergy}
                  </span>
                ))}
              </div>
            ) : (
              <p className="py-3 text-center text-sm text-gray-500">{t('patientPortal.medicalRecords.noAllergies')}</p>
            )}
          </div>
        </div>

        {/* Current Medications */}
        <div className="overflow-hidden rounded-lg border border-gray-100 bg-white shadow-sm lg:col-span-2">
          <div className="flex items-center gap-1.5 border-b border-gray-100 px-4 py-2.5">
            <Pill className="h-4 w-4 text-green-500" />
            <h3 className="text-sm font-semibold text-gray-900 sm:text-base">{t('patientPortal.medicalRecords.currentMedications')}</h3>
          </div>
          <div className="p-3 sm:p-4">
            {patient.currentMedications && patient.currentMedications.length > 0 ? (
              <ul className="space-y-1.5">
                {patient.currentMedications.map((medication, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-green-500" />
                    <span className="text-gray-700">{medication}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="py-3 text-center text-sm text-gray-500">{t('patientPortal.medicalRecords.noMedications')}</p>
            )}
          </div>
        </div>
      </div>

      {/* Emergency Contact */}
      {patient.emergencyContact && patient.emergencyContact.name && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 sm:p-4">
          <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-red-800 sm:text-base">
            <AlertCircle className="h-4 w-4" />
            {t('patientPortal.medicalRecords.emergencyContact')}
          </h3>
          <div className="grid gap-2 sm:grid-cols-3 sm:gap-3">
            <div>
              <p className="text-sm text-red-600">{t('patientPortal.medicalRecords.contactName')}</p>
              <p className="font-medium text-red-900">{patient.emergencyContact.name}</p>
            </div>
            <div>
              <p className="text-sm text-red-600">{t('patientPortal.medicalRecords.contactPhone')}</p>
              <p className="font-medium text-red-900">{patient.emergencyContact.phone}</p>
            </div>
            <div>
              <p className="text-sm text-red-600">{t('patientPortal.medicalRecords.relationship')}</p>
              <p className="font-medium text-red-900">{patient.emergencyContact.relationship}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
