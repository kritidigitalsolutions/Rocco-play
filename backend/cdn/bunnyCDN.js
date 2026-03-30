// const fs = require("fs");
// const path = require("path");
// const mime = require("mime-types");
// const axios = require("axios");

// const uploadFileOnBunny = async (directoryPath, file) => {
//   try {
//     if (!file) return null;

//     const fileStream = fs.createReadStream(file.path);
//     const fileExtension = path.extname(file.originalname).slice(1);
//     // const uri = `https://sg.storage.bunnycdn.com/rocco-play/${directoryPath}/${file.filename}`;
//     const cdnUrl = `https://rocco-play.b-cdn.net/${directoryPath}/${file.filename}`;
// return cdnUrl;
//     const contentType = mime.lookup(fileExtension) || "application/octet-stream";

//     const resp = await axios.put(uri, fileStream, {
//       headers: {
//         AccessKey: process.env.BUNNY_ACCESS_KEY,
//         "content-type": contentType
//       }
//     });

//     console.log("Bunny Upload Success:", resp.status);
    
//     // Return the CDN URL
//     return uri;

//   } catch (error) {
//     console.log("Bunny Error FULL:", error.message);
//     console.log("Bunny Error DATA:", error.response?.data);
//     console.log("Bunny Error Status:", error.response?.status);
//     return null;
//   }
// };

// module.exports = uploadFileOnBunny;