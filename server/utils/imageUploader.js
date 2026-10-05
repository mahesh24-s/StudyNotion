const cloudinary = require('cloudinary').v2;
const fs = require('fs');

exports.uploadImageToCloudinary = async(file,folder,height,quality="auto") => {
    const options = {folder};
    if(height){
        options.height=height;
    }
    if (typeof quality === "number") {
        options.quality = Math.max(80, quality);
    } else if (quality) {
        options.quality = quality;
    }
    options.resource_type="auto";

    try {
        return await cloudinary.uploader.upload(file.tempFilePath, options);
    } finally {
        // Delete the temporary file from local disk whether upload succeeded or failed
        if (file?.tempFilePath && fs.existsSync(file.tempFilePath)) {
            fs.unlink(file.tempFilePath, (err) => {
                if (err) console.error("Error deleting temp file:", err);
            });
        }
    }
}
