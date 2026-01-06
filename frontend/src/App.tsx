import { Navigate, Route, Routes } from "react-router-dom";
import LoginPage from "./pages/Login";
import RegisterPage from "./pages/Register";
import HomePage from "./pages/Home";
import ViewChatPage from "./pages/Chat";
import ViewProfilePage from "./pages/Profile";
import { useAuth } from "./state/AuthContext";
import type { JSX } from "react";
import AuthedLayout from "./layout/AuthedLayout";
import MoodAmple from "./pages/MoodAmple";

function RequireAuth({ children }: { children: JSX.Element }) {
    const { isAuthenticated } = useAuth();
    return isAuthenticated ? children : <Navigate to="/login" replace />;
}

export default function App() {
    return (
        <Routes>
            <Route path="/" element={<Navigate to="/home" replace />} />

            {/* No sidebar here */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />

            {/* Sidebar overlays all routes inside here */}
            <Route
                element={
                    <RequireAuth>
                        <AuthedLayout />
                    </RequireAuth>
                }
            >
                <Route path="/home" element={<HomePage />} />
                <Route path="/chat/:chatId" element={<ViewChatPage />} />
                <Route path="/profile" element={<ViewProfilePage />} />
                < Route path="/mood" element={<MoodAmple />} />
            </Route>

            <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
    );
}
