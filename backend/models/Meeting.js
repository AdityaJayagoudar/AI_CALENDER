const mongoose = require('mongoose');

const MeetingSchema = new mongoose.Schema(
  {
    user: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      'User',
      required: true,
    },
    title: {
      type:      String,
      required:  [true, 'Meeting title is required'],
      trim:      true,
      maxlength: [100, 'Title cannot exceed 100 characters'],
    },
    date: {
      type:     String,
      required: [true, 'Date is required'],
      match:    [/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'],
    },
    start: {
      type:     String,
      required: [true, 'Start time is required'],
      match:    [/^\d{2}:\d{2}$/, 'Start time must be in HH:MM format'],
    },
    end: {
      type:     String,
      required: [true, 'End time is required'],
      match:    [/^\d{2}:\d{2}$/, 'End time must be in HH:MM format'],
    },
    color: {
      type:    String,
      enum:    ['blue', 'green', 'amber', 'purple', 'red'],
      default: 'blue',
    },
    attendees: {
      type:    [String],
      default: [],
    },
    desc: {
      type:      String,
      trim:      true,
      default:   '',
      maxlength: [500, 'Description cannot exceed 500 characters'],
    },
    // Meeting link (Google Meet, Zoom, Teams, Webex etc.)
    meetingLink: {
      type:    String,
      trim:    true,
      default: '',
    },
    // AI generated notes saved here
    notes: {
      type:    String,
      default: '',
    },
    // Status: active | completed | cancelled
    status: {
      type:    String,
      enum:    ['active', 'completed', 'cancelled'],
      default: 'active',
    },
    cancelledAt: {
      type:    Date,
      default: null,
    },
    cancelReason: {
      type:    String,
      default: '',
    },
  },
  { timestamps: true }
);

MeetingSchema.index({ user: 1, date: 1 });
MeetingSchema.index({ user: 1, status: 1 });

module.exports = mongoose.model('Meeting', MeetingSchema);