import {type AppState, createEmptyState} from "./types";

const STORAGE_KEY = "funko-signings:v1";

export type SaveResult =
    | {status: "saved"}
    | {status: "quota-exceeded"}
    | {status: "failed"};

function isQuotaError(error: unknown): boolean {
    if (!(error instanceof DOMException)) {
        return false;
    }
    return (
        error.name === "QuotaExceededError" ||
        error.name === "NS_ERROR_DOM_QUOTA_REACHED" ||
        error.code === 22
    );
}

export function parseState(json: string): AppState {
    const parsed: unknown = JSON.parse(json);
    const invalid = new Error("That file isn't a Funko Signings backup.");
    if (typeof parsed !== "object" || parsed === null) {
        throw invalid;
    }
    const candidate = parsed as Partial<AppState>;
    if (candidate.version !== 1 || !Array.isArray(candidate.goals) || !Array.isArray(candidate.actors) ||
        !Array.isArray(candidate.cons) || !Array.isArray(candidate.appearances)) {
        throw invalid;
    }
    return {
        version: 1,
        goals: candidate.goals,
        actors: candidate.actors,
        cons: candidate.cons,
        appearances: candidate.appearances,
    };
}

export function loadState(): AppState {
    try {
        const json = window.localStorage.getItem(STORAGE_KEY);
        if (json === null) {
            return createEmptyState();
        }
        return parseState(json);
    } catch {
        return createEmptyState();
    }
}

export function saveState(state: AppState): SaveResult {
    try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
        return {status: "saved"};
    } catch (error) {
        return {status: isQuotaError(error) ? "quota-exceeded" : "failed"};
    }
}
