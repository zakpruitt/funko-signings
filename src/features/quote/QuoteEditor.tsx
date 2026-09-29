import {useEffect, useLayoutEffect, useRef, useState} from "react";
import type {QuoteBackground, Segment} from "../../state/types";
import {INKS} from "./palette";
import {
    applyColor,
    colorAt,
    DEFAULT_INK,
    getSelectionOffsets,
    plainText,
    renderSegmentsToDom,
    replaceRange,
    segmentsEqual,
    segmentsFromDom,
    setSelectionOffsets,
} from "./segments";
import styles from "./Quote.module.css";

interface QuoteEditorProps {
    value: Segment[];
    onChange(next: Segment[]): void;
    background: QuoteBackground;
    onBackgroundChange(next: QuoteBackground): void;
}

const HISTORY_LIMIT = 100;

export function QuoteEditor({value, onChange, background, onBackgroundChange}: QuoteEditorProps) {
    const editorRef = useRef<HTMLDivElement>(null);
    const shownRef = useRef<Segment[]>([]);
    const undoRef = useRef<Segment[][]>([]);
    const redoRef = useRef<Segment[][]>([]);
    const [pen, setPen] = useState(() => value[value.length - 1]?.color ?? DEFAULT_INK);
    const penRef = useRef(pen);
    const [customInk, setCustomInk] = useState<string | null>(() =>
        value.map((segment) => segment.color).find((color) =>
            !INKS.some((ink) => ink.color === color.toLowerCase())) ?? null);
    const savedSelectionRef = useRef<{start: number; end: number} | null>(null);
    const onChangeRef = useRef(onChange);
    onChangeRef.current = onChange;

    function choosePen(color: string) {
        penRef.current = color;
        setPen(color);
    }

    function remember(previous: Segment[]) {
        undoRef.current.push(previous);
        if (undoRef.current.length > HISTORY_LIMIT) {
            undoRef.current.shift();
        }
        redoRef.current = [];
    }

    function commit(next: Segment[], caret?: {start: number; end: number}) {
        const root = editorRef.current;
        if (!root) {
            return;
        }
        remember(shownRef.current);
        renderSegmentsToDom(root, next);
        shownRef.current = next;
        onChangeRef.current(next);
        if (caret) {
            setSelectionOffsets(root, caret.start, caret.end);
        }
    }

    function restore(from: Segment[][], to: Segment[][]) {
        const root = editorRef.current;
        const target = from.pop();
        if (!root || !target) {
            return;
        }
        to.push(shownRef.current);
        renderSegmentsToDom(root, target);
        shownRef.current = target;
        onChangeRef.current(target);
        const end = plainText(target).length;
        setSelectionOffsets(root, end, end);
    }

    useLayoutEffect(() => {
        const root = editorRef.current;
        if (root && !segmentsEqual(shownRef.current, value)) {
            renderSegmentsToDom(root, value);
            shownRef.current = value;
        }
    }, [value]);

    useEffect(() => {
        const root = editorRef.current;
        if (!root) {
            return;
        }

        function insert(text: string) {
            const selection = root && getSelectionOffsets(root);
            if (!selection) {
                return;
            }
            const next = replaceRange(shownRef.current, selection.start, selection.end,
                [{text, color: penRef.current}]);
            const caret = selection.start + text.length;
            commit(next, {start: caret, end: caret});
        }

        function handleBeforeInput(event: InputEvent) {
            if (event.isComposing) {
                return;
            }
            if (event.inputType === "insertText" && event.data) {
                event.preventDefault();
                insert(event.data);
            } else if (event.inputType === "insertLineBreak" || event.inputType === "insertParagraph") {
                event.preventDefault();
                insert("\n");
            } else if (event.inputType === "insertFromDrop" || event.inputType.startsWith("format")) {
                event.preventDefault();
            }
        }

        function handlePaste(event: ClipboardEvent) {
            event.preventDefault();
            const text = event.clipboardData?.getData("text/plain") ?? "";
            if (text) {
                insert(text.replace(/\r\n?/g, "\n"));
            }
        }

        function handleSelectionChange() {
            const selection = root && getSelectionOffsets(root);
            if (selection && selection.start === selection.end && selection.start > 0) {
                const color = colorAt(shownRef.current, selection.start);
                if (color) {
                    choosePen(color);
                }
            }
        }

        root.addEventListener("beforeinput", handleBeforeInput);
        root.addEventListener("paste", handlePaste);
        document.addEventListener("selectionchange", handleSelectionChange);
        return () => {
            root.removeEventListener("beforeinput", handleBeforeInput);
            root.removeEventListener("paste", handlePaste);
            document.removeEventListener("selectionchange", handleSelectionChange);
        };
    });

    function handleInput() {
        const root = editorRef.current;
        if (!root) {
            return;
        }
        const next = segmentsFromDom(root);
        remember(shownRef.current);
        shownRef.current = next;
        onChange(next);
    }

    function handleKeyDown(event: React.KeyboardEvent) {
        if (!(event.ctrlKey || event.metaKey)) {
            return;
        }
        const key = event.key.toLowerCase();
        if (key === "z" && !event.shiftKey) {
            event.preventDefault();
            restore(undoRef.current, redoRef.current);
        } else if (key === "y" || (key === "z" && event.shiftKey)) {
            event.preventDefault();
            restore(redoRef.current, undoRef.current);
        } else if (key === "b" || key === "i" || key === "u") {
            event.preventDefault();
        }
    }

    function applyInk(color: string) {
        choosePen(color);
        const root = editorRef.current;
        const selection = root && getSelectionOffsets(root);
        if (selection && selection.start !== selection.end) {
            commit(applyColor(shownRef.current, selection.start, selection.end, color), selection);
        }
    }

    function colorEverything() {
        const length = plainText(shownRef.current).length;
        if (length > 0) {
            commit(applyColor(shownRef.current, 0, length, pen));
        }
    }

    const isEmpty = plainText(value).length === 0;

    return (
        <div className={styles.editor}>
            <div className={styles.toolbar} role="toolbar" aria-label="Signing ink colors">
                {INKS.map((ink) => (
                    <button
                        key={ink.color}
                        type="button"
                        className={styles.swatch}
                        style={{background: ink.color}}
                        aria-label={ink.name}
                        aria-pressed={pen.toLowerCase() === ink.color}
                        title={ink.name}
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => applyInk(ink.color)}
                    />
                ))}
                {customInk && (
                    <button
                        type="button"
                        className={styles.swatch}
                        style={{background: customInk}}
                        aria-label="Custom color"
                        title="Custom color"
                        aria-pressed={pen.toLowerCase() === customInk.toLowerCase()}
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => applyInk(customInk)}
                    />
                )}
                <label className={styles.customInk} title="Pick a custom color">
                    <span aria-hidden="true">+</span>
                    <input
                        type="color"
                        aria-label="Pick a custom color"
                        value={customInk ?? "#00a3a3"}
                        onMouseDown={() => {
                            const root = editorRef.current;
                            savedSelectionRef.current = root ? getSelectionOffsets(root) : null;
                        }}
                        onChange={(event) => setCustomInk(event.target.value)}
                        onBlur={(event) => {
                            const saved = savedSelectionRef.current;
                            savedSelectionRef.current = null;
                            choosePen(event.target.value);
                            if (saved && saved.start !== saved.end) {
                                commit(applyColor(shownRef.current, saved.start, saved.end, event.target.value), saved);
                            }
                        }}
                    />
                </label>
            </div>
            <div className={`${styles.surface} ${background === "dark" ? styles.dark : styles.light}`}>
                <div
                    ref={editorRef}
                    className={styles.input}
                    contentEditable
                    suppressContentEditableWarning
                    role="textbox"
                    aria-multiline="true"
                    aria-label="Quote"
                    spellCheck
                    onInput={handleInput}
                    onKeyDown={handleKeyDown}
                    style={{caretColor: pen === "#ffffff" && background === "light" ? DEFAULT_INK : pen}}
                />
                {isEmpty && <span className={styles.placeholder}>Type the quote and signature…</span>}
            </div>
            <div className={styles.editorFooter}>
                <span className="muted">
                    Pick a pen and type, or highlight words and tap a color.
                </span>
                <span className={styles.editorActions}>
                    <button type="button" className="button small" onClick={colorEverything}
                        onMouseDown={(event) => event.preventDefault()}>
                        Color all
                    </button>
                    <button
                        type="button"
                        className="button small"
                        onClick={() => onBackgroundChange(background === "dark" ? "light" : "dark")}
                    >
                        {background === "dark" ? "Light background" : "Dark background"}
                    </button>
                </span>
            </div>
        </div>
    );
}
