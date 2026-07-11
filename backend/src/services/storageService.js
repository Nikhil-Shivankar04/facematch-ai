const cloudinary = require("cloudinary").v2;
const streamifier = require("streamifier");

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Uploads a single image buffer to Cloudinary, organized under
 * events/{eventId}/ so all of an event's photos live in one folder.
 *
 * Returns the data our Photo model needs to store. This is the ONLY
 * function in the app that talks to Cloudinary directly - if we ever
 * swap to S3, only this file needs to change, not any controller.
 */
function uploadImageBuffer(buffer, eventId) {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: `nikk-photography/events/${eventId}`,
        resource_type: "image",
      },
      (error, result) => {
        if (error) return reject(error);

        resolve({
          imageUrl: result.secure_url,
          // Cloudinary transformation URL for a fast-loading thumbnail -
          // generated on-the-fly, no separate resize step needed.
          thumbnailUrl: cloudinary.url(result.public_id, {
            width: 400,
            height: 400,
            crop: "fill",
            quality: "auto",
            fetch_format: "auto",
          }),
          cloudinaryId: result.public_id,
          width: result.width,
          height: result.height,
          fileSizeBytes: result.bytes,
        });
      }
    );

    streamifier.createReadStream(buffer).pipe(uploadStream);
  });
}

/**
 * Deletes an image from Cloudinary by its public_id.
 * Used when a photo or an entire event is deleted.
 */
async function deleteImage(cloudinaryId) {
  await cloudinary.uploader.destroy(cloudinaryId);
}

module.exports = { uploadImageBuffer, deleteImage };
