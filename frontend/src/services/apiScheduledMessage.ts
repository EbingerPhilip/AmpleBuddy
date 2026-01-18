import {authFetch} from "../state/AuthFetch";
import {loadSession} from "../state/AuthStorage";

export type ScheduledTrigger = "Red Day" | "Yellow Day" | "Date";

export type ScheduledMessageRow = {
    messageId?: number;   // backend might return messageid
    messageid?: number;
    userid: number;
    text: string;
    trigger: ScheduledTrigger;
    duedate: string | null;
};

function getMessageId(row: ScheduledMessageRow): number {
    const id = (row.messageId ?? row.messageid);
    if (!id) throw new Error("Scheduled message is missing messageId.");
    return id;
}

export async function apiCreateScheduledMessage(
    text: string,
    trigger: ScheduledTrigger,
    duedateIso: string | null
): Promise<number> {
    const session = loadSession();
    if (!session) throw new Error("Not logged in.");

    const body: any = {
        userId: session.userId,
        text,
        trigger,
    };

    if (trigger === "Date") {
        body.duedate = duedateIso;
    }

    const res = await authFetch("/api/scheduledMessage/new", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify(body),
    });

    if (!res.ok) {
        const ct = res.headers.get("content-type") ?? "";
        if (ct.includes("application/json")) {
            const data = (await res.json().catch(() => null)) as { error?: string };
            throw new Error(data?.error ?? `Failed to create scheduled message (HTTP ${res.status})`);
        }
        const textErr = await res.text().catch(() => "");
        throw new Error(textErr || `Failed to create scheduled message (HTTP ${res.status})`);
    }

    const data = (await res.json()) as { success: boolean; messageId: number };
    return data.messageId;
}

export async function apiGetMyScheduledMessages(): Promise<ScheduledMessageRow[]> {
    const session = loadSession();
    if (!session) throw new Error("Not logged in.");

    const res = await authFetch(`/api/scheduledMessage/user/${session.userId}`);

    if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string };
        throw new Error(data?.error ?? "Failed to load scheduled messages.");
    }

    const payload = (await res.json()) as { success: boolean; data: ScheduledMessageRow[] };
    return payload.data ?? [];
}

export async function apiDeleteScheduledMessage(messageId: number): Promise<void> {
    const res = await authFetch(`/api/scheduledMessage/${messageId}`, {method: "DELETE"});

    if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string };
        throw new Error(data?.error ?? "Failed to delete scheduled message.");
    }
}

export function scheduledMessageId(row: ScheduledMessageRow): number {
    return getMessageId(row);
}
