import { asyncHandler } from "../utils/asynchandler.js";
import crypto from "crypto";
import { ApiError } from "../utils/Apierror.js";
import { Apiresponse } from "../utils/Apiresponse.js";
import { Room } from "../models/room.models.js";

//create room
const createRoom=asyncHandler(async(req,res)=>{
   if (!req.user) {
      throw new ApiError(401, "Unauthorized user");
   }
   
   const roomId=crypto.randomBytes(4).toString("hex");

   const room=await Room.create({
    roomId,
    createdBy:req.user.id
   });

   return res.status(200).json(
    new Apiresponse(200,
      "Room created successfully",
       { roomId: room.roomId},
       
    )
   )

})

const joinRoom=asyncHandler(async(req,res)=>{
    const {roomId}=req.body;

    if (!roomId) {
      throw new ApiError(400, "Room ID is required");
   }

   const room=await Room.findOne({roomId});
   if (!room) {
      throw new ApiError(404, "Room not found");
   }

    return res.status(200).json(
      new Apiresponse(
         200,
          "Room joined successfully",
         {
            roomId: room.roomId
         },
        
      )
   );

})

export {createRoom,joinRoom}