import {useMemo, useState} from "react";
import {type AppContextValue, isConPast, useApp} from "../../state/AppContext";
import {type Con, type Goal, GOAL_STATUS_LABELS, GOAL_STATUSES, type GoalStatus} from "../../state/types";
import {formatConDates} from "../cons/formatConDates";
import {FunkoImage} from "../funkos/FunkoImage";
import {plainText} from "../quote/segments";
import {QuoteText} from "../quote/QuoteText";
import styles from "./Goals.module.css";

export function nextConForGoal(goal: Goal, app: AppContextValue): Con | undefined {
    const picked = goal.conId ? app.consById.get(goal.conId) : undefined;
    if (picked && !isConPast(picked)) {
        return picked;
    }
    return goal.actorId ? app.consForActor(goal.actorId).find((con) => !isConPast(con)) : undefined;
}

export function GoalBoard() {
    const app = useApp();
    const {state, actorsById} = app;
    const [query, setQuery] = useState("");
    const [status, setStatus] = useState<GoalStatus | "all">("all");
    const [actorId, setActorId] = useState("");
    const [conId, setConId] = useState("");

    const rows = useMemo(() => state.goals.map((goal) => ({
        goal,
        actor: goal.actorId ? actorsById.get(goal.actorId) : undefined,
        nextCon: nextConForGoal(goal, app),
    })), [state.goals, actorsById, app]);

    const counts = useMemo(() => {
        const result: Record<GoalStatus, number> = {"wanted": 0, "have-funko": 0, "signed": 0};
        state.goals.forEach((goal) => result[goal.status]++);
        return result;
    }, [state.goals]);

    const needle = query.trim().toLowerCase();
    const visible = rows
        .filter(({goal}) => status === "all" || goal.status === status)
        .filter(({goal}) => !actorId || (actorId === "none" ? !goal.actorId : goal.actorId === actorId))
        .filter(({goal, nextCon}) => !conId || goal.conId === conId || nextCon?.id === conId ||
            (goal.actorId !== undefined && state.appearances.some((appearance) =>
                appearance.conId === conId && appearance.actorId === goal.actorId)))
        .filter(({goal, actor}) => needle === "" || [
            goal.funko.title, goal.character, actor?.name, plainText(goal.quote), goal.notes, ...goal.funko.series,
        ].some((text) => text?.toLowerCase().includes(needle)))
        .sort((a, b) =>
            Number(a.goal.status === "signed") - Number(b.goal.status === "signed") ||
            (a.nextCon?.start ?? "9999").localeCompare(b.nextCon?.start ?? "9999") ||
            b.goal.createdAt.localeCompare(a.goal.createdAt));

    if (state.goals.length === 0) {
        return (
            <section className={`panel ${styles.empty}`}>
                <h1>Your signing goals</h1>
                <p>
                    Add a Funko, pair it with the voice actor you want to sign it, and write out the quote.
                    Color the words to show them which pen to use.
                </p>
                <a className="button primary" href="#/goal/new">Add your first Funko</a>
            </section>
        );
    }

    const sortedActors = state.actors.slice().sort((a, b) => a.name.localeCompare(b.name));
    const upcomingCons = state.cons.filter((con) => !isConPast(con));

    return (
        <div className={styles.board}>
            <div className={styles.filters}>
                <input type="search" className="input" placeholder="Search Funkos, characters, actors, quotes…"
                    value={query} onChange={(event) => setQuery(event.target.value)}/>
                <div className="tabs" role="tablist" aria-label="Status">
                    <button type="button" role="tab" aria-selected={status === "all"} onClick={() => setStatus("all")}>
                        All <span className="count">{state.goals.length}</span>
                    </button>
                    {GOAL_STATUSES.map((value) => (
                        <button key={value} type="button" role="tab" aria-selected={status === value}
                            onClick={() => setStatus(value)}>
                            {GOAL_STATUS_LABELS[value]} <span className="count">{counts[value]}</span>
                        </button>
                    ))}
                </div>
                <div className={styles.selects}>
                    <select className="input" value={actorId} onChange={(event) => setActorId(event.target.value)}
                        aria-label="Filter by actor">
                        <option value="">All actors</option>
                        <option value="none">Not paired yet</option>
                        {sortedActors.map((actor) => <option key={actor.id} value={actor.id}>{actor.name}</option>)}
                    </select>
                    <select className="input" value={conId} onChange={(event) => setConId(event.target.value)}
                        aria-label="Filter by con">
                        <option value="">Any con</option>
                        {upcomingCons.map((con) => <option key={con.id} value={con.id}>{con.name}</option>)}
                    </select>
                </div>
            </div>

            {visible.length === 0 && <p className="muted">Nothing matches those filters.</p>}

            <ul className={styles.grid}>
                {visible.map(({goal, actor, nextCon}) => (
                    <li key={goal.id} className={`${styles.card} ${goal.status === "signed" ? styles.signed : ""}`}>
                        <a className={styles.cardMain} href={`#/goal/${goal.id}/card`}>
                            <FunkoImage funko={goal.funko} size="medium"/>
                            <div className={styles.cardText}>
                                <strong className={styles.cardTitle}>{goal.funko.title}</strong>
                                {goal.character && goal.character !== goal.funko.title && (
                                    <span className="muted small">as {goal.character}</span>
                                )}
                                <span className={actor ? "" : "muted"}>
                                    {actor ? `✍️ ${actor.name}` : "No actor yet"}
                                </span>
                                <span className={`pill ${goal.status}`}>{GOAL_STATUS_LABELS[goal.status]}</span>
                            </div>
                        </a>
                        {goal.quote.length > 0 && (
                            <QuoteText segments={goal.quote} background={goal.quoteBackground}/>
                        )}
                        <div className={styles.cardFooter}>
                            <span className="muted small">
                                {goal.status === "signed" ? "Done!" : nextCon
                                    ? `📍 ${nextCon.name} · ${formatConDates(nextCon)}`
                                    : actor ? "No upcoming con" : ""}
                            </span>
                            <a className="button small" href={`#/goal/${goal.id}`}>Edit</a>
                        </div>
                    </li>
                ))}
            </ul>
        </div>
    );
}
