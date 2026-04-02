const axios = require("axios");
const fs = require("fs");

/**
 * Upload a file to BunnyCDN Storage
 * @param {string|Buffer} filePathOrBuffer - File path (legacy) OR Buffer (memoryStorage)
 * @param {string} fileName - Name to store the file as
 * @param {string} folder - Subfolder in the storage zone (e.g., "posters", "videos")
 * @returns {string|null} CDN URL or null on failure
 */
const uploadToBunny = async (filePathOrBuffer, fileName, folder = "") => {
  try {
    const storageZone = "rocco-play";
    const accessKey = process.env.BUNNY_ACCESS_KEY;
    const region = "sg";

    if (!accessKey) {
      throw new Error("BUNNY_ACCESS_KEY is not set in environment variables");
    }

    // 📂 Build path with optional folder
    const finalPath = folder ? `${folder}/${fileName}` : fileName;
    const url = `https://${region}.storage.bunnycdn.com/${storageZone}/${finalPath}`;

    // ✅ Handle both Buffer (memoryStorage) and file path (diskStorage)
    let fileData;
    if (Buffer.isBuffer(filePathOrBuffer)) {
      // From multer memoryStorage → file.buffer
      fileData = filePathOrBuffer;
    } else if (typeof filePathOrBuffer === "string") {
      // From multer diskStorage → file.path
      fileData = fs.readFileSync(filePathOrBuffer);
    } else {
      throw new Error("Invalid file input: must be a Buffer or file path string");
    }

    const response = await axios.put(url, fileData, {
      headers: {
        AccessKey: accessKey,
        "Content-Type": "application/octet-stream",
      },
      maxBodyLength: Infinity,    // ✅ Required for large video files
      maxContentLength: Infinity, // ✅ Required for large video files
      timeout: 300000,            // ✅ 5-minute timeout for large uploads
    });

    console.log("✅ Bunny Upload Success:", response.status, finalPath);

    // 🎯 Return CDN URL
    return `https://${storageZone}.b-cdn.net/${finalPath}`;

  } catch (error) {
    console.error("❌ Bunny Upload Error:", error.response?.data || error.message);
    return null;
  }
};

module.exports = uploadToBunny;