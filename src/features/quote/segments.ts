import type {Segment} from "../../state/types";

export const DEFAULT_INK = "#111111";

export function normalizeSegments(segments: Segment[]): Segment[] {
    const merged: Segment[] = [];
    for (const segment of segments) {
        if (segment.text === "") {
            continue;
        }
        const previous = merged[merged.length - 1];
        if (previous && previous.color === segment.color) {
            previous.text += segment.text;
        } else {
            merged.push({text: segment.text, color: segment.color});
        }
    }
    return merged;
}

export function plainText(segments: Segment[]): string {
    return segments.map((segment) => segment.text).join("");
}

export function sliceSegments(segments: Segment[], start: number, end: number): Segment[] {
    const sliced: Segment[] = [];
    let position = 0;
    for (const segment of segments) {
        const segmentStart = position;
        const segmentEnd = position + segment.text.length;
        position = segmentEnd;
        const from = Math.max(start, segmentStart);
        const to = Math.min(end, segmentEnd);
        if (from < to) {
            sliced.push({text: segment.text.slice(from - segmentStart, to - segmentStart), color: segment.color});
        }
    }
    return sliced;
}

export function replaceRange(segments: Segment[], start: number, end: number, insert: Segment[]): Segment[] {
    const length = plainText(segments).length;
    return normalizeSegments([
        ...sliceSegments(segments, 0, start),
        ...insert,
        ...sliceSegments(segments, end, length),
    ]);
}

export function applyColor(segments: Segment[], start: number, end: number, color: string): Segment[] {
    const recolored = sliceSegments(segments, start, end).map((segment) => ({...segment, color}));
    return replaceRange(segments, start, end, recolored);
}

export function colorAt(segments: Segment[], offset: number): string | null {
    let position = 0;
    for (const segment of segments) {
        position += segment.text.length;
        if (offset <= position && offset > position - segment.text.length) {
            return segment.color;
        }
    }
    return segments[0]?.color ?? null;
}

export function segmentsEqual(a: Segment[], b: Segment[]): boolean {
    return a.length === b.length &&
        a.every((segment, index) => segment.text === b[index].text && segment.color === b[index].color);
}

function isBlock(element: Element): boolean {
    return element.tagName === "DIV" || element.tagName === "P";
}

function collectSegments(node: Node, root: Node, fallbackColor: string, out: Segment[]): void {
    if (node.nodeType === Node.TEXT_NODE) {
        out.push({text: node.textContent ?? "", color: fallbackColor});
        return;
    }
    if (!(node instanceof Element) && node.nodeType !== Node.DOCUMENT_FRAGMENT_NODE) {
        return;
    }
    let color = fallbackColor;
    if (node instanceof HTMLElement && node !== root) {
        if (node.tagName === "BR") {
            out.push({text: "\n", color: fallbackColor});
            return;
        }
        color = node.dataset.color ?? color;
        if (isBlock(node) && out.length > 0) {
            out.push({text: "\n", color});
        }
    }
    node.childNodes.forEach((child) => collectSegments(child, root, color, out));
}

export function segmentsFromDom(root: Node): Segment[] {
    const out: Segment[] = [];
    collectSegments(root, root, DEFAULT_INK, out);
    return normalizeSegments(out);
}

export function renderSegmentsToDom(root: HTMLElement, segments: Segment[]): void {
    root.replaceChildren(...segments.map((segment) => {
        const span = document.createElement("span");
        span.dataset.color = segment.color;
        span.style.color = segment.color;
        span.textContent = segment.text;
        return span;
    }));
    if (plainText(segments).endsWith("\n")) {
        root.append(document.createElement("br"));
    }
}

function textLengthBefore(root: HTMLElement, node: Node, offset: number): number {
    const range = document.createRange();
    range.setStart(root, 0);
    range.setEnd(node, offset);
    const fragment = range.cloneContents();
    const out: Segment[] = [];
    collectSegments(fragment, fragment, DEFAULT_INK, out);
    return plainText(out).length;
}

export function getSelectionOffsets(root: HTMLElement): {start: number; end: number} | null {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
        return null;
    }
    const range = selection.getRangeAt(0);
    if (!root.contains(range.startContainer) || !root.contains(range.endContainer)) {
        return null;
    }
    return {
        start: textLengthBefore(root, range.startContainer, range.startOffset),
        end: textLengthBefore(root, range.endContainer, range.endOffset),
    };
}

function locate(root: HTMLElement, target: number): {node: Node; offset: number} {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let remaining = target;
    let last: Text | null = null;
    for (let node = walker.nextNode() as Text | null; node; node = walker.nextNode() as Text | null) {
        const length = node.data.length;
        if (remaining <= length) {
            return {node, offset: remaining};
        }
        remaining -= length;
        last = node;
    }
    if (last) {
        return {node: last, offset: last.data.length};
    }
    return {node: root, offset: 0};
}

export function setSelectionOffsets(root: HTMLElement, start: number, end: number): void {
    const selection = window.getSelection();
    if (!selection) {
        return;
    }
    const from = locate(root, start);
    const to = locate(root, end);
    const range = document.createRange();
    range.setStart(from.node, from.offset);
    range.setEnd(to.node, to.offset);
    selection.removeAllRanges();
    selection.addRange(range);
}
