import { User } from "../models/user.models.js";
import { asyncHandler } from "../utils/asynchandler.js";
import { Apiresponse } from "../utils/Apiresponse.js";
import { ApiError } from "../utils/Apierror.js";
import jwt from "jsonwebtoken";
import crypto from "crypto";

//geerate token
const generateToken = async (userId) => {

    try {
        const user = await User.findById(userId);
        const accessToken = await user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();
        user.refreshToken = refreshToken;
        await user.save({ validateBeforeSave: false });

        const savedUser = await User.findById(userId);

       


        return { accessToken, refreshToken }
    } catch (error) {
       
        throw error;
    }
}


//register
const register = asyncHandler(async (req, res) => {

  
    const { fullName, userName, email, password } = req.body;

    if (!fullName || !userName || !email || !password) {
        throw new ApiError(400, "all fileds are required.")
    }

    const existUser = await User.findOne({
        $or: [{ email }, { userName }]
    });

    if (existUser) {
        throw new ApiError(409, "user alredy exist.");
    }


    const user = await User.create({
        fullName, userName, email, password
    })

    const createdUser = await User.findById(user.id).select("-password");

    return res.status(200).json(
        new Apiresponse(200, "register succesfully", createdUser)
    )

})

//login
const login = asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        throw new ApiError(400, "all fileds are required.")
    }

    const user = await User.findOne({
        $or: [{ email }]
    });
    if (!user) {
        throw new ApiError(404, "User not found");
    }

    const isPasswordCorrect = await user.isPasswordCorrect(password);
    if (!isPasswordCorrect) {
        throw new ApiError(400, "invalid password")
    }

    const { accessToken, refreshToken } = await generateToken(user.id);
    const options = {
        httpOnly: true,
        secure: true,
        sameSite: "none",
        path: "/",
    }

    const loginUser = await User.findById(user.id).select("-password -refreshToken");
    return res.status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(
            new Apiresponse(200, {
                user: loginUser,
                accessToken,
                refreshToken
            }, "user logged in successfully")
        )


})

//get current user
const getCurrentUser = asyncHandler(async (req, res) => {
    return res
        .status(200)
        .json(new Apiresponse(200, "Fetched user successfully.", req.user));
})

//refreshAcecsessToken
const refreshAcecsessToken = asyncHandler(async (req, res) => {
    try {
        const incomingRefreshToken =
            req.body?.refreshToken

        if (!incomingRefreshToken) {
            throw new ApiError(401, "unauthorized request");
        }

        const decodedToken = jwt.verify(
            incomingRefreshToken,
            process.env.REFRESH_TOKEN_SECRET
        )


        const user = await User.findById(decodedToken.id);

        if (!user) {
            throw new ApiError(401, "invalied refresh token");
        }


        if (incomingRefreshToken !== user?.refreshToken) {
            throw new ApiError(401, "refresh token expired or used.")
        }

        const options = {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
        }

        const { accessToken, refreshToken: newrefreshToken } = await generateToken(user.id);
        return res.status(200)
            .cookie("accessToken", accessToken, options)
            .cookie("refreshToken", newrefreshToken, options)
            .json(
                new Apiresponse(
                    200,
                    {
                        accessToken, refreshToken: newrefreshToken
                    },
                    "Acess token sucessfully"
                )
            )
    } catch (error) {
        console.error("ERROR DETAILS:", error);
        throw new ApiError(
            error.statusCode || 500,
            error.message || "Something went wrong"
        );
    }


})

//logout
const logout = asyncHandler(async (req, res) => {

    const options = {
        httpOnly: true,
        secure: true,
        sameSite: "none",
        path: "/",
    };

    if (req?.user.id) {
        await User.findByIdAndUpdate(
            req.user.id,
            {
                $unset: {
                    refreshToken: 1
                }
            }
        )
    }
    return res
        .status(200)
        .clearCookie("accessToken", options)
        .clearCookie("refreshToken", options)
        .json(
            new Apiresponse(
                200,
                {},
                "User logged out successfully"
            )
        );
})

//changecurrent password
const changeCurrentPassword = asyncHandler(async (req, res) => {
    try {
        const user = await User.findById(req.user?._id || req.user?.id)
        if (!user) {
            throw new ApiError(400, "user not found")
        }
        const { oldpassword, newpassword, confirmpassword } = req.body
        const isPasswordCorrect = await user.isPasswordCorrect(oldpassword);
        if (!isPasswordCorrect) {
            throw new ApiError(400, "Invalid old password");
        }

        if (newpassword !== confirmpassword) {
            throw new ApiError(400, "New password and confirm password do not match");
        }
        user.password = newpassword;
        await user.save({ validateBeforeSave: false });
        return res.status(200)
            .json(
                new Apiresponse(200, {}, "Change the password"))
    } catch (error) {
    throw new ApiError(
        error.statusCode || 500,
        error?.message || "Invalid"
    )
}
})

//forgotten password

const forgotPassword = asyncHandler(async (req, res) => {
    
    const { email } = req.body;
    if (!email) {
        throw new ApiError(400, "email not required.")
    }

    const user = await User.findOne({ email });
    if (!user) {
        throw new ApiError(400, "user not found.")
    }
   
    const resetToken = crypto.randomBytes(32).toString("hex");
   
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpiry = Date.now() + 15 * 60 * 1000;

   
    await user.save({ validateBeforeSave: false });

    const checkUser = await User.findOne({ email }).select(
    "email resetPasswordToken resetPasswordExpiry"
);

console.log("USER AFTER SAVE:", checkUser);
    return res.status(200).json(
        new Apiresponse(
            200,
            "Password reset token generated successfully",
            { resetToken },

        )
    );

})

const resetPassword = asyncHandler(async (req, res) => {

    const { token } = req.params;
    const { password } = req.body;

    if (!token) {
        throw new ApiError(400, "Reset token is required");
    }

    if (!password) {
        throw new ApiError(400, "New password is required");
    }
   

    const checkUser = await User.findOne({
        resetPasswordToken: token
    });

    
    const user = await User.findOne({
        resetPasswordToken: token,
        resetPasswordExpiry: { $gt: Date.now() }
    });

    if (!user) {
        throw new ApiError(400, "Invalid or expired reset token");
    }

    user.password = password;
    user.resetPasswordToken = "";
    user.resetPasswordExpiry = null;

    await user.save();

    return res.status(200).json(
        new Apiresponse(
            200,
            "Password reset successfully",
            {},

        )
    );
});
export {
    register, login, getCurrentUser,
    refreshAcecsessToken, logout, changeCurrentPassword,
    forgotPassword, resetPassword
}