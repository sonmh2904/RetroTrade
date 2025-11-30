const multer = require("multer");
const cloudinary = require("cloudinary").v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const storage = multer.memoryStorage();

const uploadRating = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const isImage = file.mimetype.startsWith("image/");
    const isVideo = file.mimetype.startsWith("video/");

    if (isImage || isVideo) cb(null, true);
    else cb(new Error("Chỉ hỗ trợ ảnh JPG/PNG hoặc video MP4/MOV/AVI"));
  },
  limits: { fileSize: 30 * 1024 * 1024 }, // 30MB/video
});

const uploadRatingToCloudinary = async (
  files,
  folder = "retrotrade/ratings"
) => {
  const images = [];
  const videos = [];

  for (const file of files) {
    const isVideo = file.mimetype.startsWith("video");

    const result = await new Promise((resolve, reject) => {
      cloudinary.uploader
        .upload_stream(
          {
            folder,
            resource_type: isVideo ? "video" : "image",
          },
          (err, res) => {
            if (err) reject(err);
            else resolve(res);
          }
        )
        .end(file.buffer);
    });

    if (isVideo) videos.push(result.secure_url);
    else images.push(result.secure_url);
  }

  return { images, videos };
};

module.exports = { uploadRating, uploadRatingToCloudinary };
