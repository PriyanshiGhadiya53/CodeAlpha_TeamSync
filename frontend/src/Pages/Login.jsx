import React, { useState } from 'react'
import { useNavigate } from "react-router-dom";
import { FaEye, FaEyeSlash, FaLock, FaVideo } from "react-icons/fa";
import Logo from "../Components/Logo.jsx";

function Login() {

    const navigate = useNavigate();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);

    const loginUser = async (e) => {
        e.preventDefault();

        const res = await fetch(
            "https://codealpha-teamsync.onrender.com/api/v1/user/login",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                credentials: "include",
                body: JSON.stringify({
                    email,
                    password,
                }),
            }
        )

        const data = await res.json();

        console.log("Login response:", data);

        if (!res.ok) {
            console.log(data);
            return;
        }

        console.log("Login successful:", data);
        setEmail("");
        setPassword("");
        setShowPassword(false);

        navigate("/");
    }

    return (
        <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6">

            <div className="w-full max-w-6xl min-h-[650px] grid grid-cols-1 lg:grid-cols-2 overflow-hidden rounded-3xl border border-slate-800 bg-slate-900 shadow-2xl">

                {/* Left Side */}
                <div className="hidden lg:flex flex-col justify-center bg-gradient-to-br from-slate-900 via-slate-950 to-blue-950 p-12">

                    <div className="max-w-md">

                        <div className="mb-8 flex items-center gap-3">
                            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600">
                                <FaVideo className="text-xl" />
                            </div>

                            <h1 className="text-2xl font-bold">
                                Team Sync
                            </h1>
                        </div>

                        <h2 className="text-4xl font-bold leading-tight">
                            Connect.
                            <br />
                            Communicate.
                            <br />
                            Collaborate.
                        </h2>

                        <p className="mt-6 text-base leading-7 text-slate-400">
                            Secure real-time communication for teams.
                            Join video meetings, share your screen,
                            exchange files and collaborate together.
                        </p>

                        <div className="mt-10 space-y-4">

                            <div className="flex items-center gap-3 text-slate-300">
                                <span className="text-blue-400">✓</span>
                                Real-time video meetings
                            </div>

                            <div className="flex items-center gap-3 text-slate-300">
                                <span className="text-blue-400">✓</span>
                                Screen sharing
                            </div>

                            <div className="flex items-center gap-3 text-slate-300">
                                <span className="text-blue-400">✓</span>
                                File sharing & whiteboard
                            </div>

                        </div>

                    </div>
                </div>


                {/* Right Side */}
                <div className="flex items-center justify-center bg-slate-900 p-6 sm:p-10">

                    <div className="w-full max-w-md">
                        <div className="mb-8 lg:hidden">
                            <Logo />
                        </div>

                        {/* Login / Register Tabs */}
                        <div className="mb-8 flex border-b border-slate-700">

                            <button
                                className="flex-1 border-b-2 border-blue-500 pb-4 text-sm font-semibold text-white"
                            >
                                Login
                            </button>

                            <button
                                onClick={() => navigate("/register")}
                                className="flex-1 pb-4 text-sm font-semibold text-slate-500 transition hover:text-white"
                            >
                                Register
                            </button>

                        </div>


                        {/* Heading */}
                        <div className="mb-8">

                            <h2 className="text-3xl font-bold">
                                Welcome back
                            </h2>

                            <p className="mt-2 text-sm text-slate-400">
                                Sign in to continue to Team Sync
                            </p>

                        </div>


                        {/* Login Form */}
                        <form onSubmit={loginUser} className="space-y-5">

                            {/* Email */}
                            <div>

                                <label className="mb-2 block text-sm font-medium text-slate-300">
                                    Email
                                </label>

                                <input
                                    type="email"
                                    autoComplete="off"
                                    placeholder="Enter your email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-white outline-none placeholder:text-slate-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                />

                            </div>


                            {/* Password */}
                            <div>

                                <label className="mb-2 block text-sm font-medium text-slate-300">
                                    Password
                                </label>

                                <div className="relative">

                                    <input
                                        type={showPassword ? "text" : "password"}
                                        autoComplete="new-password"
                                        placeholder="Enter your password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 pr-12 text-white outline-none placeholder:text-slate-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                    />

                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                                    >
                                        {showPassword ? <FaEyeSlash /> : <FaEye />}
                                    </button>

                                </div>

                            </div>


                            {/* Remember + Forgot */}
                            <div className="flex items-center justify-between">

                                <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-400">

                                    <input
                                        type="checkbox"
                                        className="h-4 w-4 accent-blue-600"
                                    />

                                    Remember me

                                </label>


                                <button
                                    type="button"
                                    onClick={() => navigate("/forgot-password")}
                                    className="text-sm font-medium text-blue-400 hover:text-blue-300"
                                >
                                    Forgot password?
                                </button>

                            </div>


                            {/* Login Button */}
                            <button
                                type="submit"
                                className="w-full rounded-xl bg-blue-600 py-3.5 font-semibold text-white transition hover:bg-blue-500"
                            >
                                Sign in
                            </button>

                        </form>


                        {/* Security message */}
                        <div className="mt-6 flex items-center justify-center gap-2 text-sm text-slate-500">

                            <FaLock className="text-xs" />

                            Your data is encrypted and secure

                        </div>

                    </div>

                </div>

            </div>

        </div>
    )
};

export default Login