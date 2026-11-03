const fs = require('fs/promises');
const path = require('path');
const crypto = require('crypto');
const { v2: cloudinary } = require('cloudinary');
const env = require('./env');

const useCloudinary = Boolean(env.cloudinary.cloudName && env.cloudinary.apiKey);
const LOCAL_DIR = path.join(__dirname, '..', '..', 'uploads');

if (useCloudinary) {
  cloudinary.config({
    cloud_name: env.cloudinary.cloudName,
    api_key: env.cloudinary.apiKey,
    api_secret: env.cloudinary.apiSecret,
  });
}

/**
 * Stores an uploaded file and returns its public URL.
 * Uses Cloudinary when configured, otherwise local disk served at /uploads (dev and tests).
 * @param {{buffer: Buffer, mimetype: string, originalname: string}} file
 * @param {'resumes'|'logos'} folder
 */
async function storeFile(file, folder) {
  if (useCloudinary) {
    const resourceType = file.mimetype === 'application/pdf' ? 'raw' : 'image';
    const result = await new Promise((resolve, reject) => {
      cloudinary.uploader
        .upload_stream(
          { folder: `hire-the-fire/${folder}`, resource_type: resourceType },
          (err, res) => (err ? reject(err) : resolve(res)),
        )
        .end(file.buffer);
    });
    return result.secure_url;
  }
  const ext =
    file.mimetype === 'application/pdf' ? '.pdf' : file.mimetype === 'image/png' ? '.png' : '.jpg';
  const name = `${crypto.randomUUID()}${ext}`;
  await fs.mkdir(path.join(LOCAL_DIR, folder), { recursive: true });
  await fs.writeFile(path.join(LOCAL_DIR, folder, name), file.buffer);
  return `/uploads/${folder}/${name}`;
}

module.exports = { storeFile, LOCAL_DIR };
