import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaArrowLeft, FaLock, FaVideo } from "react-icons/fa";
import Logo from "../Components/Logo.jsx";
function ForgotPassword() {

    const navigate = useNavigate();

    const [email, setEmail] = useState("");

    const forgotPassword = async (e) => {
        e.preventDefault();

        console.log("Forgot password email:", email);

        const res = await fetch(
            "http://localhost:8000/api/v1/user/forgot-password",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    email,
                }),
            }
        );

        console.log("STATUS:", res.status);

        const text = await res.text();

        console.log("BACKEND RESPONSE:", text);

        if (!res.ok) {
            console.log("Forgot password failed");
            return;
        }

        const data = JSON.parse(text);

        const resetToken = data.data.resetToken;

        console.log("RESET TOKEN:", resetToken);

        navigate(`/reset-password/${resetToken}`);
    };



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
                            Don't worry.
                            <br />
                            We've got you.
                        </h2>

                        <p className="mt-6 text-base leading-7 text-slate-400">
                            Enter your registered email address and
                            we'll help you get back into your account.
                        </p>

                    </div>

                </div>


                {/* Right Side */}
                <div className="flex items-center justify-center bg-slate-900 p-6 sm:p-10">

                    <div className="w-full max-w-md">

                        <div className="mb-8 lg:hidden">
                            <Logo />
                        </div>

                        {/* Back to Login */}
                        <button
                            type="button"
                            onClick={() => navigate("/login")}
                            className="mb-8 flex items-center gap-2 text-sm text-slate-400 transition hover:text-white"
                        >
                            <FaArrowLeft />
                            Back to Login
                        </button>


                        {/* Heading */}
                        <div className="mb-8">

                            <h2 className="text-3xl font-bold">
                                Forgot Password?
                            </h2>

                            <p className="mt-2 text-sm leading-6 text-slate-400">
                                Enter your registered email address
                                and we'll send you a password reset link.
                            </p>

                        </div>


                        {/* Form */}
                        <form
                            onSubmit={forgotPassword}
                            className="space-y-5"
                        >

                            <div>

                                <label className="mb-2 block text-sm font-medium text-slate-300">
                                    Email
                                </label>

                                <input
                                    type="email"
                                    placeholder="Enter your registered email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-white outline-none placeholder:text-slate-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                />

                            </div>


                            <button
                                type="submit"
                                className="w-full rounded-xl bg-blue-600 py-3.5 font-semibold text-white transition hover:bg-blue-500"
                            >
                                Send Reset Link
                            </button>

                        </form>


                        {/* Security message */}
                        <div className="mt-6 flex items-center justify-center gap-2 text-sm text-slate-500">

                            <FaLock className="text-xs" />

                            Your account information is secure

                        </div>

                    </div>

                </div>

            </div>

        </div>
    );
}

export default ForgotPassword;