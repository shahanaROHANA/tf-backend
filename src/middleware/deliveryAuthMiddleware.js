import jwt from "jsonwebtoken";
import asyncHandler from "express-async-handler";
import Delivery from "../models/deliveryModel.js";

export const protectDelivery = asyncHandler(async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
    try {
      token = req.headers.authorization.split(" ")[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      const delivery = await Delivery.findById(decoded.id).select("-password");
      if (!delivery) {
        res.status(401);
        throw new Error("Delivery person not found");
      }
      
      req.delivery = delivery;
      next();
    } catch (error) {
      console.error("Delivery auth error:", error);
      res.status(401);
      throw new Error("Not authorized, token failed");
    }
  }

  if (!token) {
    res.status(401);
    throw new Error("Not authorized, no token");
  }
});
