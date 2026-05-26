import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/route';
import Patient from '../../../models/Patient';
import Appointment from '../../../models/Appointment';
import Report from '../../../models/Report';
import dbConnect from '../../../lib/mongodb';

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    // Get query parameters for pagination
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '100');
    const skip = parseInt(searchParams.get('skip') || '0');

    // Fetch all activities
    const [
      recentAppointments,
      recentPatients,
      recentReports
    ] = await Promise.all([
      // Recent appointments
      Appointment.find()
        .sort({ createdAt: -1 })
        .select('_id patientName doctorName appointmentDate appointmentTime status createdAt'),

      // Recent patients
      Patient.find()
        .sort({ createdAt: -1 })
        .select('name createdAt'),

      // Recent reports
      Report.find()
        .sort({ createdAt: -1 })
        .select('_id patientName doctorName reportType status createdAt')
    ]);

    // Build recent activities
    const recentActivities = [];

    // Add recent appointments
    recentAppointments.forEach(appointment => {
      recentActivities.push({
        id: appointment._id.toString(),
        type: 'appointment',
        title: `Appointment scheduled: ${appointment.patientName}`,
        description: `${appointment.doctorName} - ${appointment.appointmentTime}`,
        time: formatTimeAgo(appointment.createdAt),
        createdAt: appointment.createdAt,
        status: appointment.status
      });
    });

    // Add recent patients
    recentPatients.forEach(patient => {
      recentActivities.push({
        id: `patient-${patient._id}`,
        type: 'patient',
        title: 'New patient registered',
        description: patient.name,
        time: formatTimeAgo(patient.createdAt),
        createdAt: patient.createdAt,
        status: 'completed'
      });
    });

    // Add recent reports
    recentReports.forEach(report => {
      recentActivities.push({
        id: report._id.toString(),
        type: 'report',
        title: 'Report generated',
        description: `${report.patientName} - ${report.reportType}`,
        time: formatTimeAgo(report.createdAt),
        createdAt: report.createdAt,
        status: report.status
      });
    });

    // Sort activities by createdAt date (most recent first)
    recentActivities.sort((a, b) => {
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();
      return dateB - dateA; // Most recent first
    });

    // Apply pagination
    const total = recentActivities.length;
    const paginatedActivities = recentActivities.slice(skip, skip + limit);

    return NextResponse.json({
      activities: paginatedActivities,
      total,
      limit,
      skip
    });

  } catch (error) {
    console.error('Error fetching activity data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch activity data' },
      { status: 500 }
    );
  }
}

// Helper function to format time ago
function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diffInMs = now.getTime() - date.getTime();
  const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
  const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

  if (diffInDays > 0) {
    return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
  } else if (diffInHours > 0) {
    return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
  } else if (diffInMinutes > 0) {
    return `${diffInMinutes} minute${diffInMinutes > 1 ? 's' : ''} ago`;
  } else {
    return 'Just now';
  }
}

