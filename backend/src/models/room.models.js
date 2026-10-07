import mongoose from "mongoose";

const roomSchema=new mongoose.Schema({
    roomId:{
        type:String,
        required:true,
        unique:true,
    },
    createdBy:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"User",
        required:true,
    }
},{timestamps:true})

export const Room=mongoose.model("Room",roomSchema)