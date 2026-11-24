/**
 * Send a WhatsApp message to a patient through the Qwesi AI backend (which owns the WhatsApp number).
 * Needs QWESI_BACKEND_URL and HOSPITAL_DASHBOARD_API_KEY. Set WHATSAPP_REMINDERS=false to switch it off.
 * Never throws: returns true only if the backend accepted the message.
 */
export async function sendWhatsApp(phone: string | undefined | null, message: string): Promise<boolean> {
  const base = (process.env.QWESI_BACKEND_URL || '').replace(/\/$/, '');
  const key = process.env.HOSPITAL_DASHBOARD_API_KEY;
  if (!base || !key || !phone || !message || process.env.WHATSAPP_REMINDERS === 'false') return false;
  const digits = String(phone).replace(/\D/g, '');
  if (digits.length < 9) return false;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  try {
    const res = await fetch(`${base}/api/hospital/whatsapp-notify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': key },
      body: JSON.stringify({ phone: digits, message }),
      signal: controller.signal,
    });
    return res.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}
