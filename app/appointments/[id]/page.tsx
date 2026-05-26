'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  ArrowLeft, 
  Edit, 
  Calendar, 
  Clock,
  Users,
  MapPin,
  Phone,
  Mail,
  FileText,
  AlertCircle
} from 'lucide-react';
import ProtectedRoute from '../../protected-route';
import SidebarLayout from '../../components/sidebar-layout';

export default function AppointmentViewPage() {
  const params = useParams();
  const router = useRouter();
  const [appointment, setAppointment] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchAppointment = async () => {
      try {
        const response = await fetch(`/api/appointments/${params.id}`);
        if (response.ok) {
          const data = await response.json();
          setAppointment(data);
        } else {
          setError('Appointment not found');
        }
      } catch (error) {
        console.error('Error fetching appointment:', error);
        setError('Failed to fetch appointment data');
      } finally {
        setLoading(false);
      }
    };

    if (params.id) {
      fetchAppointment();
    }
  }, [params.id]);

  if (loading) {
    return (
      <ProtectedRoute>
        <SidebarLayout
          title="Appointment Details"
          description="View appointment information"
          dense
        >
          <div className="flex min-h-[200px] items-center justify-center">
            <div className="h-9 w-9 animate-spin rounded-full border-b-2 border-blue-600"></div>
          </div>
        </SidebarLayout>
      </ProtectedRoute>
    );
  }

  if (error || !appointment) {
    return (
      <ProtectedRoute>
        <SidebarLayout
          title="Appointment Not Found"
          description="The requested appointment could not be found"
          dense
        >
          <div className="py-6 text-center sm:py-8">
            <Calendar className="mx-auto h-8 w-8 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">Appointment not found</h3>
            <p className="mt-1 text-xs text-gray-700 sm:text-sm">
              The appointment you're looking for doesn't exist or has been removed.
            </p>
            <div className="mt-4">
              <Link
                href="/appointments"
                className="inline-flex h-9 items-center gap-1.5 rounded-md bg-blue-600 px-3 text-sm font-medium text-white hover:bg-blue-700"
              >
                <ArrowLeft className="h-4 w-4 shrink-0" />
                <span>Back to Appointments</span>
              </Link>
            </div>
          </div>
        </SidebarLayout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <SidebarLayout
        title="Appointment Details"
        description="View and manage appointment information"
        dense
      >
        <div className="mx-auto max-w-4xl space-y-3">
          {/* Header */}
          <div className="mb-1">
            <Link
              href="/appointments"
              className="mb-2 inline-flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800 sm:text-sm"
            >
              <ArrowLeft className="h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4" />
              Back to Appointments
            </Link>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <h1 className="text-lg font-bold text-gray-900 sm:text-xl">
                Appointment: {appointment.patientName}
              </h1>
              <div className="flex flex-wrap gap-2">
                <Link
                  href={`/appointments/${appointment._id}/edit`}
                  className="inline-flex h-9 items-center gap-1.5 rounded-md bg-blue-600 px-3 text-sm font-medium text-white hover:bg-blue-700"
                >
                  <Edit className="h-4 w-4 shrink-0" />
                  <span>Edit Appointment</span>
                </Link>
                <Link
                  href={`/appointments/${appointment._id}/reschedule`}
                  className="inline-flex h-9 items-center gap-1.5 rounded-md bg-orange-600 px-3 text-sm font-medium text-white hover:bg-orange-700"
                >
                  <Clock className="h-4 w-4 shrink-0" />
                  <span>Reschedule</span>
                </Link>
              </div>
            </div>
          </div>

          {/* Appointment Information */}
          <div className="overflow-hidden rounded-lg border border-gray-100 bg-white shadow-sm">
            <div className="border-b border-gray-100 px-3 py-2 sm:px-4 sm:py-2.5">
              <h2 className="text-sm font-semibold text-gray-900 sm:text-base">Appointment Details</h2>
            </div>
            <div className="p-3 sm:p-4">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-4">
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 shrink-0 text-gray-400" />
                    <div>
                      <p className="text-[11px] font-medium text-gray-500 sm:text-xs">Patient Name</p>
                      <p className="text-xs text-gray-900 sm:text-sm">{appointment.patientName}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 shrink-0 text-gray-400" />
                    <div>
                      <p className="text-[11px] font-medium text-gray-500 sm:text-xs">Patient ID</p>
                      <p className="font-mono text-xs text-gray-900 sm:text-sm">{appointment.patientId || 'N/A'}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 shrink-0 text-gray-400" />
                    <div>
                      <p className="text-[11px] font-medium text-gray-500 sm:text-xs">Doctor</p>
                      <p className="text-xs text-gray-900 sm:text-sm">{appointment.doctorName}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 shrink-0 text-gray-400" />
                    <div>
                      <p className="text-[11px] font-medium text-gray-500 sm:text-xs">Date</p>
                      <p className="text-xs text-gray-900 sm:text-sm">
                        {new Date(appointment.appointmentDate).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 shrink-0 text-gray-400" />
                    <div>
                      <p className="text-[11px] font-medium text-gray-500 sm:text-xs">Time</p>
                      <p className="text-xs text-gray-900 sm:text-sm">{appointment.appointmentTime}</p>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 shrink-0 text-gray-400" />
                    <div>
                      <p className="text-[11px] font-medium text-gray-500 sm:text-xs">Type</p>
                      <p className="text-xs capitalize text-gray-900 sm:text-sm">{appointment.appointmentType}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 shrink-0 text-gray-400" />
                    <div>
                      <p className="text-[11px] font-medium text-gray-500 sm:text-xs">Status</p>
                      <span className={`inline-flex rounded-full px-1.5 py-0.5 text-[10px] font-medium sm:text-xs ${
                        appointment.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                        appointment.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        appointment.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {appointment.status}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 shrink-0 text-gray-400" />
                    <div>
                      <p className="text-[11px] font-medium text-gray-500 sm:text-xs">Location</p>
                      <p className="text-xs text-gray-900 sm:text-sm">{appointment.location || 'Not specified'}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Patient Information */}
          <div className="overflow-hidden rounded-lg border border-gray-100 bg-white shadow-sm">
            <div className="border-b border-gray-100 px-3 py-2 sm:px-4 sm:py-2.5">
              <h2 className="text-sm font-semibold text-gray-900 sm:text-base">Patient Information</h2>
            </div>
            <div className="p-3 sm:p-4">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-4">
                <div>
                  <p className="text-[11px] font-medium text-gray-500 sm:text-xs">Email</p>
                  <p className="text-xs text-gray-900 sm:text-sm">{appointment.patientEmail}</p>
                </div>
                <div>
                  <p className="text-[11px] font-medium text-gray-500 sm:text-xs">Phone</p>
                  <p className="text-xs text-gray-900 sm:text-sm">{appointment.patientPhone}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Symptoms and Diagnosis */}
          {appointment.symptoms && appointment.symptoms.length > 0 && (
            <div className="overflow-hidden rounded-lg border border-gray-100 bg-white shadow-sm">
              <div className="border-b border-gray-100 px-3 py-2 sm:px-4 sm:py-2.5">
                <h2 className="text-sm font-semibold text-gray-900 sm:text-base">Symptoms</h2>
              </div>
              <div className="p-3 sm:p-4">
                <div className="flex flex-wrap gap-1.5">
                  {appointment.symptoms.map((symptom: string, index: number) => (
                    <span key={index} className="rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-800">
                      {symptom}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Diagnosis and Treatment */}
          {appointment.diagnosis && (
            <div className="overflow-hidden rounded-lg border border-gray-100 bg-white shadow-sm">
              <div className="border-b border-gray-100 px-3 py-2 sm:px-4 sm:py-2.5">
                <h2 className="text-sm font-semibold text-gray-900 sm:text-base">Diagnosis & Treatment</h2>
              </div>
              <div className="space-y-3 p-3 sm:p-4">
                <div>
                  <p className="text-[11px] font-medium text-gray-500 sm:text-xs">Diagnosis</p>
                  <p className="text-xs text-gray-900 sm:text-sm">{appointment.diagnosis}</p>
                </div>
                {appointment.treatment && (
                  <div>
                    <p className="text-[11px] font-medium text-gray-500 sm:text-xs">Treatment</p>
                    <p className="text-xs text-gray-900 sm:text-sm">{appointment.treatment}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Notes */}
          {appointment.notes && (
            <div className="overflow-hidden rounded-lg border border-gray-100 bg-white shadow-sm">
              <div className="border-b border-gray-100 px-3 py-2 sm:px-4 sm:py-2.5">
                <h2 className="text-sm font-semibold text-gray-900 sm:text-base">Notes</h2>
              </div>
              <div className="p-3 sm:p-4">
                <p className="text-xs text-gray-900 sm:text-sm">{appointment.notes}</p>
              </div>
            </div>
          )}
        </div>
      </SidebarLayout>
    </ProtectedRoute>
  );
}
