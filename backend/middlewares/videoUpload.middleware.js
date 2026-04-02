const multer = require("multer");

// ✅ Use memoryStorage for Vercel (no persistent disk in serverless)
// Files are buffered in memory and then uploaded to BunnyCDN
const storage = multer.memoryStorage();

// ✅ Smart File Filter (Images + Videos)
const fileFilter = (req, file, cb) => {
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

  // 🎭 Poster / Banner
  if (file.fieldname === "poster" || file.fieldname === "banner") {
    if (imageTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Only image files allowed for poster/banner. Got: ${file.mimetype}`), false);
    }
  }

  // 🎬 Video / Trailer
  else if (file.fieldname === "video" || file.fieldname === "trailer") {
    if (videoTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Only video files allowed. Got: ${file.mimetype}`), false);
    }
  }

  // 🎭 Cast Images
  else if (file.fieldname.startsWith("castImage_")) {
    if (imageTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Only image files allowed for cast. Got: ${file.mimetype}`), false);
    }
  }

  // ✅ Profile Image Upload
  else if (file.fieldname === "profileImage") {
    if (imageTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only image allowed for profileImage"), false);
    }
  }

  // ❌ Unknown field
  else {
    cb(new Error(`Unknown field: ${file.fieldname}`), false);
  }
};

// ✅ Multer instance with memory storage
const videoUpload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 500 * 1024 * 1024, // 500MB
  },
});

module.exports = videoUpload;