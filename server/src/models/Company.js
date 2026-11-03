const mongoose = require('mongoose');

const companySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    logoUrl: { type: String, default: '' },
    website: { type: String, default: '' },
    about: { type: String, default: '', maxlength: 2000 },
    location: { type: String, default: '' },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  },
  { timestamps: true, versionKey: false },
);

module.exports = mongoose.model('Company', companySchema);
