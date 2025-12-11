import jwt from "jsonwebtoken";
import asyncHandler from "express-async-handler";
import User from "../models/userModel.js";
import Delivery from "../models/deliveryModel.js";

export const unifiedProtect = asyncHandler(async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
    try {
      token = req.headers.authorization.split(" ")[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // First try to find as regular user
      let user = await User.findById(decoded.id).select("-password");
      
      if (user) {
        req.user = user;
        return next();
      }

      // Then try to find as delivery agent
      let delivery = await Delivery.findById(decoded.id).select("-password");
      
      if (delivery) {
        req.user = {
          _id: delivery._id,
          name: delivery.name,
          email: delivery.email,
          role: 'deliveryAgent'
        };
        req.delivery = delivery;
        return next();
      }

      // If neither found, return error
      res.status(401);
      throw new Error("User not found");
    } catch (error) {
      console.error("Auth error:", error);
      res.status(401);
      throw new Error("Not authorized, token failed");
    }
  }

  if (!token) {
    res.status(401);
    throw new Error("Not authorized, no token");
  }
});
