import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../state/AuthContext";
import { apiGetMyChats, type Chat } from "../services/apiUser.ts";

function getChatDisplayName(chat: Chat, currentUserId: number): string {
    // For 1–1 chats: name is the other user
    const other = chat.members.find((m) => m.userId !== currentUserId);
    if (other) return other.nickname || other.username;

    // Fallback (shouldn't happen for 1–1)
    return "Chat";
}

export default function HomePage() {
    const { userId } = useAuth();
    const [chats, setChats] = useState<Chat[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let active = true;

        async function load() {
            setLoading(true);
            setError(null);
            try {
                const data = await apiGetMyChats();
                if (!active) return;
                setChats(data.chats);
            } catch (err) {
                if (!active) return;
                setError(err instanceof Error ? err.message : "Failed to load chats.");
            } finally {
                if (active) setLoading(false);
            }
        }

        load();
        return () => {
            active = false;
        };
    }, []);

    const chatItems = useMemo(() => {
        if (!userId) return [];
        return chats.map((c) => ({
            chatId: c.chatId,
            title: getChatDisplayName(c, userId),
            last: c.lastMessage?.content ?? "No messages yet.",
        }));
    }, [chats, userId]);

    return (
        <section className="page page-wide">
            <h1>Home</h1>

            <div className="home-columns" aria-label="Home content">
                <div className="home-column home-column--news" aria-label="About AmpleBuddy">
                    <h2>About AmpleBuddy</h2>
                    <p>
                        AmpleBuddy is a wellbeing companion. You can track your mood, chat, and review your progress.
                    </p>

                    <h2>News</h2>
                    <ul>
                        <li>Chats now load from the backend (temporary data).</li>
                        <li>Next: daily mood prompt after login.</li>
                    </ul>
                </div>

                <div className="home-column home-column--chats" aria-label="Your chats">
                    <h2>Your chats</h2>

                    {error && (
                        <p role="alert" className="error">
                            {error}
                        </p>
                    )}

                    {loading ? (
                        <p>Loading chats…</p>
                    ) : chatItems.length === 0 ? (
                        <p>No chats yet.</p>
                    ) : (
                        <ul className="chat-list">
                            {chatItems.map((c) => (
                                <li key={c.chatId} className="chat-item">
                                    <h3 className="chat-title">{c.title}</h3>
                                    <p className="chat-snippet">{c.last}</p>
                                    <Link to={`/chat/${c.chatId}`} className="chat-open">
                                        Open chat
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>
        </section>
    );
}
