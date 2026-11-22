# Scam-Safety Practice Lab

A free web app where older adults practice spotting scam text messages, emails, and phone calls in a safe place. Users read a realistic message or call, decide whether it looks safe or suspicious, and get feedback that explains the warning signs (for scams) or how to tell a message is real (for safe ones), plus one thing to do next.

Senior Project, NYU School of Professional Studies, Fall 2026.

## Sprint 2, part 2: emails, phone calls, and a full accessibility check (this version)

- The home page now asks what to practice: **Text messages** (12, then 12 new ones on retry), **Emails** (8), **Phone calls** (8), or **A mix of all three** (12: 4 texts, 4 emails, and 4 calls, always 6 scams and 6 safe, freshly picked each time)
- 8 practice emails (4 scams, 4 safe): a fake antivirus renewal charge, a lookalike store website, a gift-card favor from someone pretending to be a person you know, and a fake tax refund; plus a real order notice, bank statement, newsletter, and patient-portal notice
- 8 practice phone calls (4 scams, 4 safe): a "grandchild in trouble" call (with a note that voices can be copied with AI), a fake bank fraud call asking for a code, a fake tech-support call, and a fake Social Security robocall; plus a real pharmacy call, appointment confirmation, bank fraud alert, and a call from a family member
- Real and fake pairs across kinds (for example, a fake Chase call asking for a code and a real Chase alert that only asks yes or no), so the app teaches how to check, not to distrust everything
- Emails show the sender's name and full address, the subject, and the body. Calls show the caller ID and what you hear, one speaker per line
- **Listen to the call:** calls can be read aloud in English with the device's built-in voice (the browser's speech feature, so nothing is sent to an outside service). The second person on a call is read in a lower voice, and the listener's own lines are skipped
- Emails and calls stay in English like the texts, with the same optional "Translate" button (email translations include the subject)
- The 4 warning signs, the safe way to check, and the results page now cover texts, emails, and calls (for example, "Caller ID and email names can be faked")
- Real bank and pharmacy names (Chase, Capital One, CVS, Walgreens) replace the made-up ones, with their real text short codes where shown, and a note on the home page that the app isn't connected to these companies

## Sprint 2, part 1: language option, intro, warning-signs lesson, help resources, and more practice

- The main practice is now 12 text messages (6 scams, 6 safe) in one set, including real/fake pairs from the same company (delivery, family, bank)
- The results page has a retry button. The first retry gives 12 new messages the person hasn't seen (shown as "Round 2"). After that, retrying gives a fresh mix of 6 scams and 6 safe messages from all 24
- Some safe messages are only safe because of what the person already knows, so scenarios can include a "Situation" note shown above the message (for example, "You just opened your bank's app and are signing in")
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

- Six practice text messages: three scams and three safe messages (now part of the 12-message main set)
- Feedback for all four outcomes (scam caught, scam missed, safe recognized, safe flagged)
- Results that score scams and safe messages separately
- Text-size control (A / A+), large buttons, one task per screen
- Phone-first layout that switches to two columns on laptops and tablets
- Light and dark mode, following the device setting

Coming next: a pre/post quiz for testing, and a saved progress tracker.

## How it's built

Plain HTML, CSS, and JavaScript, with no frameworks and no build step. It's hosted on GitHub Pages.

| File | What it does |
|---|---|
| `index.html` | The page structure: home, practice, feedback, and results screens |
| `styles.css` | Layout, colors, text sizes, and the phone and laptop layouts |
| `app.js` | Loads the scenarios, runs the practice round, shows feedback, and counts results |
| `scenarios.json` | The practice texts, emails, and calls with their feedback, kept separate from the code. Sets: two sets of 12 texts (main practice and retry), 8 emails, and 8 calls. Each scenario has a `translations` section with Spanish and Bengali versions of its message, signs, tip, and (for emails) subject |
| `translations.json` | Every word the app shows (buttons, instructions, feedback, results) in English, Spanish, and Bengali |
| `atkinson-hyperlegible-*.woff2` | Atkinson Hyperlegible, a typeface designed for readers with low vision (license in `OFL-LICENSE.txt`) |
| `noto-sans-bengali-*.woff2` | Noto Sans Bengali, used only for Bengali letters (license in `NOTO-OFL-LICENSE.txt`) |

## Adding a scenario

Add an entry to a set's `scenarios` list in `scenarios.json` with `id`, `channel` (`text`, `email`, or `call`), `isScam` (true or false), `category`, `sender`, `time`, `message`, three `signs` (each with a `title` and `detail`), a `tip`, an optional `context` (the situation the person is in), and a `translations` section with `es` and `bn` versions of the message, signs, tip, and context. Emails also need `senderAddress` and `subject`. Calls are written one speaker per paragraph, each starting with a label such as `Caller:` or `You:`. People, phone numbers, and scam websites in scenarios are made up; real company names appear only to show what real and fake messages look like.

## Privacy and security

- No accounts, and no personal information is collected.
- Answers are not saved or sent anywhere. The only things stored in the browser are the text-size and language settings.
- Read-aloud uses the browser's built-in speech, so call text never leaves the device.
- Fonts are hosted with the app, so the page makes no requests to other websites.
- A Content Security Policy only allows the app's own files to load.
- Scenario text is shown with `textContent`, never as HTML, so nothing in the data file can run as code.

## Running it

GitHub Pages serves the site directly from this repository. To test on your own computer, the files need to be served by a local web server (for example, the Live Server extension in VS Code), because browsers block loading `scenarios.json` when you open `index.html` straight from a folder.

## Accessibility check (November 15, 2026)

- **axe-core 4** (WCAG 2.0, 2.1, and 2.2 A and AA rules) on every screen (home, lesson, practice, feedback with the message shown again, results), for texts, emails, calls, and the mix, in English, Spanish, and Bengali, at phone (390×844) and laptop (1280×800) sizes: 92 screen checks, 0 violations
- **Lighthouse 12** on the home page: Accessibility 100 (phone and desktop), Best Practices 96, Performance 93 (phone) and 100 (desktop) on a local test server
- **Keyboard only:** every choice, the lesson, and practice can be reached and used with Tab and Enter; focus moves to each new screen's heading
- **Reflow:** no sideways scrolling at 320 px wide with large text (A+) in Bengali, the longest language, across all practice items and screens
- Still to do: a WAVE check on the live site and a screen-reader pass (VoiceOver on iPhone)
