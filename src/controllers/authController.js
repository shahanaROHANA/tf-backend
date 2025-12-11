// import bcrypt from "bcryptjs";
// import User from "../models/userModel.js";
// import Delivery from "../models/deliveryModel.js";
// import generateToken from "../utils/generateToken.js";
// import nodemailer from "nodemailer";
// import passport from "passport";
// import { Strategy as GoogleStrategy } from "passport-google-oauth20";

// // REGISTER
// export const register = async (req, res) => {
//   try {
//     const { name, email, password, passwordHash: pwHashFromClient, role } = req.body;
//     const rawPassword = password || pwHashFromClient;

//     if (!name || !email || !rawPassword) {
//       return res.status(400).json({ message: "Missing fields" });
//     }

//     if (name.length < 2)
//       return res.status(400).json({ message: "Name must be at least 2 characters" });

//     if (!email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/))
//       return res.status(400).json({ message: "Invalid email format" });

//     if (rawPassword.length < 6)
//       return res.status(400).json({ message: "Password must be at least 6 characters" });

//     // Validate role
//     const validRoles = ['customer', 'seller', 'admin', 'deliveryAgent'];
//     if (role && !validRoles.includes(role)) 
//       return res.status(400).json({ message: "Invalid role" });

//     // Handle delivery agent registration separately
//     if (role === 'deliveryAgent') {
//       const exists = await Delivery.findOne({ email });
//       if (exists) return res.status(400).json({ message: "Email already registered as delivery agent" });

//       // Generate unique phone number
//       const randomPhone = `+9477${Math.floor(Math.random() * 9000000) + 1000000}`;

//       const delivery = await Delivery.create({
//         name,
//         email,
//         phone: randomPhone, // Generate unique phone
//         password: rawPassword,
//         isAvailable: false,
//         vehicleInfo: {
//           type: 'bike',
//           registrationNumber: 'PENDING',
//           model: 'Not specified'
//         }
//       });

//       const token = generateToken(delivery._id, "delivery");
//       return res.status(201).json({
//         message: "Delivery agent registration successful",
//         token,
//         user: { 
//           id: delivery._id, 
//           name: delivery.name, 
//           email: delivery.email, 
//           role: 'deliveryAgent',
//           isDeliveryAgent: true
//         },
//       });
//     }

//     // Regular user registration
//     const exists = await User.findOne({ email });
//     if (exists) return res.status(400).json({ message: "Email already registered" });

//     const passwordHash = await bcrypt.hash(rawPassword, 10);
//     const user = await User.create({
//       name,
//       email,
//       passwordHash,
//       role: role || "customer",
//     });

//     const token = generateToken(user);
//     res.status(201).json({
//       message: "Registration successful",
//       token,
//       user: { id: user._id, name: user.name, email: user.email, role: user.role },
//     });
//   } catch (err) {
//     console.error("Register error", err);
//     res.status(500).json({ message: "Server error" });
//   }
// };

// // LOGIN
// export const login = async (req, res) => {
//   try {
//     const { email, password } = req.body;
//     if (!email || !password)
//       return res.status(400).json({ message: "Missing fields" });

//     // First try to find as delivery agent
//     const delivery = await Delivery.findOne({ email });
//     if (delivery && (await delivery.matchPassword(password))) {
//       const token = generateToken(delivery._id, "delivery");
//       return res.json({
//         token,
//         user: { 
//           id: delivery._id, 
//           name: delivery.name, 
//           email: delivery.email, 
//           role: 'deliveryAgent',
//           isDeliveryAgent: true
//         },
//       });
//     }

//     // Then try regular user login
//     const user = await User.findOne({ email });
//     if (!user) return res.status(400).json({ message: "Invalid credentials" });

//     const ok = await bcrypt.compare(password, user.passwordHash);
//     if (!ok) return res.status(400).json({ message: "Invalid credentials" });

//     const token = generateToken(user);
//     res.json({
//       token,
//       user: { id: user._id, name: user.name, email: user.email, role: user.role },
//     });
//   } catch (err) {
//     console.error("Login error", err);
//     res.status(500).json({ message: "Server error" });
//   }
// };

// // FORGOT PASSWORD (Send OTP)
// export const forgetPassword = async (req, res) => {
//   try {
//     const { email } = req.body;
//     if (!email) return res.status(400).json({ message: "Email required" });

//     const user = await User.findOne({ email });
//     if (!user) return res.status(404).json({ message: "User not found" });

//     const otp = Math.floor(100000 + Math.random() * 900000).toString();
//     user.resetOtp = otp;
//     user.otpExpire = Date.now() + 10 * 60 * 1000; // 10 mins
//     await user.save();

//     const transporter = nodemailer.createTransport({
//       service: "gmail",
//       auth: {
//         user: process.env.SMTP_USER,
//         pass: process.env.SMTP_PASS,
//       },
//     });

//     await transporter.sendMail({
//       from: process.env.SMTP_USER,
//       to: email,
//       subject: "Password Reset OTP",
//       text: `Your OTP is: ${otp}. Valid for 10 minutes.`,
//     });

//     res.json({ message: "OTP sent to your email" });
//   } catch (err) {
//     console.error("Forget password error:", err);
//     res.status(500).json({ message: "Server error" });
//   }
// };

// // RESET PASSWORD (Verify OTP)
// export const resetPassword = async (req, res) => {
//   try {
//     const { email, otp, newPassword } = req.body;
//     if (!email || !otp || !newPassword)
//       return res.status(400).json({ message: "Missing fields" });

//     const user = await User.findOne({ email });
//     if (!user) return res.status(404).json({ message: "User not found" });

//     if (user.resetOtp !== otp || user.otpExpire < Date.now())
//       return res.status(400).json({ message: "Invalid or expired OTP" });

//     user.passwordHash = await bcrypt.hash(newPassword, 10);
//     user.resetOtp = undefined;
//     user.otpExpire = undefined;
//     await user.save();

//     res.json({ message: "Password reset successful" });
//   } catch (err) {
//     console.error("Reset password error:", err);
//     res.status(500).json({ message: "Server error" });
//   }
// };

// // GOOGLE OAUTH CONFIGURATION
// passport.use(
//   new GoogleStrategy(
//     {
//       clientID: process.env.GOOGLE_CLIENT_ID,
//       clientSecret: process.env.GOOGLE_CLIENT_SECRET,
//       callbackURL: `http://localhost:4004/api/auth/google/callback`,
//     },
//     async (accessToken, refreshToken, profile, done) => {
//       try {
//         // Check if user already exists with this Google ID
//         let user = await User.findOne({ googleId: profile.id });

//         if (user) {
//           return done(null, user);
//         }

//         // Check if user exists with same email
//         user = await User.findOne({ email: profile.emails[0].value });

//         if (user) {
//           // Link Google account to existing user
//           user.googleId = profile.id;
//           user.authProvider = 'google';
//           await user.save();
//           return done(null, user);
//         }

//         // Create new user
//         const newUser = await User.create({
//           name: profile.displayName,
//           email: profile.emails[0].value,
//           googleId: profile.id,
//           authProvider: 'google',
//           role: 'customer', // Default role for OAuth users
//         });

//         return done(null, newUser);
//       } catch (error) {
//         return done(error, null);
//       }
//     }
//   )
// );

// passport.serializeUser((user, done) => {
//   done(null, user.id);
// });

// passport.deserializeUser(async (id, done) => {
//   try {
//     const user = await User.findById(id);
//     done(null, user);
//   } catch (error) {
//     done(error, null);
//   }
// });

// // GOOGLE AUTH CONTROLLERS
// export const googleAuth = passport.authenticate('google', {
//   scope: ['profile', 'email']
// });

// export const googleAuthCallback = (req, res) => {
//   // This will be called after Google authentication
//   // The user will be available in req.user
//   const token = generateToken(req.user);
//   const user = {
//     id: req.user._id,
//     name: req.user.name,
//     email: req.user.email,
//     role: req.user.role
//   };

//   // Redirect to frontend with token and user data
//   const redirectUrl = `${process.env.DOMAIN}/login?token=${token}&user=${encodeURIComponent(JSON.stringify(user))}&oauth=google`;
//   res.redirect(redirectUrl);
// };

import bcrypt from "bcryptjs";
import User from "../models/userModel.js";
import Delivery from "../models/deliveryModel.js";
import Seller from "../models/Seller.js";
import generateToken from "../utils/generateToken.js";
import nodemailer from "nodemailer";
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";

// REGISTER
export const register = async (req, res) => {
  try {
    const { 
      name, 
      email, 
      password, 
      passwordHash: pwHashFromClient, 
      role,
      restaurantName,
      station
    } = req.body;

    const rawPassword = password || pwHashFromClient;

    if (!name || !email || !rawPassword) {
      return res.status(400).json({ message: "Missing fields" });
    }

    if (name.length < 2)
      return res.status(400).json({ message: "Name must be at least 2 characters" });

    if (!email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/))
      return res.status(400).json({ message: "Invalid email format" });

    if (rawPassword.length < 6)
      return res.status(400).json({ message: "Password must be at least 6 characters" });

    const validRoles = ['customer', 'seller', 'admin', 'deliveryAgent'];
    if (role && !validRoles.includes(role)) 
      return res.status(400).json({ message: "Invalid role" });

    // Delivery agent registration
    if (role === 'deliveryAgent') {
      const exists = await Delivery.findOne({ email });
      if (exists) {
        return res.status(400).json({ message: "Email already registered as delivery agent" });
      }

      const randomPhone = `+9477${Math.floor(Math.random() * 9000000) + 1000000}`;

      const delivery = await Delivery.create({
        name,
        email,
        phone: randomPhone,
        password: rawPassword,
        isAvailable: false,
        vehicleInfo: {
          type: 'bike',
          registrationNumber: 'PENDING',
          model: 'Not specified'
        }
      });

      const token = generateToken(delivery._id, "delivery");
      return res.status(201).json({
        message: "Delivery agent registration successful",
        token,
        user: { 
          id: delivery._id, 
          name: delivery.name, 
          email: delivery.email, 
          role: 'deliveryAgent',
          isDeliveryAgent: true
        },
      });
    }

    // Regular user registration (customer, seller, admin)
    const exists = await User.findOne({ email });
    if (exists) return res.status(400).json({ message: "Email already registered" });

    const passwordHash = await bcrypt.hash(rawPassword, 10);
    const user = await User.create({
      name,
      email,
      passwordHash,
      role: role || "customer",
    });

    // If seller role, create Seller document as well
    if (role === 'seller') {
      if (!restaurantName || !station) {
        return res.status(400).json({ message: "Restaurant name and station are required for sellers" });
      }

      await Seller.create({
        name,
        email,
        password: rawPassword,   // Seller model hashes it
        restaurantName,
        station,
        isApproved: false,
        isActive: true
      });
    }

    const token = generateToken(user);
    res.status(201).json({
      message: "Registration successful",
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role },
    });
  } catch (err) {
    console.error("Register error", err);
    res.status(500).json({ message: "Server error" });
  }
};

// LOGIN
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ message: "Missing fields" });

    // First try to find as delivery agent
    const delivery = await Delivery.findOne({ email });
    if (delivery && (await delivery.matchPassword(password))) {
      const token = generateToken(delivery._id, "delivery");
      return res.json({
        token,
        user: { 
          id: delivery._id, 
          name: delivery.name, 
          email: delivery.email, 
          role: 'deliveryAgent',
          isDeliveryAgent: true
        },
      });
    }

    // Then try regular user login
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "Invalid credentials" });

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(400).json({ message: "Invalid credentials" });

    const token = generateToken(user);
    
    // For sellers, fetch seller-specific data from Seller collection
    let userData = { id: user._id, name: user.name, email: user.email, role: user.role };
    
    if (user.role === 'seller') {
      try {
        const sellerRecord = await Seller.findOne({ email: user.email });
        if (sellerRecord) {
          // Merge seller-specific data
          userData = {
            ...userData,
            restaurantName: sellerRecord.restaurantName,
            station: sellerRecord.station,
            isActive: sellerRecord.isActive,
            isApproved: sellerRecord.isApproved,
            phone: sellerRecord.phone,
            address: sellerRecord.address,
            description: sellerRecord.description
          };
        }
      } catch (error) {
        console.error('Error fetching seller data:', error);
        // Continue with basic user data if seller record fetch fails
      }
    }

    res.json({
      token,
      user: userData,
    });
  } catch (err) {
    console.error("Login error", err);
    res.status(500).json({ message: "Server error" });
  }
};

// FORGOT PASSWORD (Send OTP)
export const forgetPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: "Email required" });

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    user.resetOtp = otp;
    user.otpExpire = Date.now() + 10 * 60 * 1000; // 10 mins
    await user.save();

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    await transporter.sendMail({
      from: process.env.SMTP_USER,
      to: email,
      subject: "Password Reset OTP",
      text: `Your OTP is: ${otp}. Valid for 10 minutes.`,
    });

    res.json({ message: "OTP sent to your email" });
  } catch (err) {
    console.error("Forget password error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// RESET PASSWORD (Verify OTP)
export const resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;
    if (!email || !otp || !newPassword)
      return res.status(400).json({ message: "Missing fields" });

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });

    if (user.resetOtp !== otp || user.otpExpire < Date.now())
      return res.status(400).json({ message: "Invalid or expired OTP" });

    user.passwordHash = await bcrypt.hash(newPassword, 10);
    user.resetOtp = undefined;
    user.otpExpire = undefined;
    await user.save();

    res.json({ message: "Password reset successful" });
  } catch (err) {
    console.error("Reset password error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// GOOGLE OAUTH CONFIGURATION
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: `http://localhost:4004/api/auth/google/callback`,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        let user = await User.findOne({ googleId: profile.id });

        if (user) {
          return done(null, user);
        }

        user = await User.findOne({ email: profile.emails[0].value });

        if (user) {
          user.googleId = profile.id;
          user.authProvider = 'google';
          await user.save();
          return done(null, user);
        }

        const newUser = await User.create({
          name: profile.displayName,
          email: profile.emails[0].value,
          googleId: profile.id,
          authProvider: 'google',
          role: 'customer',
        });

        return done(null, newUser);
      } catch (error) {
        return done(error, null);
      }
    }
  )
);

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

// GOOGLE AUTH CONTROLLERS
export const googleAuth = passport.authenticate('google', {
  scope: ['profile', 'email']
});

export const googleAuthCallback = (req, res) => {
  const token = generateToken(req.user);
  const user = {
    id: req.user._id,
    name: req.user.name,
    email: req.user.email,
    role: req.user.role
  };

  const redirectUrl = `${process.env.DOMAIN}/login?token=${token}&user=${encodeURIComponent(JSON.stringify(user))}&oauth=google`;
  res.redirect(redirectUrl);
};

// VERIFY TOKEN
export const verifyToken = async (req, res) => {
  try {
    // The protect middleware already verified the token and set req.user
    if (!req.user) {
      return res.status(401).json({ message: "Invalid token" });
    }

    res.json({
      user: {
        id: req.user._id,
        name: req.user.name,
        email: req.user.email,
        role: req.user.role
      }
    });
  } catch (err) {
    console.error("Token verification error:", err);
    res.status(401).json({ message: "Token verification failed" });
  }
};