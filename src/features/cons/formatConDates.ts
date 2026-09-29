import type {Con} from "../../state/types";

function parseDate(value: string): Date {
    const [year, month, day] = value.split("-").map(Number);
    return new Date(year, month - 1, day);
}

export function formatConDates(con: Con): string {
    if (!con.start) {
        return "Dates TBA";
    }
    const start = parseDate(con.start);
    const end = con.end && con.end !== con.start ? parseDate(con.end) : null;
    const monthDay: Intl.DateTimeFormatOptions = {month: "short", day: "numeric"};
    if (!end) {
        return start.toLocaleDateString(undefined, {...monthDay, year: "numeric"});
    }
    if (start.getFullYear() === end.getFullYear() && start.getMonth() === end.getMonth()) {
        return `${start.toLocaleDateString(undefined, monthDay)}–${end.getDate()}, ${end.getFullYear()}`;
    }
    return `${start.toLocaleDateString(undefined, monthDay)} – ${end.toLocaleDateString(undefined, {...monthDay, year: "numeric"})}`;
}
