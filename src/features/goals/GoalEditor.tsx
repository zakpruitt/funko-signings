import {useMemo, useState} from "react";
import {compareCons, isConPast, useApp} from "../../state/AppContext";
import {
    type Actor,
    createId,
    type Funko,
    type Goal,
    GOAL_STATUS_LABELS,
    GOAL_STATUSES,
    type GoalStatus,
    type QuoteBackground,
    type Segment,
} from "../../state/types";
import {navigate} from "../../useRoute";
import {rolesForActor, suggestVoices, useVoiceCredits} from "../actors/voiceCredits";
import {FunkoPicker} from "../funkos/FunkoPicker";
import {QuoteEditor} from "../quote/QuoteEditor";
import {formatConDates} from "../cons/formatConDates";
import styles from "./Goals.module.css";

const NEW_ACTOR = "__new__";

export function GoalEditor({goalId}: {goalId?: string}) {
    const {state, dispatch, consForActor} = useApp();
    const existing = goalId ? state.goals.find((goal) => goal.id === goalId) : undefined;
    const credits = useVoiceCredits();

    const [funko, setFunko] = useState<Funko | null>(existing?.funko ?? null);
    const [actorChoice, setActorChoice] = useState(existing?.actorId ?? "");
    const [newActorName, setNewActorName] = useState("");
    const [character, setCharacter] = useState(existing?.character ?? "");
    const [quote, setQuote] = useState<Segment[]>(existing?.quote ?? []);
    const [background, setBackground] = useState<QuoteBackground>(existing?.quoteBackground ?? "light");
    const [status, setStatus] = useState<GoalStatus>(existing?.status ?? "wanted");
    const [conId, setConId] = useState(existing?.conId ?? "");
    const [notes, setNotes] = useState(existing?.notes ?? "");

    const sortedActors = useMemo(
        () => state.actors.slice().sort((a, b) => a.name.localeCompare(b.name)),
        [state.actors],
    );
    const selectedActorName = actorChoice === NEW_ACTOR
        ? newActorName.trim()
        : state.actors.find((actor) => actor.id === actorChoice)?.name ?? "";
    const suggestions = useMemo(
        () => funko ? suggestVoices(credits, character.trim() || funko.title) : [],
        [credits, funko, character],
    );
    const actorRoles = useMemo(
        () => selectedActorName ? rolesForActor(credits, selectedActorName) : [],
        [credits, selectedActorName],
    );
    const attendingIds = new Set(
        actorChoice && actorChoice !== NEW_ACTOR ? consForActor(actorChoice).map((con) => con.id) : [],
    );
    const sortedCons = state.cons.slice().sort(compareCons);
    const attendingCons = sortedCons.filter((con) => attendingIds.has(con.id));
    const otherCons = sortedCons.filter((con) => !attendingIds.has(con.id) && !isConPast(con));

    if (goalId && !existing) {
        return (
            <section className="panel">
                <p>That goal no longer exists.</p>
                <a className="button" href="#/">Back to goals</a>
            </section>
        );
    }

    function chooseSuggestion(actorName: string, role: string) {
        const known = state.actors.find((actor) => actor.name.toLowerCase() === actorName.toLowerCase());
        if (known) {
            setActorChoice(known.id);
        } else {
            setActorChoice(NEW_ACTOR);
            setNewActorName(actorName);
        }
        if (character.trim() === "") {
            setCharacter(role.replace(/\s*\([^)]*\)\s*/g, " ").trim());
        }
    }

    function save() {
        if (!funko) {
            return;
        }
        let actorId: string | undefined = actorChoice && actorChoice !== NEW_ACTOR ? actorChoice : undefined;
        if (actorChoice === NEW_ACTOR && newActorName.trim() !== "") {
            const match = state.actors.find((actor) =>
                actor.name.toLowerCase() === newActorName.trim().toLowerCase());
            if (match) {
                actorId = match.id;
            } else {
                const actor: Actor = {id: createId(), name: newActorName.trim()};
                dispatch({type: "actor/save", actor});
                actorId = actor.id;
            }
        }
        const chosenCon = actorId && conId ? conId : undefined;
        if (actorId && chosenCon) {
            dispatch({type: "appearance/set", actorId, conId: chosenCon, attending: true});
        }
        const goal: Goal = {
            id: existing?.id ?? createId(),
            funko,
            actorId,
            character: character.trim() || undefined,
            quote,
            quoteBackground: background,
            status,
            conId: chosenCon,
            notes: notes.trim() || undefined,
            createdAt: existing?.createdAt ?? new Date().toISOString(),
        };
        dispatch({type: "goal/save", goal});
        navigate(`#/goal/${goal.id}/card`);
    }

    function remove() {
        if (existing && window.confirm(`Delete the goal for ${existing.funko.title}?`)) {
            dispatch({type: "goal/delete", id: existing.id});
            navigate("#/");
        }
    }

    return (
        <form className={styles.editor} onSubmit={(event) => {
            event.preventDefault();
            save();
        }}>
            <h1>{existing ? "Edit goal" : "New signing goal"}</h1>

            <section className="panel">
                <h2>1. Funko</h2>
                <FunkoPicker value={funko} onChange={setFunko}/>
            </section>

            <section className="panel">
                <h2>2. Voice actor</h2>
                {suggestions.length > 0 && (
                    <div className={styles.suggestions}>
                        <span className="muted small">From the voice guides:</span>
                        {suggestions.map((suggestion) => (
                            <button
                                key={suggestion.actorName}
                                type="button"
                                className="chip"
                                title={suggestion.titles.join("\n")}
                                onClick={() => chooseSuggestion(suggestion.actorName, suggestion.role)}
                            >
                                <strong>{suggestion.actorName}</strong> as {suggestion.role}
                                <span className="muted">
                                    {" · "}{suggestion.titles[0]}
                                    {suggestion.titles.length > 1 ? ` +${suggestion.titles.length - 1}` : ""}
                                </span>
                            </button>
                        ))}
                    </div>
                )}
                <div className="form-grid">
                    <label className="field">
                        <span>Actor</span>
                        <select className="input" value={actorChoice}
                            onChange={(event) => setActorChoice(event.target.value)}>
                            <option value="">Not paired yet</option>
                            {sortedActors.map((actor) => (
                                <option key={actor.id} value={actor.id}>{actor.name}</option>
                            ))}
                            <option value={NEW_ACTOR}>+ New actor…</option>
                        </select>
                    </label>
                    {actorChoice === NEW_ACTOR && (
                        <label className="field">
                            <span>New actor name</span>
                            <input className="input" list="known-actors" value={newActorName} autoFocus
                                onChange={(event) => setNewActorName(event.target.value)}/>
                            <datalist id="known-actors">
                                {credits.map((actor) => <option key={actor.name} value={actor.name}/>)}
                            </datalist>
                        </label>
                    )}
                    <label className="field">
                        <span>Character</span>
                        <input className="input" list="actor-roles" value={character}
                            onChange={(event) => setCharacter(event.target.value)}
                            placeholder={funko?.title ?? "Who they voice"}/>
                        <datalist id="actor-roles">
                            {actorRoles.slice(0, 400).map(([role, title]) => (
                                <option key={`${role}-${title}`} value={role}>{title}</option>
                            ))}
                        </datalist>
                    </label>
                </div>
            </section>

            <section className="panel">
                <h2>3. Quote &amp; ink colors</h2>
                <QuoteEditor value={quote} onChange={setQuote} background={background}
                    onBackgroundChange={setBackground}/>
            </section>

            <section className="panel">
                <h2>4. Where &amp; status</h2>
                <div className="form-grid">
                    <label className="field">
                        <span>Status</span>
                        <select className="input" value={status}
                            onChange={(event) => setStatus(event.target.value as GoalStatus)}>
                            {GOAL_STATUSES.map((value) => (
                                <option key={value} value={value}>{GOAL_STATUS_LABELS[value]}</option>
                            ))}
                        </select>
                    </label>
                    <label className="field">
                        <span>Meet them at</span>
                        <select className="input" value={conId} disabled={!actorChoice}
                            onChange={(event) => setConId(event.target.value)}>
                            <option value="">{actorChoice ? "No con picked" : "Pick an actor first"}</option>
                            {attendingCons.length > 0 && (
                                <optgroup label="They're attending">
                                    {attendingCons.map((con) => (
                                        <option key={con.id} value={con.id}>
                                            {con.name}{con.start ? ` (${formatConDates(con)})` : ""}
                                        </option>
                                    ))}
                                </optgroup>
                            )}
                            {otherCons.length > 0 && (
                                <optgroup label="Other upcoming cons (marks them attending)">
                                    {otherCons.map((con) => (
                                        <option key={con.id} value={con.id}>
                                            {con.name}{con.start ? ` (${formatConDates(con)})` : ""}
                                        </option>
                                    ))}
                                </optgroup>
                            )}
                        </select>
                    </label>
                    <label className="field wide">
                        <span>Notes</span>
                        <textarea className="input" rows={3} value={notes}
                            onChange={(event) => setNotes(event.target.value)}
                            placeholder="Price, photo op, add the character name under the signature…"/>
                    </label>
                </div>
                {state.cons.length === 0 && (
                    <p className="muted small">Add conventions on the <a href="#/cons">Cons</a> page to pick one here.</p>
                )}
            </section>

            <div className={styles.editorActions}>
                {existing && (
                    <button type="button" className="button danger" onClick={remove}>Delete</button>
                )}
                <span className="spacer"/>
                <a className="button" href={existing ? `#/goal/${existing.id}/card` : "#/"}>Cancel</a>
                <button type="submit" className="button primary" disabled={!funko}>Save goal</button>
            </div>
        </form>
    );
}
