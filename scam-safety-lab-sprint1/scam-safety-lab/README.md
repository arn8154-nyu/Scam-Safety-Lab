# Scam-Safety Practice Lab

A free web app where older adults practice spotting scam text messages in a safe place. Users read a realistic message, decide whether it looks safe or suspicious, and get feedback that explains the warning signs (for scams) or how to tell a message is real (for safe ones), plus one thing to do next.

Senior Project, NYU School of Professional Studies, Fall 2026.

## Sprint 1 (this version)

- Six practice text messages: three scams and three safe messages, in alternating order
- Feedback for all four outcomes (scam caught, scam missed, safe recognized, safe flagged)
- Results that score scams and safe messages separately
- Text-size control (A / A+), large buttons, one task per screen
- Phone-first layout that switches to two columns on laptops and tablets
- Light and dark mode, following the device setting

Coming in later sprints: email and phone-call scenarios with read-aloud, a saved progress tracker, a language option for instructions and feedback, and a full accessibility check.

## How it's built

Plain HTML, CSS, and JavaScript, with no frameworks and no build step. It's hosted on GitHub Pages.

| File | What it does |
|---|---|
| `index.html` | The page structure: home, practice, feedback, and results screens |
| `styles.css` | Layout, colors, text sizes, and the phone and laptop layouts |
| `app.js` | Loads the scenarios, runs the practice round, shows feedback, and counts results |
| `data/scenarios.json` | The practice messages and their feedback, kept separate from the code |
| `fonts/` | Atkinson Hyperlegible, a typeface designed for readers with low vision (SIL Open Font License) |

## Adding a scenario

Add an entry to `data/scenarios.json` with `id`, `channel`, `isScam` (true or false), `category`, `sender`, `time`, `message`, three `signs` (each with a `title` and `detail`), and a `tip`. All names, numbers, and websites in scenarios are fictional.

## Privacy and security

- No accounts, and no personal information is collected.
- Answers are not saved or sent anywhere. The only thing stored in the browser is the text-size setting.
- Fonts are hosted with the app, so the page makes no requests to other websites.
- A Content Security Policy only allows the app's own files to load.
- Scenario text is shown with `textContent`, never as HTML, so nothing in the data file can run as code.

## Running it

GitHub Pages serves the site directly from this repository. To test on your own computer, the files need to be served by a local web server (for example, the Live Server extension in VS Code), because browsers block loading `data/scenarios.json` when you open `index.html` straight from a folder.
