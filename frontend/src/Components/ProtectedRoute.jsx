import { useState, useEffect } from "react";
import { Navigate } from "react-router-dom";

const ProtectedRoute = ({ children }) => {

    const [loading, setLoading] = useState(true);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [user, setUser] = useState(null);

    useEffect(() => {

        const checkUser = async () => {
            const res = await fetch(
                "http://localhost:8000/api/v1/user/me",
                {
                    method: "GET",
                    credentials: "include",
                }
            )
            if (res.ok) {

                const data = await res.json();

                setIsAuthenticated(true);
                setUser(data.data);

            }
            setLoading(false);
        };
        checkUser();

    }, [])
    if (loading) {
        return <p>Loading...</p>;
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

return children;
};

export default ProtectedRoute;