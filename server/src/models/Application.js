const mongoose = require('mongoose');

const APPLICATION_STATUSES = [
  'applied',
  'shortlisted',
  'interview',
  'rejected',
  'hired',
  'withdrawn',
];

const historySchema = new mongoose.Schema(
  {
    status: { type: String, enum: APPLICATION_STATUSES, required: true },
    changedAt: { type: Date, default: Date.now },
    changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { _id: false },
);

const applicationSchema = new mongoose.Schema(
  {
    job: { type: mongoose.Schema.Types.ObjectId, ref: 'Job', required: true },
    applicant: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    resumeUrl: { type: String, default: '' }, // copied at apply time
    coverNote: { type: String, default: '', maxlength: 2000 },
    status: { type: String, enum: APPLICATION_STATUSES, default: 'applied' },
    history: { type: [historySchema], default: [] },
    recruiterNotes: { type: String, default: '', select: false },
    lastMovedAt: { type: Date, default: Date.now },
  },
  { timestamps: true, versionKey: false },
);

// Blocks duplicate applications at the database level, even under concurrent requests.
applicationSchema.index({ job: 1, applicant: 1 }, { unique: true });
applicationSchema.index({ applicant: 1, createdAt: -1 });
applicationSchema.index({ job: 1, status: 1 });

module.exports = mongoose.model('Application', applicationSchema);
module.exports.APPLICATION_STATUSES = APPLICATION_STATUSES;
