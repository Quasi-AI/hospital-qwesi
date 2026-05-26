'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import ProtectedRoute from '@/app/protected-route';
import SidebarLayout from '@/app/components/sidebar-layout';
import { useTranslations } from '@/app/hooks/useTranslations';
import { useFormatCurrency } from '@/app/hooks/useFormatCurrency';
import SearchablePatientSelect from '@/app/components/SearchablePatientSelect';
import { ArrowLeft, Save, Package, Trash2, Search } from 'lucide-react';

interface Patient { _id: string; name: string; email?: string; phone?: string; }
interface Medicine { _id: string; name: string; genericName: string; strength: string; sellingPrice: number; currentStock: number; unit: string; }
interface DispensingItem { medicineId: string; medicineName: string; genericName: string; dosage: string; quantity: number; unitPrice: number; totalPrice: number; instructions: string; }

export default function DispensingPage() {
  const { t, translationsLoaded } = useTranslations();
  const { formatCurrency } = useFormatCurrency();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [searchMedicine, setSearchMedicine] = useState('');
  const [showMedicineDropdown, setShowMedicineDropdown] = useState(false);

  const [formData, setFormData] = useState({
    patientId: '', patientName: '', doctorName: '', prescriptionNumber: '',
    items: [] as DispensingItem[], discount: 0, notes: '',
  });

  useEffect(() => { fetchMedicines(); }, []);

  const fetchMedicines = async () => {
    try {
      const response = await fetch('/api/pharmacy/medicines?isActive=true');
      if (response.ok) setMedicines(await response.json());
    } catch (error) { console.error('Error fetching medicines:', error); }
  };

  const handlePatientChange = (patient: Patient | null) => {
    setSelectedPatient(patient);
    if (patient) setFormData(prev => ({ ...prev, patientId: patient._id, patientName: patient.name }));
    else setFormData(prev => ({ ...prev, patientId: '', patientName: '' }));
  };

  const addMedicine = (med: Medicine) => {
    if (formData.items.some(i => i.medicineId === med._id)) return;
    const newItem: DispensingItem = {
      medicineId: med._id, medicineName: med.name, genericName: med.genericName,
      dosage: med.strength, quantity: 1, unitPrice: med.sellingPrice,
      totalPrice: med.sellingPrice, instructions: '',
    };
    setFormData(prev => ({ ...prev, items: [...prev.items, newItem] }));
    setSearchMedicine('');
    setShowMedicineDropdown(false);
  };

  const updateItem = (index: number, field: string, value: number | string) => {
    const newItems = [...formData.items];
    (newItems[index] as Record<string, unknown>)[field] = value;
    if (field === 'quantity') newItems[index].totalPrice = (value as number) * newItems[index].unitPrice;
    setFormData(prev => ({ ...prev, items: newItems }));
  };

  const removeItem = (index: number) => {
    setFormData(prev => ({ ...prev, items: prev.items.filter((_, i) => i !== index) }));
  };

  const subtotal = formData.items.reduce((sum, i) => sum + i.totalPrice, 0);
  const total = subtotal - formData.discount;

  const filteredMedicines = medicines.filter(m =>
    m.name.toLowerCase().includes(searchMedicine.toLowerCase()) ||
    m.genericName.toLowerCase().includes(searchMedicine.toLowerCase())
  ).slice(0, 10);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.patientId) { setError(t('pharmacy.pleaseSelectPatient')); return; }
    if (formData.items.length === 0) { setError(t('pharmacy.pleaseAddMedicines')); return; }
    setSubmitting(true); setError(''); setSuccess('');

    try {
      const response = await fetch('/api/pharmacy/dispensing', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, discount: formData.discount || 0 }),
      });
      if (response.ok) {
        const data = await response.json();
        setSuccess(`${t('pharmacy.dispensingCreated')} #${data.dispensingNumber}`);
        setFormData({ patientId: '', patientName: '', doctorName: '', prescriptionNumber: '', items: [], discount: 0, notes: '' });
        setSelectedPatient(null);
      } else { const data = await response.json(); setError(data.error || t('common.error')); }
    } catch { setError(t('common.error')); }
    finally { setSubmitting(false); }
  };

  if (!translationsLoaded) {
    return <ProtectedRoute><SidebarLayout title="" description="" dense><div className="flex items-center justify-center h-48"><div className="animate-spin rounded-full h-7 w-7 border-b-2 border-blue-600"></div></div></SidebarLayout></ProtectedRoute>;
  }

  return (
    <ProtectedRoute>
      <SidebarLayout title={t('pharmacy.dispensing')} description={t('pharmacy.dispensingDescription')} dense>
        <div className="max-w-5xl">
          <Link href="/pharmacy" className="inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 mb-3">
            <ArrowLeft className="h-4 w-4 shrink-0" /><span>{t('common.back')}</span>
          </Link>

          {error && <div className="mb-3 p-3 text-sm bg-red-50 border border-red-200 text-red-700 rounded-md">{error}</div>}
          {success && <div className="mb-3 p-3 text-sm bg-green-50 border border-green-200 text-green-700 rounded-md">{success}</div>}

          <form onSubmit={handleSubmit} className="space-y-3">
            {/* Patient & Prescription Info */}
            <div className="bg-white border border-gray-100 rounded-lg p-4">
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2"><Package className="h-4 w-4 text-blue-600 shrink-0" />{t('pharmacy.patientPrescription')}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="md:col-span-2">
                  <label className="block text-xs font-medium text-gray-700 mb-1">{t('pharmacy.selectPatient')} *</label>
                  <SearchablePatientSelect value={selectedPatient?.name || ''} onChange={handlePatientChange} placeholder={t('pharmacy.searchPatient')} />
                </div>
                <div><label className="block text-xs font-medium text-gray-700 mb-1">{t('pharmacy.doctorName')}</label>
                  <input type="text" value={formData.doctorName} onChange={(e) => setFormData({ ...formData, doctorName: e.target.value })}
                    className="w-full h-9 px-2.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500" /></div>
                <div><label className="block text-xs font-medium text-gray-700 mb-1">{t('pharmacy.prescriptionNumber')}</label>
                  <input type="text" value={formData.prescriptionNumber} onChange={(e) => setFormData({ ...formData, prescriptionNumber: e.target.value })}
                    className="w-full h-9 px-2.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500" /></div>
              </div>
            </div>

            {/* Medicines */}
            <div className="bg-white border border-gray-100 rounded-lg p-4">
              <h3 className="text-sm font-semibold mb-3">{t('pharmacy.medicines')}</h3>
              
              {/* Search Medicine */}
              <div className="relative mb-3">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input type="text" placeholder={t('pharmacy.searchMedicine')} value={searchMedicine}
                  onChange={(e) => { setSearchMedicine(e.target.value); setShowMedicineDropdown(true); }}
                  onFocus={() => setShowMedicineDropdown(true)}
                  className="w-full h-9 pl-9 pr-3 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                {showMedicineDropdown && searchMedicine && filteredMedicines.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-56 overflow-auto text-sm">
                    {filteredMedicines.map(med => (
                      <button key={med._id} type="button" onClick={() => addMedicine(med)}
                        className="w-full px-3 py-2 text-left hover:bg-gray-50 flex justify-between items-center gap-2">
                        <div className="min-w-0">
                          <p className="font-medium truncate">{med.name}</p>
                          <p className="text-xs text-gray-500 truncate">{med.genericName} • {med.strength}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="font-medium">{formatCurrency(med.sellingPrice)}</p>
                          <p className="text-xs text-gray-500">{med.currentStock} {med.unit}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Items Table */}
              {formData.items.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">{t('pharmacy.medicine')}</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">{t('pharmacy.dosage')}</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">{t('pharmacy.qty')}</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">{t('pharmacy.price')}</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">{t('pharmacy.total')}</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">{t('pharmacy.instructions')}</th>
                        <th className="px-3 py-2 w-10"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {formData.items.map((item, idx) => (
                        <tr key={idx}>
                          <td className="px-3 py-2"><p className="font-medium text-sm">{item.medicineName}</p><p className="text-xs text-gray-500">{item.genericName}</p></td>
                          <td className="px-3 py-2 text-sm">{item.dosage}</td>
                          <td className="px-3 py-2">
                            <input type="number" min="1" value={item.quantity} onChange={(e) => updateItem(idx, 'quantity', Number(e.target.value))}
                              className="w-16 h-8 px-2 border border-gray-300 rounded text-sm" />
                          </td>
                          <td className="px-3 py-2 text-sm">{formatCurrency(item.unitPrice)}</td>
                          <td className="px-3 py-2 text-sm font-medium">{formatCurrency(item.totalPrice)}</td>
                          <td className="px-3 py-2">
                            <input type="text" value={item.instructions} onChange={(e) => updateItem(idx, 'instructions', e.target.value)}
                              className="w-full min-w-[8rem] h-8 px-2 border border-gray-300 rounded text-sm" placeholder="e.g., 1 tab TID" />
                          </td>
                          <td className="px-3 py-2">
                            <button type="button" onClick={() => removeItem(idx)} className="p-1 text-red-600 hover:bg-red-50 rounded"><Trash2 className="h-4 w-4" /></button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-6 text-gray-500 text-sm border border-dashed border-gray-200 rounded-md">
                  <Package className="h-9 w-9 mx-auto mb-1.5 text-gray-300" />
                  <p>{t('pharmacy.noMedicinesAdded')}</p>
                  <p className="text-xs mt-0.5">{t('pharmacy.searchToAdd')}</p>
                </div>
              )}
            </div>

            {/* Totals & Notes */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="bg-white border border-gray-100 rounded-lg p-4">
                <h3 className="text-sm font-semibold mb-3">{t('pharmacy.notes')}</h3>
                <textarea rows={3} value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full min-h-[5rem] px-2.5 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder={t('pharmacy.notesPlaceholder')} />
              </div>
              <div className="bg-white border border-gray-100 rounded-lg p-4">
                <h3 className="text-sm font-semibold mb-3">{t('pharmacy.summary')}</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-gray-600">{t('pharmacy.subtotal')}</span><span className="font-medium">{formatCurrency(subtotal)}</span></div>
                  <div className="flex justify-between items-center gap-2">
                    <span className="text-gray-600">{t('pharmacy.discount')}</span>
                    <input type="number" min="0" step="0.01" value={formData.discount} onChange={(e) => setFormData({ ...formData, discount: Number(e.target.value) })}
                      className="w-24 h-8 px-2 border border-gray-300 rounded text-right text-sm" />
                  </div>
                  <div className="flex justify-between pt-2 border-t"><span className="font-semibold">{t('pharmacy.total')}</span><span className="font-bold text-base">{formatCurrency(total)}</span></div>
                </div>
              </div>
            </div>

            {/* Submit */}
            <div className="flex items-center gap-2">
              <button type="submit" disabled={submitting} className="inline-flex items-center gap-1.5 h-9 px-4 text-sm bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50">
                <Save className="h-4 w-4 shrink-0" /><span>{submitting ? t('common.saving') : t('pharmacy.dispense')}</span>
              </button>
              <Link href="/pharmacy" className="inline-flex items-center h-9 px-4 text-sm border border-gray-300 rounded-md hover:bg-gray-50">{t('common.cancel')}</Link>
            </div>
          </form>
        </div>
      </SidebarLayout>
    </ProtectedRoute>
  );
}
