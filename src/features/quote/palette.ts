export interface Ink {
    name: string;
    color: string;
}

export const INKS: Ink[] = [
    {name: "Black", color: "#111111"},
    {name: "Silver", color: "#b9bec6"},
    {name: "Gold", color: "#d4a72c"},
    {name: "White", color: "#ffffff"},
    {name: "Red", color: "#d32f2f"},
    {name: "Blue", color: "#1e63d6"},
    {name: "Green", color: "#2e9b4e"},
    {name: "Purple", color: "#7e3fc7"},
    {name: "Pink", color: "#e24a9b"},
    {name: "Orange", color: "#ef7d1a"},
];

export function inkName(color: string): string {
    return INKS.find((ink) => ink.color.toLowerCase() === color.toLowerCase())?.name ?? color.toUpperCase();
}
