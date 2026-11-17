import type { Appointment } from '../types/studio';

export class GmailAuthExpiredError extends Error {
  constructor(message = 'Gmail authorization expired or missing send permission.') {
    super(message);
    this.name = 'GmailAuthExpiredError';
  }
}

export type BookingEmailType = 'confirmed' | 'cancelled';

function escapeHtml(raw: string): string {
  return raw
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
}

function utf8ToBase64(text: string): string {
  const bytes = new TextEncoder().encode(text);
  return bytesToBase64(bytes);
}

function utf8ToBase64Url(text: string): string {
  return utf8ToBase64(text)
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replace(/=+$/u, '');
}

function encodeMimeSubject(subject: string): string {
  return `=?UTF-8?B?${utf8ToBase64(subject)}?=`;
}

function formatReadableDate(dateIso: string): string {
  const dt = new Date(`${dateIso}T12:00:00`);
  if (Number.isNaN(dt.getTime())) return dateIso;
  return dt.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

export function buildBookingEmailPreview(
  type: BookingEmailType,
  appointment: Appointment,
): { to: string; subject: string; readableDate: string } {
  const readableDate = formatReadableDate(appointment.date);
  const subject =
    type === 'confirmed'
      ? `Appointment Confirmed — ${readableDate} at ${appointment.timeSlot} (${appointment.bookingCode})`
      : `Appointment Cancelled — ${readableDate} at ${appointment.timeSlot} (${appointment.bookingCode})`;
  return {
    to: appointment.clientEmail.trim(),
    subject,
    readableDate,
  };
}

function buildBookingEmailHtml(
  type: BookingEmailType,
  appointment: Appointment,
  readableDate: string,
): string {
  const safeName = escapeHtml(appointment.clientName || 'Studio Guest');
  const safeCode = escapeHtml(appointment.bookingCode);
  const safeService = escapeHtml(appointment.serviceName);
  const safeArtist = escapeHtml(appointment.artistName);
  const safeShape = escapeHtml(appointment.nailShape);
  const safeShade = escapeHtml(appointment.shadePreference || 'Studio Match');
  const safeTime = escapeHtml(appointment.timeSlot);
  const safeDate = escapeHtml(readableDate);
  const addonsLine =
    appointment.addons && appointment.addons.length > 0
      ? escapeHtml(appointment.addons.join(', '))
      : 'None';

  const heading =
    type === 'confirmed'
      ? 'Your studio appointment is confirmed!'
      : 'Your studio appointment has been cancelled';
  const badgeText = type === 'confirmed' ? 'ACCEPTED & CONFIRMED' : 'BOOKING CANCELLED';
  const intro =
    type === 'confirmed'
      ? `Hi ${safeName}, great news — Love Those Nails by Eshin has accepted your appointment on <strong>${safeDate}</strong> at <strong>${safeTime}</strong>. See you there!`
      : `Hi ${safeName}, your appointment (${safeCode}) scheduled for <strong>${safeDate}</strong> at <strong>${safeTime}</strong> has been cancelled by the studio.`;
  const closing =
    type === 'confirmed'
      ? 'Please arrive 5 minutes early with bare nails if removal was not booked. Need to make a change? Visit your Client Portal on the studio site.'
      : 'If you would like to reschedule for another date or time, please visit the Love Those Nails by Eshin studio booking page anytime.';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>${escapeHtml(heading)}</title>
</head>
<body style="margin:0;padding:24px;background-color:#F2ECEB;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#141212;">
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:560px;margin:0 auto;background-color:#FAF6F5;border:1px solid #DED5D4;border-radius:18px;overflow:hidden;">
    <tr>
      <td style="padding:28px 28px 18px 28px;border-bottom:1px solid #DED5D4;">
        <p style="margin:0 0 6px 0;font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:#8A5A5C;font-weight:700;">
          LOVE THOSE NAILS BY ESHIN · ${badgeText}
        </p>
        <h1 style="margin:0;font-size:24px;line-height:1.25;color:#141212;font-weight:600;">
          ${escapeHtml(heading)}
        </h1>
      </td>
    </tr>
    <tr>
      <td style="padding:22px 28px;">
        <p style="margin:0 0 18px 0;font-size:14px;line-height:1.6;color:#3E3736;">
          ${intro}
        </p>
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color:#EFE8E7;border-radius:14px;padding:16px;">
          <tr>
            <td style="padding:6px 12px;font-size:12px;color:#554C4B;">Booking Code</td>
            <td style="padding:6px 12px;font-size:13px;color:#141212;font-weight:700;text-align:right;font-family:monospace;">${safeCode}</td>
          </tr>
          <tr>
            <td style="padding:6px 12px;font-size:12px;color:#554C4B;">Date &amp; Time</td>
            <td style="padding:6px 12px;font-size:13px;color:#141212;font-weight:600;text-align:right;">${safeDate} · ${safeTime}</td>
          </tr>
          <tr>
            <td style="padding:6px 12px;font-size:12px;color:#554C4B;">Treatment</td>
            <td style="padding:6px 12px;font-size:13px;color:#141212;font-weight:600;text-align:right;">${safeService}</td>
          </tr>
          <tr>
            <td style="padding:6px 12px;font-size:12px;color:#554C4B;">Artist</td>
            <td style="padding:6px 12px;font-size:13px;color:#141212;text-align:right;">${safeArtist}</td>
          </tr>
          <tr>
            <td style="padding:6px 12px;font-size:12px;color:#554C4B;">Shape &amp; Shade</td>
            <td style="padding:6px 12px;font-size:13px;color:#141212;text-align:right;">${safeShape} · ${safeShade}</td>
          </tr>
          <tr>
            <td style="padding:6px 12px;font-size:12px;color:#554C4B;">Add-Ons</td>
            <td style="padding:6px 12px;font-size:13px;color:#141212;text-align:right;">${addonsLine}</td>
          </tr>
          <tr>
            <td style="padding:8px 12px 4px 12px;font-size:12px;color:#554C4B;border-top:1px solid #DED5D4;">Estimated Total</td>
            <td style="padding:8px 12px 4px 12px;font-size:14px;color:#141212;font-weight:700;text-align:right;border-top:1px solid #DED5D4;">$${appointment.totalPrice}</td>
          </tr>
        </table>
        <p style="margin:18px 0 0 0;font-size:12px;line-height:1.6;color:#554C4B;">
          ${closing}
        </p>
      </td>
    </tr>
    <tr>
      <td style="padding:16px 28px;border-top:1px solid #DED5D4;font-size:11px;color:#6E6362;text-align:center;">
        Love Those Nails by Eshin · SoHo Studio
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export async function sendStudioBookingEmail(params: {
  accessToken: string;
  type: BookingEmailType;
  appointment: Appointment;
}): Promise<{ messageId: string }> {
  const { accessToken, type, appointment } = params;
  const { to, subject, readableDate } = buildBookingEmailPreview(type, appointment);

  if (!to || !to.includes('@') || /[\r\n]/u.test(to)) {
    throw new Error('Client appointment does not have a valid email address.');
  }

  const htmlBody = buildBookingEmailHtml(type, appointment, readableDate);
  const rawMime = [
    'From: Love Those Nails by Eshin <lovethosenailsbyeshin@gmail.com>',
    'Reply-To: Love Those Nails by Eshin <lovethosenailsbyeshin@gmail.com>',
    `To: ${to}`,
    `Subject: ${encodeMimeSubject(subject)}`,
    'MIME-Version: 1.0',
    'Content-Type: text/html; charset="UTF-8"',
    'Content-Transfer-Encoding: base64',
    '',
    utf8ToBase64(htmlBody),
  ].join('\r\n');

  const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      raw: utf8ToBase64Url(rawMime),
    }),
  });

  if (res.status === 401 || res.status === 403) {
    let googleMsg = '';
    try {
      const errBody = (await res.json()) as { error?: { message?: string } };
      googleMsg = errBody?.error?.message || '';
    } catch {
      // ignore parse errors
    }
    throw new GmailAuthExpiredError(
      googleMsg || 'Gmail send permission expired or not granted yet.',
    );
  }

  if (!res.ok) {
    let msg = `Gmail API error (${res.status})`;
    try {
      const errBody = (await res.json()) as { error?: { message?: string } };
      if (errBody?.error?.message) {
        msg = errBody.error.message;
      }
    } catch {
      // ignore parse errors
    }
    throw new Error(msg);
  }

  const data = (await res.json()) as { id?: string };
  return { messageId: data.id || 'sent' };
}
