import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";

// REGISTER USER
export const register = async (req, res) => {
  try {
    const { email, password, name, business_name, timezone } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user
    const newUser = new User({
      email,
      password_hash: hashedPassword, // ✅ will set afterwards
      // password_hash,
      name,
      business_name,
      timezone,
    });

    await newUser.save();

    res.status(201).json({
      message: "User registered successfully",
      userId: newUser._id, // ✅ FIXED (user → newUser)
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// LOGIN USER
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    // Compare password
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    // Generate token
    const token = jwt.sign(
      {
        userId: user._id,
        // plan: user.plan_tier,
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        business_name: user.business_name,
        plan_tier: user.plan_tier,
      },
    });

  } catch (error) {
    console.error("Login Error:", error);
    res.status(500).json({ message: error.message });
  }
};
