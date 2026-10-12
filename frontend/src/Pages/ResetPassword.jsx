import React, { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { FaLock, FaEye, FaEyeSlash, FaVideo } from "react-icons/fa";

function ResetPassword() {

    const navigate = useNavigate();
    const { token } = useParams();

    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);



    const resetPassword = async (e) => {
    e.preventDefault();

    console.log("Reset token:", token);
    console.log("New password:", password);

    if (password !== confirmPassword) {
        console.log("Passwords do not match");
        return;
    }

    const res = await fetch(
        `https://codealpha-teamsync.onrender.com/api/v1/user/reset-password/${token}`,
        {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                password,
            }),
        }
    );

    console.log("STATUS:", res.status);

    const text = await res.text();

    console.log("RESET PASSWORD RESPONSE:", text);

    if (!res.ok) {
        console.log("Reset password failed");
        return;
    }

    console.log("Password reset successfully");

    navigate("/login");
};


    return (
        <div className="min-h-screen bg-[#0b1120] text-white flex">

            {/* Left Side */}
            <div className="hidden lg:flex w-1/2 bg-[#111827] flex-col justify-center px-16">

                <div className="flex items-center gap-3 mb-8">
                    <div className="bg-blue-600 p-3 rounded-xl">
                        <FaVideo size={22} />
                    </div>

                    <h1 className="text-2xl font-bold">
                        Team Sync
                    </h1>
                </div>

                <h2 className="text-4xl font-bold mb-4">
                    Create a new password
                </h2>

                <p className="text-gray-400 text-lg">
                    Set a new password for your account and continue using Team Sync.
                </p>

            </div>


            {/* Right Side */}
            <div className="w-full lg:w-1/2 flex items-center justify-center px-6">

                <div className="w-full max-w-md">

                    <h2 className="text-3xl font-bold mb-2">
                        Reset Password
                    </h2>

                    <p className="text-gray-400 mb-8">
                        Enter your new password below.
                    </p>


                    <form onSubmit={resetPassword} className="space-y-5">

                        {/* New Password */}
                        <div>
                            <label className="block text-sm text-gray-300 mb-2">
                                New Password
                            </label>

                            <div className="relative">

                                <FaLock className="absolute left-4 top-4 text-gray-500" />

                                <input
                                    type={showPassword ? "text" : "password"}
                                    placeholder="Enter new password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full bg-[#111827] border border-gray-700 rounded-xl py-3 pl-11 pr-12 outline-none focus:border-blue-500"
                                />

                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-4 top-3.5 text-gray-400"
                                >
                                    {showPassword ? <FaEyeSlash /> : <FaEye />}
                                </button>

                            </div>
                        </div>


                        {/* Confirm Password */}
                        <div>
                            <label className="block text-sm text-gray-300 mb-2">
                                Confirm Password
                            </label>

                            <div className="relative">

                                <FaLock className="absolute left-4 top-4 text-gray-500" />

                                <input
                                    type={showConfirmPassword ? "text" : "password"}
                                    placeholder="Confirm new password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className="w-full bg-[#111827] border border-gray-700 rounded-xl py-3 pl-11 pr-12 outline-none focus:border-blue-500"
                                />

                                <button
                                    type="button"
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                    className="absolute right-4 top-3.5 text-gray-400"
                                >
                                    {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
                                </button>

                            </div>
                        </div>


                        <button
                            type="submit"
                            className="w-full bg-blue-600 hover:bg-blue-700 py-3 rounded-xl font-semibold"
                        >
                            Reset Password
                        </button>

                    </form>


                    <button
                        onClick={() => navigate("/login")}
                        className="w-full mt-5 text-gray-400 hover:text-white"
                    >
                        Back to Login
                    </button>

                </div>

            </div>

        </div>
    );
}

export default ResetPassword;