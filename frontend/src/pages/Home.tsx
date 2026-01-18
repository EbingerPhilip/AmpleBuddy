import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../state/AuthContext";
import { apiGetMyChats, type Chat } from "../services/apiUser.ts";

function getChatDisplayName(chat: Chat, currentUserId: number): string {
    // Group chats: use group name
    if (chat.isGroup) return chat.groupName ?? "Chat";

    // 1–1 chats: name is the other user
    const other = chat.members.find((m) => m.userId !== currentUserId);
    if (other) return other.nickname || other.username;

    return "Chat";
}

function truncate27(s: string): string {
    return s.length > 27 ? s.slice(0, 27) + "..." : s;
}

function getChatSnippet(chat: Chat): string {
    if (!chat.lastMessage) return "No messages yet.";
    const sender = chat.lastMessage.senderNickname || "Unknown";
    const text = chat.lastMessage.content ?? "";
    return truncate27(`${sender}: ${text}`);
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
            last: getChatSnippet(c),
        }));
    }, [chats, userId]);

    return (
        <section className="page page-wide">
            <h1>Home</h1>

            <div className="home-columns" aria-label="Home content">
                <div className="home-column home-column--news" aria-label="About AmpleBuddy">
                    <h2>About AmpleBuddy</h2>
                    <p>
                        AmpleBuddy is designed to be a space where you can and chat with other empathetic users when you
                        would like.<br/>
                        By having users classify themselves as either 'Green' or 'Red' (or even in-between !),
                        AmpleBuddy creates an artificial support structure.<br/><br/>

                        How does this work ? Through you !<br/>
                        Have you ever had days where you simply had to rant and get something off of your chest ? Well,
                        there's a simple fix.<br/>
                        Log your mood as 'Red' today and be automatically matched with a Buddy to chat with. Just make
                        sure you have Buddy Matching on in your profile !<br/><br/>

                        On the other hand, have you just recovered from an emotional pit and want to help others back up
                        ?<br/>
                        Or even, you simply feel very empathetic today and would like to help one of your fellow humans
                        ?<br/>
                        Log your mood as 'Green' and just wait for you Buddy ! You can be the shoulder people cry on
                        just like you dreamed !<br/>
                    </p>

                    <h2>News</h2>
                    <ul>
                        <li>You can now edit messages you sent in the past 10 minutes.</li>
                        <li>Group chats now work fully !</li>
                        <li>Colourblind mode (derived from light mode) has been implemented.</li>
                        <li>You can now change your mood, even if you already logged it !</li>
                        <li>Message Logs can now be retrieved on the profile page.</li>
                        <li>Users can now decouple from chats !</li>
                        <li>Users can now (unfortunately) delete their accounts !</li>
                    </ul>
                    <h2>Bug Fixes</h2>
                    <ul>
                        <li>Profile-pictures now actually work.</li>
                        <li>The option to hide your age now actually does hide your age from your contacts</li>
                        <li>Pressing enter now will automatically send the message you are writing</li>
                        <li>You can now set your date of birth in case you forget during registration</li>
                        <li>No more babies or time travelers ! Only people 18 years of age or older can now create accounts.</li>
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
