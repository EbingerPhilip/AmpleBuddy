import { useEffect, useState } from "react";
import { FaTrafficLight } from "react-icons/fa";
import { CiCircleQuestion } from "react-icons/ci";
import { Link } from "react-router-dom";
import { FiUser } from "react-icons/fi";
import {
    apiDeleteProfilePic,
    apiGetMyProfile,
    apiUpdateMyProfile,
    apiUploadProfilePic,
    type MyProfile,
    type PronounsOption,
    apiGetMoodHistory,
    type MoodHistoryRow
} from "../services/apiProfile";


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

    // editable fields
    const [email, setEmail] = useState("");
    const [nickname, setNickname] = useState("");
    const [theme, setTheme] = useState<"light" | "dark" | "colourblind">("light");
    const [pronouns, setPronouns] = useState<PronounsOption>("prefer not to say");
    const [dobHidden, setDobHidden] = useState(false);
    const [instantBuddy, setInstantBuddy] = useState(true);

    // only if DOB missing
    const [dobToSet, setDobToSet] = useState(""); // YYYY-MM-DD

    const [picBust, setPicBust] = useState(0);
    const [moodHistory, setMoodHistory] = useState<MoodHistoryRow[]>([]);

    async function load() {
        try {
            setLoading(true);
            setError(null);
            const p = await apiGetMyProfile();
            setProfile(p);

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
            setError(e instanceof Error ? e.message :  "Failed to load profile");
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
                dobHidden?: 0 | 1;
                instantBuddy?: 0 | 1;
                theme?: "light" | "dark" | "colourblind";
            } = {
                nicknames: nickname,
                theme,
                pronouns,
                dobHidden: dobHidden ? 1 : 0,
                instantBuddy: instantBuddy ? 1 : 0,
            };


            // allow setting DOB only if not present yet
            const hasDob = !!toIsoDateOnly(profile.dateOfBirth);
            if (!hasDob && dobToSet) updates.dateOfBirth = dobToSet;

            await apiUpdateMyProfile(updates);
            await load();

        } catch (e: unknown) {
            setError(e instanceof Error ? e.message :  "Failed to save");
        }
    }

    async function onUploadPic(file: File) {
        try {
            setError(null);
            await apiUploadProfilePic(file);
            setPicBust((x) => x + 1);
            await load();
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message :  "Failed to upload picture");
        }
    }

    function moodToValue(mood: string): number {
        // gray and yellow = 0, green = 1, red = -1
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



    function buildDailySeries(rows: MoodHistoryRow[], daysBack: number): { date: string; mood: "green" | "yellow" | "red" | "gray"; value: number }[] {
        const map = new Map<string, "green" | "yellow" | "red" | "gray">();
        for (const r of rows) {
            const key = r.date.slice(0, 10);
            map.set(key, r.mood);
        }


        const end = new Date();
        end.setHours(0, 0, 0, 0);

        const start = new Date(end);
        start.setDate(start.getDate() - (daysBack - 1));

        const out: { date: string; mood: "green" | "yellow" | "red" | "gray"; value: number }[] = [];
        const cur = new Date(start);

        while (cur <= end) {
            const d = isoDay(cur);
            const mood = map.get(d) ?? "gray"; // not logged => gray
            out.push({ date: d, mood, value: moodToValue(mood) });
            cur.setDate(cur.getDate() + 1);
        }

        return out;
    }

    function trimRecentGrayStages<T extends { mood: string }>(series: T[]): T[] {
        const thresholds = [64, 48, 32, 16, 8];

        let out = series.slice();

        while (out.length > 0) {
            // Count trailing gray days
            let streak = 0;
            for (let i = out.length - 1; i >= 0; i--) {
                if (out[i].mood === "gray") streak++;
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
            setError(e instanceof Error ? e.message :  "Failed to delete picture");
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
                <p style={{ color: "crimson" }}>{error}</p>
                <button onClick={() => void load()}>Retry</button>
            </main>
        );
    }

    if (!profile) return null;

    const picUrl = profile.profilePicUrl
        ? `${profile.profilePicUrl}?v=${picBust}`
        : null;

    const hasDob = !!toIsoDateOnly(profile.dateOfBirth);

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
                                            return { ...p, profilePicUrl: null, hasProfilePic: false };
                                        });
                                    }}
                                />
                            ) : (
                                <FiUser size={48} aria-label="No profile picture" />
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

                                <button type="button" onClick={() => void onDeletePic()} disabled={!profile.hasProfilePic}>
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
                                {profile.dailyMood === "gray" || profile.dailyMood === "grey" ? (
                                    <Link
                                        to="/mood"
                                        title="Set your daily mood"
                                    >
                                        <FaTrafficLight aria-label="Set mood" />
                                        <span>Set mood</span>
                                    </Link>
                                ) : (
                                    profile.dailyMood
                                )}
                            </li>

                            <li><strong>Theme:</strong> {profile.theme}</li>
                            <li><strong>InstantBuddy:</strong> {profile.instantBuddy === 1 ? "On" : "Off"}</li>
                        </ul>
                    </section>

                    {/* Buddy preferences (read-only here) */}
                    <section className="profile-section">
                        <h2 className="section-title">Buddy preferences</h2>
                        {profile.preferences ? (
                            <ul>
                                <li><strong>Preferred gender:</strong> {profile.preferences.gender ?? "—"}</li>
                                <li><strong>Preferred age:</strong> {profile.preferences.age ?? "—"}</li>
                                <li><strong>Min green requirement:</strong> {profile.preferences.minGreen ?? "—"}</li>
                            </ul>
                        ) : (
                            <p>Not set.</p>
                        )}
                    </section>

                    {/* Mood history (not implemented in backend DB yet) */}
                </div>
                <div className="profile-side">
                    <section className="profile-section">
                        <h2 className="section-title">Previous moods</h2>

                        {(() => {
                            const raw = buildDailySeries(moodHistory, 90); // last 90 days
                            const series = trimRecentGrayStages(raw);

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
                                return "mood-dot--gray";
                            };

                            return (
                                <div className="mood-chart">
                                    <svg viewBox={`0 0 ${w} ${h}`} width="100%" height="200" role="img" aria-label="Mood history chart">
                                        <path d={path} className="mood-line" />

                                        {series.map((p, i) => {
                                            const x = padX + i * xStep;
                                            const y = yForValue(p.value);
                                            return (
                                                <g key={p.date} className="mood-point">
                                                    <circle cx={x} cy={y} r={10} className="mood-hit">
                                                        <title>{`${p.date}: ${p.mood}`}</title>
                                                    </circle>
                                                    <circle cx={x} cy={y} r={4} className={clsForMood(p.mood)} />
                                                </g>
                                            );
                                        })}
                                    </svg>
                                    <p style={{ margin: "0.5rem 0 0 0", fontSize: "0.85rem" }}>
                                        Green = 1, Yellow/Gray = 0, Red = -1 (missing days assumed gray).
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
                        <input value={email} readOnly disabled />
                    </label>

                    <label>
                        <span className="form-label">Nickname</span>
                        <input
                            value={nickname}
                            onChange={(e) => setNickname(e.target.value)}
                            style={{ width: "100%" }}
                        />
                    </label>

                    <label className="form-group">
                        <span className="form-label">Theme</span>
                        <select value={theme} onChange={(e) => setTheme(e.target.value as "light" | "dark" | "colourblind")}>
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
                        <div style={{ fontSize: 12 }}>Age</div>
                        {hasDob ? (
                            <div className="toggle-row">
                                <label className="toggle">
                                    <input
                                        type="checkbox"
                                        checked={dobHidden}
                                        onChange={(e) => setDobHidden(e.target.checked)}
                                    />
                                    Hide Age?
                                    <span
                                        className="help-icon"
                                        data-tooltip="If enabled, your age will be hidden from other users."
                                        aria-label="Help"
                                    >
                                        <CiCircleQuestion />
                                    </span>
                                </label>
                            </div>

                        ) : (
                            <label>
                                <span className="form-label">Set date of birth (only once)</span>
                                <input
                                    type="date"
                                    value={dobToSet}
                                    onChange={(e) => setDobToSet(e.target.value)}
                                />
                            </label>
                        )}
                    </div>
                    <div className="toggle-row">
                        <label className="toggle">
                            <input
                                type="checkbox"
                                checked={instantBuddy}
                                onChange={(e) => setInstantBuddy(e.target.checked)}
                            />
                            <span>
                                  instantBuddy
                                <span
                                    className="help-icon"
                                    data-tooltip="Turning instantBuddy off cancels the feature of matching the user with a Buddy as soon as you set your daily mood."
                                    aria-label="Help"
                                >
                                    <CiCircleQuestion />
                                </span>
                            </span>
                        </label>
                    </div>
                    <button type="button" onClick={() => void onSave()}>
                        Save changes
                    </button>
                </div>
            </section>
        </main>
    );
}
