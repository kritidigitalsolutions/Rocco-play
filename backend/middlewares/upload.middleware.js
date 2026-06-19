const multer = require("multer");
const path = require("path");
const {
  uploadStreamToBunny,
} = require("../cdn/bunnyCDN");

const getUploadInfo = (req, file) => {
  let type = "movies";

  if (req.originalUrl.includes("/series")) type = "series";
  if (req.originalUrl.includes("/episodes")) type = "episodes";
  if (req.originalUrl.includes("/drama-episodes")) type = "dramaepisodes";
  if (req.originalUrl.includes("/shortdramas")) type = "shortdramas";
  if (req.originalUrl.includes("/user")) type = "profile";
  if (req.originalUrl.includes("/support")) type = "support";

  let subfolder = "others";

  if (file.fieldname === "poster" || file.fieldname === "thumbnail") {
    subfolder = "posters";
  } else if (file.fieldname === "banner") {
    subfolder = "banners";
  } else if (file.fieldname === "video") {
    subfolder = "videos";
  } else if (file.fieldname === "trailer") {
    subfolder = "trailers";
  } else if (file.fieldname.startsWith("castImage_")) {
    subfolder = "cast";
  } else if (file.fieldname === "attachments") {
    subfolder = "attachments";
  }

  return {
    type,
    subfolder,
    remoteFolder: `${type}/${subfolder}`,
  };
};

const storage = {
  _handleFile: async (req, file, cb) => {
    try {
      const uploadInfo = getUploadInfo(req, file);
      const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
      const ext = path.extname(file.originalname).toLowerCase();

      const filename = `${uniqueName}${ext}`;

     console.log("================================");
console.log("UPLOAD START");
console.log("FIELD:", file.fieldname);
console.log("NAME:", file.originalname);
console.log("TYPE:", file.mimetype);
console.log("REMOTE PATH:", `${uploadInfo.remoteFolder}/${filename}`);

const result = await uploadStreamToBunny({
  stream: file.stream,
  remotePath: `${uploadInfo.remoteFolder}/${filename}`,
  contentType: file.mimetype,
});

console.log("BUNNY RESPONSE:", result);
console.log("================================");

      cb(null, {
        filename,
        destination: uploadInfo.remoteFolder,
        path: result.url,
        cdnUrl: result.url,
        remotePath: result.path,
      });
    } catch (error) {
  console.error("BUNNY UPLOAD ERROR");
  console.error(error);
  console.error(error.message);

  cb(error);
}
  },

  _removeFile: (req, file, cb) => {
    cb(null);
  },
};

const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
    "video/mp4",
    "video/mkv",
    "video/webm",
    "video/quicktime",
  ];

  if (req.originalUrl && req.originalUrl.includes("/support")) {
    const allowedSupportTypes = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "text/plain",
      "application/zip",
      "application/x-zip-compressed",
      "application/octet-stream",
    ];

    if (
      allowedMimeTypes.includes(file.mimetype) ||
      allowedSupportTypes.includes(file.mimetype)
    ) {
      return cb(null, true);
    }
  } else {
    if (allowedMimeTypes.includes(file.mimetype)) {
      return cb(null, true);
    }
  }

  cb(new Error("Invalid file type"), false);
};

// Replace the multer instantiation block

const MAX_UPLOAD_SIZE = Number(process.env.MAX_UPLOAD_SIZE);
if (!MAX_UPLOAD_SIZE) {
  throw new Error("MAX_UPLOAD_SIZE env variable is not set — check your .env file");
}

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_UPLOAD_SIZE,  // driven entirely by .env, no hardcoded fallback
  },
});

// const upload = multer({
//   storage,
//   fileFilter,
//   limits: {
//     fileSize: Number(process.env.MAX_UPLOAD_SIZE) || 500 * 1024 * 1024,
//   },
// });

module.exports = upload;
