/* Scam-Safety Practice Lab, Sprint 1
   Practice engine for text-message scenarios.
   Scenarios live in data/scenarios.json, separate from this code, so new
   messages can be added without changing the app.
   Security note: every piece of scenario text is placed on the page with
   textContent, never innerHTML, so text in the data file can't run as code.
   Nothing the user chooses is stored or sent anywhere. The only thing saved
   in the browser is the text-size setting. */

(function () {
  "use strict";

  var DATA_URL = "data/scenarios.json";
  var SIZE_KEY = "ssl-text-size";

  var scenarios = [];
  var current = 0;
  var answers = []; // one entry per message: { isScam, correct }

  function $(id) { return document.getElementById(id); }

  /* ---------- Screens ---------- */

  var screens = {
    home: $("screen-home"),
    practice: $("screen-practice"),
    feedback: $("screen-feedback"),
    done: $("screen-done")
  };
  var headings = {
    home: "home-title",
    practice: "practice-title",
    feedback: "feedback-title",
    done: "done-title"
  };

  function show(name) {
    Object.keys(screens).forEach(function (key) {
      screens[key].hidden = key !== name;
    });
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

  /* ---------- Building a message card ---------- */

  function fillMessage(container, scenario) {
    container.textContent = "";

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

  /* ---------- Practice round ---------- */

  function startRound() {
    current = 0;
    answers = [];
    showPractice();
  }

  function countLabel(index) {
    return "Message " + (index + 1) + " of " + scenarios.length;
  }

  function showPractice() {
    var scenario = scenarios[current];
    $("practice-count").textContent = countLabel(current);
    $("practice-fill").style.width = ((current + 1) / scenarios.length * 100) + "%";
    fillMessage($("practice-message"), scenario);
    show("practice");
  }

  function answer(choice) {
    var scenario = scenarios[current];
    var saidScam = choice === "suspicious";
    var correct = saidScam === scenario.isScam;
    answers.push({ isScam: scenario.isScam, correct: correct });
    showFeedback(scenario, choice, correct);
  }

  /* ---------- Feedback ---------- */

  // Wording depends on two things: was the message a scam, and did the
  // user get it right. Safe messages get their own wording so the app
  // teaches people how to check, not just to distrust everything.
  var WORDING = {
    scamRight: { title: "Good catch. This is a scam.", note: "" },
    scamWrong: { title: "Careful. This one is a scam.", note: "Scams like this can look real. Here's what gives it away." },
    safeRight: { title: "That's right. This one is safe.", note: "" },
    safeWrong: { title: "Not quite. This one was safe.", note: "Being careful is a good habit. Here's how you could tell this message was real." }
  };

  function showFeedback(scenario, choice, correct) {
    var key = (scenario.isScam ? "scam" : "safe") + (correct ? "Right" : "Wrong");
    var words = WORDING[key];

    $("feedback-count").textContent = countLabel(current);
    $("result-box").classList.toggle("is-wrong", !correct);
    $("feedback-title").textContent = words.title;
    $("feedback-choice").textContent = "You chose: " + (choice === "suspicious" ? "Seems suspicious" : "Looks safe");
    $("feedback-note").textContent = words.note;

    $("signs-title").textContent = scenario.isScam ? "Warning signs" : "How you can tell";
    var list = $("signs-list");
    list.textContent = "";
    scenario.signs.forEach(function (sign) {
      var item = document.createElement("li");
      var text = document.createElement("p");
      var strong = document.createElement("strong");
      strong.textContent = sign.title;
      text.appendChild(strong);
      text.appendChild(document.createTextNode(" " + sign.detail));
      item.appendChild(text);
      list.appendChild(item);
    });

    $("tip-title").textContent = scenario.isScam ? "What to do instead" : "Still not sure?";
    $("tip-text").textContent = scenario.tip;

    fillMessage($("feedback-message"), scenario);
    var again = screens.feedback.querySelector(".again");
    if (again) { again.open = false; }

    var last = current === scenarios.length - 1;
    $("next-btn").textContent = last ? "See my results" : "Next message";
    show("feedback");
  }

  function next() {
    if (current < scenarios.length - 1) {
      current += 1;
      showPractice();
    } else {
      showDone();
    }
  }

  /* ---------- Results ---------- */

  // Scams and safe messages are scored separately, the same way the
  // pre/post quiz will be, so we can see whether people get better at
  // telling them apart and not just more suspicious overall.
  function showDone() {
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

    $("score-total").textContent = "You got " + right + " of " + total + " right";
    $("score-scam").textContent = scamRight + " of " + scamTotal;
    $("score-safe").textContent = safeRight + " of " + safeTotal;
    $("bar-scam").style.width = (scamTotal ? scamRight / scamTotal * 100 : 0) + "%";
    $("bar-safe").style.width = (safeTotal ? safeRight / safeTotal * 100 : 0) + "%";
    show("done");
  }

  /* ---------- Loading the scenarios ---------- */

  function loadScenarios() {
    var status = $("load-status");
    fetch(DATA_URL)
      .then(function (response) {
        if (!response.ok) { throw new Error("HTTP " + response.status); }
        return response.json();
      })
      .then(function (data) {
        scenarios = (data && data.scenarios) || [];
        if (!scenarios.length) { throw new Error("No scenarios"); }
        $("home-count").textContent = scenarios.length + " practice messages, about 10 minutes";
        $("start-btn").disabled = false;
        status.textContent = "";
      })
      .catch(function () {
        status.textContent = "The practice messages didn't load. Check your internet connection, then refresh the page.";
      });
  }

  /* ---------- Wiring up the buttons ---------- */

  function init() {
    loadTextSize();
    $("size-normal").addEventListener("click", function () { setTextSize("normal"); });
    $("size-large").addEventListener("click", function () { setTextSize("large"); });

    $("start-btn").addEventListener("click", startRound);
    $("again-btn").addEventListener("click", startRound);
    $("next-btn").addEventListener("click", next);

    Array.prototype.forEach.call(document.querySelectorAll("[data-answer]"), function (btn) {
      btn.addEventListener("click", function () { answer(btn.getAttribute("data-answer")); });
    });
    Array.prototype.forEach.call(document.querySelectorAll("[data-go]"), function (btn) {
      btn.addEventListener("click", function () { show(btn.getAttribute("data-go")); });
    });

    loadScenarios();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
