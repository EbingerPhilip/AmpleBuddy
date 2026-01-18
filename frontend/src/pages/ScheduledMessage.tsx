import {useEffect, useMemo, useState} from "react";
import {
    apiCreateScheduledMessage,
    apiDeleteScheduledMessage,
    apiGetMyScheduledMessages,
    scheduledMessageId,
    type ScheduledMessageRow,
    type ScheduledTrigger,
} from "../services/apiScheduledMessage";

function triggerLabel(t: ScheduledTrigger) {
    if (t === "Red Day") return "Next red mood";
    if (t === "Yellow Day") return "Next yellow mood";
    return "Set date and time";
}

function formatDue(isoOrNull: string | null, trigger: ScheduledTrigger) {
    if (trigger !== "Date") return "—";
    if (!isoOrNull) return "—";
    const d = new Date(isoOrNull);
    if (Number.isNaN(d.getTime())) return isoOrNull;
    return d.toLocaleString();
}

export default function ScheduledMessagePage() {
    const [text, setText] = useState("");
    const [trigger, setTrigger] = useState<ScheduledTrigger>("Red Day");
    const [dueDate, setDueDate] = useState("");
    const [rows, setRows] = useState<ScheduledMessageRow[]>([]);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const canSubmit = useMemo(() => {
        if (!text.trim()) return false;
        if (trigger === "Date") return Boolean(dueDate);
        return true;
    }, [text, trigger, dueDate]);

    async function refresh() {
        const data = await apiGetMyScheduledMessages();
        const sorted = [...data].sort((a, b) => scheduledMessageId(a) - scheduledMessageId(b));
        setRows(sorted);
    }

    useEffect(() => {
        void (async () => {
            try {
                setError(null);
                await refresh();
            } catch (e: unknown) {
                setError(e instanceof Error ? e.message : "Failed to load scheduled messages.");
            }
        })();
    }, []);

    async function onCreate() {
        try {
            setError(null);
            setBusy(true);

            let dueIso: string | null = null;
            if (trigger === "Date") {
                // Schedule for the start of the selected day (local time).
                // We store it as ISO for the backend/DB.
                if (!dueDate) throw new Error("Please select a due date.");
                const [y, m, d] = dueDate.split("-").map((n) => Number(n));
                const localMidnight = new Date(y, (m ?? 1) - 1, d ?? 1, 0, 0, 0, 0);
                if (Number.isNaN(localMidnight.getTime())) throw new Error("Invalid due date.");
                dueIso = localMidnight.toISOString();
            }

            await apiCreateScheduledMessage(text.trim(), trigger, dueIso);

            setText("");
            await refresh();
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : "Failed to create scheduled message.");
        } finally {
            setBusy(false);
        }
    }

    async function onDelete(messageId: number) {
        try {
            setError(null);
            setBusy(true);
            await apiDeleteScheduledMessage(messageId);
            await refresh();
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : "Failed to delete scheduled message.");
        } finally {
            setBusy(false);
        }
    }

    return (
        <section className="page">
            <h1>Scheduled Message</h1>

            {error && (
                <p className="error" role="alert">
                    {error}
                </p>
            )}

            <section className="profile-section">
                <h2 className="section-title">Create a scheduled message</h2>

                <div className="form-grid">
                    <div className="form-group">
                        <label htmlFor="schedText">Message</label>
                        <textarea
                            id="schedText"
                            value={text}
                            onChange={(e) => setText(e.target.value)}
                            rows={4}
                            placeholder="Write a message to your future self…"
                        />
                    </div>

                    <div className="form-group">
                        <label>Trigger</label>

                        <div className="radio-options" role="radiogroup" aria-label="Scheduled message trigger">
                            <label className="radio-option">
                                <input
                                    type="radio"
                                    name="trigger"
                                    value="Red Day"
                                    checked={trigger === "Red Day"}
                                    onChange={() => setTrigger("Red Day")}
                                />
                                Next red mood
                            </label>

                            <label className="radio-option">
                                <input
                                    type="radio"
                                    name="trigger"
                                    value="Yellow Day"
                                    checked={trigger === "Yellow Day"}
                                    onChange={() => setTrigger("Yellow Day")}
                                />
                                Next yellow mood
                            </label>

                            <label className="radio-option">
                                <input
                                    type="radio"
                                    name="trigger"
                                    value="Date"
                                    checked={trigger === "Date"}
                                    onChange={() => setTrigger("Date")}
                                />
                                Set date and time
                            </label>
                        </div>
                    </div>

                    {trigger === "Date" && (
                        <div className="form-group">
                            <label htmlFor="schedDue">Due date</label>
                            <input
                                id="schedDue"
                                type="date"
                                value={dueDate}
                                onChange={(e) => setDueDate(e.target.value)}
                            />
                            <div className="helper-text">
                                Delivered on the selected day by user <strong>2</strong> (“self”) and removed from the
                                schedule.
                            </div>
                        </div>
                    )}

                    <div>
                        <button type="button" onClick={() => void onCreate()} disabled={!canSubmit || busy}>
                            {busy ? "Saving..." : "Schedule message"}
                        </button>
                    </div>
                </div>
            </section>

            <section className="profile-section">
                <h2 className="section-title">Your scheduled messages</h2>

                {rows.length === 0 ? (
                    <p>No scheduled messages.</p>
                ) : (
                    <ul className="chat-list" aria-label="Scheduled messages">
                        {rows.map((r) => {
                            const id = scheduledMessageId(r);
                            const due = formatDue(r.duedate, r.trigger);
                            return (
                                <li key={id} className="chat-item">
                                    <h3 className="chat-title">
                                        {triggerLabel(r.trigger)}
                                    </h3>

                                    <p className="chat-snippet">{r.text}</p>

                                    <p className="muted-label">
                                        ID: {id} • Due: {due}
                                    </p>

                                    <button type="button" onClick={() => void onDelete(id)} disabled={busy}>
                                        Delete
                                    </button>
                                </li>
                            );
                        })}
                    </ul>
                )}
            </section>
        </section>
    );
}
