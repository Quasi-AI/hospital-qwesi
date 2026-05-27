'use client';

import { useState } from 'react';
import Link from 'next/link';
import { 
  Users, 
  ArrowLeft, 
  Save, 
  Plus,
  Phone,
  Mail,
  MapPin,
  Calendar,
  FileText,
  Lock
} from 'lucide-react';
import ProtectedRoute from '../../protected-route';
import SidebarLayout from '../../components/sidebar-layout';
import { useTranslations } from '../../hooks/useTranslations';

export default function NewPatientPage() {
  const { t } = useTranslations();
  const [formData, setFormData] = useState({
    // Personal Information
    firstName: '',
    lastName: '',
    dateOfBirth: '',
    gender: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    
    // User Login Information
    email: '',
    password: '',
    
    // Medical Information
    bloodType: '',
    allergies: '',
    medications: '',
    medicalHistory: '',
    familyHistory: '',
    
    // Emergency Contact
    emergencyName: '',
    emergencyPhone: '',
    emergencyRelationship: ''
  });

  const [activeSection, setActiveSection] = useState('personal');

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    // Validate required fields: name, email, birthdate, phone, and gender
    if (!formData.firstName || !formData.lastName || !formData.email || !formData.dateOfBirth || !formData.phone || !formData.gender) {
      alert(t('patients.newPatient.validation.requiredFields'));
      setIsSubmitting(false);
      return;
    }
    
    // If password is provided, validate it
    if (formData.password && formData.password.length < 6) {
      alert('Password must be at least 6 characters long');
      setIsSubmitting(false);
      return;
    }
    
    try {
      // Prepare the data for the API
      const addressParts = [formData.address, formData.city, formData.state, formData.zipCode].filter(Boolean);
      const addressString = addressParts.length > 0 ? addressParts.join(', ') : undefined;
      
      const patientData: any = {
        name: `${formData.firstName} ${formData.lastName}`,
        email: formData.email,
        phone: formData.phone,
        dateOfBirth: formData.dateOfBirth, // Send as ISO string, API will convert to Date
        gender: formData.gender,
        medicalHistory: formData.medicalHistory ? [formData.medicalHistory] : [],
        allergies: formData.allergies ? [formData.allergies] : [],
        currentMedications: formData.medications ? [formData.medications] : [],
      };
      
      // Add password if provided (for patient login)
      if (formData.password) {
        patientData.password = formData.password;
      }
      if (addressString) {
        patientData.address = addressString;
      }
      if (formData.emergencyName || formData.emergencyPhone || formData.emergencyRelationship) {
        patientData.emergencyContact = {};
        if (formData.emergencyName) {
          patientData.emergencyContact.name = formData.emergencyName;
        }
        if (formData.emergencyPhone) {
          patientData.emergencyContact.phone = formData.emergencyPhone;
        }
        if (formData.emergencyRelationship) {
          patientData.emergencyContact.relationship = formData.emergencyRelationship;
        }
      }
      if (formData.bloodType && formData.bloodType !== '' && formData.bloodType !== 'none') {
        patientData.bloodType = formData.bloodType;
      }

      // Debug: Log the data being sent
      console.log('Form data being sent:', patientData);
      console.log('Emergency contact data:', patientData.emergencyContact);

      const response = await fetch('/api/patients', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(patientData),
      });

      if (response.ok) {
        alert(t('patients.newPatient.success.patientAdded'));
        // Reset form
        setFormData({
          firstName: '',
          lastName: '',
          dateOfBirth: '',
          gender: '',
          phone: '',
          address: '',
          city: '',
          state: '',
          zipCode: '',
          email: '',
          password: '',
          bloodType: '',
          allergies: '',
          medications: '',
          medicalHistory: '',
          familyHistory: '',
          emergencyName: '',
          emergencyPhone: '',
          emergencyRelationship: ''
        });
        setActiveSection('personal');
        // Redirect to patients list
        window.location.href = '/patients';
      } else {
        // Try to parse error response
        let errorMessage = 'Failed to create patient';
        try {
          const errorText = await response.text();
          if (errorText) {
            const errorData = JSON.parse(errorText);
            errorMessage = errorData.details || errorData.error || errorMessage;
          } else {
            errorMessage = `Server error: ${response.status} ${response.statusText}`;
          }
        } catch (parseError) {
          errorMessage = `Server error: ${response.status} ${response.statusText}`;
        }
        console.error('Error response status:', response.status, 'Message:', errorMessage);
        alert(`Error: ${errorMessage}`);
      }
    } catch (error) {
      console.error('Error adding patient:', error);
      alert(t('patients.newPatient.errors.genericError'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const sections = [
    { id: 'personal', label: t('patients.newPatient.sections.personal'), icon: Users },
    { id: 'login', label: t('patients.newPatient.sections.login'), icon: Lock },
    { id: 'medical', label: t('patients.newPatient.sections.medical'), icon: FileText },
    { id: 'emergency', label: t('patients.newPatient.sections.emergency'), icon: Phone }
  ];

  return (
    <ProtectedRoute>
      <SidebarLayout
        title={t('patients.newPatient.title')}
        description={t('patients.newPatient.description')}
        dense
      >
        {/* Header */}
        <div className="mb-2 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link
              href="/patients"
              className="inline-flex items-center gap-1.5 text-sm text-gray-600 transition-colors hover:text-gray-900"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>{t('patients.newPatient.backToPatients')}</span>
            </Link>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3">
          {/* Section Navigation */}
          <div className="rounded-lg border border-gray-100 bg-white p-2.5 shadow-sm">
            <div className="flex flex-wrap gap-1.5">
              {sections.map((section) => (
                <button
                  key={section.id}
                  type="button"
                  onClick={() => setActiveSection(section.id)}
                  className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors sm:text-sm ${
                    activeSection === section.id
                      ? 'border border-blue-200 bg-blue-100 text-blue-700'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  <section.icon className="h-4 w-4" />
                  <span>{section.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Personal Information Section */}
          {activeSection === 'personal' && (
            <div className="rounded-lg border border-gray-100 bg-white p-3 shadow-sm">
              <h3 className="mb-2 flex items-center text-sm font-semibold text-gray-900">
                <Users className="mr-2 h-4 w-4 text-blue-600" />
                {t('patients.newPatient.sections.personal')}
              </h3>
              <div className="grid grid-cols-1 gap-2 md:grid-cols-2 md:gap-3">
                <div>
                  <label htmlFor="firstName" className="mb-1 block text-xs font-medium text-gray-700 sm:text-sm">
                    {t('patients.newPatient.fields.firstName')} *
                  </label>
                  <input
                    type="text"
                    id="firstName"
                    name="firstName"
                    required
                    value={formData.firstName}
                    onChange={handleInputChange}
                    className="w-full rounded-md border border-gray-300 px-2.5 py-1 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label htmlFor="lastName" className="mb-1 block text-xs font-medium text-gray-700 sm:text-sm">
                    {t('patients.newPatient.fields.lastName')} *
                  </label>
                  <input
                    type="text"
                    id="lastName"
                    name="lastName"
                    required
                    value={formData.lastName}
                    onChange={handleInputChange}
                    className="w-full rounded-md border border-gray-300 px-2.5 py-1 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label htmlFor="dateOfBirth" className="mb-1 block text-xs font-medium text-gray-700 sm:text-sm">
                    {t('patients.newPatient.fields.dateOfBirth')} *
                  </label>
                  <input
                    type="date"
                    id="dateOfBirth"
                    name="dateOfBirth"
                    required
                    value={formData.dateOfBirth}
                    onChange={handleInputChange}
                    className="w-full rounded-md border border-gray-300 px-2.5 py-1 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label htmlFor="gender" className="mb-1 block text-xs font-medium text-gray-700 sm:text-sm">
                    {t('patients.newPatient.fields.gender')} *
                  </label>
                  <select
                    id="gender"
                    name="gender"
                    required
                    value={formData.gender}
                    onChange={handleInputChange}
                    className="w-full rounded-md border border-gray-300 px-2.5 py-1 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">{t('patients.newPatient.fields.genderOptions.select')}</option>
                    <option value="male">{t('patients.newPatient.fields.genderOptions.male')}</option>
                    <option value="female">{t('patients.newPatient.fields.genderOptions.female')}</option>
                    <option value="other">{t('patients.newPatient.fields.genderOptions.other')}</option>
                    <option value="prefer-not-to-say">{t('patients.newPatient.fields.genderOptions.preferNotToSay')}</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="phone" className="mb-1 block text-xs font-medium text-gray-700 sm:text-sm">
                    {t('patients.newPatient.fields.phone')} *
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <input
                      type="tel"
                      id="phone"
                      name="phone"
                      required
                      value={formData.phone}
                      onChange={handleInputChange}
                      className="w-full rounded-md border border-gray-300 py-1.5 pl-9 pr-2.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                <div className="md:col-span-2">
                  <label htmlFor="address" className="mb-1 block text-xs font-medium text-gray-700 sm:text-sm">
                    {t('patients.newPatient.fields.address')}
                  </label>
                  <div className="relative">
                    <MapPin className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      id="address"
                      name="address"
                      value={formData.address}
                      onChange={handleInputChange}
                      className="w-full rounded-md border border-gray-300 py-1.5 pl-9 pr-2.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="city" className="mb-1 block text-xs font-medium text-gray-700 sm:text-sm">
                    {t('patients.newPatient.fields.city')}
                  </label>
                  <input
                    type="text"
                    id="city"
                    name="city"
                    value={formData.city}
                    onChange={handleInputChange}
                    className="w-full rounded-md border border-gray-300 px-2.5 py-1 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label htmlFor="state" className="mb-1 block text-xs font-medium text-gray-700 sm:text-sm">
                    {t('patients.newPatient.fields.state')}
                  </label>
                  <input
                    type="text"
                    id="state"
                    name="state"
                    value={formData.state}
                    onChange={handleInputChange}
                    className="w-full rounded-md border border-gray-300 px-2.5 py-1 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label htmlFor="zipCode" className="mb-1 block text-xs font-medium text-gray-700 sm:text-sm">
                    {t('patients.newPatient.fields.zipCode')}
                  </label>
                  <input
                    type="text"
                    id="zipCode"
                    name="zipCode"
                    value={formData.zipCode}
                    onChange={handleInputChange}
                    className="w-full rounded-md border border-gray-300 px-2.5 py-1 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* User Login Information Section */}
          {activeSection === 'login' && (
            <div className="rounded-lg border border-gray-100 bg-white p-3 shadow-sm">
              <h3 className="mb-2 flex items-center text-sm font-semibold text-gray-900">
                <Lock className="mr-2 h-4 w-4 text-purple-600" />
                {t('patients.newPatient.sections.login')}
              </h3>
              <div className="space-y-2">
                <div className="mb-3 rounded-md border border-blue-200 bg-blue-50 p-2">
                  <p className="text-xs text-blue-800">
                    <strong>Note:</strong> Adding login credentials will create a user account for this patient, allowing them to access the patient portal.
                  </p>
                </div>
                <div>
                  <label htmlFor="email" className="mb-1 block text-xs font-medium text-gray-700 sm:text-sm">
                    {t('patients.newPatient.fields.email')} *
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <input
                      type="email"
                      id="email"
                      name="email"
                      required
                      value={formData.email}
                      onChange={handleInputChange}
                      placeholder="patient@example.com"
                      className="w-full rounded-md border border-gray-300 py-1.5 pl-9 pr-2.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <p className="mt-1 text-xs text-gray-500">This email will receive the patient portal login details.</p>
                </div>
                <div>
                  <label htmlFor="password" className="mb-1 block text-xs font-medium text-gray-700 sm:text-sm">
                    Temporary password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <input
                      type="password"
                      id="password"
                      name="password"
                      value={formData.password}
                      onChange={handleInputChange}
                      placeholder="Leave blank to generate and email one"
                      minLength={6}
                      className="w-full rounded-md border border-gray-300 py-1.5 pl-9 pr-2.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    {formData.password
                      ? 'Password must be at least 6 characters. The patient will receive it by email.'
                      : 'A temporary password will be generated and emailed to the patient.'
                    }
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Medical Information Section */}
          {activeSection === 'medical' && (
            <div className="rounded-lg border border-gray-100 bg-white p-3 shadow-sm">
              <h3 className="mb-2 flex items-center text-sm font-semibold text-gray-900">
                <FileText className="mr-2 h-4 w-4 text-green-600" />
                {t('patients.newPatient.sections.medical')}
              </h3>
              <div className="grid grid-cols-1 gap-2 md:grid-cols-2 md:gap-3">
                <div>
                  <label htmlFor="bloodType" className="mb-1 block text-xs font-medium text-gray-700 sm:text-sm">
                    {t('patients.newPatient.fields.bloodType')}
                  </label>
                  <select
                    id="bloodType"
                    name="bloodType"
                    value={formData.bloodType}
                    onChange={handleInputChange}
                    className="w-full rounded-md border border-gray-300 px-2.5 py-1 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">{t('patients.newPatient.fields.bloodTypeOptions.select')}</option>
                    <option value="A+">{t('patients.newPatient.fields.bloodTypeOptions.A+')}</option>
                    <option value="A-">{t('patients.newPatient.fields.bloodTypeOptions.A-')}</option>
                    <option value="B+">{t('patients.newPatient.fields.bloodTypeOptions.B+')}</option>
                    <option value="B-">{t('patients.newPatient.fields.bloodTypeOptions.B-')}</option>
                    <option value="AB+">{t('patients.newPatient.fields.bloodTypeOptions.AB+')}</option>
                    <option value="AB-">{t('patients.newPatient.fields.bloodTypeOptions.AB-')}</option>
                    <option value="O+">{t('patients.newPatient.fields.bloodTypeOptions.O+')}</option>
                    <option value="O-">{t('patients.newPatient.fields.bloodTypeOptions.O-')}</option>
                    <option value="none">{t('patients.newPatient.fields.bloodTypeOptions.none')}</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="allergies" className="mb-1 block text-xs font-medium text-gray-700 sm:text-sm">
                    {t('patients.newPatient.fields.allergies')}
                  </label>
                  <input
                    type="text"
                    id="allergies"
                    name="allergies"
                    value={formData.allergies}
                    onChange={handleInputChange}
                    placeholder={t('patients.newPatient.placeholders.allergies')}
                    className="w-full rounded-md border border-gray-300 px-2.5 py-1 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="md:col-span-2">
                  <label htmlFor="medications" className="mb-1 block text-xs font-medium text-gray-700 sm:text-sm">
                    {t('patients.newPatient.fields.currentMedications')}
                  </label>
                  <textarea
                    id="medications"
                    name="medications"
                    rows={3}
                    value={formData.medications}
                    onChange={handleInputChange}
                    placeholder={t('patients.newPatient.placeholders.medications')}
                    className="w-full rounded-md border border-gray-300 px-2.5 py-1 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="md:col-span-2">
                  <label htmlFor="medicalHistory" className="mb-1 block text-xs font-medium text-gray-700 sm:text-sm">
                    {t('patients.newPatient.fields.medicalHistory')}
                  </label>
                  <textarea
                    id="medicalHistory"
                    name="medicalHistory"
                    rows={3}
                    value={formData.medicalHistory}
                    onChange={handleInputChange}
                    placeholder={t('patients.newPatient.placeholders.medicalHistory')}
                    className="w-full rounded-md border border-gray-300 px-2.5 py-1 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="md:col-span-2">
                  <label htmlFor="familyHistory" className="mb-1 block text-xs font-medium text-gray-700 sm:text-sm">
                    {t('patients.newPatient.fields.familyHistory')}
                  </label>
                  <textarea
                    id="familyHistory"
                    name="familyHistory"
                    rows={3}
                    value={formData.familyHistory}
                    onChange={handleInputChange}
                    placeholder={t('patients.newPatient.placeholders.familyHistory')}
                    className="w-full rounded-md border border-gray-300 px-2.5 py-1 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Emergency Contact Section */}
          {activeSection === 'emergency' && (
            <div className="rounded-lg border border-gray-100 bg-white p-3 shadow-sm">
              <h3 className="mb-2 flex items-center text-sm font-semibold text-gray-900">
                <Phone className="mr-2 h-4 w-4 text-red-600" />
                {t('patients.newPatient.sections.emergency')}
              </h3>
              <div className="grid grid-cols-1 gap-2 md:grid-cols-2 md:gap-3">
                <div>
                  <label htmlFor="emergencyName" className="mb-1 block text-xs font-medium text-gray-700 sm:text-sm">
                    {t('patients.newPatient.fields.emergencyName')}
                  </label>
                  <input
                    type="text"
                    id="emergencyName"
                    name="emergencyName"
                    value={formData.emergencyName}
                    onChange={handleInputChange}
                    className="w-full rounded-md border border-gray-300 px-2.5 py-1 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label htmlFor="emergencyPhone" className="mb-1 block text-xs font-medium text-gray-700 sm:text-sm">
                    {t('patients.newPatient.fields.emergencyPhone')}
                  </label>
                  <input
                    type="tel"
                    id="emergencyPhone"
                    name="emergencyPhone"
                    value={formData.emergencyPhone}
                    onChange={handleInputChange}
                    className="w-full rounded-md border border-gray-300 px-2.5 py-1 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label htmlFor="emergencyRelationship" className="mb-1 block text-xs font-medium text-gray-700 sm:text-sm">
                    {t('patients.newPatient.fields.emergencyRelationship')}
                  </label>
                  <input
                    type="text"
                    id="emergencyRelationship"
                    name="emergencyRelationship"
                    value={formData.emergencyRelationship}
                    onChange={handleInputChange}
                    placeholder={t('patients.newPatient.placeholders.emergencyRelationship')}
                    className="w-full rounded-md border border-gray-300 px-2.5 py-1 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
          )}



          {/* Form Actions */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap gap-1">
              {sections.map((section, index) => (
                <button
                  key={section.id}
                  type="button"
                  onClick={() => setActiveSection(section.id)}
                  className={`rounded-md px-2 py-1 text-xs font-medium transition-colors sm:text-sm ${
                    activeSection === section.id
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-700 hover:text-gray-900'
                  }`}
                >
                  {index + 1}. {section.label}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <Link
                href="/patients"
                className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-700 transition-colors hover:bg-gray-50"
              >
                {t('patients.newPatient.buttons.cancel')}
              </Link>
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSubmitting ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                ) : (
                  <Save className="h-4 w-4" />
                )}
                <span>{isSubmitting ? t('patients.newPatient.buttons.saving') : t('patients.newPatient.buttons.savePatient')}</span>
              </button>
            </div>
          </div>
        </form>
      </SidebarLayout>
    </ProtectedRoute>
  );
}
