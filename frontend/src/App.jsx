import { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import { useParams, useNavigate } from "react-router-dom";
import { FaVideo, FaVideoSlash, FaMicrophone, FaMicrophoneSlash, FaPaperPlane } from "react-icons/fa";

// Connect frontend to Live Render Backend
const socket = io("https://codealpha-teamsync.onrender.com", {
   autoConnect: false
});

function App() {
   const navigate = useNavigate();
   const { roomId } = useParams();
   
   const [userName, setUserName] = useState("");
   const [participantCount, setParticipantCount] = useState(1);

   const [message, setMessage] = useState("");
   const [messages, setMessages] = useState([]);
   
   const videoRef = useRef(null);
   const localStreamRef = useRef(null);

   const [isCameraOn, setIsCameraOn] = useState(true);
   const [isMicOn, setIsMicOn] = useState(true);

   const canvasRef = useRef(null);
   const isDrawingRef = useRef(false);
   const [tool, setTool] = useState("pencil");
   const [lineWidth, setLineWidth] = useState(2);

   // Get Current User Info
   useEffect(() => {
      const getCurrentUser = async () => {
         try {
            const response = await fetch(
               "https://codealpha-teamsync.onrender.com/api/v1/user/me",
               {
                  method: "GET",
                  credentials: "include",
               }
            );

            const data = await response.json();

            if (response.ok && data?.data?.userName) {
               setUserName(data.data.userName);
            } else {
               setUserName("User_" + Math.floor(Math.random() * 1000));
            }
         } catch (error) {
            console.log("Error fetching user, using guest name:", error);
            setUserName("Guest_" + Math.floor(Math.random() * 1000));
         }
      };

      getCurrentUser();
   }, []);

   // Setup Socket and Media Streams
   useEffect(() => {
      if (!userName) return;

      socket.connect();

      socket.on("connect", () => {
         console.log("Connected to server:", socket.id);
         socket.emit("join-room", { roomId, userName });
      });

      socket.on("connect_error", (error) => {
         console.log("Socket connection error:", error.message);
      });

      socket.on("room-joined", (id) => {
         console.log("Room joined successfully:", id);
      });

      socket.on("participant-count", (count) => {
         setParticipantCount(count);
      });

      socket.on("receive-message", (data) => {
         setMessages((prev) => [...prev, data]);
      });

      // Get Local Camera & Microphone
      const startMedia = async () => {
         try {
            const stream = await navigator.mediaDevices.getUserMedia({
               video: true,
               audio: true
            });
            localStreamRef.current = stream;
            if (videoRef.current) {
               videoRef.current.srcObject = stream;
            }
         } catch (error) {
            console.log("Camera/Microphone access error:", error);
         }
      };

      startMedia();

      // Canvas Drawing Listeners
      socket.on("draw", ({ x, y, tool, lineWidth }) => {
         const canvas = canvasRef.current;
         if (!canvas) return;
         const ctx = canvas.getContext("2d");
         ctx.lineWidth = lineWidth;
         if (tool === "eraser") {
            ctx.globalCompositeOperation = "destination-out";
         } else {
            ctx.globalCompositeOperation = "source-over";
         }
         ctx.lineTo(x, y);
         ctx.stroke();
      });

      socket.on("draw-start", ({ x, y }) => {
         const canvas = canvasRef.current;
         if (!canvas) return;
         const ctx = canvas.getContext("2d");
         ctx.beginPath();
         ctx.moveTo(x, y);
      });

      socket.on("clear-canvas", () => {
         const canvas = canvasRef.current;
         if (!canvas) return;
         const ctx = canvas.getContext("2d");
         ctx.clearRect(0, 0, canvas.width, canvas.height);
      });

      return () => {
         socket.off("connect");
         socket.off("room-joined");
         socket.off("participant-count");
         socket.off("receive-message");
         socket.off("draw");
         socket.off("draw-start");
         socket.off("clear-canvas");
         socket.disconnect();
      };
   }, [userName, roomId]);

   // Toggle Mic
   const toggleMic = () => {
      if (localStreamRef.current) {
         const audioTrack = localStreamRef.current.getAudioTracks()[0];
         if (audioTrack) {
            audioTrack.enabled = !isMicOn;
            setIsMicOn(!isMicOn);
         }
      }
   };

   // Toggle Camera
   const toggleCamera = () => {
      if (localStreamRef.current) {
         const videoTrack = localStreamRef.current.getVideoTracks()[0];
         if (videoTrack) {
            videoTrack.enabled = !isCameraOn;
            setIsCameraOn(!isCameraOn);
         }
      }
   };

   // Send Chat Message
   const sendMessage = () => {
      if (!message.trim()) return;
      const msgData = { message, senderId: socket.id, userName };
      socket.emit("send-message", msgData);
      setMessages((prev) => [...prev, msgData]);
      setMessage("");
   };

   // Canvas Drawing Handlers
   const startDrawing = (event) => {
      isDrawingRef.current = true;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      ctx.lineWidth = lineWidth;
      ctx.beginPath();
      ctx.moveTo(event.nativeEvent.offsetX, event.nativeEvent.offsetY);
      socket.emit("draw-start", { x: event.nativeEvent.offsetX, y: event.nativeEvent.offsetY });
   };

   const draw = (event) => {
      if (!isDrawingRef.current) return;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      const x = event.nativeEvent.offsetX;
      const y = event.nativeEvent.offsetY;

      if (tool === "eraser") {
         ctx.globalCompositeOperation = "destination-out";
      } else {
         ctx.globalCompositeOperation = "source-over";
      }
      ctx.lineWidth = lineWidth;
      ctx.lineTo(x, y);
      ctx.stroke();

      socket.emit("draw", { x, y, tool, lineWidth });
   };

   const stopDrawing = () => {
      isDrawingRef.current = false;
   };

   const clearCanvas = () => {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      socket.emit("clear-canvas");
   };

   // Leave Call
   const leaveCall = () => {
      if (localStreamRef.current) {
         localStreamRef.current.getTracks().forEach((track) => track.stop());
      }
      socket.disconnect();
      navigate("/");
   };

   return (
      <div className="flex h-screen bg-gray-900 text-white overflow-hidden">
         {/* Main Workspace Area */}
         <div className="flex-1 flex flex-col p-4">
            {/* Header info */}
            <div className="flex justify-between items-center bg-gray-800 p-3 rounded-lg mb-4">
               <h1 className="text-lg font-semibold">Room: {roomId}</h1>
               <div className="flex items-center gap-4">
                  <span className="text-sm bg-gray-700 px-3 py-1 rounded-full">Participants: {participantCount}</span>
                  <button onClick={leaveCall} className="bg-red-600 hover:bg-red-700 px-4 py-1.5 rounded-md text-sm font-medium">Leave</button>
               </div>
            </div>

            {/* Center Content: Video & Whiteboard */}
            <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-4 overflow-hidden">
               {/* Video Section */}
               <div className="bg-gray-800 rounded-xl p-3 flex flex-col items-center justify-center relative">
                  <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover rounded-lg bg-black" />
                  <div className="absolute bottom-4 left-4 bg-black/60 px-2 py-1 rounded text-xs">
                     {userName || "You"}
                  </div>
               </div>

               {/* Whiteboard / Tools Section */}
               <div className="lg:col-span-2 bg-gray-800 rounded-xl p-3 flex flex-col">
                  <div className="flex justify-between items-center mb-2">
                     <div className="flex gap-2">
                        <button onClick={() => setTool("pencil")} className={`px-3 py-1 rounded text-xs ${tool === 'pencil' ? 'bg-blue-600' : 'bg-gray-700'}`}>Pencil</button>
                        <button onClick={() => setTool("eraser")} className={`px-3 py-1 rounded text-xs ${tool === 'eraser' ? 'bg-blue-600' : 'bg-gray-700'}`}>Eraser</button>
                        <button onClick={clearCanvas} className="px-3 py-1 bg-red-700 hover:bg-red-800 rounded text-xs">Clear</button>
                     </div>
                  </div>
                  <canvas
                     ref={canvasRef}
                     width={800}
                     height={500}
                     onMouseDown={startDrawing}
                     onMouseMove={draw}
                     onMouseUp={stopDrawing}
                     className="bg-white rounded-lg w-full flex-1 cursor-crosshair"
                  />
               </div>
            </div>

            {/* Bottom Controls */}
            <div className="flex justify-center items-center gap-4 mt-4 bg-gray-800 p-3 rounded-lg">
               <button onClick={toggleMic} className={`p-3 rounded-full ${isMicOn ? 'bg-gray-700 hover:bg-gray-600' : 'bg-red-600'}`}>
                  {isMicOn ? <FaMicrophone /> : <FaMicrophoneSlash />}
               </button>
               <button onClick={toggleCamera} className={`p-3 rounded-full ${isCameraOn ? 'bg-gray-700 hover:bg-gray-600' : 'bg-red-600'}`}>
                  {isCameraOn ? <FaVideo /> : <FaVideoSlash />}
               </button>
            </div>
         </div>

         {/* Right Sidebar: Chat */}
         <div className="w-80 bg-gray-800 border-l border-gray-700 flex flex-col p-4">
            <h2 className="text-md font-semibold mb-3 border-b border-gray-700 pb-2">Room Chat</h2>
            <div className="flex-1 overflow-y-auto space-y-2 mb-3 pr-1">
               {messages.map((msg, index) => (
                  <div key={index} className="bg-gray-700 p-2 rounded text-sm">
                     <span className="text-xs text-blue-400 block font-semibold">{msg.userName || "User"}</span>
                     {msg.message}
                  </div>
               ))}
            </div>
            <div className="flex gap-2">
               <input
                  type="text"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                  placeholder="Type a message..."
                  className="flex-1 bg-gray-700 px-3 py-2 rounded text-sm focus:outline-none"
               />
               <button onClick={sendMessage} className="bg-blue-600 hover:bg-blue-700 px-3 py-2 rounded text-sm">
                  <FaPaperPlane />
               </button>
            </div>
         </div>
      </div>
   );
}

export default App;