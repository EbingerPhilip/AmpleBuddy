import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";

export default function AuthedLayout() {
    return (
        <div className="authed-layout">
            <Sidebar />
            <div className="authed-content" role="main">
                <Outlet />
            </div>
        </div>
    );
}
