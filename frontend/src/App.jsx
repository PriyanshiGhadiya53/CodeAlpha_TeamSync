import { useCallback, useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import AgoraRTC from "agora-rtc-sdk-ng";
import { useNavigate, useParams } from "react-router-dom";
import {
  FaUserCircle,
  FaVideo,
  FaMicrophone,
  FaMicrophoneSlash,
  FaVideoSlash,
  FaDesktop,
  FaPaperPlane,
} from "react-icons/fa";

const BACKEND_URL =
  import.meta.env.VITE_API_URL || "https://codealpha-teamsync.onrender.com";
const AGORA_APP_ID = import.meta.env.VITE_AGORA_APP_ID;

function App() {
  const navigate = useNavigate();
  const { roomId } = useParams();

  const socketRef = useRef(null);
  const agoraClientRef = useRef(null);
  const localAudioTrackRef = useRef(null);
  const localVideoTrackRef = useRef(null);
  const screenTrackRef = useRef(null);
  const canvasRef = useRef(null);
  const isDrawingRef = useRef(false);
  const remoteVideoElementsRef = useRef({});
  const remoteScreenElementsRef = useRef({});
  const remoteUsersRef = useRef([]);

  const [userName, setUserName] = useState("");
  const [participantCount, setParticipantCount] = useState(1);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [remoteUsers, setRemoteUsers] = useState([]);
  const [localVideoTrack, setLocalVideoTrack] = useState(null);
  const [localAudioTrack, setLocalAudioTrack] = useState(null);
  const [screenTrack, setScreenTrack] = useState(null);
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [isMicOn, setIsMicOn] = useState(true);
  const [pinnedUser, setPinnedUser] = useState(null);
  const [activePanel, setActivePanel] = useState("whiteboard");
  const [selectedFile, setSelectedFile] = useState(null);
  const [tool, setTool] = useState("pencil");
  const [lineWidth, setLineWidth] = useState(2);
  const [callStatus, setCallStatus] = useState("Connecting…");

  useEffect(() => {
    let cancelled = false;

    const getCurrentUser = async () => {
      try {
        const response = await fetch(`${BACKEND_URL}/api/v1/user/me`, {
          method: "GET",
          credentials: "include",
        });
        const result = await response.json();
        if (!cancelled) {
          setUserName(
            response.ok && result?.data?.userName
              ? result.data.userName
              : `Guest_${Math.floor(Math.random() * 1000)}`
          );
        }
      } catch (error) {
        console.error("Could not fetch current user:", error);
        if (!cancelled) setUserName(`Guest_${Math.floor(Math.random() * 1000)}`);
      }
    };

    getCurrentUser();
    return () => {
      cancelled = true;
    };
  }, []);

  const updateRemoteUsers = useCallback((client) => {
    const users = client.remoteUsers.map((user) => ({
      uid: user.uid,
      userName: `Participant ${user.uid}`,
      hasVideo: Boolean(user.videoTrack),
      hasAudio: Boolean(user.audioTrack),
    }));
    remoteUsersRef.current = users;
    setRemoteUsers(users);
    setParticipantCount(client.remoteUsers.length + 1);
  }, []);

  useEffect(() => {
    if (!userName || !roomId) return;

    let disposed = false;
    const socket = io(BACKEND_URL, {
      withCredentials: true,
      autoConnect: true,
      transports: ["websocket", "polling"],
    });
    socketRef.current = socket;

    socket.on("connect", () => {
      socket.emit("join-room", { roomId, userName });
    });
    socket.on("connect_error", (error) => {
      console.error("Socket connection error:", error.message);
    });
    socket.on("participant-count", (count) => setParticipantCount(count));
    socket.on("receive-message", (data) => {
      const incoming =
        typeof data === "string"
          ? { message: data, userName: "Participant", senderId: "" }
          : data;
      setMessages((previous) => [...previous, incoming]);
    });
    socket.on("send-message", (data) => {
      if (data) setMessages((previous) => [...previous, data]);
    });
    socket.on("draw-start", ({ x, y }) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      ctx.beginPath();
      ctx.moveTo(x, y);
    });
    socket.on("draw", ({ x, y, tool: incomingTool, lineWidth: incomingWidth }) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      ctx.globalCompositeOperation =
        incomingTool === "eraser" ? "destination-out" : "source-over";
      ctx.lineWidth = incomingWidth || 2;
      ctx.lineTo(x, y);
      ctx.stroke();
    });
    socket.on("clear-canvas", () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      canvas.getContext("2d").clearRect(0, 0, canvas.width, canvas.height);
    });
    socket.on("recive-file", (fileData) => {
      if (!fileData?.data) return;
      const blob = new Blob([fileData.data], {
        type: fileData.type || "application/octet-stream",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = fileData.name || "shared-file";
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    });

    const client = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });
    agoraClientRef.current = client;

    const handleUserPublished = async (user, mediaType) => {
      try {
        await client.subscribe(user, mediaType);
        updateRemoteUsers(client);

        if (mediaType === "video" && user.videoTrack) {
          const element = remoteVideoElementsRef.current[user.uid];
          if (element) user.videoTrack.play(element);
        }
        if (mediaType === "audio" && user.audioTrack) {
          user.audioTrack.play();
        }
      } catch (error) {
        console.error("Failed to subscribe to remote track:", error);
      }
    };

    const handleUserUnpublished = (user, mediaType) => {
      if (mediaType === "video") {
        const element = remoteVideoElementsRef.current[user.uid];
        if (element) element.innerHTML = "";
      }
      updateRemoteUsers(client);
    };

    const handleUserLeft = () => updateRemoteUsers(client);
    client.on("user-published", handleUserPublished);
    client.on("user-unpublished", handleUserUnpublished);
    client.on("user-left", handleUserLeft);

    const joinAgora = async () => {
      try {
        if (!AGORA_APP_ID) {
          throw new Error("VITE_AGORA_APP_ID is missing from frontend environment variables.");
        }
        if (disposed) return;
        setCallStatus("Joining call…");

        const tokenResponse = await fetch(
          `${BACKEND_URL}/api/v1/room/token?channelName=${encodeURIComponent(roomId)}`,
          {
            method: "GET",
            credentials: "include",
          }
        );
        const tokenResult = await tokenResponse.json();

        if (!tokenResponse.ok || !tokenResult?.token) {
          throw new Error(
            tokenResult?.error || tokenResult?.message || "Could not get Agora token."
          );
        }

        const joinedUid = await client.join(
          AGORA_APP_ID,
          tokenResult.channelName || roomId,
          tokenResult.token,
          tokenResult.uid ?? 0
        );

        if (disposed) {
          await client.leave();
          return;
        }

        const [audioTrack, videoTrack] =
          await AgoraRTC.createMicrophoneAndCameraTracks();

        if (disposed) {
          audioTrack.close();
          videoTrack.close();
          await client.leave();
          return;
        }

        localAudioTrackRef.current = audioTrack;
        localVideoTrackRef.current = videoTrack;
        setLocalAudioTrack(audioTrack);
        setLocalVideoTrack(videoTrack);
        setIsMicOn(true);
        setIsCameraOn(true);

        const localElement = document.getElementById("teamsync-local-video");
        if (localElement) videoTrack.play(localElement);

        await client.publish([audioTrack, videoTrack]);
        setCallStatus(`Connected · ${joinedUid}`);
        updateRemoteUsers(client);
      } catch (error) {
        console.error("Agora call setup failed:", error);
        setCallStatus(error?.message || "Could not connect call");
      }
    };

    joinAgora();

    return () => {
      disposed = true;
      client.off("user-published", handleUserPublished);
      client.off("user-unpublished", handleUserUnpublished);
      client.off("user-left", handleUserLeft);
      socket.removeAllListeners();
      socket.disconnect();
      if (socketRef.current === socket) socketRef.current = null;

      const audioTrack = localAudioTrackRef.current;
      const videoTrack = localVideoTrackRef.current;
      const sharedTrack = screenTrackRef.current;

      if (sharedTrack) {
        try {
          client.unpublish(sharedTrack);
        } catch {}
        sharedTrack.stop();
        sharedTrack.close();
        screenTrackRef.current = null;
      }
      if (audioTrack) {
        audioTrack.stop();
        audioTrack.close();
        localAudioTrackRef.current = null;
      }
      if (videoTrack) {
        videoTrack.stop();
        videoTrack.close();
        localVideoTrackRef.current = null;
      }
      client.leave().catch((error) => console.error("Agora leave failed:", error));
      if (agoraClientRef.current === client) agoraClientRef.current = null;
    };
  }, [userName, roomId, updateRemoteUsers]);

  const toggleMic = async () => {
    const track = localAudioTrackRef.current;
    if (!track) return;
    const next = !isMicOn;
    await track.setEnabled(next);
    setIsMicOn(next);
  };

  const toggleCamera = async () => {
    const track = localVideoTrackRef.current;
    if (!track) return;
    const next = !isCameraOn;
    await track.setEnabled(next);
    setIsCameraOn(next);
  };

  const screenShare = async () => {
    const client = agoraClientRef.current;
    if (!client) return;

    try {
      if (screenTrackRef.current) {
        const existingScreenTrack = screenTrackRef.current;
        await client.unpublish(existingScreenTrack);
        existingScreenTrack.stop();
        existingScreenTrack.close();
        screenTrackRef.current = null;
        setScreenTrack(null);

        if (localVideoTrackRef.current && isCameraOn) {
          await client.publish(localVideoTrackRef.current);
        }
        return;
      }

      const createdTrack = await AgoraRTC.createScreenVideoTrack({}, "disable");
      const videoTrack = Array.isArray(createdTrack) ? createdTrack[0] : createdTrack;

      if (localVideoTrackRef.current) {
        await client.unpublish(localVideoTrackRef.current);
      }

      screenTrackRef.current = videoTrack;
      setScreenTrack(videoTrack);

      videoTrack.on("track-ended", async () => {
        try {
          await client.unpublish(videoTrack);
        } catch {}
        videoTrack.close();
        screenTrackRef.current = null;
        setScreenTrack(null);

        if (localVideoTrackRef.current && isCameraOn) {
          try {
            await client.publish(localVideoTrackRef.current);
          } catch (error) {
            console.error("Could not resume camera after screen share:", error);
          }
        }
      });

      await client.publish(videoTrack);
    } catch (error) {
      console.error("Screen share failed:", error);
      setCallStatus(error?.message || "Screen sharing failed");
    }
  };

  const leaveCall = async () => {
    try {
      const client = agoraClientRef.current;
      if (client) {
        const tracks = [
          localAudioTrackRef.current,
          localVideoTrackRef.current,
          screenTrackRef.current,
        ].filter(Boolean);
        try {
          await client.unpublish(tracks);
        } catch {}
        tracks.forEach((track) => {
          try {
            track.stop();
            track.close();
          } catch {}
        });
        await client.leave();
      }
    } catch (error) {
      console.error("Leave call failed:", error);
    } finally {
      localAudioTrackRef.current = null;
      localVideoTrackRef.current = null;
      screenTrackRef.current = null;
      socketRef.current?.disconnect();
      navigate("/");
    }
  };

  const sendMessage = () => {
    const trimmed = message.trim();
    if (!trimmed) return;
    const outgoing = {
      message: trimmed,
      senderId: socketRef.current?.id || "",
      userName,
      roomId,
    };
    socketRef.current?.emit("send-message", trimmed);
    setMessages((previous) => [...previous, outgoing]);
    setMessage("");
  };

  const handleSelectedFile = (event) => {
    setSelectedFile(event.target.files?.[0] || null);
  };

  const sendFile = async () => {
    if (!selectedFile || !socketRef.current?.connected) return;
    const buffer = await selectedFile.arrayBuffer();
    socketRef.current.emit("send-file", {
      roomId,
      name: selectedFile.name,
      size: selectedFile.size,
      type: selectedFile.type,
      data: buffer,
    });
    setSelectedFile(null);
  };

  const startDrawing = (event) => {
    isDrawingRef.current = true;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.globalCompositeOperation = tool === "eraser" ? "destination-out" : "source-over";
    ctx.lineWidth = lineWidth;
    ctx.beginPath();
    ctx.moveTo(event.nativeEvent.offsetX, event.nativeEvent.offsetY);
    socketRef.current?.emit("draw-start", {
      roomId,
      x: event.nativeEvent.offsetX,
      y: event.nativeEvent.offsetY,
    });
  };

  const draw = (event) => {
    if (!isDrawingRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.globalCompositeOperation = tool === "eraser" ? "destination-out" : "source-over";
    ctx.lineWidth = lineWidth;
    ctx.lineTo(event.nativeEvent.offsetX, event.nativeEvent.offsetY);
    ctx.stroke();
    socketRef.current?.emit("draw", {
      roomId,
      x: event.nativeEvent.offsetX,
      y: event.nativeEvent.offsetY,
      tool,
      lineWidth,
    });
  };

  const stopDrawing = () => {
    isDrawingRef.current = false;
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.getContext("2d").clearRect(0, 0, canvas.width, canvas.height);
    socketRef.current?.emit("clear-canvas", { roomId });
  };

  const handlePinUser = (user) => {
    setPinnedUser((current) => (current?.uid === user.uid ? null : user));
  };

  const copyRoomLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCallStatus("Room link copied");
    } catch (error) {
      console.error("Could not copy room link:", error);
      setCallStatus("Copy failed; copy the URL from the address bar.");
    }
  };

  const selfUser = {
    uid: "self",
    userName: "You",
    isSelf: true,
  };
  const videoUsers = [
    selfUser,
    ...remoteUsers.map((user) => ({ ...user, isSelf: false })),
  ];
  const displayedUsers = pinnedUser
    ? [
        pinnedUser,
        ...videoUsers.filter((user) => user.uid !== pinnedUser.uid),
      ]
    : videoUsers;

  return (
    <div className="min-h-screen bg-slate-950 p-4 text-white">
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
            onClick={copyRoomLink}
            className="rounded-xl bg-blue-600 px-4 py-3 text-sm font-medium hover:bg-blue-500"
          >
            🔗 Copy Link
          </button>
          <div className="rounded-full bg-green-600/20 px-4 py-2 text-sm text-green-400">
            🔒 Secure
          </div>
        </div>
      </header>

      <p className="mb-3 text-sm text-slate-400" role="status">{callStatus}</p>

      <main className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_350px]">
        <section className="min-w-0">
          <h2 className="mb-3 text-lg font-semibold">Video Call</h2>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-2 lg:grid-cols-3">
            {displayedUsers.map((user) => (
              <div
                key={user.uid}
                onClick={() => handlePinUser(user)}
                className={`relative aspect-video cursor-pointer overflow-hidden rounded-xl border bg-slate-900 ${
                  pinnedUser?.uid === user.uid ? "border-2 border-blue-500" : "border-slate-700"
                }`}
              >
                {user.isSelf ? (
                  <>
                    <div
                      id="teamsync-local-video"
                      className="h-full w-full"
                      ref={(element) => {
                        if (element && localVideoTrackRef.current) {
                          localVideoTrackRef.current.play(element);
                        }
                      }}
                    />
                    {!isCameraOn && (
                      <div className="absolute inset-0 flex items-center justify-center bg-slate-900">
                        <FaUserCircle className="text-8xl text-blue-500" />
                      </div>
                    )}
                    {!isMicOn && (
                      <div className="absolute right-3 top-3 rounded-full bg-red-600 px-3 py-2 text-sm">🔇</div>
                    )}
                  </>
                ) : (
                  <>
                    <div
                      className="h-full w-full"
                      ref={(element) => {
                        remoteVideoElementsRef.current[user.uid] = element;
                        const remote = agoraClientRef.current?.remoteUsers.find(
                          (item) => item.uid === user.uid
                        );
                        if (element && remote?.videoTrack) remote.videoTrack.play(element);
                      }}
                    />
                    {!user.hasVideo && (
                      <div className="absolute inset-0 flex items-center justify-center bg-slate-900">
                        <FaUserCircle className="text-7xl text-blue-500" />
                      </div>
                    )}
                  </>
                )}
                <span className="absolute bottom-3 left-3 rounded-md bg-black/60 px-3 py-1 text-sm">
                  {user.isSelf ? "You" : user.userName}
                </span>
              </div>
            ))}
          </div>

          {screenTrack && (
            <div className="mt-4 rounded-xl border border-blue-500 bg-slate-900 p-3 text-sm">
              🖥️ You are sharing your screen.
            </div>
          )}
        </section>

        <aside className="min-h-[500px] rounded-xl border border-slate-700 bg-slate-900">
          <div className="flex border-b border-slate-700">
            {[
              ["whiteboard", "✏️ Whiteboard"],
              ["file", "📁 Files"],
              ["chat", "💬 Chat"],
            ].map(([panel, label]) => (
              <button
                key={panel}
                onClick={() => setActivePanel(panel)}
                className={`flex-1 px-3 py-3 text-sm font-medium ${
                  activePanel === panel
                    ? "bg-blue-600 text-white"
                    : "text-slate-400 hover:bg-slate-800"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {activePanel === "whiteboard" && (
            <div className="p-4">
              <h3 className="mb-3 text-lg font-semibold">Interactive Whiteboard</h3>
              <div className="mb-3 flex flex-wrap gap-2">
                <button onClick={() => setTool("pencil")} className="rounded-lg bg-slate-700 px-3 py-2 text-sm">✏️ Pencil</button>
                <button onClick={() => setTool("eraser")} className="rounded-lg bg-slate-700 px-3 py-2 text-sm">🧹 Eraser</button>
                <button onClick={() => setLineWidth(2)} className="rounded-lg bg-slate-700 px-3 py-2 text-sm">Small</button>
                <button onClick={() => setLineWidth(5)} className="rounded-lg bg-slate-700 px-3 py-2 text-sm">Medium</button>
                <button onClick={() => setLineWidth(10)} className="rounded-lg bg-slate-700 px-3 py-2 text-sm">Large</button>
                <button onClick={clearCanvas} className="rounded-lg bg-red-600 px-3 py-2 text-sm">Clear</button>
              </div>
              <div className="overflow-auto rounded-lg border border-slate-700">
                <canvas
                  ref={canvasRef}
                  width={800}
                  height={500}
                  className="block max-w-full bg-white"
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                />
              </div>
            </div>
          )}

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
                <p className="mt-1 text-xs text-slate-400">Select the file you want to share</p>
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

          {activePanel === "chat" && (
            <div className="flex h-[500px] flex-col p-4">
              <h3 className="mb-3 text-lg font-semibold">💬 Live Chat</h3>
              <div className="flex-1 overflow-y-auto rounded-lg border border-slate-700 bg-slate-950 p-3">
                {messages.length === 0 ? (
                  <p className="text-center text-sm text-slate-500">No messages yet</p>
                ) : (
                  messages.map((msg, index) => (
                    <div
                      key={`${msg.senderId || msg.userName || "message"}-${index}`}
                      className={`mb-2 max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                        msg.senderId === socketRef.current?.id ? "ml-auto bg-blue-600" : "bg-slate-800"
                      }`}
                    >
                      <p className="mb-1 text-xs text-slate-300">{msg.userName || "Participant"}</p>
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
                  onChange={(event) => setMessage(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") sendMessage();
                  }}
                  className="min-w-0 flex-1 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white outline-none focus:border-blue-500"
                />
                <button onClick={sendMessage} className="rounded-lg bg-blue-600 px-4 py-2 hover:bg-blue-500">
                  <FaPaperPlane />
                </button>
              </div>
            </div>
          )}
        </aside>
      </main>

      <div className="mt-5 flex justify-center">
        <div className="flex flex-wrap items-center justify-center gap-2 rounded-2xl border border-slate-700 bg-slate-900 px-3 py-3 shadow-lg">
          <button
            onClick={toggleMic}
            disabled={!localAudioTrack}
            className={`rounded-xl px-4 py-3 transition ${isMicOn ? "bg-slate-700 hover:bg-slate-600" : "bg-red-600 hover:bg-red-500"} disabled:opacity-50`}
          >
            {isMicOn ? <FaMicrophone /> : <FaMicrophoneSlash />}
            <span className="ml-2 hidden sm:inline">{isMicOn ? "Mic" : "Muted"}</span>
          </button>
          <button
            onClick={toggleCamera}
            disabled={!localVideoTrack}
            className={`rounded-xl px-4 py-3 transition ${isCameraOn ? "bg-slate-700 hover:bg-slate-600" : "bg-red-600 hover:bg-red-500"} disabled:opacity-50`}
          >
            {isCameraOn ? <FaVideo /> : <FaVideoSlash />}
            <span className="ml-2 hidden sm:inline">{isCameraOn ? "Camera" : "Camera Off"}</span>
          </button>
          <button onClick={screenShare} className="rounded-xl bg-slate-700 px-4 py-3 transition hover:bg-slate-600">
            <FaDesktop />
            <span className="ml-2 hidden sm:inline">{screenTrack ? "Stop Screen" : "Screen"}</span>
          </button>
          <button onClick={leaveCall} className="rounded-xl bg-red-600 px-5 py-3 transition hover:bg-red-500">
            📞
            <span className="ml-2 hidden sm:inline">Leave</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default App;
