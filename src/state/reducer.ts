import type {Actor, AppState, Con, Goal} from "./types";

export type Action =
    | {type: "goal/save"; goal: Goal}
    | {type: "goal/delete"; id: string}
    | {type: "actor/save"; actor: Actor}
    | {type: "actor/delete"; id: string}
    | {type: "con/save"; con: Con}
    | {type: "con/delete"; id: string}
    | {type: "appearance/set"; actorId: string; conId: string; attending: boolean}
    | {type: "state/replace"; state: AppState};

function upsert<T extends {id: string}>(items: T[], item: T): T[] {
    const index = items.findIndex((existing) => existing.id === item.id);
    if (index === -1) {
        return [...items, item];
    }
    const next = items.slice();
    next[index] = item;
    return next;
}

export function reducer(state: AppState, action: Action): AppState {
    switch (action.type) {
        case "goal/save":
            return {...state, goals: upsert(state.goals, action.goal)};
        case "goal/delete":
            return {...state, goals: state.goals.filter((goal) => goal.id !== action.id)};
        case "actor/save":
            return {...state, actors: upsert(state.actors, action.actor)};
        case "actor/delete":
            return {
                ...state,
                actors: state.actors.filter((actor) => actor.id !== action.id),
                appearances: state.appearances.filter((appearance) => appearance.actorId !== action.id),
                goals: state.goals.map((goal) =>
                    goal.actorId === action.id ? {...goal, actorId: undefined, conId: undefined} : goal),
            };
        case "con/save":
            return {...state, cons: upsert(state.cons, action.con)};
        case "con/delete":
            return {
                ...state,
                cons: state.cons.filter((con) => con.id !== action.id),
                appearances: state.appearances.filter((appearance) => appearance.conId !== action.id),
                goals: state.goals.map((goal) => goal.conId === action.id ? {...goal, conId: undefined} : goal),
            };
        case "appearance/set": {
            const others = state.appearances.filter((appearance) =>
                !(appearance.actorId === action.actorId && appearance.conId === action.conId));
            if (action.attending) {
                return {...state, appearances: [...others, {actorId: action.actorId, conId: action.conId}]};
            }
            return {
                ...state,
                appearances: others,
                goals: state.goals.map((goal) =>
                    goal.actorId === action.actorId && goal.conId === action.conId ? {...goal, conId: undefined} : goal),
            };
        }
        case "state/replace":
            return action.state;
    }
}
