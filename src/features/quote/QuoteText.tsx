import type {QuoteBackground, Segment} from "../../state/types";
import {inkName} from "./palette";
import styles from "./Quote.module.css";

interface QuoteTextProps {
    segments: Segment[];
    background?: QuoteBackground;
    size?: "small" | "large";
}

export function QuoteText({segments, background = "light", size = "small"}: QuoteTextProps) {
    return (
        <div className={[
            styles.surface,
            background === "dark" ? styles.dark : styles.light,
            size === "large" ? styles.large : styles.small,
        ].join(" ")}>
            <p className={styles.text}>
                {segments.map((segment, index) => (
                    <span key={index} style={{color: segment.color}}>{segment.text}</span>
                ))}
            </p>
        </div>
    );
}

export function InkLegend({segments}: {segments: Segment[]}) {
    const byColor = new Map<string, string[]>();
    for (const segment of segments) {
        const text = segment.text.replace(/\s+/g, " ").trim();
        if (!/[\p{L}\p{N}]/u.test(text)) {
            continue;
        }
        const pieces = byColor.get(segment.color) ?? [];
        pieces.push(text);
        byColor.set(segment.color, pieces);
    }
    if (byColor.size < 2) {
        return null;
    }
    return (
        <ul className={styles.legend}>
            {[...byColor].map(([color, pieces]) => (
                <li key={color}>
                    <span className={styles.legendDot} style={{background: color}}/>
                    <strong>{inkName(color)}</strong>
                    <span className={styles.legendText}>{pieces.map((piece) => `“${piece}”`).join(", ")}</span>
                </li>
            ))}
        </ul>
    );
}
