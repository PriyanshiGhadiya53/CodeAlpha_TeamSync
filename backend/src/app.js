import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import userRouter from "./router/user.routers.js";
import roomRouter from "./router/room.router.js";
import { generateAgoraToken } from "./sfuToken.js";

const app = express();


/* const allowedOrigins = [
  "http://localhost:5173",
  "https://task-management-rho-three-42.vercel.app"
] */;

app.use(
    cors({
        origin: [
            "https://teamsync-communication.vercel.app", 
            "http://localhost:5173"
        ],
        credentials: true,
    })
);
app.use(express.json());
app.use(express.json({limit:"20kb"}));
app.use(express.urlencoded({limit:"20kb",extended:true}))
app.use(express.static("public"));
app.use(cookieParser())//cookieparser config

app.use("/api/v1/user",userRouter)
app.use("/api/v1/room",roomRouter)
app.get("/api/v1/room/token", generateAgoraToken);




app.get("/", (req, res) => {
    res.send("Real-Time Communication App Backend");
});

export default app;