import {useEffect, useState} from "react";
import type {MouseEvent as ReactMouseEvent} from "react";
import {FaTrafficLight} from "react-icons/fa";
import {CiCircleQuestion} from "react-icons/ci";
import {Link, useNavigate} from "react-router-dom";
import {FiUser} from "react-icons/fi";
import {
    apiDeleteProfilePic,
    apiDeleteMyAccount,
    apiGetMyProfile,
    apiUpdateMyProfile,
    apiUploadProfilePic,
    apiUpsertMyPreferences,
    apiRetrieveChatLogs,
    type MyProfile,
    type PronounsOption,
    apiGetMoodHistory,
    type MoodHistoryRow
} from "../services/apiProfile";
import {useAuth} from "../state/AuthContext";

function calcAge(dateOfBirth: string | null): number | null {
    const iso = toIsoDateOnly(dateOfBirth);
    if (!iso) return null;

    const parts = iso.split("-");
    if (parts.length !== 3) return null;
    const y = Number(parts[0]);
    const m = Number(parts[1]);
    const d = Number(parts[2]);
    if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return null;

    const today = new Date();
    let age = today.getFullYear() - y;

    const thisYearsBirthday = new Date(today.getFullYear(), m - 1, d);
    if (today < thisYearsBirthday) age -= 1;

    return Number.isFinite(age) && age >= 0 ? age : null;
}

function isoDate(d: Date) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
}

function maxDobIso() {
    const d = new Date();
    d.setFullYear(d.getFullYear() - 18);
    return isoDate(d);
}

function validateDob18(dobIso: string): string | null {
    if (!dobIso.trim()) return "Please select a date of birth.";

    const dob = new Date(`${dobIso}T00:00:00`);
    if (Number.isNaN(dob.getTime())) return "Please enter a valid date of birth.";

    const todayIso = isoDate(new Date());

    if (dobIso > todayIso) return "Date of birth cannot be in the future.";
    if (dobIso > maxDobIso()) return "You must be at least 18 years old.";

    return null;
}

function HelpTooltip({text}: { text: string }) {
    const [open, setOpen] = useState(false);
    const [pos, setPos] = useState({x: 0, y: 0});

    function onMove(e: ReactMouseEvent<HTMLElement>) {
        const pad = 12;
        const maxW = 340;
        const maxH = 140;

        // Always bias to the right of cursor to avoid the left sidebar.
        let x = e.clientX + pad;
        let y = e.clientY + pad;

        x = Math.min(x, window.innerWidth - maxW);
        y = Math.min(y, window.innerHeight - maxH);

        setPos({x, y});
    }

    return (
        <span
            className="help-icon"
            onMouseEnter={(e) => {
                setOpen(true);
                onMove(e);
            }}
            onMouseMove={onMove}
            onMouseLeave={() => setOpen(false)}
            aria-label="Help"
        >
            <CiCircleQuestion/>
            {open ? (
                <span className="tooltip-float" role="tooltip" style={{left: pos.x, top: pos.y}}>
                    {text}
                </span>
            ) : null}
        </span>
    );
}

function toIsoDateOnly(d: string | null): string {
    if (!d) return "";
    // backend may send Date or string; handle both
    const dt = new Date(d);
    if (Number.isNaN(dt.getTime())) return "";
    return dt.toISOString().slice(0, 10);
}

export default function ViewProfilePage() {
    const [profile, setProfile] = useState<MyProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [email, setEmail] = useState("");
    const [nickname, setNickname] = useState("");
    const [theme, setTheme] = useState<"light" | "dark" | "colourblind">("light");
    const [pronouns, setPronouns] = useState<PronounsOption>("prefer not to say");
    const [dobHidden, setDobHidden] = useState(false);
    const [instantBuddy, setInstantBuddy] = useState(true);
    const {logout} = useAuth();
    const navigate = useNavigate();

    // only if DOB missing
    const [dobToSet, setDobToSet] = useState(""); // YYYY-MM-DD

    const [picBust, setPicBust] = useState(0);
    const [moodHistory, setMoodHistory] = useState<MoodHistoryRow[]>([]);
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [deletePassword, setDeletePassword] = useState("");
    const [deleteBusy, setDeleteBusy] = useState(false);

    const [prefGender, setPrefGender] = useState<string>(""); // "" = no preference
    const [prefAgeMin, setPrefAgeMin] = useState<string>("");
    const [prefAgeMax, setPrefAgeMax] = useState<string>("");
    const [prefMinGreen, setPrefMinGreen] = useState<string>("");
    const [prefSaving, setPrefSaving] = useState(false);

    const [logsBusy, setLogsBusy] = useState(false);

    async function load() {
        try {
            setLoading(true);
            setError(null);
            const p = await apiGetMyProfile();
            setProfile(p);

            const prefs = p.preferences;
            setPrefGender(prefs?.gender ?? "");
            setPrefAgeMin(prefs?.ageMin != null ? String(prefs.ageMin) : "");
            setPrefAgeMax(prefs?.ageMax != null ? String(prefs.ageMax) : "");
            setPrefMinGreen(prefs?.minGreen != null ? String(prefs.minGreen) : "");

            const mh = await apiGetMoodHistory();
            setMoodHistory(mh);


            setEmail(p.username ?? "");
            setNickname(p.nicknames ?? "");

            setTheme(p.theme);
            const pPron = (p.pronouns ?? "hidden");
            setPronouns(pPron === "hidden" ? "prefer not to say" : (pPron as PronounsOption));

            setDobHidden(p.dobHidden === 1);
            setInstantBuddy(p.instantBuddy === 1);

        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : "Failed to load profile");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        void load();
    }, []);

    async function onSave() {
        if (!profile) return;
        try {
            setError(null);

            const updates: {
                nicknames?: string;
                pronouns?: PronounsOption;
                dateOfBirth?: string;
                dobHidden?: boolean;
                instantBuddy?: boolean;
                theme?: "light" | "dark" | "colourblind";
            } = {
                nicknames: nickname,
                theme,
                pronouns,
                dobHidden,
                instantBuddy,
            };

            const hasDob = !!toIsoDateOnly(profile.dateOfBirth);
            if (!hasDob && dobToSet) {
                const dobErr = validateDob18(dobToSet);
                if (dobErr) {
                    setError(dobErr);
                    return;
                }
                updates.dateOfBirth = dobToSet;
            }


            await apiUpdateMyProfile(updates);
            document.documentElement.dataset.theme = theme;
            await load();


        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : "Failed to save");
        }
    }

    async function onSavePreferences() {
        try {
            if (!profile) return;

            setError(null);
            setPrefSaving(true);

            const ageMin = prefAgeMin.trim() ? Number(prefAgeMin) : null;
            const ageMax = prefAgeMax.trim() ? Number(prefAgeMax) : null;
            const minGreen = prefMinGreen.trim() ? Number(prefMinGreen) : null;

            if (ageMin != null && (!Number.isFinite(ageMin) || ageMin < 0)) {
                setError("Minimum age must be a valid number.");
                return;
            }
            if (ageMax != null && (!Number.isFinite(ageMax) || ageMax < 0)) {
                setError("Maximum age must be a valid number.");
                return;
            }
            if (ageMin != null && ageMax != null && ageMin > ageMax) {
                setError("Minimum age cannot be greater than maximum age.");
                return;
            }
            if (minGreen != null && (!Number.isFinite(minGreen) || minGreen < 0)) {
                setError("Minimum green states must be a valid number.");
                return;
            }

            const gender =
                prefGender.trim() === "" ? null : (prefGender as "male" | "female" | "other" | "hidden");

            await apiUpsertMyPreferences(profile.userid, {
                gender,
                ageMin,
                ageMax,
                minGreen,
            });

            await load();
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : "Failed to save preferences");
        } finally {
            setPrefSaving(false);
        }
    }

    async function onUploadPic(file: File) {
        try {
            setError(null);
            await apiUploadProfilePic(file);
            setPicBust((x) => x + 1);
            await load();
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : "Failed to upload picture");
        }
    }

    function moodToValue(mood: string): number {
        // grey and yellow = 0, green = 1, red = -1
        if (mood === "green") return 1;
        if (mood === "red") return -1;
        return 0;
    }

    function isoDay(d: Date): string {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, "0");
        const day = String(d.getDate()).padStart(2, "0");
        return `${y}-${m}-${day}`;
    }

    function buildDailySeries(rows: MoodHistoryRow[], daysBack: number): {
        date: string;
        mood: "green" | "yellow" | "red" | "grey";
        value: number
    }[] {
        const map = new Map<string, "green" | "yellow" | "red" | "grey">();
        for (const r of rows) {
            const key = r.date.slice(0, 10);
            map.set(key, r.mood);
        }
        const end = new Date();
        end.setHours(0, 0, 0, 0);

        const start = new Date(end);
        start.setDate(start.getDate() - (daysBack - 1));

        const out: { date: string; mood: "green" | "yellow" | "red" | "grey"; value: number }[] = [];
        const cur = new Date(start);

        while (cur <= end) {
            const d = isoDay(cur);
            const mood = map.get(d) ?? "grey"; // not logged => grey
            out.push({date: d, mood, value: moodToValue(mood)});
            cur.setDate(cur.getDate() + 1);
        }

        return out;
    }

    function trimRecentGreyStages<T extends { mood: string }>(series: T[]): T[] {
        const thresholds = [64, 48, 32, 16, 8];

        let out = series.slice();

        while (out.length > 0) {
            // Count trailing grey days
            let streak = 0;
            for (let i = out.length - 1; i >= 0; i--) {
                if (out[i].mood === "grey") streak++;
                else break;
            }

            if (streak < 8) break;

            // Remove the largest "stage" we can
            const stage = thresholds.find((t) => streak >= t);
            if (!stage) break;

            out = out.slice(0, out.length - stage);
        }

        return out;
    }

    async function onDeletePic() {
        try {
            setError(null);
            await apiDeleteProfilePic();
            setPicBust((x) => x + 1);
            await load();
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : "Failed to delete picture");
        }
    }

    async function onDeleteAccountConfirm() {
        try {
            setError(null);
            setDeleteBusy(true);
            await apiDeleteMyAccount(deletePassword);
            logout();
            navigate("/login", {replace: true});
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : "Failed to delete account");
        } finally {
            setDeleteBusy(false);
            setDeleteOpen(false);
            setDeletePassword("");
        }
    }

    async function onRetrieveChatLogs() {
        try {
            setError(null);
            setLogsBusy(true);
            await apiRetrieveChatLogs();
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : "Failed to retrieve chat logs");
        } finally {
            setLogsBusy(false);
        }
    }

    if (loading) {
        return (
            <main className="profile-page">
                <h1>Profile</h1>
                <p>Loading…</p>
            </main>
        );
    }

    if (error) {
        return (
            <main className="profile-page">
                <h1>Profile</h1>
                <p className="error">{error}</p>
                <button onClick={() => void load()}>Retry</button>
            </main>
        );
    }

    if (!profile) return null;

    const picUrl = profile.profilePicUrl
        ? `${profile.profilePicUrl}?v=${picBust}`
        : null;

    const hasDob = !!toIsoDateOnly(profile.dateOfBirth);
    const age = calcAge(profile.dateOfBirth);

    return (
        <main className="profile-page">
            <h1>Profile</h1>
            <div className="profile-grid">
                <div className="profile-main">
                    {/* Profile picture */}
                    <section className="profile-header">
                        <div className="profile-picture">
                            {picUrl ? (
                                <img
                                    src={picUrl}
                                    alt="Profile"
                                    className="profile-picture-img"
                                    onError={() => {
                                        // fallback if image missing
                                        setProfile((p) => {
                                            if (!p) return p;
                                            return {...p, profilePicUrl: null, hasProfilePic: false};
                                        });
                                    }}
                                />
                            ) : (
                                <FiUser size={48} aria-label="No profile picture"/>
                            )}
                        </div>

                        <div>
                            <div className="profile-picture-actions">
                                <label>
                                    <span className="form-label">Change picture</span>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={(e) => {
                                            const f = e.target.files?.[0];
                                            if (f) void onUploadPic(f);
                                            e.currentTarget.value = "";
                                        }}
                                    />
                                </label>

                                <button type="button" onClick={() => void onDeletePic()}
                                        disabled={!profile.hasProfilePic}>
                                    Delete picture
                                </button>
                            </div>
                        </div>
                    </section>


                    {/* View-only fields */}
                    <section className="profile-section">
                        <h2 className="section-title">Current settings</h2>
                        <ul>
                            {/* Adds a link to the mood setting page if mood is set to grey */}
                            <li>
                                <strong>Current mood:</strong>{" "}
                                {profile.dailyMood === "grey" || profile.dailyMood === "grey" ? (
                                    <Link
                                        to="/mood"
                                        title="Set your daily mood"
                                    >
                                        <FaTrafficLight aria-label="Set mood"/>
                                        <span>Set mood</span>
                                    </Link>
                                ) : (
                                    profile.dailyMood
                                )}
                            </li>

                            <li><strong>Theme:</strong> {profile.theme}</li>
                            <li><strong>Buddy Matching?:</strong> {profile.instantBuddy === 1 ? "On" : "Off"}</li>
                        </ul>
                    </section>

                    {/* Buddy preferences */}
                    <section className="profile-section">
                        <h2 className="section-title">Buddy preferences</h2>

                        <div className="form-group">
                            <span className="form-label">Preferred gender</span>
                            <select value={prefGender} onChange={(e) => setPrefGender(e.target.value)}
                                    disabled={prefSaving}>
                                <option value="">No preference</option>
                                <option value="male">Male</option>
                                <option value="female">Female</option>
                                <option value="other">Other</option>
                                <option value="hidden">Hidden</option>
                            </select>
                        </div>

                        <div className="form-group">
                            <span className="form-label">Preferred age range</span>
                            <div className="profile-inline-row">
                                <input
                                    inputMode="numeric"
                                    placeholder="Min"
                                    value={prefAgeMin}
                                    onChange={(e) => setPrefAgeMin(e.target.value)}
                                    disabled={prefSaving}
                                />
                                <input
                                    inputMode="numeric"
                                    placeholder="Max"
                                    value={prefAgeMax}
                                    onChange={(e) => setPrefAgeMax(e.target.value)}
                                    disabled={prefSaving}
                                />
                            </div>
                        </div>

                        <div className="form-group">
                            <span className="form-label">Minimum recorded green states</span>
                            <input
                                inputMode="numeric"
                                placeholder="e.g. 3"
                                value={prefMinGreen}
                                onChange={(e) => setPrefMinGreen(e.target.value)}
                                disabled={prefSaving}
                            />
                        </div>

                        <button type="button" onClick={() => void onSavePreferences()} disabled={prefSaving}>
                            {prefSaving ? "Saving..." : "Save preferences"}
                        </button>
                    </section>
                </div>
                <div className="profile-side">
                    <section className="profile-section">
                        <h2 className="section-title">Previous moods</h2>

                        {(() => {
                            const raw = buildDailySeries(moodHistory, 90); // last 90 days
                            const series = trimRecentGreyStages(raw);

                            if (series.length === 0) {
                                return <p>No mood history yet.</p>;
                            }
                            const w = 300;  // viewBox width
                            const h = 180;  // viewBox height
                            const padX = 12;
                            const padY = 16;

                            const xStep = (w - padX * 2) / Math.max(1, series.length - 1);
                            const yForValue = (v: number) => {
                                // map -1..1 into chart area (top=1, middle=0, bottom=-1)
                                const top = padY;
                                const mid = h / 2;
                                const bottom = h - padY;
                                if (v === 1) return top;
                                if (v === -1) return bottom;
                                return mid;
                            };

                            const path = series
                                .map((p, i) => {
                                    const x = padX + i * xStep;
                                    const y = yForValue(p.value);
                                    return `${i === 0 ? "M" : "L"} ${x} ${y}`;
                                })
                                .join(" ");

                            const clsForMood = (m: string) => {
                                if (m === "green") return "mood-dot--green";
                                if (m === "yellow") return "mood-dot--yellow";
                                if (m === "red") return "mood-dot--red";
                                return "mood-dot--grey";
                            };

                            return (
                                <div className="mood-chart">
                                    <svg viewBox={`0 0 ${w} ${h}`} width="100%" height="200" role="img"
                                         aria-label="Mood history chart">
                                        <path d={path} className="mood-line"/>

                                        {series.map((p, i) => {
                                            const x = padX + i * xStep;
                                            const y = yForValue(p.value);
                                            return (
                                                <g key={p.date} className="mood-point">
                                                    <circle cx={x} cy={y} r={10} className="mood-hit">
                                                        <title>{`${p.date}: ${p.mood}`}</title>
                                                    </circle>
                                                    <circle cx={x} cy={y} r={4} className={clsForMood(p.mood)}/>
                                                </g>
                                            );
                                        })}
                                    </svg>
                                    <p style={{margin: "0.5rem 0 0 0", fontSize: "0.85rem"}}>
                                        Green = 1, Yellow/grey = 0, Red = -1 (missing days assumed grey).
                                    </p>
                                </div>
                            );
                        })()}
                    </section>
                </div>
            </div>


            {/* Editable profile */}
            <section>
                <h2 className="section-title">Edit profile</h2>

                <div className="form-grid">
                    <label className="form-group">
                        <span className="form-label">E-mail</span>
                        <input value={email} readOnly disabled/>
                    </label>

                    <label>
                        <span className="form-label">Nickname</span>
                        <input
                            value={nickname}
                            onChange={(e) => setNickname(e.target.value)}
                            style={{width: "100%"}}
                        />
                    </label>
                    <div className="profile-identity">
                        <div className="profile-age">
                            {age !== null ? `Age: ${age}` : "Age: not set"}
                        </div>
                    </div>


                    <label className="form-group">
                        <span className="form-label">Theme</span>
                        <select value={theme}
                                onChange={(e) => setTheme(e.target.value as "light" | "dark" | "colourblind")}>
                            <option value="light">light</option>
                            <option value="dark">dark</option>
                            <option value="colourblind">colourblind</option>
                        </select>
                    </label>

                    <label>
                        <span className="form-label">Preferred pronouns</span>
                        <select
                            value={pronouns}
                            onChange={(e) => setPronouns(e.target.value as PronounsOption)}
                        >
                            <option value="she/her">she/her</option>
                            <option value="he/him">he/him</option>
                            <option value="they/them">they/them</option>
                            <option value="prefer not to say">prefer not to say</option>
                        </select>
                    </label>

                    <div>
                        <div style={{fontSize: 12}}>Age</div>
                        {hasDob ? (
                            <div className="toggle-row">
                                <div className="switch-row">
                                    <span className="switch-label">Hide age?</span>
                                    <label className="switch" aria-label="Hide age">
                                        <input
                                            type="checkbox"
                                            checked={dobHidden}
                                            onChange={(e) => setDobHidden(e.target.checked)}
                                        />
                                        <span className="switch-track" aria-hidden="true">
                                            <span className="switch-thumb"/>
                                        </span>
                                    </label>
                                    <span className="switch-state">{dobHidden ? "True" : "False"}</span>
                                    <HelpTooltip text="If enabled, your age will be hidden from other users."/>
                                </div>
                            </div>
                        ) : (
                            <label>
                                <span className="form-label">Set date of birth (only once)</span>
                                <input
                                    type="date"
                                    value={dobToSet}
                                    max={maxDobIso()}
                                    onChange={(e) => setDobToSet(e.target.value)}
                                />
                            </label>
                        )}
                    </div>
                    <div className="toggle-row">
                        <div className="switch-row">
                            <span className="switch-label">Buddy Matching?</span>
                            <label className="switch" aria-label="Buddy Matching?">
                                <input
                                    type="checkbox"
                                    checked={instantBuddy}
                                    onChange={(e) => setInstantBuddy(e.target.checked)}
                                />
                                <span className="switch-track" aria-hidden="true">
                                    <span className="switch-thumb"/>
                                </span>
                            </label>
                            <span className="switch-state">{instantBuddy ? "True" : "False"}</span>
                            <HelpTooltip
                                text="Turning Buddy Matching off cancels the feature of matching you with a Buddy as soon as you set your daily mood, as long as that mood is set to Red or Green."/>
                        </div>
                    </div>

                    <button type="button" onClick={() => void onSave()}>
                        Save changes
                    </button>
                </div>
            </section>

            {/* Chat logs export */}
            <section className="profile-section" style={{marginTop: "1.5rem"}}>
                <h2 className="section-title">Chat logs</h2>
                <p style={{marginTop: 0}}>
                    Download a TXT file of all messages across chats you are currently in.
                </p>
                <button type="button" onClick={() => void onRetrieveChatLogs()} disabled={logsBusy}>
                    {logsBusy ? "Preparing..." : "Retrieve Chat Logs"}
                </button>
            </section>

            {/* Danger zone */}
            <section className="profile-section" style={{marginTop: "1.5rem"}}>
                <h2 className="section-title">Danger zone</h2>
                <p style={{marginTop: 0}}>
                    Deleting your account is permanent. Your messages will remain, but your user will show as [deleted].
                </p>
                <button
                    type="button"
                    onClick={() => setDeleteOpen(true)}
                    style={{border: "1px solid currentColor"}}
                >
                    Delete account
                </button>
            </section>

            {deleteOpen ? (
                <div
                    role="dialog"
                    aria-modal="true"
                    style={{
                        position: "fixed",
                        inset: 0,
                        background: "rgba(0,0,0,0.5)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        padding: "1rem",
                        zIndex: 2000,
                    }}
                >
                    <div
                        style={{
                            background: "var(--panel-bg, white)",
                            padding: "1rem",
                            borderRadius: "12px",
                            width: "min(420px, 100%)",
                        }}
                    >
                        <h3 style={{marginTop: 0}}>Confirm account deletion</h3>
                        <p style={{marginTop: 0}}>
                            Please enter your password to delete your account.
                        </p>

                        <label className="form-group" style={{width: "100%"}}>
                            <span className="form-label">Password</span>
                            <input
                                type="password"
                                value={deletePassword}
                                onChange={(e) => setDeletePassword(e.target.value)}
                                style={{width: "100%"}}
                                autoFocus
                            />
                        </label>

                        <div style={{display: "flex", gap: "0.5rem", justifyContent: "flex-end"}}>
                            <button
                                type="button"
                                onClick={() => {
                                    setDeleteOpen(false);
                                    setDeletePassword("");
                                }}
                                disabled={deleteBusy}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={() => void onDeleteAccountConfirm()}
                                disabled={deleteBusy || deletePassword.trim().length === 0}
                            >
                                {deleteBusy ? "Deleting..." : "Delete"}
                            </button>
                        </div>
                    </div>
                </div>
            ) : null}

        </main>
    );
}
