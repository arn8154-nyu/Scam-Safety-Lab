/* Scam-Safety Practice Lab, Sprint 2 (texts, emails, and phone calls)
   Practice engine for text-message, email, and phone-call scenarios.
   People choose what to practice on the home page: texts, emails, calls,
   or a mix of all three. Calls can be read aloud with the browser's own
   speech feature, so nothing is sent to an outside service.
   Scenarios live in scenarios.json and the app's words live in
   translations.json, both separate from this code, so messages and
   translations can be changed without touching the app.
   Language: instructions and feedback can be shown in English, Spanish, or
   Bengali. The practice messages themselves always stay in English, the way
   they would arrive on a real phone. People reading in Spanish or Bengali
   can choose to see a translation of the message underneath the English,
   but it never replaces the English text.
   Security note: every piece of text from the data files is placed on the
   page with textContent, never innerHTML, so nothing in them can run as code.
   Nothing the user chooses is stored or sent anywhere. The only things saved
   in the browser are the text-size and language settings. Read-aloud uses
   the browser's own speech, so the call text never leaves the device. */

(function () {
  "use strict";

  var DATA_URL = "scenarios.json";
  var WORDS_URL = "translations.json";
  var SIZE_KEY = "ssl-text-size";
  var LANG_KEY = "ssl-language";
  var LANGS = ["en", "es", "bn"];

  var sets = [];           // all sets from scenarios.json
  var textSets = [];       // texts: the main 12, then 12 new ones for a retry
  var emailSet = [];       // 8 emails
  var callSet = [];        // 8 phone calls
  var MIX_EACH = 4;        // the mix uses 4 of each kind (12 in all)
  var kind = "text";       // what the person chose: "text", "email", "call", or "mix"
  // "main" (texts, set 1), "round2" (texts, set 2), "textmix" (texts, mixed),
  // "email", "call", or "mix" (all three kinds)
  var mode = "main";
  var rounds = 0;          // how many times this kind has been practiced in a row
  var scenarios = [];      // the messages in the current practice
  var words = null;        // everything in translations.json
  var lang = "en";
  var current = 0;
  var answers = [];        // one entry per message: { isScam, correct }
  var lastChoice = null;   // the choice on the feedback screen, so it can be redrawn
  var translationOpen = { practice: false, feedback: false };
  var screenNow = "home";
  var loadFailed = false;

  function $(id) { return document.getElementById(id); }

  /* ---------- Words and numbers ---------- */

  // Look up a word in the current language, fall back to English, then
  // fill in any {placeholders}.
  function t(key, values) {
    var text = "";
    if (words) {
      var set = words[lang] || {};
      text = set[key] !== undefined ? set[key] : (words.en[key] || "");
    }
    if (values) {
      Object.keys(values).forEach(function (name) {
        text = text.split("{" + name + "}").join(values[name]);
      });
    }
    return text;
  }

  // Bengali uses its own digits.
  var BN_DIGITS = ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"];
  function num(n) {
    var s = String(n);
    if (lang !== "bn") { return s; }
    return s.replace(/[0-9]/g, function (d) { return BN_DIGITS[Number(d)]; });
  }

  // The parts of a scenario that get translated: the signs and the tip.
  function explain(scenario) {
    var tr = scenario.translations && scenario.translations[lang];
    if (lang !== "en" && tr) { return { signs: tr.signs, tip: tr.tip }; }
    return { signs: scenario.signs, tip: scenario.tip };
  }

  /* ---------- Screens ---------- */

  var screens = {
    home: $("screen-home"),
    lesson: $("screen-lesson"),
    practice: $("screen-practice"),
    feedback: $("screen-feedback"),
    done: $("screen-done")
  };
  var headings = {
    home: "home-title",
    lesson: "lesson-title",
    practice: "practice-title",
    feedback: "feedback-title",
    done: "done-title"
  };

  function show(name, keepFocus) {
    if (name !== screenNow && typeof stopSpeaking === "function") { stopSpeaking(); }
    screenNow = name;
    Object.keys(screens).forEach(function (key) {
      screens[key].hidden = key !== name;
    });
    if (keepFocus) { return; }
    window.scrollTo(0, 0);
    // Move keyboard and screen-reader focus to the new screen's heading.
    var heading = $(headings[name]);
    if (heading) { heading.focus(); }
  }

  /* ---------- Text size ---------- */

  function setTextSize(size) {
    var large = size === "large";
    document.documentElement.classList.toggle("text-large", large);
    $("size-normal").setAttribute("aria-pressed", String(!large));
    $("size-large").setAttribute("aria-pressed", String(large));
    try { localStorage.setItem(SIZE_KEY, size); } catch (e) { /* storage blocked: fine */ }
  }

  function loadTextSize() {
    var saved = null;
    try { saved = localStorage.getItem(SIZE_KEY); } catch (e) { saved = null; }
    setTextSize(saved === "large" ? "large" : "normal");
  }

  /* ---------- Language ---------- */

  // First visit: use the device's language if we have it, otherwise English.
  function startingLanguage() {
    var saved = null;
    try { saved = localStorage.getItem(LANG_KEY); } catch (e) { saved = null; }
    if (LANGS.indexOf(saved) !== -1) { return saved; }
    var device = (navigator.languages && navigator.languages[0]) || navigator.language || "en";
    var code = String(device).toLowerCase().slice(0, 2);
    return LANGS.indexOf(code) !== -1 ? code : "en";
  }

  function setLanguage(code, remember) {
    lang = LANGS.indexOf(code) !== -1 ? code : "en";
    // Tells screen readers and the browser which language the page is in.
    document.documentElement.lang = lang;
    Array.prototype.forEach.call(document.querySelectorAll(".lang-btn"), function (btn) {
      btn.setAttribute("aria-pressed", String(btn.getAttribute("data-lang") === lang));
    });
    if (remember) {
      try { localStorage.setItem(LANG_KEY, lang); } catch (e) { /* storage blocked: fine */ }
    }
    applyWords();
  }

  // Put the current language's words into every element marked data-i18n,
  // then redraw whatever screen is showing.
  function applyWords() {
    if (!words) { return; }
    Array.prototype.forEach.call(document.querySelectorAll("[data-i18n]"), function (el) {
      el.textContent = t(el.getAttribute("data-i18n"));
    });
    // Links whose address changes with the language (Spanish FTC pages, for example).
    Array.prototype.forEach.call(document.querySelectorAll("[data-href]"), function (el) {
      var url = t(el.getAttribute("data-href"));
      if (/^https:\/\//.test(url)) { el.setAttribute("href", url); }
    });
    $("lang-group").setAttribute("aria-label", t("language"));
    $("size-group").setAttribute("aria-label", t("textSize"));
    fillHow2();
    if (sets.length) { fillCounts(); }
    if (loadFailed) { $("load-status").textContent = t("loadError"); }

    if (screenNow === "practice") { drawPractice(); }
    if (screenNow === "feedback") { drawFeedback(); }
    if (screenNow === "done") { drawDone(); }
  }

  // How many practice items each choice on the home page has.
  function fillCounts() {
    $("count-text").textContent = t("countTexts", { n: num(textSets.length ? textSets[0].length : 0) });
    $("count-email").textContent = t("countEmails", { n: num(emailSet.length) });
    $("count-call").textContent = t("countCalls", { n: num(callSet.length) });
    $("count-mix").textContent = t("countMix", { n: num(MIX_EACH * 3) });
  }

  // "Choose {safe} or {suspicious}." with the two button names in bold.
  function fillHow2() {
    var item = $("how2");
    var parts = t("how2").split(/(\{safe\}|\{suspicious\})/);
    item.textContent = "";
    parts.forEach(function (part) {
      if (part === "{safe}" || part === "{suspicious}") {
        var strong = document.createElement("strong");
        strong.textContent = t(part === "{safe}" ? "looksSafe" : "seemsSuspicious");
        item.appendChild(strong);
      } else if (part) {
        item.appendChild(document.createTextNode(part));
      }
    });
  }

  /* ---------- Building a message card ---------- */

  // A call is written one speaker per paragraph: "Caller: ...", "You: ...".
  function callLines(text) {
    return String(text).split(/\n\s*\n/).map(function (part) {
      var m = part.match(/^([^:\n]{1,40}):\s*([\s\S]*)$/);
      return m ? { label: m[1], text: m[2] } : { label: "", text: part };
    });
  }

  function addLines(box, text, lineLang) {
    callLines(text).forEach(function (line) {
      var p = document.createElement("p");
      p.className = "call-line";
      if (lineLang) { p.lang = lineLang; }
      if (line.label) {
        var who = document.createElement("strong");
        who.textContent = line.label + ":";
        p.appendChild(who);
      }
      p.appendChild(document.createTextNode(line.text));
      box.appendChild(p);
    });
  }

  function el(tag, cls, text) {
    var node = document.createElement(tag);
    if (cls) { node.className = cls; }
    if (text !== undefined) { node.textContent = text; }
    return node;
  }

  function fillMessage(container, scenario) {
    container.textContent = "";

    // Everything inside the message card stays in English, like a real phone.
    container.lang = "en";

    if (scenario.channel === "email") {
      var efrom = el("p", "message-from");
      efrom.appendChild(document.createTextNode("From: "));
      efrom.appendChild(el("strong", "", scenario.sender));
      efrom.appendChild(document.createTextNode(" <" + scenario.senderAddress + ">"));
      var subject = el("p", "email-subject");
      subject.appendChild(document.createTextNode("Subject: "));
      subject.appendChild(el("strong", "", scenario.subject));
      container.appendChild(efrom);
      container.appendChild(subject);
      container.appendChild(el("p", "message-time", scenario.time));
      container.appendChild(el("div", "email-body", scenario.message));
      return;
    }

    if (scenario.channel === "call") {
      var head = el("div", "call-head");
      var icon = el("span", "call-icon");
      icon.setAttribute("aria-hidden", "true");
      icon.innerHTML = '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z"/></svg>';
      var who = el("div");
      who.appendChild(el("p", "call-label", "Incoming call"));
      who.appendChild(el("p", "call-from", scenario.sender));
      head.appendChild(icon);
      head.appendChild(who);
      container.appendChild(head);
      container.appendChild(el("p", "message-time", scenario.time));
      var transcript = el("div", "call-transcript");
      transcript.appendChild(el("p", "call-transcript-head", "What you hear:"));
      addLines(transcript, scenario.message);
      container.appendChild(transcript);
      return;
    }

    var from = document.createElement("p");
    from.className = "message-from";
    from.appendChild(document.createTextNode("From: "));
    var sender = document.createElement("strong");
    sender.textContent = scenario.sender;
    from.appendChild(sender);

    var bubble = document.createElement("p");
    bubble.className = "message-bubble";
    bubble.textContent = scenario.message;

    var time = document.createElement("p");
    time.className = "message-time";
    time.textContent = scenario.time;

    container.appendChild(from);
    container.appendChild(bubble);
    container.appendChild(time);
  }

  /* ---------- Which messages to practice ---------- */

  // A fresh mix of 6 scams and 6 safe messages from everything, used once
  // someone has already seen both sets.
  function shuffle(list) {
    var a = list.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = a[i]; a[i] = a[j]; a[j] = tmp;
    }
    return a;
  }

  // n scams and n safe ones, picked at random from a list.
  function pick(list, n) {
    var scams = shuffle(list.filter(function (s) { return s.isScam; })).slice(0, n);
    var safe = shuffle(list.filter(function (s) { return !s.isScam; })).slice(0, n);
    return scams.concat(safe);
  }

  // Texts only: a fresh mix of 6 scams and 6 safe from all 24 texts.
  function textMix() {
    var all = [];
    textSets.forEach(function (s) { all = all.concat(s); });
    return shuffle(pick(all, Math.floor(textSets[0].length / 2)));
  }

  // All three kinds: 4 texts, 4 emails, and 4 calls, always 6 scams and 6 safe.
  // Each kind gives 2 scams and 2 safe, so the 6/6 balance always holds.
  function allMix() {
    var all = [];
    textSets.forEach(function (s) { all = all.concat(s); });
    var half = MIX_EACH / 2;
    return shuffle(pick(all, half).concat(pick(emailSet, half), pick(callSet, half)));
  }

  /* ---------- Situation note (some safe messages depend on what you know) ---------- */

  function drawContext(scenario) {
    var box = $("practice-context");
    var tr = scenario.translations && scenario.translations[lang];
    var text = (lang !== "en" && tr && tr.context) ? tr.context : scenario.context;
    box.textContent = "";
    if (!text) { box.hidden = true; return; }
    var label = document.createElement("strong");
    label.textContent = t("contextLabel");
    box.appendChild(label);
    box.appendChild(document.createTextNode(text));
    box.hidden = false;
  }

  /* ---------- Optional translation of the message ---------- */

  // Shows a "Translate this message" button under the English message.
  // Nothing is translated until the person asks for it.
  function drawTranslation(slotId, which, scenario) {
    var slot = $(slotId);
    slot.textContent = "";
    var tr = scenario.translations && scenario.translations[lang];
    if (lang === "en" || !tr || !tr.message) {
      slot.hidden = true;
      return;
    }
    slot.hidden = false;
    var open = translationOpen[which];
    var panelId = slotId + "-panel";

    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "translate-btn";
    btn.setAttribute("aria-expanded", String(open));
    btn.setAttribute("aria-controls", panelId);
    btn.textContent = t(open ? "hideTranslation" :
      (scenario.channel === "call" ? "translateCall" : "translateMessage"));
    btn.addEventListener("click", function () {
      translationOpen[which] = !translationOpen[which];
      drawTranslation(slotId, which, scenario);
      var again = slot.querySelector(".translate-btn");
      if (again) { again.focus(); }
    });
    slot.appendChild(btn);

    var panel = document.createElement("div");
    panel.className = "translate-panel";
    panel.id = panelId;
    panel.hidden = !open;

    var label = document.createElement("p");
    label.className = "translate-label";
    label.textContent = t("translationLabel");

    panel.appendChild(label);
    if (scenario.channel === "email" && tr.subject) {
      var subject = el("p", "translated");
      subject.lang = lang;
      subject.appendChild(el("strong", "", t("subjectLabel") + " "));
      subject.appendChild(document.createTextNode(tr.subject));
      panel.appendChild(subject);
    }
    if (scenario.channel === "call") {
      addLines(panel, tr.message, lang);
    } else {
      var text = el("p", "translated", tr.message);
      text.lang = lang;
      panel.appendChild(text);
    }

    var note = el("p", "note", t("translationNote"));
    panel.appendChild(note);
    slot.appendChild(panel);
  }

  /* ---------- Practice round ---------- */

  // The first round of a kind, chosen on the home page.
  function firstMode(k) {
    if (k === "text") { return "main"; }
    return k;
  }

  // What the retry button on the results page starts next.
  function nextMode() {
    if (mode === "main" && textSets.length > 1) { return "round2"; }
    if (mode === "main" || mode === "round2" || mode === "textmix") { return "textmix"; }
    return mode;
  }

  function startRound(newMode) {
    stopSpeaking();
    rounds = newMode === mode ? rounds + 1 : 0;
    mode = newMode;
    if (mode === "round2") { scenarios = textSets[1]; }
    else if (mode === "textmix") { scenarios = textMix(); }
    else if (mode === "email") { scenarios = rounds ? shuffle(emailSet) : emailSet; }
    else if (mode === "call") { scenarios = rounds ? shuffle(callSet) : callSet; }
    else if (mode === "mix") { scenarios = allMix(); }
    else { scenarios = textSets[0]; }
    current = 0;
    answers = [];
    showPractice();
  }

  function countLabel(index) {
    var values = { i: num(index + 1), n: num(scenarios.length) };
    // "Round 2" is only mentioned for the retry with new text messages.
    if (mode === "round2") {
      values.r = num(2);
      return t("roundMessageCount", values);
    }
    if (mode === "email") { return t("emailCount", values); }
    if (mode === "call") { return t("callCount", values); }
    if (mode === "mix") { return t("mixCount", values); }
    return t("messageCount", values);
  }

  // Words that change with the kind of message on screen.
  var CHANNEL_WORDS = {
    text: { chip: "chipText", question: "question", note: "practiceNote" },
    email: { chip: "chipEmail", question: "questionEmail", note: "practiceNoteEmail" },
    call: { chip: "chipCall", question: "questionCall", note: "practiceNoteCall" }
  };
  function channelWords(scenario) {
    return CHANNEL_WORDS[scenario.channel] || CHANNEL_WORDS.text;
  }

  /* ---------- Read-aloud for phone calls ---------- */

  // Uses the browser's built-in speech (no outside service). The caller's
  // lines are read in English; "You:" lines are skipped because those are
  // the listener's own words. A second voice is read a little lower so the
  // two people on the call sound different.
  var speaking = false;
  function canSpeak() {
    return typeof window.speechSynthesis !== "undefined" &&
      typeof window.SpeechSynthesisUtterance !== "undefined";
  }

  function englishVoice() {
    var voices = [];
    try { voices = window.speechSynthesis.getVoices() || []; } catch (e) { voices = []; }
    var us = voices.filter(function (v) { return /^en[-_]US/i.test(v.lang); });
    var en = voices.filter(function (v) { return /^en/i.test(v.lang); });
    return us[0] || en[0] || null;
  }

  function stopSpeaking() {
    if (speaking && canSpeak()) { window.speechSynthesis.cancel(); }
    speaking = false;
    redrawListen();
  }

  function speakCall(scenario) {
    if (!canSpeak()) { return; }
    window.speechSynthesis.cancel();
    var voice = englishVoice();
    var lines = callLines(scenario.message).filter(function (line) {
      return !/^you$/i.test(line.label.trim());
    });
    var speakers = [];
    lines.forEach(function (line, index) {
      var u = new window.SpeechSynthesisUtterance(line.text);
      u.lang = "en-US";
      if (voice) { u.voice = voice; }
      if (speakers.indexOf(line.label) === -1) { speakers.push(line.label); }
      u.pitch = speakers.indexOf(line.label) === 1 ? 0.75 : 1;
      u.rate = /recorded/i.test(line.label) ? 0.9 : 0.95;
      if (index === lines.length - 1) {
        u.onend = function () { speaking = false; redrawListen(); };
        u.onerror = u.onend;
      }
      window.speechSynthesis.speak(u);
    });
    speaking = lines.length > 0;
    redrawListen();
  }

  var listenSlots = [];   // the listen areas on screen, so they can be redrawn
  function drawListen(slotId, scenario) {
    var slot = $(slotId);
    slot.textContent = "";
    listenSlots = listenSlots.filter(function (s) { return s.id !== slotId; });
    if (scenario.channel !== "call" || !canSpeak()) { slot.hidden = true; return; }
    listenSlots.push({ id: slotId, scenario: scenario });
    slot.hidden = false;

    var btn = el("button", "listen-btn");
    btn.type = "button";
    var icon = el("span");
    icon.setAttribute("aria-hidden", "true");
    icon.innerHTML = speaking ?
      '<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="6" width="12" height="12" rx="2"/></svg>' :
      '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5L6 9H2v6h4l5 4V5z"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/><path d="M19 5a10 10 0 0 1 0 14"/></svg>';
    btn.appendChild(icon);
    btn.appendChild(el("span", "", t(speaking ? "stopListening" : "listen")));
    btn.addEventListener("click", function () {
      if (speaking) { stopSpeaking(); } else { speakCall(scenario); }
      var again = slot.querySelector(".listen-btn");
      if (again) { again.focus(); }
    });
    slot.appendChild(btn);
    slot.appendChild(el("p", "listen-note", t("listenNote")));
  }

  function redrawListen() {
    listenSlots.slice().forEach(function (s) {
      var focused = document.activeElement && $(s.id).contains(document.activeElement);
      drawListen(s.id, s.scenario);
      if (focused) {
        var btn = $(s.id).querySelector(".listen-btn");
        if (btn) { btn.focus(); }
      }
    });
  }

  function drawPractice() {
    var scenario = scenarios[current];
    $("practice-count").textContent = countLabel(current);
    $("practice-fill").style.width = ((current + 1) / scenarios.length * 100) + "%";
    var cw = channelWords(scenario);
    $("practice-chip").textContent = t(cw.chip);
    $("practice-note").textContent = t(cw.note);
    $("practice-title").textContent = t(cw.question);
    drawContext(scenario);
    fillMessage($("practice-message"), scenario);
    drawListen("practice-listen", scenario);
    drawTranslation("practice-translate", "practice", scenario);
  }

  function showPractice() {
    translationOpen.practice = false;
    drawPractice();
    show("practice");
  }

  function answer(choice) {
    stopSpeaking();
    var scenario = scenarios[current];
    var saidScam = choice === "suspicious";
    var correct = saidScam === scenario.isScam;
    answers.push({ isScam: scenario.isScam, correct: correct });
    lastChoice = choice;
    translationOpen.feedback = false;
    drawFeedback();
    show("feedback");
  }

  /* ---------- Feedback ---------- */

  // Wording depends on two things: was the message a scam, and did the
  // user get it right. Safe messages get their own wording so the app
  // teaches people how to check, not just to distrust everything.
  function drawFeedback() {
    var scenario = scenarios[current];
    var correct = answers[current].correct;
    var key = (scenario.isScam ? "scam" : "safe") + (correct ? "Right" : "Wrong");
    var info = explain(scenario);

    $("feedback-count").textContent = countLabel(current);
    $("result-box").classList.toggle("is-wrong", !correct);
    $("feedback-title").textContent = t(key + "Title");
    $("feedback-choice").textContent = t("youChose", {
      choice: t(lastChoice === "suspicious" ? "seemsSuspicious" : "looksSafe")
    });
    $("feedback-note").textContent = t(key + "Note");

    $("signs-title").textContent = t(scenario.isScam ? "warningSigns" : "howYouCanTell");
    var list = $("signs-list");
    list.textContent = "";
    info.signs.forEach(function (sign) {
      var item = document.createElement("li");
      var text = document.createElement("p");
      var strong = document.createElement("strong");
      strong.textContent = sign.title;
      text.appendChild(strong);
      text.appendChild(document.createTextNode(" " + sign.detail));
      item.appendChild(text);
      list.appendChild(item);
    });

    $("tip-title").textContent = t(scenario.isScam ? "whatToDo" : "stillNotSure");
    $("tip-text").textContent = info.tip;

    fillMessage($("feedback-message"), scenario);
    drawListen("feedback-listen", scenario);
    drawTranslation("feedback-translate", "feedback", scenario);
    var last = current === scenarios.length - 1;
    $("next-btn").textContent = t(last ? "seeResults" : "next");
  }

  function next() {
    stopSpeaking();
    var again = screens.feedback.querySelector(".again");
    if (again) { again.open = false; }
    if (current < scenarios.length - 1) {
      current += 1;
      showPractice();
    } else {
      drawDone();
      show("done");
    }
  }

  /* ---------- Results ---------- */

  // Scams and safe messages are scored separately, the same way the
  // pre/post quiz will be, so we can see whether people get better at
  // telling them apart and not just more suspicious overall.
  function drawDone() {
    var total = answers.length;
    var right = 0, scamTotal = 0, scamRight = 0, safeTotal = 0, safeRight = 0;
    answers.forEach(function (a) {
      if (a.correct) { right += 1; }
      if (a.isScam) {
        scamTotal += 1;
        if (a.correct) { scamRight += 1; }
      } else {
        safeTotal += 1;
        if (a.correct) { safeRight += 1; }
      }
    });

    $("done-title").textContent = mode === "round2" ? t("doneTitleRound", { r: num(2) }) : t("doneTitle");
    // After the main 12, the retry gives 12 new messages (round 2).
    // After that, it gives a fresh mix from all the messages.
    var again = $("again-btn");
    var upNext = nextMode();
    if (upNext === "round2") {
      again.textContent = t("retryNew", { n: num(textSets[1].length) });
    } else if (upNext === "textmix") {
      again.textContent = t("retryMixTexts");
    } else if (upNext === "mix") {
      again.textContent = t("retryMix");
    } else {
      again.textContent = t("retrySame");
    }

    $("score-total").textContent = t("scoreTotal", { right: num(right), total: num(total) });
    $("score-scam").textContent = t("ofN", { a: num(scamRight), b: num(scamTotal) });
    $("score-safe").textContent = t("ofN", { a: num(safeRight), b: num(safeTotal) });
    $("bar-scam").style.width = (scamTotal ? scamRight / scamTotal * 100 : 0) + "%";
    $("bar-safe").style.width = (safeTotal ? safeRight / safeTotal * 100 : 0) + "%";
  }

  /* ---------- Loading the data files ---------- */

  function getJSON(url) {
    return fetch(url).then(function (response) {
      if (!response.ok) { throw new Error("HTTP " + response.status); }
      return response.json();
    });
  }

  function loadData() {
    var status = $("load-status");
    // Words load first so the page switches language as early as possible.
    getJSON(WORDS_URL)
      .then(function (data) {
        words = data;
        applyWords();
      })
      .catch(function () { words = null; /* English already in the page */ })
      .then(function () { return getJSON(DATA_URL); })
      .then(function (data) {
        sets = (data && data.sets) || [];
        textSets = sets.filter(function (s) { return (s.channel || "text") === "text"; })
          .map(function (s) { return s.scenarios; });
        sets.forEach(function (s) {
          if (s.channel === "email") { emailSet = emailSet.concat(s.scenarios); }
          if (s.channel === "call") { callSet = callSet.concat(s.scenarios); }
        });
        if (!textSets.length || !textSets[0].length) { throw new Error("No scenarios"); }
        scenarios = textSets[0];
        applyWords();
        if (!words) {
          $("count-text").textContent = textSets[0].length + " messages";
          $("count-email").textContent = emailSet.length + " emails";
          $("count-call").textContent = callSet.length + " calls";
          $("count-mix").textContent = (MIX_EACH * 3) + " texts, emails, and calls";
        }
        Array.prototype.forEach.call(document.querySelectorAll("[data-kind]"), function (btn) {
          var k = btn.getAttribute("data-kind");
          var empty = (k === "email" && !emailSet.length) || (k === "call" && !callSet.length) ||
            (k === "mix" && (!emailSet.length || !callSet.length));
          btn.disabled = empty;
        });
        status.textContent = "";
      })
      .catch(function () {
        loadFailed = true;
        status.textContent = words ? t("loadError") :
          "The practice messages didn't load. Check your internet connection, then refresh the page.";
      });
  }

  /* ---------- Wiring up the buttons ---------- */

  function init() {
    loadTextSize();
    lang = startingLanguage();
    document.documentElement.lang = lang;
    Array.prototype.forEach.call(document.querySelectorAll(".lang-btn"), function (btn) {
      btn.setAttribute("aria-pressed", String(btn.getAttribute("data-lang") === lang));
      btn.addEventListener("click", function () { setLanguage(btn.getAttribute("data-lang"), true); });
    });

    $("size-normal").addEventListener("click", function () { setTextSize("normal"); });
    $("size-large").addEventListener("click", function () { setTextSize("large"); });

    // People pick what to practice, then see the warning signs first.
    Array.prototype.forEach.call(document.querySelectorAll("[data-kind]"), function (btn) {
      btn.addEventListener("click", function () {
        kind = btn.getAttribute("data-kind");
        show("lesson");
      });
    });
    $("lesson-start-btn").addEventListener("click", function () {
      mode = "";
      startRound(firstMode(kind));
    });
    $("again-btn").addEventListener("click", function () { startRound(nextMode()); });
    $("next-btn").addEventListener("click", next);

    Array.prototype.forEach.call(document.querySelectorAll("[data-answer]"), function (btn) {
      btn.addEventListener("click", function () { answer(btn.getAttribute("data-answer")); });
    });
    Array.prototype.forEach.call(document.querySelectorAll("[data-go]"), function (btn) {
      btn.addEventListener("click", function () { show(btn.getAttribute("data-go")); });
    });

    loadData();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
