import { FormEvent, useId, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiRegister } from "../services/apiClient";

type Pronouns = "she/her" | "he/him" | "they/them" | "prefer not to say";

export default function RegisterPage() {
    const navigate = useNavigate();

    const emailId = useId();
    const pwId = useId();
    const pw2Id = useId();
    const nickId = useId();
    const dobId = useId();
    const pronounsId = useId();
    const errorId = useId();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [password2, setPassword2] = useState("");
    const [nickname, setNickname] = useState("");
    const [dateOfBirth, setDateOfBirth] = useState(""); // optional
    const [pronouns, setPronouns] = useState<Pronouns | "">("");

    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    function isValidEmail(v: string) {
        // Simple check; backend must still validate
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
    }

    async function onSubmit(e: FormEvent) {
        e.preventDefault();
        setError(null);

        const eTrim = email.trim();
        const nTrim = nickname.trim();

        if (!isValidEmail(eTrim)) {
            setError("Please enter a valid e-mail address.");
            return;
        }
        if (password.length < 6) {
            setError("Password must be at least 6 characters.");
            return;
        }
        if (password !== password2) {
            setError("Passwords do not match.");
            return;
        }
        if (!nTrim) {
            setError("Please enter a nickname.");
            return;
        }

        setSubmitting(true);
        try {
            await apiRegister({
                email: eTrim,
                password,
                nickname: nTrim,
                dateOfBirth: dateOfBirth.trim() ? dateOfBirth.trim() : undefined,
                pronouns: pronouns ? (pronouns as Pronouns) : undefined,
            });

            navigate("/login", { replace: true });
        } catch (err) {
            setError(err instanceof Error ? err.message : "Registration failed.");
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <main className="page">
            <h1>Register</h1>

            <form onSubmit={onSubmit} aria-describedby={error ? errorId : undefined}>
                {error && (
                    <p id={errorId} role="alert" className="error">
                        {error}
                    </p>
                )}

                <div className="form-group">
                    <label htmlFor={emailId}>E-mail</label>
                    <input
                        id={emailId}
                        name="email"
                        type="email"
                        autoComplete="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                    />
                </div>

                <div className="form-group">
                    <label htmlFor={pwId}>Password</label>
                    <input
                        id={pwId}
                        name="password"
                        type="password"
                        autoComplete="new-password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                    />
                </div>

                <div className="form-group">
                    <label htmlFor={pw2Id}>Repeat password</label>
                    <input
                        id={pw2Id}
                        name="password2"
                        type="password"
                        autoComplete="new-password"
                        required
                        value={password2}
                        onChange={(e) => setPassword2(e.target.value)}
                    />
                </div>

                <div className="form-group">
                    <label htmlFor={nickId}>Nickname</label>
                    <input
                        id={nickId}
                        name="nickname"
                        type="text"
                        required
                        value={nickname}
                        onChange={(e) => setNickname(e.target.value)}
                    />
                </div>

                <div className="form-group">
                    <label htmlFor={dobId}>Date of birth (optional)</label>
                    <input
                        id={dobId}
                        name="dob"
                        type="date"
                        value={dateOfBirth}
                        onChange={(e) => setDateOfBirth(e.target.value)}
                    />
                </div>

                <div className="form-group">
                    <label htmlFor={pronounsId}>Preferred pronouns (optional)</label>
                    <select
                        id={pronounsId}
                        name="pronouns"
                        value={pronouns}
                        onChange={(e) => setPronouns(e.target.value as Pronouns | "")}
                    >
                        <option value="">— Select —</option>
                        <option value="she/her">she/her</option>
                        <option value="he/him">he/him</option>
                        <option value="they/them">they/them</option>
                        <option value="prefer not to say">prefer not to say</option>
                    </select>
                </div>

                <button type="submit" disabled={submitting}>
                    {submitting ? "Registering…" : "Register"}
                </button>

                <p style={{ marginTop: "1rem" }}>
                    Already have an account? <Link to="/login">Log in</Link>
                </p>
            </form>
        </main>
    );
}
