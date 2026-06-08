# Team Generation Pseudocode

## Core Generator

```text
validate(request)
participants := filter available participants
scores := compute weighted score per participant
sorted := score-desc list, lightly shuffled with seed for exploration
teams := initialize N empty teams with balanced capacities

for each participant in sorted:
  try assign with snake-draft traversal:
    team1 -> teamN -> teamN -> team1
  if gender balancing enabled:
    reject assignment that exceeds target gender range
  if no valid team found:
    assign to first team with capacity and emit warning

compute per-team analytics
compute fairness metrics:
  average deviation from global team average
  standard deviation of team averages
  highest-lowest average team gap
  gender distribution validation
  fairness score [0..100]
return result
```

## Simulation Mode

```text
best := null
for run in 1..iterations:
  result := generateTeams(seed + run)
  if best is null or result.fairnessScore > best.fairnessScore:
    best := result
collect all candidate fairness snapshots
return best and candidate summaries
```

## Manual Override Mode

```text
clone baseline teams
for each override operation:
  if move:
    remove member from source, append to target
  if swap:
    exchange source and target members
recompute analytics and fairness
return updated result with override warning
```
