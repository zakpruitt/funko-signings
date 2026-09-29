import {useSyncExternalStore} from "react";

function subscribe(onChange: () => void): () => void {
    window.addEventListener("hashchange", onChange);
    return () => window.removeEventListener("hashchange", onChange);
}

function getSnapshot(): string {
    return window.location.hash;
}

export type Route =
    | {page: "goals"}
    | {page: "goal-new"}
    | {page: "goal-edit"; id: string}
    | {page: "goal-card"; id: string}
    | {page: "actors"}
    | {page: "cons"}
    | {page: "backup"};

export function parseRoute(hash: string): Route {
    const parts = hash.replace(/^#\/?/, "").split("/").filter(Boolean);
    if (parts[0] === "goal" && parts[1] === "new") {
        return {page: "goal-new"};
    }
    if (parts[0] === "goal" && parts[1] && parts[2] === "card") {
        return {page: "goal-card", id: parts[1]};
    }
    if (parts[0] === "goal" && parts[1]) {
        return {page: "goal-edit", id: parts[1]};
    }
    if (parts[0] === "actors" || parts[0] === "cons" || parts[0] === "backup") {
        return {page: parts[0]};
    }
    return {page: "goals"};
}

export function useRoute(): Route {
    return parseRoute(useSyncExternalStore(subscribe, getSnapshot));
}

export function navigate(hash: string): void {
    window.location.hash = hash;
}
