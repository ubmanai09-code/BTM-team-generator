# BTM-team-generator
A team generating tool for BTM application.

## Features implemented
- Automatic 3-player team generation with score balancing.
- Female distribution rule (minimum 1 female per team).
- Validation for impossible scenarios (for example, not enough female players).
- Slightly randomized but fairness-first assignment strategy.
- Admin operations through API: generate teams, lock players, move players, rebalance unlocked players.
- Persistence to SQLite database.
- Export generated teams to Excel-compatible CSV (`.xlsx` filename supported) and PDF.

## Quick usage
```python
from team_assignment import Player, TournamentTeamManager

players = [
    Player(id=1, name="A", gender="F", average_score=180),
    # ...
]
manager = TournamentTeamManager(team_size=3, min_female_per_team=1, seed=42)
teams = manager.generate_teams(players)
manager.lock_player(1)
manager.rebalance_remaining()
manager.export_excel("teams.xlsx")
manager.export_pdf("teams.pdf")
manager.save_to_database("teams.db")
```

## Running tests
```bash
python -m unittest -q tests/test_team_assignment.py
```
