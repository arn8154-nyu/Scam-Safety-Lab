/* Scam-Safety Practice Lab, Sprint 2 (language option)
   Practice engine for text-message scenarios.
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
   in the browser are the text-size and language settings. */

(function () {
  "use strict";

  var DATA_URL = "scenarios.json";
  var WORDS_URL = "translations.json";
  var SIZE_KEY = "ssl-text-size";
  var LANG_KEY = "ssl-language";
  var LANGS = ["en", "es", "bn"];

  var sets = [];           // set 1: the main 12 messages; set 2: 12 new ones for a retry
  var mode = "main";       // "main" (set 1), "round2" (set 2), or "mix" (a mix of both)
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
    if (sets.length) {
      $("home-count").textContent = t("homeCount", { n: num(sets[0].scenarios.length) });
    }
    if (loadFailed) { $("load-status").textContent = t("loadError"); }

    if (screenNow === "practice") { drawPractice(); }
    if (screenNow === "feedback") { drawFeedback(); }
    if (screenNow === "done") { drawDone(); }
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

  function fillMessage(container, scenario) {
    container.textContent = "";

    // Everything inside the message card stays in English, like a real phone.
    container.lang = "en";

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

  function mixedSet() {
    var all = [];
    sets.forEach(function (s) { all = all.concat(s.scenarios); });
    var half = Math.floor(sets[0].scenarios.length / 2);
    var scams = shuffle(all.filter(function (s) { return s.isScam; })).slice(0, half);
    var safe = shuffle(all.filter(function (s) { return !s.isScam; })).slice(0, half);
    return shuffle(scams.concat(safe));
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
    btn.textContent = t(open ? "hideTranslation" : "translateMessage");
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

    var text = document.createElement("p");
    text.className = "translated";
    text.lang = lang;
    text.textContent = tr.message;

    var note = document.createElement("p");
    note.className = "note";
    note.textContent = t("translationNote");

    panel.appendChild(label);
    panel.appendChild(text);
    panel.appendChild(note);
    slot.appendChild(panel);
  }

  /* ---------- Practice round ---------- */

  function startRound(newMode) {
    mode = newMode;
    if (mode === "round2") { scenarios = sets[1].scenarios; }
    else if (mode === "mix") { scenarios = mixedSet(); }
    else { scenarios = sets[0].scenarios; }
    current = 0;
    answers = [];
    showPractice();
  }

  function countLabel(index) {
    // "Round 2" is only mentioned for the retry with new messages.
    if (mode === "round2") {
      return t("roundMessageCount", { r: num(2), i: num(index + 1), n: num(scenarios.length) });
    }
    return t("messageCount", { i: num(index + 1), n: num(scenarios.length) });
  }

  function drawPractice() {
    var scenario = scenarios[current];
    $("practice-count").textContent = countLabel(current);
    $("practice-fill").style.width = ((current + 1) / scenarios.length * 100) + "%";
    drawContext(scenario);
    fillMessage($("practice-message"), scenario);
    drawTranslation("practice-translate", "practice", scenario);
  }

  function showPractice() {
    translationOpen.practice = false;
    drawPractice();
    show("practice");
  }

  function answer(choice) {
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
    drawTranslation("feedback-translate", "feedback", scenario);
    var last = current === scenarios.length - 1;
    $("next-btn").textContent = t(last ? "seeResults" : "next");
  }

  function next() {
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
    if (mode === "main" && sets.length > 1) {
      again.textContent = t("retryNew", { n: num(sets[1].scenarios.length) });
    } else {
      again.textContent = t("retryMix");
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
        if (!sets.length && data && data.scenarios) { sets = [{ scenarios: data.scenarios }]; }
        if (!sets.length || !sets[0].scenarios.length) { throw new Error("No scenarios"); }
        scenarios = sets[0].scenarios;
        applyWords();
        if (!words) {
          $("home-count").textContent = scenarios.length + " practice messages, about 10 minutes";
        }
        $("start-btn").disabled = false;
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

    // First time through, people see the warning signs before practicing.
    $("start-btn").addEventListener("click", function () { show("lesson"); });
    $("lesson-start-btn").addEventListener("click", function () { startRound("main"); });
    $("again-btn").addEventListener("click", function () {
      startRound(mode === "main" && sets.length > 1 ? "round2" : "mix");
    });
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
