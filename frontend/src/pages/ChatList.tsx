import "../css/global.css";
import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { useAuth } from "../state/AuthContext";
import { apiGetMyChats, type Chat } from "../services/apiUser";
import { apiGetMyProfile } from "../services/apiProfile";
import {
    LuMessageCircle,
    LuMessageCircleCode,
    LuMessageCircleHeart,
    LuMessageCircleWarning
} from "react-icons/lu";
import {
    GiTrafficLightsGreen,
    GiTrafficLightsOrange,
    GiTrafficLightsRed,
    GiTrafficLightsReadyToGo
} from "react-icons/gi";
import { FaTrafficLight } from "react-icons/fa";

function truncate47(s: string): string {
    return s.length > 47 ? s.slice(0, 47) + "..." : s;
}

function getChatName(chat: Chat, myUserId: number): string {
    if (chat.isGroup) return chat.groupName ?? "Group chat";
    const other = chat.members.find(m => m.userId !== myUserId);
    return other?.nickname || other?.username || "Chat";
}

function getMembersLine(chat: Chat, myUserId: number): string {
    return chat.members
        .filter(m => m.userId !== myUserId)
        .map(m => m.nickname || m.username)
        .join(", ");
}

function getSnippet(chat: Chat): string {
    if (!chat.lastMessage) return "No messages yet";
    return truncate47(`${chat.lastMessage.senderNickname}: ${chat.lastMessage.content}`);
}

function getChatIcon(chat: Chat, myUserId: number) {
    const others = chat.members.filter(m => m.userId !== myUserId);
    const otherIds = others.map(o => o.userId);

    if (!chat.isGroup) {
        if (otherIds[0] === 1) return <LuMessageCircleWarning />;
        if (otherIds[0] === 2) return <LuMessageCircleHeart />;
        return <LuMessageCircle />;
    }

    if (otherIds.length > 0 && otherIds.every(id => id === 1)) {
        return <LuMessageCircleWarning />;
    }

    return <LuMessageCircleCode />;
}

function MoodIllustration({ mood }: { mood: string }) {
    if (mood === "green") return <GiTrafficLightsGreen size={120} />;
    if (mood === "yellow") return <GiTrafficLightsOrange size={120} />;
    if (mood === "red") return <GiTrafficLightsRed size={120} />;
    return <GiTrafficLightsReadyToGo size={120} />;
}

export default function ChatListPage() {
    const { userId } = useAuth();
    const [chats, setChats] = useState<Chat[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [mood, setMood] = useState<string>("grey");

    useEffect(() => {
        async function load() {
            try {
                setLoading(true);
                const data = await apiGetMyChats();
                setChats(data.chats);

                const p = await apiGetMyProfile();
                setMood(p.dailyMood ?? "grey");
            } catch (e) {
                setError("Failed to load chats, " + e);
            } finally {
                setLoading(false);
            }
        }
        void load();
    }, []);

    return (
        <main className="page page-wide">
            <div className="home-columns">
                {/* LEFT COLUMN */}
                <section className="home-column home-column--news">
                    <h1>Chats</h1>

                    {loading && <p>Loading…</p>}
                    {error && <p className="error">{error}</p>}

                    <ul className="chat-list">
                        {chats.map(chat => (
                            <li key={chat.chatId} className="chat-item">
                                <Link to={`/chat/${chat.chatId}`} className="chat-row">
                                    <div className="chat-icon">
                                        {getChatIcon(chat, userId!)}
                                    </div>

                                    <div className="chat-text">
                                        <div className="chat-title">
                                            {getChatName(chat, userId!)}
                                        </div>

                                        {chat.isGroup && (
                                            <div className="chat-members">
                                                {truncate47(getMembersLine(chat, userId!))}
                                            </div>
                                        )}

                                        <div className="chat-snippet">
                                            {getSnippet(chat)}
                                        </div>
                                    </div>
                                </Link>
                            </li>
                        ))}
                    </ul>
                </section>

                {/* RIGHT COLUMN */}
                <aside className="home-column home-column--chats chatlist-right">
                <div style={{ textAlign: "center" }}>
                        <MoodIllustration mood={mood} />

                        {mood === "grey" ? (
                            <Link to="/mood" className="mood-log-link">
                                <FaTrafficLight /> Log Mood?
                            </Link>
                        ) : (
                            <p style={{ fontSize: "1.2rem", fontWeight: 600 }}>
                                Current mood: {mood}
                            </p>
                        )}

                    </div>
                </aside>
            </div>
        </main>
    );
}
