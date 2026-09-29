import {createContext, type Dispatch, type ReactNode, use, useEffect, useMemo, useReducer, useState} from "react";
import {type Action, reducer} from "./reducer";
import {loadState, type SaveResult, saveState} from "./storage";
import type {Actor, AppState, Con} from "./types";

export interface AppContextValue {
    state: AppState;
    dispatch: Dispatch<Action>;
    actorsById: Map<string, Actor>;
    consById: Map<string, Con>;
    consForActor(actorId: string): Con[];
    actorsForCon(conId: string): Actor[];
    saveProblem: SaveResult | null;
}

const AppContext = createContext<AppContextValue | null>(null);

export function compareCons(a: Con, b: Con): number {
    return (a.start ?? "9999").localeCompare(b.start ?? "9999") || a.name.localeCompare(b.name);
}

export function todayIso(): string {
    const now = new Date();
    const offset = now.getTimezoneOffset() * 60000;
    return new Date(now.getTime() - offset).toISOString().slice(0, 10);
}

export function isConPast(con: Con): boolean {
    const last = con.end || con.start;
    return last !== undefined && last !== "" && last < todayIso();
}

export function AppProvider({children}: {children: ReactNode}) {
    const [state, dispatch] = useReducer(reducer, undefined, loadState);
    const [saveProblem, setSaveProblem] = useState<SaveResult | null>(null);

    useEffect(() => {
        const result = saveState(state);
        setSaveProblem(result.status === "saved" ? null : result);
    }, [state]);

    const value = useMemo<AppContextValue>(() => {
        const actorsById = new Map(state.actors.map((actor) => [actor.id, actor]));
        const consById = new Map(state.cons.map((con) => [con.id, con]));
        return {
            state,
            dispatch,
            actorsById,
            consById,
            consForActor: (actorId) => state.appearances
                .filter((appearance) => appearance.actorId === actorId)
                .map((appearance) => consById.get(appearance.conId))
                .filter((con): con is Con => con !== undefined)
                .sort(compareCons),
            actorsForCon: (conId) => state.appearances
                .filter((appearance) => appearance.conId === conId)
                .map((appearance) => actorsById.get(appearance.actorId))
                .filter((actor): actor is Actor => actor !== undefined)
                .sort((a, b) => a.name.localeCompare(b.name)),
            saveProblem,
        };
    }, [state, saveProblem]);

    return <AppContext value={value}>{children}</AppContext>;
}

export function useApp(): AppContextValue {
    const value = use(AppContext);
    if (value === null) {
        throw new Error("useApp must be used inside AppProvider");
    }
    return value;
}
