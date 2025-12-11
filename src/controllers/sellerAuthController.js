// import Seller from "../models/Seller.js";
// import jwt from "jsonwebtoken";

// const generateToken = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: "7d" });

// // Register Seller
// export const registerSeller = async (req, res) => {
//   try {
//     const { name, email, password, restaurantName, station } = req.body;
//     const exists = await Seller.findOne({ email });
//     if (exists) return res.status(400).json({ message: "Seller already exists" });

//     const seller = await Seller.create({ name, email, password, restaurantName, station });
//     res.status(201).json({
//       _id: seller._id,
//       name: seller.name,
//       restaurantName: seller.restaurantName,
//       token: generateToken(seller._id),
//     });
//   } catch (err) {
//     res.status(500).json({ message: "Server error" });
//   }
// };

// // Login Seller
// export const loginSeller = async (req, res) => {
//   const { email, password } = req.body;
//   const seller = await Seller.findOne({ email }).select('-password').populate('restaurant');
//   if (seller && (await seller.matchPassword(password))) {
//     res.json({
//       seller: seller,
//       token: generateToken(seller._id),
//     });
//   } else {
//     res.status(401).json({ message: "Invalid credentials" });
//   }
// };
import Seller from "../models/Seller.js";
import jwt from "jsonwebtoken";

const generateToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: "7d" });

// Register Seller (used by dedicated seller registration endpoint)
export const registerSeller = async (req, res) => {
  try {
    const { name, email, password, restaurantName, station } = req.body;

    if (!name || !email || !password || !restaurantName || !station) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const exists = await Seller.findOne({ email });
    if (exists) return res.status(400).json({ message: "Seller already exists" });

    const seller = await Seller.create({
      name,
      email,
      password,
      restaurantName,
      station,
      isApproved: false,
      isActive: true
    });

    res.status(201).json({
      _id: seller._id,
      name: seller.name,
      restaurantName: seller.restaurantName,
      token: generateToken(seller._id),
    });
  } catch (err) {
    console.error("Register seller error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// Login Seller (for seller dashboard login)
export const loginSeller = async (req, res) => {
  try {
    const { email, password } = req.body;
    const seller = await Seller.findOne({ email }).populate('restaurant');

    if (!seller) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const passwordMatch = await seller.matchPassword(password);
    if (!passwordMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Remove password from response
    const sellerObj = seller.toObject();
    delete sellerObj.password;

    res.json({
      seller: sellerObj,
      token: generateToken(seller._id),
    });
  } catch (err) {
    console.error("Login seller error:", err);
    res.status(500).json({ message: "Server error" });
  }
};