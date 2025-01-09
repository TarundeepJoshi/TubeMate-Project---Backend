import { v2 as cloudinary } from "cloudinary";
import fs from "fs";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const uploadOnCloudinary = async (localFilePath) => {
  try {
    if (!localFilePath) return null;
    const response = await cloudinary.uploader.upload(localFilePath, {
      resource_type: "auto",
    });
    // console.log("File is uploaded successfully", response.url);
    fs.unlinkSync(localFilePath);
    return response;
  } catch (error) {
    fs.unlinkSync(localFilePath);
    return null;
  }
};

const deleteFileFromCloudinary = async (url, isVideo = false) => {
  try {
    if (!url) return null;

    // Extract public_id from cloudinary URL
    const publicId = url.split("/").pop().split(".")[0];
    const resourceType = isVideo ? "video" : "image";

    // Delete the file from cloudinary
    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: resourceType,
    });

    return result;
  } catch (error) {
    console.error("Error deleting file from cloudinary:", error);
    return null;
  }
};

export { uploadOnCloudinary, deleteFileFromCloudinary };
