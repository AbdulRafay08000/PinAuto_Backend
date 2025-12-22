import Product from "../models/Product.js";
import ScheduledPin from "../models/ScheduledPin.js";
import { generatePinContent, generatePainPoints } from "../services/ai.service.js";
import { createPin } from "../services/pinterest.service.js";
import { uploadToImageKit } from "../services/imagekit.service.js";
import fs from "fs";
import path from "path";
import User from "../models/User.js";

// ✅ CREATE PRODUCT (SAFE MODE)
export const createProduct = async (req, res) => {
  try {
    console.log("=== CREATE PRODUCT REQUEST ===");
    console.log("Full req.body:", JSON.stringify(req.body, null, 2));
    console.log("Files received:", req.files); // Log uploaded files

    // Process uploaded images
    const uploadedImages = [];
    if (req.files && req.files.length > 0) {
      console.log(`Processing ${req.files.length} uploaded files...`);
      for (const file of req.files) {
        try {
          console.log(`Uploading file to ImageKit: ${file.filename}`);
          // Upload to ImageKit
          const imageUrl = await uploadToImageKit(file.path, file.filename);
          console.log(`Upload successful. URL: ${imageUrl}`);
          uploadedImages.push(imageUrl);

          // Delete local temp file
          fs.unlinkSync(file.path);
          console.log(`Deleted local temp file: ${file.path}`);
        } catch (uploadError) {
          console.error(`Failed to upload ${file.filename}:`, uploadError);
          // Optional: Handle error (e.g., skip file or fail request)
        }
      }
    } else {
      console.warn("No files received in req.files");
    }

    const productData = {
      title: req.body.title || "Untitled Product",
      description: req.body.description || "",
      productUrl: req.body.productUrl || "",
      etsyListingId: req.body.etsyListingId || "",
      source: req.body.source || "manual",
      category: req.body.category || "",
      targetBuyers: req.body.targetBuyers || "",
      painPoints: req.body.painPoints || "",
      videoUrl: req.body.videoUrl || "",
      automationMode: req.body.automationMode || "automatic",
      status: req.body.status || "active",
      pinsPerDay: req.body.pinsPerDay || 1,
      imagesPerDay: req.body.imagesPerDay || 1,
      videosPerDay: req.body.videosPerDay || 0,
      images: uploadedImages, // Add uploaded images here
      defaultImage: uploadedImages[0] || "", // Set first image as default
      variants: [],
    };

    console.log("Product data to save:", JSON.stringify(productData, null, 2));

    const product = await Product.create(productData);
    console.log("Product created successfully:", product._id);

    res.status(201).json(product);
  } catch (error) {
    console.error("=== CREATE PRODUCT ERROR ===");
    console.error("Error message:", error.message);
    console.error("Error stack:", error.stack);
    res.status(500).json({ message: error.message, details: error.errors });
  }
};

// GET ALL PRODUCTS
export const getProducts = async (req, res) => {
  try {
    const products = await Product.find().sort({ createdAt: -1 });
    res.json(products);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET SINGLE PRODUCT
export const getProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: "Product not found" });
    res.json(product);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// UPDATE PRODUCT
export const updateProduct = async (req, res) => {
  try {
    console.log("=== UPDATE PRODUCT REQUEST ===");
    console.log("Full req.body:", JSON.stringify(req.body, null, 2));
    console.log("Files received:", req.files);

    // Get existing product first
    const existingProduct = await Product.findById(req.params.id);
    if (!existingProduct) {
      return res.status(404).json({ message: "Product not found" });
    }

    // Process uploaded images (if any new ones)
    const uploadedImages = [];
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        try {
          const imageUrl = await uploadToImageKit(file.path, file.filename);
          uploadedImages.push(imageUrl);
          fs.unlinkSync(file.path);
        } catch (error) {
          console.error("Upload error during update:", error);
        }
      }
    }

    // Prepare update data
    const updateData = {
      ...req.body,
      updatedAt: new Date()
    };

    // If new images were uploaded, add them to existing images
    if (uploadedImages.length > 0) {
      // // Option 1: Replace all images with new ones
      // updateData.images = uploadedImages;
      // updateData.defaultImage = uploadedImages[0];

      // Option 2: Append new images to existing ones (uncomment if you prefer this)
      updateData.images = [...existingProduct.images, ...uploadedImages];
      updateData.defaultImage = updateData.images[0];
    }

    console.log("Update data:", JSON.stringify(updateData, null, 2));

    const updatedProduct = await Product.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    );

    console.log("Product updated successfully:", updatedProduct._id);
    res.json(updatedProduct);
  } catch (error) {
    console.error("=== UPDATE PRODUCT ERROR ===");
    console.error("Error message:", error.message);
    console.error("Error stack:", error.stack);
    res.status(500).json({ message: error.message });
  }
};

// DELETE PRODUCT
export const deleteProduct = async (req, res) => {
  try {
    const deletedProduct = await Product.findByIdAndDelete(req.params.id);
    if (!deletedProduct) return res.status(404).json({ message: "Product not found" });
    res.json({ message: "Product deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
// GENERATE PIN
export const generatePin = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    // 1. Generate Content using AI
    console.log(`Generating pin content for product: ${product.title}`);
    const aiContent = await generatePinContent(product);

    // determine image path (absolute)
    // determine image path (absolute or URL)
    // product.defaultImage should now be a URL from ImageKit
    let imagePath = product.defaultImage;

    // Fallback for legacy local paths (if any exist)
    if (imagePath && !imagePath.startsWith('http')) {
      const relativePath = imagePath.startsWith('/') ? imagePath.slice(1) : imagePath;
      imagePath = path.resolve(process.cwd(), relativePath);
    }

    const pinData = {
      title: aiContent.title,
      description: aiContent.description,
      imageUrl: imagePath,
      board: aiContent.board,
      productId: product._id,
      userId: userId,
      status: 'pending'
    };

    console.log("--------------------------------------------------");
    console.log("[Controller] AI Content Processed:");
    console.log("Title:", pinData.title);
    console.log("Description:", pinData.description);
    console.log("Hashtags:", aiContent.hashtags); // Log non-persisted field too if needed
    console.log("Suggested Board:", pinData.board);
    console.log("--------------------------------------------------");

    // 2. Handle Automation Mode
    if (product.automationMode === 'automatic') {
      console.log("Automation mode is AUTOMATIC. Posting immediately...");
      try {
        // Attempt to post to Pinterest
        // We assume user is connected. If not, this might fail.
        await createPin(userId.toString(), {
          title: pinData.title,
          description: pinData.description,
          imagePath: pinData.imageUrl,
          board: pinData.board
        });

        pinData.status = 'posted';
        pinData.scheduledTime = new Date();
        pinData.pinterestPinId = "auto-posted"; // In real app get ID from response

        // Still save record for history
        const pin = await ScheduledPin.create(pinData);

        return res.json({
          success: true,
          message: "Pin generated and posted successfully",
          pin: pin
        });

      } catch (error) {
        console.error("Auto-posting failed:", error);
        pinData.status = 'failed';
        pinData.error = error.message;
        // Save as failed/pending
        const pin = await ScheduledPin.create(pinData);

        return res.json({
          success: false,
          message: "Pin generated but auto-posting failed. Saved as pending.",
          pin: pin,
          error: error.message
        });
      }
    } else {
      console.log("Automation mode is MANUAL. Saving as pending...");
      // Manual mode -> Save as pending
      const pin = await ScheduledPin.create(pinData);

      return res.json({
        success: true,
        message: "Pin content generated and saved for review",
        pin: pin
      });
    }

  } catch (error) {
    console.error("Generate Pin Error:", error);
    res.status(500).json({ message: error.message });
  }
};

// GENERATE PAIN POINTS
export const generateProductPainPoints = async (req, res) => {
  try {
    const { title, description } = req.body;
    if (!title) {
      return res.status(400).json({ message: "Product title is required" });
    }

    const painPoints = await generatePainPoints(title, description);
    res.json({ painPoints });
  } catch (error) {
    console.error("Pain Point Gen Error:", error);
    res.status(500).json({ message: error.message });
  }
};
