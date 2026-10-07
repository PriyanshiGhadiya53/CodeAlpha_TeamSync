import { Router } from "express";
import {resetPassword,changeCurrentPassword,getCurrentUser, login, logout, refreshAcecsessToken, register,forgotPassword} from "../controllers/auth.controller.js";
import verifyJWT from "../middleware/auth.middlewares.js";


const router = Router();

router.route("/register").post(register);
router.route("/login").post(login);
router.route("/me").get(verifyJWT,getCurrentUser);
router.route("/refresh").post(refreshAcecsessToken);
router.route("/logout").post(verifyJWT,logout);
router.route("/change-password").patch(verifyJWT,changeCurrentPassword);
router.route("/forgot-password").post(forgotPassword);
router.route("/reset-password/:token").patch(resetPassword);

export default router;