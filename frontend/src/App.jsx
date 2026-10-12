/* import { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
//import { Device } from "mediasoup-client";
import { useParams } from "react-router-dom";
import { FaUserCircle } from "react-icons/fa";
import { useNavigate } from "react-router-dom";


// Create mediasoup Device for browser
//const device = new Device();


// Connect frontend to Socket.IO backend
const socket = io("http://localhost:8000", {
   autoConnect: false
});

function App() {
   const navigate = useNavigate();

   const { roomId } = useParams();
   const [userName, setUserName] = useState("");
   const [participantCount, setParticipantCount] = useState(1);

   const [message, setMessage] = useState("");
   const [messages, setMessages] = useState([]);
   // Store own camera video element
   const videoRef = useRef(null);

   // Store old WebRTC peer connection
   //const peerRef = useRef(null);

   // Store remote video element
   const remoteVideoRef = useRef(null);
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
   const [tool, settool] = useState("pencil");
   const [lineWidth, setLineWidth] = useState(2);

   const [activePanel, setActivePanel] = useState("whiteboard");
   const [selectedFile, setSelectedFile] = useState(null);

   //togglemic
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
   }

   //toggle camera
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
         //console.log("Camera disabled");
      } else {

         videoProducer.resume();
         stream.getVideoTracks()[0].enabled = true;
         setIsCameraOn(true);
         //console.log("Camera enabled");
      }
   }

   //scrreen share
   const screenShare = async () => {

    
         const screenStream = await navigator.mediaDevices.getDisplayMedia(
            {
               video: true
            }
         );
         screenStreamRef.current = screenStream;

         const screenTrack = screenStream.getVideoTracks()[0];

         screenTrack.onended = () => {

           

            socket.emit("stop-screen-share");

         };

      };


   //File sharing
   const handleSelectedFile = (event) => {
      const file = event.target.files[0];


      if (!file) {
         return;
      }
      setSelectedFile(file);

   }

   //send file
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

 
   }
   //leave-call
   const leaveCall = () => {

    
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

      //console.log("Call left and resources cleaned up.");
      navigate("/");
   }

   //sendMessage
   const sendMessage = () => {

      if (!message.trim()) {
         return;
      }

      socket.emit("send-message", message);

      setMessages((prev) => [
         ...prev,
         {
            message,
            senderId: socket.id,
         },
      ]);

      setMessage("");
   };


   //drawing
   const startDrawing = (event) => {

      isDrawingRef.current = true;

      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");

      ctx.lineWidth = lineWidth;

      ctx.beginPath();
      ctx.moveTo(
         event.nativeEvent.offsetX,
         event.nativeEvent.offsetY
      )

      socket.emit("draw-start", {
         x: event.nativeEvent.offsetX,
         y: event.nativeEvent.offsetY
      })

   }

   const draw = (event) => {
      if (!isDrawingRef.current) {
         return;
      }
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");


      const x = event.nativeEvent.offsetX;
      const y = event.nativeEvent.offsetY;

      if (tool == "eraser") {
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
   }

   const stopDrawing = () => {
      isDrawingRef.current = false;
   }

   const clearCanvas = () => {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      socket.emit("clear-canvas");
   };

   //pin /unpin function

   const handlePinUser = (user) => {
      if (pinnedUser?.socketId === user.socketId) {
         setPinnedUser(null);
      }
      else {
         setPinnedUser(user);
      }
   }
   //get user
   useEffect(() => {
      const getCurrentUser = async () => {
         const response = await fetch(
            "http://localhost:8000/api/v1/user/me",
            {
               method: "GET",
               credentials: "include",
            }
         );

         const data = await response.json();

         if (response.ok) {
            setUserName(data.data.userName);
           // console.log("Current user:", data.data.userName);
         }
      };

      getCurrentUser();
   }, []);
   // Setup Socket.IO and Mediasoup listeners
   useEffect(() => {

      if (!userName) return;

      socket.on("connect", () => {
         //console.log("Connected to server:", socket.id);

         socket.emit("join-room", { roomId, userName });
      });

      socket.on("connect_error", (error) => {
         console.log("Socket connection error:", error.message);
      });
      socket.on("disconnect", (reason) => {
         console.log("Socket disconnected:", reason);
      });

      socket.connect();

      socket.on("user-joined", (socketId) => {
         console.log("User joined:", socketId);
      });

      socket.on("room-joined", (roomId) => {

        // console.log("Room joined successfully:", roomId);
         socket.emit("get-router-capabilities");
      });

      socket.on("receive-message", (data) => {

         //console.log("MESSAGE RECEIVED:", data);

         setMessages((prev) => [
            ...prev,
            data,
         ]);

      });

      socket.on("participant-count", (count) => {
         //console.log("Participant count:", count);
         setParticipantCount(count);
      });

      socket.on("room-error", (message) => {
         console.log("ROOM ERROR:", message);
      });


      socket.on("screen-share-stopped", ({ socketId }) => {
         //console.log("🖥️ Screen sharing stopped by user:", socketId);

         const consumer =
            remoteScreenConsumersRef.current[socketId];

         if (consumer) {
            consumer.close();
            delete remoteScreenConsumersRef.current[socketId];
         }

         delete remoteScreenStreamsRef.current[socketId];

         setRemoteScreen((prev) => {
            return prev.filter(
               (user) => user.socketId !== socketId
            );
         });
      });



      // Receive Router capabilities from backend
      socket.on("router-capabilities", async (rtpCapabilities) => {

         // Load Router capabilities into Device
         await device.load({
            routerRtpCapabilities: rtpCapabilities
         });

         //console.log("Device loaded with router capabilities");

         // Ask backend to create Send Transport
         socket.emit("create-transport");

         // Ask backend to create Receive Transport
         socket.emit("create-recv-transport");
      });


      // Receive Send Transport information
      socket.on("transport-created", async (transportData) => {

         // Create browser Send Transport
         const sendTransport = device.createSendTransport(transportData);

         sendTransport.on("connectionstatechange", (state) => {
            console.log("Send Transport state:", state);

            if (state === "failed") {
               console.log("Send Transport failed");
            }

            if (state === "closed") {
               console.log("Send Transport closed");
            }
         });


         // Connect Send Transport with backend
         sendTransport.on("connect", ({ dtlsParameters }, callback, errback) => {

            // Send DTLS parameters to backend
            socket.emit(
               "connect-transport",
               { dtlsParameters },
               (result) => {

                  // Tell mediasoup connection was successful
                  if (result === "success") {
                     callback();
                  } else {

                     // Tell mediasoup connection failed
                     errback(
                        new Error("Transport connection failed")
                     );
                  }
               }
            );
         }
         );


         // Handle Producer creation request
         sendTransport.on("produce", ({ kind, rtpParameters, appData }, callback) => {

            // Check if Send Transport exists


            // Send Producer information to backend
            socket.emit(
               "produce",
               { kind, rtpParameters, appData },
               ({ id }) => {

                  // Give Producer ID back to mediasoup
                  callback({ id });
               }
            );
         }
         );


         //console.log("Send Transport created:", sendTransport.id);


         // Store Send Transport for later use
         window.sendTransport = sendTransport;
         console.log("Send Transport stored:", window.sendTransport.id);


         // Get camera and microphone
         try {

            const stream = await navigator.mediaDevices.getUserMedia({
               video: true,
               audio: true
            });

            localStreamRef.current = stream;
            videoRef.current.srcObject = stream;

            const videoTrack = stream.getVideoTracks()[0];

            const videoProducer = await sendTransport.produce({
               track: videoTrack,
               appData: { type: "camera" }
            });

            videoProducerRef.current = videoProducer;

            console.log("Video Producer created:", videoProducer.id);

            const audioTrack = stream.getAudioTracks()[0];

            const audioProducer = await sendTransport.produce({
               track: audioTrack
            });

            audioProducerRef.current = audioProducer;

            //console.log("Audio Producer created:", audioProducer.id);

         } catch (error) {

            console.log("Camera/Microphone error:", error);

         }
      });


      // Receive Receive Transport information
      socket.on("recv-transport-created", (transportData) => {

         // Create browser Receive Transport
         const recvTransport =
            device.createRecvTransport(transportData);


         // Connect Receive Transport with backend
         recvTransport.on(
            "connect",
            ({ dtlsParameters }, callback, errback) => {

               // Send DTLS parameters to backend
               socket.emit(
                  "connect-recv-transport",
                  { dtlsParameters },
                  (result) => {

                     // Tell mediasoup connection was successful
                     if (result === "success") {
                        callback();
                     } else {

                        // Tell mediasoup connection failed
                        errback(
                           new Error(
                              "Receive transport connection failed"
                           )
                        );
                     }
                  }
               );
            }
         );


         console.log(
            "Receive Transport created:",
            recvTransport.id
         );


         // Store Receive Transport for later use
         window.recvTransport = recvTransport;

         //console.log("Receive Transport ready");

         // console.log( "Pending Producers:",pendingProducersRef.current);

         // console.log("Processing pending Producers");

         // Process waiting Producers
         pendingProducersRef.current.forEach(
            ({ producerId, socketId, type }) => {
               consumeProducer(
                  producerId,
                  socketId,
                  type
               );
            }
         );

         pendingProducersRef.current = [];
      });




      // Receive new Producer
      /* socket.on("new-producer", async ({ producerId, socketId }) => {
         if (!device.loaded) {
            console.log("Device not loaded yet");
            return;
         }
         // Ask server to create Consumer
         socket.emit(
            "consume",
            {
               producerId,
               rtpCapabilities: device.rtpCapabilities
            },
            async (consumerData) => {

               // Get Receive Transport
               const recvTransport =
                  window.recvTransport;


               // Create Consumer
               const consumer =
                  await recvTransport.consume({
                     id: consumerData.id,
                     producerId: consumerData.producerId,
                     kind: consumerData.kind,
                     rtpParameters:
                        consumerData.rtpParameters
                  });


               // Get remote user's stream
               let stream =
                  remoteStreamsRef.current[socketId];


               // Create remote stream if user is new
               if (!stream) {

                  stream = new MediaStream();

                  remoteStreamsRef.current[socketId] =
                     stream;
               }


               // Add received track
               stream.addTrack(consumer.track);


               // Show remote media
               setRemoteUser((prev) => {

                  if (
                     prev.some(
                        (user) =>
                           user.socketId === socketId
                     )
                  ) {
                     return prev;
                  }

                  return [
                     ...prev,
                     {
                        socketId,
                        stream
                     }
                  ];
               });


               console.log(
                  "Remote track received:",
                  consumer.kind
               );
            }
         );
      }
      ); */


      // Consume Producer from SFU
      // Consume Producer from SFU
      /*const consumeProducer = (producerId, socketId, type, userName) => {

         socket.emit(
            "consume",
            {
               producerId,
               rtpCapabilities: device.rtpCapabilities
            },
            async (consumerData) => {

               // Get Receive Transport
               try {
                  const recvTransport =
                     window.recvTransport;

                  // Create Consumer
                  const consumer =
                     await recvTransport.consume({
                        id: consumerData.id,
                        producerId: consumerData.producerId,
                        kind: consumerData.kind,
                        rtpParameters:
                           consumerData.rtpParameters
                     });

                  // Get remote user's stream
                  let stream;

                  if (type === "screen") {

                     stream =
                        remoteScreenStreamsRef.current[socketId];

                     // Create remote stream if user is new
                     if (!stream) {

                        stream = new MediaStream();

                        remoteScreenStreamsRef.current[socketId] =
                           stream;
                     }

                     // Add received track
                     stream.addTrack(consumer.track);

                     remoteScreenConsumersRef.current[socketId] =
                        consumer;

                     // Show remote screen
                     setRemoteScreen((prev) => {

                        if (
                           prev.some(
                              (user) =>
                                 user.socketId === socketId
                           )
                        ) {
                           return prev;
                        }

                        return [
                           ...prev,
                           {
                              socketId,
                              stream,
                              userName
                           }
                        ];
                     });

                     console.log(
                        "Remote screen track received:",
                        consumer.kind
                     );

                  } else {

                     stream =
                        remoteStreamsRef.current[socketId];

                     // Create remote stream if user is new
                     if (!stream) {

                        stream = new MediaStream();

                        remoteStreamsRef.current[socketId] =
                           stream;
                     }

                     // Add received track
                     stream.addTrack(consumer.track);

                     // Show remote camera
                     setRemoteUser((prev) => {

                        if (
                           prev.some(
                              (user) =>
                                 user.socketId === socketId
                           )
                        ) {
                           return prev;
                        }

                        return [
                           ...prev,
                           {
                              socketId,
                              stream,
                              userName

                           }
                        ];
                     });

                     console.log(
                        "Remote camera/audio track received:",
                        consumer.kind
                     );
                  }
               } catch (error) {
                  console.log("Consume producer error:", error);

               }
            }
         );
      };


      // Receive new Producer
      socket.on("new-producer", ({ producerId, socketId, type, userName }) => {

         console.log("New Producer received:", producerId);

         // Wait if Device or Receive Transport is not ready
         if (!device.loaded || !window.recvTransport) {

            pendingProducersRef.current.push({
               producerId,
               socketId,
               type,
               userName
            });

            console.log("Producer waiting:", producerId);

            return;
         }

         // Consume Producer


         consumeProducer(
            producerId,
            socketId,
            type,
            userName
         );
      }

      );
      // Consume Producer from SFU
      /* const consumeProducer = (producerId, socketId) => {
       
         socket.emit(
            "consume",
            {
               producerId,
               rtpCapabilities: device.rtpCapabilities
            },
            async (consumerData) => {
       
               // Get Receive Transport
               const recvTransport =
                  window.recvTransport;
       
               // Create Consumer
               const consumer =
                  await recvTransport.consume({
                     id: consumerData.id,
                     producerId: consumerData.producerId,
                     kind: consumerData.kind,
                     rtpParameters:
                        consumerData.rtpParameters
                  });
       
               // Get remote user's stream
               let stream =
                  remoteStreamsRef.current[socketId];
       
               // Create remote stream if user is new
               if (!stream) {
       
                  stream = new MediaStream();
       
                  remoteStreamsRef.current[socketId] =
                     stream;
               }
       
               // Add received track
               stream.addTrack(consumer.track);
       
               // Show remote media
               setRemoteUser((prev) => {
       
                  if (
                     prev.some(
                        (user) =>
                           user.socketId === socketId
                     )
                  ) {
                     return prev;
                  }
       
                  return [
                     ...prev,
                     {
                        socketId,
                        stream
                     }
                  ];
               });
       
               console.log(
                  "Remote track received:",
                  consumer.kind
               );
            }
         );
      };
       */
      // Connect to Socket.IO server
      // socket.on("connect", () => {

      //    console.log(
      //       "Connected to server:",
      //       socket.id
      //    );

      //    // Join room
      //    socket.emit("join-room", "room1");
      // });


      // Remove Socket.IO listeners

     /* socket.on("recive-file", async (fileData) => {
        
        

         const blob = new Blob([fileData.data], { type: fileData.type })
         

         const url = URL.createObjectURL(blob)

         const link = document.createElement("a");

         link.href = url;
         link.download = fileData.name;
         document.body.appendChild(link);
         link.click();
         document.body.removeChild(link);
         setTimeout(() => {
            URL.revokeObjectURL(url);
         }, 1000);
      })


      socket.on("draw", ({ x, y, tool, lineWidth }) => {
         const canvas = canvasRef.current;
         const ctx = canvas.getContext("2d");

         ctx.lineTo(x, y);
         ctx.stroke();
      })


      socket.on("draw-start", ({ x, y, lineWidth }) => {
         const canvas = canvasRef.current;
         const ctx = canvas.getContext("2d");

         ctx.beginPath();
         ctx.moveTo(x, y);
      })

      socket.on("clear-canvas", () => {
         const canvas = canvasRef.current;
         const ctx = canvas.getContext("2d");

         ctx.clearRect(0, 0, canvas.width, canvas.height);
      });


      socket.on("user-left", (socketId) => {


         // console.log("User left ID:", socketId);

         delete remoteStreamsRef.current[socketId];

         setRemoteUser((prev) =>
            prev.filter(
               (user) => user.socketId !== socketId
            )
         );
         setParticipantCount((count) => Math.max(1, count - 1));
      });



      return () => {

         socket.off("router-capabilities");
         socket.off("transport-created");
         socket.off("recv-transport-created");
         socket.off("new-producer");
         socket.off("screen-share-stopped");
         socket.off("recive-file");
         socket.off("user-left");
         socket.off("receive-message");
         socket.off("connect");
         socket.off("user-joined");
         socket.off("room-joined");
         socket.off("participant-count");
         socket.off("room-error");
         socket.off("connect_error");
         socket.off("disconnect");
      };


   }, [roomId, userName]);


   // /* useEffect(() => {

   //    // Create old WebRTC peer connection
   //    const peer = new RTCPeerConnection();

   //    peerRef.current = peer;


   //    // Send ICE candidate to server
   //    peerRef.current.onicecandidate = (event) => {

   //       if (event.candidate) {
   //          socket.emit("ice-candidate", event.candidate);
   //       }
   //    };




   //    // Receive offer from another user
   //    socket.on("offer", async (offer) => {

   //       console.log("OFFER RECEIVED:", offer);

   //       // Set received offer as remote description
   //       await peerRef.current.setRemoteDescription(offer);

   //       // Create answer for received offer
   //       const answer = await peerRef.current.createAnswer();

   //       // Set answer as local description
   //       await peerRef.current.setLocalDescription(answer);

   //       // Send answer to other user
   //       socket.emit("answer", answer);

   //       console.log("ANSWER CREATED:", answer);
   //    });


   //    // Receive answer from another user
   //    socket.on("answer", async (answer) => {

   //       console.log("ANSWER RECEIVED:", answer);

   //       // Set received answer as remote description
   //       await peerRef.current.setRemoteDescription(answer);
   //    });


   //    // Receive ICE candidate
   //    socket.on("ice-candidate", async (candidate) => {

   //       // Add received ICE candidate
   //       await peerRef.current.addIceCandidate(candidate);
   //    });


   //    // Get camera and microphone
   //    const getMedia = async () => {

   //       // Ask browser for camera and microphone
   //       const stream = await navigator.mediaDevices.getUserMedia({
   //          video: true,
   //          audio: true
   //       });


   //       // Show own camera in browser
   //       videoRef.current.srcObject = stream;


   //       // Add camera and microphone to old WebRTC connection
   //       stream.getTracks().forEach((track) => {
   //          peerRef.current.addTrack(track, stream);
   //       });


   //       // Get camera video track
   //       const videoTrack = stream.getVideoTracks()[0];


   //       // Wait until Send Transport is created
   //       if (!window.sendTransport) {
   //          console.log("Send Transport not ready");
   //          return;
   //       }


   //       // Send video track to SFU
   //       const videoProducer =
   //          await window.sendTransport.produce({
   //             track: videoTrack
   //          });


   //       console.log(
   //          "Video Producer created:",
   //          videoProducer.id
   //       );


   //       // Get microphone audio track
   //       const audioTrack =
   //          stream.getAudioTracks()[0];


   //       // Send audio track to SFU
   //       const audioProducer =
   //          await window.sendTransport.produce({
   //             track: audioTrack
   //          });


   //       console.log(
   //          "Audio Producer created:",
   //          audioProducer.id
   //       );
   //    };


   //    // Start camera and microphone
   //    getMedia();


   //    // Connect to Socket.IO server
   //    socket.on("connect", () => {

   //       console.log("Connected to server:", socket.id);

   //       // Join room
   //       socket.emit("join-room", "room1");
   //    });


   //    // Create offer when another user joins
   //    socket.on("user-joined", async (userId) => {

   //       console.log("User joined:", userId);

   //       // Create WebRTC offer
   //       const offer =
   //          await peerRef.current.createOffer();

   //       console.log("OFFER CREATED:", offer);

   //       // Set offer as local description
   //       await peerRef.current.setLocalDescription(offer);

   //       // Send offer to other user
   //       socket.emit("offer", offer);
   //    });


   //    // Remove Socket.IO listeners
   //    return () => {

   //       socket.off("connect");
   //       socket.off("user-joined");
   //       socket.off("offer");
   //       socket.off("answer");
   //       socket.off("ice-candidate");

   //    };

   // }, []); */


  
import { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import { useParams, useNavigate } from "react-router-dom";
import { FaUserCircle, FaVideo } from "react-icons/fa";

// Connect frontend to Socket.IO backend
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
   const [tool, settool] = useState("pencil");
   const [lineWidth, setLineWidth] = useState(2);

   const [activePanel, setActivePanel] = useState("whiteboard");
   const [selectedFile, setSelectedFile] = useState(null);

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

   // Screen Share (Placeholder for Agora/WebRTC)
   const screenShare = async () => {
      try {
         const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
         // Yahan aap screen stream handle kar sakti hain
         const screenTrack = screenStream.getVideoTracks()[0];
         screenTrack.onended = () => {
            socket.emit("stop-screen-share");
         };
      } catch (error) {
         console.log("Screen share error:", error);
      }
   };

   // File sharing selection
   const handleSelectedFile = (event) => {
      const file = event.target.files[0];
      if (!file) return;
      setSelectedFile(file);
   };

   // Send file via Socket.io
   const sendFile = async () => {
      if (!selectedFile) {
         console.log("no file selected");
         return;
      }
      const arrayBuffer = await selectedFile.arrayBuffer();
      socket.emit("send-file", {
         name: selectedFile.name,
         size: selectedFile.size,
         type: selectedFile.type,
         data: arrayBuffer
      });
      setSelectedFile(null);
   };

   // Leave call and cleanup
   const leaveCall = () => {
      if (localStreamRef.current) {
         localStreamRef.current.getTracks().forEach((track) => track.stop());
         localStreamRef.current = null;
      }
      socket.disconnect();
      navigate("/");
   };

   // Send Chat Message
   const sendMessage = () => {
      if (!message.trim()) return;
      socket.emit("send-message", message);
      setMessages((prev) => [
         ...prev,
         {
            message,
            senderId: socket.id,
         },
      ]);
      setMessage("");
   };

   // Canvas Drawing Handlers
   const startDrawing = (event) => {
      isDrawingRef.current = true;
      const canvas = canvasRef.current;
      if (!canvas) return;
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
      if (!canvas) return;
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
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      socket.emit("clear-canvas");
   };

   // Fetch Current Logged-in User
   useEffect(() => {
      const getCurrentUser = async () => {
         try {
            const response = await fetch("https://codealpha-teamsync.onrender.com/api/v1/user/me", {
               method: "GET",
               credentials: "include",
            });
            const data = await response.json();
            if (response.ok) {
               setUserName(data.data.userName);
            }
         } catch (err) {
            console.log("Error fetching user:", err);
         }
      };
      getCurrentUser();
   }, []);

   // Setup Socket.IO Listeners
   useEffect(() => {
      if (!userName) return;

      socket.on("connect", () => {
         socket.emit("join-room", { roomId, userName });
      });

      socket.connect();

      socket.on("receive-message", (data) => {
         setMessages((prev) => [...prev, data]);
      });

      socket.on("participant-count", (count) => {
         setParticipantCount(count);
      });

      socket.on("room-error", (message) => {
         console.log("ROOM ERROR:", message);
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

      socket.on("draw", ({ x, y }) => {
         const canvas = canvasRef.current;
         if (!canvas) return;
         const ctx = canvas.getContext("2d");
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

      socket.on("user-left", () => {
         setParticipantCount((count) => Math.max(1, count - 1));
      });

      return () => {
         socket.off("receive-message");
         socket.off("participant-count");
         socket.off("room-error");
         socket.off("recive-file");
         socket.off("draw");
         socket.off("draw-start");
         socket.off("clear-canvas");
         socket.off("user-left");
         socket.disconnect();
      };
   }, [roomId, userName]);

   return (
      <div className="min-h-screen bg-slate-950 text-white p-4">
         <header className="mb-5 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
               <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600">
                  <FaVideo className="text-xl" />
               </div>
               <div>
                  <h1 className="text-2xl font-bold">Team Sync</h1>
                  <p className="text-sm text-slate-400">Real-time communication</p>
               </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
               <div className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-2">
                  <p className="text-xs text-slate-400">Participants</p>
                  <p className="font-semibold text-white">👥 {participantCount}</p>
               </div>

               <div className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-2">
                  <p className="text-xs text-slate-400">Room ID</p>
                  <p className="font-mono text-sm text-white">{roomId}</p>
               </div>

               <button
                  onClick={() => navigator.clipboard.writeText(window.location.href)}
                  className="rounded-xl bg-blue-600 px-4 py-3 text-sm font-medium hover:bg-blue-500"
               >
                  🔗 Copy Link
               </button>

               <button
                  onClick={leaveCall}
                  className="rounded-xl bg-red-600 px-4 py-2 text-sm hover:bg-red-700 transition"
               >
                  Leave Room
               </button>
            </div>
         </header>

         {/* Main Content */}
         <main className="grid grid-cols-1 lg:grid-cols-[1fr_350px] gap-4">
            {/* Video Section */}
            <section className="min-w-0">
               <h2 className="mb-3 text-lg font-semibold">Video Call</h2>
               <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="relative overflow-hidden rounded-xl border border-slate-700 bg-slate-900">
                     <video
                        ref={videoRef}
                        autoPlay
                        muted
                        playsInline
                        className="w-full aspect-video object-cover"
                     />
                     {!isCameraOn && (
                        <div className="absolute inset-0 flex items-center justify-center bg-slate-900">
                           <FaUserCircle className="text-8xl text-blue-500" />
                        </div>
                     )}
                     <span className="absolute bottom-3 left-3 rounded-md bg-black/60 px-3 py-1 text-sm">
                        You ({userName || "User"})
                     </span>
                  </div>
               </div>
            </section>

            {/* Sidebar (Whiteboard, Files, Chat) */}
            <aside className="min-h-[500px] rounded-xl border border-slate-700 bg-slate-900">
               <div className="flex border-b border-slate-700">
                  <button
                     onClick={() => setActivePanel("whiteboard")}
                     className={`flex-1 px-3 py-3 text-sm font-medium ${activePanel === "whiteboard" ? "bg-blue-600 text-white" : "text-slate-400 hover:bg-slate-800"}`}
                  >
                     ✏️ Whiteboard
                  </button>
                  <button
                     onClick={() => setActivePanel("file")}
                     className={`flex-1 px-3 py-3 text-sm font-medium ${activePanel === "file" ? "bg-blue-600 text-white" : "text-slate-400 hover:bg-slate-800"}`}
                  >
                     📁 Files
                  </button>
                  <button
                     onClick={() => setActivePanel("chat")}
                     className={`flex-1 px-3 py-3 text-sm font-medium ${activePanel === "chat" ? "bg-blue-600 text-white" : "text-slate-400 hover:bg-slate-800"}`}
                  >
                     💬 Chat
                  </button>
               </div>

               {/* Whiteboard Panel */}
               {activePanel === "whiteboard" && (
                  <div className="p-4">
                     <h3 className="mb-3 text-lg font-semibold">Interactive Whiteboard</h3>
                     <div className="mb-3 flex flex-wrap gap-2">
                        <button onClick={() => settool("pencil")} className="rounded-lg bg-slate-700 px-3 py-2 text-sm hover:bg-slate-600">✏️ Pencil</button>
                        <button onClick={() => settool("eraser")} className="rounded-lg bg-slate-700 px-3 py-2 text-sm hover:bg-slate-600">🧹 Eraser</button>
                        <button onClick={() => setLineWidth(2)} className="rounded-lg bg-slate-700 px-3 py-2 text-sm">Small</button>
                        <button onClick={() => setLineWidth(5)} className="rounded-lg bg-slate-700 px-3 py-2 text-sm">Medium</button>
                        <button onClick={() => setLineWidth(10)} className="rounded-lg bg-slate-700 px-3 py-2 text-sm">Large</button>
                        <button onClick={clearCanvas} className="rounded-lg bg-red-600 px-3 py-2 text-sm">Clear</button>
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
                     <h3 className="mb-2 text-lg font-semibold">📁 File Sharing</h3>
                     <p className="mb-4 text-sm text-slate-400">Select a file to share with everyone in this room.</p>
                     <label
                        htmlFor="file-upload"
                        className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-600 bg-slate-900 p-6 text-center hover:border-blue-500 hover:bg-slate-800"
                     >
                        <div className="mb-2 text-4xl">📤</div>
                        <p className="font-medium text-white">Click here to choose a file</p>
                        <input id="file-upload" type="file" onChange={handleSelectedFile} className="hidden" />
                     </label>

                     {selectedFile && (
                        <div className="mt-4 rounded-lg border border-slate-700 bg-slate-900 p-3">
                           <p className="text-sm text-slate-400">Selected File</p>
                           <p className="mt-1 break-all text-sm font-medium text-white">📄 {selectedFile.name}</p>
                           <button onClick={sendFile} className="mt-3 w-full rounded-lg bg-blue-600 px-4 py-3 font-medium hover:bg-blue-500">
                              📤 Send File
                           </button>
                        </div>
                     )}
                  </div>
               )}

               {/* Live Chat Panel */}
               {activePanel === "chat" && (
                  <div className="flex h-[500px] flex-col p-4">
                     <h3 className="mb-3 text-lg font-semibold">💬 Live Chat</h3>
                     <div className="flex-1 overflow-y-auto rounded-lg border border-slate-700 bg-slate-950 p-3">
                        {messages.length === 0 ? (
                           <p className="text-center text-sm text-slate-500">No messages yet</p>
                        ) : (
                           messages.map((msg, index) => (
                              <div
                                 key={index}
                                 className={`mb-2 rounded-lg px-3 py-2 text-sm ${msg.senderId === socket.id ? "ml-auto bg-blue-600" : "bg-slate-800"} max-w-[80%]`}
                              >
                                 {msg.message}
                              </div>
                           ))
                        )}
                     </div>
                     <div className="mt-3 flex gap-2">
                        <input
                           type="text"
                           placeholder="Type a message..."
                           value={message}
                           onChange={(e) => setMessage(e.target.value)}
                           onKeyDown={(e) => { if (e.key === "Enter") sendMessage(); }}
                           className="flex-1 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white outline-none focus:border-blue-500"
                        />
                        <button onClick={sendMessage} className="rounded-lg bg-blue-600 px-4 py-2 hover:bg-blue-500">➤</button>
                     </div>
                  </div>
               )}
            </aside>
         </main>

         {/* Call Controls */}
         <div className="mt-5 flex justify-center">
            <div className="flex items-center gap-2 rounded-2xl border border-slate-700 bg-slate-900 px-3 py-3 shadow-lg">
               <button
                  onClick={toggleMic}
                  className={`rounded-xl px-4 py-3 transition ${isMicOn ? "bg-slate-700 hover:bg-slate-600" : "bg-red-600 hover:bg-red-500"}`}
               >
                  {isMicOn ? "🎤 Mic" : "🔇 Muted"}
               </button>
               <button
                  onClick={toggleCamera}
                  className={`rounded-xl px-4 py-3 transition ${isCameraOn ? "bg-slate-700 hover:bg-slate-600" : "bg-red-600 hover:bg-red-500"}`}
               >
                  {isCameraOn ? "📷 Camera" : "📷 Off"}
               </button>
               <button
                  onClick={screenShare}
                  className="rounded-xl bg-slate-700 px-4 py-3 transition hover:bg-slate-600"
               >
                  🖥️ Screen
               </button>
            </div>
         </div>
      </div>
   );
}

export default App;