import { initializeApp } from 'firebase-admin/app';
import { FieldValue, getFirestore, Timestamp } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions/v2';
import {
  onDocumentCreated,
  onDocumentUpdated,
} from 'firebase-functions/v2/firestore';
import { defineSecret, defineString } from 'firebase-functions/params';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import nodemailer from 'nodemailer';

const FIRESTORE_DB_ID = 'ai-studio-05dfd2db-0140-494c-b507-61fdd04bf7e3';
const STUDIO_NAME = 'Love Those Nails by Eshin';
const STUDIO_ADDRESS = '842 Rosemont Terrace, Suite 2B';

const SMTP_HOST = defineSecret('SMTP_HOST');
const SMTP_PORT = defineSecret('SMTP_PORT');
const SMTP_USER = defineSecret('SMTP_USER');
const SMTP_PASS = defineSecret('SMTP_PASS');
const STUDIO_FROM_EMAIL = defineString('STUDIO_FROM_EMAIL', {
  default: 'Love Those Nails by Eshin <bookings@lovethosenails.studio>',
});
const STUDIO_TIMEZONE = defineString('STUDIO_TIMEZONE', {
  default: 'America/Los_Angeles',
});

initializeApp();
const db = getFirestore(FIRESTORE_DB_ID);

interface AppointmentDoc {
  bookingCode: string;
  clientId: string;
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  serviceName: string;
  artistName: string;
  date: string; // YYYY-MM-DD
  timeSlot: string; // e.g., "10:00 AM"
  durationMin: number;
  totalPrice: number;
  nailShape: string;
  shadePreference: string;
  status: 'pending' | 'confirmed' | 'in_chair' | 'completed' | 'cancelled';
}

interface EmailLogDoc {
  appointmentId: string;
  clientId: string;
  clientEmail: string;
  bookingCode: string;
  date: string;
  timeSlot: string;
  confirmationSentAt: Timestamp | null;
  dayBeforeReminderSentAt: Timestamp | null;
  oneHourReminderSentAt: Timestamp | null;
  lastStatusNotified: string;
  lastError: string | null;
  updatedAt: Timestamp;
}

function createTransporter() {
  const host = SMTP_HOST.value();
  const port = Number(SMTP_PORT.value() || '587');
  const user = SMTP_USER.value();
  const pass = SMTP_PASS.value();

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderEmailHtml(params: {
  heading: string;
  lead: string;
  appt: AppointmentDoc;
  footerNote: string;
}): string {
  const heading = escapeHtml(params.heading);
  const lead = escapeHtml(params.lead);
  const footerNote = escapeHtml(params.footerNote);
  const bookingCode = escapeHtml(params.appt.bookingCode);
  const date = escapeHtml(params.appt.date);
  const timeSlot = escapeHtml(params.appt.timeSlot);
  const studioAddress = escapeHtml(STUDIO_ADDRESS);

  return `
  <div style="background-color:#FAF8F7;padding:32px 16px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#141212;">
    <div style="max-width:560px;margin:0 auto;background:#FFFFFF;border:1px solid #E5DCDA;">
      <div style="background:#D2AAAB;padding:28px 32px;text-align:center;">
        <div style="font-size:18px;font-weight:700;letter-spacing:0.08em;color:#141212;">LOVE THOSE NAILS</div>
        <div style="font-size:12px;letter-spacing:0.16em;color:#141212;margin-top:4px;">BY ESHIN</div>
      </div>
      <div style="padding:32px;">
        <h1 style="margin:0 0 12px;font-size:22px;font-weight:600;color:#141212;">${heading}</h1>
        <p style="margin:0 0 24px;font-size:14px;line-height:1.6;color:#5E5554;">${lead}</p>
        <div style="background:#FAF8F7;border:1px solid #E5DCDA;padding:20px;margin-bottom:24px;">
          <table style="width:100%;border-collapse:collapse;font-size:13px;">
            <tr>
              <td style="padding:6px 0;color:#5E5554;">Booking Code</td>
              <td style="padding:6px 0;text-align:right;font-family:monospace;font-weight:700;color:#141212;">${bookingCode}</td>
            </tr>
            <tr>
              <td style="padding:6px 0;color:#5E5554;">Date</td>
              <td style="padding:6px 0;text-align:right;font-family:monospace;font-weight:600;color:#141212;">${date}</td>
            </tr>
            <tr>
              <td style="padding:6px 0;color:#5E5554;">Chair Time</td>
              <td style="padding:6px 0;text-align:right;font-family:monospace;font-weight:600;color:#141212;">${timeSlot}</td>
            </tr>
            <tr>
              <td style="padding:6px 0;color:#5E5554;">Studio Location</td>
              <td style="padding:6px 0;text-align:right;color:#141212;">${studioAddress}</td>
            </tr>
          </table>
        </div>
        <p style="margin:0;font-size:12px;line-height:1.6;color:#5E5554;">${footerNote}</p>
      </div>
    </div>
  </div>`;
}

/**
 * Parse YYYY-MM-DD and "hh:mm AM/PM" in the configured studio timezone into a UTC Date.
 */
function parseStudioDateTime(dateStr: string, timeSlot: string, timeZone: string): Date | null {
  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr);
  const timeMatch = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i.exec(timeSlot.trim());
  if (!dateMatch || !timeMatch) return null;

  const year = Number(dateMatch[1]);
  const month = Number(dateMatch[2]);
  const day = Number(dateMatch[3]);
  let hour = Number(timeMatch[1]);
  const minute = Number(timeMatch[2]);
  const meridiem = timeMatch[3].toUpperCase();

  if (meridiem === 'PM' && hour !== 12) hour += 12;
  if (meridiem === 'AM' && hour === 12) hour = 0;

  // Approximate UTC first, then adjust by timezone offset at that instant
  const approxUtc = new Date(Date.UTC(year, month - 1, day, hour, minute, 0));
  const tzParts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).formatToParts(approxUtc);

  const getPart = (type: string) =>
    Number(tzParts.find((p) => p.type === type)?.value || '0');
  const renderedUtc = Date.UTC(
    getPart('year'),
    getPart('month') - 1,
    getPart('day'),
    getPart('hour') === 24 ? 0 : getPart('hour'),
    getPart('minute'),
    0,
  );
  const offsetMs = renderedUtc - approxUtc.getTime();
  return new Date(approxUtc.getTime() - offsetMs);
}

/**
 * 1. Initial Booking Email when an appointment is created in Firestore.
 *    - If status is 'pending' (client request), sends a "Booking Request Received" receipt and waits for Admin confirmation.
 *    - If status is 'confirmed' (admin walk-in), sends the official Booking Confirmation email immediately.
 */
export const onAppointmentCreated = onDocumentCreated(
  {
    document: 'appointments/{appointmentId}',
    database: FIRESTORE_DB_ID,
    secrets: [SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS],
  },
  async (event) => {
    const snap = event.data;
    if (!snap) return;

    const appointmentId = event.params.appointmentId;
    const appt = snap.data() as AppointmentDoc;
    const logRef = db.collection('emailLogs').doc(appointmentId);

    if (!appt.clientEmail) {
      logger.warn('Skipping booking email: missing clientEmail', { appointmentId });
      return;
    }

    const existingLog = await logRef.get();
    if (existingLog.exists && existingLog.data()?.lastStatusNotified) {
      return;
    }

    const isAlreadyConfirmed = appt.status === 'confirmed';

    try {
      const transporter = createTransporter();
      await transporter.sendMail({
        from: STUDIO_FROM_EMAIL.value(),
        to: appt.clientEmail,
        subject: isAlreadyConfirmed
          ? `${STUDIO_NAME} — Your Booking Is Confirmed (${appt.bookingCode})`
          : `${STUDIO_NAME} — Booking Request Received (${appt.bookingCode})`,
        text: isAlreadyConfirmed
          ? [
              `Hi ${appt.clientName},`,
              '',
              `Your appointment at ${STUDIO_NAME} is confirmed!`,
              `Booking Reference: ${appt.bookingCode}`,
              `Date: ${appt.date}`,
              `Time: ${appt.timeSlot}`,
              `Location: ${STUDIO_ADDRESS}`,
              '',
              'We will also send you a reminder the day before and 1 hour prior to your visit.',
            ].join('\n')
          : [
              `Hi ${appt.clientName},`,
              '',
              `We received your booking request at ${STUDIO_NAME}.`,
              `Booking Reference: ${appt.bookingCode}`,
              `Requested Date: ${appt.date}`,
              `Requested Time: ${appt.timeSlot}`,
              `Status: Pending Studio Admin Confirmation`,
              '',
              'Once our studio admin confirms your appointment, we will send your official confirmation email.',
            ].join('\n'),
        html: renderEmailHtml(
          isAlreadyConfirmed
            ? {
                heading: `Your booking is confirmed, ${appt.clientName}`,
                lead: `Thank you for reserving your chair at ${STUDIO_NAME}. Your appointment is officially confirmed below—you will also receive reminders the day before and 1 hour before your visit.`,
                appt,
                footerNote:
                  'Need to adjust your schedule? Open the My Bookings page in the app to manage or cancel your reservation.',
              }
            : {
                heading: `Booking request received, ${appt.clientName}`,
                lead: `Thank you for requesting a chair at ${STUDIO_NAME}. Your slot is currently pending confirmation from our studio admin. As soon as your booking is approved, we will email your official confirmation.`,
                appt,
                footerNote:
                  'You can check your live pending status anytime under My Bookings in the app.',
              },
        ),
      });

      await logRef.set(
        {
          appointmentId,
          clientId: appt.clientId,
          clientEmail: appt.clientEmail,
          bookingCode: appt.bookingCode,
          date: appt.date,
          timeSlot: appt.timeSlot,
          confirmationSentAt: isAlreadyConfirmed ? FieldValue.serverTimestamp() : null,
          dayBeforeReminderSentAt: existingLog.data()?.dayBeforeReminderSentAt ?? null,
          oneHourReminderSentAt: existingLog.data()?.oneHourReminderSentAt ?? null,
          lastStatusNotified: appt.status,
          lastError: null,
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );

      logger.info('Initial booking email sent', {
        appointmentId,
        bookingCode: appt.bookingCode,
        status: appt.status,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error('Failed to send initial booking email', { appointmentId, error: message });
      await logRef.set(
        {
          appointmentId,
          clientId: appt.clientId,
          clientEmail: appt.clientEmail,
          bookingCode: appt.bookingCode,
          date: appt.date,
          timeSlot: appt.timeSlot,
          confirmationSentAt: null,
          dayBeforeReminderSentAt: null,
          oneHourReminderSentAt: null,
          lastStatusNotified: appt.status,
          lastError: message.slice(0, 300),
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
    }
  },
);

/**
 * 2. Official Confirmation or Cancellation Email when Admin updates appointment status.
 */
export const onAppointmentStatusChanged = onDocumentUpdated(
  {
    document: 'appointments/{appointmentId}',
    database: FIRESTORE_DB_ID,
    secrets: [SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS],
  },
  async (event) => {
    const before = event.data?.before.data() as AppointmentDoc | undefined;
    const after = event.data?.after.data() as AppointmentDoc | undefined;
    if (!before || !after || before.status === after.status) return;

    if (after.status !== 'confirmed' && after.status !== 'cancelled') return;
    if (!after.clientEmail) return;

    const appointmentId = event.params.appointmentId;
    const isCancelled = after.status === 'cancelled';

    try {
      const transporter = createTransporter();
      await transporter.sendMail({
        from: STUDIO_FROM_EMAIL.value(),
        to: after.clientEmail,
        subject: isCancelled
          ? `${STUDIO_NAME} — Appointment Cancelled (${after.bookingCode})`
          : `${STUDIO_NAME} — Your Booking Is Confirmed (${after.bookingCode})`,
        text: isCancelled
          ? `Hi ${after.clientName}, your appointment (${after.bookingCode}) on ${after.date} at ${after.timeSlot} has been cancelled.`
          : [
              `Hi ${after.clientName},`,
              '',
              `Great news! Your appointment at ${STUDIO_NAME} is officially confirmed by our studio.`,
              `Booking Reference: ${after.bookingCode}`,
              `Service: ${after.serviceName} (${after.nailShape})`,
              `Date: ${after.date}`,
              `Time: ${after.timeSlot}`,
              `Location: ${STUDIO_ADDRESS}`,
              '',
              'We will also send you reminders the day before and 1 hour prior to your visit.',
            ].join('\n'),
        html: renderEmailHtml({
          heading: isCancelled
            ? 'Appointment cancelled'
            : `Your booking is confirmed, ${after.clientName}!`,
          lead: isCancelled
            ? `Your reservation for ${after.date} at ${after.timeSlot} has been cancelled.`
            : `Your studio chair for ${after.serviceName} on ${after.date} at ${after.timeSlot} has been officially confirmed by Eshin's studio team. Day-before and 1-hour reminders will follow automatically.`,
          appt: after,
          footerNote: isCancelled
            ? 'You can reserve a new date anytime from our Calendar page.'
            : 'We look forward to welcoming you at the studio. Please arrive 5 minutes early.',
        }),
      });

      const logUpdate: Record<string, unknown> = {
        appointmentId,
        clientId: after.clientId,
        clientEmail: after.clientEmail,
        bookingCode: after.bookingCode,
        date: after.date,
        timeSlot: after.timeSlot,
        lastStatusNotified: after.status,
        lastError: null,
        updatedAt: FieldValue.serverTimestamp(),
      };
      if (!isCancelled) {
        logUpdate.confirmationSentAt = FieldValue.serverTimestamp();
      }

      await db.collection('emailLogs').doc(appointmentId).set(logUpdate, { merge: true });
      logger.info('Status update email sent', { appointmentId, status: after.status });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error('Failed to send status update email', { appointmentId, error: message });
      await db.collection('emailLogs').doc(appointmentId).set(
        {
          lastError: message.slice(0, 300),
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
    }
  },
);

/**
 * 3. Scheduled Reminder Sweeper (Day-Before "Kinabukasan" & 1-Hour Before).
 * Runs every 10 minutes to catch both 24-hour and 1-hour windows reliably for confirmed bookings.
 */
export const sendAppointmentReminders = onSchedule(
  {
    schedule: 'every 10 minutes',
    secrets: [SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS],
  },
  async () => {
    const nowMs = Date.now();
    const tz = STUDIO_TIMEZONE.value();
    const activeSnap = await db
      .collection('appointments')
      .where('status', '==', 'confirmed')
      .get();

    if (activeSnap.empty) return;

    const transporter = createTransporter();

    for (const docSnap of activeSnap.docs) {
      const appointmentId = docSnap.id;
      const appt = docSnap.data() as AppointmentDoc;
      if (!appt.clientEmail) continue;

      const apptTime = parseStudioDateTime(appt.date, appt.timeSlot, tz);
      if (!apptTime) continue;

      const diffMinutes = (apptTime.getTime() - nowMs) / 60000;
      const logRef = db.collection('emailLogs').doc(appointmentId);
      const logSnap = await logRef.get();
      const logData = logSnap.exists ? (logSnap.data() as EmailLogDoc) : null;

      // Reset reminder flags if the appointment was rescheduled to a different date/time
      const scheduleChanged =
        Boolean(logData) &&
        (logData?.date !== appt.date || logData?.timeSlot !== appt.timeSlot);
      if (scheduleChanged) {
        await logRef.set(
          {
            date: appt.date,
            timeSlot: appt.timeSlot,
            dayBeforeReminderSentAt: null,
            oneHourReminderSentAt: null,
            updatedAt: FieldValue.serverTimestamp(),
          },
          { merge: true },
        );
      }

      const dayBeforeAlreadySent = !scheduleChanged && Boolean(logData?.dayBeforeReminderSentAt);
      const oneHourAlreadySent = !scheduleChanged && Boolean(logData?.oneHourReminderSentAt);

      // Window A: Day-Before / ~24h reminder (between 18 hours and 26 hours before visit)
      const needsDayBefore =
        diffMinutes >= 18 * 60 &&
        diffMinutes <= 26 * 60 &&
        !dayBeforeAlreadySent;

      // Window B: 1-Hour reminder (between 35 minutes and 75 minutes before visit)
      const needsOneHour =
        diffMinutes >= 35 &&
        diffMinutes <= 75 &&
        !oneHourAlreadySent;

      if (needsDayBefore) {
        try {
          await transporter.sendMail({
            from: STUDIO_FROM_EMAIL.value(),
            to: appt.clientEmail,
            subject: `Reminder: Your ${STUDIO_NAME} Visit Is Tomorrow (${appt.timeSlot})`,
            text: `Hi ${appt.clientName}, friendly reminder that your appointment (${appt.bookingCode}) is tomorrow, ${appt.date} at ${appt.timeSlot}. Location: ${STUDIO_ADDRESS}.`,
            html: renderEmailHtml({
              heading: 'See you tomorrow at the atelier',
              lead: `This is a friendly day-before reminder for your upcoming visit tomorrow at ${appt.timeSlot}.`,
              appt,
              footerNote:
                'Please arrive 5 minutes early with bare nails unless soak-off was requested.',
            }),
          });
          await logRef.set(
            {
              appointmentId,
              clientId: appt.clientId,
              clientEmail: appt.clientEmail,
              bookingCode: appt.bookingCode,
              date: appt.date,
              timeSlot: appt.timeSlot,
              dayBeforeReminderSentAt: FieldValue.serverTimestamp(),
              lastError: null,
              updatedAt: FieldValue.serverTimestamp(),
            },
            { merge: true },
          );
          logger.info('Day-before reminder sent', { appointmentId });
        } catch (error) {
          logger.error('Failed day-before reminder', { appointmentId, error });
        }
      }

      if (needsOneHour) {
        try {
          await transporter.sendMail({
            from: STUDIO_FROM_EMAIL.value(),
            to: appt.clientEmail,
            subject: `1-Hour Reminder: ${STUDIO_NAME} at ${appt.timeSlot}`,
            text: `Hi ${appt.clientName}, your appointment (${appt.bookingCode}) starts in about 1 hour (${appt.timeSlot}) at ${STUDIO_ADDRESS}.`,
            html: renderEmailHtml({
              heading: 'Your appointment starts in 1 hour',
              lead: `Your chair at ${STUDIO_NAME} will be ready shortly at ${appt.timeSlot}.`,
              appt,
              footerNote: `Studio address: ${STUDIO_ADDRESS}. See you soon!`,
            }),
          });
          await logRef.set(
            {
              appointmentId,
              clientId: appt.clientId,
              clientEmail: appt.clientEmail,
              bookingCode: appt.bookingCode,
              date: appt.date,
              timeSlot: appt.timeSlot,
              oneHourReminderSentAt: FieldValue.serverTimestamp(),
              lastError: null,
              updatedAt: FieldValue.serverTimestamp(),
            },
            { merge: true },
          );
          logger.info('1-hour reminder sent', { appointmentId });
        } catch (error) {
          logger.error('Failed 1-hour reminder', { appointmentId, error });
        }
      }
    }
  },
);
