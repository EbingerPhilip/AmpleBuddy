import "../css/global.css";
import { useEffect, useMemo, useState, useRef } from "react";
import { useParams } from "react-router-dom";
import { useAuth } from "../state/AuthContext";
import { apiGetChatMessages, apiSendChatMessage, apiGetChatTitle, type ChatMessageRow } from "../services/apiChat";

function formatTime(iso: string): string {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleString();
}

export default function ViewChatPage() {
    const { chatId } = useParams();
    const { userId } = useAuth();

    const numericChatId = useMemo(() => Number(chatId), [chatId]);

    const [messages, setMessages] = useState<ChatMessageRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [draft, setDraft] = useState("");
    const [sending, setSending] = useState(false);
    const [chatTitle, setChatTitle] = useState("Chat");

    const messagesEndRef = useRef<HTMLDivElement | null>(null);

    async function load() {
        try {
            setLoading(true);
            setError(null);
            const data = await apiGetChatMessages(numericChatId);
            const t = await apiGetChatTitle(numericChatId);

            setChatTitle(t);
            setMessages(data);
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : "Failed to load chat");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        if (!Number.isFinite(numericChatId) || numericChatId <= 0) {
            setError("Invalid chat id");
            setLoading(false);
            return;
        }
        void load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [numericChatId]);
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "auto" });
    }, [messages]);

    async function onSend() {
        const text = draft.trim();
        if (!text) {
            setError("Message cannot be empty.");
            return;
        }

        try {
            setSending(true);
            setError(null);
            await apiSendChatMessage(numericChatId, text);
            setDraft("");
            await load();
            messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });

        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : "Failed to send");
        } finally {
            setSending(false);
        }
    }

    return (
        <main className="page page-wide">
            <h1>{chatTitle}</h1>

            {error && <p className="error" role="alert">{error}</p>}

            {loading ? (
                <p>Loading messages…</p>
            ) : (
                <div className="chat-page">
                    <ul className="chat-messages" aria-label="Chat messages">
                        {messages.map((m) => {
                            const mine = userId != null && m.sender === userId;
                            return (
                                <li key={m.messageId} className={mine ? "chat-message chat-message--mine" : "chat-message"}>
                                    <div className="chat-message-meta">
                                        <span className="chat-message-sender">{m.nicknames}</span>
                                        <span className="chat-message-time">{formatTime(m.timeSent)}</span>
                                    </div>
                                    <div className="chat-message-text">{m.text}</div>
                                </li>
                            );
                        })}
                        <div ref={messagesEndRef} />
                    </ul>

                    <div className="chat-compose">
                        <input
                            value={draft}
                            onChange={(e) => setDraft(e.target.value)}
                            placeholder="Type a message…"
                            disabled={sending}
                        />
                        <button type="button" onClick={() => void onSend()} disabled={sending}>
                            Send
                        </button>
                    </div>
                </div>
            )}
        </main>
    );
}
