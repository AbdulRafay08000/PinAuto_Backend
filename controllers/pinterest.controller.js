import { startLogin, createPin } from "../services/pinterest.service.js";
import User from "../models/User.js";
import { encryptPassword, decryptPassword } from "../utils/encryption.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Use the same path resolution as the service (relative to process.cwd())
const SESSION_DIR = path.resolve(process.cwd(), "sessions/pinterest");
const getSessionPath = (userId) => path.join(SESSION_DIR, `${userId}.json`);

export const savePinterestCredentials = async (req, res) => {
  try {
    const { email, password } = req.body;
    const userId = req.user._id;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required"
      });
    }

    const encryptedPassword = encryptPassword(password);

    await User.findByIdAndUpdate(userId, {
      pinterest_email: email,
      pinterest_password_encrypted: encryptedPassword
    });

    res.json({
      success: true,
      message: "Pinterest credentials saved successfully"
    });
  } catch (error) {
    console.error("Error saving Pinterest credentials:", error);
    res.status(500).json({
      success: false,
      message: "Failed to save credentials"
    });
  }
};

export const connectPinterest = async (req, res) => {
  try {
    console.log("Connecting to Pinterest");
    const userId = req.user._id.toString(); // from auth middleware

    // Get user credentials
    const user = await User.findById(userId);
    if (!user.pinterest_email || !user.pinterest_password_encrypted) {
      return res.status(400).json({
        success: false,
        message: "Pinterest credentials not found. Please save credentials first."
      });
    }

    const password = decryptPassword(user.pinterest_password_encrypted);

    // Pass credentials to service
    await startLogin(userId, {
      email: user.pinterest_email,
      password: password
    });

    res.json({
      success: true,
      message: "Pinterest login started"
    });
  } catch (error) {
    console.error("Pinterest connect error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to start Pinterest login"
    });
  }
};

export const createPinterestPin = async (req, res) => {
  try {
    const userId = req.user._id.toString();
    const { title, description, imagePath, board } = req.body;

    if (!title) {
      return res.status(400).json({
        success: false,
        message: "Title is required"
      });
    }

    // Image path is now optional - skip validation if not provided
    let absoluteImagePath = null;
    if (imagePath) {
      // Convert relative path to absolute path
      // imagePath might be like "/uploads/products/filename.jpg" or just "filename.jpg"
      if (!path.isAbsolute(imagePath)) {
        // If it starts with /uploads, remove the leading slash
        const relativePath = imagePath.startsWith('/') ? imagePath.slice(1) : imagePath;
        absoluteImagePath = path.join(__dirname, '..', relativePath);
      } else {
        absoluteImagePath = imagePath;
      }

      // Check if file exists only if imagePath is provided
      if (!fs.existsSync(absoluteImagePath)) {
        console.warn(`Image file not found: ${imagePath}, continuing without image`);
        absoluteImagePath = null;
      }
    }

    const pinData = {
      title,
      description: description || '',
      imagePath: absoluteImagePath,
      board: board || ''
    };

    await createPin(userId, pinData);

    res.json({
      success: true,
      message: "Pin created successfully"
    });
  } catch (error) {
    console.error("Error creating Pinterest pin:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to create pin"
    });
  }
};

export const getPinterestStatus = async (req, res) => {
  try {
    const userId = req.user._id.toString();
    const sessionPath = getSessionPath(userId);

    console.log(`Checking Pinterest status for user ${userId}`);
    console.log(`Session path: ${sessionPath}`);

    const authenticated = fs.existsSync(sessionPath);

    if (authenticated) {
      const stats = fs.statSync(sessionPath);
      console.log(`Session file exists. Last modified: ${stats.mtime}`);
    } else {
      console.log(`Session file does not exist at: ${sessionPath}`);
    }

    res.json({
      authenticated,
      authenticatedAt: authenticated ? fs.statSync(sessionPath).mtime.toISOString() : undefined
    });
  } catch (error) {
    console.error("Error getting Pinterest status:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to get Pinterest status"
    });
  }
};