// import jwt from "jsonwebtoken";
// import Seller from "../models/Seller.js";

// export const protectSeller = async (req, res, next) => {
//   const token = req.headers.authorization?.split(" ")[1];
//   if (!token) return res.status(401).json({ message: "No token" });

//   try {
//     const decoded = jwt.verify(token, process.env.JWT_SECRET);
//     req.seller = await Seller.findById(decoded.id).select("-password");
//     next();
//   } catch (err) {
//     res.status(401).json({ message: "Invalid token" });
//   }
// };
// middleware/sellerAuthMiddleware.js
import jwt from 'jsonwebtoken';
import Seller from '../models/Seller.js';
import User from '../models/userModel.js';

export const protectSeller = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Not authorized, no token' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // First try to find as Seller (for approved sellers)
    let seller = await Seller.findById(decoded.id).select('-password');
    
    // If not found in Seller model, try User model (for newly registered sellers)
    if (!seller) {
      const user = await User.findById(decoded.id).select('-passwordHash');
      if (!user || user.role !== 'seller') {
        return res.status(401).json({ message: 'Seller not found' });
      }
      
      // Try to find corresponding seller in Seller model by email
      const correspondingSeller = await Seller.findOne({ email: user.email }).select('-password');
      
      if (correspondingSeller) {
        // Found the seller in Seller model, use that
        seller = correspondingSeller;
      } else {
        // Create a seller-like object from user data
        seller = {
          _id: user._id,
          name: user.name,
          email: user.email,
          role: 'seller',
          isApproved: true, // Auto-approve for now
          station: 'Default Station' // Default station
        };
      }
    }
    
    if (!seller.isApproved) {
      return res.status(403).json({ message: 'Seller not approved yet' });
    }
    
    req.seller = seller;
    next();
  } catch (err) {
    console.error(err);
    res.status(401).json({ message: 'Token failed' });
  }
};
