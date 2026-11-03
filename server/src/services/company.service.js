const Company = require('../models/Company');
const Job = require('../models/Job');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const { storeFile } = require('../config/cloudinary');

/** A recruiter owns exactly one company. */
async function create(data, recruiter) {
  if (await Company.exists({ owner: recruiter._id })) {
    throw ApiError.conflict('COMPANY_EXISTS', 'You already have a company profile');
  }
  const company = await Company.create({ ...data, owner: recruiter._id });
  await User.updateOne({ _id: recruiter._id }, { company: company._id });
  return company;
}

async function getOwned(id, user) {
  const company = await Company.findById(id);
  if (!company) throw ApiError.notFound('Company');
  if (user.role !== 'admin' && String(company.owner) !== String(user._id)) {
    throw ApiError.forbidden('This company belongs to another recruiter');
  }
  return company;
}

/** Updates the profile and keeps the denormalised name on jobs in step. */
async function update(id, data, user) {
  const company = await getOwned(id, user);
  const renamed = data.name && data.name !== company.name;
  Object.assign(company, data);
  await company.save();
  if (renamed) await Job.updateMany({ company: company._id }, { companyName: company.name });
  return company;
}

async function uploadLogo(id, file, user) {
  const company = await getOwned(id, user);
  company.logoUrl = await storeFile(file, 'logos');
  await company.save();
  return company;
}

module.exports = { create, update, uploadLogo };
