import { useNavigate } from "react-router-dom";

const Logout = () => {

   const navigate = useNavigate();

   const logoutUser = async () => {

      const response = await fetch(
         "http://localhost:8000/api/v1/user/logout",
         {
            method: "POST",
            credentials: "include",
         }
      );

      const data = await response.json();

      if (!response.ok) {
         console.log(data);
         return;
      }

      console.log("Logout successful:", data);

      navigate("/login");
   };

return (
   <button
      onClick={logoutUser}
      className="w-full border border-red-500 text-red-400 hover:bg-red-500 hover:text-white font-semibold py-3 rounded-lg transition"
   >
      Logout
   </button>
);
};

export default Logout;