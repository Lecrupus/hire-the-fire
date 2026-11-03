const User = require('../models/User');
const Job = require('../models/Job');
const ApiError = require('../utils/ApiError');
const { escapeRegex } = require('./pipeline');

/** Users for moderation, newest first, optionally filtered by role or name/email text. */
async function listUsers({ role, q, page = 1, limit = 20 }) {
  const filter = {};
  if (role) filter.role = role;
  if (q)
    filter.$or = [
      { name: { $regex: escapeRegex(q), $options: 'i' } },
      { email: { $regex: escapeRegex(q), $options: 'i' } },
    ];
  const [items, total] = await Promise.all([
    User.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .select('name email role isBlocked createdAt')
      .lean(),
    User.countDocuments(filter),
  ]);
  return { items, page, limit, total, pages: Math.ceil(total / limit) || 1 };
}

/** Blocks or unblocks a user. Blocking also ends their sessions. Admins cannot block themselves. */
async function setBlocked(id, blocked, admin) {
  if (String(id) === String(admin._id))
    throw ApiError.badRequest('You cannot block your own account');
  const user = await User.findById(id);
  if (!user) throw ApiError.notFound('User');
  user.isBlocked = blocked;
  if (blocked) await User.updateOne({ _id: id }, { $inc: { tokenVersion: 1 } });
  await user.save();
  return user;
}

async function listJobs({ page = 1, limit = 20 }) {
  const [items, total] = await Promise.all([
    Job.find()
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .select('title companyName status applicantCount createdAt')
      .lean(),
    Job.countDocuments(),
  ]);
  return { items, page, limit, total, pages: Math.ceil(total / limit) || 1 };
}

module.exports = { listUsers, setBlocked, listJobs };
