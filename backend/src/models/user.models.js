import mongoose from "mongoose";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const userSchema=new mongoose.Schema({
    fullName:{
        type:String,
        required:true,
    },
    userName:{
          type:String,
        required:true,
        unique:true,
        trim:true,
    },
    email:{
        type:String,
        required:true,
        unique: true, 
    },
    profileImg:{
        type: String,
      default: "",
    },
    password:{
        type: String,
      required: true,
    },
    refreshToken: {
   type: String,
   default: ""
    },
    
  resetPasswordToken: { type: String, default: "" },
  resetPasswordExpiry: { type: Date, default: null }

},{timestamps:true})

userSchema.pre("save",async function(){

    if(!this.isModified("password")) {return;}
    this.password=await bcrypt.hash(this.password,10);

});
userSchema.methods.isPasswordCorrect=async function (password) {
    return await bcrypt.compare(password,this.password);
    
}
userSchema.methods.generateAccessToken=async function () {
    return jwt.sign({
        id:this.id,
        userName:this.userName,
        email:this.email
    },
        process.env.ACCESS_TOKEN_SECRET,
        {
            expiresIn:process.env.ACCESS_TOKEN_EXPIRY
        })
}
userSchema.methods.generateRefreshToken = function () {
  return jwt.sign(
    {
      id: this.id,
    },
    process.env.REFRESH_TOKEN_SECRET,
    {
      expiresIn: process.env.REFRESH_TOKEN_EXPIRY,
    }
  )
}

export const User=mongoose.model("User",userSchema);