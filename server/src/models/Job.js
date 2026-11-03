const mongoose = require('mongoose');

const JOB_TYPES = ['full-time', 'internship', 'contract'];
const JOB_STATUSES = ['draft', 'open', 'closed'];

const jobSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 120 },
    description: { type: String, required: true, maxlength: 8000 },
    company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
    // Denormalised so keyword search can match the company name inside the text index.
    companyName: { type: String, default: '' },
    postedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    location: { type: String, default: '', trim: true },
    jobType: { type: String, enum: JOB_TYPES, default: 'full-time' },
    remote: { type: Boolean, default: false },
    experienceMin: { type: Number, default: 0, min: 0 },
    experienceMax: { type: Number, default: 0, min: 0 },
    salaryMin: { type: Number, default: 0, min: 0 }, // INR per year
    salaryMax: { type: Number, default: 0, min: 0 },
    skills: { type: [String], default: [] },
    status: { type: String, enum: JOB_STATUSES, default: 'draft' },
    applicantCount: { type: Number, default: 0 },
    publishedAt: { type: Date },
  },
  { timestamps: true, versionKey: false },
);

jobSchema.index(
  { title: 'text', description: 'text', skills: 'text', companyName: 'text' },
  { weights: { title: 10, skills: 6, companyName: 4, description: 1 }, name: 'job_text' },
);
jobSchema.index({ status: 1, createdAt: -1 });
jobSchema.index({ postedBy: 1, createdAt: -1 });

module.exports = mongoose.model('Job', jobSchema);
module.exports.JOB_TYPES = JOB_TYPES;
module.exports.JOB_STATUSES = JOB_STATUSES;
