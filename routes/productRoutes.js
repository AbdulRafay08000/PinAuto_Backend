import express from "express";
import upload from "../middleware/upload.js";
import {
  getProducts,
  getProductById,
  updateProduct,
  deleteProduct,
  createProduct,
  generatePin,
  generateProductPainPoints
} from "../controllers/productController.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

// Use upload.array('images', 10) to accept up to 10 images
router.post("/", upload.array('images', 10), createProduct);
router.get("/", getProducts);
router.get("/:id", getProductById);
router.put("/:id", upload.array('images', 10), updateProduct);
router.delete("/:id", authMiddleware, deleteProduct);

// Generate Pin
router.post("/:id/generate-pin", authMiddleware, generatePin);

// Generate Pain Points (Available even before creating product)
router.post("/generate-pain-points", authMiddleware, generateProductPainPoints);

export default router;