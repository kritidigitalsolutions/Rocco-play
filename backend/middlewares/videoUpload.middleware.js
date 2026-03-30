// const multer = require("multer");
// const path = require("path");

// // ✅ Storage (disk)
// const storage = multer.diskStorage({
//   destination: (req, file, cb) => {
//     cb(null, "uploads/"); // make sure this folder exists
//   },
//   filename: (req, file, cb) => {
//     cb(null, Date.now() + path.extname(file.originalname));
//   }
// });

// // ✅ Smart File Filter (Images + Videos)
// const fileFilter = (req, file, cb) => {
//   const imageTypes = [
//     "image/jpeg",
//     "image/png",
//     "image/jpg",
//     "image/webp"
//   ];

//   const videoTypes = [
//     "video/mp4",
//     "video/mkv",
//     "video/webm",
//     "video/mpeg",
//     "video/quicktime",
//     "video/x-msvideo",
//     "video/x-matroska",
//     "video/x-flv",
//     "video/x-ms-wmv", "application/octet-stream" 
//   ];

//   // 🎯 Field-based validation
//   if (file.fieldname === "poster" || file.fieldname === "banner") {
//     if (imageTypes.includes(file.mimetype)) {
//       cb(null, true);
//     } else {
//       cb(
//         new Error(`Only image files allowed for poster/banner. Got: ${file.mimetype}`),
//         false
//       );
//     }
//   } 
//   else if (file.fieldname === "video" || file.fieldname === "trailer")  {
//     if (videoTypes.includes(file.mimetype)) {
//       cb(null, true);
//     } else {
//       cb(
//         new Error(`Only video files allowed for video. Got: ${file.mimetype}`),
//         false
//       );
//     }
//   } 
//   else {
//     cb(new Error(`Unknown field: ${file.fieldname}`), false);
//   }
// };

// // ✅ Multer instance
// const videoUpload = multer({
//   storage,
//   fileFilter,
//   limits: {
//     fileSize: 500 * 1024 * 1024 // 500MB
//   }
// });

// module.exports = videoUpload;

const multer = require("multer");
const path = require("path");

// ✅ Storage (disk)
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

// ✅ Smart File Filter (Images + Videos)
const fileFilter = (req, file, cb) => {
  const imageTypes = [
    "image/jpeg",
    "image/png",
    "image/jpg",
    "image/webp"
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
    "application/octet-stream"
  ];

  // 🎯 Poster / Banner
  if (file.fieldname === "poster" || file.fieldname === "banner") {
    if (imageTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(
        new Error(`Only image files allowed for poster/banner. Got: ${file.mimetype}`),
        false
      );
    }
  }

  // 🎬 Video / Trailer
  else if (file.fieldname === "video" || file.fieldname === "trailer") {
    if (videoTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(
        new Error(`Only video files allowed. Got: ${file.mimetype}`),
        false
      );
    }
  }

  // 🆕 🎭 Cast Images (THIS IS WHAT YOU WERE MISSING 🔥)
  else if (file.fieldname.startsWith("castImage_")) {
    if (imageTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(
        new Error(`Only image files allowed for cast. Got: ${file.mimetype}`),
        false
      );
    }
  }

  // ❌ Unknown field
  else {
    cb(new Error(`Unknown field: ${file.fieldname}`), false);
  }
};

// ✅ Multer instance
const videoUpload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 500 * 1024 * 1024
  }
});

module.exports = videoUpload;