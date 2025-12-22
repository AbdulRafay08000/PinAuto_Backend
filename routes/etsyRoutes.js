import express from "express";
import { getEtsyAuthUrl,exchangeToken} from "../controllers/etsy.controller.js";


const router = express.Router();
// Route to get Etsy OAuth URL
router.get("/auth", getEtsyAuthUrl);

// Route to exchange code for access token
router.post("/exchange-token", exchangeToken);

export default router; 
