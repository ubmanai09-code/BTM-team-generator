from __future__ import annotations

from dataclasses import dataclass, field
import random
import sqlite3
from pathlib import Path
import zipfile
from typing import Dict, Iterable, List, Optional, Sequence, Tuple


class TeamAssignmentError(ValueError):
    pass


@dataclass(frozen=True)
class Player:
    id: int
    name: str
    gender: str
    average_score: float
    handicap: Optional[float] = None
    division: Optional[str] = None

    @property
    def is_female(self) -> bool:
        return self.gender.strip().lower() in {"f", "female", "woman", "women"}


@dataclass
class Team:
    id: int
    players: List[Player] = field(default_factory=list)

    @property
    def total_average(self) -> float:
        return round(sum(p.average_score for p in self.players), 3)

    @property
    def female_count(self) -> int:
        return sum(1 for p in self.players if p.is_female)


class TournamentTeamManager:
    def __init__(
        self,
        team_size: int = 3,
        min_female_per_team: int = 1,
        randomness: float = 0.1,
        seed: Optional[int] = None,
    ) -> None:
        if team_size <= 0:
            raise TeamAssignmentError("team_size must be positive")
        if min_female_per_team < 0:
            raise TeamAssignmentError("min_female_per_team cannot be negative")
        self.team_size = team_size
        self.min_female_per_team = min_female_per_team
        self.randomness = max(0.0, min(0.5, randomness))
        self._rng = random.Random(seed)
        self.players: Dict[int, Player] = {}
        self.teams: List[Team] = []
        self.locked_player_ids: set[int] = set()

    def generate_teams(self, players: Sequence[Player]) -> List[Team]:
        self.players = {p.id: p for p in players}
        self._validate_player_pool(players)
        team_count = len(players) // self.team_size
        self.teams = [Team(id=i + 1) for i in range(team_count)]
        self.locked_player_ids.clear()
        return self._assign_players(players, preserve_locked=False)

    def lock_player(self, player_id: int) -> None:
        self._require_current_player(player_id)
        self._find_player(player_id)
        self.locked_player_ids.add(player_id)

    def unlock_player(self, player_id: int) -> None:
        self.locked_player_ids.discard(player_id)

    def move_player(self, player_id: int, to_team_id: int, swap_with_player_id: Optional[int] = None) -> None:
        self._require_current_player(player_id)
        src_idx, src_pos = self._find_player(player_id)
        if not isinstance(to_team_id, int):
            raise TeamAssignmentError("target team id must be an integer")
        if to_team_id < 1 or to_team_id > len(self.teams):
            raise TeamAssignmentError("target team does not exist")
        dst_idx = to_team_id - 1
        if src_idx == dst_idx:
            return

        source_team = self.teams[src_idx]
        destination_team = self.teams[dst_idx]
        moving = source_team.players.pop(src_pos)

        swapped_out = None
        if len(destination_team.players) >= self.team_size:
            if swap_with_player_id is None:
                candidates = [p for p in destination_team.players if p.id not in self.locked_player_ids]
                if not candidates:
                    source_team.players.insert(src_pos, moving)
                    raise TeamAssignmentError("destination team is full and has no movable players")
                swapped_out = min(candidates, key=lambda p: p.average_score)
            else:
                if swap_with_player_id in self.locked_player_ids:
                    source_team.players.insert(src_pos, moving)
                    raise TeamAssignmentError("cannot swap with locked player")
                for p in destination_team.players:
                    if p.id == swap_with_player_id:
                        swapped_out = p
                        break
                if swapped_out is None:
                    source_team.players.insert(src_pos, moving)
                    raise TeamAssignmentError("swap player not found in destination team")
            destination_team.players.remove(swapped_out)
            source_team.players.append(swapped_out)

        destination_team.players.append(moving)

        try:
            self._validate_current_teams()
        except TeamAssignmentError:
            destination_team.players.remove(moving)
            source_team.players.insert(src_pos, moving)
            if swapped_out is not None:
                source_team.players.remove(swapped_out)
                destination_team.players.append(swapped_out)
            raise

    def rebalance_remaining(self) -> List[Team]:
        if not self.teams:
            raise TeamAssignmentError("generate teams first")
        all_players = list(self.players.values())
        self._validate_player_pool(all_players)
        return self._assign_players(all_players, preserve_locked=True)

    def save_to_database(self, db_path: str) -> None:
        if not self.teams:
            raise TeamAssignmentError("no teams to save")
        path = Path(db_path)
        conn = sqlite3.connect(path)
        try:
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS teams (
                    id INTEGER PRIMARY KEY
                )
                """
            )
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS team_members (
                    team_id INTEGER NOT NULL,
                    player_id INTEGER NOT NULL,
                    name TEXT NOT NULL,
                    gender TEXT NOT NULL,
                    average_score REAL NOT NULL,
                    handicap REAL,
                    division TEXT,
                    PRIMARY KEY (team_id, player_id),
                    FOREIGN KEY (team_id) REFERENCES teams(id)
                )
                """
            )
            conn.execute("DELETE FROM team_members")
            conn.execute("DELETE FROM teams")
            for team in self.teams:
                conn.execute("INSERT INTO teams(id) VALUES (?)", (team.id,))
                for p in team.players:
                    conn.execute(
                        """
                        INSERT INTO team_members(team_id, player_id, name, gender, average_score, handicap, division)
                        VALUES (?, ?, ?, ?, ?, ?, ?)
                        """,
                        (team.id, p.id, p.name, p.gender, p.average_score, p.handicap, p.division),
                    )
            conn.commit()
        finally:
            conn.close()

    @staticmethod
    def load_from_database(db_path: str) -> List[Team]:
        path = Path(db_path)
        conn = sqlite3.connect(path)
        try:
            rows = conn.execute(
                """
                SELECT team_id, player_id, name, gender, average_score, handicap, division
                FROM team_members
                ORDER BY team_id, average_score DESC, player_id ASC
                """
            ).fetchall()
        finally:
            conn.close()

        teams_by_id: Dict[int, Team] = {}
        for team_id, player_id, name, gender, average_score, handicap, division in rows:
            team = teams_by_id.setdefault(team_id, Team(id=team_id))
            team.players.append(
                Player(
                    id=player_id,
                    name=name,
                    gender=gender,
                    average_score=average_score,
                    handicap=handicap,
                    division=division,
                )
            )
        return [teams_by_id[k] for k in sorted(teams_by_id)]

    def export_excel(self, file_path: str) -> None:
        if not self.teams:
            raise TeamAssignmentError("no teams to export")
        rows: List[List[str]] = [["Team ID", "Player ID", "Name", "Gender", "Average Score", "Handicap", "Division"]]
        for team in self.teams:
            for p in team.players:
                rows.append(
                    [
                        str(team.id),
                        str(p.id),
                        p.name,
                        p.gender,
                        str(p.average_score),
                        "" if p.handicap is None else str(p.handicap),
                        "" if p.division is None else p.division,
                    ]
                )
        _write_basic_xlsx(file_path, rows)

    def export_pdf(self, file_path: str) -> None:
        if not self.teams:
            raise TeamAssignmentError("no teams to export")
        lines: List[str] = ["Tournament Teams"]
        for team in self.teams:
            lines.append(f"Team {team.id} (total avg: {team.total_average})")
            for p in sorted(team.players, key=lambda x: x.average_score, reverse=True):
                lines.append(f"- {p.name} [{p.gender}] avg={p.average_score}")
        _write_basic_pdf(file_path, lines)

    def _assign_players(self, players: Sequence[Player], preserve_locked: bool) -> List[Team]:
        team_count = len(players) // self.team_size
        if not self.teams or len(self.teams) != team_count:
            self.teams = [Team(id=i + 1) for i in range(team_count)]

        if preserve_locked:
            by_id = {p.id: p for p in players}
            for team in self.teams:
                team.players = [by_id[p.id] for p in team.players if p.id in self.locked_player_ids and p.id in by_id]
        else:
            for team in self.teams:
                team.players.clear()

        assigned = {p.id for team in self.teams for p in team.players}
        unassigned = [p for p in players if p.id not in assigned]

        teams_needing_female = [team for team in self.teams if team.female_count < self.min_female_per_team]
        female_unassigned = sorted((p for p in unassigned if p.is_female), key=lambda p: p.average_score, reverse=True)
        required_additional_females = sum(self.min_female_per_team - team.female_count for team in teams_needing_female)
        if len(female_unassigned) < required_additional_females:
            raise TeamAssignmentError("not enough female players to satisfy team constraints with current locks")

        for team in sorted(teams_needing_female, key=lambda t: t.total_average):
            while team.female_count < self.min_female_per_team:
                player = female_unassigned.pop(0)
                unassigned.remove(player)
                team.players.append(player)

        remaining = sorted(unassigned, key=lambda p: p.average_score, reverse=True)
        for player in remaining:
            destination = self._pick_team_for_player(player)
            destination.players.append(player)

        self._validate_current_teams()
        return self.teams

    def _pick_team_for_player(self, player: Player) -> Team:
        available = [team for team in self.teams if len(team.players) < self.team_size]
        if not available:
            raise TeamAssignmentError("no team slots available")
        available.sort(key=lambda t: (t.total_average, len(t.players), t.id))
        if len(available) == 1 or self.randomness <= 0:
            return available[0]

        randomness_based_size = max(1, int(round(len(available) * self.randomness)))
        random_pool_size = min(len(available), randomness_based_size + 1)
        return self._rng.choice(available[:random_pool_size])

    def _validate_player_pool(self, players: Sequence[Player]) -> None:
        if not players:
            raise TeamAssignmentError("player list cannot be empty")
        if len(players) % self.team_size != 0:
            raise TeamAssignmentError(f"player count ({len(players)}) is not divisible by team size ({self.team_size})")
        female_count = sum(1 for p in players if p.is_female)
        team_count = len(players) // self.team_size
        required_females = team_count * self.min_female_per_team
        if female_count < required_females:
            raise TeamAssignmentError(
                f"not enough female players: need {required_females}, got {female_count}"
            )
        ids = [p.id for p in players]
        if len(set(ids)) != len(ids):
            raise TeamAssignmentError("duplicate player ids are not allowed")

    def _validate_current_teams(self) -> None:
        if not self.teams:
            return
        all_ids: List[int] = []
        for team in self.teams:
            if len(team.players) != self.team_size:
                raise TeamAssignmentError(f"team {team.id} has invalid size {len(team.players)}")
            if team.female_count < self.min_female_per_team:
                raise TeamAssignmentError(f"team {team.id} does not meet female constraint")
            all_ids.extend(p.id for p in team.players)
        if len(all_ids) != len(set(all_ids)):
            raise TeamAssignmentError("same player assigned to multiple teams")

    def _find_player(self, player_id: int) -> Tuple[int, int]:
        for i, team in enumerate(self.teams):
            for j, player in enumerate(team.players):
                if player.id == player_id:
                    return i, j
        raise TeamAssignmentError("player is not assigned to any team")

    def _require_current_player(self, player_id: int) -> None:
        if player_id not in self.players:
            raise TeamAssignmentError("unknown player id")


def _write_basic_pdf(file_path: str, lines: Iterable[str]) -> None:
    text_lines = [
        line.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")
        for line in lines
    ]
    content_rows = ["BT", "/F1 12 Tf", "72 780 Td", "14 TL"]
    first = True
    for line in text_lines:
        if first:
            content_rows.append(f"({line}) Tj")
            first = False
        else:
            content_rows.append(f"T* ({line}) Tj")
    content_rows.append("ET")
    stream_data = "\n".join(content_rows).encode("latin-1", errors="replace")  # Unsupported characters degrade safely.

    objects: List[bytes] = []
    objects.append(b"1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n")
    objects.append(b"2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n")
    objects.append(
        b"3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj\n"
    )
    objects.append(
        b"4 0 obj\n<< /Length "
        + str(len(stream_data)).encode("ascii")
        + b" >>\nstream\n"
        + stream_data
        + b"\nendstream\nendobj\n"
    )
    objects.append(b"5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n")

    output = bytearray(b"%PDF-1.4\n")
    offsets = [0]
    for obj in objects:
        offsets.append(len(output))
        output.extend(obj)
    xref_pos = len(output)
    output.extend(f"xref\n0 {len(objects) + 1}\n".encode("ascii"))
    output.extend(b"0000000000 65535 f \n")
    for off in offsets[1:]:
        output.extend(f"{off:010d} 00000 n \n".encode("ascii"))
    output.extend(
        (
            f"trailer\n<< /Size {len(objects) + 1} /Root 1 0 R >>\n"
            f"startxref\n{xref_pos}\n%%EOF\n"
        ).encode("ascii")
    )
    Path(file_path).write_bytes(bytes(output))


def _write_basic_xlsx(file_path: str, rows: Sequence[Sequence[str]]) -> None:
    path = Path(file_path)
    path.parent.mkdir(parents=True, exist_ok=True)

    sheet_rows = []
    for row_idx, row in enumerate(rows, start=1):
        cells = []
        for col_idx, value in enumerate(row, start=1):
            ref = f"{_xlsx_col(col_idx)}{row_idx}"
            if _is_number(value):
                cells.append(f'<c r="{ref}"><v>{value}</v></c>')
            else:
                cells.append(f'<c r="{ref}" t="inlineStr"><is><t>{_xml_escape(value)}</t></is></c>')
        sheet_rows.append(f'<row r="{row_idx}">{"".join(cells)}</row>')

    sheet_xml = (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
        f'<sheetData>{"".join(sheet_rows)}</sheetData>'
        "</worksheet>"
    )
    workbook_xml = (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" '
        'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">'
        '<sheets><sheet name="Teams" sheetId="1" r:id="rId1"/></sheets>'
        "</workbook>"
    )
    rels_xml = (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
        '<Relationship Id="rId1" '
        'Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" '
        'Target="xl/workbook.xml"/>'
        "</Relationships>"
    )
    workbook_rels_xml = (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
        '<Relationship Id="rId1" '
        'Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" '
        'Target="worksheets/sheet1.xml"/>'
        '<Relationship Id="rId2" '
        'Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" '
        'Target="styles.xml"/>'
        "</Relationships>"
    )
    styles_xml = (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
        '<fonts count="1"><font><sz val="11"/><name val="Calibri"/></font></fonts>'
        '<fills count="1"><fill><patternFill patternType="none"/></fill></fills>'
        '<borders count="1"><border/></borders>'
        '<cellStyleXfs count="1"><xf/></cellStyleXfs>'
        '<cellXfs count="1"><xf xfId="0"/></cellXfs>'
        "</styleSheet>"
    )
    content_types_xml = (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
        '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
        '<Default Extension="xml" ContentType="application/xml"/>'
        '<Override PartName="/xl/workbook.xml" '
        'ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>'
        '<Override PartName="/xl/worksheets/sheet1.xml" '
        'ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>'
        '<Override PartName="/xl/styles.xml" '
        'ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>'
        "</Types>"
    )

    with zipfile.ZipFile(path, "w", compression=zipfile.ZIP_DEFLATED) as archive:
        archive.writestr("[Content_Types].xml", content_types_xml)
        archive.writestr("_rels/.rels", rels_xml)
        archive.writestr("xl/workbook.xml", workbook_xml)
        archive.writestr("xl/_rels/workbook.xml.rels", workbook_rels_xml)
        archive.writestr("xl/styles.xml", styles_xml)
        archive.writestr("xl/worksheets/sheet1.xml", sheet_xml)


def _xlsx_col(index: int) -> str:
    result = []
    value = index
    while value > 0:
        value, rem = divmod(value - 1, 26)
        result.append(chr(65 + rem))
    return "".join(reversed(result))


def _xml_escape(value: str) -> str:
    return (
        value.replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")
        .replace("'", "&apos;")
    )


def _is_number(value: str) -> bool:
    try:
        float(value)
        return True
    except ValueError:
        return False
