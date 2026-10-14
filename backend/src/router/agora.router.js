import { Router } from "express";
import verifyJWT from "../middleware/auth.middlewares.js";
import { generateAgoraToken } from "../controllers/agora.controller.js";

const router = Router();

router.post("/token", verifyJWT, generateAgoraToken);

export default router;