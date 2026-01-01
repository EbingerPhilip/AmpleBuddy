import { FormEvent, useId, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../state/AuthContext";

export default function LoginPage() {
    const navigate = useNavigate();
    const { login } = useAuth();

    const usernameId = useId();
    const passwordId = useId();
    const errorId = useId();

    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function onSubmit(e: FormEvent) {
        e.preventDefault();
        setError(null);
        setSubmitting(true);

        try {
            await login(username.trim(), password);
            navigate("/home", { replace: true });
        } catch (err) {
            setError(err instanceof Error ? err.message : "Login failed.");
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <main className="page">
            <h1>AmpleBuddy — Log in</h1>

            <form onSubmit={onSubmit} aria-describedby={error ? errorId : undefined}>
                {error && (
                    <p id={errorId} role="alert" className="error">
                        {error}
                    </p>
                )}

                <div className="form-group">
                    <label htmlFor={usernameId}>E-mail / Username</label>
                    <input
                        id={usernameId}
                        name="username"
                        type="text"
                        autoComplete="username"
                        required
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                    />
                </div>

                <div className="form-group">
                    <label htmlFor={passwordId}>Password</label>
                    <input
                        id={passwordId}
                        name="password"
                        type="password"
                        autoComplete="current-password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                    />
                </div>

                <button type="submit" disabled={submitting}>
                    {submitting ? "Logging in…" : "Log in"}
                </button>

                <p>
                    Don’t have an account? <Link to="/register">Register</Link>
                </p>
            </form>
        </main>
    );
}
