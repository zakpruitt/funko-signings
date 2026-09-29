import {useEffect, useState} from "react";

export interface VoiceActorCredits {
    name: string;
    roles: [role: string, title: string][];
}

export interface VoiceSuggestion {
    actorName: string;
    role: string;
    titles: string[];
}

let creditsPromise: Promise<VoiceActorCredits[]> | null = null;

export function loadVoiceCredits(): Promise<VoiceActorCredits[]> {
    if (creditsPromise === null) {
        creditsPromise = fetch(`${import.meta.env.BASE_URL}voice-credits.json`)
            .then((response) => {
                if (!response.ok) {
                    throw new Error(`Voice credits could not be loaded (HTTP ${response.status}).`);
                }
                return response.json() as Promise<VoiceActorCredits[]>;
            })
            .catch((error: unknown) => {
                creditsPromise = null;
                throw error;
            });
    }
    return creditsPromise;
}

export function useVoiceCredits(): VoiceActorCredits[] {
    const [credits, setCredits] = useState<VoiceActorCredits[]>([]);
    useEffect(() => {
        let cancelled = false;
        loadVoiceCredits().then((loaded) => !cancelled && setCredits(loaded)).catch(() => undefined);
        return () => {
            cancelled = true;
        };
    }, []);
    return credits;
}

function normalize(text: string): string {
    return text.toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "")
        .replace(/[^a-z0-9]+/g, " ").trim();
}

function characterName(funkoTitle: string): string {
    return normalize(funkoTitle.replace(/\([^)]*\)/g, " ").replace(/\[[^\]]*]/g, " "));
}

function roleNames(role: string): {label: string; name: string}[] {
    return role
        .split(/[,;/]| and | & /)
        .map((part) => {
            const label = part.replace(/\s+/g, " ").trim();
            return {label, name: normalize(label.replace(/\([^)]*\)/g, " "))};
        })
        .filter((part) => part.name.length >= 3);
}

function matches(name: string, target: string): boolean {
    if (name === target) {
        return true;
    }
    const padded = ` ${name} `;
    const paddedTarget = ` ${target} `;
    return (target.length >= 4 && padded.includes(paddedTarget)) ||
        (name.length >= 4 && paddedTarget.includes(padded));
}

export function suggestVoices(credits: VoiceActorCredits[], funkoTitle: string, limit = 12): VoiceSuggestion[] {
    const target = characterName(funkoTitle);
    if (target.length < 3) {
        return [];
    }
    const found: (VoiceSuggestion & {exact: boolean})[] = [];
    for (const actor of credits) {
        const titles: string[] = [];
        let best: {role: string; exact: boolean} | null = null;
        for (const [role, title] of actor.roles) {
            const hit = roleNames(role).find((part) => matches(part.name, target));
            if (!hit) {
                continue;
            }
            titles.push(title);
            const exact = hit.name === target;
            if (!best || (exact && !best.exact)) {
                best = {role: hit.label.replace(/\s*\((?:ep|eps|episode)[^)]*\)/gi, ""), exact};
            }
        }
        if (best) {
            found.push({actorName: actor.name, role: best.role, titles, exact: best.exact});
        }
    }
    found.sort((a, b) => Number(b.exact) - Number(a.exact) || b.titles.length - a.titles.length);
    return found.slice(0, limit).map(({actorName, role, titles}) => ({actorName, role, titles}));
}

export function rolesForActor(credits: VoiceActorCredits[], actorName: string): VoiceActorCredits["roles"] {
    const target = normalize(actorName);
    return credits.find((actor) => normalize(actor.name) === target)?.roles ?? [];
}
