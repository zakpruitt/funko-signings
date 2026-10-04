# Funko Signings

Track which Funko Pops you want signed, by which voice actor, with what quote, and at which con.
Color parts of the quote to show the actor which pen to use for each part.

Live at https://zakpruitt.github.io/funko-signings/. All data stays in your browser's localStorage.
Use the Backup page to export or import it.

## Develop

```
npm install
npm run dev
npm run deploy   # build + publish dist/ to the gh-pages branch
```

## Data

- `public/funko-catalog.json`: built by `npm run catalog` from the MIT-licensed
  [kennymkchan/funko-pop-data](https://github.com/kennymkchan/funko-pop-data) set (~17.7k unique items, up to about 2021).
  Pops newer than that can be added by hand in the app.
- `public/voice-credits.json`: built by `python scripts/build-voice-credits.py [path/to/data-pages]`
  from the voice guides in the [data-pages](https://github.com/zakpruitt/data-pages) repo. It powers the
  "who voices this character" suggestions.

<!-- portfolio
name: Funko Signings
year: 2026
order: 3
tags: TypeScript, Vite, localStorage
summary: Tracks which Funko Pops to get signed, by which voice actor, and at which con. Quotes are
  color-coded so the actor knows which pen to use for each part.
-->
