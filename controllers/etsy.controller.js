import dotenv from "dotenv";
import axios from "axios";
import crypto from "crypto";

dotenv.config();

const ETSY_CLIENT_ID = process.env.ETSY_CLIENT_ID;
const ETSY_CLIENT_SECRET = process.env.ETSY_CLIENT_SECRET;
const REDIRECT_URI = process.env.ETSY_REDIRECT_URI; // http://localhost:8080/dashboard
if (!ETSY_CLIENT_ID || !ETSY_CLIENT_SECRET || !REDIRECT_URI) {
  console.error("⚠️  Missing Etsy environment variables:");
  console.error("ETSY_CLIENT_ID:", ETSY_CLIENT_ID ? "✓ Set" : "✗ Missing");
  console.error("ETSY_CLIENT_SECRET:", ETSY_CLIENT_SECRET ? "✓ Set" : "✗ Missing");
  console.error("ETSY_REDIRECT_URI:", REDIRECT_URI ? "✓ Set" : "✗ Missing");
}

// In-memory store for demo - use Redis or database in production
const pendingStates = new Map();

export const getEtsyAuthUrl = (req, res) => {
  try {
    if (!ETSY_CLIENT_ID || !REDIRECT_URI) {
      return res.status(500).json({ 
        message: "Etsy configuration missing. Please check environment variables." 
      });
    }

    const scope = "listings_r shops_r";
    const state = crypto.randomUUID(); // Generate secure random state
    
    // Store state with timestamp for validation (expire after 10 minutes)
    pendingStates.set(state, {
      timestamp: Date.now(),
      userId: req.user?.id, // If you have user authentication
    });

    const url = `https://www.etsy.com/oauth/connect?response_type=code&client_id=${ETSY_CLIENT_ID}&redirect_uri=${encodeURIComponent(
      REDIRECT_URI
    )}&scope=${encodeURIComponent(scope)}&state=${state}`;

    res.json({ url });
  } catch (error) {
    console.error("Error generating Etsy auth URL:", error);
    res.status(500).json({ message: "Failed to generate authentication URL" });
  }
};
//  res.redirect(url); 
export const exchangeToken = async (req, res) => {
  const { code, state } = req.body;

  if (!code) {
    return res.status(400).json({ message: "Authorization code is required" });
  }

  if (!state) {
    return res.status(400).json({ message: "State parameter is required" });
  }

  try {
    // Validate state to prevent CSRF attacks
    const storedState = pendingStates.get(state);
    
    if (!storedState) {
      return res.status(400).json({ message: "Invalid or expired state parameter" });
    }

    // Check if state is expired (10 minutes)
    const TEN_MINUTES = 10 * 60 * 1000;
    if (Date.now() - storedState.timestamp > TEN_MINUTES) {
      pendingStates.delete(state);
      return res.status(400).json({ message: "State parameter has expired. Please try again." });
    }

    // Clean up used state
    pendingStates.delete(state);

    // Exchange code for access token
    const params = new URLSearchParams();
    params.append("grant_type", "authorization_code");
    params.append("client_id", ETSY_CLIENT_ID);
    params.append("client_secret", ETSY_CLIENT_SECRET);
    params.append("code", code);
    params.append("redirect_uri", REDIRECT_URI);

    const response = await axios.post(
      "https://api.etsy.com/v3/public/oauth/token",
      params,
      { 
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        timeout: 10000, // 10 second timeout
      }
    );

    const { 
      access_token, 
      refresh_token, 
      expires_in, 
      token_type 
    } = response.data;

    // Calculate expiration timestamp
    const expiresAt = new Date(Date.now() + expires_in * 1000);

    // TODO: Save tokens to database associated with user
    // Example:
    // await db.etsyTokens.create({
    //   userId: req.user.id,
    //   accessToken: access_token,
    //   refreshToken: refresh_token,
    //   expiresAt: expiresAt,
    //   tokenType: token_type,
    // });

    // Don't send actual tokens to frontend for security
    // Just confirm success
    res.json({ 
      success: true,
      message: "Successfully connected to Etsy",
      expiresAt: expiresAt.toISOString(),
    });

  } catch (err) {
    console.error("Etsy token exchange error:", err.response?.data || err.message);
    
    // Handle specific Etsy API errors
    if (err.response?.status === 400) {
      return res.status(400).json({ 
        message: "Invalid authorization code. Please try connecting again.",
        error: err.response.data 
      });
    }
    
    if (err.response?.status === 401) {
      return res.status(401).json({ 
        message: "Authentication failed. Please check your Etsy app credentials.",
        error: err.response.data 
      });
    }

    res.status(500).json({ 
      message: "Failed to connect to Etsy. Please try again later.",
      error: process.env.NODE_ENV === "development" ? err.message : undefined
    });
  }
};

// Helper function to refresh expired tokens
export const refreshEtsyToken = async (refreshToken) => {
  try {
    const params = new URLSearchParams();
    params.append("grant_type", "refresh_token");
    params.append("client_id", ETSY_CLIENT_ID);
    params.append("client_secret", ETSY_CLIENT_SECRET);
    params.append("refresh_token", refreshToken);

    const response = await axios.post(
      "https://api.etsy.com/v3/public/oauth/token",
      params,
      { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
    );

    return response.data;
  } catch (error) {
    console.error("Token refresh failed:", error);
    throw error;
  }
};

// Cleanup expired states periodically
setInterval(() => {
  const now = Date.now();
  const TEN_MINUTES = 10 * 60 * 1000;
  
  for (const [state, data] of pendingStates.entries()) {
    if (now - data.timestamp > TEN_MINUTES) {
      pendingStates.delete(state);
    }
  }
}, 5 * 60 * 1000); // Run every 5 minutes