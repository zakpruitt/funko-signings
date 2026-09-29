import {useEffect} from "react";
import {AppProvider, useApp} from "./state/AppContext";
import {useRoute} from "./useRoute";
import {GoalBoard} from "./features/goals/GoalBoard";
import {GoalEditor} from "./features/goals/GoalEditor";
import {SigningCard} from "./features/goals/SigningCard";
import {ActorsPage} from "./features/actors/ActorsPage";
import {ConsPage} from "./features/cons/ConsPage";
import {BackupPage} from "./features/backup/BackupPage";
import styles from "./App.module.css";

const NAV = [
    {href: "#/", label: "Goals", pages: ["goals", "goal-new", "goal-edit", "goal-card"]},
    {href: "#/actors", label: "Actors", pages: ["actors"]},
    {href: "#/cons", label: "Cons", pages: ["cons"]},
    {href: "#/backup", label: "Backup", pages: ["backup"]},
];

function Shell() {
    const route = useRoute();
    const {saveProblem} = useApp();

    useEffect(() => {
        window.scrollTo(0, 0);
    }, [route.page, "id" in route ? route.id : ""]);

    return (
        <div className={styles.app}>
            <header className={styles.header}>
                <a className={styles.brand} href="#/">✍️ Funko Signings</a>
                <nav className={styles.nav}>
                    {NAV.map((item) => (
                        <a key={item.href} href={item.href}
                            aria-current={item.pages.includes(route.page) ? "page" : undefined}>
                            {item.label}
                        </a>
                    ))}
                </nav>
                <a className={`button primary ${styles.newButton}`} href="#/goal/new">+ New goal</a>
            </header>
            {saveProblem && (
                <p className={styles.warning} role="alert">
                    {saveProblem.status === "quota-exceeded"
                        ? "Browser storage is full, so recent changes aren't saved. Remove uploaded photos or use image URLs, then export a backup."
                        : "Changes couldn't be saved to this browser (private mode or blocked storage?). Export a backup before closing."}
                </p>
            )}
            <main className={styles.main}>
                {route.page === "goals" && <GoalBoard/>}
                {route.page === "goal-new" && <GoalEditor key="new"/>}
                {route.page === "goal-edit" && <GoalEditor key={route.id} goalId={route.id}/>}
                {route.page === "goal-card" && <SigningCard goalId={route.id}/>}
                {route.page === "actors" && <ActorsPage/>}
                {route.page === "cons" && <ConsPage/>}
                {route.page === "backup" && <BackupPage/>}
            </main>
        </div>
    );
}

export default function App() {
    return (
        <AppProvider>
            <Shell/>
        </AppProvider>
    );
}
