import {useDeferredValue, useEffect, useState} from "react";
import type {Funko} from "../../state/types";
import {type CatalogEntry, loadCatalog, searchCatalog} from "./catalog";
import {downscaleImageToDataUrl} from "./downscaleImage";
import {FunkoImage} from "./FunkoImage";
import styles from "./Funkos.module.css";

const RESULT_LIMIT = 60;

interface FunkoPickerProps {
    value: Funko | null;
    onChange(funko: Funko): void;
}

export function FunkoPicker({value, onChange}: FunkoPickerProps) {
    const [open, setOpen] = useState(value === null);
    const [tab, setTab] = useState<"catalog" | "custom">(value?.source === "custom" ? "custom" : "catalog");

    if (value && !open) {
        return (
            <div className={styles.chosen}>
                <FunkoImage funko={value} size="medium"/>
                <div className={styles.chosenText}>
                    <strong>{value.title}{value.number ? ` #${value.number}` : ""}</strong>
                    {value.series.length > 0 && <span className="muted">{value.series.join(" · ")}</span>}
                </div>
                <button type="button" className="button" onClick={() => setOpen(true)}>Change</button>
            </div>
        );
    }

    function pick(funko: Funko) {
        onChange(funko);
        setOpen(false);
    }

    return (
        <div className={styles.picker}>
            <div className="tabs" role="tablist">
                <button type="button" role="tab" aria-selected={tab === "catalog"} onClick={() => setTab("catalog")}>
                    Search catalog
                </button>
                <button type="button" role="tab" aria-selected={tab === "custom"} onClick={() => setTab("custom")}>
                    Add my own
                </button>
                {value && (
                    <button type="button" className="link" onClick={() => setOpen(false)}>Cancel</button>
                )}
            </div>
            {tab === "catalog"
                ? <CatalogSearch onPick={pick}/>
                : <CustomFunkoForm initial={value?.source === "custom" ? value : null} onSave={pick}/>}
        </div>
    );
}

function CatalogSearch({onPick}: {onPick(funko: Funko): void}) {
    const [entries, setEntries] = useState<CatalogEntry[] | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [query, setQuery] = useState("");
    const deferredQuery = useDeferredValue(query);

    useEffect(() => {
        let cancelled = false;
        loadCatalog()
            .then((loaded) => !cancelled && setEntries(loaded))
            .catch((reason: unknown) => !cancelled && setError(reason instanceof Error ? reason.message : String(reason)));
        return () => {
            cancelled = true;
        };
    }, []);

    const results = entries ? searchCatalog(entries, deferredQuery, RESULT_LIMIT) : [];

    return (
        <div className={styles.search}>
            <input
                type="search"
                className="input"
                placeholder={entries ? `Search ${entries.length.toLocaleString()} Funkos: character, show, series…` : "Loading catalog…"}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                autoFocus
            />
            {error && <p className="error">{error}</p>}
            <p className="muted small">
                The catalog is a community dataset that stops around 2021. For newer pops, use “Add my own”.
            </p>
            {deferredQuery.trim() !== "" && entries && results.length === 0 && (
                <p className="muted">No matches. Try fewer words, or add it yourself.</p>
            )}
            <ul className={styles.results}>
                {results.map((funko) => (
                    <li key={`${funko.handle}-${funko.title}`}>
                        <button type="button" className={styles.result} onClick={() => onPick(funko)}>
                            <FunkoImage funko={funko} size="small"/>
                            <span className={styles.resultText}>
                                <strong>{funko.title}</strong>
                                <span className="muted small">{funko.series.join(" · ")}</span>
                            </span>
                        </button>
                    </li>
                ))}
            </ul>
        </div>
    );
}

function CustomFunkoForm({initial, onSave}: {initial: Funko | null; onSave(funko: Funko): void}) {
    const [title, setTitle] = useState(initial?.title ?? "");
    const [number, setNumber] = useState(initial?.number ?? "");
    const [series, setSeries] = useState(initial?.series.join(", ") ?? "");
    const [imageUrl, setImageUrl] = useState(initial?.imageUrl ?? "");
    const [imageError, setImageError] = useState<string | null>(null);

    async function handleFile(file: File | undefined) {
        if (!file) {
            return;
        }
        try {
            setImageError(null);
            setImageUrl(await downscaleImageToDataUrl(file));
        } catch (error) {
            setImageError(error instanceof Error ? error.message : String(error));
        }
    }

    function save() {
        if (title.trim() === "") {
            return;
        }
        onSave({
            source: "custom",
            title: title.trim(),
            number: number.trim().replace(/^#/, "") || undefined,
            series: series.split(",").map((name) => name.trim()).filter(Boolean),
            imageUrl: imageUrl.trim() || undefined,
        });
    }

    const preview: Funko = {source: "custom", title: title || "?", series: [], imageUrl: imageUrl || undefined};

    return (
        <div className={styles.custom}>
            <FunkoImage funko={preview} size="medium"/>
            <div className="form-grid">
                <label className="field">
                    <span>Name</span>
                    <input className="input" value={title} onChange={(event) => setTitle(event.target.value)}
                        placeholder="Spike Spiegel"/>
                </label>
                <label className="field narrow">
                    <span>Pop #</span>
                    <input className="input" value={number} onChange={(event) => setNumber(event.target.value)}
                        placeholder="1212"/>
                </label>
                <label className="field wide">
                    <span>Series / line (comma separated)</span>
                    <input className="input" value={series} onChange={(event) => setSeries(event.target.value)}
                        placeholder="Pop! Animation, Cowboy Bebop"/>
                </label>
                <label className="field wide">
                    <span>Image URL</span>
                    <input className="input" value={imageUrl.startsWith("data:") ? "" : imageUrl}
                        onChange={(event) => setImageUrl(event.target.value)}
                        placeholder={imageUrl.startsWith("data:") ? "Using uploaded photo" : "https://…"}/>
                </label>
                <label className="field wide">
                    <span>…or upload a photo</span>
                    <input type="file" accept="image/*" onChange={(event) => handleFile(event.target.files?.[0])}/>
                </label>
                {imageError && <p className="error">{imageError}</p>}
            </div>
            <div className="row-end">
                <button type="button" className="button primary" disabled={title.trim() === ""} onClick={save}>
                    Use this Funko
                </button>
            </div>
        </div>
    );
}
