import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Logout from "../Components/Logout.jsx";

const Home = () => {

    const navigate = useNavigate();
    const [roomId, setRoomId] = useState("");

    const createRoom = async () => {

        const response = await fetch(
            "http://localhost:8000/api/v1/room/create",
            {
                method: "POST",
                credentials: "include",
            }
        );

        const data = await response.json();

        console.log("CREATE ROOM RESPONSE:", data);

        if (!response.ok) {
            console.log(data);
            return;
        }

        const roomId = data.data.roomId;

        console.log("DATA.DATA:", data.data);

        console.log("ROOM ID:", roomId);

        navigate(`/room/${roomId}`);
    };


    const joinRoom = async () => {

        const res = await fetch(
            "https://codealpha-teamsync.onrender.com/api/v1/room/join",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                credentials: "include",
                body: JSON.stringify({
                    roomId,
                }),
            }

        )

        const data = await res.json();

        if (!res.ok) {
            console.log(data);
            return;
        }
        console.log("Room joined:", data);

        navigate(`/room/${roomId}`);

    }
    return (
        <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center px-4">

            <div className="w-full max-w-md bg-gray-900 border border-gray-800 rounded-2xl p-8 shadow-xl">

                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-white">
                        Communication App
                    </h1>

                    <p className="text-gray-400 mt-2">
                        Connect and communicate with your team
                    </p>
                </div>


                <button
                    onClick={createRoom}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition"
                >
                    Create Room
                </button>


                <div className="flex items-center gap-3 my-6">
                    <div className="flex-1 h-px bg-gray-700"></div>

                    <span className="text-gray-500 text-sm">
                        OR
                    </span>

                    <div className="flex-1 h-px bg-gray-700"></div>
                </div>


                <h2 className="text-xl font-semibold mb-3">
                    Join Room
                </h2>

                <input
                    type="text"
                    placeholder="Enter Room ID"
                    value={roomId}
                    onChange={(e) => setRoomId(e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 text-white placeholder-gray-500 rounded-lg px-4 py-3 outline-none focus:border-blue-500"
                />


                <button
                    onClick={joinRoom}
                    className="w-full bg-gray-700 hover:bg-gray-600 text-white font-semibold py-3 rounded-lg mt-3 transition"
                >
                    Join Room
                </button>

                <button
                    onClick={() => navigate("/change-password")}
                    className="w-full border border-blue-500 text-blue-400 hover:bg-blue-500 hover:text-white font-semibold py-3 rounded-lg transition mb-3"
                >
                    Change Password
                </button>


                <div className="mt-6">
                    <Logout />
                </div>

            </div>

        </div>
    );
};

export default Home;