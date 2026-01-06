import { useState } from "react";
import { useAuth } from "../state/AuthContext";
import { useNavigate } from "react-router-dom";

type Mood = "green" | "yellow" | "red" | "gray";

export default function MoodPage() {
  const { userId } = useAuth();
  const navigate = useNavigate();
  const [userIdInput, setUserIdInput] = useState<string>(userId ? String(userId) : "");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function sendMood(mood: Mood) {
    const effectiveUserId = userIdInput.trim();
    if (!effectiveUserId) {
      setError("UserID must be provided.");
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch(`/api/users/${effectiveUserId}/mood`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mood }),
      });
      if (!res.ok) throw new Error(`Request failed: ${res.status}`);
      const data = await res.json();
      setResult(JSON.stringify(data, null, 2));
      navigate("/home"); // Redirect to homepage after logging or skipping
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="page page-wide" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "1rem" }}>
      <h1>Log your mood</h1>
      <p>How are you doing? Green/Red will attempt buddy matching.</p>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "0.9rem",
          padding: "1.25rem 1.5rem",
          background: "#f1f1f1",
          borderRadius: 12,
          boxShadow: "0 4px 10px rgba(0,0,0,0.08)"
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <label htmlFor="userIdInput">UserID:</label>
          <input
            id="userIdInput"
            type="number"
            value={userIdInput}
            onChange={(e) => setUserIdInput(e.target.value)}
            style={{ width: 120, padding: "0.35rem 0.6rem", borderRadius: 8, border: "1px solid #ccc" }}
          />
        </div>

        <button
          onClick={() => sendMood("red")}
          disabled={loading}
          style={{ width: 88, height: 88, borderRadius: "50%", background: "#f28b82", border: "none", color: "#111", fontWeight: 700, cursor: "pointer" }}
        >
          Red
        </button>
        <button
          onClick={() => sendMood("yellow")}
          disabled={loading}
          style={{ width: 88, height: 88, borderRadius: "50%", background: "#fde293", border: "none", color: "#111", fontWeight: 700, cursor: "pointer" }}
        >
          Yellow
        </button>
        <button
          onClick={() => sendMood("green")}
          disabled={loading}
          style={{ width: 88, height: 88, borderRadius: "50%", background: "#9ad2a5", border: "none", color: "#111", fontWeight: 700, cursor: "pointer" }}
        >
          Green
        </button>
        <button
          onClick={() => sendMood("gray")}
          disabled={loading}
          style={{ width: 160, padding: "0.8rem 1rem", borderRadius: 10, background: "#bdbdbd", border: "none", color: "#111", fontWeight: 700, cursor: "pointer" }}
        >
          Skip
        </button>
      </div>

      {loading && <p>Sending…</p>}
      {error && <p role="alert" className="error">{error}</p>}
      {result && <pre>{result}</pre>}
    </section>
  );
}