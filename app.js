(function () {
  const participantsInput = document.getElementById("participants");
  const teamCountInput = document.getElementById("teamCount");
  const teamSizeInput = document.getElementById("teamSize");
  const generateBtn = document.getElementById("generateBtn");
  const reshuffleBtn = document.getElementById("reshuffleBtn");
  const copyBtn = document.getElementById("copyBtn");
  const exportBtn = document.getElementById("exportBtn");
  const resultsEl = document.getElementById("results");
  const statusEl = document.getElementById("status");

  let lastInput = null;
  let lastTeams = [];

  function parseParticipants(raw) {
    return Array.from(
      new Set(
        raw
          .split(/[\n,;]+/)
          .map((name) => name.trim())
          .filter(Boolean)
      )
    );
  }

  function toPositiveInt(value) {
    if (!value) return null;
    const num = Number(value);
    if (!Number.isInteger(num) || num <= 0) return null;
    return num;
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

  function createTeams(participants, teamCount, teamSize) {
    let count = teamCount;

    if (!count && teamSize) {
      count = Math.ceil(participants.length / teamSize);
    }

    if (!count) {
      count = 2;
    }

    count = Math.max(1, Math.min(count, participants.length));

    const teams = Array.from({ length: count }, () => []);
    const shuffled = shuffle(participants);

    for (let i = 0; i < shuffled.length; i += 1) {
      teams[i % count].push(shuffled[i]);
    }

    if (teamSize) {
      const overflow = teams.flatMap((members, index) => {
        if (members.length <= teamSize) return [];
        const extra = members.splice(teamSize);
        return extra.map((name) => ({ name, from: index }));
      });

      for (const entry of overflow) {
        const target = teams.find((members) => members.length < teamSize) || teams[0];
        target.push(entry.name);
      }
    }

    return teams;
  }

  function formatOutput(teams) {
    return teams
      .map((members, index) => {
        const people = members.map((name) => `- ${name}`).join("\n");
        return `Team ${index + 1} (${members.length})\n${people}`;
      })
      .join("\n\n");
  }

  function setStatus(message, isError) {
    statusEl.textContent = message;
    statusEl.classList.toggle("error", Boolean(isError));
  }

  function renderTeams(teams) {
    if (!teams.length) {
      resultsEl.className = "results empty";
      resultsEl.textContent = "No teams generated yet.";
      return;
    }

    resultsEl.className = "results";
    resultsEl.innerHTML = teams
      .map((members, index) => {
        const items = members.map((name) => `<li>${escapeHtml(name)}</li>`).join("");
        return `<article class="team"><h3>Team ${index + 1} (${members.length})</h3><ul>${items}</ul></article>`;
      })
      .join("");
  }

  function escapeHtml(input) {
    return input
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  function runGeneration(usePreviousInput) {
    const raw = usePreviousInput && lastInput ? lastInput.raw : participantsInput.value;
    const participants = usePreviousInput && lastInput ? lastInput.participants : parseParticipants(raw);
    const teamCount = usePreviousInput && lastInput ? lastInput.teamCount : toPositiveInt(teamCountInput.value);
    const teamSize = usePreviousInput && lastInput ? lastInput.teamSize : toPositiveInt(teamSizeInput.value);

    if (participants.length < 2) {
      setStatus("Please enter at least 2 participant names.", true);
      return;
    }

    if (!teamCount && !teamSize) {
      setStatus("Please set Number of Teams or Team Size.", true);
      return;
    }

    const teams = createTeams(participants, teamCount, teamSize);

    lastInput = { raw, participants, teamCount, teamSize };
    lastTeams = teams;
    renderTeams(teams);

    reshuffleBtn.disabled = false;
    copyBtn.disabled = false;
    exportBtn.disabled = false;
    setStatus(`Generated ${teams.length} team(s) from ${participants.length} participant(s).`, false);
  }

  function copyResults() {
    if (!lastTeams.length) return;
    const text = formatOutput(lastTeams);

    navigator.clipboard
      .writeText(text)
      .then(() => setStatus("Results copied to clipboard.", false))
      .catch(() => setStatus("Clipboard copy failed. You can still export as .txt.", true));
  }

  function exportResults() {
    if (!lastTeams.length) return;

    const blob = new Blob([formatOutput(lastTeams)], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "btm-teams.txt";
    link.click();
    URL.revokeObjectURL(url);
    setStatus("Exported btm-teams.txt", false);
  }

  generateBtn.addEventListener("click", function () {
    runGeneration(false);
  });

  reshuffleBtn.addEventListener("click", function () {
    runGeneration(true);
  });

  copyBtn.addEventListener("click", copyResults);
  exportBtn.addEventListener("click", exportResults);
})();
