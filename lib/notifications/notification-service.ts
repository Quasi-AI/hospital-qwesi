import dbConnect from '@/lib/mongodb';
import Notification, { INotification } from '@/models/Notification';
import Settings from '@/models/Settings';
import Appointment from '@/models/Appointment';
import LabTest from '@/models/LabTest';
import Invoice from '@/models/Invoice';
import Patient from '@/models/Patient';
import { sendEmail } from './email-provider';
import { sendSMS } from './sms-provider';
import { getTemplate, TemplateData } from './templates';

export interface CreateNotificationOptions {
  type: INotification['type'];
  recipientId: string;
  recipientType: 'user' | 'patient';
  recipientEmail?: string;
  recipientPhone?: string;
  title: string;
  message: string;
  channels?: ('email' | 'sms' | 'in_app')[];
  priority?: INotification['priority'];
  scheduledFor?: Date;
  relatedEntity?: { type: string; id: string };
  metadata?: Record<string, any>;
  sendImmediately?: boolean;
}

export interface NotificationResult {
  success: boolean;
  notificationId?: string;
  error?: string;
  deliveryStatus?: INotification['deliveryStatus'];
}

/** Resolve patient whether `patientId` on the appointment is a Mongo `_id` or a display `patientId`. */
async function findPatientForAppointment(
  patientId?: string | null,
  patientEmail?: string | null
) {
  const pid = patientId != null ? String(patientId).trim() : '';
  if (pid && /^[a-f0-9]{24}$/i.test(pid)) {
    const byId = await Patient.findById(pid);
    if (byId) return byId;
  }
  if (pid) {
    const byDisplay = await Patient.findOne({ patientId: pid });
    if (byDisplay) return byDisplay;
  }
  if (patientEmail) {
    return Patient.findOne({ email: String(patientEmail).toLowerCase().trim() });
  }
  return null;
}

async function getSettings() {
  await dbConnect();
  return Settings.findOne({});
}

async function getClinicInfo() {
  const settings = await getSettings();
  return {
    clinicName: settings?.systemTitle || 'Healthcare Clinic',
    clinicPhone: settings?.address?.phone || '',
    clinicEmail: settings?.address?.email || '',
  };
}

export async function createNotification(options: CreateNotificationOptions): Promise<NotificationResult> {
  try {
    await dbConnect();
    
    const settings = await getSettings();
    const defaultChannels: ('email' | 'sms' | 'in_app')[] = ['in_app'];
    
    if (settings?.emailNotifications && options.recipientEmail) {
      defaultChannels.push('email');
    }
    if (settings?.smsNotifications && options.recipientPhone) {
      defaultChannels.push('sms');
    }
    
    const notification = new Notification({
      type: options.type,
      recipientId: options.recipientId,
      recipientType: options.recipientType,
      recipientEmail: options.recipientEmail,
      recipientPhone: options.recipientPhone,
      title: options.title,
      message: options.message,
      channels: options.channels || defaultChannels,
      priority: options.priority || 'normal',
      scheduledFor: options.scheduledFor,
      relatedEntity: options.relatedEntity,
      metadata: options.metadata,
      status: options.scheduledFor && options.scheduledFor > new Date() ? 'pending' : 'pending',
      deliveryStatus: {
        email: { sent: false },
        sms: { sent: false },
        inApp: { sent: false },
      },
    });
    
    await notification.save();
    
    // Send immediately if not scheduled for future
    if (options.sendImmediately !== false && (!options.scheduledFor || options.scheduledFor <= new Date())) {
      const result = await sendNotification(notification._id.toString());
      return {
        success: true,
        notificationId: notification._id.toString(),
        deliveryStatus: result.deliveryStatus,
      };
    }
    
    return {
      success: true,
      notificationId: notification._id.toString(),
    };
  } catch (error: any) {
    console.error('Create notification error:', error);
    return {
      success: false,
      error: error.message || 'Failed to create notification',
    };
  }
}

export async function sendNotification(notificationId: string): Promise<NotificationResult> {
  try {
    await dbConnect();
    
    const notification = await Notification.findById(notificationId);
    if (!notification) {
      return { success: false, error: 'Notification not found' };
    }
    
    if (notification.status === 'sent') {
      return { success: true, notificationId, deliveryStatus: notification.deliveryStatus };
    }
    
    const deliveryStatus: INotification['deliveryStatus'] = {
      email: notification.deliveryStatus?.email || { sent: false },
      sms: notification.deliveryStatus?.sms || { sent: false },
      inApp: notification.deliveryStatus?.inApp || { sent: false },
    };
    
    let hasFailure = false;
    let hasSuccess = false;
    
    // Send via email
    if (notification.channels.includes('email') && notification.recipientEmail && !deliveryStatus.email?.sent) {
      const emailResult = await sendEmail({
        to: notification.recipientEmail,
        subject: notification.title,
        html: notification.metadata?.emailHtml || `<p>${notification.message}</p>`,
        text: notification.message,
      });
      
      deliveryStatus.email = {
        sent: emailResult.success,
        sentAt: emailResult.success ? new Date() : undefined,
        error: emailResult.error,
      };
      
      if (emailResult.success) hasSuccess = true;
      else hasFailure = true;
    }
    
    // Send via SMS
    if (notification.channels.includes('sms') && notification.recipientPhone && !deliveryStatus.sms?.sent) {
      const smsResult = await sendSMS({
        to: notification.recipientPhone,
        message: notification.metadata?.smsText || notification.message,
      });
      
      deliveryStatus.sms = {
        sent: smsResult.success,
        sentAt: smsResult.success ? new Date() : undefined,
        error: smsResult.error,
      };
      
      if (smsResult.success) hasSuccess = true;
      else hasFailure = true;
    }
    
    // Mark in-app as sent
    if (notification.channels.includes('in_app')) {
      deliveryStatus.inApp = {
        sent: true,
        sentAt: new Date(),
      };
      hasSuccess = true;
    }
    
    // Update notification status
    let newStatus: INotification['status'] = 'pending';
    if (hasSuccess && !hasFailure) {
      newStatus = 'sent';
    } else if (hasSuccess && hasFailure) {
      newStatus = 'sent'; // Partial success
    } else if (hasFailure && !hasSuccess) {
      newStatus = 'failed';
    }
    
    await Notification.findByIdAndUpdate(notificationId, {
      status: newStatus,
      deliveryStatus,
      sentAt: hasSuccess ? new Date() : undefined,
      retryCount: hasFailure ? notification.retryCount + 1 : notification.retryCount,
    });
    
    return {
      success: hasSuccess,
      notificationId,
      deliveryStatus,
      error: hasFailure ? 'Some channels failed' : undefined,
    };
  } catch (error: any) {
    console.error('Send notification error:', error);
    return {
      success: false,
      error: error.message || 'Failed to send notification',
    };
  }
}

export async function markAsRead(notificationId: string, userId: string): Promise<boolean> {
  try {
    await dbConnect();
    
    const result = await Notification.findOneAndUpdate(
      { _id: notificationId, recipientId: userId },
      { status: 'read', readAt: new Date() }
    );
    
    return !!result;
  } catch (error) {
    console.error('Mark as read error:', error);
    return false;
  }
}

export async function getUserNotifications(
  userId: string,
  options: { status?: string; type?: string; limit?: number; skip?: number } = {}
) {
  try {
    await dbConnect();
    
    const query: any = { recipientId: userId };
    if (options.status) query.status = options.status;
    if (options.type) query.type = options.type;
    
    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .skip(options.skip || 0)
      .limit(options.limit || 50);
    
    const total = await Notification.countDocuments(query);
    const unreadCount = await Notification.countDocuments({ ...query, status: { $ne: 'read' } });
    
    return { notifications, total, unreadCount };
  } catch (error) {
    console.error('Get user notifications error:', error);
    return { notifications: [], total: 0, unreadCount: 0 };
  }
}

export async function processScheduledNotifications(): Promise<{ processed: number; sent: number; failed: number }> {
  try {
    await dbConnect();
    
    const now = new Date();
    const pendingNotifications = await Notification.find({
      status: 'pending',
      scheduledFor: { $lte: now },
    }).limit(100);
    
    let sent = 0;
    let failed = 0;
    
    for (const notification of pendingNotifications) {
      const result = await sendNotification(notification._id.toString());
      if (result.success) sent++;
      else failed++;
    }
    
    return { processed: pendingNotifications.length, sent, failed };
  } catch (error) {
    console.error('Process scheduled notifications error:', error);
    return { processed: 0, sent: 0, failed: 0 };
  }
}

export async function retryFailedNotifications(): Promise<{ processed: number; sent: number; failed: number }> {
  try {
    await dbConnect();
    
    const failedNotifications = await Notification.find({
      status: 'failed',
      retryCount: { $lt: 3 },
    }).limit(50);
    
    let sent = 0;
    let failed = 0;
    
    for (const notification of failedNotifications) {
      const result = await sendNotification(notification._id.toString());
      if (result.success) sent++;
      else failed++;
    }
    
    return { processed: failedNotifications.length, sent, failed };
  } catch (error) {
    console.error('Retry failed notifications error:', error);
    return { processed: 0, sent: 0, failed: 0 };
  }
}

// Notification type-specific handlers

export async function sendAppointmentReminder(appointmentId: string): Promise<NotificationResult> {
  try {
    await dbConnect();
    
    const appointment = await Appointment.findById(appointmentId);
    if (!appointment) {
      return { success: false, error: 'Appointment not found' };
    }
    
    const patient = await findPatientForAppointment(
      appointment.patientId?.toString(),
      appointment.patientEmail
    );
    const clinicInfo = await getClinicInfo();
    
    const templateData: TemplateData = {
      patientName: appointment.patientName || patient?.name,
      doctorName: appointment.doctorName,
      appointmentDate: new Date(appointment.date).toLocaleDateString(),
      appointmentTime: appointment.time,
      location: appointment.location,
      ...clinicInfo,
    };
    
    const template = getTemplate('appointment_reminder', templateData);
    
    return createNotification({
      type: 'appointment_reminder',
      recipientId: appointment.patientId,
      recipientType: 'patient',
      recipientEmail: appointment.patientEmail || patient?.email,
      recipientPhone: appointment.patientPhone || patient?.phone,
      title: template.subject,
      message: template.sms,
      relatedEntity: { type: 'appointment', id: appointmentId },
      metadata: {
        emailHtml: template.html,
        smsText: template.sms,
        appointmentId,
      },
    });
  } catch (error: any) {
    console.error('Send appointment reminder error:', error);
    return { success: false, error: error.message };
  }
}

export async function sendLabResultNotification(labTestId: string): Promise<NotificationResult> {
  try {
    await dbConnect();
    
    const labTest = await LabTest.findById(labTestId);
    if (!labTest) {
      return { success: false, error: 'Lab test not found' };
    }
    
    const patient = await Patient.findById(labTest.patientId);
    const clinicInfo = await getClinicInfo();
    
    const templateData: TemplateData = {
      patientName: labTest.patientName || patient?.name,
      testName: labTest.testName,
      testNumber: labTest.testNumber,
      ...clinicInfo,
    };
    
    const template = getTemplate('lab_result', templateData);
    
    return createNotification({
      type: 'lab_result',
      recipientId: labTest.patientId,
      recipientType: 'patient',
      recipientEmail: labTest.patientEmail || patient?.email,
      recipientPhone: labTest.patientPhone || patient?.phone,
      title: template.subject,
      message: template.sms,
      priority: labTest.isCritical ? 'urgent' : 'normal',
      relatedEntity: { type: 'labTest', id: labTestId },
      metadata: {
        emailHtml: template.html,
        smsText: template.sms,
        labTestId,
        isCritical: labTest.isCritical,
      },
    });
  } catch (error: any) {
    console.error('Send lab result notification error:', error);
    return { success: false, error: error.message };
  }
}

export async function sendPaymentDueReminder(invoiceId: string): Promise<NotificationResult> {
  try {
    await dbConnect();
    
    const invoice = await Invoice.findById(invoiceId);
    if (!invoice) {
      return { success: false, error: 'Invoice not found' };
    }
    
    const patient = await Patient.findById(invoice.patientId);
    const settings = await getSettings();
    const clinicInfo = await getClinicInfo();
    
    const templateData: TemplateData = {
      patientName: invoice.patientName || patient?.name,
      amount: invoice.totalAmount?.toFixed(2) || invoice.grandTotal?.toFixed(2),
      currency: settings?.currency || '$',
      dueDate: invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : undefined,
      invoiceNumber: invoice.invoiceNumber,
      ...clinicInfo,
    };
    
    const template = getTemplate('payment_due', templateData);
    
    return createNotification({
      type: 'payment_due',
      recipientId: invoice.patientId,
      recipientType: 'patient',
      recipientEmail: invoice.patientEmail || patient?.email,
      recipientPhone: invoice.patientPhone || patient?.phone,
      title: template.subject,
      message: template.sms,
      relatedEntity: { type: 'invoice', id: invoiceId },
      metadata: {
        emailHtml: template.html,
        smsText: template.sms,
        invoiceId,
        amount: templateData.amount,
      },
    });
  } catch (error: any) {
    console.error('Send payment due reminder error:', error);
    return { success: false, error: error.message };
  }
}

export async function sendMedicationReminder(
  patientId: string,
  medicationData: { name: string; dosage?: string; instructions?: string }
): Promise<NotificationResult> {
  try {
    await dbConnect();
    
    const patient = await Patient.findById(patientId);
    if (!patient) {
      return { success: false, error: 'Patient not found' };
    }
    
    const clinicInfo = await getClinicInfo();
    
    const templateData: TemplateData = {
      patientName: patient.name,
      medicationName: medicationData.name,
      dosage: medicationData.dosage,
      instructions: medicationData.instructions,
      ...clinicInfo,
    };
    
    const template = getTemplate('medication_reminder', templateData);
    
    return createNotification({
      type: 'medication_reminder',
      recipientId: patientId,
      recipientType: 'patient',
      recipientEmail: patient.email,
      recipientPhone: patient.phone,
      title: template.subject,
      message: template.sms,
      metadata: {
        emailHtml: template.html,
        smsText: template.sms,
        medication: medicationData,
      },
    });
  } catch (error: any) {
    console.error('Send medication reminder error:', error);
    return { success: false, error: error.message };
  }
}

export async function sendFollowUpReminder(appointmentId: string): Promise<NotificationResult> {
  try {
    await dbConnect();
    
    const appointment = await Appointment.findById(appointmentId);
    if (!appointment) {
      return { success: false, error: 'Appointment not found' };
    }
    
    const patient = await findPatientForAppointment(
      appointment.patientId?.toString(),
      appointment.patientEmail
    );
    const clinicInfo = await getClinicInfo();
    
    const templateData: TemplateData = {
      patientName: appointment.patientName || patient?.name,
      doctorName: appointment.doctorName,
      ...clinicInfo,
    };
    
    const template = getTemplate('follow_up', templateData);
    
    return createNotification({
      type: 'follow_up',
      recipientId: appointment.patientId,
      recipientType: 'patient',
      recipientEmail: appointment.patientEmail || patient?.email,
      recipientPhone: appointment.patientPhone || patient?.phone,
      title: template.subject,
      message: template.sms,
      relatedEntity: { type: 'appointment', id: appointmentId },
      metadata: {
        emailHtml: template.html,
        smsText: template.sms,
        originalAppointmentId: appointmentId,
      },
    });
  } catch (error: any) {
    console.error('Send follow-up reminder error:', error);
    return { success: false, error: error.message };
  }
}

export async function scheduleAppointmentReminder(appointmentId: string, reminderMinutes?: number): Promise<NotificationResult> {
  try {
    await dbConnect();
    
    const appointment = await Appointment.findById(appointmentId);
    if (!appointment) {
      return { success: false, error: 'Appointment not found' };
    }
    
    const settings = await getSettings();
    const minutes = reminderMinutes || settings?.reminderTime || 30;
    
    // Calculate scheduled time
    const appointmentDateTime = new Date(`${appointment.date}T${appointment.time}`);
    const scheduledFor = new Date(appointmentDateTime.getTime() - minutes * 60 * 1000);
    
    // Don't schedule if the time has already passed
    if (scheduledFor <= new Date()) {
      return { success: false, error: 'Reminder time has already passed' };
    }
    
    const patient = await findPatientForAppointment(
      appointment.patientId?.toString(),
      appointment.patientEmail
    );
    const clinicInfo = await getClinicInfo();
    
    const templateData: TemplateData = {
      patientName: appointment.patientName || patient?.name,
      doctorName: appointment.doctorName,
      appointmentDate: new Date(appointment.date).toLocaleDateString(),
      appointmentTime: appointment.time,
      location: appointment.location,
      ...clinicInfo,
    };
    
    const template = getTemplate('appointment_reminder', templateData);
    
    return createNotification({
      type: 'appointment_reminder',
      recipientId: appointment.patientId,
      recipientType: 'patient',
      recipientEmail: appointment.patientEmail || patient?.email,
      recipientPhone: appointment.patientPhone || patient?.phone,
      title: template.subject,
      message: template.sms,
      scheduledFor,
      relatedEntity: { type: 'appointment', id: appointmentId },
      metadata: {
        emailHtml: template.html,
        smsText: template.sms,
        appointmentId,
      },
      sendImmediately: false,
    });
  } catch (error: any) {
    console.error('Schedule appointment reminder error:', error);
    return { success: false, error: error.message };
  }
}
