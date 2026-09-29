import {mkdir, readFile, writeFile} from "node:fs/promises";
import {existsSync} from "node:fs";

const SOURCE_URL = "https://raw.githubusercontent.com/kennymkchan/funko-pop-data/master/funko_pop.json";
const CACHE = new URL("./.cache/funko_pop.json", import.meta.url);
const OUTPUT = new URL("../public/funko-catalog.json", import.meta.url);
const IMAGE_PREFIX = "https://images.hobbydb.com/processed_uploads/catalog_item_photo/catalog_item_photo/image/";

async function loadSource() {
    if (existsSync(CACHE)) {
        return JSON.parse(await readFile(CACHE, "utf8"));
    }
    const response = await fetch(SOURCE_URL);
    if (!response.ok) {
        throw new Error(`Download failed (HTTP ${response.status})`);
    }
    const text = await response.text();
    await mkdir(new URL("./.cache/", import.meta.url), {recursive: true});
    await writeFile(CACHE, text);
    return JSON.parse(text);
}

const source = await loadSource();
const seriesIndex = new Map();
const byHandle = new Map();

for (const entry of source) {
    const title = entry.title?.trim();
    if (!title) {
        continue;
    }
    const key = entry.handle || title.toLowerCase();
    const existing = byHandle.get(key);
    const series = (entry.series ?? []).map((name) => {
        if (!seriesIndex.has(name)) {
            seriesIndex.set(name, seriesIndex.size);
        }
        return seriesIndex.get(name);
    });
    if (existing) {
        for (const index of series) {
            if (!existing[3].includes(index)) {
                existing[3].push(index);
            }
        }
        continue;
    }
    const image = entry.imageName ?? "";
    const imageSuffix = image.startsWith(IMAGE_PREFIX) ? image.slice(IMAGE_PREFIX.length) : image;
    byHandle.set(key, [title, entry.handle ?? "", imageSuffix, series]);
}

const items = [...byHandle.values()].sort((a, b) => a[0].localeCompare(b[0]));
const catalog = {
    source: SOURCE_URL,
    imagePrefix: IMAGE_PREFIX,
    series: [...seriesIndex.keys()],
    items,
};
await writeFile(OUTPUT, JSON.stringify(catalog));
console.log(`Wrote ${items.length} items and ${catalog.series.length} series to public/funko-catalog.json`);
