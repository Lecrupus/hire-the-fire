const mongoose = require('mongoose');

const educationSchema = new mongoose.Schema(
  { school: String, degree: String, field: String, startYear: Number, endYear: Number },
  { _id: false },
);

const experienceSchema = new mongoose.Schema(
  { company: String, title: String, startDate: String, endDate: String, description: String },
  { _id: false },
);

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: ['seeker', 'recruiter', 'admin'], default: 'seeker' },
    profile: {
      headline: { type: String, default: '' },
      location: { type: String, default: '' },
      experienceYears: { type: Number, default: 0 },
      skills: { type: [String], default: [] },
      education: { type: [educationSchema], default: [] },
      experience: { type: [experienceSchema], default: [] },
      links: {
        linkedin: { type: String, default: '' },
        github: { type: String, default: '' },
        portfolio: { type: String, default: '' },
      },
      resumeUrl: { type: String, default: '' },
    },
    savedJobs: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Job' }],
    company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company' },
    isBlocked: { type: Boolean, default: false },
    // Bumped on logout-everywhere or password change; refresh tokens carry it and are refused when stale.
    tokenVersion: { type: Number, default: 0, select: false },
  },
  { timestamps: true },
);

userSchema.set('toJSON', {
  transform: (_doc, ret) => {
    delete ret.passwordHash;
    delete ret.tokenVersion;
    delete ret.__v;
    return ret;
  },
});

module.exports = mongoose.model('User', userSchema);
