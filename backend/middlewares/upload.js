// // const multer = require("multer");

// // // Use memory storage for Firebase upload
// // // Files will be stored in memory as Buffer and then uploaded to Firebase Storage
// // const storage = multer.memoryStorage();

// // // File filter to allow only images
// // const fileFilter = (req, file, cb) => {
// //   const allowedMimes = ["image/jpeg", "image/png", "image/jpg", "image/webp"];
// //   if (allowedMimes.includes(file.mimetype)) {
// //     cb(null, true);
// //   } else {
// //     cb(new Error("Only image files (jpg, jpeg, png, webp) are allowed"), false);
// //   }
// // };

// // const upload = multer({
// //   storage,
// //   fileFilter,
// //   limits: {
// //     fileSize: 10 * 1024 * 1024 // 10MB max file size
// //   }
// // });

// // module.exports = upload;

// const multer = require("multer");
// const path = require("path");

// // Store files temporarily
// const storage = multer.diskStorage({
//   destination: (req, file, cb) => {
//     cb(null, "uploads/"); // make sure this folder exists
//   },
//   filename: (req, file, cb) => {
//     cb(null, Date.now() + path.extname(file.originalname));
//   }
// });

// const upload = multer({ storage });

// module.exports = upload;

// new code
