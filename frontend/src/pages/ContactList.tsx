import "../css/global.css";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../state/AuthContext";
import { apiGetMyChats, type Chat } from "../services/apiUser";
import { apiCreateChat } from "../services/apiChat";
import {
    apiAcceptContactRequest,
    apiDenyContactRequest,
    apiGetContacts,
    apiGetMyContactRequests,
    apiGetUserBasic,
    apiSendContactRequest,
    type ContactRequest,
    type ContactUser
} from "../services/apiContacts";

import { LuContact, LuMessageCircle, LuMessageCircleCode, LuMessageCirclePlus, LuMessageCircleQuestion, LuMessageCircleX } from "react-icons/lu";

function truncate47(s: string): string {
    return s.length > 47 ? s.slice(0, 47) + "..." : s;
}
export default function ContactListPage() {
    const navigate = useNavigate();
    const { userId } = useAuth();

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [contacts, setContacts] = useState<ContactUser[]>([]);
    const [requests, setRequests] = useState<ContactRequest[]>([]);
    const [requestUsers, setRequestUsers] = useState<Record<number, ContactUser>>({});

    const [usernameToRequest, setUsernameToRequest] = useState("");
    const [chats, setChats] = useState<Chat[]>([]);

    const myId = useMemo(() => Number(userId ?? 0), [userId]);

    async function loadAll() {
        try {
            setLoading(true);
            setError(null);

            // chats (for "create/open chat" check)
            const chatData = await apiGetMyChats();
            setChats(chatData.chats);

            // contacts
            const raw = await apiGetContacts(myId);
            const ids = raw.contacts
                .map(c => (c.userid1 === myId ? c.userid2 : c.userid1))
                .filter(id => id !== myId);

            const users: ContactUser[] = [];
            for (const id of ids) {
                const u = await apiGetUserBasic(id);
                users.push({
                    userId: u.userid,
                    username: u.username ?? "",
                    nickname: u.nicknames ?? u.username ?? "Unknown"
                });
            }
            setContacts(users);

            // requests
            const reqs = await apiGetMyContactRequests();
            setRequests(reqs);

            const reqMap: Record<number, ContactUser> = {};
            for (const r of reqs) {
                const u = await apiGetUserBasic(r.useridRequester);
                reqMap[r.useridRequester] = {
                    userId: u.userid,
                    username: u.username ?? "",
                    nickname: u.nicknames ?? u.username ?? "Unknown"
                };
            }
            setRequestUsers(reqMap);

        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : "Failed to load contacts");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        if (!myId) return;
        void loadAll();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [myId]);

    async function onCreateOrOpenChat(contactId: number) {
        try {
            setError(null);

            // find existing 1–1 chat
            const existing = chats.find(c => {
                if (c.isGroup) return false;
                const other = c.members.find(m => m.userId !== myId);
                return other?.userId === contactId;
            });

            if (existing) {
                navigate(`/chat/${existing.chatId}`);
                return;
            }

            const newChatId = await apiCreateChat([myId, contactId]);
            navigate(`/chat/${newChatId}`);
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : "Failed to create/open chat");
        }
    }

    async function onSendRequest() {
        const name = usernameToRequest.trim();
        if (!name) {
            setError("Please enter a username.");
            return;
        }
        try {
            setError(null);
            await apiSendContactRequest(name);
            setUsernameToRequest("");
            await loadAll();
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : "Failed to send request");
        }
    }

    async function onAccept(requesterId: number) {
        try {
            setError(null);
            await apiAcceptContactRequest(requesterId);
            await loadAll();
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : "Failed to accept request");
        }
    }

    async function onDeny(requesterId: number) {
        try {
            setError(null);
            await apiDenyContactRequest(requesterId);
            await loadAll();
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : "Failed to deny request");
        }
    }

    return (
        <main className="page page-wide">
            <div className="home-columns">
                {/* LEFT COLUMN */}
                <section className="home-column home-column--news">
                    <h1>Your Contacts</h1>

                    {loading && <p>Loading…</p>}
                    {error && <p className="error">{error}</p>}

                    <ul className="contact-list">
                        {contacts.map(c => (
                            <li key={c.userId} className="contact-item">
                                <div className="contact-actions">
                                    <button
                                        type="button"
                                        className="contact-icon-button"
                                        title="Create Chat"
                                        onClick={() => void onCreateOrOpenChat(c.userId)}
                                    >
                                        <LuMessageCircle />
                                    </button>

                                    <Link
                                        to="/home"
                                        className="contact-icon-link"
                                        title="Create Groupchat"
                                        aria-label="Create Groupchat"
                                    >
                                        <LuMessageCircleCode />
                                    </Link>
                                </div>

                                <div className="contact-name">{c.nickname}</div>

                                <Link
                                    to={`/contact/${c.userId}`}
                                    className="contact-profile-link"
                                    title="View Profile"
                                    aria-label="View Profile"
                                >
                                    <LuContact />
                                </Link>
                            </li>

                        ))}
                    </ul>
                </section>

                {/* RIGHT COLUMN */}
                <aside className="home-column home-column--chats">
                    <h1>Contact Requests</h1>

                    <div className="contact-request-box">
                        <input
                            value={usernameToRequest}
                            onChange={(e) => setUsernameToRequest(e.target.value)}
                            placeholder="Search username…"
                        />
                        <button
                            type="button"
                            className="contact-icon-button"
                            title="Send contact request"
                            onClick={() => void onSendRequest()}
                        >
                            <LuMessageCircleQuestion />
                        </button>
                    </div>

                    <ul className="request-list">
                        {requests.map(r => {
                            const u = requestUsers[r.useridRequester];
                            const name = u?.nickname ?? `User ${r.useridRequester}`;
                            return (
                                <li key={`${r.useridReciever}-${r.useridRequester}`} className="request-item">
                                    <div className="request-name">
                                        {truncate47(name)}
                                    </div>

                                    <div className="request-actions">
                                        <button
                                            type="button"
                                            className="contact-icon-button"
                                            title="Accept"
                                            onClick={() => void onAccept(r.useridRequester)}
                                        >
                                            <LuMessageCirclePlus />
                                        </button>

                                        <button
                                            type="button"
                                            className="contact-icon-button"
                                            title="Deny"
                                            onClick={() => void onDeny(r.useridRequester)}
                                        >
                                            <LuMessageCircleX />
                                        </button>
                                    </div>
                                </li>
                            );
                        })}
                    </ul>

                    {requests.length === 0 && !loading && <p>No contact requests.</p>}
                </aside>
            </div>
        </main>
    );
}
