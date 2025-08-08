const fs = require('fs');
const path = require('path');
const AdmZip = require('adm-zip');

const uploadFile = (file, uploadPath, allowedExtensions) => {
  if (!fs.existsSync(uploadPath)) {
    fs.mkdirSync(uploadPath, { recursive: true });
  }

  const ext = path.extname(file.originalname).toLowerCase();
  if (!allowedExtensions.includes(ext)) {
    throw new Error(`Invalid file type. Only ${allowedExtensions.join(', ')} are allowed.`);
  }

  const filename = `${Date.now()}${ext}`;
  const filePath = path.join(uploadPath, filename);
  fs.writeFileSync(filePath, file.buffer);

  return filename;
};

const uploadAndExtractZip = async (file, uploadPath) => {
  if (!fs.existsSync(uploadPath)) {
    fs.mkdirSync(uploadPath, { recursive: true });
  }
  const zip = new AdmZip(file.buffer);
  const folderName = `${Date.now()}`;
  const extractPath = path.join(uploadPath, folderName);
  zip.extractAllTo(extractPath, true);
  return `${folderName}`;
};

module.exports = {
  uploadFile,
  uploadAndExtractZip
};