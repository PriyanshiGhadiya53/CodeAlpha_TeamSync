import { useState } from "react";
import Logo from "../Components/Logo.jsx";
const ChangePassword = () => {

    const [oldpassword, setOldpassword] = useState("");
    const [newpassword, setNewpassword] = useState("");
    const [confirmpassword, setConfirmpassword] = useState("");

    const changePassword = async (e) => {
        e.preventDefault();

        if (newpassword !== confirmpassword) {
            console.log("New password and confirm password do not match");
            return;
        }

        const response = await fetch(
            "http://localhost:8000/api/v1/user/change-password",
            {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                },
                credentials: "include",
                body: JSON.stringify({
                    oldpassword,
                    newpassword,
                    confirmpassword,
                }),
            }
        );

        const data = await response.json();

        console.log("CHANGE PASSWORD RESPONSE:", data);

        if (!response.ok) {
            console.log("Change password failed:", data);
            return;
        }

        console.log("Password changed successfully");

        setOldpassword("");
        setNewpassword("");
        setConfirmpassword("");
    };

    return (


        <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center px-4">

            <div className="w-full max-w-md bg-gray-900 border border-gray-800 rounded-2xl p-8 shadow-xl">
                <div className="mb-8 lg:hidden">
                    <Logo />
                </div>
                <h1 className="text-2xl font-bold text-center mb-6">
                    Change Password
                </h1>

                <form onSubmit={changePassword}>

                    <input
                        type="password"
                        placeholder="Current Password"
                        value={oldpassword}
                        onChange={(e) => setOldpassword(e.target.value)}
                        className="w-full bg-gray-800 border border-gray-700 text-white placeholder-gray-500 rounded-lg px-4 py-3 mb-4 outline-none focus:border-blue-500"
                    />

                    <input
                        type="password"
                        placeholder="New Password"
                        value={newpassword}
                        onChange={(e) => setNewpassword(e.target.value)}
                        className="w-full bg-gray-800 border border-gray-700 text-white placeholder-gray-500 rounded-lg px-4 py-3 mb-4 outline-none focus:border-blue-500"
                    />

                    <input
                        type="password"
                        placeholder="Confirm New Password"
                        value={confirmpassword}
                        onChange={(e) => setConfirmpassword(e.target.value)}
                        className="w-full bg-gray-800 border border-gray-700 text-white placeholder-gray-500 rounded-lg px-4 py-3 mb-5 outline-none focus:border-blue-500"
                    />

                    <button
                        type="submit"
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition"
                    >
                        Change Password
                    </button>

                </form>

            </div>

        </div>
    );
};

export default ChangePassword;