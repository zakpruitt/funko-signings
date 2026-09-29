import {useState} from "react";
import type {Funko} from "../../state/types";
import styles from "./Funkos.module.css";

export function FunkoImage({funko, size = "medium"}: {funko: Funko; size?: "small" | "medium" | "large"}) {
    const [failedUrl, setFailedUrl] = useState<string | null>(null);
    const url = funko.imageUrl && funko.imageUrl !== failedUrl ? funko.imageUrl : null;
    return (
        <div className={`${styles.image} ${styles[size]}`}>
            {url ? (
                <img
                    src={url}
                    alt={funko.title}
                    loading="lazy"
                    referrerPolicy="no-referrer"
                    onError={() => setFailedUrl(url)}
                />
            ) : (
                <span className={styles.imageFallback} aria-hidden="true">
                    {funko.title.slice(0, 1).toUpperCase() || "?"}
                </span>
            )}
        </div>
    );
}
