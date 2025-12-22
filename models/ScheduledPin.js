import mongoose from "mongoose";

const ScheduledPinSchema = new mongoose.Schema({
    productId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
        required: true
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    title: {
        type: String,
        required: true
    },
    description: {
        type: String
    },
    imageUrl: {
        type: String,
        required: true
    },
    board: {
        type: String
    },
    status: {
        type: String,
        enum: ["pending", "approved", "scheduled", "posted", "failed"],
        default: "pending"
    },
    scheduledTime: {
        type: Date
    },
    pinterestPinId: {
        type: String
    },
    error: {
        type: String
    }
}, {
    timestamps: true
});

export default mongoose.model("ScheduledPin", ScheduledPinSchema);
