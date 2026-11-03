const User = require('../models/User');
const Job = require('../models/Job');
const ApiError = require('../utils/ApiError');
const { storeFile } = require('../config/cloudinary');

/** Current user with company populated for recruiters. */
async function me(userId) {
  return User.findById(userId).populate('company');
}

/** Merges profile fields; arrays (skills, education, experience) replace the stored ones. */
async function updateProfile(user, { name, profile }) {
  if (name) user.name = name;
  if (profile) {
    const { links, ...rest } = profile;
    Object.assign(user.profile, rest);
    if (links) Object.assign(user.profile.links, links);
  }
  await user.save();
  return user;
}

async function uploadResume(user, file) {
  user.profile.resumeUrl = await storeFile(file, 'resumes');
  await user.save();
  return { resumeUrl: user.profile.resumeUrl };
}

async function saveJob(user, jobId) {
  if (!(await Job.exists({ _id: jobId, status: { $ne: 'draft' } }))) throw ApiError.notFound('Job');
  await User.updateOne({ _id: user._id }, { $addToSet: { savedJobs: jobId } });
}

async function unsaveJob(user, jobId) {
  await User.updateOne({ _id: user._id }, { $pull: { savedJobs: jobId } });
}

async function listSaved(user) {
  const u = await User.findById(user._id).populate({
    path: 'savedJobs',
    match: { status: { $ne: 'draft' } },
    populate: { path: 'company', select: 'name logoUrl location' },
  });
  return u.savedJobs;
}

module.exports = { me, updateProfile, uploadResume, saveJob, unsaveJob, listSaved };
