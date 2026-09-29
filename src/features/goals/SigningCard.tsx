import {useApp} from "../../state/AppContext";
import {GOAL_STATUS_LABELS, GOAL_STATUSES} from "../../state/types";
import {formatConDates} from "../cons/formatConDates";
import {FunkoImage} from "../funkos/FunkoImage";
import {InkLegend, QuoteText} from "../quote/QuoteText";
import {nextConForGoal} from "./GoalBoard";
import styles from "./Goals.module.css";

export function SigningCard({goalId}: {goalId: string}) {
    const app = useApp();
    const goal = app.state.goals.find((candidate) => candidate.id === goalId);

    if (!goal) {
        return (
            <section className="panel">
                <p>That goal no longer exists.</p>
                <a className="button" href="#/">Back to goals</a>
            </section>
        );
    }

    const actor = goal.actorId ? app.actorsById.get(goal.actorId) : undefined;
    const nextCon = nextConForGoal(goal, app);

    return (
        <div className={styles.signing}>
            <div className={styles.signingNav}>
                <a className="button" href="#/">← Goals</a>
                <span className="spacer"/>
                <select
                    className="input"
                    aria-label="Status"
                    value={goal.status}
                    onChange={(event) => app.dispatch({
                        type: "goal/save",
                        goal: {...goal, status: event.target.value as typeof goal.status},
                    })}
                >
                    {GOAL_STATUSES.map((value) => (
                        <option key={value} value={value}>{GOAL_STATUS_LABELS[value]}</option>
                    ))}
                </select>
                <a className="button" href={`#/goal/${goal.id}`}>Edit</a>
            </div>

            <article className={`panel ${styles.signingCard}`}>
                <FunkoImage funko={goal.funko} size="large"/>
                <div className={styles.signingHeading}>
                    <h1>{goal.character || goal.funko.title}</h1>
                    <p className="muted">
                        {goal.funko.title}{goal.funko.number ? ` · #${goal.funko.number}` : ""}
                        {actor ? ` · ${actor.name}` : ""}
                    </p>
                </div>
                {goal.quote.length > 0 ? (
                    <>
                        <p className={styles.signingAsk}>Could you sign it like this?</p>
                        <QuoteText segments={goal.quote} background={goal.quoteBackground} size="large"/>
                        <InkLegend segments={goal.quote}/>
                    </>
                ) : (
                    <p className="muted">No quote yet. <a href={`#/goal/${goal.id}`}>Add one</a>.</p>
                )}
                {goal.notes && <p className={styles.signingNotes}>{goal.notes}</p>}
                {nextCon && goal.status !== "signed" && (
                    <p className="muted small">📍 {nextCon.name} · {formatConDates(nextCon)}
                        {nextCon.location ? ` · ${nextCon.location}` : ""}</p>
                )}
            </article>
        </div>
    );
}
