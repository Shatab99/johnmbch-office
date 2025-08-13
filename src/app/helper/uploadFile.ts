import multer from "multer";
import { S3Client } from "@aws-sdk/client-s3";
import multerS3 from "multer-s3";

// Configure DigitalOcean Spaces
const s3 = new S3Client({
  endpoint: process.env.DO_SPACE_ENDPOINT,
  region: "nyc3", // Replace with your region
  credentials: {
    accessKeyId: process.env.DO_SPACE_ACCESS_KEY || "", // Store in .env for security
    secretAccessKey: process.env.DO_SPACE_SECRET_KEY || "", // Store in .env for security
  },
});

// Create multer storage for DigitalOcean Spaces
const s3Storage = multerS3({
  s3: s3,
  bucket: process.env.DO_SPACE_BUCKET || "", // Replace with your bucket name
  acl: "public-read", // Ensure files are publicly accessible
  contentType: multerS3.AUTO_CONTENT_TYPE, // Automatically detect content type
  key: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${file.originalname}`;
    cb(null, uniqueName); // File name in Spaces
  },
});

const imageFilter = (req: any, file: any, cb: any) => {
  cb(null, true);
};

// Upload image configurations
const upload = multer({
  storage: s3Storage,
  fileFilter: imageFilter, // Apply image filter
});

export const getFileUrl = async (file: Express.MulterS3.File) => {
  let fileUrl = file?.location;
  if (!fileUrl || !fileUrl.startsWith("http")) {
    fileUrl = `https://${process.env.DO_SPACE_BUCKET}.nyc3.digitaloceanspaces.com/${file?.key}`;
  }
  return fileUrl;
};

export const getFileUrls = async (files: Express.MulterS3.File[]) => {
  return files.map((file) => {
    let fileUrl = file?.location;
    if (!fileUrl || !fileUrl.startsWith("http")) {
      fileUrl = `https://${process.env.DO_SPACE_BUCKET}.nyc3.digitaloceanspaces.com/${file?.key}`;
    }
    return fileUrl;
  });
};

// Single image uploads
const uploadUniversal = upload.fields([
  { name: "profileImage", maxCount: 1 },
  { name: "passportOrNidImg", maxCount: 1 },
  { name: "selfieImg", maxCount: 1 },
  { name: "logoImage", maxCount: 1 },
  { name: "coverImage", maxCount: 1 },
  { name: "licenseImage", maxCount: 1 },
  { name: "certificateImage", maxCount: 1 },
  { name: "image", maxCount: 1 }, // For single image upload
  { name: "video", maxCount: 1 }, // For single video upload
  { name: "banner", maxCount: 1 },
  { name: "images", maxCount: 10 },
]);

// Multiple image uploads
const uploadMultipleImages = upload.array("images", 10);

export const fileUploader = {
  upload,
  uploadUniversal,
  uploadMultipleImages,
};
