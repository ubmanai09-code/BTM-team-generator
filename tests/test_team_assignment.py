import tempfile
import unittest
from pathlib import Path

from team_assignment import Player, TeamAssignmentError, TournamentTeamManager, _xlsx_col


def sample_players(team_count: int = 4):
    players = []
    total = team_count * 3
    female_ids = {1, 4, 7, 10, 12}
    for i in range(1, total + 1):
        players.append(
            Player(
                id=i,
                name=f"Player {i}",
                gender="F" if i in female_ids else "M",
                average_score=220 - i,
            )
        )
    return players


class TeamAssignmentTests(unittest.TestCase):
    def test_generates_balanced_teams_with_female_constraint(self):
        manager = TournamentTeamManager(team_size=3, min_female_per_team=1, randomness=0, seed=42)
        teams = manager.generate_teams(sample_players(4))

        self.assertEqual(len(teams), 4)
        self.assertTrue(all(len(t.players) == 3 for t in teams))
        self.assertTrue(all(t.female_count >= 1 for t in teams))

        totals = [t.total_average for t in teams]
        self.assertLessEqual(max(totals) - min(totals), 15)

    def test_detects_not_enough_female_players(self):
        players = [
            Player(id=1, name="A", gender="F", average_score=200),
            Player(id=2, name="B", gender="M", average_score=190),
            Player(id=3, name="C", gender="M", average_score=180),
            Player(id=4, name="D", gender="M", average_score=170),
            Player(id=5, name="E", gender="M", average_score=160),
            Player(id=6, name="F", gender="M", average_score=150),
        ]
        manager = TournamentTeamManager(team_size=3, min_female_per_team=1)

        with self.assertRaises(TeamAssignmentError):
            manager.generate_teams(players)

    def test_lock_move_and_rebalance(self):
        manager = TournamentTeamManager(team_size=3, min_female_per_team=1, randomness=0, seed=123)
        players = sample_players(4)
        teams = manager.generate_teams(players)

        locked_id = teams[0].players[0].id
        manager.lock_player(locked_id)

        movable_from_second_team = next(p.id for p in teams[1].players if p.id not in manager.locked_player_ids)
        manager.move_player(movable_from_second_team, to_team_id=1)
        manager.rebalance_remaining()

        src, _ = manager._find_player(locked_id)
        self.assertEqual(src, 0)
        self.assertTrue(all(t.female_count >= 1 for t in manager.teams))

    def test_export_and_persistence(self):
        manager = TournamentTeamManager(team_size=3, min_female_per_team=1, randomness=0, seed=1)
        manager.generate_teams(sample_players(4))

        with tempfile.TemporaryDirectory() as tmp:
            tmp_path = Path(tmp)
            excel_file = tmp_path / "teams.xlsx"
            pdf_file = tmp_path / "teams.pdf"
            db_file = tmp_path / "teams.db"

            manager.export_excel(str(excel_file))
            manager.export_pdf(str(pdf_file))
            manager.save_to_database(str(db_file))

            self.assertTrue(excel_file.exists())
            self.assertTrue(excel_file.read_bytes().startswith(b"PK"))
            pdf_bytes = pdf_file.read_bytes()
            self.assertTrue(pdf_bytes.startswith(b"%PDF-1.4"))
            self.assertIn(b"Tournament Teams", pdf_bytes)

            loaded = TournamentTeamManager.load_from_database(str(db_file))
            self.assertEqual(len(loaded), 4)
            self.assertTrue(all(len(t.players) == 3 for t in loaded))

    def test_xlsx_column_conversion_edges(self):
        self.assertEqual(_xlsx_col(26), "Z")
        self.assertEqual(_xlsx_col(27), "AA")
        self.assertEqual(_xlsx_col(702), "ZZ")


if __name__ == "__main__":
    unittest.main()
