import { User } from "../models/user.model.js";
import { asyncHandler } from "../utils/asynchandler.js";
import { ApiError } from "../utils/Apierror.js";
import jwt from "jsonwebtoken";


const verifyjwt = asyncHandler(async (req, res, next) => {
  try {
    console.log("COOKIE:", req.cookies);
    console.log("AUTH HEADER:", req.header("Authorization"));

    const token =
      req.cookies?.accessToken ||
      req.header("Authorization")?.replace("Bearer ", "");

    console.log("TOKEN:", token);

    if (!token) {
      throw new ApiError(401, "Access token not found");
    }

    const decodedtoken = jwt.verify(
      token,
      process.env.ACCESS_TOKEN_SECRET
    );

    console.log("DECODED TOKEN:", decodedtoken);

    const user = await User.findById(decodedtoken.id)
      .select("-password -refreshToken");

    if (!user) {
      throw new ApiError(401, "Invalid access token");
    }

    req.user = user;

    next();
  } catch (error) {
    console.log("JWT ERROR:", error.message);

    throw new ApiError(
      401,
      error?.message || "Invalid access token"
    );
  }
});

export default verifyjwt;