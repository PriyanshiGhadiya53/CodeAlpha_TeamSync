
import { Router } from "express";
import { generateAgoraToken } from "../controllers/agora.controller.js";

const router = Router();

router.route("/token").post(generateAgoraToken);

export default router;
