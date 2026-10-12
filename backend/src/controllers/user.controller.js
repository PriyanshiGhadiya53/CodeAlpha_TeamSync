import { ApiError } from "../utils/Apierror.js";
import { asyncHandler } from "../utils/asynchandler.js";
import {User} from "../models/user.model.js";
import { Apiresponse } from "../utils/Apiresponse.js";
import mongoose from "mongoose";
import { user } from "react";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";


const generateToken=async(userId)=>{

    try {
        const user=await User.findById(userId)
        if (!user) {
                    console.log("Error: User not found for ID:", userId);
                    throw new ApiError(404, "User does not exist");
        }
        console.log("user:", user);
        const accessToken=user.generateAccessToken()
        console.log("Access token generated");
        const refreshToken=user.generateRefreshToken()
        console.log("Refresh token generated");
        user.refreshToken=refreshToken
            console.log("Before Save:", user.refreshToken);
        await user.save({validateBeforeSave:false})
            
        return {accessToken,refreshToken}
    } catch (error) {
    console.error("Original Error:", error);
    throw error;
}

}


const register=asyncHandler(async(req,res)=>{

    console.log(req.body)
    const {fullname,username,email,password}=req.body

    if(!fullname ||!username ||!email ||!password){
        throw new ApiError(400,"all fileds are required.")
    }

    const existuser=await User.findOne(
        {
            $or:[{email},{username}]
        })

    if(existuser){
        throw new ApiError(409,"user alredy exist.")
    }


    const user=await User.create({
        fullname,
        username,
        email,
        password

    })

    const createduser=await User.findById(user._id).select("-password")

    return res.status(200).json(
        new Apiresponse(200,"register succesfully",createduser)
    )
})

//login

const login=asyncHandler(async(req,res)=>{
    const {email,password}=req.body

    console.log("Entered Password:", password);

    if(!email ||!password){
        throw new ApiError(400,"all fileds are required.")
    }
    const user=await User.findOne({
        $or:[{email}]
    })

    console.log("DB Password:", user.password);
    if (!user) {
        throw new ApiError(404, "User not found");
    }
    const ispasswordcorrect=await user.ispasswordcorrect(password)
    if(!ispasswordcorrect){
        throw new ApiError(400,"invalid password")
    }
    console.log("Password Match:", ispasswordcorrect);

    const {accessToken,refreshToken}=await generateToken(user._id||user.id)
    const options={httpOnly: true,
  secure: true,
  sameSite: "none",
  path: "/",
    }

    const logginuser=await User.findById(user._id).select("-password -refreshToken")
    return res.status(200)
    .cookie("accessToken",accessToken,options)
    .cookie("refreshToken",refreshToken,options)
    .json(
        new Apiresponse(200,{
            user:logginuser,
            accessToken,
            refreshToken
        },"user logged in successfully")
    )

})

//logou
const logout = asyncHandler(async (req, res) => {
  const options = {
    httpOnly: true,
    secure: true,
    sameSite: "none",
    path: "/",
  };

  if (req.user?._id) {
    await User.findByIdAndUpdate(
      req.user._id,
      {
        $unset: {
          refreshToken: 1,
        },
      }
    );
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
});
//refreshaccess token
const refreshAcecsessToken =asyncHandler(async (req,res)=>{
     try {
          const incomingRefreshToken=req.cookies?.refreshToken ||req.body?.refreshToken
          console.log("Incoming Token:", incomingRefreshToken);

          if(!incomingRefreshToken)
          {
             
               throw new ApiError(401,"unauthorized request");   
          }
         
          const decodedtoken=jwt.verify(
               incomingRefreshToken,
               process.env.REFRESH_TOKEN_SECRET
          )
          console.log("decoded token",decodedtoken);
          const user=await User.findById(decodedtoken?._id || decodedtoken?.id) 
           if(!user)
          {
               throw new ApiError(401,"invalied refresh token");   
          }
          console.log("user",user)
          if(incomingRefreshToken !== user?.refreshToken)
          {
               throw new ApiError(401,"refresh token expired or used.")
          }
          console.log("DB Token:", user.refreshToken);
        console.log("Match:", incomingRefreshToken === user.refreshToken);
     
          const options ={
           httpOnly:true,
          secure: process.env.NODE_ENV === "production",
         sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
          }
          const { accessToken, refreshToken: newrefreshToken } = await generateToken(user._id);

     
          return res.status(200)
          .cookie("accessToken",accessToken,options)
          .cookie("refreshToken",newrefreshToken,options)
          .json(
               new Apiresponse(
                    200,
                    {
                         accessToken,refreshToken:newrefreshToken
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

//changecurrent password
const changeCurrentPassword=asyncHandler(async (req,res)=>{
     try {
          const user= await User.findById(req.user?._id || req.user?.id)
          if(!user)
          {
               throw new ApiError(400,"user not found")
          }
          const {oldpassword,newpassword,confirmpassword} =req.body
          const ispasswordcorrect = await user.ispasswordcorrect(oldpassword);
          if (!ispasswordcorrect) {
          throw new ApiError(400, "Invalid old password");
         }
          user.password = newpassword;
          if (newpassword !== confirmpassword) {
           throw new ApiError(400, "New password and confirm password do not match");
           }
          await user.save({ validateBeforeSave: false });
          return res.status(200)
          .json(
               new Apiresponse (200,{},"Change the password"))
     } catch (error) {
          throw new ApiError(500,error?.message ||"invalied")
          
     }
})
//getcurrentuser
const getCurrentUser = asyncHandler(async (req, res) => {
  // FIXED: Corrected parenthesis placement for Apiresponse
  return res
    .status(200)
    .json(new Apiresponse(200, req.user, "Fetched user successfully."));
});

export {register,login,logout,getCurrentUser,changeCurrentPassword,refreshAcecsessToken}