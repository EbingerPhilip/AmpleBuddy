import "../css/global.css";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { FiUser } from "react-icons/fi";
import {
    apiGetContactMoodHistory,
    apiGetContactProfile,
    type ContactPublicProfile,
    type MoodHistoryRow
} from "../services/apiProfile";

function toIsoDateOnly(d: string | null): string {
    if (!d) return "";
    const dt = new Date(d);
    if (Number.isNaN(dt.getTime())) return "";
    return dt.toISOString().slice(0, 10);
}

function computeAge(dateOfBirthIso: string | null): number | null {
    if (!dateOfBirthIso) return null;
    const dob = new Date(dateOfBirthIso);
    if (Number.isNaN(dob.getTime())) return null;

    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const m = today.getMonth() - dob.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
    return age;
}

function isoDayLocal(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
}

function moodToValue(mood: string): number {
    if (mood === "green") return 1;
    if (mood === "red") return -1;
    return 0; // yellow/grey/grey
}

function buildDailySeries(rows: MoodHistoryRow[], daysBack: number) {
    const map = new Map<string, "green" | "yellow" | "red" | "grey">();
    for (const r of rows) map.set(r.date.slice(0, 10), r.mood);

    const end = new Date();
    end.setHours(0, 0, 0, 0);

    const start = new Date(end);
    start.setDate(start.getDate() - (daysBack - 1));

    const out: { date: string; mood: "green" | "yellow" | "red" | "grey"; value: number }[] = [];
    const cur = new Date(start);

    while (cur <= end) {
        const d = isoDayLocal(cur);
        const mood = map.get(d) ?? "grey";
        out.push({ date: d, mood, value: moodToValue(mood) });
        cur.setDate(cur.getDate() + 1);
    }
    return out;
}

function trimRecentGreyStages<T extends { mood: string }>(series: T[]): T[] {
    const thresholds = [64, 48, 32, 16, 8];
    let out = series.slice();

    while (out.length > 0) {
        let streak = 0;
        for (let i = out.length - 1; i >= 0; i--) {
            if (out[i].mood === "grey") streak++;
            else break;
        }
        if (streak < 8) break;

        const stage = thresholds.find((t) => streak >= t);
        if (!stage) break;

        out = out.slice(0, out.length - stage);
    }
    return out;
}

export default function ContactProfilePage() {
    const { userId } = useParams();
    const contactId = Number(userId);

    const [profile, setProfile] = useState<ContactPublicProfile | null>(null);
    const [history, setHistory] = useState<MoodHistoryRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    async function load() {
        try {
            setLoading(true);
            setError(null);

            const p = await apiGetContactProfile(contactId);
            setProfile(p);

            const mh = await apiGetContactMoodHistory(contactId);
            setHistory(mh);
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : "Failed to load contact profile");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        if (!Number.isFinite(contactId) || contactId <= 0) {
            setError("Invalid contact id");
            setLoading(false);
            return;
        }
        void load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [contactId]);

    if (loading) {
        return (
            <main className="profile-page">
                <h1>Contact Profile</h1>
                <p>Loading…</p>
            </main>
        );
    }

    if (error) {
        return (
            <main className="profile-page">
                <h1>Contact Profile</h1>
                <p className="error">{error}</p>
                <button onClick={() => void load()}>Retry</button>
            </main>
        );
    }

    if (!profile) return null;

    const picUrl = profile.profilePicUrl ?? null;

    const hasDob = !!toIsoDateOnly(profile.dateOfBirth);
    const showAge = hasDob && profile.dobHidden === 0;
    const age = showAge ? computeAge(profile.dateOfBirth) : null;

    return (
        <main className="profile-page">
            <h1>{profile.nicknames ?? "Contact"}</h1>

            <div className="profile-grid">
                <div className="profile-main">
                    <section className="profile-header">
                        <div className="profile-picture">
                            {picUrl ? (
                                <img src={picUrl} alt="Profile" className="profile-picture-img" />
                            ) : (
                                <FiUser size={48} aria-label="No profile picture" />
                            )}
                        </div>
                    </section>

                    <section className="profile-section">
                        <h2 className="section-title">Profile</h2>
                        <ul>
                            <li><strong>Current mood:</strong> {profile.dailyMood}</li>
                            <li><strong>Nickname:</strong> {profile.nicknames ?? "—"}</li>
                            <li><strong>Preferred pronouns:</strong> {profile.pronouns === "hidden" ? "prefer not to say" : profile.pronouns}</li>
                            <li><strong>Age:</strong> {showAge ? (age ?? "—") : "Hidden"}</li>
                        </ul>
                    </section>
                </div>

                <div className="profile-side">
                    <section className="profile-section">
                        <h2 className="section-title">Mood history</h2>

                        {(() => {
                            const raw = buildDailySeries(history, 90);
                            const series = trimRecentGreyStages(raw);

                            if (series.length === 0) return <p>No mood history yet.</p>;

                            const w = 300;
                            const h = 180;
                            const padX = 12;
                            const padY = 16;

                            const xStep = (w - padX * 2) / Math.max(1, series.length - 1);

                            const yForValue = (v: number) => {
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
                                    <p className="mood-chart-caption">
                                        Green = 1, Yellow/Grey = 0, Red = -1 (missing days assumed grey).
                                    </p>
                                </div>
                            );
                        })()}
                    </section>
                </div>
            </div>
        </main>
    );
}
