import mongoose from "mongoose";

const variantSchema = new mongoose.Schema({
  size: { type: String },
  color: { type: String },
  price: { type: Number },
  stock: { type: Number },
});

const productSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  title: { type: String, required: true },
  description: { type: String },
  productUrl: { type: String },
  etsyListingId: { type: String },
  source: { type: String, enum: ["manual", "etsy"], default: "manual" },
  category: { type: String },
  variants: [variantSchema],
  targetBuyers: { type: String },
  painPoints: { type: String },
  images: [{ type: String }],
  defaultImage: { type: String },
  videoUrl: { type: String },
  pinsPerDay: { type: Number },
  imagesPerDay: { type: Number },
  videosPerDay: { type: Number },
  automationMode: { type: String, enum: ["automatic", "manual"], default: "automatic" },
  status: { type: String, enum: ["active", "paused"], default: "active" },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

export default mongoose.model("Product", productSchema);
