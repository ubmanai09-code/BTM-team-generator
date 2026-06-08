/**
 * BTM Team Generator — Static client-side app
 * No build step, no dependencies, no backend required.
 */

/* ── Seeded pseudo-random number generator ───────── */
function seededRandom(seed) {
  let value = seed >>> 0;
  return function () {
    value = (Math.imul(value, 1664525) + 1013904223) >>> 0;
    return value / 4294967296;
  };
}

/* ── Fisher-Yates shuffle with a given RNG ───────── */
function shuffle(array, rng) {
  const arr = array.slice();
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = arr[i];
    arr[i] = arr[j];
    arr[j] = tmp;
  }
  return arr;
}

/* ── Parse the names textarea ────────────────────── */
function parseNames(raw) {
  return raw
    .split(/\n|,|;/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
    .filter((s, idx, arr) => arr.indexOf(s) === idx); // deduplicate
}

/* ── Core generation logic ───────────────────────── */
function generateTeams(names, mode, value, seed) {
  const errors = [];

  if (names.length === 0) {
    errors.push("Please enter at least one participant name.");
    return { teams: [], unassigned: [], errors, warnings: [] };
  }

  let teamCount;
  let teamSize;

  if (mode === "count") {
    teamCount = Math.max(1, value);
    if (teamCount > names.length) {
      errors.push(
        "Number of teams (" +
          teamCount +
          ") cannot exceed number of participants (" +
          names.length +
          ")."
      );
      return { teams: [], unassigned: [], errors, warnings: [] };
    }
    teamSize = Math.floor(names.length / teamCount);
  } else {
    // mode === "size"
    teamSize = Math.max(1, value);
    if (teamSize > names.length) {
      errors.push(
        "Team size cannot exceed number of participants (" +
          names.length +
          ")."
      );
      return { teams: [], unassigned: [], errors, warnings: [] };
    }
    teamCount = Math.floor(names.length / teamSize);
    if (teamCount < 1) {
      errors.push("Not enough participants to form a single team of size " + teamSize + ".");
      return { teams: [], unassigned: [], errors, warnings: [] };
    }
  }

  const warnings = [];
  const rng = seededRandom(seed);
  const shuffled = shuffle(names, rng);

  const teams = [];
  for (let i = 0; i < teamCount; i++) {
    teams.push({ id: i + 1, name: "Team " + (i + 1), members: [] });
  }

  // Distribute round-robin for even balance
  for (let i = 0; i < teamCount * teamSize; i++) {
    const teamIdx = i % teamCount;
    teams[teamIdx].members.push(shuffled[i]);
  }

  const unassigned = shuffled.slice(teamCount * teamSize);
  if (unassigned.length > 0) {
    warnings.push(
      unassigned.length +
        " participant" +
        (unassigned.length === 1 ? "" : "s") +
        " could not be placed in a full team and will be listed separately."
    );
  }

  return { teams, unassigned, errors: [], warnings };
}

/* ── Build plain-text export ─────────────────────── */
function buildExportText(teams, unassigned) {
  const lines = [];
  for (const team of teams) {
    lines.push("=== " + team.name + " ===");
    for (const member of team.members) {
      lines.push("  " + member);
    }
    lines.push("");
  }
  if (unassigned.length > 0) {
    lines.push("=== Unassigned ===");
    for (const name of unassigned) {
      lines.push("  " + name);
    }
  }
  return lines.join("\n").trim();
}

/* ── DOM helpers ─────────────────────────────────── */
function el(id) {
  return document.getElementById(id);
}

function setHtml(id, html) {
  const node = el(id);
  if (node) node.innerHTML = html;
}

function show(id) {
  const node = el(id);
  if (node) node.style.display = "";
}

function hide(id) {
  const node = el(id);
  if (node) node.style.display = "none";
}

/* ── App state ───────────────────────────────────── */
let currentSeed = Date.now();
let lastResult = null;

/* ── Render results ──────────────────────────────── */
function renderResults(result) {
  lastResult = result;
  const container = el("results-inner");
  if (!container) return;

  if (result.errors.length > 0) {
    container.innerHTML =
      '<div class="notice notice--error">' +
      result.errors.map(escapeHtml).join("<br>") +
      "</div>";
    hide("results-actions");
    return;
  }

  let html = "";

  if (result.warnings.length > 0) {
    html +=
      '<div class="notice notice--warn">' +
      result.warnings.map(escapeHtml).join("<br>") +
      "</div>";
  }

  // Stats bar
  const total =
    result.teams.reduce((s, t) => s + t.members.length, 0) +
    result.unassigned.length;
  html +=
    '<div class="stats-bar">' +
    "<span><b>" +
    result.teams.length +
    "</b> teams</span>" +
    "<span><b>" +
    (result.teams[0] ? result.teams[0].members.length : 0) +
    "</b> members each</span>" +
    "<span><b>" +
    total +
    "</b> participants total</span>" +
    "</div>";

  // Teams grid
  html += '<div class="teams-grid">';
  for (const team of result.teams) {
    html +=
      '<div class="team-card"><div class="team-card__name">' +
      escapeHtml(team.name) +
      "</div>";
    for (const member of team.members) {
      html +=
        '<div class="team-card__member">' + escapeHtml(member) + "</div>";
    }
    html += "</div>";
  }
  html += "</div>";

  // Unassigned
  if (result.unassigned.length > 0) {
    html +=
      '<div style="margin-top:16px"><strong>Unassigned participants:</strong><div class="unassigned-list">';
    for (const name of result.unassigned) {
      html +=
        '<span class="unassigned-chip">' + escapeHtml(name) + "</span>";
    }
    html += "</div></div>";
  }

  container.innerHTML = html;
  show("results-actions");

  // Populate export area
  const exportEl = el("export-text");
  if (exportEl) {
    exportEl.textContent = buildExportText(result.teams, result.unassigned);
  }
}

/* ── Simple HTML escaping ─────────────────────────── */
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/* ── Mode tabs ───────────────────────────────────── */
function initModeTabs() {
  const tabs = document.querySelectorAll(".mode-tab");
  tabs.forEach(function (tab) {
    tab.addEventListener("click", function () {
      tabs.forEach(function (t) {
        t.classList.remove("active");
      });
      tab.classList.add("active");
      const mode = tab.dataset.mode;
      if (mode === "count") {
        show("field-count");
        hide("field-size");
      } else {
        hide("field-count");
        show("field-size");
      }
    });
  });
}

/* ── Get current mode and value ──────────────────── */
function getMode() {
  const active = document.querySelector(".mode-tab.active");
  return active ? active.dataset.mode : "count";
}

function getValue() {
  const mode = getMode();
  if (mode === "count") {
    return parseInt(el("input-count").value, 10) || 2;
  } else {
    return parseInt(el("input-size").value, 10) || 5;
  }
}

/* ── Main generate action ─────────────────────────── */
function doGenerate(newSeed) {
  if (newSeed !== false) {
    currentSeed = Date.now();
  }
  const raw = el("names-input").value;
  const names = parseNames(raw);
  const mode = getMode();
  const value = getValue();
  const result = generateTeams(names, mode, value, currentSeed);
  renderResults(result);
  // Show the results panel
  show("results-section");
  el("results-section").scrollIntoView({ behavior: "smooth", block: "start" });
}

/* ── Reshuffle (keep seed changing) ──────────────── */
function doReshuffle() {
  currentSeed = Date.now() + Math.floor(Math.random() * 100000);
  doGenerate(false);
}

/* ── Copy to clipboard ───────────────────────────── */
function doCopy() {
  if (!lastResult) return;
  const text = buildExportText(lastResult.teams, lastResult.unassigned);
  navigator.clipboard
    .writeText(text)
    .then(function () {
      const badge = el("copy-badge");
      if (!badge) return;
      badge.classList.add("visible");
      setTimeout(function () {
        badge.classList.remove("visible");
      }, 2000);
    })
    .catch(function () {
      // fallback: select the textarea
      const area = el("export-text");
      if (area) {
        area.select();
        document.execCommand("copy");
      }
    });
}

/* ── Clear / reset ───────────────────────────────── */
function doClear() {
  el("names-input").value = "";
  hide("results-section");
  lastResult = null;
}

/* ── Live participant count ──────────────────────── */
function updateCount() {
  const raw = el("names-input").value;
  const names = parseNames(raw);
  const badge = el("participant-count");
  if (badge) {
    badge.textContent =
      names.length + " participant" + (names.length === 1 ? "" : "s");
  }
}

/* ── Init ─────────────────────────────────────────── */
document.addEventListener("DOMContentLoaded", function () {
  initModeTabs();

  // Generate button
  var generateBtn = el("btn-generate");
  if (generateBtn) {
    generateBtn.addEventListener("click", function () {
      doGenerate(true);
    });
  }

  // Reshuffle button
  var reshuffleBtn = el("btn-reshuffle");
  if (reshuffleBtn) {
    reshuffleBtn.addEventListener("click", doReshuffle);
  }

  // Copy button
  var copyBtn = el("btn-copy");
  if (copyBtn) {
    copyBtn.addEventListener("click", doCopy);
  }

  // Clear button
  var clearBtn = el("btn-clear");
  if (clearBtn) {
    clearBtn.addEventListener("click", doClear);
  }

  // Live count in textarea label
  var namesInput = el("names-input");
  if (namesInput) {
    namesInput.addEventListener("input", updateCount);
  }

  // Allow Ctrl+Enter to trigger generate
  document.addEventListener("keydown", function (e) {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      doGenerate(true);
    }
  });
});
