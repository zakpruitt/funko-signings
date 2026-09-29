import {useState} from "react";
import {compareCons, isConPast, useApp} from "../../state/AppContext";
import {type Con, createId, GOAL_STATUS_LABELS} from "../../state/types";
import styles from "../../components/Entities.module.css";
import {formatConDates} from "./formatConDates";

interface ConDraft {
    name: string;
    start: string;
    end: string;
    location: string;
    url: string;
}

function draftFrom(con?: Con): ConDraft {
    return {
        name: con?.name ?? "",
        start: con?.start ?? "",
        end: con?.end ?? "",
        location: con?.location ?? "",
        url: con?.url ?? "",
    };
}

function conFrom(id: string, draft: ConDraft): Con {
    return {
        id,
        name: draft.name.trim(),
        start: draft.start || undefined,
        end: draft.end && draft.end >= draft.start ? draft.end : undefined,
        location: draft.location.trim() || undefined,
        url: draft.url.trim() || undefined,
    };
}

function ConFields({draft, onChange}: {draft: ConDraft; onChange(next: ConDraft): void}) {
    const set = (key: keyof ConDraft) =>
        (event: React.ChangeEvent<HTMLInputElement>) => onChange({...draft, [key]: event.target.value});
    return (
        <div className="form-grid">
            <label className="field wide">
                <span>Convention</span>
                <input className="input" value={draft.name} onChange={set("name")} placeholder="GalaxyCon St. Louis"/>
            </label>
            <label className="field">
                <span>Starts</span>
                <input className="input" type="date" value={draft.start} onChange={set("start")}/>
            </label>
            <label className="field">
                <span>Ends</span>
                <input className="input" type="date" value={draft.end} min={draft.start} onChange={set("end")}/>
            </label>
            <label className="field">
                <span>Location</span>
                <input className="input" value={draft.location} onChange={set("location")} placeholder="St. Louis, MO"/>
            </label>
            <label className="field">
                <span>Guest list URL</span>
                <input className="input" type="url" value={draft.url} onChange={set("url")} placeholder="https://…"/>
            </label>
        </div>
    );
}

export function ConsPage() {
    const {state, dispatch} = useApp();
    const [draft, setDraft] = useState<ConDraft>(draftFrom());
    const [adding, setAdding] = useState(false);

    const cons = state.cons.slice().sort(compareCons);
    const upcoming = cons.filter((con) => !isConPast(con));
    const past = cons.filter(isConPast).reverse();

    function add() {
        if (draft.name.trim() === "") {
            return;
        }
        dispatch({type: "con/save", con: conFrom(createId(), draft)});
        setDraft(draftFrom());
        setAdding(false);
    }

    return (
        <div className={styles.page}>
            <div className={styles.rowHead}>
                <h1>Conventions</h1>
                {!adding && <button type="button" className="button primary" onClick={() => setAdding(true)}>+ Add con</button>}
            </div>

            {adding && (
                <form className="panel" onSubmit={(event) => {
                    event.preventDefault();
                    add();
                }}>
                    <ConFields draft={draft} onChange={setDraft}/>
                    <div className="row-end">
                        <button type="button" className="button" onClick={() => setAdding(false)}>Cancel</button>
                        <button type="submit" className="button primary" disabled={draft.name.trim() === ""}>Add con</button>
                    </div>
                </form>
            )}

            {cons.length === 0 && !adding && (
                <p className="muted">
                    No cons yet. Add the ones you're going to, then mark which of your actors are guests.
                </p>
            )}
            <ul className={styles.list}>
                {upcoming.map((con) => <ConRow key={con.id} con={con}/>)}
            </ul>
            {past.length > 0 && (
                <details className={styles.past}>
                    <summary>Past cons ({past.length})</summary>
                    <ul className={styles.list}>
                        {past.map((con) => <ConRow key={con.id} con={con}/>)}
                    </ul>
                </details>
            )}
        </div>
    );
}

function ConRow({con}: {con: Con}) {
    const {state, dispatch, actorsForCon, actorsById} = useApp();
    const [editing, setEditing] = useState(false);
    const [draft, setDraft] = useState<ConDraft>(draftFrom(con));

    const guests = actorsForCon(con.id);
    const guestIds = new Set(guests.map((actor) => actor.id));
    const otherActors = state.actors.filter((actor) => !guestIds.has(actor.id))
        .sort((a, b) => a.name.localeCompare(b.name));
    const goals = state.goals
        .filter((goal) => goal.actorId && guestIds.has(goal.actorId) && goal.status !== "signed")
        .sort((a, b) => (actorsById.get(a.actorId!)?.name ?? "").localeCompare(actorsById.get(b.actorId!)?.name ?? ""));
    const readyCount = goals.filter((goal) => goal.status === "have-funko").length;

    if (editing) {
        return (
            <li className="panel">
                <ConFields draft={draft} onChange={setDraft}/>
                <div className="row-end">
                    <button type="button" className="button danger" onClick={() => {
                        if (window.confirm(`Delete ${con.name}?`)) {
                            dispatch({type: "con/delete", id: con.id});
                        }
                    }}>Delete</button>
                    <span className="spacer"/>
                    <button type="button" className="button" onClick={() => setEditing(false)}>Cancel</button>
                    <button type="button" className="button primary" disabled={draft.name.trim() === ""}
                        onClick={() => {
                            dispatch({type: "con/save", con: conFrom(con.id, draft)});
                            setEditing(false);
                        }}>Save</button>
                </div>
            </li>
        );
    }

    return (
        <li className="panel">
            <div className={styles.rowHead}>
                <div>
                    <h2>{con.url ? <a href={con.url} target="_blank" rel="noreferrer">{con.name}</a> : con.name}</h2>
                    <p className="muted small">
                        {formatConDates(con)}{con.location ? ` · ${con.location}` : ""}
                    </p>
                </div>
                <button type="button" className="button small" onClick={() => {
                    setDraft(draftFrom(con));
                    setEditing(true);
                }}>Edit</button>
            </div>

            <div className={styles.section}>
                <h3>Your actors attending</h3>
                <div className={styles.chips}>
                    {guests.map((actor) => (
                        <span key={actor.id} className="chip">
                            {actor.name}
                            <button type="button" className="chip-x" aria-label={`Remove ${actor.name}`}
                                onClick={() => dispatch({
                                    type: "appearance/set", actorId: actor.id, conId: con.id, attending: false,
                                })}>×</button>
                        </span>
                    ))}
                    {otherActors.length > 0 ? (
                        <select className="input compact" value="" aria-label="Add an attending actor"
                            onChange={(event) => event.target.value && dispatch({
                                type: "appearance/set", actorId: event.target.value, conId: con.id, attending: true,
                            })}>
                            <option value="">+ Add actor…</option>
                            {otherActors.map((actor) => <option key={actor.id} value={actor.id}>{actor.name}</option>)}
                        </select>
                    ) : guests.length === 0 && (
                        <span className="muted small">Add actors on the <a href="#/actors">Actors</a> page first.</span>
                    )}
                </div>
            </div>

            {goals.length > 0 && (
                <div className={styles.section}>
                    <h3>Bring to this con <span className="muted small">({readyCount} of {goals.length} ready)</span></h3>
                    <ul className={styles.goalLinks}>
                        {goals.map((goal) => (
                            <li key={goal.id}>
                                <a href={`#/goal/${goal.id}/card`}>{goal.character || goal.funko.title}</a>
                                <span className="muted small">{actorsById.get(goal.actorId!)?.name}</span>
                                <span className={`pill ${goal.status}`}>{GOAL_STATUS_LABELS[goal.status]}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </li>
    );
}
