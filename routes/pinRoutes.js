import express from "express";
import { getScheduledPins, approvePin, deleteScheduledPin, updateScheduledPin } from "../controllers/pinController.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/", authMiddleware, getScheduledPins);
router.post("/:id/approve", authMiddleware, approvePin);
router.delete("/:id", authMiddleware, deleteScheduledPin);
router.put("/:id", authMiddleware, updateScheduledPin);

export default router;
