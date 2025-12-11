import express from "express";
import { registerSeller, loginSeller } from "../controllers/sellerAuthController.js";

const router = express.Router();

router.post("/register", registerSeller);
router.post("/login", loginSeller);

export default router;
