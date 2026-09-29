import {useState} from "react";
import {useApp} from "../../state/AppContext";
import {parseState} from "../../state/storage";
import styles from "../../components/Entities.module.css";

function download(filename: string, text: string) {
    const url = URL.createObjectURL(new Blob([text], {type: "application/json"}));
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
}

export function BackupPage() {
    const {state, dispatch} = useApp();
    const [message, setMessage] = useState<{kind: "ok" | "error"; text: string} | null>(null);
    const json = JSON.stringify(state);
    const kilobytes = Math.round(json.length / 1024);

    function exportData() {
        const date = new Date().toISOString().slice(0, 10);
        download(`funko-signings-${date}.json`, JSON.stringify(state, null, 2));
    }

    async function importData(file: File | undefined) {
        if (!file) {
            return;
        }
        try {
            const imported = parseState(await file.text());
            const summary = `${imported.goals.length} goals, ${imported.actors.length} actors, ${imported.cons.length} cons`;
            if (!window.confirm(`Replace everything in this browser with ${summary}?`)) {
                return;
            }
            dispatch({type: "state/replace", state: imported});
            setMessage({kind: "ok", text: `Imported ${summary}.`});
        } catch (error) {
            setMessage({kind: "error", text: error instanceof Error ? error.message : String(error)});
        }
    }

    return (
        <div className={styles.page}>
            <h1>Backup</h1>
            <section className="panel">
                <p>
                    Everything is saved in this browser only ({state.goals.length} goals, {state.actors.length} actors,
                    {" "}{state.cons.length} cons, about {kilobytes} KB). Clearing site data or switching devices
                    loses it, so export a copy now and then.
                </p>
                <div className="row-end">
                    <label className="button">
                        Import backup…
                        <input type="file" accept="application/json,.json" hidden
                            onChange={(event) => {
                                void importData(event.target.files?.[0]);
                                event.target.value = "";
                            }}/>
                    </label>
                    <button type="button" className="button primary" onClick={exportData}>Export backup</button>
                </div>
                {message && <p className={message.kind === "error" ? "error" : "success"}>{message.text}</p>}
            </section>
            <section className="panel muted small">
                <p>
                    Funko catalog: the community <a href="https://github.com/kennymkchan/funko-pop-data"
                        target="_blank" rel="noreferrer">funko-pop-data</a> set (MIT, images from hobbyDB),
                    which ends around 2021. Voice role suggestions come from the <a
                        href="https://zakpruitt.github.io/data-pages/" target="_blank" rel="noreferrer">data-pages</a>
                    {" "}voice guides.
                </p>
            </section>
        </div>
    );
}
