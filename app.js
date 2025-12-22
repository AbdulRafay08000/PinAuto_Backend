import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import connectDB from "./config/db.js"; // make sure .js is included
import path from "path";
import { fileURLToPath } from "url";

// Routes
import authRoutes from "./routes/authRoutes.js";
import productRoutes from "./routes/productRoutes.js";
import pinterestRoutes from "./routes/pinterestRoutes.js";
import pinRoutes from "./routes/pinRoutes.js";
import ets from "./routes/etsyRoutes.js";

dotenv.config();
connectDB();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// app.use(cors());
app.use(cors({
  origin: "http://localhost:8080", // your React frontend
  credentials: true
}));
app.use(express.json());

// Health check
app.get("/", (req, res) => {
  res.send("API is running on port 5000");
});

// Static folder for uploads
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/pinterest", pinterestRoutes);
app.use("/api/pins", pinRoutes);
app.use("/api/etsy", ets);

export default app;
