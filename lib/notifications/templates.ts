export interface TemplateData {
  patientName?: string;
  doctorName?: string;
  appointmentDate?: string;
  appointmentTime?: string;
  location?: string;
  testName?: string;
  testNumber?: string;
  amount?: string;
  currency?: string;
  dueDate?: string;
  invoiceNumber?: string;
  medicationName?: string;
  dosage?: string;
  instructions?: string;
  clinicName?: string;
  clinicPhone?: string;
  clinicEmail?: string;
  portalLink?: string;
  [key: string]: string | undefined;
}

export interface Template {
  subject: string;
  html: string;
  sms: string;
}

function getBaseEmailTemplate(content: string, clinicName: string = 'Healthcare Clinic'): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f5f5f5; }
    .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
    .header { background-color: #2563eb; color: white; padding: 24px; text-align: center; }
    .header h1 { margin: 0; font-size: 24px; font-weight: 600; }
    .content { padding: 32px 24px; }
    .footer { background-color: #f8fafc; padding: 24px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0; }
    .button { display: inline-block; background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 500; margin: 16px 0; }
    .info-box { background-color: #f0f9ff; border-left: 4px solid #2563eb; padding: 16px; margin: 16px 0; }
    .highlight { color: #2563eb; font-weight: 600; }
    .warning { background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; margin: 16px 0; }
    .urgent { background-color: #fee2e2; border-left: 4px solid #ef4444; padding: 16px; margin: 16px 0; }
    h2 { color: #1e293b; margin-top: 0; }
    p { margin: 0 0 16px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${clinicName}</h1>
    </div>
    <div class="content">
      ${content}
    </div>
    <div class="footer">
      <p>This is an automated message from ${clinicName}.</p>
      <p>Please do not reply directly to this email.</p>
    </div>
  </div>
</body>
</html>
`;
}

export function getAppointmentReminderTemplate(data: TemplateData): Template {
  const content = `
    <h2>Appointment Reminder</h2>
    <p>Dear ${data.patientName || 'Patient'},</p>
    <p>This is a friendly reminder about your upcoming appointment:</p>
    <div class="info-box">
      <p><strong>Doctor:</strong> ${data.doctorName || 'Your Healthcare Provider'}</p>
      <p><strong>Date:</strong> ${data.appointmentDate || 'Not specified'}</p>
      <p><strong>Time:</strong> ${data.appointmentTime || 'Not specified'}</p>
      ${data.location ? `<p><strong>Location:</strong> ${data.location}</p>` : ''}
    </div>
    <p>Please arrive 10-15 minutes early to complete any necessary paperwork.</p>
    <p>If you need to reschedule or cancel, please contact us at least 24 hours in advance.</p>
    ${data.clinicPhone ? `<p>Contact us: <span class="highlight">${data.clinicPhone}</span></p>` : ''}
  `;

  return {
    subject: `Appointment Reminder - ${data.appointmentDate || 'Upcoming'}`,
    html: getBaseEmailTemplate(content, data.clinicName),
    sms: `Reminder: You have an appointment with ${data.doctorName || 'your doctor'} on ${data.appointmentDate || ''} at ${data.appointmentTime || ''}. ${data.location ? `Location: ${data.location}` : ''} Reply HELP for assistance.`,
  };
}

export function getLabResultTemplate(data: TemplateData): Template {
  const content = `
    <h2>Lab Results Ready</h2>
    <p>Dear ${data.patientName || 'Patient'},</p>
    <p>Your lab test results are now available:</p>
    <div class="info-box">
      <p><strong>Test:</strong> ${data.testName || 'Laboratory Test'}</p>
      ${data.testNumber ? `<p><strong>Test Number:</strong> ${data.testNumber}</p>` : ''}
    </div>
    <p>Please log in to your patient portal to view your results, or contact our office to discuss them with your healthcare provider.</p>
    ${data.portalLink ? `<a href="${data.portalLink}" class="button">View Results</a>` : ''}
    <p>If you have any questions about your results, please don't hesitate to contact us.</p>
  `;

  return {
    subject: `Lab Results Ready - ${data.testName || 'Your Test'}`,
    html: getBaseEmailTemplate(content, data.clinicName),
    sms: `Your lab results for ${data.testName || 'your test'} are ready. Please log in to your patient portal or contact us to view your results.`,
  };
}

export function getPaymentDueTemplate(data: TemplateData): Template {
  const content = `
    <h2>Payment Due Reminder</h2>
    <p>Dear ${data.patientName || 'Patient'},</p>
    <p>This is a reminder that you have an outstanding balance:</p>
    <div class="warning">
      <p><strong>Amount Due:</strong> ${data.currency || '$'}${data.amount || '0.00'}</p>
      ${data.invoiceNumber ? `<p><strong>Invoice Number:</strong> ${data.invoiceNumber}</p>` : ''}
      ${data.dueDate ? `<p><strong>Due Date:</strong> ${data.dueDate}</p>` : ''}
    </div>
    <p>Please make your payment at your earliest convenience to avoid any late fees.</p>
    ${data.portalLink ? `<a href="${data.portalLink}" class="button">Pay Now</a>` : ''}
    <p>If you have already made this payment, please disregard this notice. If you have questions about your bill, please contact our billing department.</p>
  `;

  return {
    subject: `Payment Reminder - ${data.currency || '$'}${data.amount || '0.00'} Due`,
    html: getBaseEmailTemplate(content, data.clinicName),
    sms: `Payment reminder: You have an outstanding balance of ${data.currency || '$'}${data.amount || '0.00'}${data.dueDate ? ` due by ${data.dueDate}` : ''}. Please contact us to arrange payment.`,
  };
}

export function getMedicationReminderTemplate(data: TemplateData): Template {
  const content = `
    <h2>Medication Reminder</h2>
    <p>Dear ${data.patientName || 'Patient'},</p>
    <p>This is a reminder to take your medication:</p>
    <div class="info-box">
      <p><strong>Medication:</strong> ${data.medicationName || 'Your prescribed medication'}</p>
      ${data.dosage ? `<p><strong>Dosage:</strong> ${data.dosage}</p>` : ''}
      ${data.instructions ? `<p><strong>Instructions:</strong> ${data.instructions}</p>` : ''}
    </div>
    <p>Taking your medication as prescribed is important for your health. If you have any questions or concerns, please contact your healthcare provider.</p>
  `;

  return {
    subject: `Medication Reminder - ${data.medicationName || 'Your Medication'}`,
    html: getBaseEmailTemplate(content, data.clinicName),
    sms: `Medication reminder: Time to take ${data.medicationName || 'your medication'}${data.dosage ? ` (${data.dosage})` : ''}. ${data.instructions || ''}`,
  };
}

export function getFollowUpReminderTemplate(data: TemplateData): Template {
  const content = `
    <h2>Follow-Up Appointment Recommended</h2>
    <p>Dear ${data.patientName || 'Patient'},</p>
    <p>Based on your recent visit, it's time to schedule a follow-up appointment with ${data.doctorName || 'your healthcare provider'}.</p>
    <div class="info-box">
      <p>Regular follow-up visits are important for monitoring your health and ensuring the best possible outcomes.</p>
    </div>
    <p>Please contact our office to schedule your follow-up appointment at your earliest convenience.</p>
    ${data.clinicPhone ? `<p>Call us at: <span class="highlight">${data.clinicPhone}</span></p>` : ''}
    ${data.portalLink ? `<a href="${data.portalLink}" class="button">Schedule Appointment</a>` : ''}
  `;

  return {
    subject: 'Follow-Up Appointment Recommended',
    html: getBaseEmailTemplate(content, data.clinicName),
    sms: `Follow-up reminder: Please schedule your follow-up appointment with ${data.doctorName || 'your doctor'}. Contact us at ${data.clinicPhone || 'our office'} to book.`,
  };
}

export function getSystemNotificationTemplate(data: TemplateData & { title?: string; message?: string }): Template {
  const content = `
    <h2>${data.title || 'System Notification'}</h2>
    <p>Dear ${data.patientName || 'User'},</p>
    <div class="info-box">
      <p>${data.message || 'You have a new notification from the system.'}</p>
    </div>
    <p>If you have any questions, please contact support.</p>
  `;

  return {
    subject: data.title || 'System Notification',
    html: getBaseEmailTemplate(content, data.clinicName),
    sms: `${data.title || 'Notification'}: ${data.message || 'You have a new notification.'}`,
  };
}

export function getTemplate(
  type: 'appointment_reminder' | 'lab_result' | 'payment_due' | 'medication_reminder' | 'follow_up' | 'system',
  data: TemplateData
): Template {
  switch (type) {
    case 'appointment_reminder':
      return getAppointmentReminderTemplate(data);
    case 'lab_result':
      return getLabResultTemplate(data);
    case 'payment_due':
      return getPaymentDueTemplate(data);
    case 'medication_reminder':
      return getMedicationReminderTemplate(data);
    case 'follow_up':
      return getFollowUpReminderTemplate(data);
    case 'system':
    default:
      return getSystemNotificationTemplate(data);
  }
}
