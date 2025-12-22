import ScheduledPin from "../models/ScheduledPin.js";
import { createPin } from "../services/pinterest.service.js";
import Product from "../models/Product.js";
import User from "../models/User.js";
import { decryptPassword } from "../utils/encryption.js";

// Get all scheduled/pending pins
export const getScheduledPins = async (req, res) => {
    try {
        const pins = await ScheduledPin.find({ userId: req.user._id })
            .sort({ createdAt: -1 });
        res.json(pins);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Approve a pending pin -> Post to Pinterest
export const approvePin = async (req, res) => {
    try {
        const pinId = req.params.id;
        const pin = await ScheduledPin.findById(pinId);

        if (!pin) {
            return res.status(404).json({ message: "Pin not found" });
        }

        if (pin.status !== 'pending') {
            return res.status(400).json({ message: "Pin is not in pending status" });
        }

        // Get user credentials
        const user = await User.findById(req.user._id);
        if (!user.pinterest_connected || !user.pinterest_password_encrypted) {
            return res.status(400).json({ message: "Pinterest not connected" });
        }

        // Post to Pinterest
        // Depending on logic, createPin might need decryption inside or passed in. 
        // Usually services use the session file. 
        // But if we need to login again, we might need credentials.
        // The createPin service currently checks for session file.

        console.log("Approving pin", pinId);
        const pinDataToCreate = {
            title: pin.title,
            description: pin.description,
            imagePath: pin.imageUrl, // This should be absolute path or URL
            board: pin.board,
            scheduledTime: pin.scheduledTime
        };
        console.log("Passing to createPin:", JSON.stringify(pinDataToCreate, null, 2));

        try {
            await createPin(req.user._id.toString(), pinDataToCreate);

            pin.status = 'posted';
            pin.scheduledTime = new Date();
            await pin.save();

            res.json({ success: true, message: "Pin approved and posted successfully" });
        } catch (error) {
            console.error("Posting failed:", error);
            pin.status = 'failed';
            pin.error = error.message;
            await pin.save();
            res.status(500).json({ message: "Failed to post pin to Pinterest: " + error.message });
        }

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Delete a scheduled pin
export const deleteScheduledPin = async (req, res) => {
    try {
        await ScheduledPin.findByIdAndDelete(req.params.id);
        res.json({ message: "Pin deleted successfully" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Update a scheduled pin
export const updateScheduledPin = async (req, res) => {
    try {
        const pinId = req.params.id;
        const updates = req.body;

        const pin = await ScheduledPin.findOne({ _id: pinId, userId: req.user._id });

        if (!pin) {
            return res.status(404).json({ message: "Pin not found" });
        }

        if (pin.status === 'posted') {
            return res.status(400).json({ message: "Cannot edit a pin that has already been posted" });
        }

        // Allow updating title, description, board, and scheduledTime
        if (updates.title) pin.title = updates.title;
        if (updates.description) pin.description = updates.description;
        if (updates.board) pin.board = updates.board;
        if (updates.scheduledTime) pin.scheduledTime = updates.scheduledTime;
        if (updates.status) pin.status = updates.status; // Allow revert to pending if needed

        await pin.save();

        res.json({ success: true, message: "Pin updated successfully", pin });
    } catch (error) {
        console.error("Update Pin Error:", error);
        res.status(500).json({ message: error.message });
    }
};
