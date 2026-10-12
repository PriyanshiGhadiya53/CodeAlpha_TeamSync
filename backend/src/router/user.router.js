import { Router } from "express";
import { register,login,logout,refreshAcecsessToken,changeCurrentPassword,getCurrentUser } from "../controllers/auth.controller.js";

import verifyjwt from "../middlewares/auth.middleware.js";

const router = Router();

router.route("/register").post(register);
router.route("/login").post(login);
router.route("/logout").post( logout);
router.route("/refresh").post(refreshAcecsessToken);
router.route("/change-password").patch(verifyjwt,changeCurrentPassword);
router.route("/me").get(verifyjwt,getCurrentUser);


export default router;