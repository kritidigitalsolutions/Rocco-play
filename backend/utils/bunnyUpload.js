const axios = require("axios");
const fs = require("fs");

// ❌ OLD VERSION (no folders)
// const uploadToBunny = async (filePath, fileName) => {
//   try {
//     const storageZone = "rocco-play";
//     const accessKey = process.env.BUNNY_ACCESS_KEY;
//     const region = "sg";

//     const url = `https://${region}.storage.bunnycdn.com/${storageZone}/${fileName}`;

//     const fileData = fs.readFileSync(filePath);

//     const response = await axios.put(url, fileData, {
//       headers: {
//         AccessKey: accessKey,
//         "Content-Type": "application/octet-stream"
//       }
//     });

//     console.log("✅ Bunny Upload Success:", response.status);

//     return `https://${storageZone}.b-cdn.net/${fileName}`;

//   } catch (error) {
//     console.error("❌ Bunny Upload Error:", error.response?.data || error.message);
//     return null;
//   }
// };


// ✅ NEW VERSION (with folder support)
const uploadToBunny = async (filePath, fileName, folder = "") => {
  try {
    const storageZone = "rocco-play";
    const accessKey = process.env.BUNNY_ACCESS_KEY;
    const region = "sg";

    // 📂 Add folder path
    const finalPath = folder ? `${folder}/${fileName}` : fileName;

    const url = `https://${region}.storage.bunnycdn.com/${storageZone}/${finalPath}`;

    const fileData = fs.readFileSync(filePath);

    const response = await axios.put(url, fileData, {
      headers: {
        AccessKey: accessKey,
        "Content-Type": "application/octet-stream"
      }
    });

    console.log("✅ Bunny Upload Success:", response.status);

    // 🎯 return CDN URL with folder
    return `https://${storageZone}.b-cdn.net/${finalPath}`;

  } catch (error) {
    console.error("❌ Bunny Upload Error:", error.response?.data || error.message);
    return null;
  }
};

module.exports = uploadToBunny;