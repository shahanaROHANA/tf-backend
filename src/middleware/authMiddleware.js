

// src/middleware/authMiddleware.js
import jwt from "jsonwebtoken";
import asyncHandler from "express-async-handler";
import User from "../models/userModel.js";

// Protect routes (authentication)
export const protect = asyncHandler(async (req, res, next) => {
  console.log('🔍 Auth middleware - protect called');
  const authHeader = req.headers.authorization;
  console.log('🔍 Auth header:', authHeader ? `${authHeader.substring(0, 20)}...` : 'No auth header');
  
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    console.log('❌ No valid auth header');
    return res.status(401).json({ message: "No token, authorization denied" });
  }

  const token = authHeader.split(" ")[1];
  console.log('🔍 Extracted token:', token ? `${token.substring(0, 20)}...` : 'No token');
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('🔍 Decoded JWT:', { id: decoded.id, iat: decoded.iat, exp: decoded.exp });
    
    req.user = await User.findById(decoded.id).select("-passwordHash");
    console.log('🔍 User found:', req.user ? { _id: req.user._id, email: req.user.email, role: req.user.role } : 'No user');
    
    if (!req.user) {
      console.log('❌ User not found in database');
      return res.status(401).json({ message: "User not found" });
    }
    
    next();
  } catch (err) {
    console.error('❌ JWT verification failed:', err.message);
    console.error('❌ JWT error stack:', err.stack);
    return res.status(401).json({ message: "Token invalid", error: err.message });
  }
});

// Middleware: only admin can access
export const isAdmin = (req, res, next) => {
  if (!req.user) return res.status(401).json({ message: "Not authenticated" });
  if (req.user.role === "admin") return next();
  return res.status(403).json({ message: "Admin only" });
};

// Middleware: admin OR seller can access
export const isAdminOrSeller = (req, res, next) => {
  if (!req.user) return res.status(401).json({ message: "Not authenticated" });
  if (req.user.role === "admin" || req.user.role === "seller") return next();
  return res.status(403).json({ message: "Admin or seller only" });
};
