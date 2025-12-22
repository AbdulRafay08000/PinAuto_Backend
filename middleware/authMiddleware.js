import jwt from "jsonwebtoken";
import User from "../models/User.js";

const authMiddleware = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Not authorized, no token" });
    }

    const token = authHeader.split(" ")[1];

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Attach user to request
    req.user = await User.findById(decoded.userId).select("-password_hash");

    if (!req.user) {
      return res.status(401).json({ message: "User not found" });
    }

    next(); 

  } catch (error) {
    return res.status(401).json({ message: "Not authorized" });
  }
};

export default authMiddleware;
