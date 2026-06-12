/* ══════════════════════════════════════
   routes/meetingRoutes.js  —  Meetings API
══════════════════════════════════════ */

const express    = require('express');
const Meeting    = require('../models/Meeting');
const User       = require('../models/User');
const { protect }           = require('../middleware/auth');
const { sendMeetingInvite, sendMeetingUpdate } = require('../utils/sendEmail');

const router = express.Router();
router.use(protect);

/* ── Helper: auto-mark past meetings ─── */
async function autoMarkCompleted(userId) {
  const now      = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
  const nowTime  = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
  await Meeting.updateMany({ user: userId, status: 'active', date: { $lt: todayStr } }, { status: 'completed' });
  await Meeting.updateMany({ user: userId, status: 'active', date: todayStr, end: { $lte: nowTime } }, { status: 'completed' });
}

/* ── Format date nicely for emails ───── */
function fmtDateEmail(ds) {
  const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const days   = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const d = new Date(ds + 'T00:00:00');
  return `${days[d.getDay()]}, ${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

/* ── GET /api/meetings ────────────────── */
router.get('/', async (req, res) => {
  try {
    await autoMarkCompleted(req.user._id);
    const meetings = await Meeting.find({ user: req.user._id, status: 'active' }).sort({ date: 1, start: 1 });
    res.json({ success: true, count: meetings.length, data: meetings });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Could not fetch meetings' });
  }
});

/* ── GET /api/meetings/history ────────── */
router.get('/history', async (req, res) => {
  try {
    await autoMarkCompleted(req.user._id);
    const meetings = await Meeting.find({ user: req.user._id }).sort({ date: -1, start: -1 });
    res.json({ success: true, count: meetings.length, data: meetings });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Could not fetch history' });
  }
});

/* ── GET /api/meetings/date/:date ─────── */
router.get('/date/:date', async (req, res) => {
  try {
    const meetings = await Meeting.find({ user: req.user._id, date: req.params.date, status: 'active' }).sort({ start: 1 });
    res.json({ success: true, count: meetings.length, data: meetings });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Could not fetch meetings' });
  }
});

/* ── POST /api/meetings ───────────────── */
router.post('/', async (req, res) => {
  try {
    const { title, date, start, end, color, attendees, desc, meetingLink } = req.body;

    if (!title || !date || !start || !end) {
      return res.status(400).json({ success: false, message: 'Title, date, start and end time are required' });
    }
    if (start >= end) {
      return res.status(400).json({ success: false, message: 'Start time must be before end time' });
    }

    // Conflict check
    const conflicts = await Meeting.find({
      user: req.user._id, date, status: 'active',
      $or: [{ start: { $lt: end }, end: { $gt: start } }],
    });
    if (conflicts.length > 0) {
      return res.status(409).json({
        success: false,
        message: `Time conflict with: "${conflicts[0].title}"`,
        conflicts: conflicts.map(c => ({ id: c._id, title: c.title, start: c.start, end: c.end })),
      });
    }

    // Create meeting
    const meeting = await Meeting.create({
      user: req.user._id, title, date, start, end,
      color:       color       || 'blue',
      attendees:   attendees   || [],
      desc:        desc        || '',
      meetingLink: meetingLink || '',
      status:      'active',
    });

    // ── Send email invites to all attendees ──
    if (attendees && attendees.length > 0) {
      const organizer = req.user.name || req.user.email;
      const emailDate = fmtDateEmail(date);

      // Send to each attendee (don't await — fire and forget so API responds fast)
      attendees.forEach(email => {
        if (email && email.includes('@')) {
          sendMeetingInvite({
            to:           email,
            meetingTitle: title,
            date:         emailDate,
            start,
            end,
            organizer,
            attendees,
            desc:         desc || '',
            meetingLink:  meetingLink || '',
          });
        }
      });

      console.log(`📧 Invites sent to ${attendees.length} attendee(s) for: ${title}`);
    }

    res.status(201).json({ success: true, data: meeting });

  } catch (error) {
    console.error('Create meeting error:', error.message);
    res.status(500).json({ success: false, message: 'Could not create meeting' });
  }
});

/* ── PUT /api/meetings/:id ────────────── */
router.put('/:id', async (req, res) => {
  try {
    let meeting = await Meeting.findById(req.params.id);
    if (!meeting) return res.status(404).json({ success: false, message: 'Meeting not found' });
    if (meeting.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorised' });
    }

    const { title, date, start, end, color, attendees, desc, meetingLink } = req.body;

    if (start && end && date) {
      const conflicts = await Meeting.find({
        user: req.user._id, date: date || meeting.date, status: 'active',
        _id: { $ne: req.params.id },
        $or: [{ start: { $lt: end }, end: { $gt: start } }],
      });
      if (conflicts.length > 0) {
        return res.status(409).json({
          success: false,
          message: `Time conflict with: "${conflicts[0].title}"`,
          conflicts: conflicts.map(c => ({ id: c._id, title: c.title, start: c.start, end: c.end })),
        });
      }
    }

    meeting = await Meeting.findByIdAndUpdate(
      req.params.id,
      { title, date, start, end, color, attendees, desc, meetingLink },
      { new: true, runValidators: true }
    );

    // Send update emails to attendees
    if (attendees && attendees.length > 0) {
      const organizer = req.user.name || req.user.email;
      attendees.forEach(email => {
        if (email && email.includes('@')) {
          sendMeetingUpdate({
            to: email, meetingTitle: title, type: 'updated',
            date: fmtDateEmail(date || meeting.date),
            start: start || meeting.start,
            end:   end   || meeting.end,
            organizer,
          });
        }
      });
    }

    res.json({ success: true, data: meeting });
  } catch (error) {
    console.error('Update meeting error:', error.message);
    res.status(500).json({ success: false, message: 'Could not update meeting' });
  }
});

/* ── DELETE /api/meetings/:id (soft) ─── */
router.delete('/:id', async (req, res) => {
  try {
    const meeting = await Meeting.findById(req.params.id);
    if (!meeting) return res.status(404).json({ success: false, message: 'Meeting not found' });
    if (meeting.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorised' });
    }

    meeting.status       = 'cancelled';
    meeting.cancelledAt  = new Date();
    meeting.cancelReason = req.body.reason || 'Cancelled by user';
    await meeting.save();

    // Send cancellation emails
    if (meeting.attendees && meeting.attendees.length > 0) {
      const organizer = req.user.name || req.user.email;
      meeting.attendees.forEach(email => {
        if (email && email.includes('@')) {
          sendMeetingUpdate({
            to: email, meetingTitle: meeting.title, type: 'cancelled',
            date: fmtDateEmail(meeting.date),
            start: meeting.start, end: meeting.end,
            organizer,
          });
        }
      });
    }

    res.json({ success: true, message: 'Meeting cancelled and saved to history' });
  } catch (error) {
    console.error('Delete meeting error:', error.message);
    res.status(500).json({ success: false, message: 'Could not delete meeting' });
  }
});

/* ── DELETE /api/meetings/:id/hard ───── */
router.delete('/:id/hard', async (req, res) => {
  try {
    const meeting = await Meeting.findById(req.params.id);
    if (!meeting) return res.status(404).json({ success: false, message: 'Meeting not found' });
    if (meeting.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorised' });
    }
    await meeting.deleteOne();
    res.json({ success: true, message: 'Meeting permanently deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Could not delete meeting' });
  }
});

module.exports = router;