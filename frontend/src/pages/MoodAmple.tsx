import "../css/global.css";
import {useState} from "react";
import {useNavigate} from "react-router-dom";
import {authFetch} from "../state/AuthFetch";

type Mood = "green" | "yellow" | "red" | "grey";

export default function MoodPage() {
    const navigate = useNavigate();
    const [selectedMood, setSelectedMood] = useState<Mood | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function saveMood() {
        if (!selectedMood) {
            setError("Please select a mood before saving.");
            return;
        }

        setLoading(true);
        setError(null);

        try {
            // Correct endpoint: /api/users/mood (matches backend userRoutes)
            const res = await authFetch(`/api/user/mood`, {
                method: "POST",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify({mood: selectedMood}),
            });

            const body = await res.json().catch(() => null);

            if (!res.ok) {
                throw new Error(body?.error ?? `Request failed: ${res.status}`);
            }

            // Only red/green do buddy matching, and backend returns chatId when matched
            const chatId = typeof body?.chatId === "number" ? body.chatId : null;
            const matched = body?.matched === true;

            if ((selectedMood === "red" || selectedMood === "green") && matched && chatId) {
                navigate(`/chat/${chatId}`);
                return;
            }

            navigate("/home");
        } catch (e) {
            setError(e instanceof Error ? e.message : "Unknown error");
        } finally {
            setLoading(false);
        }
    }

    return (
        <section className="page page-wide mood-page">
            <h1>Log your mood</h1>
            <p>Green/Red will attempt buddy matching.</p>

            <div className="mood-card">
                <button
                    className={`mood-button mood-button--red${selectedMood === "red" ? " is-selected" : ""}`}
                    onClick={() => {
                        setSelectedMood("red");
                        setError(null);
                    }}
                    disabled={loading}
                >
                    Red
                </button>

                <button
                    className={`mood-button mood-button--yellow${selectedMood === "yellow" ? " is-selected" : ""}`}
                    onClick={() => {
                        setSelectedMood("yellow");
                        setError(null);
                    }}
                    disabled={loading}
                >
                    Yellow
                </button>

                <button
                    className={`mood-button mood-button--green${selectedMood === "green" ? " is-selected" : ""}`}
                    onClick={() => {
                        setSelectedMood("green");
                        setError(null);
                    }}
                    disabled={loading}
                >
                    Green
                </button>

                <button
                    className={`mood-button mood-button--grey${selectedMood === "grey" ? " is-selected" : ""}`}
                    onClick={() => {
                        setSelectedMood("grey");
                        setError(null);
                    }}
                    disabled={loading}
                >
                    Grey
                </button>

                <button
                    className="mood-save-button"
                    onClick={() => void saveMood()}
                    disabled={loading}
                >
                    Save
                </button>
            </div>

            {loading && <p>Sending…</p>}
            {error && <p role="alert" className="error">{error}</p>}
        </section>
    );
}
