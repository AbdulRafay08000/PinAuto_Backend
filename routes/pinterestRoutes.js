import express from "express";
import { connectPinterest, createPinterestPin, getPinterestStatus, savePinterestCredentials } from "../controllers/pinterest.controller.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

// Save Pinterest credentials
router.post("/credentials", authMiddleware, savePinterestCredentials);

// Connect Pinterest account
router.post("/connect", authMiddleware, connectPinterest);

// Create a Pinterest pin
router.post("/create-pin", authMiddleware, createPinterestPin);

// Get Pinterest connection status
router.get("/status", authMiddleware, getPinterestStatus);

export default router;
