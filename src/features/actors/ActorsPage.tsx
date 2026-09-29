import {useState} from "react";
import {compareCons, isConPast, useApp} from "../../state/AppContext";
import {type Actor, createId, GOAL_STATUS_LABELS} from "../../state/types";
import {formatConDates} from "../cons/formatConDates";
import styles from "../../components/Entities.module.css";
import {rolesForActor, useVoiceCredits, type VoiceActorCredits} from "./voiceCredits";

export function ActorsPage() {
    const {state, dispatch} = useApp();
    const credits = useVoiceCredits();
    const [name, setName] = useState("");

    function add() {
        const trimmed = name.trim();
        if (trimmed === "") {
            return;
        }
        if (state.actors.some((actor) => actor.name.toLowerCase() === trimmed.toLowerCase())) {
            window.alert(`${trimmed} is already on your list.`);
            return;
        }
        dispatch({type: "actor/save", actor: {id: createId(), name: trimmed}});
        setName("");
    }

    const actors = state.actors.slice().sort((a, b) => a.name.localeCompare(b.name));

    return (
        <div className={styles.page}>
            <h1>Voice actors</h1>
            <form className={`panel ${styles.addForm}`} onSubmit={(event) => {
                event.preventDefault();
                add();
            }}>
                <label className="field">
                    <span>Add an actor</span>
                    <input className="input" list="actor-name-options" value={name}
                        onChange={(event) => setName(event.target.value)} placeholder="Name"/>
                    <datalist id="actor-name-options">
                        {credits.map((actor) => <option key={actor.name} value={actor.name}/>)}
                    </datalist>
                </label>
                <button type="submit" className="button primary" disabled={name.trim() === ""}>Add</button>
            </form>

            {actors.length === 0 && (
                <p className="muted">No actors yet. Add them here or while creating a goal.</p>
            )}
            <ul className={styles.list}>
                {actors.map((actor) => <ActorRow key={actor.id} actor={actor} credits={credits}/>)}
            </ul>
        </div>
    );
}

function ActorRow({actor, credits}: {actor: Actor; credits: VoiceActorCredits[]}) {
    const {state, dispatch, consForActor} = useApp();
    const [editing, setEditing] = useState(false);
    const [name, setName] = useState(actor.name);
    const [notes, setNotes] = useState(actor.notes ?? "");
    const [links, setLinks] = useState((actor.links ?? []).join("\n"));

    const goals = state.goals.filter((goal) => goal.actorId === actor.id);
    const cons = consForActor(actor.id);
    const attending = new Set(cons.map((con) => con.id));
    const otherCons = state.cons.filter((con) => !attending.has(con.id) && !isConPast(con)).sort(compareCons);
    const knownRoles = rolesForActor(credits, actor.name).length;

    function save() {
        if (name.trim() === "") {
            return;
        }
        dispatch({
            type: "actor/save",
            actor: {
                ...actor,
                name: name.trim(),
                notes: notes.trim() || undefined,
                links: links.split(/\s+/).map((link) => link.trim()).filter(Boolean),
            },
        });
        setEditing(false);
    }

    function remove() {
        const extra = goals.length > 0 ? ` Their ${goals.length} goal(s) will stay, but unpaired.` : "";
        if (window.confirm(`Remove ${actor.name}?${extra}`)) {
            dispatch({type: "actor/delete", id: actor.id});
        }
    }

    if (editing) {
        return (
            <li className="panel">
                <div className="form-grid">
                    <label className="field">
                        <span>Name</span>
                        <input className="input" value={name} onChange={(event) => setName(event.target.value)}/>
                    </label>
                    <label className="field wide">
                        <span>Notes</span>
                        <textarea className="input" rows={2} value={notes}
                            onChange={(event) => setNotes(event.target.value)}
                            placeholder="Autograph price, pen preferences, table etiquette…"/>
                    </label>
                    <label className="field wide">
                        <span>Links (one per line)</span>
                        <textarea className="input" rows={2} value={links}
                            onChange={(event) => setLinks(event.target.value)}
                            placeholder="https://… (their site, socials, appearances page)"/>
                    </label>
                </div>
                <div className="row-end">
                    <button type="button" className="button danger" onClick={remove}>Remove</button>
                    <span className="spacer"/>
                    <button type="button" className="button" onClick={() => setEditing(false)}>Cancel</button>
                    <button type="button" className="button primary" onClick={save}>Save</button>
                </div>
            </li>
        );
    }

    return (
        <li className="panel">
            <div className={styles.rowHead}>
                <div>
                    <h2>{actor.name}</h2>
                    <p className="muted small">
                        {goals.length} goal{goals.length === 1 ? "" : "s"}
                        {knownRoles > 0 ? ` · ${knownRoles} known roles` : ""}
                    </p>
                </div>
                <button type="button" className="button small" onClick={() => setEditing(true)}>Edit</button>
            </div>
            {actor.notes && <p className={styles.notes}>{actor.notes}</p>}
            {actor.links && actor.links.length > 0 && (
                <p className={styles.links}>
                    {actor.links.map((link) => (
                        <a key={link} href={link} target="_blank" rel="noreferrer">
                            {link.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "")}
                        </a>
                    ))}
                </p>
            )}

            <div className={styles.section}>
                <h3>Where to meet them</h3>
                <div className={styles.chips}>
                    {cons.map((con) => (
                        <span key={con.id} className={`chip ${isConPast(con) ? "past" : ""}`}>
                            {con.name} <span className="muted">· {formatConDates(con)}</span>
                            <button type="button" className="chip-x" aria-label={`Remove ${con.name}`}
                                onClick={() => dispatch({
                                    type: "appearance/set", actorId: actor.id, conId: con.id, attending: false,
                                })}>×</button>
                        </span>
                    ))}
                    {otherCons.length > 0 ? (
                        <select className="input compact" value="" aria-label="Add a con"
                            onChange={(event) => event.target.value && dispatch({
                                type: "appearance/set", actorId: actor.id, conId: event.target.value, attending: true,
                            })}>
                            <option value="">+ Add con…</option>
                            {otherCons.map((con) => <option key={con.id} value={con.id}>{con.name}</option>)}
                        </select>
                    ) : cons.length === 0 && (
                        <span className="muted small">Add cons on the <a href="#/cons">Cons</a> page first.</span>
                    )}
                </div>
            </div>

            {goals.length > 0 && (
                <div className={styles.section}>
                    <h3>Goals</h3>
                    <ul className={styles.goalLinks}>
                        {goals.map((goal) => (
                            <li key={goal.id}>
                                <a href={`#/goal/${goal.id}/card`}>{goal.character || goal.funko.title}</a>
                                <span className={`pill ${goal.status}`}>{GOAL_STATUS_LABELS[goal.status]}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </li>
    );
}
