'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Clock, Calendar, Save } from 'lucide-react';
import ProtectedRoute from '../../../protected-route';
import SidebarLayout from '../../../components/sidebar-layout';

export default function AppointmentReschedulePage() {
  const params = useParams();
  const router = useRouter();
  const [appointment, setAppointment] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    appointmentDate: '',
    appointmentTime: ''
  });

  useEffect(() => {
    const fetchAppointment = async () => {
      try {
        const response = await fetch(`/api/appointments/${params.id}`);
        if (response.ok) {
          const data = await response.json();
          setAppointment(data);
          // Set initial form values from appointment
          if (data.appointmentDate) {
            const date = new Date(data.appointmentDate);
            const dateString = date.toISOString().split('T')[0];
            setFormData({
              appointmentDate: dateString,
              appointmentTime: data.appointmentTime || ''
            });
          }
        }
      } catch (error) {
        console.error('Error fetching appointment:', error);
      } finally {
        setLoading(false);
      }
    };

    if (params.id) {
      fetchAppointment();
    }
  }, [params.id]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.appointmentDate || !formData.appointmentTime) {
      alert('Please select both date and time');
      return;
    }

    setIsSubmitting(true);

    try {
      const updateData = {
        appointmentDate: new Date(formData.appointmentDate),
        appointmentTime: formData.appointmentTime
      };

      const response = await fetch(`/api/appointments/${params.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });

      if (response.ok) {
        alert('Appointment rescheduled successfully!');
        router.push(`/appointments/${params.id}`);
      } else {
        const errorData = await response.json();
        alert(`Error: ${errorData.error || 'Failed to reschedule appointment'}`);
      }
    } catch (error) {
      console.error('Error rescheduling appointment:', error);
      alert('Error rescheduling appointment. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <ProtectedRoute>
        <SidebarLayout title="Reschedule Appointment" description="Change appointment time" dense>
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        </SidebarLayout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <SidebarLayout title="Reschedule Appointment" description="Change appointment time" dense>
        <div className="max-w-4xl mx-auto">
          <div className="mb-6">
            <Link href={`/appointments/${params.id}`} className="text-blue-600 hover:text-blue-800">
              <ArrowLeft className="h-4 w-4 inline mr-2" />
              Back to Appointment
            </Link>
            <h1 className="text-2xl font-bold text-gray-900 mt-4">
              Reschedule Appointment: {appointment?.patientName}
            </h1>
          </div>
          
          <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">Reschedule Appointment</h3>
            
            <div className="space-y-6">
              {/* Current Appointment Info */}
              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <h4 className="text-sm font-medium text-gray-700 mb-3">Current Appointment</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">
                    Current Date
                  </label>
                  <p className="text-sm text-gray-900">
                    {appointment?.appointmentDate ? new Date(appointment.appointmentDate).toLocaleDateString() : 'Not set'}
                  </p>
                </div>
                
                <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">
                    Current Time
                  </label>
                  <p className="text-sm text-gray-900">{appointment?.appointmentTime || 'Not set'}</p>
                  </div>
                </div>
              </div>
              
              {/* New Appointment Date and Time */}
              <div className="border-t pt-6">
                <h4 className="text-md font-medium text-gray-900 mb-4">New Appointment Details</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="appointmentDate" className="block text-sm font-medium text-gray-700 mb-2">
                      <Calendar className="h-4 w-4 inline mr-2" />
                      New Date *
                    </label>
                    <input
                      type="date"
                      id="appointmentDate"
                      name="appointmentDate"
                      required
                      value={formData.appointmentDate}
                      onChange={handleInputChange}
                      min={new Date().toISOString().split('T')[0]}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="appointmentTime" className="block text-sm font-medium text-gray-700 mb-2">
                      <Clock className="h-4 w-4 inline mr-2" />
                      New Time *
                    </label>
                    <input
                      type="time"
                      id="appointmentTime"
                      name="appointmentTime"
                      required
                      value={formData.appointmentTime}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Form Actions */}
              <div className="flex items-center justify-end space-x-3 pt-6 border-t">
                <Link
                  href={`/appointments/${params.id}`}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </Link>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  <span>{isSubmitting ? 'Rescheduling...' : 'Reschedule Appointment'}</span>
                </button>
              </div>
            </div>
          </form>
        </div>
      </SidebarLayout>
    </ProtectedRoute>
  );
}
