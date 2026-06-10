(function () {
  if (window.__btmTeamGeneratorInitialized) return;
  window.__btmTeamGeneratorInitialized = true;

  const participantsInput = document.getElementById("participants");
  const manualPlayersBlock = document.getElementById("manualPlayersBlock");
  const dataSourceInput = document.getElementById("dataSource");
  const csvFileInput = document.getElementById("csvFile");
  const csvMetaEl = document.getElementById("csvMeta");

  const statTotalEl = document.getElementById("statTotal");
  const statFemaleEl = document.getElementById("statFemale");
  const statMaleEl = document.getElementById("statMale");
  const statOtherEl = document.getElementById("statOther");

  const personsPerTeamInput = document.getElementById("personsPerTeam");
  const maxDeviationInput = document.getElementById("maxDeviation");
  const femaleRuleToggle = document.getElementById("femaleRuleToggle");
  const maxFemalesPerTeamInput = document.getElementById("maxFemalesPerTeam");
  const strictTeamSizeInput = document.getElementById("strictTeamSize");
  const strictDeviationRuleInput = document.getElementById("strictDeviationRule");
  const teamCountPreviewEl = document.getElementById("teamCountPreview");
  const femaleFeasiblePreviewEl = document.getElementById("femaleFeasiblePreview");
  const generationPreviewPrimaryEl = document.getElementById("generationPreviewPrimary");
  const generationPreviewSecondaryEl = document.getElementById("generationPreviewSecondary");
  const generationPreviewEl = document.querySelector("#generationSection .generation-preview");

  const generateRandomBtn = document.getElementById("generateRandomBtn");
  const generateBalancedBtn = document.getElementById("generateBalancedBtn");
  const reshuffleBtn = document.getElementById("reshuffleBtn");
  const saveBtn = document.getElementById("saveBtn");
  const viewNormalBtn = document.getElementById("viewNormalBtn");
  const viewSmallBtn = document.getElementById("viewSmallBtn");
  const printBtn = document.getElementById("printBtn");
  const exportMenuEl = document.getElementById("exportMenu");
  const exportFormatMenuEl = document.getElementById("exportFormatMenu");
  const exportCsvBtn = document.getElementById("exportCsvBtn");
  const editTeamsBtn = document.getElementById("editTeamsBtn");
  const sidebarEl = document.getElementById("sidebar");
  const sidebarToggleBtn = document.getElementById("sidebarToggle");
  const sidebarCloseBtn = document.getElementById("sidebarClose");
  const sidebarBackdropEl = document.getElementById("sidebarBackdrop");
  const sideNavButtons = Array.from(document.querySelectorAll(".side-nav-btn"));
  const workflowPanels = Array.from(document.querySelectorAll(".workflow-panel"));

  const resultsCardEl = document.getElementById("resultsCard");
  const resultsEl = document.getElementById("results");
  const dataManagementPreviewEl = document.getElementById("dataManagementPreview");
  const statusEl = document.getElementById("status");

  const SNAPSHOT_KEY = "btm-team-generator:lastSnapshot";

  let csvState = null;
  let currentPlayers = [];
  let currentTeams = [];
  let currentUnassignedPlayers = [];
  let currentUnassignedReason = "";
  let lastMode = null;
  let dataManagementUnlocked = false;
  let resultsAvailable = false;
  let activeWorkflowPanelId = "loadDataSection";
  let teamNameOverrides = [];
  let dataManagementViewMode = "small";

  function toPositiveInt(value) {
    if (!value) return null;
    const num = Number(value);
    if (!Number.isInteger(num) || num <= 0) return null;
    return num;
  }

  function toNonNegativeNumber(value) {
    if (value === "" || value === null || value === undefined) return null;
    const num = Number(value);
    if (!Number.isFinite(num) || num < 0) return null;
    return num;
  }

  function setStatus(message, isError) {
    statusEl.textContent = message;
    statusEl.classList.toggle("error", Boolean(isError));
  }

  function updateDataSourceVisibility() {
    if (!manualPlayersBlock) return;
    manualPlayersBlock.hidden = dataSourceInput.value !== "manual";
  }

  function escapeHtml(input) {
    return String(input)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  function normalizeGender(value) {
    const raw = String(value || "").trim().toLowerCase();
    if (!raw) return "unknown";
    if (["female", "f", "woman", "girl"].includes(raw)) return "female";
    if (["male", "m", "man", "boy"].includes(raw)) return "male";
    if (["other", "unknown", "na", "n/a"].includes(raw)) return "other";
    return "other";
  }

  function parseScore(value) {
    let text = String(value || "").trim();
    if (!text) return 0;

    // Support decimal comma values like "8,5" while still handling thousand separators.
    if (text.includes(",") && !text.includes(".")) {
      text = text.replace(/,/g, ".");
    } else {
      text = text.replace(/,/g, "");
    }

    const clean = text.replace(/[^0-9.-]/g, "");
    const num = Number(clean);
    if (!Number.isFinite(num)) return 0;
    return num;
  }

  function parseManualPlayers(raw) {
    const values = raw
      .split(/[\n,;]+/)
      .map((value) => value.trim())
      .filter(Boolean);

    const seen = new Set();
    const players = [];

    values.forEach((name) => {
      const key = name.toLowerCase();
      if (seen.has(key)) return;
      seen.add(key);
      players.push({
        id: name,
        name,
        score: 0,
        gender: "unknown",
        club: "",
        sourceTeam: "",
      });
    });

    return players;
  }

  function splitCsvLine(line, delimiter) {
    const values = [];
    let current = "";
    let quoted = false;

    for (let i = 0; i < line.length; i += 1) {
      const char = line[i];
      if (char === '"') {
        if (quoted && line[i + 1] === '"') {
          current += '"';
          i += 1;
        } else {
          quoted = !quoted;
        }
        continue;
      }

      if (char === delimiter && !quoted) {
        values.push(current.trim());
        current = "";
        continue;
      }

      current += char;
    }

    values.push(current.trim());
    return values;
  }

  function detectCsvDelimiter(lines) {
    const sample = lines.slice(0, 5).join("\n");
    const options = [",", ";", "\t"];
    let best = ",";
    let bestScore = -1;

    options.forEach((candidate) => {
      const score = sample.split(candidate).length;
      if (score > bestScore) {
        best = candidate;
        bestScore = score;
      }
    });

    return best;
  }

  function parseCsv(raw) {
    const normalized = raw.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
    const lines = normalized
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);

    if (!lines.length) return null;

    const delimiter = detectCsvDelimiter(lines);
    const rows = lines.map((line) => splitCsvLine(line, delimiter));
    const columnCount = Math.max(...rows.map((row) => row.length));
    return { rows, delimiter, columnCount };
  }

  function nonEmptyRatio(values) {
    if (!values.length) return 0;
    const nonEmpty = values.filter((value) => String(value || "").trim() !== "").length;
    return nonEmpty / values.length;
  }

  function numericRatio(values) {
    const filled = values.map((value) => String(value || "").trim()).filter(Boolean);
    if (!filled.length) return 0;
    const numeric = filled.filter((value) => Number.isFinite(Number(value.replace(/[^0-9.-]/g, "")))).length;
    return numeric / filled.length;
  }

  function genderRatio(values) {
    const filled = values.map((value) => String(value || "").trim()).filter(Boolean);
    if (!filled.length) return 0;
    const valid = filled.filter((value) => {
      const lower = value.toLowerCase();
      return ["female", "f", "male", "m", "other", "unknown", "na", "n/a", "woman", "man", "girl", "boy"].includes(lower);
    }).length;
    return valid / filled.length;
  }

  function uniqueRatio(values) {
    const filled = values.map((value) => String(value || "").trim()).filter(Boolean);
    if (!filled.length) return 0;
    return new Set(filled.map((value) => value.toLowerCase())).size / filled.length;
  }

  function hasHeaderRow(rows) {
    const firstRow = rows[0] || [];
    return firstRow.some((value) => /(name|id|score|average|avg|gender|sex|participant|member|club|team)/i.test(String(value)));
  }

  function detectMapping(rows, startIndex, columnCount) {
    const header = rows[0] || [];
    let nameIndex = -1;
    let scoreIndex = -1;
    let genderIndex = -1;
    let clubIndex = -1;
    let sourceTeamIndex = -1;

    for (let i = 0; i < columnCount; i += 1) {
      const cell = String(header[i] || "");
      const normalizedCell = cell.replace(/[_-]+/g, " ");
      if (nameIndex < 0 && /(name|name id|id|participant|member|student)/i.test(normalizedCell)) nameIndex = i;
      if (scoreIndex < 0 && /(average score|avg score|score|average|avg|skill|level|rating|point)/i.test(normalizedCell)) scoreIndex = i;
      if (genderIndex < 0 && /(gender|sex)/i.test(normalizedCell)) genderIndex = i;
      if (clubIndex < 0 && /(club|group|organization|org)/i.test(normalizedCell)) clubIndex = i;
      if (sourceTeamIndex < 0 && /(team|class|house|squad)/i.test(normalizedCell)) sourceTeamIndex = i;
    }

    const dataRows = rows.slice(startIndex);
    const columnValues = Array.from({ length: columnCount }, (_, index) =>
      dataRows.map((row) => String(row[index] || "").trim())
    );

    if (scoreIndex < 0) {
      let best = -1;
      for (let i = 0; i < columnCount; i += 1) {
        const score = numericRatio(columnValues[i]);
        if (score > best) {
          best = score;
          scoreIndex = i;
        }
      }
    }

    if (genderIndex < 0) {
      let best = 0;
      for (let i = 0; i < columnCount; i += 1) {
        const score = genderRatio(columnValues[i]);
        if (score > best && score >= 0.6) {
          best = score;
          genderIndex = i;
        }
      }
    }

    if (nameIndex < 0) {
      let best = -1;
      for (let i = 0; i < columnCount; i += 1) {
        if (i === scoreIndex || i === genderIndex) continue;
        const values = columnValues[i];
        const score = nonEmptyRatio(values) * 0.5 + uniqueRatio(values) * 0.4 + (1 - numericRatio(values)) * 0.1;
        if (score > best) {
          best = score;
          nameIndex = i;
        }
      }
    }

    if (nameIndex < 0) nameIndex = 0;
    if (scoreIndex < 0) scoreIndex = Math.min(1, columnCount - 1);

    return { nameIndex, scoreIndex, genderIndex, clubIndex, sourceTeamIndex };
  }

  function onCsvLoaded(raw) {
    const parsed = parseCsv(raw);
    if (!parsed) {
      csvState = null;
      refreshCsvMeta();
      setStatus("CSV file is empty or invalid.", true);
      return;
    }

    const headerDetected = hasHeaderRow(parsed.rows);
    const startIndex = headerDetected ? 1 : 0;
    const mapping = detectMapping(parsed.rows, startIndex, parsed.columnCount);

    csvState = {
      ...parsed,
      mapping,
      hasHeader: headerDetected,
    };

    refreshCsvMeta();
    setStatus("CSV imported and columns auto-detected.", false);
  }

  function buildPlayersFromCsv() {
    if (!csvState || !csvState.rows.length) return [];

    const rows = csvState.rows.slice(csvState.hasHeader ? 1 : 0);
    const { nameIndex, scoreIndex, genderIndex, clubIndex, sourceTeamIndex } = csvState.mapping;

    const seen = new Set();
    const players = [];

    rows.forEach((row) => {
      const name = String(row[nameIndex] || "").trim();
      if (!name) return;

      const key = name.toLowerCase();
      if (seen.has(key)) return;
      seen.add(key);

      players.push({
        id: name,
        name,
        score: parseScore(row[scoreIndex]),
        gender: normalizeGender(genderIndex >= 0 ? row[genderIndex] : ""),
        club: clubIndex >= 0 ? String(row[clubIndex] || "").trim() : "",
        sourceTeam: sourceTeamIndex >= 0 ? String(row[sourceTeamIndex] || "").trim() : "",
      });
    });

    return players;
  }

  function getPlayersFromSource() {
    const source = dataSourceInput.value;
    const manualPlayers = parseManualPlayers(participantsInput.value);
    const csvPlayers = buildPlayersFromCsv();

    if (source === "csv") return csvPlayers;

    return manualPlayers;
  }

  function countGenders(players) {
    const counters = { female: 0, male: 0, other: 0 };
    players.forEach((player) => {
      const gender = normalizeGender(player.gender);
      if (gender === "female") counters.female += 1;
      else if (gender === "male") counters.male += 1;
      else counters.other += 1;
    });
    return counters;
  }

  function updateTeamCountPreview() {
    const total = currentPlayers.length;
    const personsPerTeam = toPositiveInt(personsPerTeamInput.value);
    const femaleCountPlayers = currentPlayers.filter((player) => normalizeGender(player.gender) === "female").length;
    const strictEnabled = strictTeamSizeInput.value === "yes";

    if (!personsPerTeam || !total) {
      teamCountPreviewEl.textContent = "Possible teams: 0 (set persons per team and import players).";
      if (femaleFeasiblePreviewEl) {
        femaleFeasiblePreviewEl.textContent = "Female-rule cap: set persons per team and import players.";
      }
      updateGenerationPreview();
      return;
    }

    const fullTeams = Math.floor(total / personsPerTeam);
    const remainder = total % personsPerTeam;
    const possibleTeams = Math.ceil(total / personsPerTeam);
    const plannedTeams = strictEnabled ? fullTeams : possibleTeams;
    teamCountPreviewEl.textContent = `Possible teams: ${possibleTeams} (full teams: ${fullTeams}, remainder players: ${remainder}).`;

    if (!femaleFeasiblePreviewEl) {
      updateGenerationPreview();
      return;
    }

    if (!femaleRuleToggle.checked) {
      femaleFeasiblePreviewEl.textContent = `Female-rule cap: Gender Rule is OFF. If enabled, max feasible teams would be ${Math.min(plannedTeams, femaleCountPlayers)} (female players: ${femaleCountPlayers}).`;
      updateGenerationPreview();
      return;
    }

    const feasibleTeams = Math.min(plannedTeams, femaleCountPlayers);
    femaleFeasiblePreviewEl.textContent = `Female-rule cap: max feasible teams = ${feasibleTeams} (planned: ${plannedTeams}, female players: ${femaleCountPlayers}, strict team size: ${strictEnabled ? "ON" : "OFF"}).`;
    updateGenerationPreview();
  }

  function updateGenerationPreview() {
    if (!generationPreviewPrimaryEl || !generationPreviewSecondaryEl) return;

    const total = currentPlayers.length;
    const personsPerTeam = toPositiveInt(personsPerTeamInput.value);

    if (!personsPerTeam || !total) {
      generationPreviewPrimaryEl.textContent = "Potential result: set team size and import players first.";
      generationPreviewSecondaryEl.textContent = "Unassigned preview: none.";
      return;
    }

    const strictEnabled = strictTeamSizeInput.value === "yes";
    const femaleRuleEnabled = femaleRuleToggle.checked;
    const totalFemales = currentPlayers.filter((player) => normalizeGender(player.gender) === "female").length;
    const strictRemainder = strictEnabled ? total % personsPerTeam : 0;
    const assignableCount = strictEnabled ? total - strictRemainder : total;
    const baseTeamCount = strictEnabled
      ? Math.floor(assignableCount / personsPerTeam)
      : Math.ceil(assignableCount / personsPerTeam);
    const teamCount = femaleRuleEnabled ? Math.min(baseTeamCount, totalFemales) : baseTeamCount;
    const assignedAfterFemaleCap = femaleRuleEnabled ? Math.min(assignableCount, teamCount * personsPerTeam) : assignableCount;
    const unassignedCount = Math.max(0, total - assignedAfterFemaleCap);
    const reasons = [];

    if (strictEnabled && strictRemainder > 0) {
      reasons.push(`${strictRemainder} excluded by Full Teams Only.`);
    }

    if (femaleRuleEnabled && baseTeamCount > teamCount) {
      const femaleCapUnassigned = Math.max(0, assignableCount - assignedAfterFemaleCap);
      if (femaleCapUnassigned > 0) {
        reasons.push(`${femaleCapUnassigned} excluded by Female Limit.`);
      }
    }

    generationPreviewPrimaryEl.textContent = `Potential result: ${teamCount} team(s) can be generated with the current rules.`;
    generationPreviewSecondaryEl.textContent = unassignedCount > 0
      ? `Unassigned preview: ${unassignedCount} player(s). ${reasons.join(" ")}`
      : "Unassigned preview: 0 players.";
  }

  function updateImportStats() {
    currentPlayers = getPlayersFromSource();
    const genders = countGenders(currentPlayers);

    statTotalEl.textContent = String(currentPlayers.length);
    statFemaleEl.textContent = String(genders.female);
    statMaleEl.textContent = String(genders.male);
    statOtherEl.textContent = String(genders.other);

    updateTeamCountPreview();
  }

  function refreshCsvMeta() {
    if (!csvState) {
      csvMetaEl.textContent = "No CSV imported yet.";
      updateImportStats();
      return;
    }

    const start = csvState.hasHeader ? 1 : 0;
    const dataRows = Math.max(0, csvState.rows.length - start);
    const mapping = csvState.mapping;
    const genderText = mapping.genderIndex >= 0 ? String(mapping.genderIndex + 1) : "not found";
    const clubText = mapping.clubIndex >= 0 ? String(mapping.clubIndex + 1) : "not found";
    const teamText = mapping.sourceTeamIndex >= 0 ? String(mapping.sourceTeamIndex + 1) : "not found";
    csvMetaEl.textContent = `CSV loaded: ${dataRows} data row(s), ${csvState.columnCount} column(s). Auto-detected columns -> Name: ${mapping.nameIndex + 1}, Score: ${mapping.scoreIndex + 1}, Gender: ${genderText}, Club: ${clubText}, Team: ${teamText}.`;
    updateImportStats();
  }

  function shuffle(list) {
    const arr = list.slice();
    for (let i = arr.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      const temp = arr[i];
      arr[i] = arr[j];
      arr[j] = temp;
    }
    return arr;
  }

  function createSnakeOrder(teamCount, length) {
    const order = [];
    let direction = 1;
    let team = 0;

    for (let i = 0; i < length; i += 1) {
      order.push(team);
      if (direction === 1 && team === teamCount - 1) direction = -1;
      else if (direction === -1 && team === 0) direction = 1;
      else team += direction;
    }

    return order;
  }

  function teamAverage(team) {
    if (!team.length) return 0;
    const total = team.reduce((sum, member) => sum + member.score, 0);
    return total / team.length;
  }

  function teamTotalScore(team) {
    return team.reduce((sum, member) => sum + member.score, 0);
  }

  function allTeamsTotalScore(teams) {
    return teams.reduce((sum, team) => sum + teamTotalScore(team), 0);
  }

  function splitPlayersByStrictRule(players, personsPerTeam, strictEnabled) {
    if (!strictEnabled) {
      return {
        assignedPlayers: players.slice(),
        unassignedPlayers: [],
      };
    }

    const randomized = shuffle(players);
    const fullTeamCount = Math.floor(randomized.length / personsPerTeam);
    const assignableCount = fullTeamCount * personsPerTeam;

    return {
      assignedPlayers: randomized.slice(0, assignableCount),
      unassignedPlayers: randomized.slice(assignableCount),
    };
  }

  function femaleCount(team) {
    return team.reduce((sum, member) => sum + (normalizeGender(member.gender) === "female" ? 1 : 0), 0);
  }

  function allowedByFemaleRule(team, player, enabled, maxFemalesPerTeam) {
    if (!enabled) return true;
    if (normalizeGender(player.gender) !== "female") return true;
    return femaleCount(team) < maxFemalesPerTeam;
  }

  function makeTeams(count) {
    return Array.from({ length: count }, () => []);
  }

  function trimPlayersForFemaleCap(players, teamCount, personsPerTeam) {
    const maxAssignable = teamCount * personsPerTeam;
    if (players.length <= maxAssignable) {
      return {
        assignedPlayers: players.slice(),
        overflowPlayers: [],
      };
    }

    const females = [];
    const others = [];

    players.forEach((player) => {
      if (normalizeGender(player.gender) === "female") females.push(player);
      else others.push(player);
    });

    const assignedPlayers = females.concat(others).slice(0, maxAssignable);
    const assignedIds = new Set(assignedPlayers.map((player) => player.id));
    const overflowPlayers = players.filter((player) => !assignedIds.has(player.id));

    return {
      assignedPlayers,
      overflowPlayers,
    };
  }

  function assignRandom(players, teamCount, personsPerTeam, femaleRuleEnabled, maxFemalesPerTeam) {
    const teams = makeTeams(teamCount);
    const randomized = shuffle(players);

    randomized.forEach((player) => {
      const candidates = teams.filter((team) => {
        if (team.length >= personsPerTeam) return false;
        return allowedByFemaleRule(team, player, femaleRuleEnabled, maxFemalesPerTeam);
      });

      if (candidates.length) {
        const target = candidates[Math.floor(Math.random() * candidates.length)];
        target.push(player);
        return;
      }

      // If gender rule blocks placement, keep team-size rule by placing into any non-full team.
      const nonFullTeams = teams.filter((team) => team.length < personsPerTeam);
      if (nonFullTeams.length) {
        nonFullTeams[0].push(player);
      }
    });

    return teams;
  }

  function assignBalanced(players, teamCount, personsPerTeam, femaleRuleEnabled, maxFemalesPerTeam) {
    const teams = makeTeams(teamCount);
    const sorted = players.slice().sort((a, b) => b.score - a.score);
    const females = sorted.filter((player) => normalizeGender(player.gender) === "female");
    const others = sorted.filter((player) => normalizeGender(player.gender) !== "female");
    const snake = createSnakeOrder(teamCount, females.length);

    // Step 3: distribute females first with a snake draft across teams.
    females.forEach((female, idx) => {
      const preferredIndex = snake[idx];
      const preferred = teams[preferredIndex];
      if (
        preferred &&
        preferred.length < personsPerTeam &&
        allowedByFemaleRule(preferred, female, femaleRuleEnabled, maxFemalesPerTeam)
      ) {
        preferred.push(female);
        return;
      }

      const fallback = teams
        .filter((team) => team.length < personsPerTeam)
        .filter((team) => allowedByFemaleRule(team, female, femaleRuleEnabled, maxFemalesPerTeam))
        .sort((a, b) => teamTotalScore(a) - teamTotalScore(b));

      if (fallback.length) {
        fallback[0].push(female);
      }
    });

    // Step 4: distribute remaining players by strongest-to-weakest player order into the weakest team first.
    others.forEach((player) => {
      const fallback = teams
        .filter((team) => team.length < personsPerTeam)
        .filter((team) => allowedByFemaleRule(team, player, femaleRuleEnabled, maxFemalesPerTeam))
        .sort((a, b) => teamTotalScore(a) - teamTotalScore(b));

      if (fallback.length) {
        fallback[0].push(player);
        return;
      }

      const nonFullTeams = teams.filter((team) => team.length < personsPerTeam);
      if (nonFullTeams.length) {
        nonFullTeams[0].push(player);
      }
    });

    return teams;
  }

  function optimizeBalancedTeams(teams, femaleRuleEnabled, maxFemalesPerTeam, maxDeviation) {
    if (teams.length < 2) return;

    const threshold = maxDeviation === null ? Number.POSITIVE_INFINITY : maxDeviation;
    const iterations = 120;

    for (let i = 0; i < iterations; i += 1) {
      const totals = teams.map((team) => teamTotalScore(team));
      const spread = Math.max(...totals) - Math.min(...totals);
      if (spread <= threshold) break;

      let highIndex = 0;
      let lowIndex = 0;
      for (let t = 0; t < totals.length; t += 1) {
        if (totals[t] > totals[highIndex]) highIndex = t;
        if (totals[t] < totals[lowIndex]) lowIndex = t;
      }

      if (highIndex === lowIndex) break;

      const highTeam = teams[highIndex];
      const lowTeam = teams[lowIndex];
      if (!highTeam || !lowTeam || !highTeam.length || !lowTeam.length) break;

      let best = null;

      for (let h = 0; h < highTeam.length; h += 1) {
        for (let l = 0; l < lowTeam.length; l += 1) {
          const highPlayer = highTeam[h];
          const lowPlayer = lowTeam[l];

          highTeam[h] = lowPlayer;
          lowTeam[l] = highPlayer;

          const femaleValid = !femaleRuleEnabled || (
            femaleCount(highTeam) >= 1 &&
            femaleCount(lowTeam) >= 1 &&
            femaleCount(highTeam) <= maxFemalesPerTeam &&
            femaleCount(lowTeam) <= maxFemalesPerTeam
          );

          const nextTotals = teams.map((team) => teamTotalScore(team));
          const nextSpread = Math.max(...nextTotals) - Math.min(...nextTotals);

          highTeam[h] = highPlayer;
          lowTeam[l] = lowPlayer;

          if (!femaleValid) continue;
          if (!best || nextSpread < best.spread) {
            best = { h, l, spread: nextSpread };
          }
        }
      }

      if (!best || best.spread >= spread) break;

      const highPlayer = highTeam[best.h];
      const lowPlayer = lowTeam[best.l];
      highTeam[best.h] = lowPlayer;
      lowTeam[best.l] = highPlayer;
    }
  }

  function validateGeneratedTeams(teams, personsPerTeam, femaleRuleEnabled, strictEnabled, maxDeviation) {
    if (strictEnabled && !teamsMatchExactSize(teams, personsPerTeam)) {
      return "Strict team-size rule failed. Could not generate only full teams with current constraints.";
    }

    if (femaleRuleEnabled) {
      const missingFemale = teams.some((team) => femaleCount(team) < 1);
      if (missingFemale) {
        return "Female-per-team rule failed. At least one female is required in each team.";
      }
    }

    if (maxDeviation !== null) {
      const deviation = scoreDeviation(teams);
      if (deviation > maxDeviation) {
        return `Generated teams exceed max deviation ${maxDeviation.toFixed(2)} (current ${deviation.toFixed(2)}).`;
      }
    }

    return null;
  }

  function scoreDeviation(teams) {
    const avgs = teams.map((team) => teamAverage(team));
    const max = Math.max(...avgs);
    const min = Math.min(...avgs);
    return max - min;
  }

  function teamsMatchExactSize(teams, personsPerTeam) {
    if (!teams.length) return false;
    return teams.every((team) => team.length === personsPerTeam);
  }

  function findBalancedWithinDeviation(players, teamCount, personsPerTeam, femaleRuleEnabled, maxFemalesPerTeam, maxDeviation) {
    const candidate = assignBalanced(players, teamCount, personsPerTeam, femaleRuleEnabled, maxFemalesPerTeam);
    optimizeBalancedTeams(candidate, femaleRuleEnabled, maxFemalesPerTeam, maxDeviation);
    const deviation = scoreDeviation(candidate);

    return {
      teams: candidate,
      deviation,
      matched: deviation <= maxDeviation,
    };
  }

  function validateBeforeGenerate() {
    updateImportStats();

    if (currentPlayers.length < 2) {
      return "Please import or enter at least 2 players.";
    }

    const personsPerTeam = toPositiveInt(personsPerTeamInput.value);
    if (!personsPerTeam) {
      return "Please set Persons Per Team with a positive number.";
    }

    if (personsPerTeam > currentPlayers.length) {
      return "Persons Per Team cannot exceed total players.";
    }

    if (dataSourceInput.value === "csv" && !csvState) {
      return "Please import a CSV file first, or switch Data Source to Manually add.";
    }

    if (femaleRuleToggle.checked) {
      const maxFemales = toPositiveInt(maxFemalesPerTeamInput.value);
      if (!maxFemales) {
        return "Please set Max Females Per Team when gender rule is enabled.";
      }
      if (maxFemales > personsPerTeam) {
        return "Max Females Per Team cannot exceed Persons Per Team.";
      }
    }

    return null;
  }

  function setActionButtons(enabled) {
    reshuffleBtn.disabled = !enabled;
    saveBtn.disabled = !enabled;
    const toolsEnabled = enabled && dataManagementUnlocked;
    if (viewNormalBtn) viewNormalBtn.disabled = !toolsEnabled;
    if (viewSmallBtn) viewSmallBtn.disabled = !toolsEnabled;
    printBtn.disabled = !toolsEnabled;
    exportCsvBtn.disabled = !toolsEnabled;
    editTeamsBtn.disabled = !toolsEnabled;
    if (!toolsEnabled) {
      closeExportMenu();
    }
  }

  function setSidebarOpen(isOpen) {
    const open = Boolean(isOpen);
    document.body.classList.toggle("sidebar-open", open);

    if (sidebarBackdropEl) {
      sidebarBackdropEl.hidden = !open;
    }

    if (sidebarEl) {
      sidebarEl.setAttribute("aria-hidden", String(!open));
    }

    if (sidebarToggleBtn) {
      sidebarToggleBtn.setAttribute("aria-expanded", String(open));
    }
  }

  function clearGeneratedTeamsOnDataChange() {
    if (!currentTeams.length) return;
    currentTeams = [];
    currentUnassignedPlayers = [];
    currentUnassignedReason = "";
    lastMode = null;
    teamNameOverrides = [];
    dataManagementUnlocked = false;
    renderTeams();
    setActionButtons(false);
    renderDataManagementPreview();
  }

  function updateModeButtons() {
    generateRandomBtn.classList.toggle("active-mode", lastMode === "random");
    generateBalancedBtn.classList.toggle("active-mode", lastMode === "balanced");
  }

  function syncResultsCardVisibility() {
    if (!resultsCardEl) return;
    const shouldShow = resultsAvailable && activeWorkflowPanelId === "generationSection";
    resultsCardEl.hidden = !shouldShow;
  }

  function showWorkflowPanel(panelId) {
    activeWorkflowPanelId = panelId;

    workflowPanels.forEach((panel) => {
      const isActive = panel.id === panelId;
      panel.classList.toggle("active", isActive);
      panel.hidden = !isActive;
    });

    sideNavButtons.forEach((button) => {
      const isActive = button.dataset.panel === panelId;
      button.classList.toggle("active", isActive);
      button.setAttribute("aria-pressed", String(isActive));
    });

    syncResultsCardVisibility();
  }

  function setResultsVisibility(enabled) {
    resultsAvailable = enabled;
    syncResultsCardVisibility();
  }

  function formatModeLabel(mode) {
    return mode === "balanced" ? "Balanced" : "Random";
  }

  function formatGenderShort(gender) {
    const normalized = normalizeGender(gender);
    if (normalized === "female") return "F";
    if (normalized === "male") return "M";
    return "Other";
  }

  function buildUnassignedReason(parts) {
    return parts.filter(Boolean).join(" ");
  }

  function getTeamDisplayName(index) {
    return teamNameOverrides[index] || `Team ${index + 1}`;
  }

  function syncTeamNameOverrides() {
    const next = [];
    for (let i = 0; i < currentTeams.length; i += 1) {
      next.push(teamNameOverrides[i] || `Team ${i + 1}`);
    }
    teamNameOverrides = next;
  }

  function getShortMemberName(fullName) {
    const parts = String(fullName || "").trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return "";
    if (parts.length === 1) return parts[0];
    const familyInitial = parts[parts.length - 1].charAt(0).toUpperCase();
    return `${parts[0]} ${familyInitial}.`;
  }

  function getDataManagementPreviewClass(isEmpty) {
    const emptyClass = isEmpty ? " empty" : "";
    return `data-management-preview view-${dataManagementViewMode}${emptyClass}`;
  }

  function setDataManagementViewMode(mode) {
    dataManagementViewMode = mode === "normal" ? "normal" : "small";
    if (viewNormalBtn) {
      viewNormalBtn.classList.toggle("active", dataManagementViewMode === "normal");
      viewNormalBtn.setAttribute("aria-pressed", String(dataManagementViewMode === "normal"));
    }
    if (viewSmallBtn) {
      viewSmallBtn.classList.toggle("active", dataManagementViewMode === "small");
      viewSmallBtn.setAttribute("aria-pressed", String(dataManagementViewMode === "small"));
    }
    renderDataManagementPreview();
  }

  function renderDataManagementPreview() {
    if (!dataManagementPreviewEl) return;

    if (!dataManagementUnlocked || !currentTeams.length) {
      dataManagementPreviewEl.className = getDataManagementPreviewClass(true);
      dataManagementPreviewEl.textContent = "Saved result preview appears here after you click Save.";
      return;
    }

    if (dataManagementViewMode === "normal") {
      dataManagementPreviewEl.className = getDataManagementPreviewClass(false);
      dataManagementPreviewEl.innerHTML = resultsEl.innerHTML;
      return;
    }

    dataManagementPreviewEl.className = getDataManagementPreviewClass(false);
    dataManagementPreviewEl.innerHTML = currentTeams
      .map((team, index) => {
        const memberNames = team
          .map((player) => escapeHtml(getShortMemberName(player.name)))
          .join(", ");
        const totalScore = teamTotalScore(team).toFixed(2);

        return `<article class="dm-team-card">
          <h4><span>${escapeHtml(getTeamDisplayName(index))}</span><strong class="dm-team-score">${totalScore}</strong></h4>
          <p>${memberNames || "-"}</p>
        </article>`;
      })
      .join("");
  }

  function generate(mode) {
    const error = validateBeforeGenerate();
    if (error) {
      setStatus(error, true);
      return;
    }

    const players = currentPlayers.slice();
    const personsPerTeam = toPositiveInt(personsPerTeamInput.value);
    const strictEnabled = strictTeamSizeInput.value === "yes";

    const split = splitPlayersByStrictRule(players, personsPerTeam, strictEnabled);
    let assignedPlayers = split.assignedPlayers;
    currentUnassignedPlayers = split.unassignedPlayers;
    currentUnassignedReason = split.unassignedPlayers.length
      ? `Excluded because Strictly Follow Team Member Rule is ON and they do not fit into a full team of ${personsPerTeam}.`
      : "";

    if (!assignedPlayers.length) {
      setStatus("Strict mode is ON and there are not enough players to form a full team.", true);
      currentTeams = [];
      renderTeams();
      setActionButtons(false);
      return;
    }

    const baseTeamCount = strictEnabled
      ? Math.floor(assignedPlayers.length / personsPerTeam)
      : Math.ceil(assignedPlayers.length / personsPerTeam);

    const femaleRuleEnabled = femaleRuleToggle.checked;
    const maxFemalesPerTeam = toPositiveInt(maxFemalesPerTeamInput.value) || Number.MAX_SAFE_INTEGER;
    const maxDeviation = toNonNegativeNumber(maxDeviationInput.value);
    const strictDeviationEnabled = strictDeviationRuleInput.value === "yes";
    let teamCount = baseTeamCount;
    let femaleCapNotice = "";
    const unassignedReasons = currentUnassignedReason ? [currentUnassignedReason] : [];

    if (femaleRuleEnabled) {
      const totalFemales = assignedPlayers.filter((player) => normalizeGender(player.gender) === "female").length;
      const maxTeamsByFemale = totalFemales;

      if (maxTeamsByFemale <= 0) {
        setStatus(
          "Female-per-team rule is enabled, but no female players are available in assignable players.",
          true
        );
        currentTeams = [];
        renderTeams();
        setActionButtons(false);
        return;
      }

      if (maxTeamsByFemale < teamCount) {
        teamCount = maxTeamsByFemale;
        const trimmed = trimPlayersForFemaleCap(assignedPlayers, teamCount, personsPerTeam);
        assignedPlayers = trimmed.assignedPlayers;
        const overflowPlayers = trimmed.overflowPlayers;
        currentUnassignedPlayers = currentUnassignedPlayers.concat(overflowPlayers);
        femaleCapNotice = ` Team count reduced to ${teamCount} (max possible with ${totalFemales} female player(s)); ${overflowPlayers.length} player(s) moved to unassigned.`;
        if (overflowPlayers.length) {
          unassignedReasons.push(
            `Excluded because the female-per-team rule limits generation to ${teamCount} team(s) with ${totalFemales} female player(s).`
          );
        }
      }
    }

    currentUnassignedReason = buildUnassignedReason(unassignedReasons);

    if (mode === "balanced" && maxDeviation !== null && strictDeviationEnabled) {
      const search = findBalancedWithinDeviation(
        assignedPlayers,
        teamCount,
        personsPerTeam,
        femaleRuleEnabled,
        maxFemalesPerTeam,
        maxDeviation
      );

      if (!search.matched) {
        currentTeams = [];
        renderTeams();
        setActionButtons(false);
        setStatus(
          `Could not generate balanced teams within max deviation ${maxDeviation.toFixed(2)}. Best found: ${search.deviation.toFixed(2)}.${femaleCapNotice}`,
          true
        );
        return;
      }

      currentTeams = search.teams;
    } else {
      currentTeams = mode === "balanced"
        ? assignBalanced(assignedPlayers, teamCount, personsPerTeam, femaleRuleEnabled, maxFemalesPerTeam)
        : assignRandom(assignedPlayers, teamCount, personsPerTeam, femaleRuleEnabled, maxFemalesPerTeam);
    }

    if (strictEnabled && !teamsMatchExactSize(currentTeams, personsPerTeam)) {
      currentTeams = [];
      renderTeams();
      setActionButtons(false);
      setStatus("Strict team-size rule failed. Could not generate only full teams with current constraints.", true);
      return;
    }

    optimizeBalancedTeams(currentTeams, femaleRuleEnabled, maxFemalesPerTeam, maxDeviation);

    const validationError = validateGeneratedTeams(
      currentTeams,
      personsPerTeam,
      femaleRuleEnabled,
      strictEnabled,
      strictDeviationEnabled ? maxDeviation : null
    );

    if (validationError) {
      currentTeams = [];
      renderTeams();
      setActionButtons(false);
      setStatus(validationError, true);
      return;
    }

    lastMode = mode;
    teamNameOverrides = currentTeams.map((_, index) => `Team ${index + 1}`);
    renderTeams();
    setActionButtons(true);

    const deviation = scoreDeviation(currentTeams);

    const unassignedCount = currentUnassignedPlayers.length;
    const unassignedText = unassignedCount ? ` Unassigned players: ${unassignedCount}.` : "";
    dataManagementUnlocked = false;
    setActionButtons(true);
    if (mode === "balanced" && maxDeviation !== null && !strictDeviationEnabled && deviation > maxDeviation) {
      setStatus(
        `Generated ${teamCount} teams with ${mode} mode. Deviation ${deviation.toFixed(2)} exceeds set max ${maxDeviation.toFixed(2)} (strict deviation rule is OFF).${unassignedText}${femaleCapNotice}`,
        true
      );
      return;
    }

    setStatus(`Generated ${teamCount} teams with ${mode} mode. Current deviation: ${deviation.toFixed(2)}.${unassignedText}${femaleCapNotice}`, false);
  }

  function renderTeams() {
    if (!currentTeams.length) {
      setResultsVisibility(false);
      if (generationPreviewEl) {
        generationPreviewEl.hidden = false;
      }
      resultsEl.className = "results empty";
      resultsEl.textContent = "No teams generated yet.";
      updateModeButtons();
      return;
    }

    setResultsVisibility(true);
    if (generationPreviewEl) {
      generationPreviewEl.hidden = true;
    }

    const globalTotal = allTeamsTotalScore(currentTeams);
    const globalAvg = (globalTotal / currentTeams.length).toFixed(2);
    const unassignedCount = currentUnassignedPlayers.length;
    const modeLabel = formatModeLabel(lastMode);
    const unassignedSummary = unassignedCount
      ? `${unassignedCount} not assigned. ${currentUnassignedReason || "They could not be placed with the current constraints."}`
      : "0 not assigned. All players were placed.";

    resultsEl.className = "results";
    resultsEl.innerHTML =
      `<article class="team-summary">
        <strong>${modeLabel} generation</strong>
        <span>${currentTeams.length} teams generated</span>
        <span>${unassignedSummary}</span>
        <span>Average team total potential per game: ${globalAvg}</span>
      </article>` +
      currentTeams
      .map((team, teamIndex) => {
        const avg = teamAverage(team).toFixed(2);
        const total = teamTotalScore(team).toFixed(2);
        const members = team
          .map((player, memberIndex) => {
            const detailParts = [
              `Avg: ${player.score.toFixed(2)}`,
              formatGenderShort(player.gender),
            ];
            const affiliationText = player.sourceTeam
              ? escapeHtml(player.sourceTeam)
              : (player.club ? escapeHtml(player.club) : "");

            return `<li>
              <div class="member-row" data-team-index="${teamIndex}" data-member-index="${memberIndex}">
                <div class="member-main">
                  <span class="member-title">${escapeHtml(player.name)}</span>
                  <span class="member-sub">${detailParts.join(" | ")}${affiliationText ? ` | ${affiliationText}` : ""}</span>
                </div>
              </div>
            </li>`;
          })
          .join("");

        return `<article class="team">
          <h3><span class="team-title">${escapeHtml(getTeamDisplayName(teamIndex))}</span><span class="team-count">(${team.length})</span></h3>
          <div class="team-meta">Avg: ${avg} | Total score: ${total}</div>
          <ul>${members}</ul>
        </article>`;
      })
      .join("");

    updateModeButtons();
    renderDataManagementPreview();
  }

  function handleTeamAction(event) {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;

    const action = target.dataset.action;
    if (!action) return;

    const row = target.closest(".member-row");
    if (!row) return;

    const teamIndex = Number(row.dataset.teamIndex);
    const memberIndex = Number(row.dataset.memberIndex);
    const team = currentTeams[teamIndex];
    if (!team || !team[memberIndex]) return;

    if (action === "remove") {
      team.splice(memberIndex, 1);
      currentTeams = currentTeams.filter((entry) => entry.length > 0);
      renderTeams();
      setStatus("Player removed from team.", false);
      return;
    }

    if (action === "edit") {
      const player = team[memberIndex];
      const nextName = window.prompt("Update player name", player.name);
      if (nextName === null) return;

      const nextScoreRaw = window.prompt("Update average score", String(player.score));
      if (nextScoreRaw === null) return;

      const nextGender = window.prompt("Update gender (female/male/other)", player.gender);
      if (nextGender === null) return;

      const nextClub = window.prompt("Update club (optional)", player.club || "");
      if (nextClub === null) return;

      const nextSourceTeam = window.prompt("Update source team (optional)", player.sourceTeam || "");
      if (nextSourceTeam === null) return;

      const trimmed = nextName.trim();
      if (trimmed) {
        player.name = trimmed;
        player.id = trimmed;
      }

      const parsed = Number(nextScoreRaw);
      if (Number.isFinite(parsed)) {
        player.score = parsed;
      }

      player.gender = normalizeGender(nextGender);
      player.club = nextClub.trim();
      player.sourceTeam = nextSourceTeam.trim();
      renderTeams();
      setStatus("Player updated.", false);
      return;
    }

    if (action === "move") {
      const nextTeamRaw = window.prompt(
        `Move ${team[memberIndex].name} to team number (1-${currentTeams.length})`,
        ""
      );
      if (nextTeamRaw === null) return;

      const targetNumber = Number(nextTeamRaw);
      if (!Number.isInteger(targetNumber) || targetNumber < 1 || targetNumber > currentTeams.length) {
        setStatus("Invalid team number.", true);
        return;
      }

      const targetTeamIndex = targetNumber - 1;
      if (targetTeamIndex === teamIndex) {
        setStatus("Member is already in that team.", true);
        return;
      }

      if (!currentTeams[targetTeamIndex]) {
        setStatus("Invalid target team.", true);
        return;
      }

      const [player] = team.splice(memberIndex, 1);
      currentTeams[targetTeamIndex].push(player);
      currentTeams = currentTeams.filter((entry) => entry.length > 0);
      renderTeams();
      setStatus("Player moved to selected team.", false);
    }
  }

  function formatOutput() {
    const unassignedLines = currentUnassignedPlayers
      .map((player) => `- ${player.name} (score: ${player.score.toFixed(2)}, gender: ${player.gender})`)
      .join("\n");

    const unassignedBlock = `\n\nUnassigned Players (${currentUnassignedPlayers.length})\n${unassignedLines || "- None"}`;

    return currentTeams
      .map((team, idx) => {
        const members = team
          .map((player) => {
            const extras = [
              `score: ${player.score.toFixed(2)}`,
              `gender: ${player.gender}`,
            ];
            if (player.club) extras.push(`club: ${player.club}`);
            if (player.sourceTeam) extras.push(`team: ${player.sourceTeam}`);
            return `- ${player.name} (${extras.join(", ")})`;
          })
          .join("\n");
        return `Team ${idx + 1} (${team.length}) [avg: ${teamAverage(team).toFixed(2)}]\n${members}`;
      })
      .join("\n\n") + unassignedBlock;
  }

  function formatCsvCell(value) {
    const text = String(value ?? "");
    if (text.includes(",") || text.includes("\"") || text.includes("\n")) {
      return `"${text.replaceAll("\"", "\"\"")}"`;
    }
    return text;
  }

  function printResults(format) {
    if (!currentTeams.length) return;
    const exportFormat = format === "png" ? "png" : "pdf";
    if (exportFormat === "png") {
      exportResultsAsPng();
      return;
    }

    const printableHtml = getPrintableHtml();
    const printWindow = window.open("", "_blank", "noopener,noreferrer");
    if (!printWindow) {
      setStatus("Could not open print window. Please allow popups and try again.", true);
      return;
    }

    printWindow.document.write(printableHtml);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    closeExportMenu();
    setStatus("Opened PDF print view for generated teams.", false);
  }

  function closeExportMenu() {
    if (!exportFormatMenuEl || !exportMenuEl) return;
    exportMenuEl.classList.remove("is-open");
    exportFormatMenuEl.setAttribute("aria-hidden", "true");
    if (printBtn) {
      printBtn.setAttribute("aria-expanded", "false");
    }
  }

  function toggleExportMenu() {
    if (!exportFormatMenuEl || !exportMenuEl || !printBtn || printBtn.disabled) return;
    const nextOpen = !exportMenuEl.classList.contains("is-open");
    exportMenuEl.classList.toggle("is-open", nextOpen);
    exportFormatMenuEl.setAttribute("aria-hidden", String(!nextOpen));
    printBtn.setAttribute("aria-expanded", String(nextOpen));
  }

  function exportCsvResults() {
    if (!currentTeams.length) return;

    const lines = [];

    currentTeams.forEach((team, teamIndex) => {
      lines.push([
        getTeamDisplayName(teamIndex),
        "Total score",
        teamTotalScore(team).toFixed(2),
        "",
        "",
      ].map(formatCsvCell).join(","));
      lines.push(["Member", "Score", "Gender", "Club", "SourceTeam"].map(formatCsvCell).join(","));

      team.forEach((player) => {
        lines.push([
          player.name,
          player.score.toFixed(2),
          player.gender,
          player.club || "",
          player.sourceTeam || "",
        ].map(formatCsvCell).join(","));
      });

      // Separator row between teams for clearer grouped reading in spreadsheet tools.
      lines.push(["-----", "", "", "", ""].map(formatCsvCell).join(","));
    });

    if (currentUnassignedPlayers.length) {
      lines.push(["Unassigned", "", "", "", ""].map(formatCsvCell).join(","));
      lines.push(["Member", "Score", "Gender", "Club", "SourceTeam"].map(formatCsvCell).join(","));
      currentUnassignedPlayers.forEach((player) => {
        lines.push([
          player.name,
          player.score.toFixed(2),
          player.gender,
          player.club || "",
          player.sourceTeam || "",
        ].map(formatCsvCell).join(","));
      });
    }

    const blob = new Blob(["\uFEFF", lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "btm-teams.csv";
    link.click();
    URL.revokeObjectURL(url);
    setStatus("Exported btm-teams.csv", false);
  }

  function getPrintableSectionHtml() {
    const stamp = new Date().toLocaleString();
    return `
      <div class="print-wrap">
        <header class="print-header">
          <h1>Team-Generator</h1>
          <p>Generated Teams</p>
        </header>
        <main class="print-results"><div class="results">${resultsEl.innerHTML}</div></main>
        <footer class="print-footer">Generated at ${stamp}</footer>
      </div>
    `;
  }

  function getPrintableStyles() {
    const gridColumns = dataManagementViewMode === "small" ? 6 : 3;
    return `
      body { font-family: "Noto Sans", Arial, sans-serif; margin: 0; padding: 18px; color: #0f172a; }
      .print-header h1 { margin: 0; font-size: 24px; }
      .print-header p { margin: 4px 0 14px; color: #334155; }
      .print-results .results { display: grid; grid-template-columns: repeat(${gridColumns}, minmax(0, 1fr)); gap: 10px; }
      .print-results .team-summary { grid-column: 1 / -1; margin-bottom: 0; padding: 8px 10px; border: 1px solid #cbd5e1; border-radius: 8px; }
      .print-results .team { border: 1px solid #cbd5e1; border-radius: 8px; padding: 10px; margin-bottom: 0; }
      .print-results .team h3 { margin: 0 0 6px; display: flex; justify-content: space-between; }
      .print-results .team-meta { margin-bottom: 8px; color: #334155; font-size: 13px; }
      .print-results .team ul { list-style: none; padding: 0; margin: 0; }
      .print-results .team li { padding: 4px 0; border-bottom: 1px solid #e2e8f0; }
      .print-results .team li:last-child { border-bottom: 0; }
      .print-results .member-title { font-weight: 700; }
      .print-results .member-sub { color: #334155; font-size: 12px; display: block; margin-top: 2px; }
      .print-footer { margin-top: 12px; font-size: 12px; color: #475569; }
    `;
  }

  function getPrintableHtml() {
    return `<!doctype html>
<html>
<head>
  <meta charset="UTF-8" />
  <title>Generated Teams</title>
  <style>${getPrintableStyles()}</style>
</head>
<body>${getPrintableSectionHtml()}</body>
</html>`;
  }

  function ensureHtml2Canvas() {
    if (window.html2canvas) return Promise.resolve(window.html2canvas);
    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js";
      script.onload = function () {
        resolve(window.html2canvas);
      };
      script.onerror = function () {
        reject(new Error("Failed to load html2canvas."));
      };
      document.head.appendChild(script);
    });
  }

  async function exportResultsAsPng() {
    if (!currentTeams.length) return;
    try {
      const html2canvas = await ensureHtml2Canvas();
      const mount = document.createElement("div");
      mount.style.position = "fixed";
      mount.style.left = "-99999px";
      mount.style.top = "0";
      const viewWidth = Math.max(1100, Math.floor(resultsCardEl?.getBoundingClientRect().width || 1200));
      mount.style.width = `${viewWidth}px`;
      mount.style.background = "#ffffff";
      mount.style.color = "#0f172a";
      mount.style.padding = "18px";
      mount.style.fontFamily = '"Noto Sans", Arial, sans-serif';
      mount.innerHTML = `<style>${getPrintableStyles()}</style>${getPrintableSectionHtml()}`;
      document.body.appendChild(mount);

      const canvas = await html2canvas(mount, { backgroundColor: "#ffffff", scale: 2 });
      document.body.removeChild(mount);

      const link = document.createElement("a");
      link.href = canvas.toDataURL("image/png");
      link.download = "btm-generated-teams.png";
      link.click();
      setStatus("Exported btm-generated-teams.png", false);
    } catch (_) {
      setStatus("PNG export failed. Please try PDF print instead.", true);
    }
  }

  function editTeamFlow() {
    if (!currentTeams.length) return;

    const teamRaw = window.prompt(`Select team number to edit (1-${currentTeams.length})`, "1");
    if (teamRaw === null) return;
    const teamNumber = Number(teamRaw);
    if (!Number.isInteger(teamNumber) || teamNumber < 1 || teamNumber > currentTeams.length) {
      setStatus("Invalid team number.", true);
      return;
    }

    const teamIndex = teamNumber - 1;
    const optionRaw = window.prompt(
      `Edit ${getTeamDisplayName(teamIndex)}:\n1) Remove team\n2) Rename team\n3) Edit member ID\n4) Move member\n5) Swap members\nEnter option number`,
      "2"
    );
    if (optionRaw === null) return;

    const option = Number(optionRaw);
    if (!Number.isInteger(option) || option < 1 || option > 5) {
      setStatus("Invalid edit option.", true);
      return;
    }

    if (option === 1) {
      const removed = currentTeams.splice(teamIndex, 1)[0] || [];
      const removedName = getTeamDisplayName(teamIndex);
      teamNameOverrides.splice(teamIndex, 1);
      currentUnassignedPlayers = currentUnassignedPlayers.concat(removed);
      currentUnassignedReason = buildUnassignedReason([
        currentUnassignedReason,
        `${removed.length} player(s) moved to unassigned after deleting ${removedName}.`,
      ]);
      syncTeamNameOverrides();
      renderTeams();
      setActionButtons(currentTeams.length > 0);
      setStatus(`Removed ${removedName}.`, false);
      return;
    }

    if (option === 2) {
      const nextName = window.prompt("New team name", getTeamDisplayName(teamIndex));
      if (nextName === null) return;
      const trimmed = nextName.trim();
      if (!trimmed) {
        setStatus("Team name cannot be empty.", true);
        return;
      }
      teamNameOverrides[teamIndex] = trimmed;
      renderTeams();
      setStatus("Team renamed.", false);
      return;
    }

    if (option === 3) {
      const memberRaw = window.prompt(`Member number in ${getTeamDisplayName(teamIndex)} (1-${currentTeams[teamIndex].length})`, "1");
      if (memberRaw === null) return;
      const memberIndex = Number(memberRaw) - 1;
      const member = currentTeams[teamIndex][memberIndex];
      if (!member) {
        setStatus("Invalid member number.", true);
        return;
      }
      const nextId = window.prompt("New member ID / name", member.name);
      if (nextId === null) return;
      const trimmed = nextId.trim();
      if (!trimmed) {
        setStatus("Member ID cannot be empty.", true);
        return;
      }
      member.name = trimmed;
      member.id = trimmed;
      renderTeams();
      setStatus("Member ID updated.", false);
      return;
    }

    if (option === 4) {
      const sourceMemberRaw = window.prompt(`Member number in ${getTeamDisplayName(teamIndex)} to move (1-${currentTeams[teamIndex].length})`, "1");
      if (sourceMemberRaw === null) return;
      const sourceMemberIndex = Number(sourceMemberRaw) - 1;
      const player = currentTeams[teamIndex][sourceMemberIndex];
      if (!player) {
        setStatus("Invalid member number.", true);
        return;
      }
      const targetTeamRaw = window.prompt(`Move to team number (1-${currentTeams.length})`, String(Math.min(currentTeams.length, teamIndex + 2)));
      if (targetTeamRaw === null) return;
      const targetTeamIndex = Number(targetTeamRaw) - 1;
      if (!currentTeams[targetTeamIndex]) {
        setStatus("Invalid target team.", true);
        return;
      }
      const [moved] = currentTeams[teamIndex].splice(sourceMemberIndex, 1);
      currentTeams[targetTeamIndex].push(moved);
      currentTeams = currentTeams.filter((team) => team.length > 0);
      syncTeamNameOverrides();
      renderTeams();
      setStatus("Member moved.", false);
      return;
    }

    const sourceMemberRaw = window.prompt(`Member number in ${getTeamDisplayName(teamIndex)} to swap (1-${currentTeams[teamIndex].length})`, "1");
    if (sourceMemberRaw === null) return;
    const sourceMemberIndex = Number(sourceMemberRaw) - 1;
    const sourceMember = currentTeams[teamIndex][sourceMemberIndex];
    if (!sourceMember) {
      setStatus("Invalid member number.", true);
      return;
    }

    const targetTeamRaw = window.prompt(`Target team number for swap (1-${currentTeams.length})`, String(Math.min(currentTeams.length, teamIndex + 2)));
    if (targetTeamRaw === null) return;
    const targetTeamIndex = Number(targetTeamRaw) - 1;
    if (!currentTeams[targetTeamIndex]) {
      setStatus("Invalid target team.", true);
      return;
    }

    const targetMemberRaw = window.prompt(`Target member number in ${getTeamDisplayName(targetTeamIndex)} (1-${currentTeams[targetTeamIndex].length})`, "1");
    if (targetMemberRaw === null) return;
    const targetMemberIndex = Number(targetMemberRaw) - 1;
    const targetMember = currentTeams[targetTeamIndex][targetMemberIndex];
    if (!targetMember) {
      setStatus("Invalid target member number.", true);
      return;
    }

    currentTeams[teamIndex][sourceMemberIndex] = targetMember;
    currentTeams[targetTeamIndex][targetMemberIndex] = sourceMember;
    renderTeams();
    setStatus("Members swapped.", false);
  }

  function saveSnapshot() {
    if (!currentTeams.length) return;

    const snapshot = {
      savedAt: new Date().toISOString(),
      mode: lastMode,
      teams: currentTeams,
      settings: {
        personsPerTeam: toPositiveInt(personsPerTeamInput.value),
        maxDeviation: toNonNegativeNumber(maxDeviationInput.value),
        strictDeviationRule: strictDeviationRuleInput.value,
        femaleRuleEnabled: femaleRuleToggle.checked,
        maxFemalesPerTeam: toPositiveInt(maxFemalesPerTeamInput.value),
        strictTeamSize: strictTeamSizeInput.value,
      },
    };

    localStorage.setItem(SNAPSHOT_KEY, JSON.stringify(snapshot));
    dataManagementUnlocked = true;
    setActionButtons(true);
    renderDataManagementPreview();
    setStatus("Team snapshot saved in browser storage.", false);
  }

  function loadSnapshot() {
    const raw = localStorage.getItem(SNAPSHOT_KEY);
    if (!raw) return;

    try {
      const parsed = JSON.parse(raw);
      if (!parsed || !Array.isArray(parsed.teams)) return;
      currentTeams = parsed.teams;
      lastMode = parsed.mode || null;
      teamNameOverrides = currentTeams.map((_, index) => `Team ${index + 1}`);
      currentUnassignedPlayers = [];
      currentUnassignedReason = "";
      dataManagementUnlocked = true;
      renderTeams();
      setActionButtons(true);
      renderDataManagementPreview();
      setStatus("Loaded saved team snapshot from browser storage.", false);
    } catch (_) {
      localStorage.removeItem(SNAPSHOT_KEY);
    }
  }

  generateRandomBtn.addEventListener("click", function () {
    generate("random");
  });

  generateBalancedBtn.addEventListener("click", function () {
    generate("balanced");
  });

  reshuffleBtn.addEventListener("click", function () {
    if (!lastMode) {
      setStatus("Generate teams first.", true);
      return;
    }
    generate(lastMode);
  });

  saveBtn.addEventListener("click", saveSnapshot);
  if (printBtn) {
    printBtn.addEventListener("click", function () {
      toggleExportMenu();
    });
  }

  if (exportFormatMenuEl) {
    exportFormatMenuEl.addEventListener("click", function (event) {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      const option = target.closest("button[data-format]");
      if (!(option instanceof HTMLButtonElement)) return;
      const format = option.dataset.format;
      printResults(format);
    });
  }

  document.addEventListener("click", function (event) {
    if (!exportMenuEl || !exportFormatMenuEl || !exportMenuEl.classList.contains("is-open")) return;
    const target = event.target;
    if (!(target instanceof Node)) return;
    if (!exportMenuEl.contains(target)) {
      closeExportMenu();
    }
  });

  exportCsvBtn.addEventListener("click", exportCsvResults);
  editTeamsBtn.addEventListener("click", function () {
    editTeamFlow();
  });
  resultsEl.addEventListener("click", handleTeamAction);

  csvFileInput.addEventListener("change", function (event) {
    const file = event.target.files && event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (loadEvent) {
      const content = typeof loadEvent.target.result === "string" ? loadEvent.target.result : "";
      onCsvLoaded(content);
    };
    reader.onerror = function () {
      setStatus("Could not read the selected CSV file.", true);
    };
    reader.readAsText(file);
  });

  participantsInput.addEventListener("input", function () {
    clearGeneratedTeamsOnDataChange();
    updateImportStats();
  });
  dataSourceInput.addEventListener("change", function () {
    clearGeneratedTeamsOnDataChange();
    updateDataSourceVisibility();
    updateImportStats();
  });
  personsPerTeamInput.addEventListener("input", updateTeamCountPreview);
  strictTeamSizeInput.addEventListener("change", updateTeamCountPreview);

  sideNavButtons.forEach((button) => {
    button.addEventListener("click", function () {
      showWorkflowPanel(button.dataset.panel);
      setSidebarOpen(false);
    });
  });

  if (viewNormalBtn) {
    viewNormalBtn.addEventListener("click", function () {
      setDataManagementViewMode("normal");
    });
  }

  if (viewSmallBtn) {
    viewSmallBtn.addEventListener("click", function () {
      setDataManagementViewMode("small");
    });
  }

  if (sidebarToggleBtn) {
    sidebarToggleBtn.addEventListener("click", function () {
      const shouldOpen = !document.body.classList.contains("sidebar-open");
      setSidebarOpen(shouldOpen);
    });
  }

  if (sidebarCloseBtn) {
    sidebarCloseBtn.addEventListener("click", function () {
      setSidebarOpen(false);
    });
  }

  if (sidebarBackdropEl) {
    sidebarBackdropEl.addEventListener("click", function () {
      setSidebarOpen(false);
    });
  }

  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && document.body.classList.contains("sidebar-open")) {
      setSidebarOpen(false);
      return;
    }
    if (event.key === "Escape") {
      closeExportMenu();
    }
  });

  femaleRuleToggle.addEventListener("change", function () {
    maxFemalesPerTeamInput.disabled = !femaleRuleToggle.checked;
    if (!femaleRuleToggle.checked) {
      maxFemalesPerTeamInput.value = "";
    }
    updateTeamCountPreview();
  });

  setActionButtons(false);
  updateDataSourceVisibility();
  updateImportStats();
  setResultsVisibility(false);
  setSidebarOpen(false);
  setDataManagementViewMode(dataManagementViewMode);
  renderDataManagementPreview();
  showWorkflowPanel("loadDataSection");
  loadSnapshot();
})();
(function () {
  if (window.__btmTeamGeneratorInitialized) return;

  const participantsInput = document.getElementById("participants");
  const dataSourceInput = document.getElementById("dataSource");
  const csvFileInput = document.getElementById("csvFile");
  const csvHeaderToggle = document.getElementById("csvHeaderToggle");
  const csvMetaEl = document.getElementById("csvMeta");

  const statTotalEl = document.getElementById("statTotal");
  const statFemaleEl = document.getElementById("statFemale");
  const statMaleEl = document.getElementById("statMale");
  const statOtherEl = document.getElementById("statOther");

  const personsPerTeamInput = document.getElementById("personsPerTeam");
  const maxDeviationInput = document.getElementById("maxDeviation");
  const femaleRuleToggle = document.getElementById("femaleRuleToggle");
  const maxFemalesPerTeamInput = document.getElementById("maxFemalesPerTeam");
  const teamCountPreviewEl = document.getElementById("teamCountPreview");

  const generateRandomBtn = document.getElementById("generateRandomBtn");
  const generateBalancedBtn = document.getElementById("generateBalancedBtn");
  const reshuffleBtn = document.getElementById("reshuffleBtn");
  const saveBtn = document.getElementById("saveBtn");
  const copyBtn = document.getElementById("copyBtn");
  const exportBtn = document.getElementById("exportBtn");

  const resultsEl = document.getElementById("results");
  const statusEl = document.getElementById("status");

  const SNAPSHOT_KEY = "btm-team-generator:lastSnapshot";

  let csvState = null;
  let currentPlayers = [];
  let currentTeams = [];
  let lastMode = null;

  function toPositiveInt(value) {
    if (!value) return null;
    const num = Number(value);
    if (!Number.isInteger(num) || num <= 0) return null;
    return num;
  }

  function toNonNegativeNumber(value) {
    if (value === "" || value === null || value === undefined) return null;
    const num = Number(value);
    if (!Number.isFinite(num) || num < 0) return null;
    return num;
  }

  function setStatus(message, isError) {
    statusEl.textContent = message;
    statusEl.classList.toggle("error", Boolean(isError));
  }

  function escapeHtml(input) {
    return String(input)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  function normalizeGender(value) {
    const raw = String(value || "").trim().toLowerCase();
    if (!raw) return "unknown";
    if (["female", "f", "woman", "girl"].includes(raw)) return "female";
    if (["male", "m", "man", "boy"].includes(raw)) return "male";
    return "other";
  }

  function parseManualPlayers(raw) {
    const values = raw
      .split(/[\n,;]+/)
      .map((value) => value.trim())
      .filter(Boolean);

    const seen = new Set();
    const players = [];

    values.forEach((name) => {
      const key = name.toLowerCase();
      if (seen.has(key)) return;
      seen.add(key);
      players.push({
        id: name,
        name,
        score: 0,
        gender: "unknown",
        club: "",
        sourceTeam: "",
      });
    });

    return players;
  }

  function splitCsvLine(line, delimiter) {
    const values = [];
    let current = "";
    let quoted = false;

    for (let i = 0; i < line.length; i += 1) {
      const char = line[i];
      if (char === '"') {
        if (quoted && line[i + 1] === '"') {
          current += '"';
          i += 1;
        } else {
          quoted = !quoted;
        }
        continue;
      }

      if (char === delimiter && !quoted) {
        values.push(current.trim());
        current = "";
        continue;
      }

      current += char;
    }

    values.push(current.trim());
    return values;
  }

  function detectCsvDelimiter(lines) {
    const sample = lines.slice(0, 5).join("\n");
    const options = [",", ";", "\t"];
    let best = ",";
    let bestScore = -1;

    options.forEach((candidate) => {
      const score = sample.split(candidate).length;
      if (score > bestScore) {
        best = candidate;
        bestScore = score;
      }
    });

    return best;
  }

  function parseCsv(raw) {
    const normalized = raw.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
    const lines = normalized
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);

    if (!lines.length) return null;

    const delimiter = detectCsvDelimiter(lines);
    const rows = lines.map((line) => splitCsvLine(line, delimiter));
    const columnCount = Math.max(...rows.map((row) => row.length));
    return { rows, delimiter, columnCount };
  }

  function parseScore(value) {
    const clean = String(value || "").replace(/[^0-9.-]/g, "");
    const num = Number(clean);
    if (!Number.isFinite(num)) return 0;
    return num;
  }

  function nonEmptyRatio(values) {
    if (!values.length) return 0;
    const nonEmpty = values.filter((value) => String(value || "").trim() !== "").length;
    return nonEmpty / values.length;
  }

  function numericRatio(values) {
    const filled = values.map((value) => String(value || "").trim()).filter(Boolean);
    if (!filled.length) return 0;
    const numeric = filled.filter((value) => Number.isFinite(Number(value.replace(/[^0-9.-]/g, "")))).length;
    return numeric / filled.length;
  }

  function genderRatio(values) {
    const filled = values.map((value) => String(value || "").trim()).filter(Boolean);
    if (!filled.length) return 0;
    const valid = filled.filter((value) => {
      const normalized = normalizeGender(value);
      return normalized === "female" || normalized === "male" || /^(other|unknown|na|n\/a)$/i.test(value);
    }).length;
    return valid / filled.length;
  }

  function uniqueRatio(values) {
    const filled = values.map((value) => String(value || "").trim()).filter(Boolean);
    if (!filled.length) return 0;
    return new Set(filled.map((value) => value.toLowerCase())).size / filled.length;
  }

  function hasHeaderRow(rows) {
    const firstRow = rows[0] || [];
    return firstRow.some((value) => /(name|id|score|average|avg|gender|sex|participant|member|club|team)/i.test(String(value)));
  }

  function detectMapping(rows, startIndex, columnCount) {
    const header = rows[0] || [];
    let nameIndex = -1;
    let scoreIndex = -1;
    let genderIndex = -1;
    let clubIndex = -1;
    let sourceTeamIndex = -1;

    for (let i = 0; i < columnCount; i += 1) {
      const cell = String(header[i] || "");
      if (nameIndex < 0 && /(name|name id|id|participant|member|student)/i.test(cell)) nameIndex = i;
      if (scoreIndex < 0 && /(average score|avg score|score|average|avg|skill|level)/i.test(cell)) scoreIndex = i;
      if (genderIndex < 0 && /(gender|sex)/i.test(cell)) genderIndex = i;
      if (clubIndex < 0 && /(club|group|organization|org)/i.test(cell)) clubIndex = i;
      if (sourceTeamIndex < 0 && /(team|class|house|squad)/i.test(cell)) sourceTeamIndex = i;
    }

    const dataRows = rows.slice(startIndex);
    const columnValues = Array.from({ length: columnCount }, (_, index) =>
      dataRows.map((row) => String(row[index] || "").trim())
    );

    if (scoreIndex < 0) {
      let bestScore = -1;
      for (let i = 0; i < columnCount; i += 1) {
        const score = numericRatio(columnValues[i]);
        if (score > bestScore) {
          bestScore = score;
          scoreIndex = i;
        }
      }
    }

    if (genderIndex < 0) {
      let bestGender = 0;
      for (let i = 0; i < columnCount; i += 1) {
        const score = genderRatio(columnValues[i]);
        if (score > bestGender && score >= 0.6) {
          bestGender = score;
          genderIndex = i;
        }
      }
    }

    if (nameIndex < 0) {
      let bestName = -1;
      for (let i = 0; i < columnCount; i += 1) {
        if (i === scoreIndex || i === genderIndex) continue;
        const values = columnValues[i];
        const score = nonEmptyRatio(values) * 0.5 + uniqueRatio(values) * 0.4 + (1 - numericRatio(values)) * 0.1;
        if (score > bestName) {
          bestName = score;
          nameIndex = i;
        }
      }
    }

    if (nameIndex < 0) nameIndex = 0;
    if (scoreIndex < 0) scoreIndex = Math.min(1, columnCount - 1);

    return { nameIndex, scoreIndex, genderIndex, clubIndex, sourceTeamIndex };
  }

  function onCsvLoaded(raw) {
    const parsed = parseCsv(raw);
    if (!parsed) {
      csvState = null;
      refreshCsvMeta();
      setStatus("CSV file is empty or invalid.", true);
      return;
    }

    const headerDetected = hasHeaderRow(parsed.rows);
    csvHeaderToggle.checked = headerDetected;
    const startIndex = headerDetected ? 1 : 0;
    const mapping = detectMapping(parsed.rows, startIndex, parsed.columnCount);

    csvState = {
      ...parsed,
      mapping,
    };

    refreshCsvMeta();
    setStatus("CSV imported and columns auto-detected.", false);
  }

  function buildPlayersFromCsv() {
    if (!csvState || !csvState.rows.length) return [];

    const hasHeader = csvHeaderToggle.checked;
    const rows = csvState.rows.slice(hasHeader ? 1 : 0);
    const nameIndex = csvState.mapping.nameIndex;
    const scoreIndex = csvState.mapping.scoreIndex;
    const genderIndex = csvState.mapping.genderIndex;
    const clubIndex = csvState.mapping.clubIndex;
    const sourceTeamIndex = csvState.mapping.sourceTeamIndex;

    const seen = new Set();
    const players = [];

    rows.forEach((row) => {
      const name = String(row[nameIndex] || "").trim();
      if (!name) return;

      const key = name.toLowerCase();
      if (seen.has(key)) return;
      seen.add(key);

      players.push({
        id: name,
        name,
        score: parseScore(row[scoreIndex]),
        gender: normalizeGender(genderIndex >= 0 ? row[genderIndex] : ""),
        club: clubIndex >= 0 ? String(row[clubIndex] || "").trim() : "",
        sourceTeam: sourceTeamIndex >= 0 ? String(row[sourceTeamIndex] || "").trim() : "",
      });
    });

    return players;
  }

  function getPlayersFromSource() {
    const source = dataSourceInput.value;
    const manualPlayers = parseManualPlayers(participantsInput.value);
    const csvPlayers = buildPlayersFromCsv();

    if (source === "csv") return csvPlayers;

    if (source === "merged") {
      const merged = new Map();
      manualPlayers.forEach((p) => merged.set(p.name.toLowerCase(), p));
      csvPlayers.forEach((p) => merged.set(p.name.toLowerCase(), p));
      return Array.from(merged.values());
    }

    return manualPlayers;
  }

  function countGenders(players) {
    const counters = { female: 0, male: 0, other: 0 };
    players.forEach((player) => {
      const gender = normalizeGender(player.gender);
      if (gender === "female") counters.female += 1;
      else if (gender === "male") counters.male += 1;
      else counters.other += 1;
    });
    return counters;
  }

  function updateTeamCountPreview() {
    const total = currentPlayers.length;
    const personsPerTeam = toPositiveInt(personsPerTeamInput.value);

    if (!personsPerTeam || !total) {
      teamCountPreviewEl.textContent = "Possible teams: 0 (set persons per team and import players).";
      return;
    }

    const fullTeams = Math.floor(total / personsPerTeam);
    const remainder = total % personsPerTeam;
    const possibleTeams = Math.ceil(total / personsPerTeam);
    teamCountPreviewEl.textContent = `Possible teams: ${possibleTeams} (full teams: ${fullTeams}, remainder players: ${remainder}).`;
  }

  function updateImportStats() {
    currentPlayers = getPlayersFromSource();
    const genders = countGenders(currentPlayers);

    statTotalEl.textContent = String(currentPlayers.length);
    statFemaleEl.textContent = String(genders.female);
    statMaleEl.textContent = String(genders.male);
    statOtherEl.textContent = String(genders.other);

    updateTeamCountPreview();
  }

  function refreshCsvMeta() {
    if (!csvState) {
      csvMetaEl.textContent = "No CSV imported yet.";
      updateImportStats();
      return;
    }

    const start = csvHeaderToggle.checked ? 1 : 0;
    const dataRows = Math.max(0, csvState.rows.length - start);
    const mapping = csvState.mapping;

    const genderText = mapping.genderIndex >= 0 ? String(mapping.genderIndex + 1) : "not found";
    const clubText = mapping.clubIndex >= 0 ? String(mapping.clubIndex + 1) : "not found";
    const teamText = mapping.sourceTeamIndex >= 0 ? String(mapping.sourceTeamIndex + 1) : "not found";

    csvMetaEl.textContent = `CSV loaded: ${dataRows} data row(s), ${csvState.columnCount} column(s). Auto-detected columns -> Name: ${mapping.nameIndex + 1}, Score: ${mapping.scoreIndex + 1}, Gender: ${genderText}, Club: ${clubText}, Team: ${teamText}.`;
    updateImportStats();
  }

  function shuffle(list) {
    const arr = list.slice();
    for (let i = arr.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      const temp = arr[i];
      arr[i] = arr[j];
      arr[j] = temp;
    }
    return arr;
  }

  function createSnakeOrder(teamCount, length) {
    const order = [];
    let direction = 1;
    let team = 0;

    for (let i = 0; i < length; i += 1) {
      order.push(team);
      if (direction === 1 && team === teamCount - 1) direction = -1;
      else if (direction === -1 && team === 0) direction = 1;
      else team += direction;
    }

    return order;
  }

  function teamAverage(team) {
    if (!team.length) return 0;
    const total = team.reduce((sum, member) => sum + member.score, 0);
    return total / team.length;
  }

  function femaleCount(team) {
    return team.reduce((sum, member) => sum + (normalizeGender(member.gender) === "female" ? 1 : 0), 0);
  }

  function allowedByFemaleRule(team, player, enabled, maxFemalesPerTeam) {
    if (!enabled) return true;
    if (normalizeGender(player.gender) !== "female") return true;
    return femaleCount(team) < maxFemalesPerTeam;
  }

  function makeTeams(count) {
    return Array.from({ length: count }, () => []);
  }

  function assignRandom(players, teamCount, personsPerTeam, femaleRuleEnabled, maxFemalesPerTeam) {
    const teams = makeTeams(teamCount);
    const randomized = shuffle(players);

    randomized.forEach((player) => {
      const candidates = teams.filter((team) => {
        if (team.length >= personsPerTeam) return false;
        return allowedByFemaleRule(team, player, femaleRuleEnabled, maxFemalesPerTeam);
      });

      const target = candidates.length
        ? candidates[Math.floor(Math.random() * candidates.length)]
        : teams.reduce((best, team) => (team.length < best.length ? team : best), teams[0]);

      target.push(player);
    });

    return teams;
  }

  function assignBalanced(players, teamCount, personsPerTeam, femaleRuleEnabled, maxFemalesPerTeam) {
    const teams = makeTeams(teamCount);
    const sorted = players.slice().sort((a, b) => b.score - a.score);
    const snake = createSnakeOrder(teamCount, sorted.length);

    sorted.forEach((player, idx) => {
      const preferredIndex = snake[idx];
      const preferred = teams[preferredIndex];

      if (
        preferred.length < personsPerTeam &&
        allowedByFemaleRule(preferred, player, femaleRuleEnabled, maxFemalesPerTeam)
      ) {
        preferred.push(player);
        return;
      }

      const fallback = teams
        .filter((team) => team.length < personsPerTeam)
        .filter((team) => allowedByFemaleRule(team, player, femaleRuleEnabled, maxFemalesPerTeam))
        .sort((a, b) => teamAverage(a) - teamAverage(b));

      if (fallback.length) {
        fallback[0].push(player);
      } else {
        teams.reduce((best, team) => (team.length < best.length ? team : best), teams[0]).push(player);
      }
    });

    return teams;
  }

  function scoreDeviation(teams) {
    const avgs = teams.map((team) => teamAverage(team));
    const max = Math.max(...avgs);
    const min = Math.min(...avgs);
    return max - min;
  }

  function validateBeforeGenerate() {
    updateImportStats();

    if (currentPlayers.length < 2) {
      return "Please import or enter at least 2 players.";
    }

    const personsPerTeam = toPositiveInt(personsPerTeamInput.value);
    if (!personsPerTeam) {
      return "Please set Persons Per Team with a positive number.";
    }

    if (personsPerTeam > currentPlayers.length) {
      return "Persons Per Team cannot exceed total players.";
    }

    if ((dataSourceInput.value === "csv" || dataSourceInput.value === "merged") && !csvState) {
      return "Please import a CSV file first, or switch Data Source to manual only.";
    }

    if (femaleRuleToggle.checked) {
      const maxFemales = toPositiveInt(maxFemalesPerTeamInput.value);
      if (!maxFemales) {
        return "Please set Max Females Per Team when gender rule is enabled.";
      }
      if (maxFemales > personsPerTeam) {
        return "Max Females Per Team cannot exceed Persons Per Team.";
      }
    }

    return null;
  }

  function setActionButtons(enabled) {
    reshuffleBtn.disabled = !enabled;
    saveBtn.disabled = !enabled;
    copyBtn.disabled = !enabled;
    exportBtn.disabled = !enabled;
  }

  function generate(mode) {
    const error = validateBeforeGenerate();
    if (error) {
      setStatus(error, true);
      return;
    }

    const players = currentPlayers.slice();
    const personsPerTeam = toPositiveInt(personsPerTeamInput.value);
    const teamCount = Math.ceil(players.length / personsPerTeam);

    const femaleRuleEnabled = femaleRuleToggle.checked;
    const maxFemalesPerTeam = toPositiveInt(maxFemalesPerTeamInput.value) || Number.MAX_SAFE_INTEGER;

    currentTeams = mode === "balanced"
      ? assignBalanced(players, teamCount, personsPerTeam, femaleRuleEnabled, maxFemalesPerTeam)
      : assignRandom(players, teamCount, personsPerTeam, femaleRuleEnabled, maxFemalesPerTeam);

    lastMode = mode;
    renderTeams();
    setActionButtons(true);

    const deviation = scoreDeviation(currentTeams);
    const maxDeviation = toNonNegativeNumber(maxDeviationInput.value);

    if (maxDeviation !== null && deviation > maxDeviation) {
      setStatus(
        `Generated ${teamCount} teams with ${mode} mode. Deviation ${deviation.toFixed(2)} exceeds max ${maxDeviation.toFixed(2)}.`,
        true
      );
    } else {
      setStatus(`Generated ${teamCount} teams with ${mode} mode. Current deviation: ${deviation.toFixed(2)}.`, false);
    }
  }

  function renderTeams() {
    if (!currentTeams.length) {
      resultsEl.className = "results empty";
      resultsEl.textContent = "No teams generated yet.";
      return;
    }

    resultsEl.className = "results";
    resultsEl.innerHTML = currentTeams
      .map((team, teamIndex) => {
        const avg = teamAverage(team).toFixed(2);
        const members = team
          .map((player, memberIndex) => {
            const moveOptions = currentTeams
              .map((_, idx) => (idx === teamIndex ? "" : `<option value="${idx}">Team ${idx + 1}</option>`))
              .join("");

            const clubPart = player.club ? ` | Club: ${escapeHtml(player.club)}` : "";
            const teamPart = player.sourceTeam ? ` | Team: ${escapeHtml(player.sourceTeam)}` : "";

            return `<li>
              <div class="member-row" data-team-index="${teamIndex}" data-member-index="${memberIndex}">
                <div class="member-main">
                  <span class="member-title">${escapeHtml(player.name)}</span>
                  <span class="member-sub">Score: ${player.score.toFixed(2)} | Gender: ${escapeHtml(player.gender)}${clubPart}${teamPart}</span>
                </div>
                <button type="button" class="secondary" data-action="edit">Edit</button>
                <button type="button" class="secondary" data-action="remove">Remove</button>
                <div>
                  <select data-action="move-target">
                    <option value="">Move to...</option>
                    ${moveOptions}
                  </select>
                  <button type="button" class="secondary" data-action="move">Move</button>
                </div>
              </div>
            </li>`;
          })
          .join("");

        return `<article class="team">
          <h3>Team ${teamIndex + 1} (${team.length})</h3>
          <div class="team-meta">Average score: ${avg}</div>
          <ul>${members}</ul>
        </article>`;
      })
      .join("");
  }

  function handleTeamAction(event) {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;

    const action = target.dataset.action;
    if (!action) return;

    const row = target.closest(".member-row");
    if (!row) return;

    const teamIndex = Number(row.dataset.teamIndex);
    const memberIndex = Number(row.dataset.memberIndex);
    const team = currentTeams[teamIndex];
    if (!team || !team[memberIndex]) return;

    if (action === "remove") {
      team.splice(memberIndex, 1);
      currentTeams = currentTeams.filter((entry) => entry.length > 0);
      renderTeams();
      setStatus("Player removed from team.", false);
      return;
    }

    if (action === "edit") {
      const player = team[memberIndex];
      const nextName = window.prompt("Update player name", player.name);
      if (nextName === null) return;

      const nextScoreRaw = window.prompt("Update average score", String(player.score));
      if (nextScoreRaw === null) return;

      const nextGender = window.prompt("Update gender (female/male/other)", player.gender);
      if (nextGender === null) return;

      const nextClub = window.prompt("Update club (optional)", player.club || "");
      if (nextClub === null) return;

      const nextSourceTeam = window.prompt("Update source team (optional)", player.sourceTeam || "");
      if (nextSourceTeam === null) return;

      const trimmed = nextName.trim();
      if (trimmed) {
        player.name = trimmed;
        player.id = trimmed;
      }

      const parsed = Number(nextScoreRaw);
      if (Number.isFinite(parsed)) {
        player.score = parsed;
      }

      player.gender = normalizeGender(nextGender);
      player.club = nextClub.trim();
      player.sourceTeam = nextSourceTeam.trim();
      renderTeams();
      setStatus("Player updated.", false);
      return;
    }

    if (action === "move") {
      const select = row.querySelector('select[data-action="move-target"]');
      if (!(select instanceof HTMLSelectElement)) return;

      if (select.value === "") {
        setStatus("Select a target team first.", true);
        return;
      }

      const targetTeamIndex = Number(select.value);
      if (!currentTeams[targetTeamIndex]) {
        setStatus("Invalid target team.", true);
        return;
      }

      const [player] = team.splice(memberIndex, 1);
      currentTeams[targetTeamIndex].push(player);
      currentTeams = currentTeams.filter((entry) => entry.length > 0);
      renderTeams();
      setStatus("Player moved to selected team.", false);
    }
  }

  function formatOutput() {
    return currentTeams
      .map((team, idx) => {
        const members = team
          .map((player) => {
            const extras = [
              `score: ${player.score.toFixed(2)}`,
              `gender: ${player.gender}`,
            ];
            if (player.club) extras.push(`club: ${player.club}`);
            if (player.sourceTeam) extras.push(`team: ${player.sourceTeam}`);
            return `- ${player.name} (${extras.join(", ")})`;
          })
          .join("\n");

        return `Team ${idx + 1} (${team.length}) [avg: ${teamAverage(team).toFixed(2)}]\n${members}`;
      })
      .join("\n\n");
  }

  function copyResults() {
    if (!currentTeams.length) return;
    navigator.clipboard
      .writeText(formatOutput())
      .then(() => setStatus("Results copied to clipboard.", false))
      .catch(() => setStatus("Clipboard copy failed. You can still export results.", true));
  }

  function exportResults() {
    if (!currentTeams.length) return;

    const blob = new Blob([formatOutput()], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "btm-teams.txt";
    link.click();
    URL.revokeObjectURL(url);
    setStatus("Exported btm-teams.txt", false);
  }

  function saveSnapshot() {
    if (!currentTeams.length) return;

    const snapshot = {
      savedAt: new Date().toISOString(),
      mode: lastMode,
      teams: currentTeams,
      settings: {
        personsPerTeam: toPositiveInt(personsPerTeamInput.value),
        maxDeviation: toNonNegativeNumber(maxDeviationInput.value),
        femaleRuleEnabled: femaleRuleToggle.checked,
        maxFemalesPerTeam: toPositiveInt(maxFemalesPerTeamInput.value),
      },
    };

    localStorage.setItem(SNAPSHOT_KEY, JSON.stringify(snapshot));
    setStatus("Team snapshot saved in browser storage.", false);
  }

  function loadSnapshot() {
    const raw = localStorage.getItem(SNAPSHOT_KEY);
    if (!raw) return;

    try {
      const parsed = JSON.parse(raw);
      if (!parsed || !Array.isArray(parsed.teams)) return;
      currentTeams = parsed.teams;
      lastMode = parsed.mode || null;
      renderTeams();
      setActionButtons(true);
      setStatus("Loaded saved team snapshot from browser storage.", false);
    } catch (_) {
      localStorage.removeItem(SNAPSHOT_KEY);
    }
  }

  generateRandomBtn.addEventListener("click", function () {
    generate("random");
  });

  generateBalancedBtn.addEventListener("click", function () {
    generate("balanced");
  });

  reshuffleBtn.addEventListener("click", function () {
    if (!lastMode) {
      setStatus("Generate teams first.", true);
      return;
    }
    generate(lastMode);
  });

  saveBtn.addEventListener("click", saveSnapshot);
  copyBtn.addEventListener("click", copyResults);
  exportBtn.addEventListener("click", exportResults);
  resultsEl.addEventListener("click", handleTeamAction);

  csvFileInput.addEventListener("change", function (event) {
    const file = event.target.files && event.target.files[0];
    if (!file) return;

    clearGeneratedTeamsOnDataChange();

    const reader = new FileReader();
    reader.onload = function (loadEvent) {
      const content = typeof loadEvent.target.result === "string" ? loadEvent.target.result : "";
      onCsvLoaded(content);
    };
    reader.onerror = function () {
      setStatus("Could not read the selected CSV file.", true);
    };
    reader.readAsText(file);
  });

  csvHeaderToggle.addEventListener("change", refreshCsvMeta);

  participantsInput.addEventListener("input", updateImportStats);
  dataSourceInput.addEventListener("change", updateImportStats);
  personsPerTeamInput.addEventListener("input", updateTeamCountPreview);

  sideNavButtons.forEach((button) => {
    button.addEventListener("click", function () {
      showWorkflowPanel(button.dataset.panel);
    });
  });

  femaleRuleToggle.addEventListener("change", function () {
    maxFemalesPerTeamInput.disabled = !femaleRuleToggle.checked;
    if (!femaleRuleToggle.checked) {
      maxFemalesPerTeamInput.value = "";
    }
  });

  setActionButtons(false);
  updateImportStats();
  setResultsVisibility(false);
  showWorkflowPanel("loadDataSection");
  loadSnapshot();
})();
