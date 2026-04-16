const multer = require("multer");

const storage = multer.memoryStorage();

// Max allowed by parser (largest file = video)
const MAX_GLOBAL_SIZE = 1024 * 1024 * 1024; // 1GB

const imageTypes = [
  "image/jpeg",
  "image/png",
  "image/jpg",
  "image/webp",
];

const videoTypes = [
  "video/mp4",
  "video/mkv",
  "video/webm",
  "video/mpeg",
  "video/quicktime",
  "video/x-msvideo",
  "video/x-matroska",
  "video/x-flv",
  "video/x-ms-wmv",
  "application/octet-stream",
];

const fileFilter = (req, file, cb) => {
  if (["poster", "banner", "profileImage"].includes(file.fieldname)) {
    if (!imageTypes.includes(file.mimetype)) {
      return cb(new Error(`Only image files allowed for ${file.fieldname}`), false);
    }
  }

  else if (file.fieldname.startsWith("castImage_")) {
    if (!imageTypes.includes(file.mimetype)) {
      return cb(new Error("Only image files allowed for cast"), false);
    }
  }

  else if (["video", "trailer"].includes(file.fieldname)) {
    if (!videoTypes.includes(file.mimetype)) {
      return cb(new Error(`Only video files allowed for ${file.fieldname}`), false);
    }
  }

  else {
    return cb(new Error(`Unknown field: ${file.fieldname}`), false);
  }

  cb(null, true);
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_GLOBAL_SIZE,
  },
});

module.exports = upload;