import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/route';
import Patient from '../../../models/Patient';
import Appointment from '../../../models/Appointment';
import Report from '../../../models/Report';
import Invoice from '../../../models/Invoice';
import LabTest from '../../../models/LabTest';
import Medicine from '../../../models/Medicine';
import Dispensing from '../../../models/Dispensing';
import TelemedicineSession from '../../../models/TelemedicineSession';
import User from '../../../models/User';
import PatientFamilyMember from '../../../models/PatientFamilyMember';
import PatientReferral from '../../../models/PatientReferral';
import HomeCareTask from '../../../models/HomeCareTask';
import PatientSubscription from '../../../models/PatientSubscription';
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
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, today.getDate());
    const startOfLastMonth = new Date(lastMonth.getFullYear(), lastMonth.getMonth(), 1);
    const endOfLastMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    
    // Date for expiring items (next 30 days)
    const thirtyDaysFromNow = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
    const requestedRole = request.nextUrl.searchParams.get('role');
    const sessionRole = session.user.role || 'doctor';
    const role =
      sessionRole === 'admin' && ['pharmacy'].includes(requestedRole || '')
        ? String(requestedRole)
        : sessionRole;

    if (role === 'patient') {
      const patient = await Patient.findOne({
        $or: [
          { _id: session.user.id },
          { email: session.user.email },
          { patientId: (session.user as any).patientId },
        ].filter((condition: any) => Object.values(condition)[0]),
      }).lean() as any;

      if (!patient) {
        return NextResponse.json({ error: 'Patient profile not found' }, { status: 404 });
      }

      const patientKeys = [String(patient._id), patient.patientId, patient.email, patient.name].filter(Boolean).map(String);
      const patientMatch = {
        $or: [
          { patientId: { $in: patientKeys } },
          { patientEmail: patient.email },
          { patientName: patient.name },
        ],
      };

      const [
        upcomingAppointments,
        completedAppointments,
        pendingLabTests,
        completedLabTests,
        reports,
        prescriptions,
        activeTelemedicineSessions,
        recentReports,
        recentLabTests,
        referrals,
        familyMembers,
        homeCareTasks,
        activeSubscription,
      ] = await Promise.all([
        Appointment.find({ ...patientMatch, appointmentDate: { $gte: startOfToday }, status: { $in: ['scheduled', 'confirmed'] } }).sort({ appointmentDate: 1, appointmentTime: 1 }).limit(5).select('_id doctorName appointmentDate appointmentTime appointmentType status createdAt').lean(),
        Appointment.countDocuments({ ...patientMatch, status: 'completed' }),
        LabTest.countDocuments({ ...patientMatch, status: { $in: ['pending', 'sample-collected', 'in-progress'] } }),
        LabTest.countDocuments({ ...patientMatch, status: 'completed' }),
        Report.countDocuments({ patientId: { $in: patientKeys } }),
        Dispensing.countDocuments({ patientId: patient._id, status: { $in: ['pending', 'processing', 'ready'] } }),
        TelemedicineSession.countDocuments({ patientId: patient._id, status: { $in: ['waiting', 'in-progress'] } }),
        Report.find({ patientId: { $in: patientKeys } }).sort({ createdAt: -1 }).limit(5).select('_id reportType status createdAt doctorName').lean(),
        LabTest.find(patientMatch).sort({ createdAt: -1 }).limit(5).select('_id testNumber testType status createdAt doctorName').lean(),
        PatientReferral.find({
          $or: [
            { patientId: { $in: patientKeys } },
            { patientEmail: patient.email },
          ],
          status: { $ne: 'cancelled' },
        }).sort({ createdAt: -1 }).limit(5).lean(),
        PatientFamilyMember.find({
          $or: [
            { ownerPatientId: { $in: patientKeys } },
            { ownerPatientEmail: patient.email },
          ],
        }).sort({ createdAt: -1 }).limit(5).lean(),
        HomeCareTask.find({
          $or: [
            { patientId: { $in: patientKeys } },
            { patientEmail: patient.email },
          ],
          status: { $in: ['scheduled', 'in-progress'] },
        }).sort({ dueAt: 1, createdAt: -1 }).limit(5).lean(),
        PatientSubscription.findOne({
          $or: [
            { patientId: { $in: patientKeys } },
            { patientEmail: patient.email },
          ],
          status: 'active',
        }).sort({ currentPeriodEnd: -1 }).lean(),
      ]);

      const recentActivities: any[] = [];
      upcomingAppointments.forEach((appointment: any) => {
        recentActivities.push({
          id: String(appointment._id),
          type: 'appointment',
          title: `Appointment with ${appointment.doctorName || 'doctor'}`,
          description: `${appointment.appointmentTime || 'Scheduled'} - ${appointment.status}`,
          time: formatTimeAgo(appointment.createdAt),
          createdAt: appointment.createdAt,
          status: appointment.status,
        });
      });
      recentReports.forEach((report: any) => {
        recentActivities.push({
          id: String(report._id),
          type: 'report',
          title: 'Report available',
          description: `${report.reportType} - ${report.status}`,
          time: formatTimeAgo(report.createdAt),
          createdAt: report.createdAt,
          status: report.status,
        });
      });
      recentLabTests.forEach((test: any) => {
        recentActivities.push({
          id: String(test._id),
          type: 'lab',
          title: test.testNumber || 'Lab test',
          description: `${test.testType} - ${test.status}`,
          time: formatTimeAgo(test.createdAt),
          createdAt: test.createdAt,
          status: test.status,
        });
      });
      recentActivities.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      return NextResponse.json({
        dashboardRole: 'patient',
        profile: {
          id: String(patient._id),
          patientId: patient.patientId,
          name: patient.name,
          email: patient.email,
        },
        stats: [
          { name: 'upcomingAppointments', value: String(upcomingAppointments.length), change: '0%', changeType: 'neutral' },
          { name: 'pendingLabTests', value: String(pendingLabTests), change: '0%', changeType: pendingLabTests > 0 ? 'negative' : 'neutral' },
          { name: 'reportsGenerated', value: String(reports), change: '0%', changeType: 'neutral' },
          { name: 'activePrescriptions', value: String(prescriptions), change: '0%', changeType: prescriptions > 0 ? 'positive' : 'neutral' },
          { name: 'referrals', value: String(referrals.length), change: '0%', changeType: referrals.length > 0 ? 'positive' : 'neutral' },
        ],
        operationalStats: {
          care: { completedAppointments, completedLabTests },
          laboratory: { pending: pendingLabTests, urgent: 0, criticalResults: 0 },
          telemedicine: { active: activeTelemedicineSessions, waiting: 0 },
          pharmacy: { pendingPrescriptions: prescriptions },
          referrals: { active: referrals.length, latest: referrals },
          family: { members: familyMembers.length, latest: familyMembers },
          homeCare: { active: homeCareTasks.length, latest: homeCareTasks },
          wallet: {
            planName: activeSubscription?.planName || '',
            status: activeSubscription?.status || '',
            currency: activeSubscription?.currency || systemCurrency,
            balance: 0,
          },
        },
        criticalAlerts: [],
        recentActivities: recentActivities.slice(0, 10),
        upcomingAppointments: upcomingAppointments.map((appointment: any) => ({
          id: appointment._id.toString(),
          patient: appointment.doctorName || 'Care team',
          time: appointment.appointmentTime || 'N/A',
          date: appointment.appointmentDate,
          type: appointment.appointmentType || 'consultation',
          status: appointment.status === 'confirmed' ? 'confirmed' : 'pending',
        })),
      });
    }

    if (role === 'pharmacy') {
      const pharmacyScope = sessionRole === 'pharmacy' ? { createdBy: session.user.id } : {};
      const [
        totalMedicines,
        lowStockMedicines,
        expiringMedicines,
        pendingDispensing,
        readyDispensing,
        dispensedToday,
        paidToday,
        paidThisMonth,
        recentDispensing,
        lowStockItems,
      ] = await Promise.all([
        Medicine.countDocuments({ ...pharmacyScope, isActive: true }),
        Medicine.countDocuments({ ...pharmacyScope, $expr: { $lte: ['$currentStock', '$reorderLevel'] }, isActive: true }),
        Medicine.countDocuments({ ...pharmacyScope, expiryDate: { $lte: thirtyDaysFromNow, $gte: today }, isActive: true }),
        Dispensing.countDocuments({ ...pharmacyScope, status: { $in: ['pending', 'processing'] } }),
        Dispensing.countDocuments({ ...pharmacyScope, status: 'ready' }),
        Dispensing.countDocuments({ ...pharmacyScope, status: 'dispensed', dispensedAt: { $gte: startOfToday, $lt: endOfToday } }),
        Dispensing.aggregate([
          { $match: { ...pharmacyScope, paymentStatus: 'paid', updatedAt: { $gte: startOfToday, $lt: endOfToday } } },
          { $group: { _id: null, total: { $sum: '$totalAmount' } } },
        ]),
        Dispensing.aggregate([
          { $match: { ...pharmacyScope, paymentStatus: 'paid', updatedAt: { $gte: startOfMonth, $lt: endOfToday } } },
          { $group: { _id: null, total: { $sum: '$totalAmount' } } },
        ]),
        Dispensing.find(pharmacyScope).sort({ createdAt: -1 }).limit(8).select('_id dispensingNumber patientName status paymentStatus totalAmount createdAt').lean(),
        Medicine.find({ ...pharmacyScope, $expr: { $lte: ['$currentStock', '$reorderLevel'] }, isActive: true }).sort({ currentStock: 1 }).limit(5).select('_id name currentStock reorderLevel expiryDate').lean(),
      ]);

      return NextResponse.json({
        dashboardRole: 'pharmacy',
        stats: [
          { name: 'totalMedicines', value: String(totalMedicines), change: '0%', changeType: 'neutral' },
          { name: 'pendingDispensing', value: String(pendingDispensing), change: '0%', changeType: pendingDispensing > 0 ? 'negative' : 'neutral' },
          { name: 'readyForPickup', value: String(readyDispensing), change: '0%', changeType: readyDispensing > 0 ? 'positive' : 'neutral' },
          { name: 'todayRevenue', value: formatCurrencyAmount(paidToday[0]?.total || 0, systemCurrency), change: '0%', changeType: 'neutral' },
          { name: 'monthlyRevenue', value: formatCurrencyAmount(paidThisMonth[0]?.total || 0, systemCurrency), change: '0%', changeType: 'neutral' },
        ],
        operationalStats: {
          pharmacy: {
            lowStock: lowStockMedicines,
            expiringSoon: expiringMedicines,
            pendingDispensing,
            readyForPickup: readyDispensing,
            dispensedToday,
            lowStockItems,
          },
          billing: { pendingInvoices: 0, todayRevenue: paidToday[0]?.total || 0, monthlyRevenue: paidThisMonth[0]?.total || 0 },
        },
        criticalAlerts: [
          ...(lowStockMedicines > 0 ? [{
            id: 'low-stock-medicine',
            type: 'warning',
            titleKey: lowStockMedicines > 1 ? 'lowStockMedicinePlural' : 'lowStockMedicine',
            descriptionKey: 'reorderRequired',
            count: lowStockMedicines,
            link: '/pharmacy?filter=low-stock',
            icon: 'pharmacy',
          }] : []),
          ...(expiringMedicines > 0 ? [{
            id: 'expiring-medicine',
            type: 'warning',
            titleKey: expiringMedicines > 1 ? 'expiringMedicinePlural' : 'expiringMedicine',
            descriptionKey: 'withinThirtyDays',
            count: expiringMedicines,
            link: '/pharmacy?filter=expiring',
            icon: 'pharmacy',
          }] : []),
        ],
        recentActivities: recentDispensing.map((item: any) => ({
          id: String(item._id),
          type: 'pharmacy',
          title: item.dispensingNumber || 'Dispensing',
          description: `${item.patientName} - ${item.status}`,
          time: formatTimeAgo(item.createdAt),
          createdAt: item.createdAt,
          status: item.paymentStatus,
        })),
        upcomingAppointments: [],
      });
    }

    if (role === 'doctor') {
      const doctorUser = await User.findOne({ email: session.user.email }).lean() as any;
      const doctorId = doctorUser?._id;
      const doctorIdentity = [session.user.id, session.user.email, doctorUser?.name || session.user.name].filter(Boolean);
      const doctorAppointmentOr: any[] = [
        { doctorEmail: session.user.email },
        { doctorName: doctorUser?.name || session.user.name },
      ];
      if (doctorId) doctorAppointmentOr.push({ doctorId });

      const doctorAppointmentMatch = { $or: doctorAppointmentOr };
      const doctorReportMatch = {
        $or: [
          { doctorId: { $in: doctorIdentity.map(String) } },
          { doctorName: doctorUser?.name || session.user.name },
        ],
      };

      // Read only what the dashboard needs, in parallel (was: every appointment loaded into memory, one query after another).
      const [recentDoctorAppointments, apptPatientIds, apptPatientEmails, apptPatientNames, telemedicinePatientIds] = await Promise.all([
        Appointment.find(doctorAppointmentMatch)
          .sort({ createdAt: -1 })
          .limit(5)
          .select('patientName appointmentTime status createdAt')
          .lean(),
        Appointment.distinct('patientId', doctorAppointmentMatch),
        Appointment.distinct('patientEmail', doctorAppointmentMatch),
        Appointment.distinct('patientName', doctorAppointmentMatch),
        doctorId ? TelemedicineSession.distinct('patientId', { doctorId }) : Promise.resolve([] as any[]),
      ]);
      const telemedicinePatients = telemedicinePatientIds.length > 0
        ? await Patient.find({ _id: { $in: telemedicinePatientIds } }).select('_id patientId name email').lean()
        : [];

      const patientIds = new Set<string>();
      const patientEmails = new Set<string>();
      const patientNames = new Set<string>();
      apptPatientIds.forEach((v: any) => { if (v) patientIds.add(String(v)); });
      apptPatientEmails.forEach((v: any) => { if (v) patientEmails.add(String(v).toLowerCase()); });
      apptPatientNames.forEach((v: any) => { if (v) patientNames.add(String(v)); });
      telemedicinePatients.forEach((patient: any) => {
        if (patient._id) patientIds.add(String(patient._id));
        if (patient.patientId) patientIds.add(String(patient.patientId));
        if (patient.email) patientEmails.add(String(patient.email).toLowerCase());
        if (patient.name) patientNames.add(String(patient.name));
      });

      const patientFilters: any[] = [];
      if (patientIds.size > 0) patientFilters.push({ patientId: { $in: Array.from(patientIds) } });
      if (patientEmails.size > 0) patientFilters.push({ patientEmail: { $in: Array.from(patientEmails) } });
      if (patientNames.size > 0) patientFilters.push({ patientName: { $in: Array.from(patientNames) } });
      patientFilters.push({ createdBy: { $in: doctorIdentity.map(String) } });

      const invoiceMatch = {
        status: 'paid',
        $or: patientFilters,
      };

      const [
        totalDoctorPatients,
        appointmentsToday,
        appointmentsLastMonth,
        totalReports,
        reportsLastMonth,
        todayRevenue,
        monthlyRevenue,
        previousMonthlyRevenue,
        pendingInvoices,
        pendingLabTests,
        urgentLabTests,
        activeTelemedicineSessions,
        waitingTelemedicineSessions,
        recentReports,
        recentTelemedicine,
      ] = await Promise.all([
        Patient.countDocuments({
          $or: [
            { patientId: { $in: Array.from(patientIds) } },
            { email: { $in: Array.from(patientEmails) } },
            { name: { $in: Array.from(patientNames) } },
          ],
        }),
        Appointment.countDocuments({ ...doctorAppointmentMatch, appointmentDate: { $gte: startOfToday, $lt: endOfToday }, status: { $ne: 'cancelled' } }),
        Appointment.countDocuments({ ...doctorAppointmentMatch, appointmentDate: { $gte: startOfLastMonth, $lt: endOfLastMonth }, status: { $ne: 'cancelled' } }),
        Report.countDocuments(doctorReportMatch),
        Report.countDocuments({ ...doctorReportMatch, createdAt: { $gte: startOfLastMonth, $lt: endOfLastMonth } }),
        Invoice.aggregate([
          { $match: { ...invoiceMatch, updatedAt: { $gte: startOfToday, $lt: endOfToday } } },
          { $group: { _id: null, total: { $sum: '$total' } } }
        ]),
        Invoice.aggregate([
          { $match: { ...invoiceMatch, updatedAt: { $gte: startOfMonth, $lt: endOfToday } } },
          { $group: { _id: null, total: { $sum: '$total' } } }
        ]),
        Invoice.aggregate([
          { $match: { ...invoiceMatch, updatedAt: { $gte: startOfLastMonth, $lt: endOfLastMonth } } },
          { $group: { _id: null, total: { $sum: '$total' } } }
        ]),
        Invoice.countDocuments({ status: { $in: ['pending', 'partial'] }, $or: patientFilters }),
        LabTest.countDocuments({ doctorId: { $in: doctorIdentity.map(String) }, status: { $in: ['pending', 'sample-collected', 'in-progress'] } }),
        LabTest.countDocuments({ doctorId: { $in: doctorIdentity.map(String) }, status: { $in: ['pending', 'sample-collected', 'in-progress'] }, priority: { $in: ['urgent', 'stat'] } }),
        doctorId ? TelemedicineSession.countDocuments({ doctorId, status: 'in-progress' }) : 0,
        doctorId ? TelemedicineSession.countDocuments({ doctorId, status: 'waiting' }) : 0,
        Report.find(doctorReportMatch).sort({ createdAt: -1 }).limit(5).select('_id patientName doctorName reportType status createdAt'),
        doctorId
          ? TelemedicineSession.find({ doctorId }).populate('patientId', 'name').sort({ createdAt: -1 }).limit(5).select('_id sessionNumber patientId status createdAt')
          : [],
      ]);

      const calculateChange = (current: number, previous: number) => {
        if (previous === 0) return current > 0 ? '+100%' : '0%';
        const change = ((current - previous) / previous) * 100;
        const sign = change >= 0 ? '+' : '';
        return `${sign}${Math.round(change)}%`;
      };

      const monthlyTotal = monthlyRevenue[0]?.total || 0;
      const previousMonthlyTotal = previousMonthlyRevenue[0]?.total || 0;

      const recentActivities: any[] = [];
      recentDoctorAppointments.forEach((appointment: any) => {
        recentActivities.push({
          id: String(appointment._id),
          type: 'appointment',
          title: `Appointment: ${appointment.patientName}`,
          description: `${appointment.appointmentTime || 'Scheduled'} - ${appointment.status}`,
          time: formatTimeAgo(appointment.createdAt),
          createdAt: appointment.createdAt,
          status: appointment.status,
        });
      });
      recentReports.forEach((report: any) => {
        recentActivities.push({
          id: String(report._id),
          type: 'report',
          title: 'Report generated',
          description: `${report.patientName} - ${report.reportType}`,
          time: formatTimeAgo(report.createdAt),
          createdAt: report.createdAt,
          status: report.status,
        });
      });
      recentTelemedicine.forEach((tm: any) => {
        recentActivities.push({
          id: String(tm._id),
          type: 'telemedicine',
          title: `Telemedicine: ${tm.sessionNumber}`,
          description: `${tm.patientId?.name || 'Patient'} - ${String(tm.status).replace('-', ' ')}`,
          time: formatTimeAgo(tm.createdAt),
          createdAt: tm.createdAt,
          status: tm.status,
        });
      });
      recentActivities.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      const upcomingAppointments = await Appointment.find({
        ...doctorAppointmentMatch,
        appointmentDate: { $gte: startOfToday },
        status: { $in: ['scheduled', 'confirmed'] }
      })
        .sort({ appointmentDate: 1, appointmentTime: 1 })
        .limit(5)
        .select('_id patientName appointmentTime appointmentType status appointmentDate');

      return NextResponse.json({
        dashboardRole: 'doctor',
        stats: [
          {
            name: 'myPatients',
            value: totalDoctorPatients.toString(),
            change: '0%',
            changeType: 'neutral',
          },
          {
            name: 'appointmentsToday',
            value: appointmentsToday.toString(),
            change: calculateChange(appointmentsToday, appointmentsLastMonth),
            changeType: appointmentsToday >= appointmentsLastMonth ? 'positive' : 'negative',
          },
          {
            name: 'reportsGenerated',
            value: totalReports.toString(),
            change: calculateChange(totalReports, reportsLastMonth),
            changeType: totalReports >= reportsLastMonth ? 'positive' : 'negative',
          },
          {
            name: 'monthlyRevenue',
            value: formatCurrencyAmount(monthlyTotal, systemCurrency),
            change: calculateChange(monthlyTotal, previousMonthlyTotal),
            changeType: monthlyTotal >= previousMonthlyTotal ? 'positive' : 'negative',
          },
        ],
        operationalStats: {
          billing: { pendingInvoices, todayRevenue: todayRevenue[0]?.total || 0, monthlyRevenue: monthlyTotal },
          laboratory: { pending: pendingLabTests, urgent: urgentLabTests, criticalResults: 0 },
          telemedicine: { active: activeTelemedicineSessions, waiting: waitingTelemedicineSessions },
        },
        criticalAlerts: urgentLabTests > 0
          ? [{
              id: 'urgent-lab',
              type: 'info',
              titleKey: urgentLabTests > 1 ? 'urgentLabTestPlural' : 'urgentLabTest',
              descriptionKey: 'pendingProcessing',
              count: urgentLabTests,
              link: '/lab?priority=urgent',
              icon: 'lab',
            }]
          : [],
        recentActivities: recentActivities.slice(0, 10),
        upcomingAppointments: upcomingAppointments.map((appointment: any) => ({
          id: appointment._id.toString(),
          patient: appointment.patientName || 'Unknown Patient',
          time: appointment.appointmentTime || 'N/A',
          type: appointment.appointmentType || 'consultation',
          status: appointment.status === 'confirmed' ? 'confirmed' : 'pending',
        })),
      });
    }

    // Admin / staff / nurse overview (virtual hospital: patients, doctors, bookings, revenue)
    const [
      totalPatients,
      totalDoctors,
      pendingApprovals,
      appointmentsToday,
      appointmentsLastMonth,
      upcomingBookings,
      pendingLabTests,
      activeTelemedicineSessions,
      waitingTelemedicineSessions,
      todayRevenue,
      monthlyRevenue,
      previousMonthlyRevenue,
      pendingInvoices,
      lowStockMedicines,
      recentAppointments,
      recentPatients,
    ] = await Promise.all([
      Patient.countDocuments(),
      User.countDocuments({ role: 'doctor', approvalStatus: 'approved' }),
      User.countDocuments({ role: { $in: ['doctor', 'staff', 'nurse', 'pharmacy'] }, approvalStatus: { $in: ['pending_profile', 'pending_verification'] } }),
      Appointment.countDocuments({ appointmentDate: { $gte: startOfToday, $lt: endOfToday }, status: { $ne: 'cancelled' } }),
      Appointment.countDocuments({ appointmentDate: { $gte: startOfLastMonth, $lt: endOfLastMonth }, status: { $ne: 'cancelled' } }),
      Appointment.countDocuments({ appointmentDate: { $gte: startOfToday }, status: { $in: ['scheduled', 'confirmed'] } }),
      LabTest.countDocuments({ status: { $in: ['pending', 'sample-collected', 'in-progress'] } }),
      TelemedicineSession.countDocuments({ status: 'in-progress' }),
      TelemedicineSession.countDocuments({ status: 'waiting' }),
      Invoice.aggregate([{ $match: { status: 'paid', updatedAt: { $gte: startOfToday, $lt: endOfToday } } }, { $group: { _id: null, total: { $sum: '$total' } } }]),
      Invoice.aggregate([{ $match: { status: 'paid', updatedAt: { $gte: startOfMonth, $lt: endOfToday } } }, { $group: { _id: null, total: { $sum: '$total' } } }]),
      Invoice.aggregate([{ $match: { status: 'paid', updatedAt: { $gte: startOfLastMonth, $lt: endOfLastMonth } } }, { $group: { _id: null, total: { $sum: '$total' } } }]),
      Invoice.countDocuments({ status: { $in: ['pending', 'partial'] } }),
      Medicine.countDocuments({ $expr: { $lte: ['$currentStock', '$reorderLevel'] }, isActive: true }),
      Appointment.find().sort({ createdAt: -1 }).limit(6).select('_id patientName doctorName appointmentTime status createdAt').lean(),
      Patient.find().sort({ createdAt: -1 }).limit(4).select('_id name patientId createdAt').lean(),
    ]);

    const calculateChange = (current: number, previous: number) => {
      if (previous === 0) return current > 0 ? '+100%' : '0%';
      const change = ((current - previous) / previous) * 100;
      return `${change >= 0 ? '+' : ''}${Math.round(change)}%`;
    };
    const monthlyTotal = monthlyRevenue[0]?.total || 0;
    const previousMonthlyTotal = previousMonthlyRevenue[0]?.total || 0;

    const recentActivities: any[] = [];
    recentAppointments.forEach((appointment: any) => {
      recentActivities.push({
        id: String(appointment._id),
        type: 'appointment',
        title: `Booking: ${appointment.patientName || 'Patient'}`,
        description: `${appointment.doctorName ? `Dr. ${appointment.doctorName}` : 'Doctor'} - ${appointment.appointmentTime || 'Scheduled'} - ${appointment.status}`,
        time: formatTimeAgo(appointment.createdAt),
        createdAt: appointment.createdAt,
        status: appointment.status,
      });
    });
    recentPatients.forEach((patient: any) => {
      recentActivities.push({
        id: String(patient._id),
        type: 'patient',
        title: 'New patient joined',
        description: `${patient.name} (${patient.patientId || 'ID pending'})`,
        time: formatTimeAgo(patient.createdAt),
        createdAt: patient.createdAt,
      });
    });
    recentActivities.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const criticalAlerts: any[] = [];
    if (pendingApprovals > 0) {
      criticalAlerts.push({
        id: 'pending-approvals',
        type: 'warning',
        titleKey: pendingApprovals > 1 ? 'pendingApprovalPlural' : 'pendingApproval',
        descriptionKey: 'requiresReview',
        count: pendingApprovals,
        link: '/doctors',
        icon: 'doctor',
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
        icon: 'pharmacy',
      });
    }

    const upcomingAppointments = await Appointment.find({
      appointmentDate: { $gte: startOfToday },
      status: { $in: ['scheduled', 'confirmed'] },
    })
      .sort({ appointmentDate: 1, appointmentTime: 1 })
      .limit(5)
      .select('_id patientName appointmentTime appointmentType status appointmentDate');

    return NextResponse.json({
      dashboardRole: role === 'admin' ? 'admin' : role,
      stats: [
        { name: 'totalPatients', value: String(totalPatients), change: '0%', changeType: 'neutral' },
        { name: 'totalDoctors', value: String(totalDoctors), change: `${pendingApprovals} pending`, changeType: pendingApprovals > 0 ? 'negative' : 'neutral' },
        { name: 'appointmentsToday', value: String(appointmentsToday), change: calculateChange(appointmentsToday, appointmentsLastMonth), changeType: appointmentsToday >= appointmentsLastMonth ? 'positive' : 'negative' },
        { name: 'upcomingAppointments', value: String(upcomingBookings), change: '0%', changeType: 'neutral' },
        { name: 'monthlyRevenue', value: formatCurrencyAmount(monthlyTotal, systemCurrency), change: calculateChange(monthlyTotal, previousMonthlyTotal), changeType: monthlyTotal >= previousMonthlyTotal ? 'positive' : 'negative' },
      ],
      operationalStats: {
        billing: { pendingInvoices, todayRevenue: todayRevenue[0]?.total || 0, monthlyRevenue: monthlyTotal },
        laboratory: { pending: pendingLabTests, urgent: 0, criticalResults: 0 },
        telemedicine: { active: activeTelemedicineSessions, waiting: waitingTelemedicineSessions },
        pharmacy: { lowStock: lowStockMedicines },
      },
      criticalAlerts,
      recentActivities: recentActivities.slice(0, 10),
      upcomingAppointments: upcomingAppointments.map((appointment: any) => ({
        id: appointment._id.toString(),
        patient: appointment.patientName || 'Unknown Patient',
        time: appointment.appointmentTime || 'N/A',
        type: appointment.appointmentType || 'consultation',
        status: appointment.status === 'confirmed' ? 'confirmed' : 'pending',
      })),
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
