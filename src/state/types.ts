export interface Segment {
    text: string;
    color: string;
}

export type QuoteBackground = "light" | "dark";

export interface Funko {
    source: "catalog" | "custom";
    title: string;
    handle?: string;
    number?: string;
    series: string[];
    imageUrl?: string;
}

export interface Actor {
    id: string;
    name: string;
    notes?: string;
    links?: string[];
}

export interface Con {
    id: string;
    name: string;
    start?: string;
    end?: string;
    location?: string;
    url?: string;
}

export interface Appearance {
    actorId: string;
    conId: string;
}

export type GoalStatus = "wanted" | "have-funko" | "signed";

export interface Goal {
    id: string;
    funko: Funko;
    actorId?: string;
    character?: string;
    quote: Segment[];
    quoteBackground?: QuoteBackground;
    status: GoalStatus;
    conId?: string;
    notes?: string;
    createdAt: string;
}

export interface AppState {
    version: 1;
    goals: Goal[];
    actors: Actor[];
    cons: Con[];
    appearances: Appearance[];
}

export const GOAL_STATUSES: GoalStatus[] = ["wanted", "have-funko", "signed"];

export const GOAL_STATUS_LABELS: Record<GoalStatus, string> = {
    "wanted": "Need Funko",
    "have-funko": "Ready to sign",
    "signed": "Signed",
};

export function createEmptyState(): AppState {
    return {version: 1, goals: [], actors: [], cons: [], appearances: []};
}

export function createId(): string {
    if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
        return crypto.randomUUID();
    }
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
