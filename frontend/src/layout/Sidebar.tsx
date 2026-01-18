import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../state/AuthContext";
import { FiUser, FiHome, FiLogOut } from "react-icons/fi";
import { FaTrafficLight } from "react-icons/fa";
import { LuMessageCircleHeart, LuMessageCircle, LuContact } from "react-icons/lu";

export default function Sidebar() {
    const { logout } = useAuth();
    const navigate = useNavigate();

    function onLogout() {
        logout();
        navigate("/login", { replace: true });
    }

    return (
        <nav className="sidebar" aria-label="Sidebar navigation">
            <div className="sidebar-inner">
                <div className="sidebar-top">

                    <NavLink
                        to="/home"
                        className={({ isActive }) => (isActive ? "sidebar-icon active" : "sidebar-icon")}
                        aria-label="Home"
                        title="Home"
                    >
                        <FiHome aria-hidden="true" />
                    </NavLink>
                    <NavLink
                        to="/profile"
                        className={({ isActive }) => (isActive ? "sidebar-icon active" : "sidebar-icon")}
                        aria-label="View profile"
                        title="Profile"
                    >
                        <FiUser aria-hidden="true" />
                    </NavLink>
                    <NavLink
                        to="/contacts"
                        className={({ isActive }) => (isActive ? "sidebar-icon active" : "sidebar-icon")}
                        aria-label="Contacts"
                        title="Contacts"
                    >
                        <LuContact />
                    </NavLink>
                    <NavLink
                        to="/mood"
                        className={({ isActive }) => (isActive ? "sidebar-icon active" : "sidebar-icon")}
                        aria-label="Mood"
                        title="Mood"
                    >
                        <FaTrafficLight aria-hidden="true" />
                    </NavLink>
                    <NavLink
                        to="/chats"
                        className={({ isActive }) => (isActive ? "sidebar-icon active" : "sidebar-icon")}
                        aria-label="Chats"
                        title="Chats"
                    >
                        <LuMessageCircle aria-hidden="true" />
                    </NavLink>
                    <NavLink
                        to="/scheduled-message"
                        className={({ isActive }) => (isActive ? "sidebar-icon active" : "sidebar-icon")}
                        aria-label="Scheduled message"
                        title="Scheduled message"
                    >
                        <LuMessageCircleHeart aria-hidden="true" />
                    </NavLink>

                </div>

                <button
                    type="button"
                    className="sidebar-icon sidebar-logout"
                    onClick={onLogout}
                    aria-label="Log out"
                    title="Log out"
                >
                    <FiLogOut aria-hidden="true" />
                </button>
            </div>
        </nav>
    );
}
