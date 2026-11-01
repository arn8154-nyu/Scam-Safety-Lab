# Scam-Safety Practice Lab

A free web app where older adults practice spotting scam text messages in a safe place. Users read a realistic message, decide whether it looks safe or suspicious, and get feedback that explains the warning signs (for scams) or how to tell a message is real (for safe ones), plus one thing to do next.

Senior Project, NYU School of Professional Studies, Fall 2026.

## Sprint 2, part 1: language option, intro, warning-signs lesson, and help resources (this version)

- A short lesson screen before the first round teaches 4 warning signs (rushes or scares you; wants you to tap a link; you didn't sign up for it; asks for money, gift cards, passwords, or secrecy), the safe way to check, and a reminder that real messages exist too. Added after the first user test, where the tester asked how she could know a message is a scam if she had never seen one
- A "Learn more and get help" section on the results screen: forward scam texts to 7726, report to the FTC (Spanish users get ReporteFraude.ftc.gov and the FTC's Spanish guide), the FTC guide to spotting scam texts, and the free AARP Fraud Watch Network Helpline (877-908-3360, translation available) with a tap-to-call button
- The fake delivery scenario's third sign now explains that delivery companies only text about a problem if you signed up for updates, so expecting a package doesn't make a text real (the scenario the first tester missed)

- A "Why practice?" section on the home page explains what scam texts are, how common they are (FTC: $470 million reported lost to text scams in 2024; fake package delivery texts were the most reported kind), and why practicing helps. Added after the first user test, where the tester needed the purpose explained before starting

- Instructions, buttons, feedback, and results can be shown in English, Español, or বাংলা (Bengali)
- The practice messages stay in English on purpose, the way real scam texts arrive, and the app says so
- In Spanish or Bengali, a "Translate this message" button can show a translation underneath the English message. It is closed by default and never replaces the English, so people still learn what the English version looks like. Links, phone numbers, and company names stay as they are
- A note (in the chosen language) explains that scam texts usually arrive in English and suggests using the phone's or computer's translation feature, or a translation app or website, for real messages, copying only the words and never tapping links
- Language buttons are written in their own language, so anyone can find theirs
- The choice is remembered in the browser; on a first visit the app uses the device's language if it's Spanish or Bengali
- Bengali uses Bengali digits and Noto Sans Bengali, since Atkinson Hyperlegible has no Bengali letters
- The page's language tag changes with the setting, and the English messages are tagged as English, so screen readers pronounce both correctly
- Spanish and Bengali translations still need review by native speakers

## Sprint 1

- Six practice text messages: three scams and three safe messages, in alternating order
- Feedback for all four outcomes (scam caught, scam missed, safe recognized, safe flagged)
- Results that score scams and safe messages separately
- Text-size control (A / A+), large buttons, one task per screen
- Phone-first layout that switches to two columns on laptops and tablets
- Light and dark mode, following the device setting

Coming next: email and phone-call scenarios with read-aloud, a saved progress tracker, and a full accessibility check.

## How it's built

Plain HTML, CSS, and JavaScript, with no frameworks and no build step. It's hosted on GitHub Pages.

| File | What it does |
|---|---|
| `index.html` | The page structure: home, practice, feedback, and results screens |
| `styles.css` | Layout, colors, text sizes, and the phone and laptop layouts |
| `app.js` | Loads the scenarios, runs the practice round, shows feedback, and counts results |
| `scenarios.json` | The practice messages and their feedback, kept separate from the code. Each scenario has a `translations` section with Spanish and Bengali versions of its message, signs, and tip |
| `translations.json` | Every word the app shows (buttons, instructions, feedback, results) in English, Spanish, and Bengali |
| `atkinson-hyperlegible-*.woff2` | Atkinson Hyperlegible, a typeface designed for readers with low vision (license in `OFL-LICENSE.txt`) |
| `noto-sans-bengali-*.woff2` | Noto Sans Bengali, used only for Bengali letters (license in `NOTO-OFL-LICENSE.txt`) |

## Adding a scenario

Add an entry to `scenarios.json` with `id`, `channel`, `isScam` (true or false), `category`, `sender`, `time`, `message`, three `signs` (each with a `title` and `detail`), a `tip`, and a `translations` section with `es` and `bn` versions of the message, signs, and tip. All names, numbers, and websites in scenarios are fictional.

## Privacy and security

- No accounts, and no personal information is collected.
- Answers are not saved or sent anywhere. The only things stored in the browser are the text-size and language settings.
- Fonts are hosted with the app, so the page makes no requests to other websites.
- A Content Security Policy only allows the app's own files to load.
- Scenario text is shown with `textContent`, never as HTML, so nothing in the data file can run as code.

## Running it

GitHub Pages serves the site directly from this repository. To test on your own computer, the files need to be served by a local web server (for example, the Live Server extension in VS Code), because browsers block loading `scenarios.json` when you open `index.html` straight from a folder.
