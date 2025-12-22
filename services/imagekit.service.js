
import ImageKit from "imagekit";
import fs from "fs";
import dotenv from "dotenv";

dotenv.config();

const imagekit = new ImageKit({
    publicKey: process.env.IMAGEKIT_PUBLIC_KEY,
    privateKey: process.env.IMAGEKIT_PRIVATE_KEY,
    urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT,
});

/**
 * Uploads a file to ImageKit
 * @param {string} filePath - Path to the local file
 * @param {string} fileName - Name to save as in ImageKit
 * @returns {Promise<string>} - The URL of the uploaded image
 */
export const uploadToImageKit = async (filePath, fileName) => {
    try {
        const fileContent = fs.readFileSync(filePath);

        const response = await imagekit.upload({
            file: fileContent, // required
            fileName: fileName, // required
            folder: "/pinterest_automation/products", // Optional: organize in folder
        });

        return response.url;
    } catch (error) {
        console.error("ImageKit Upload Error:", error);
        throw error;
    }
};

/**
 * Deletes a file from ImageKit (Optional, for cleanup)
 * @param {string} fileId 
 */
export const deleteFromImageKit = async (fileId) => {
    try {
        await imagekit.deleteFile(fileId);
    } catch (error) {
        console.error("ImageKit Delete Error:", error);
    }
}
