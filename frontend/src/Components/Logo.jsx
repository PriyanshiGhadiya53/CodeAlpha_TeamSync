import { FaVideo } from "react-icons/fa";

const Logo = () => {
   return (
      <div className="flex items-center gap-3">
         <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600">
            <FaVideo className="text-xl" />
         </div>

         <div>
            <h1 className="text-2xl font-bold">
               Team Sync
            </h1>

            <p className="text-sm text-slate-400">
               Real-time communication
            </p>
         </div>
      </div>
   );
};

export default Logo;