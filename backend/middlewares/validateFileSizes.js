const MB = 1024 * 1024;

const limits = {
  poster: 5 * MB,
  banner: 5 * MB,
  profileImage: 2 * MB,
  trailer: 500 * MB,
  video: 1024 * MB,
};

function validateSingle(file, field) {
  if (!file) return;

  let max;

  if (field.startsWith("castImage_")) {
    max = 2 * MB;
  } else {
    max = limits[field];
  }

  if (max && file.size > max) {
    throw new Error(`${field} exceeds ${max / MB}MB limit`);
  }
}

const validateFileSizes = (req, res, next) => {
  try {
    if (req.file) {
      validateSingle(req.file, req.file.fieldname);
    }

    if (req.files) {
      Object.keys(req.files).forEach((field) => {
        const files = Array.isArray(req.files[field])
          ? req.files[field]
          : [req.files[field]];

        files.forEach((file) => validateSingle(file, field));
      });
    }

    next();
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = validateFileSizes;