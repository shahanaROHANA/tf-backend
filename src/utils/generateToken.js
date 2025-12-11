// utils/generateToken.js
import jwt from 'jsonwebtoken';

export default function generateToken(user, userType = 'user') {
  const payload = { 
    id: user._id, 
    role: user.role || userType, 
    email: user.email,
    userType: userType 
  };
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });
}
