import { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import { Device } from "mediasoup-client";
import { useParams } from "react-router-dom";
import { FaUserCircle, FaVideo, FaMicrophone, FaMicrophoneSlash, FaVideoSlash, FaDesktop, FaPaperPlane } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import AgoraRTC from "agora-rtc-sdk-ng";

// Create mediasoup Device for browser
const device = new Device();

const agoraClient = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });

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

   // Agora Video / Audio Tracks State
   const [localAudioTrack, setLocalAudioTrack] = useState(null);
   const [localVideoTrack, setLocalVideoTrack] = useState(null);
   const [remoteUsers, setRemoteUsers] = useState([]);
   const localVideoRef = useRef(null);
   
   const videoRef = useRef(null);
   const remoteStreamsRef = useRef({});
   const remoteScreenStreamsRef = useRef({});
   const [remoteScreen, setRemoteScreen] = useState([]);
   const remoteScreenConsumersRef = useRef({});

   const [remoteUser, setRemoteUser] = useState([]);
   const pendingProducersRef = useRef([]);
   const [pinnedUser, setPinnedUser] = useState(null);
   const localStreamRef = useRef(null);
   const videoProducerRef = useRef(null);
   const [isCameraOn, setIsCameraOn] = useState(true);
   const audioProducerRef = useRef(null);
   const [isMicOn, setIsMicOn] = useState(true);

   const screenStreamRef = useRef(null);
   const screenProducerRef = useRef(null);

   const canvasRef = useRef(null);
   const isDrawingRef = useRef(false);
   const [tool, setTool] = useState("pencil");
   const [lineWidth, setLineWidth] = useState(2);

   const [activePanel, setActivePanel] = useState("whiteboard");
   const [selectedFile, setSelectedFile] = useState(null);

   // Toggle Mic
   const toggleMic = () => {
      const audioProducer = audioProducerRef.current;
      const stream = localStreamRef.current;

      if (!audioProducer || !stream) {
         console.log("Audio Producer or Local Stream not ready");
         return;
      }

      if (isMicOn) {
         audioProducer.pause();
         stream.getAudioTracks()[0].enabled = false;
         setIsMicOn(false);
      } else {
         audioProducer.resume();
         stream.getAudioTracks()[0].enabled = true;
         setIsMicOn(true);
      }
   };

   // Toggle Camera
   const toggleCamera = () => {
      const videoProducer = videoProducerRef.current;
      const stream = localStreamRef.current;

      if (!videoProducer || !stream) {
         console.log("Video Producer or Local Stream not ready");
         return;
      }

      if (isCameraOn) {
         videoProducer.pause();
         stream.getVideoTracks()[0].enabled = false;
         setIsCameraOn(false);
         console.log("Camera disabled");
      } else {
         videoProducer.resume();
         stream.getVideoTracks()[0].enabled = true;
         setIsCameraOn(true);
         console.log("Camera enabled");
      }
   };

   // Screen Share
   const screenShare = async () => {
      try {
         const screenStream = await navigator.mediaDevices.getDisplayMedia({
            video: true
         });
         screenStreamRef.current = screenStream;

         const screenTrack = screenStream.getVideoTracks()[0];

         screenTrack.onended = () => {
            console.log("🖥️ Screen sharing stopped");
            socket.emit("stop-screen-share");

            if (screenProducerRef.current) {
               screenProducerRef.current.close();
               screenProducerRef.current = null;
            }
            screenStreamRef.current = null;
         }

         const screenProducer = await window.sendTransport.produce({
            track: screenTrack,
            appData: { type: "screen" }
         });

         screenProducerRef.current = screenProducer;
         console.log("🖥️ Screen sharing started");

      } catch (error) {
         console.log("Screen sharing cancelled or failed:", error);
      }
   };

   // File sharing
   const handleSelectedFile = (event) => {
      const file = event.target.files[0];
      if (!file) return;
      setSelectedFile(file);
   };

   // Send file
   const sendFile = async () => {
      if (!selectedFile) {
         console.log("no such file selected");
         return;
      }

      const arrayBuffer = await selectedFile.arrayBuffer();

      socket.emit("send-file", {
         name: selectedFile.name,
         size: selectedFile.size,
         type: selectedFile.type,
         data: arrayBuffer
      });

      console.log("📤 File information sent:", selectedFile.name);
   };

   // Leave call
   const leaveCall = () => {
      console.log("Leaving call...");

      if (videoProducerRef.current) {
         videoProducerRef.current.close();
         videoProducerRef.current = null;
      }

      if (audioProducerRef.current) {
         audioProducerRef.current.close();
         audioProducerRef.current = null;
      }

      if (localStreamRef.current) {
         localStreamRef.current.getTracks().forEach((track) => track.stop());
         localStreamRef.current = null;
      }

      if (window.sendTransport) {
         window.sendTransport.close();
         window.sendTransport = null;
      }

      if (window.recvTransport) {
         window.recvTransport.close();
         window.recvTransport = null;
      }

      remoteStreamsRef.current = {};
      setRemoteUser([]);
      pendingProducersRef.current = [];

      socket.disconnect();
      navigate("/");
   };

   // Send Message
   const sendMessage = () => {
      if (!message.trim()) return;

      socket.emit("send-message", message);
      setMessages((prev) => [
         ...prev,
         {
            message,
            senderId: socket.id,
            userName,
         },
      ]);
      setMessage("");
   };

   // Drawing
   const startDrawing = (event) => {
      isDrawingRef.current = true;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      ctx.lineWidth = lineWidth;
      ctx.beginPath();
      ctx.moveTo(event.nativeEvent.offsetX, event.nativeEvent.offsetY);

      socket.emit("draw-start", {
         x: event.nativeEvent.offsetX,
         y: event.nativeEvent.offsetY
      });
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

      socket.emit("draw", {
         x,
         y,
         tool,
         lineWidth
      });
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

   const handlePinUser = (user) => {
      if (pinnedUser?.socketId === user.socketId) {
         setPinnedUser(null);
      } else {
         setPinnedUser(user);
      }
   };

   // Get user
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
            console.log("Error fetching user:", error);
            setUserName("Guest_" + Math.floor(Math.random() * 1000));
         }
      };

      getCurrentUser();
   }, []);

   // Setup Socket and Media listeners
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
         socket.emit("get-router-capabilities");
      });

      socket.on("receive-message", (data) => {
         setMessages((prev) => [...prev, data]);
      });

      socket.on("participant-count", (count) => {
         setParticipantCount(count);
      });

      socket.on("router-capabilities", async (rtpCapabilities) => {
         await device.load({ routerRtpCapabilities: rtpCapabilities });
         socket.emit("create-transport");
         socket.emit("create-recv-transport");
      });

      socket.on("transport-created", async (transportData) => {
         const sendTransport = device.createSendTransport(transportData);
         window.sendTransport = sendTransport;

         try {
            const stream = await navigator.mediaDevices.getUserMedia({
               video: true,
               audio: true
            });
            localStreamRef.current = stream;
            if (videoRef.current) {
               videoRef.current.srcObject = stream;
            }

            const videoTrack = stream.getVideoTracks()[0];
            const videoProducer = await sendTransport.produce({
               track: videoTrack,
               appData: { type: "camera" }
            });
            videoProducerRef.current = videoProducer;

            const audioTrack = stream.getAudioTracks()[0];
            const audioProducer = await sendTransport.produce({
               track: audioTrack
            });
            audioProducerRef.current = audioProducer;
         } catch (error) {
            console.log("Media error:", error);
         }
      });

      socket.on("recv-transport-created", (transportData) => {
         const recvTransport = device.createRecvTransport(transportData);
         window.recvTransport = recvTransport;
      });

      socket.on("recive-file", async (fileData) => {
         const blob = new Blob([fileData.data], { type: fileData.type });
         const url = URL.createObjectURL(blob);
         const link = document.createElement("a");
         link.href = url;
         link.download = fileData.name;
         document.body.appendChild(link);
         link.click();
         document.body.removeChild(link);
         setTimeout(() => URL.revokeObjectURL(url), 1000);
      });

      socket.on("draw", ({ x, y, tool, lineWidth }) => {
         const canvas = canvasRef.current;
         if (!canvas) return;
         const ctx = canvas.getContext("2d");
         ctx.lineWidth = lineWidth;
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
         socket.disconnect();
      };
   }, [userName, roomId]);


   return (

      <>
         <div className="min-h-screen bg-slate-950 text-white p-4">
            <header className="mb-5 flex flex-wrap items-center justify-between gap-4">

               {/* App Name */}
               <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600">
                     <FaVideo className="text-xl" />
                  </div>

                  <div>
                     <h1 className="text-2xl font-bold">
                        Team Sync
                     </h1>

                     <p className="text-sm text-slate-400">
                        Real-time communication
                     </p>
                  </div>
               </div>


               {/* Room Information */}
               <div className="flex flex-wrap items-center gap-3">

                  <div className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-2">
                     <p className="text-xs text-slate-400">Participants</p>
                     <p className="font-semibold text-white">
                        👥 {participantCount}
                     </p>
                  </div>


                  <div className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-2">
                     <p className="text-xs text-slate-400">
                        Room ID
                     </p>

                     <p className="font-mono text-sm text-white">
                        {roomId}
                     </p>
                  </div>


                  <button
                     onClick={() => {
                        navigator.clipboard.writeText(window.location.href);
                     }}
                     className="rounded-xl bg-blue-600 px-4 py-3 text-sm font-medium hover:bg-blue-500"
                  >
                     🔗 Copy Link
                  </button>


                  <div className="rounded-full bg-green-600/20 px-4 py-2 text-sm text-green-400">
                     🔒 Secure
                  </div>

               </div>

            </header>


            {/* Main Content */}
            <main className="grid grid-cols-1 lg:grid-cols-[1fr_350px] gap-4">

               {/* Video Section */}
               <section className="min-w-0">

                  <h2 className="mb-3 text-lg font-semibold">
                     Video Call
                  </h2>

                  {/* Video Grid */}

                  {pinnedUser ? (

                     /* Pinned Video Layout */
                     <div className="space-y-3">

                        {/* Big Pinned Video */}
                        <div
                           onClick={() => handlePinUser(pinnedUser)}
                           className="relative overflow-hidden rounded-xl border-2 border-blue-500 bg-slate-900 cursor-pointer"
                        >

                           <video
                              autoPlay
                              muted={pinnedUser.socketId === "self"}
                              playsInline
                              ref={(video) => {
                                 if (video) {
                                    video.srcObject =
                                       pinnedUser.socketId === "self"
                                          ? localStreamRef.current
                                          : pinnedUser.stream;
                                 }
                              }}
                              className="w-full aspect-video object-cover"
                           />

                           {pinnedUser.socketId === "self" && !isMicOn && (
                              <div className="absolute top-3 right-3 rounded-full bg-red-600 px-3 py-2 text-sm">
                                 🔇
                              </div>
                           )}

                           {pinnedUser.socketId === "self" && !isCameraOn && (
                              <div className="absolute inset-0 flex items-center justify-center bg-slate-900">
                                 <FaUserCircle className="text-8xl text-blue-500" />
                              </div>
                           )}

                           <span className="absolute bottom-3 left-3 rounded-md bg-black/60 px-3 py-1 text-sm">
                              {pinnedUser.socketId === "self"
                                 ? "You"
                                 : pinnedUser.userName}
                           </span>

                        </div>


                        {/* Small Videos */}
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">

                           {/* My Video Thumbnail */}
                           {pinnedUser.socketId !== "self" && (
                              <div
                                 onClick={() =>
                                    handlePinUser({
                                       socketId: "self",
                                       userName: "You",
                                       stream: localStreamRef.current
                                    })
                                 }
                                 className="relative overflow-hidden rounded-xl border border-slate-700 bg-slate-900 cursor-pointer"
                              >

                                 <video
                                    autoPlay
                                    muted
                                    playsInline
                                    ref={(video) => {
                                       if (video) {
                                          video.srcObject = localStreamRef.current;
                                       }
                                    }}
                                    className="w-full aspect-video object-cover"
                                 />

                                 {!isMicOn && (
                                    <div className="absolute top-2 right-2 rounded-full bg-red-600 px-2 py-1 text-xs">
                                       🔇
                                    </div>
                                 )}

                                 <span className="absolute bottom-2 left-2 rounded-md bg-black/60 px-2 py-1 text-xs">
                                    You
                                 </span>

                              </div>
                           )}


                           {/* Remote User Thumbnails */}
                           {remoteUser
                              .filter((user) => user.socketId !== pinnedUser.socketId)
                              .map((user) => (
                                 <div
                                    key={user.socketId}
                                    onClick={() => handlePinUser(user)}
                                    className="relative overflow-hidden rounded-xl border border-slate-700 bg-slate-900 cursor-pointer"
                                 >

                                    <video
                                       autoPlay
                                       playsInline
                                       ref={(video) => {
                                          if (video) {
                                             video.srcObject = user.stream;
                                          }
                                       }}
                                       className="w-full aspect-video object-cover"
                                    />

                                    <span className="absolute bottom-2 left-2 rounded-md bg-black/60 px-2 py-1 text-xs">
                                       {user.userName}
                                    </span>

                                 </div>
                              ))}
                        </div>

                     </div>

                  ) : (

                     /* Normal Grid */
                     <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-3">

                        {/* My Video */}
                        <div
                           onClick={() =>
                              handlePinUser({
                                 socketId: "self",
                                 userName: "You",
                                 stream: localStreamRef.current
                              })
                           }
                           className="relative overflow-hidden rounded-xl border border-slate-700 bg-slate-900 cursor-pointer"
                        >

                           <video
                              ref={videoRef}
                              autoPlay
                              muted
                              playsInline
                              className="w-full aspect-video object-cover"
                           />

                           {!isMicOn && (
                              <div className="absolute top-3 right-3 rounded-full bg-red-600 px-3 py-2 text-sm">
                                 🔇
                              </div>
                           )}

                           {!isCameraOn && (
                              <div className="absolute inset-0 flex items-center justify-center bg-slate-900">
                                 <FaUserCircle className="text-8xl text-blue-500" />
                              </div>
                           )}

                           <span className="absolute bottom-3 left-3 rounded-md bg-black/60 px-3 py-1 text-sm">
                              You
                           </span>

                        </div>


                        {/* Remote Users */}
                        {remoteUser.map((user) => (
                           <div
                              key={user.socketId}
                              onClick={() => handlePinUser(user)}
                              className="relative overflow-hidden rounded-xl border border-slate-700 bg-slate-900 cursor-pointer"
                           >

                              <video
                                 autoPlay
                                 playsInline
                                 ref={(video) => {
                                    if (video) {
                                       video.srcObject = user.stream;
                                    }
                                 }}
                                 className="w-full aspect-video object-cover"
                              />

                              <span className="absolute bottom-3 left-3 rounded-md bg-black/60 px-3 py-1 text-sm">
                                 {user.userName}
                              </span>

                           </div>
                        ))}

                     </div>
                  )}



                  {remoteScreen.length > 0 && (
                     <div className="mt-5">

                        <div className="mb-3 flex items-center justify-between">
                           <h2 className="text-lg font-semibold">
                              🖥️ Screen Sharing
                           </h2>

                           <span className="rounded-full bg-blue-600/20 px-3 py-1 text-xs text-blue-400">
                              LIVE
                           </span>
                        </div>


                        {remoteScreen.map((user) => (
                           <div
                              key={user.socketId}
                              className="relative overflow-hidden rounded-xl border-2 border-blue-500 bg-black shadow-lg shadow-blue-500/10"
                           >

                              <video
                                 autoPlay
                                 playsInline
                                 ref={(video) => {
                                    if (video) {
                                       video.srcObject = user.stream;
                                    }
                                 }}
                                 className="w-full max-h-[550px] object-contain"
                              />

                              <div className="absolute bottom-3 left-3 rounded-lg bg-black/70 px-3 py-2 text-sm">
                                 🖥️ Participant is sharing screen
                              </div>

                           </div>
                        ))}

                     </div>
                  )}

               </section>


               <aside className="min-h-[500px] rounded-xl border border-slate-700 bg-slate-900">

                  {/* Tabs */}
                  {/* Tabs */}
                  <div className="flex border-b border-slate-700">

                     <button
                        onClick={() => setActivePanel("whiteboard")}
                        className={`flex-1 px-3 py-3 text-sm font-medium ${activePanel === "whiteboard"
                           ? "bg-blue-600 text-white"
                           : "text-slate-400 hover:bg-slate-800"
                           }`}
                     >
                        ✏️ Whiteboard
                     </button>

                     <button
                        onClick={() => setActivePanel("file")}
                        className={`flex-1 px-3 py-3 text-sm font-medium ${activePanel === "file"
                           ? "bg-blue-600 text-white"
                           : "text-slate-400 hover:bg-slate-800"
                           }`}
                     >
                        📁 Files
                     </button>

                     <button
                        onClick={() => setActivePanel("chat")}
                        className={`flex-1 px-3 py-3 text-sm font-medium ${activePanel === "chat"
                           ? "bg-blue-600 text-white"
                           : "text-slate-400 hover:bg-slate-800"
                           }`}
                     >
                        💬 Chat
                     </button>

                  </div>


                  {/* Whiteboard Panel */}
                  {activePanel === "whiteboard" && (
                     <div className="p-4">

                        <h3 className="mb-3 text-lg font-semibold">
                           Interactive Whiteboard
                        </h3>

                        <div className="mb-3 flex flex-wrap gap-2">

                           <button
                              onClick={() => settool("pencil")}
                              className="rounded-lg bg-slate-700 px-3 py-2 text-sm hover:bg-slate-600"
                           >
                              ✏️ Pencil
                           </button>

                           <button
                              onClick={() => settool("eraser")}
                              className="rounded-lg bg-slate-700 px-3 py-2 text-sm hover:bg-slate-600"
                           >
                              🧹 Eraser
                           </button>

                           <button
                              onClick={() => setLineWidth(2)}
                              className="rounded-lg bg-slate-700 px-3 py-2 text-sm"
                           >
                              Small
                           </button>

                           <button
                              onClick={() => setLineWidth(5)}
                              className="rounded-lg bg-slate-700 px-3 py-2 text-sm"
                           >
                              Medium
                           </button>

                           <button
                              onClick={() => setLineWidth(10)}
                              className="rounded-lg bg-slate-700 px-3 py-2 text-sm"
                           >
                              Large
                           </button>

                           <button
                              onClick={clearCanvas}
                              className="rounded-lg bg-red-600 px-3 py-2 text-sm"
                           >
                              Clear
                           </button>

                        </div>

                        <div className="overflow-auto rounded-lg border border-slate-700">

                           <canvas
                              ref={canvasRef}
                              width="800"
                              height="500"
                              className="block bg-white"
                              onMouseDown={startDrawing}
                              onMouseMove={draw}
                              onMouseUp={stopDrawing}
                              onMouseLeave={stopDrawing}
                           />

                        </div>

                     </div>
                  )}


                  {/* File Sharing Panel */}
                  {activePanel === "file" && (
                     <div className="p-4">

                        <h3 className="mb-2 text-lg font-semibold">
                           📁 File Sharing
                        </h3>

                        <p className="mb-4 text-sm text-slate-400">
                           Select a file to share with everyone in this room.
                        </p>

                        {/* Upload File */}
                        <label
                           htmlFor="file-upload"
                           className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-600 bg-slate-900 p-6 text-center hover:border-blue-500 hover:bg-slate-800"
                        >
                           <div className="mb-2 text-4xl">
                              📤
                           </div>

                           <p className="font-medium text-white">
                              Click here to choose a file
                           </p>

                           <p className="mt-1 text-xs text-slate-400">
                              Select the file you want to share
                           </p>

                           <input
                              id="file-upload"
                              type="file"
                              onChange={handleSelectedFile}
                              className="hidden"
                           />
                        </label>

                        {/* Selected File */}
                        {selectedFile && (
                           <div className="mt-4 rounded-lg border border-slate-700 bg-slate-900 p-3">

                              <p className="text-sm text-slate-400">
                                 Selected File
                              </p>

                              <p className="mt-1 break-all text-sm font-medium text-white">
                                 📄 {selectedFile.name}
                              </p>

                              <button
                                 onClick={sendFile}
                                 className="mt-3 w-full rounded-lg bg-blue-600 px-4 py-3 font-medium hover:bg-blue-500"
                              >
                                 📤 Send File
                              </button>

                           </div>
                        )}

                     </div>
                  )}


                  {/* Live Chat Panel */}
                  {activePanel === "chat" && (
                     <div className="flex h-[500px] flex-col p-4">

                        <h3 className="mb-3 text-lg font-semibold">
                           💬 Live Chat
                        </h3>

                        {/* Messages */}
                        <div className="flex-1 overflow-y-auto rounded-lg border border-slate-700 bg-slate-950 p-3">

                           {messages.length === 0 ? (
                              <p className="text-center text-sm text-slate-500">
                                 No messages yet
                              </p>
                           ) : (
                              messages.map((msg, index) => (
                                 <div
                                    key={index}
                                    className={`mb-2 rounded-lg px-3 py-2 text-sm ${msg.senderId === socket.id
                                       ? "ml-auto bg-blue-600"
                                       : "bg-slate-800"
                                       } max-w-[80%]`}
                                 >
                                    {msg.message}
                                 </div>
                              ))
                           )}

                        </div>

                        {/* Message Input */}
                        <div className="mt-3 flex gap-2">

                           <input
                              type="text"
                              placeholder="Type a message..."
                              value={message}
                              onChange={(e) => setMessage(e.target.value)}
                              onKeyDown={(e) => {
                                 if (e.key === "Enter") {
                                    sendMessage();
                                 }
                              }}
                              className="flex-1 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white outline-none focus:border-blue-500"
                           />

                           <button
                              onClick={sendMessage}
                              className="rounded-lg bg-blue-600 px-4 py-2 hover:bg-blue-500"
                           >
                              ➤
                           </button>

                        </div>

                     </div>
                  )}

               </aside>

            </main>


            {/* Call Controls */}
            {/* Call Controls */}
            <div className="mt-5 flex justify-center">

               <div className="flex flex-wrap items-center justify-center gap-2 rounded-2xl border border-slate-700 bg-slate-900 px-3 py-3 shadow-lg">

                  {/* Mic */}
                  <button
                     onClick={toggleMic}
                     className={`rounded-xl px-4 py-3 transition ${isMicOn
                        ? "bg-slate-700 hover:bg-slate-600"
                        : "bg-red-600 hover:bg-red-500"
                        }`}
                  >
                     {isMicOn ? "🎤" : "🔇"}
                     <span className="ml-2 hidden sm:inline">
                        {isMicOn ? "Mic" : "Muted"}
                     </span>
                  </button>


                  {/* Camera */}
                  <button
                     onClick={toggleCamera}
                     className={`rounded-xl px-4 py-3 transition ${isCameraOn
                        ? "bg-slate-700 hover:bg-slate-600"
                        : "bg-red-600 hover:bg-red-500"
                        }`}
                  >
                     📷
                     <span className="ml-2 hidden sm:inline">
                        {isCameraOn ? "Camera" : "Camera Off"}
                     </span>
                  </button>


                  {/* Screen Share */}
                  <button
                     onClick={screenShare}
                     className="rounded-xl bg-slate-700 px-4 py-3 transition hover:bg-slate-600"
                  >
                     🖥️
                     <span className="ml-2 hidden sm:inline">
                        Screen
                     </span>
                  </button>


                  {/* Leave Call */}
                  <button
                     onClick={leaveCall}
                     className="rounded-xl bg-red-600 px-5 py-3 transition hover:bg-red-500"
                  >
                     📞
                     <span className="ml-2 hidden sm:inline">
                        Leave
                     </span>
                  </button>

               </div>

            </div>

         </div >
      </>
   );

}

export default App;