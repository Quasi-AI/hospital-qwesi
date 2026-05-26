import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/route';
import Patient from '../../../models/Patient';
import Appointment from '../../../models/Appointment';
import Report from '../../../models/Report';
import Bed from '../../../models/Bed';
import Admission from '../../../models/Admission';
import Invoice from '../../../models/Invoice';
import LabTest from '../../../models/LabTest';
import BloodInventory from '../../../models/BloodInventory';
import EmergencyCase from '../../../models/EmergencyCase';
import Medicine from '../../../models/Medicine';
import TelemedicineSession from '../../../models/TelemedicineSession';
import dbConnect from '../../../lib/mongodb';
import { getSystemCurrency } from '../../../lib/getSystemCurrency';
import { formatCurrencyAmount } from '../../../lib/formatCurrency';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();
    const systemCurrency = await getSystemCurrency();

    const today = new Date();
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
    const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, today.getDate());
    const startOfLastMonth = new Date(lastMonth.getFullYear(), lastMonth.getMonth(), lastMonth.getDate());
    const endOfLastMonth = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    
    // Date for expiring items (next 30 days)
    const thirtyDaysFromNow = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);

    // Fetch all stats in parallel
    const [
      // Patient stats
      totalPatients,
      patientsLastMonth,
      
      // Appointment stats
      appointmentsToday,
      appointmentsLastMonth,
      
      // Report stats
      totalReports,
      reportsLastMonth,
      
      // Bed stats
      totalBeds,
      availableBeds,
      occupiedBeds,
      
      // Inpatient stats
      activeAdmissions,
      criticalPatients,
      
      // Billing stats
      todayRevenue,
      pendingInvoices,
      
      // Lab stats
      pendingLabTests,
      urgentLabTests,
      criticalLabResults,
      
      // Blood bank stats
      bloodInventory,
      lowBloodStock,
      expiringBlood,
      
      // Emergency stats
      activeEmergencies,
      criticalEmergencies,
      waitingEmergencies,
      
      // Pharmacy stats
      lowStockMedicines,
      expiringMedicines,
      
      // Telemedicine stats
      activeTelemedicineSessions,
      waitingTelemedicineSessions,
      
      // Recent activities data
      recentAppointments,
      recentPatients,
      recentReports,
      recentEmergencies,
      recentAdmissions,
    ] = await Promise.all([
      // Patient counts
      Patient.countDocuments(),
      Patient.countDocuments({ createdAt: { $gte: startOfLastMonth, $lt: endOfLastMonth } }),
      
      // Appointment counts
      Appointment.countDocuments({ appointmentDate: { $gte: startOfToday, $lt: endOfToday }, status: { $ne: 'cancelled' } }),
      Appointment.countDocuments({ appointmentDate: { $gte: startOfLastMonth, $lt: endOfLastMonth }, status: { $ne: 'cancelled' } }),
      
      // Report counts
      Report.countDocuments(),
      Report.countDocuments({ createdAt: { $gte: startOfLastMonth, $lt: endOfLastMonth } }),
      
      // Bed counts
      Bed.countDocuments({ isActive: true }),
      Bed.countDocuments({ status: 'available', isActive: true }),
      Bed.countDocuments({ status: 'occupied', isActive: true }),
      
      // Admission counts
      Admission.countDocuments({ status: { $in: ['admitted', 'in-treatment'] } }),
      Admission.countDocuments({ status: { $in: ['admitted', 'in-treatment'] }, priority: 'critical' }),
      
      // Billing - Today's revenue
      Invoice.aggregate([
        { $match: { status: 'paid', updatedAt: { $gte: startOfToday, $lt: endOfToday } } },
        { $group: { _id: null, total: { $sum: '$total' } } }
      ]),
      Invoice.countDocuments({ status: { $in: ['pending', 'partial'] } }),
      
      // Lab counts
      LabTest.countDocuments({ status: { $in: ['pending', 'sample-collected', 'in-progress'] } }),
      LabTest.countDocuments({ status: { $in: ['pending', 'sample-collected', 'in-progress'] }, priority: { $in: ['urgent', 'stat'] } }),
      LabTest.countDocuments({ isCritical: true, criticalNotified: false }),
      
      // Blood bank
      BloodInventory.aggregate([
        { $match: { status: 'available' } },
        { $group: { _id: '$bloodGroup', count: { $sum: 1 } } }
      ]),
      BloodInventory.countDocuments({ status: 'available' }).then(count => count < 10),
      BloodInventory.countDocuments({ status: 'available', expiryDate: { $lte: thirtyDaysFromNow } }),
      
      // Emergency
      EmergencyCase.countDocuments({ status: { $in: ['waiting', 'in-triage', 'in-treatment', 'under-observation'] } }),
      EmergencyCase.countDocuments({ status: { $in: ['waiting', 'in-triage', 'in-treatment'] }, triageLevel: 'critical' }),
      EmergencyCase.countDocuments({ status: 'waiting' }),
      
      // Pharmacy
      Medicine.countDocuments({ $expr: { $lte: ['$currentStock', '$reorderLevel'] }, isActive: true }),
      Medicine.countDocuments({ expiryDate: { $lte: thirtyDaysFromNow }, isActive: true }),
      
      // Telemedicine
      TelemedicineSession.countDocuments({ status: 'in-progress' }),
      TelemedicineSession.countDocuments({ status: 'waiting' }),
      
      // Recent activities
      Appointment.find().sort({ createdAt: -1 }).limit(10).select('_id patientName doctorName appointmentDate appointmentTime status createdAt'),
      Patient.find().sort({ createdAt: -1 }).limit(10).select('name createdAt'),
      Report.find().sort({ createdAt: -1 }).limit(10).select('_id patientName doctorName reportType status createdAt'),
      EmergencyCase.find().sort({ createdAt: -1 }).limit(5).select('_id caseNumber patientName triageLevel status createdAt'),
      Admission.find().sort({ createdAt: -1 }).limit(5).select('_id admissionNumber patientName wardName status createdAt'),
    ]);

    // Calculate percentage changes
    const calculateChange = (current: number, previous: number) => {
      if (previous === 0) return current > 0 ? '+100%' : '0%';
      const change = ((current - previous) / previous) * 100;
      const sign = change >= 0 ? '+' : '';
      return `${sign}${Math.round(change)}%`;
    };

    // Primary stats (main stat cards)
    const stats = [
      {
        name: 'totalPatients',
        value: totalPatients.toString(),
        change: calculateChange(totalPatients, patientsLastMonth),
        changeType: totalPatients >= patientsLastMonth ? 'positive' : 'negative'
      },
      {
        name: 'appointmentsToday',
        value: appointmentsToday.toString(),
        change: calculateChange(appointmentsToday, appointmentsLastMonth),
        changeType: appointmentsToday >= appointmentsLastMonth ? 'positive' : 'negative'
      },
      {
        name: 'reportsGenerated',
        value: totalReports.toString(),
        change: calculateChange(totalReports, reportsLastMonth),
        changeType: totalReports >= reportsLastMonth ? 'positive' : 'negative'
      },
      {
        name: 'todayRevenue',
        value: formatCurrencyAmount(todayRevenue[0]?.total || 0, systemCurrency),
        change: '+0%',
        changeType: 'neutral'
      }
    ];

    // Secondary stats (operational metrics)
    const operationalStats = {
      beds: {
        total: totalBeds,
        available: availableBeds,
        occupied: occupiedBeds,
        occupancyRate: totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0
      },
      inpatient: {
        activeAdmissions,
        criticalPatients
      },
      billing: {
        pendingInvoices,
        todayRevenue: todayRevenue[0]?.total || 0
      },
      laboratory: {
        pending: pendingLabTests,
        urgent: urgentLabTests,
        criticalResults: criticalLabResults
      },
      bloodBank: {
        inventory: bloodInventory,
        isLowStock: lowBloodStock,
        expiringSoon: expiringBlood
      },
      emergency: {
        active: activeEmergencies,
        critical: criticalEmergencies,
        waiting: waitingEmergencies
      },
      pharmacy: {
        lowStock: lowStockMedicines,
        expiringSoon: expiringMedicines
      },
      telemedicine: {
        active: activeTelemedicineSessions,
        waiting: waitingTelemedicineSessions
      }
    };

    // Build critical alerts with translation keys
    const criticalAlerts = [];
    
    if (criticalEmergencies > 0) {
      criticalAlerts.push({
        id: 'critical-emergency',
        type: 'critical',
        titleKey: criticalEmergencies > 1 ? 'criticalEmergencyPlural' : 'criticalEmergency',
        descriptionKey: 'requiresImmediateAttention',
        count: criticalEmergencies,
        link: '/emergency?triageLevel=critical',
        icon: 'emergency'
      });
    }
    
    if (criticalLabResults > 0) {
      criticalAlerts.push({
        id: 'critical-lab',
        type: 'critical',
        titleKey: criticalLabResults > 1 ? 'criticalLabResultPlural' : 'criticalLabResult',
        descriptionKey: 'pendingNotification',
        count: criticalLabResults,
        link: '/lab?isCritical=true',
        icon: 'lab'
      });
    }
    
    if (criticalPatients > 0) {
      criticalAlerts.push({
        id: 'critical-patients',
        type: 'warning',
        titleKey: criticalPatients > 1 ? 'criticalInpatientPlural' : 'criticalInpatient',
        descriptionKey: 'requiresMonitoring',
        count: criticalPatients,
        link: '/inpatient/admissions?priority=critical',
        icon: 'inpatient'
      });
    }
    
    if (lowStockMedicines > 0) {
      criticalAlerts.push({
        id: 'low-stock-medicine',
        type: 'warning',
        titleKey: lowStockMedicines > 1 ? 'lowStockMedicinePlural' : 'lowStockMedicine',
        descriptionKey: 'reorderRequired',
        count: lowStockMedicines,
        link: '/pharmacy?filter=low-stock',
        icon: 'pharmacy'
      });
    }
    
    if (expiringMedicines > 0) {
      criticalAlerts.push({
        id: 'expiring-medicine',
        type: 'warning',
        titleKey: expiringMedicines > 1 ? 'expiringMedicinePlural' : 'expiringMedicine',
        descriptionKey: 'withinThirtyDays',
        count: expiringMedicines,
        link: '/pharmacy?filter=expiring',
        icon: 'pharmacy'
      });
    }
    
    if (expiringBlood > 0) {
      criticalAlerts.push({
        id: 'expiring-blood',
        type: 'warning',
        titleKey: expiringBlood > 1 ? 'expiringBloodPlural' : 'expiringBlood',
        descriptionKey: 'withinThirtyDays',
        count: expiringBlood,
        link: '/blood-bank/inventory?filter=expiring',
        icon: 'blood'
      });
    }
    
    if (urgentLabTests > 0) {
      criticalAlerts.push({
        id: 'urgent-lab',
        type: 'info',
        titleKey: urgentLabTests > 1 ? 'urgentLabTestPlural' : 'urgentLabTest',
        descriptionKey: 'pendingProcessing',
        count: urgentLabTests,
        link: '/lab?priority=urgent',
        icon: 'lab'
      });
    }
    
    if (waitingEmergencies > 0) {
      criticalAlerts.push({
        id: 'waiting-emergency',
        type: 'info',
        titleKey: waitingEmergencies > 1 ? 'waitingInERPlural' : 'waitingInER',
        descriptionKey: 'inTriageQueue',
        count: waitingEmergencies,
        link: '/emergency?status=waiting',
        icon: 'emergency'
      });
    }

    // Build recent activities
    const recentActivities = [];

    recentAppointments.forEach(appointment => {
      recentActivities.push({
        id: appointment._id.toString(),
        type: 'appointment',
        title: `Appointment: ${appointment.patientName}`,
        description: `${appointment.doctorName} - ${appointment.appointmentTime}`,
        time: formatTimeAgo(appointment.createdAt),
        createdAt: appointment.createdAt,
        status: appointment.status
      });
    });

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

    recentEmergencies.forEach(emergency => {
      recentActivities.push({
        id: emergency._id.toString(),
        type: 'emergency',
        title: `Emergency: ${emergency.caseNumber}`,
        description: `${emergency.patientName} - ${emergency.triageLevel}`,
        time: formatTimeAgo(emergency.createdAt),
        createdAt: emergency.createdAt,
        status: emergency.status
      });
    });

    recentAdmissions.forEach(admission => {
      recentActivities.push({
        id: admission._id.toString(),
        type: 'admission',
        title: `Admission: ${admission.admissionNumber}`,
        description: `${admission.patientName} - ${admission.wardName}`,
        time: formatTimeAgo(admission.createdAt),
        createdAt: admission.createdAt,
        status: admission.status
      });
    });

    // Sort and limit activities
    recentActivities.sort((a, b) => {
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();
      return dateB - dateA;
    });

    // Get upcoming appointments
    const upcomingAppointments = await Appointment.find({
      appointmentDate: { $gte: startOfToday },
      status: { $in: ['scheduled', 'confirmed'] }
    })
    .sort({ appointmentDate: 1, appointmentTime: 1 })
    .limit(5)
    .select('_id patientName appointmentTime appointmentType status appointmentDate');

    const formattedUpcomingAppointments = upcomingAppointments.map(appointment => ({
      id: appointment._id.toString(),
      patient: appointment.patientName || 'Unknown Patient',
      time: appointment.appointmentTime || 'N/A',
      type: appointment.appointmentType || 'consultation',
      status: appointment.status === 'confirmed' ? 'confirmed' : 'pending'
    }));

    return NextResponse.json({
      stats,
      operationalStats,
      criticalAlerts: criticalAlerts.slice(0, 6),
      recentActivities: recentActivities.slice(0, 10),
      upcomingAppointments: formattedUpcomingAppointments
    });

  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard data' },
      { status: 500 }
    );
  }
}

function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diffInMs = now.getTime() - date.getTime();
  const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
  const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
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
