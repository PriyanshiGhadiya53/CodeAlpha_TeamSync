/*  import http from "http";
 import app from "./app.js";
 import dotenv from "dotenv";
 import { Server } from "socket.io";
 import { createWorker, createTransport, router } from "./sfu.js";
 import connectDB from "./db/index.js";
 import { Room } from "./models/room.models.js";

 dotenv.config();




  Create HTTP server with Express app
 const server = http.createServer(app);

  Create Socket.IO server
 const io = new Server(server, {
     cors: {
         origin: "http:localhost:5173",
         credentials: true,
     },
 });

  Handle new Socket.IO connection
 io.on("connection", (socket) => {

      Show newly connected user
    
      Initialize producers and consumers arrays for this socket
     socket.producers = [];
     socket.consumers = [];



      Join user to a room
     socket.on("join-room", async ({ roomId, userName }) => {

        try {
          const room = await Room.findOne({ roomId });
 
          if (!room) {
              console.log("Room not found:", roomId);
              socket.emit("room-error", "Room not found");
              return;
          }
 
           Join the Socket.IO room
          socket.join(roomId);
 
          socket.roomId = roomId;
          socket.userName = userName;
          get the existing sockets in the room
          const sockets = await io.in(roomId).fetchSockets();
 
           Notify the new user about existing users in the room
          for (const otherSocket of sockets) {
              if (otherSocket.id === socket.id) {
                  continue;
              }
              check if user has producers and if so, send user-joined event for each producer
              if (otherSocket.producers) {
                  for (const producer of otherSocket.producers) {
                      socket.emit("new-producer", {
                          producerId: producer.id,
                          socketId: otherSocket.id,
                          kind: producer.kind,
                          type: producer.appData.type,
                          userName: otherSocket.userName
                      });
                  }
              }
          }
           Store room ID for this user
       
          const participantCount = sockets.length;
 
          io.to(roomId).emit("participant-count", participantCount);
           Show room information
 
 
 
 
           Confirm room joined successfully
          socket.emit("room-joined", roomId);
        } catch (error) {

         console.error("Join room error:", error);
            Tell other users that user joined
         socket.to(roomId).emit("user-joined", socket.id);

        
        }

      



     });


      Receive and forward WebRTC offer
     socket.on("offer", (offer) => {

       

          Send offer to other users in room
         socket.to(socket.roomId).emit("offer", offer);
     });


      Receive and forward WebRTC answer
     socket.on("answer", (answer) => {

        

          Send answer to other users in room
         socket.to(socket.roomId).emit("answer", answer);
     });


      Receive and forward ICE candidate
     socket.on("ice-candidate", (candidate) => {

          Send ICE candidate to other users
         socket.to(socket.roomId).emit("ice-candidate", candidate);
     });


      Handle user disconnection
     socket.on("disconnect", () => {

          Show disconnected user
         console.log("Client disconnected:", socket.id);


         if (socket.producers) {
             socket.producers.forEach((producer) => {
                  Handle producer cleanup if needed
                 producer.close();
             });
             socket.producers = [];
         }
         if (socket.consumers) {
             socket.consumers.forEach((consumer) => {
                  Handle consumer cleanup if needed
                 consumer.close();
             });
             socket.consumers = [];
         }
         if (socket.transport) {
             socket.transport.close();
         }

         if (socket.recvTransport) {
             socket.recvTransport.close();
         }

          Tell other users that user left
         socket.to(socket.roomId).emit("user-left", socket.id);

         console.log("User cleanup completed:", socket.id);
     });


      Send Router capabilities to frontend
     socket.on("get-router-capabilities", () => {

          Send Router RTP capabilities
         socket.emit("router-capabilities", router.rtpCapabilities);
     });


      Create Send Transport for user
     socket.on("create-transport", async () => {


          Create a new WebRTC transport
         const transport = await createTransport();

          Store Send Transport for this user
         socket.transport = transport;



          Send transport information to frontend
         socket.emit("transport-created", {
             id: transport.id,
             iceParameters: transport.iceParameters,
             iceCandidates: transport.iceCandidates,
             dtlsParameters: transport.dtlsParameters
         });
     });


      Connect Send Transport with frontend
     socket.on("connect-transport", async ({ dtlsParameters }, callback) => {

         try {

             if (!socket.transport) {
                 console.log("Send Transport not found:", socket.id);
                 callback("failed");
                 return;
             }

             await socket.transport.connect({
                 dtlsParameters
             });

             callback("success");

         } catch (error) {

             console.error("Send Transport connection error:", error);
             callback("failed");

         }
     });


      Create Producer on SFU
     socket.on("produce", async ({ kind, rtpParameters, appData }, callback) => {
         try {

              Create Producer
             const producer = await socket.transport.produce({
                 kind,
                 rtpParameters,
                 appData
             });

              Store Producer
             socket.producers.push(producer);

             console.log("Producer stored:", producer.id, producer.kind);

              Send Producer ID to current user
             callback({
                 id: producer.id
             });

              Tell other users about new Producer
             socket.to(socket.roomId).emit("new-producer", {
                 producerId: producer.id,
                 socketId: socket.id,
                 kind: producer.kind,

                 type: producer.appData.type,
                 userName: socket.userName
             });



         } catch (error) {
             console.error("Producer creation error:", error);
         }
     });
      Create Receive Transport for user
     socket.on("create-recv-transport", async () => {

          Create a new WebRTC transport
         const transport = await createTransport();

          Store Receive Transport for this user
         socket.recvTransport = transport;

          Send Receive Transport information to frontend
         socket.emit("recv-transport-created", {
             id: transport.id,
             iceParameters: transport.iceParameters,
             iceCandidates: transport.iceCandidates,
             dtlsParameters: transport.dtlsParameters
         });
     });


      Connect Receive Transport with frontend
    socket.on("connect-recv-transport", async ({ dtlsParameters }, callback) => {

     try {

         if (!socket.recvTransport) {
             console.log("Receive Transport not found:", socket.id);
             callback("failed");
             return;
         }

         await socket.recvTransport.connect({
             dtlsParameters
         });

         callback("success");

     } catch (error) {

         console.error("Receive Transport connection error:", error);
         callback("failed");

     }
 });


      Create Consumer for receiving media
     socket.on("consume", async ({ producerId, rtpCapabilities }, callback) => {

         try {
           
             if (!socket.recvTransport) {
               
                 return;
             }

              Create Consumer from Producer
             const consumer = await socket.recvTransport.consume({
                 producerId,
                 rtpCapabilities,
                 paused: true
             });

              Resume Consumer
             await consumer.resume();

             socket.consumers.push(consumer);

             console.log("Consumer created:", consumer.id, "for Producer:", producerId);
              Send Consumer information to frontend
             callback({
                 id: consumer.id,
                 producerId: consumer.producerId,
                 kind: consumer.kind,
                 rtpParameters: consumer.rtpParameters
             });
         } catch (error) {
             console.error("Consumer creation error:", error);
         }
     });

     screen share stoped

     socket.on("stop-screen-share", async () => {

         console.log("Screen share stopped by:", socket.id);

         socket.to(socket.roomId).emit("screen-share-stopped", { socketId: socket.id });
     });

     file
     socket.on("send-file", (fileData) => {
         console.log("recive file");

         socket.to(socket.roomId).emit("recive-file", {
             socketId: socket.id,
             name: fileData.name,
             size: fileData.size,
             type: fileData.type,
             data: fileData.data
         })
     })

     socket.on("draw", ({ x, y, tool, lineWidth }) => {
         socket.to(socket.roomId).emit("draw", {
             socketId: socket.id,
             x,
             y,
             tool,
             lineWidth
         })
     });

     socket.on("draw-start", ({ x, y, lineWidth }) => {
         socket.to(socket.roomId).emit("draw-start", {
             socketId: socket.id,
             x,
             y,
             lineWidth

         })
     })

     socket.on("clear-canvas", () => {
         socket.to(socket.roomId).emit("clear-canvas");
     });

     socket.on("send-message", (message) => {


         socket.to(socket.roomId).emit("receive-message", {
             message,
             senderId: socket.id,
         });

     });
 });





  Create Mediasoup Worker before accepting connections
 await createWorker();

 connectDB()
     .then(() => {
         server.listen(process.env.PORT, () => {
             console.log(`Server is running on port ${process.env.PORT}`);
         });
     })
     .catch((err) => {
         console.log("MONGO DB connection failed!!!", err);
     });

 */

     import http from "http";
import app from "./app.js";
import dotenv from "dotenv";
import { Server } from "socket.io";
import connectDB from "./db/index.js";
import { Room } from "./models/room.models.js";

dotenv.config();

// Create HTTP server
const server = http.createServer(app);

// Create Socket.IO server
const io = new Server(server, {
    cors: {
        origin: [
            "http://localhost:5173",
            "https://task-management-rho-three-42.vercel.app"
        ],
        credentials: true,
    },
});

// Handle Socket.IO connections
io.on("connection", (socket) => {

    // Join user to a room
    socket.on("join-room", async ({ roomId, userName }) => {
        try {
            const room = await Room.findOne({ roomId });

            if (!room) {
                console.log("Room not found:", roomId);
                socket.emit("room-error", "Room not found");
                return;
            }

            socket.join(roomId);
            socket.roomId = roomId;
            socket.userName = userName;

            const sockets = await io.in(roomId).fetchSockets();
            const participantCount = sockets.length;

            io.to(roomId).emit("participant-count", participantCount);
            socket.to(roomId).emit("user-joined", { socketId: socket.id, userName });
            socket.emit("room-joined", roomId);
        } catch (error) {
            console.error("Join room error:", error);
            socket.emit("room-error", "Error joining room");
        }
    });

    // Handle user disconnection
    socket.on("disconnect", () => {
        if (socket.roomId) {
            socket.to(socket.roomId).emit("user-left", socket.id);
        }
    });

    // --- REAL-TIME FEATURES (Chat, Drawing, Screen Share, File Share) ---

    socket.on("stop-screen-share", () => {
        socket.to(socket.roomId).emit("screen-share-stopped", { socketId: socket.id });
    });

    socket.on("send-file", (fileData) => {
        socket.to(socket.roomId).emit("recive-file", {
            socketId: socket.id,
            name: fileData.name,
            size: fileData.size,
            type: fileData.type,
            data: fileData.data
        });
    });

    socket.on("draw", ({ x, y, tool, lineWidth }) => {
        socket.to(socket.roomId).emit("draw", {
            socketId: socket.id,
            x,
            y,
            tool,
            lineWidth
        });
    });

    socket.on("draw-start", ({ x, y, lineWidth }) => {
        socket.to(socket.roomId).emit("draw-start", {
            socketId: socket.id,
            x,
            y,
            lineWidth
        });
    });

    socket.on("clear-canvas", () => {
        socket.to(socket.roomId).emit("clear-canvas");
    });

    socket.on("send-message", (message) => {
        socket.to(socket.roomId).emit("receive-message", {
            message,
            senderId: socket.id,
            userName: socket.userName
        });
    });
});

// Database Connection & Server Start
connectDB()
    .then(() => {
        const PORT = process.env.PORT || 8000;
        server.listen(PORT, () => {
            console.log(`Server is running on port ${PORT}`);
        });
    })
    .catch((err) => {
        console.log("MONGO DB connection failed!!!", err);
    });