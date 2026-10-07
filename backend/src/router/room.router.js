import { Router } from "express";
import verifyJWT from "../middleware/auth.middlewares.js";
import {createRoom, joinRoom} from "../controllers/room.controller.js";

const router=Router();

router.route("/create").post(verifyJWT,createRoom);
router.route("/join").post(verifyJWT,joinRoom);

export default router;