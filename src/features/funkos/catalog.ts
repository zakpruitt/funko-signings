import type {Funko} from "../../state/types";

interface RawCatalog {
    imagePrefix: string;
    series: string[];
    items: [title: string, handle: string, image: string, series: number[]][];
}

export interface CatalogEntry {
    funko: Funko;
    haystack: string;
}

let catalogPromise: Promise<CatalogEntry[]> | null = null;

function normalize(text: string): string {
    return text.toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9#]+/g, " ");
}

async function fetchCatalog(): Promise<CatalogEntry[]> {
    const response = await fetch(`${import.meta.env.BASE_URL}funko-catalog.json`);
    if (!response.ok) {
        throw new Error(`The Funko catalog could not be loaded (HTTP ${response.status}).`);
    }
    const raw = await response.json() as RawCatalog;
    return raw.items.map(([title, handle, image, seriesIndexes]) => {
        const series = seriesIndexes.map((index) => raw.series[index]).filter(Boolean);
        const imageUrl = image === "" ? undefined : image.startsWith("http") ? image : raw.imagePrefix + image;
        return {
            funko: {source: "catalog", title, handle, series, imageUrl},
            haystack: ` ${normalize(`${title} ${series.join(" ")}`)} `,
        };
    });
}

export function loadCatalog(): Promise<CatalogEntry[]> {
    if (catalogPromise === null) {
        catalogPromise = fetchCatalog().catch((error: unknown) => {
            catalogPromise = null;
            throw error;
        });
    }
    return catalogPromise;
}

export function searchCatalog(entries: CatalogEntry[], query: string, limit: number): Funko[] {
    const tokens = normalize(query).split(" ").filter(Boolean);
    if (tokens.length === 0) {
        return [];
    }
    const titleQuery = normalize(query).trim();
    const matches = entries.filter((entry) => tokens.every((token) => entry.haystack.includes(token)));
    matches.sort((a, b) => score(b) - score(a));
    return matches.slice(0, limit).map((entry) => entry.funko);

    function score(entry: CatalogEntry): number {
        const title = normalize(entry.funko.title).trim();
        let value = 0;
        if (title === titleQuery) {
            value += 4;
        } else if (title.startsWith(titleQuery)) {
            value += 2;
        }
        if (tokens.every((token) => ` ${title} `.includes(` ${token}`))) {
            value += 1;
        }
        if (entry.funko.series.some((name) => name.startsWith("Pop!"))) {
            value += 0.5;
        }
        return value;
    }
}
