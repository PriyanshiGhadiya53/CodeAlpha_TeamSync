import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import {
  createBrowserRouter,
  createRoutesFromElements,
  RouterProvider,
  Route,
} from "react-router-dom";

import "./index.css";

import App from "./App.jsx";
import Home from "./Pages/Home.jsx";
import Login from "./Pages/Login.jsx";
import ProtectedRoute from "./Components/ProtectedRoute.jsx";
import Register from "./Pages/Register.jsx";
import ForgotPassword from "./Pages/ForgotPassword.jsx";
import ResetPassword from "./Pages/ResetPassword.jsx";
import ChangePassword from "./Pages/ChangePassword.jsx";


const router = createBrowserRouter(
  createRoutesFromElements(
    <Route>
    
      <Route path="login" element={<Login />} />
        <Route path="register" element={<Register />} />
        <Route path="forgot-password" element={<ForgotPassword />} />
        <Route path="reset-password/:token" element={<ResetPassword />} />
        <Route path="/change-password" element={<ChangePassword />} />

      <Route
        index
        element={
          <ProtectedRoute>
            <Home />
          </ProtectedRoute>
        }
      />

      <Route
        path="room/:roomId"
        element={
          <ProtectedRoute>
            <App />
          </ProtectedRoute>
        }
      />

    </Route>
  )
);

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>
);