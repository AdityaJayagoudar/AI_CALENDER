/* ══════════════════════════════════════
   utils/sendEmail.js  —  Email Sender
   Uses Gmail SMTP via Nodemailer
══════════════════════════════════════ */

const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const formatTime = (t) => {
  const [h, m] = t.split(':').map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2,'0')} ${h < 12 ? 'AM' : 'PM'}`;
};

/* ── Meeting Invite Email ──────────── */
const sendMeetingInvite = async ({ to, meetingTitle, date, start, end, organizer, attendees, desc, meetingLink }) => {
  try {
    const linkBtn = meetingLink ? `
      <div style="text-align:center;margin:24px 0;">
        <a href="${meetingLink}" style="display:inline-block;padding:12px 28px;background:#7C3AED;color:#fff;text-decoration:none;border-radius:8px;font-size:15px;font-weight:600;">
          🎥 Join Meeting
        </a>
      </div>` : '';

    const html = `
    <body style="margin:0;padding:0;background:#F0F0F8;font-family:'Segoe UI',Arial,sans-serif;">
      <div style="background:linear-gradient(135deg,#6d28d9,#7c3aed,#a855f7);padding:32px 24px;text-align:center;">
        <h1 style="margin:0;color:#fff;font-size:26px;font-weight:800;">📅 AI Calendar</h1>
        <p style="margin:4px 0 0;color:rgba(255,255,255,0.85);font-size:14px;">Meeting Invitation</p>
      </div>
      <div style="max-width:560px;margin:0 auto;padding:24px 16px;">
        <div style="background:#fff;border-radius:16px;border:1px solid #E4E4EF;overflow:hidden;">
          <div style="background:#F5F3FF;border-bottom:1px solid #DDD6FE;padding:20px 24px;">
            <p style="margin:0 0 4px;font-size:12px;font-weight:600;color:#7C3AED;text-transform:uppercase;letter-spacing:0.05em;">You have been invited to</p>
            <h2 style="margin:0;font-size:22px;font-weight:800;color:#1a1a2e;">${meetingTitle}</h2>
          </div>
          <div style="padding:24px;">
            <div style="background:#F8F8FC;border:1px solid #E4E4EF;border-radius:12px;padding:16px 20px;margin-bottom:16px;">
              <p style="margin:0 0 6px;font-size:11px;font-weight:700;color:#9CA3AF;text-transform:uppercase;letter-spacing:0.06em;">📆 Date & Time (IST)</p>
              <p style="margin:0;font-size:18px;font-weight:700;color:#1a1a2e;">${date}</p>
              <p style="margin:4px 0 0;font-size:16px;font-weight:600;color:#7C3AED;">${formatTime(start)} – ${formatTime(end)}</p>
            </div>
            <div style="font-size:14px;color:#374151;line-height:1.8;">
              <p style="margin:6px 0;"><strong>👤 Organiser:</strong> ${organizer}</p>
              ${attendees && attendees.length ? `<p style="margin:6px 0;"><strong>👥 Attendees:</strong> ${attendees.join(', ')}</p>` : ''}
              ${desc ? `<p style="margin:6px 0;"><strong>📋 Agenda:</strong> ${desc}</p>` : ''}
            </div>
            ${linkBtn}
            <div style="height:1px;background:#E4E4EF;margin:20px 0;"></div>
            <p style="margin:0;font-size:12px;color:#9CA3AF;text-align:center;line-height:1.6;">
              This invitation was sent via <strong>AI Calendar</strong>.<br>
              Please add this to your calendar.
            </p>
          </div>
        </div>
        <p style="text-align:center;font-size:11px;color:#9CA3AF;margin-top:16px;">© AI Calendar — Smart Scheduling, Simplified</p>
      </div>
    </body>`;

    await transporter.sendMail({
      from:    `"AI Calendar" <${process.env.EMAIL_USER}>`,
      to,
      subject: `📅 Meeting Invitation: ${meetingTitle}`,
      html,
      text: `Meeting: ${meetingTitle}\nDate: ${date}\nTime: ${formatTime(start)} – ${formatTime(end)} IST\nOrganiser: ${organizer}${meetingLink ? '\nJoin: ' + meetingLink : ''}`,
    });

    console.log(`✅ Invite sent to: ${to}`);
    return { success: true };
  } catch (err) {
    console.error(`❌ Email failed to ${to}:`, err.message);
    return { success: false, error: err.message };
  }
};

/* ── Meeting Cancellation Email ─────── */
const sendMeetingUpdate = async ({ to, meetingTitle, type, date, start, end, organizer }) => {
  try {
    const isCancel = type === 'cancelled';
    const html = `
    <body style="margin:0;padding:0;background:#F0F0F8;font-family:'Segoe UI',Arial,sans-serif;">
      <div style="background:linear-gradient(135deg,#6d28d9,#7c3aed);padding:32px 24px;text-align:center;">
        <h1 style="margin:0;color:#fff;font-size:22px;font-weight:800;">📅 AI Calendar</h1>
        <p style="margin:4px 0 0;color:rgba(255,255,255,0.8);font-size:13px;">Meeting ${isCancel ? 'Cancellation' : 'Update'}</p>
      </div>
      <div style="max-width:560px;margin:0 auto;padding:24px 16px;">
        <div style="background:#fff;border-radius:16px;padding:24px;border:1px solid #E4E4EF;">
          <span style="display:inline-block;padding:5px 14px;border-radius:20px;background:${isCancel ? '#FEE2E2' : '#FEF3C7'};color:${isCancel ? '#DC2626' : '#D97706'};font-size:13px;font-weight:600;margin-bottom:16px;">
            ${isCancel ? '❌ Meeting Cancelled' : '📝 Meeting Updated'}
          </span>
          <h2 style="margin:0 0 16px;font-size:20px;color:#1a1a2e;">${meetingTitle}</h2>
          <p style="margin:6px 0;font-size:14px;color:#374151;"><strong>📆 Date:</strong> ${date}</p>
          <p style="margin:6px 0;font-size:14px;color:#374151;"><strong>🕐 Time:</strong> ${formatTime(start)} – ${formatTime(end)} IST</p>
          <p style="margin:6px 0;font-size:14px;color:#374151;"><strong>👤 Organiser:</strong> ${organizer}</p>
          ${isCancel ? '<p style="margin-top:16px;font-size:13px;color:#6B7280;">This meeting has been cancelled. Please remove it from your calendar.</p>' : ''}
        </div>
      </div>
    </body>`;

    await transporter.sendMail({
      from:    `"AI Calendar" <${process.env.EMAIL_USER}>`,
      to,
      subject: isCancel ? `❌ Meeting Cancelled: ${meetingTitle}` : `📝 Meeting Updated: ${meetingTitle}`,
      html,
    });

    console.log(`✅ Update email sent to: ${to}`);
    return { success: true };
  } catch (err) {
    console.error(`❌ Update email failed:`, err.message);
    return { success: false, error: err.message };
  }
};

module.exports = { sendMeetingInvite, sendMeetingUpdate };