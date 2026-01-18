import "../css/global.css";
import { useEffect, useMemo, useState, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../state/AuthContext";
import { apiGetContacts, apiGetUserBasic, type ContactUser } from "../services/apiContacts";
import {
    apiDecoupleFromChat,
    apiEditMessage,
    apiGetChatMessages,
    apiGetChatTitle,
    apiSendChatFile,
    apiGetGroupChat,
    apiAddToGroupChat,
    apiRemoveFromGroupChat,
    apiRenameGroupChat,
    apiSetGroupChatAdmin,
    type ChatMessageRow,
    type GroupChatDetails
} from "../services/apiChat";

import { enterChat, onIncomingMessage, socketSendMessage } from "../services/sockets";

function formatTime(iso: string): string {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleString();
}
function formatBytes(bytes: number | null | undefined): string {
    if (!bytes || bytes <= 0) return "Unknown size";
    const mb = bytes / (1024 * 1024);
    if (mb >= 1) return `${mb.toFixed(0)} MB`;
    const kb = bytes / 1024;
    return `${Math.max(1, Math.round(kb))} KB`;
}

function getExtFromUrl(url: string): string {
    const clean = url.split("?")[0].split("#")[0];
    const last = clean.split("/").pop() ?? "";
    const dot = last.lastIndexOf(".");
    if (dot === -1) return "file";
    return last.slice(dot + 1).toLowerCase();
}

async function downloadViaBlob(url: string) {
    const clean = url.split("#")[0];
    const res = await fetch(clean, { method: "GET" });
    if (!res.ok) throw new Error("Download failed");

    const blob = await res.blob();

    // filename from URL (fallback to a generic name)
    const cleanNoQuery = clean.split("?")[0];
    const filename = (cleanNoQuery.split("/").pop() || "download").replace(/[^a-zA-Z0-9._-]/g, "_");

    const objUrl = URL.createObjectURL(blob);
    try {
        const a = document.createElement("a");
        a.href = objUrl;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
    } finally {
        URL.revokeObjectURL(objUrl);
    }
}

export default function ViewChatPage() {
    const { chatId } = useParams();
    const { userId } = useAuth();
    const navigate = useNavigate();

    const numericChatId = useMemo(() => Number(chatId), [chatId]);

    const [messages, setMessages] = useState<ChatMessageRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [editingMessageId, setEditingMessageId] = useState<number | null>(null);
    const [editDraft, setEditDraft] = useState("");
    const [editSaving, setEditSaving] = useState(false);

    const [draft, setDraft] = useState("");
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [attachmentSizes, setAttachmentSizes] = useState<Record<string, number>>({});
    const [showEmojis, setShowEmojis] = useState(false);
    const [sending, setSending] = useState(false);
    const [chatTitle, setChatTitle] = useState("Chat");
    const [leaveOpen, setLeaveOpen] = useState(false);
    const [leaving, setLeaving] = useState(false);

    const [group, setGroup] = useState<GroupChatDetails | null>(null);
    const [participantsOpen, setParticipantsOpen] = useState(false);
    const [groupSettingsOpen, setGroupSettingsOpen] = useState(false);

    const [memberInfo, setMemberInfo] = useState<Record<number, ContactUser>>({});
    const [myContacts, setMyContacts] = useState<ContactUser[]>([]);

    const [renameDraft, setRenameDraft] = useState("");
    const [groupBusy, setGroupBusy] = useState(false);
    const [addSelectedId, setAddSelectedId] = useState<number>(0);

    const messagesEndRef = useRef<HTMLDivElement | null>(null);

    async function load() {
        try {
            setLoading(true);
            setError(null);
            const data = await apiGetChatMessages(numericChatId);
            const t = await apiGetChatTitle(numericChatId);
            setChatTitle(t);
            setMessages(data);

            // Try load group details (if not a groupchat, this will fail)
            try {
                const g = await apiGetGroupChat(numericChatId);
                setGroup(g);
                setRenameDraft(g.groupname);

                // member info
                const info: Record<number, ContactUser> = {};
                for (const id of g.members) {
                    const u = await apiGetUserBasic(id);
                    info[id] = {
                        userId: u.userid,
                        username: u.username ?? "",
                        nickname: u.nicknames ?? u.username ?? `User ${u.userid}`,
                    };
                }
                setMemberInfo(info);

                // load my contacts for add-member UI
                if (userId != null) {
                    const me = Number(userId);
                    const raw = await apiGetContacts(me);
                    const ids = raw.contacts
                        .map(c => (c.userid1 === me ? c.userid2 : c.userid1))
                        .filter(id => id !== me);

                    const users: ContactUser[] = [];
                    for (const id of ids) {
                        const u = await apiGetUserBasic(id);
                        users.push({
                            userId: u.userid,
                            username: u.username ?? "",
                            nickname: u.nicknames ?? u.username ?? "Unknown",
                        });
                    }
                    setMyContacts(users);
                }
            } catch {
                setGroup(null);
                setMemberInfo({});
                setMyContacts([]);
                setAddSelectedId(0);
            }

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
        if (!Number.isFinite(numericChatId) || numericChatId <= 0) return;
        if (userId == null) return;

        let off: (() => void) | null = null;
        let cancelled = false;

        (async () => {
            await enterChat(userId, numericChatId);
            if (cancelled) return;

            off = onIncomingMessage(() => {
                void load();
            });
        })();

        return () => {
            cancelled = true;
            off?.();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [numericChatId, userId]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "auto" });
    }, [messages]);
    useEffect(() => {
        // Fetch sizes for new links we haven’t seen yet (via HEAD Content-Length)
        const links = messages.map(m => m.link).filter((l): l is string => !!l);
        const missing = links.filter(l => attachmentSizes[l] == null);

        if (missing.length === 0) return;

        let cancelled = false;

        (async () => {
            const updates: Record<string, number> = {};

            await Promise.all(
                missing.map(async (link) => {
                    try {
                        const res = await fetch(link, { method: "HEAD" });
                        if (!res.ok) return;
                        const len = res.headers.get("content-length");
                        const bytes = len ? Number(len) : NaN;
                        if (Number.isFinite(bytes) && bytes > 0) updates[link] = bytes;
                    } catch {
                        // ignore
                    }
                })
            );

            if (cancelled) return;
            if (Object.keys(updates).length > 0) {
                setAttachmentSizes((prev) => ({ ...prev, ...updates }));
            }
        })();

        return () => {
            cancelled = true;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [messages]);

    async function onSend() {
        const trimmed = draft.trim();
        // Backend rejects whitespace only text so we're using a "zero width space" to pass validation.
        const text = selectedFile && !trimmed ? "\u200B" : trimmed;

        const MAX_BYTES = 10 * 1024 * 1024; // 10 MB

        // Text is required only for non-file messages
        if (!text && !selectedFile) {
            setError("Message text cannot be empty.");
            return;
        }

        if (selectedFile && selectedFile.size > MAX_BYTES) {
            setError("File is too large (max 10 MB).");
            return;
        }

        try {
            setSending(true);
            setError(null);
            if (userId == null) throw new Error("You must be logged in to send messages.");

            if (selectedFile) {
                await apiSendChatFile(numericChatId, text, selectedFile);
                setSelectedFile(null);
            } else {
                await socketSendMessage(userId, numericChatId, text);
            }

            setDraft("");
            setShowEmojis(false);
            await load();
            messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
        } catch (e: unknown) {
            console.error(e);
            setError(e instanceof Error ? e.message : "Failed to send");
        } finally {
            setSending(false);
        }
    }

    const isGroup = group != null;
    const isAdmin = isGroup && userId != null && group!.admin === Number(userId);

    function memberLabel(id: number): string {
        return memberInfo[id]?.nickname ?? `User ${id}`;
    }

    async function onRenameGroup() {
        try {
            if (!group) return;
            const name = renameDraft.trim();
            if (!name) {
                setError("Group name cannot be empty.");
                return;
            }
            setGroupBusy(true);
            setError(null);
            await apiRenameGroupChat(group.chatId, name);
            await load();
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : "Failed to rename groupchat");
        } finally {
            setGroupBusy(false);
        }
    }

    async function onAddMember() {
        try {
            if (!group) return;
            if (!isAdmin) {
                setError("Only the group admin can add members.");
                return;
            }
            if (!addSelectedId || addSelectedId <= 0) {
                setError("Please select a contact to add.");
                return;
            }
            if (addSelectedId === 1 || addSelectedId === 2) {
                setError("You can't add a deleted/self user.");
                return;
            }
            setGroupBusy(true);
            setError(null);
            await apiAddToGroupChat(group.chatId, addSelectedId);
            setAddSelectedId(0);
            await load();
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : "Failed to add member");
        } finally {
            setGroupBusy(false);
        }
    }

    async function onRemoveMember(targetId: number) {
        try {
            if (!group) return;
            setGroupBusy(true);
            setError(null);
            await apiRemoveFromGroupChat(group.chatId, targetId);

            // if I removed myself, go back to chats
            if (userId != null && targetId === Number(userId)) {
                navigate("/chats", { replace: true });
                return;
            }
            await load();
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : "Failed to remove member");
        } finally {
            setGroupBusy(false);
        }
    }

    async function onMakeAdmin(newAdminId: number) {
        try {
            if (!group) return;
            if (!isAdmin) {
                setError("Only the group admin can change the admin.");
                return;
            }
            setGroupBusy(true);
            setError(null);
            await apiSetGroupChatAdmin(group.chatId, newAdminId);
            await load();
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : "Failed to change admin");
        } finally {
            setGroupBusy(false);
        }
    }

    function canEditMessage(m: ChatMessageRow): boolean {
        if (userId == null) return false;
        if (m.sender !== userId) return false;

        const sent = new Date(m.timeSent).getTime();
        if (!Number.isFinite(sent)) return false;

        const tenMinutesMs = 10 * 60 * 1000;
        return Date.now() - sent <= tenMinutesMs;
    }

    function startEdit(m: ChatMessageRow) {
        setEditingMessageId(m.messageId);
        setEditDraft(m.text ?? "");
        setError(null);
    }

    function cancelEdit() {
        setEditingMessageId(null);
        setEditDraft("");
    }

    async function saveEdit(messageId: number) {
        try {
            if (userId == null) throw new Error("You must be logged in.");
            const newText = editDraft.trim();
            if (!newText) {
                setError("Message text cannot be empty.");
                return;
            }

            setEditSaving(true);
            setError(null);
            await apiEditMessage(messageId, userId, newText);

            cancelEdit();
            await load();
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : "Failed to edit message");
        } finally {
            setEditSaving(false);
        }
    }


    async function onLeaveChatConfirm() {
        try {
            setLeaving(true);
            setError(null);
            await apiDecoupleFromChat(numericChatId);
            navigate("/chats", { replace: true });
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : "Failed to leave chat");
        } finally {
            setLeaving(false);
            setLeaveOpen(false);
        }
    }

    return (
        <main className="page page-wide">
            <div className="chat-header">
                <button
                    type="button"
                    className={isGroup ? "chat-title-button" : "chat-title-button chat-title-button--disabled"}
                    onClick={() => isGroup && setParticipantsOpen(true)}
                    disabled={!isGroup}
                    title={isGroup ? "View participants" : undefined}
                >
                    <h1 className="chat-title-heading">{chatTitle}</h1>
                </button>

                <div className="chat-header-actions">
                    {isGroup && (
                        <button
                            type="button"
                            className="chat-header-btn"
                            onClick={() => setGroupSettingsOpen(true)}
                            disabled={groupBusy}
                            title="Group settings"
                        >
                            Group settings
                        </button>
                    )}

                    <button
                        type="button"
                        className="chat-header-btn"
                        onClick={() => setLeaveOpen(true)}
                        disabled={leaving}
                        title="Leave this chat"
                    >
                        Decouple
                    </button>
                </div>
            </div>



            {error && <p className="error" role="alert">{error}</p>}

            {loading ? (
                <p>Loading messages…</p>
            ) : (
                <div className="chat-page">
                    <ul className="chat-messages" aria-label="Chat messages">
                        {messages.map((m) => {
                            const mine = userId != null && m.sender === userId;
                            const link = m.link ?? null;

                            return (
                                <li key={m.messageId} className={mine ? "chat-message chat-message--mine" : "chat-message"}>
                                    <div className="chat-message-meta">
                                        <span className="chat-message-sender">{m.nicknames}</span>

                                        <span className="chat-message-meta-right">
                                            <span className="chat-message-time">{formatTime(m.timeSent)}</span>
                                            {canEditMessage(m) && editingMessageId !== m.messageId && (
                                                <button
                                                    type="button"
                                                    className="chat-message-action"
                                                    onClick={() => startEdit(m)}
                                                >
                                                    Edit
                                                </button>
                                            )}
                                        </span>
                                    </div>


                                    {editingMessageId === m.messageId ? (
                                        <div className="chat-edit">
                                            <textarea
                                                className="chat-edit-input"
                                                value={editDraft}
                                                onChange={(e) => setEditDraft(e.target.value)}
                                                onKeyDown={(e) => {
                                                    // Enter saves, Shift+Enter adds newline
                                                    if (e.key === "Enter" && !e.shiftKey && !(e as any).isComposing) {
                                                        e.preventDefault();
                                                        void saveEdit(m.messageId);
                                                    }
                                                }}
                                                disabled={editSaving}
                                            />
                                            <div className="chat-edit-actions">
                                                <button type="button" onClick={() => cancelEdit()} disabled={editSaving}>
                                                    Cancel
                                                </button>
                                                <button type="button" onClick={() => void saveEdit(m.messageId)} disabled={editSaving}>
                                                    {editSaving ? "Saving..." : "Save"}
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        m.text && <div className="chat-message-text">{m.text}</div>
                                    )}


                                    {link && (() => {
                                        const ext = getExtFromUrl(link);
                                        const sizeLabel = formatBytes(attachmentSizes[link]);
                                        const isInlineImage = /^(png|jpe?g|gif)$/i.test(ext);

                                        const label = `Download ${ext}: ${sizeLabel}`;

                                        return (
                                            <div className="chat-message-attachment">
                                                {isInlineImage && (
                                                    <button
                                                        type="button"
                                                        className="chat-attachment-preview"
                                                        onClick={() => {
                                                            void (async () => {
                                                                try {
                                                                    await downloadViaBlob(link);
                                                                } catch (e: unknown) {
                                                                    setError(e instanceof Error ? e.message : "Download failed");
                                                                }
                                                            })();
                                                        }}
                                                        title={label}
                                                    >
                                                        <img
                                                            src={link}
                                                            alt="Attachment"
                                                            className="chat-attachment-img"
                                                        />

                                                    </button>
                                                )}

                                                <button
                                                    type="button"
                                                    className={
                                                        isInlineImage
                                                            ? "chat-attachment-download chat-attachment-download--below"
                                                            : "chat-attachment-download"
                                                    }
                                                    onClick={() => {
                                                        void (async () => {
                                                            try {
                                                                await downloadViaBlob(link);
                                                            } catch (e: unknown) {
                                                                setError(e instanceof Error ? e.message : "Download failed");
                                                            }
                                                        })();
                                                    }}
                                                >
                                                {label}
                                                </button>
                                            </div>
                                        );
                                    })()}
                                </li>
                            );
                        })}
                        <div ref={messagesEndRef} />
                    </ul>

                    <div className="chat-compose chat-compose--wrap">
                    {showEmojis && (
                        <div className="chat-emoji-picker" aria-label="Emoji picker">
                        {[
                                    "😀", "😁", "😂", "🤣", "😊", "😍", "😘", "😎",
                                    "🙂", "🙃", "😉", "😭", "😡", "👍", "👎", "👏",
                                    "🙏", "💪", "🎉", "🔥", "❤️", "💛", "💚", "💙",
                                ].map((emo) => (
                            <button
                                key={emo}
                                type="button"
                                className="chat-emoji-btn"
                                onClick={() => setDraft((prev) => prev + emo)}
                                aria-label={`Insert ${emo}`}
                            >

                            {emo}
                                    </button>
                                ))}
                            </div>
                        )}

                        <input
                            value={draft}
                            onChange={(e) => setDraft(e.target.value)}
                            onKeyDown={(e) => {
                                // Enter sends (like login). Avoid interfering with IME composition.
                                if (e.key === "Enter" && !e.shiftKey && !(e as any).isComposing) {
                                    e.preventDefault();
                                    void onSend();
                                }
                            }}
                            placeholder={selectedFile ? "Add a message for the attachment…" : "Type a message…"}
                            disabled={sending}
                        />


                        <input
                            type="file"
                            id="chat-file"
                            className="u-hidden"
                            onChange={(e) => {
                                const f = e.target.files?.[0] ?? null;
                                setSelectedFile(f);
                                // allow picking the same file again
                                e.currentTarget.value = "";
                            }}
                        />

                        <button
                            type="button"
                            onClick={() => setShowEmojis((v) => !v)}
                            disabled={sending}
                            title="Emojis"
                        >
                            🙂
                        </button>

                        <button
                            type="button"
                            onClick={() => document.getElementById("chat-file")?.click()}
                            disabled={sending}
                            title="Attach file"
                        >
                            📎
                        </button>

                        <button type="button" onClick={() => void onSend()} disabled={sending}>
                            Send
                        </button>
                    </div>

                    {selectedFile && (
                        <div className="chat-attachment-bar">
                            <span>
                                Attached: <strong>{selectedFile.name}</strong> ({Math.ceil(selectedFile.size / 1024)} KB)
                            </span>
                            <button type="button" onClick={() => setSelectedFile(null)} disabled={sending}>
                                Remove
                            </button>
                            <span className="chat-attachment-hint">Max size: 10 MB</span>
                        </div>
                    )}
                </div>
            )}
            {leaveOpen ? (
                <div className="modal-overlay" role="dialog" aria-modal="true">
                    <div className="modal">
                        <h3 className="modal-title">Leave this chat?</h3>
                        <p className="modal-text">
                            You will no longer be able to view this chat. Your messages in this chat will show as sent by a deleted user.
                        </p>

                        <div className="modal-actions">
                            <button type="button" onClick={() => setLeaveOpen(false)} disabled={leaving}>
                                Cancel
                            </button>
                            <button type="button" onClick={() => void onLeaveChatConfirm()} disabled={leaving}>
                                {leaving ? "Leaving..." : "Leave"}
                            </button>
                        </div>
                    </div>
                </div>
            ) : null}
            {participantsOpen && group ? (
                <div className="modal-overlay" role="dialog" aria-modal="true">
                    <div className="modal">
                        <h3 className="modal-title">Participants</h3>

                        <ul className="group-member-list">
                            {group.members
                                .filter((id) => id !== 2) /* ignore self/system */
                                .map((id) => (
                                    <li key={id} className="group-member-row">
                            <span className="group-member-name">
                                {memberLabel(id)}
                                {group.admin === id ? " (admin)" : ""}
                                {id === 1 ? " [deleted]" : ""}
                            </span>
                                    </li>
                                ))}
                        </ul>

                        <div className="modal-actions">
                            <button type="button" onClick={() => setParticipantsOpen(false)}>
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            ) : null}
            {groupSettingsOpen && group ? (
                <div className="modal-overlay" role="dialog" aria-modal="true">
                    <div className="modal modal--wide">
                        <h3 className="modal-title">Group settings</h3>

                        <div className="group-settings-grid">
                            <section className="group-settings-section">
                                <h4 className="group-settings-heading">Name</h4>

                                <div className="group-settings-row">
                                    <input
                                        value={renameDraft}
                                        onChange={(e) => setRenameDraft(e.target.value)}
                                        disabled={!isAdmin || groupBusy}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => void onRenameGroup()}
                                        disabled={!isAdmin || groupBusy}
                                        title={!isAdmin ? "Only admin can rename" : "Rename"}
                                    >
                                        Save
                                    </button>
                                </div>
                            </section>

                            {isAdmin && (
                                <section className="group-settings-section">
                                    <h4 className="group-settings-heading">Add member (contacts only)</h4>

                                    <div className="group-settings-row">
                                        <select
                                            value={addSelectedId}
                                            onChange={(e) => setAddSelectedId(Number(e.target.value))}
                                            disabled={groupBusy}
                                        >
                                            <option value={0}>Select a contact…</option>
                                            {myContacts
                                                .filter((c) => c.userId !== 1 && c.userId !== 2)
                                                .filter((c) => !group.members.includes(c.userId))
                                                .map((c) => (
                                                    <option key={c.userId} value={c.userId}>
                                                        {c.nickname}
                                                    </option>
                                                ))}
                                        </select>

                                        <button type="button" onClick={() => void onAddMember()} disabled={groupBusy}>
                                            Add
                                        </button>

                                    </div>
                                </section>
                            )}

                            <section className="group-settings-section group-settings-section--full">
                                <h4 className="group-settings-heading">Members</h4>

                                <ul className="group-member-list">
                                    {group.members
                                        .filter((id) => id !== 2) /* ignore self/system */
                                        .map((id) => {
                                            const me = userId != null && id === Number(userId);
                                            const canRemove =
                                                (isAdmin && id !== group.admin) || me; // admin can remove non-admin; anyone can remove self
                                            const canMakeAdmin =
                                                isAdmin && id !== 1 && id !== 2 && id !== group.admin;

                                            return (
                                                <li key={id} className="group-member-row">
                                        <span className="group-member-name">
                                            {memberLabel(id)}
                                            {group.admin === id ? " (admin)" : ""}
                                            {id === 1 ? " [deleted]" : ""}
                                        </span>

                                                    <div className="group-member-actions">
                                                        {canMakeAdmin && (
                                                            <button
                                                                type="button"
                                                                onClick={() => void onMakeAdmin(id)}
                                                                disabled={groupBusy}
                                                            >
                                                                Make admin
                                                            </button>
                                                        )}

                                                        {canRemove && (
                                                            <button
                                                                type="button"
                                                                onClick={() => void onRemoveMember(id)}
                                                                disabled={groupBusy}
                                                            >
                                                                {me ? "Leave" : "Remove"}
                                                            </button>
                                                        )}
                                                    </div>
                                                </li>
                                            );
                                        })}
                                </ul>
                            </section>
                        </div>

                        <div className="modal-actions">
                            <button type="button" onClick={() => setGroupSettingsOpen(false)} disabled={groupBusy}>
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            ) : null}
        </main>
    );
}
