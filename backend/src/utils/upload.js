const multer = require('multer');
const path = require('path');
const fs = require('fs');

const storage = multer.diskStorage({
  destination(req, file, cb) {
    const dest = path.join(__dirname, '..', '..', 'uploads', 'avatars');
    fs.mkdirSync(dest, { recursive: true });
    cb(null, dest);
  },
  filename(req, file, cb) {
    let ext = path.extname(file.originalname || '').toLowerCase();
    if (!ext || ext.length > 5) {
      ext = '.png';
    }
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
  },
});

const allowedExt = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.heic'];

const fileFilter = (req, file, cb) => {
  const isImageMime = file.mimetype && file.mimetype.startsWith('image/');
  const ext = path.extname(file.originalname || '').toLowerCase();
  const isAllowedExt = allowedExt.includes(ext);

  if (isImageMime || isAllowedExt) {
    cb(null, true);
  } else {
    cb(new Error('Only image uploads are allowed'));
  }
};

module.exports = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 2MB max avatar
    files: 1,
  },
});
