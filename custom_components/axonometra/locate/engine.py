"""Room locating from Bluetooth signal strengths - pure logic, no Home Assistant imports (unit-testable).

How a room is chosen, every STEP seconds per tracked device:
1. Window: the mean RSSI per scanner over the last WINDOW seconds (a scanner that heard nothing is *missing*, not far).
2. Evidence: weighted kNN against the fingerprints learned on the calibration walk (rooms without fingerprints are
   reached through the nearest-scanner fallback: a scanner placed in a room speaks for it).
3. Filter: a forward filter over the rooms - staying is likely, moving through a door to a neighbour less so, other
   jumps rare (the door graph comes from the floor plan).
4. Hysteresis: the shown room only changes when another room leads with SWITCH_PROB for SWITCH_HOLD steps.
5. Presence sensors: a motion/presence sensor of a room turning on moves the device there at once, when Bluetooth
   finds that room plausible (a neighbour of the shown room, or some belief) - Bluetooth says who, the sensor when.
"""

from __future__ import annotations

from collections import deque
from dataclasses import dataclass, field
import math

WINDOW = 4.0  # seconds of readings per estimate
QUIET_WINDOW = 15.0  # a quiet device (an iPhone in a pocket) heard by fewer than QUIET_SCANNERS: look further back
QUIET_SCANNERS = 3
OWN_SHARE = 0.7  # a device's own learning is used alone once it covers this share of the learned rooms
STEP = 1.0  # seconds between estimates
K = 5
MISS = 12.0  # dB penalty when only one side heard a scanner
STAY = 0.85
NEIGHBOUR_SHARE = 0.97  # of the moving mass that goes through doors
FLOOR_EPS = 0.02
SWITCH_PROB = 0.8
SWITCH_HOLD = 3
AWAY_AFTER = 120.0  # seconds without any reading: a person is no longer placed
THING_AWAY_AFTER = 6 * 3600.0  # a thing (keys, a phone lying somewhere) keeps its last room much longer
UNLEARNED_DISTANCE = 9.5  # dB: farther than this from every learned sample, the device is in a room not learned yet
CONFIRM_PLAUSIBLE = 0.1  # belief a room needs for a presence sensor to move the device there


Vector = dict[str, float]


def distance(a: Vector, b: Vector, miss: float = MISS) -> float:
    """RMS difference over the scanners either side heard; heard on one side only costs `miss` dB."""
    keys = set(a) | set(b)
    if not keys:
        return math.inf
    total = 0.0
    for k in keys:
        if k in a and k in b:
            total += (a[k] - b[k]) ** 2
        else:
            total += miss**2
    return math.sqrt(total / len(keys))


@dataclass
class Fingerprints:
    """Calibration samples: room id -> list of window vectors."""

    samples: dict[str, list[Vector]] = field(default_factory=dict)

    def add(self, room: str, vector: Vector) -> None:
        if vector:
            self.samples.setdefault(room, []).append(dict(vector))

    def rooms(self) -> list[str]:
        return [r for r, s in self.samples.items() if s]

    def nearest(self, vector: Vector) -> float:
        """Distance to the closest learned sample (inf without samples)."""
        return min((distance(vector, v) for vs in self.samples.values() for v in vs), default=math.inf)

    def scores(self, vector: Vector, k: int = K) -> dict[str, float]:
        """Room -> share of the weighted votes of the k nearest samples (empty without samples)."""
        best: list[tuple[float, str]] = []
        for room, vectors in self.samples.items():
            best.extend((distance(vector, v), room) for v in vectors)
        best.sort(key=lambda x: x[0])
        votes: dict[str, float] = {}
        for d, room in best[:k]:
            votes[room] = votes.get(room, 0.0) + 1.0 / (0.5 + d)
        total = sum(votes.values())
        return {r: v / total for r, v in votes.items()} if total else {}


def nearest_scores(vector: Vector, scanner_rooms: dict[str, str]) -> dict[str, float]:
    """Fallback without fingerprints: the strongest placed scanner speaks for its room (softly for the runner-up)."""
    placed = sorted(((rssi, scanner_rooms[s]) for s, rssi in vector.items() if s in scanner_rooms), reverse=True)
    if not placed:
        return {}
    scores: dict[str, float] = {}
    for rank, (_rssi, room) in enumerate(placed[:3]):
        scores[room] = scores.get(room, 0.0) + (0.7, 0.2, 0.1)[rank]
    total = sum(scores.values())
    return {r: v / total for r, v in scores.items()}


def evidence(fp: Fingerprints | None, vector: Vector, scanner_rooms: dict[str, str]) -> dict[str, float]:
    """Room scores for a window: the learned fingerprints; where nothing learned is near (a room not learned yet,
    upstairs say), the placed scanners of the rooms not learned; without any learning the nearest scanner."""
    if fp is None or len(fp.rooms()) < 2:
        return nearest_scores(vector, scanner_rooms)
    if fp.nearest(vector) <= UNLEARNED_DISTANCE:
        return fp.scores(vector)
    learned = set(fp.rooms())
    return nearest_scores(vector, {s: r for s, r in scanner_rooms.items() if r not in learned})


@dataclass
class Estimate:
    room: str | None
    probability: float
    since: float | None
    last_seen: float | None


class RoomTracker:
    """Readings in, a stable room out - one per tracked device."""

    def __init__(
        self, rooms: list[str], doors: list[tuple[str, str]] | None = None, away_after: float = AWAY_AFTER
    ) -> None:
        self.rooms = list(rooms)
        self.away_after = away_after
        self.neighbours: dict[str, set[str]] = {r: set() for r in self.rooms}
        for a, b in doors or []:
            if a in self.neighbours and b in self.neighbours:
                self.neighbours[a].add(b)
                self.neighbours[b].add(a)
        self.belief = {r: 1.0 / len(self.rooms) for r in self.rooms} if self.rooms else {}
        self.readings: deque[tuple[float, str, float]] = deque()
        self.shown: str | None = None
        self.since: float | None = None
        self.last_seen: float | None = None
        self._candidate: str | None = None
        self._streak = 0

    def add(self, t: float, scanner: str, rssi: float) -> None:
        self.readings.append((t, scanner, rssi))
        self.last_seen = t if self.last_seen is None else max(self.last_seen, t)

    def window(self, now: float, length: float = WINDOW) -> Vector:
        while self.readings and self.readings[0][0] < now - 30.0:
            self.readings.popleft()
        sums: dict[str, list[float]] = {}
        for t, scanner, rssi in self.readings:
            if now - length <= t <= now:
                sums.setdefault(scanner, []).append(rssi)
        return {s: sum(v) / len(v) for s, v in sums.items()}

    def adaptive_window(self, now: float) -> Vector:
        """The usual window; for a quiet device (few scanners heard) a longer one, so it is placed at all."""
        vector = self.window(now)
        if len(vector) < QUIET_SCANNERS:
            longer = self.window(now, QUIET_WINDOW)
            if len(longer) > len(vector):
                return longer
        return vector

    def _move(self, src: str, dst: str) -> float:
        """Probability mass share from src to dst for one step (dst != src)."""
        moving = 1.0 - STAY
        near = self.neighbours.get(src, set())
        if not near:
            return moving / max(len(self.rooms) - 1, 1)
        if dst in near:
            return moving * NEIGHBOUR_SHARE / len(near)
        return moving * (1.0 - NEIGHBOUR_SHARE) / max(len(self.rooms) - 1 - len(near), 1)

    def confirm(self, room: str, now: float) -> bool:
        """A presence sensor of `room` turned on: move there at once if Bluetooth finds it plausible."""
        if room not in self.belief or room == self.shown or self.shown is None:
            return False
        if self.last_seen is None or now - self.last_seen > self.away_after:
            return False
        if self.belief[room] < CONFIRM_PLAUSIBLE and room not in self.neighbours.get(self.shown, set()):
            return False
        rest = (1.0 - 0.9) / max(len(self.belief) - 1, 1)
        self.belief = {r: 0.9 if r == room else rest for r in self.belief}
        self.shown, self.since = room, now
        self._streak, self._candidate = 0, None
        return True

    def step(self, now: float, evidence: dict[str, float]) -> Estimate:
        if self.last_seen is None or now - self.last_seen > self.away_after:
            self.shown, self.since = None, None
            return Estimate(None, 0.0, None, self.last_seen)
        if now - self.last_seen > WINDOW * 3 and self.shown is not None:
            # nothing heard for a while: the last room stays (a phone in a pocket goes quiet), the belief does not move
            return Estimate(self.shown, round(self.belief.get(self.shown, 0.0), 3), self.since, self.last_seen)
        if evidence and self.rooms:
            prior = {
                r: self.belief[r] * STAY + sum(self.belief[o] * self._move(o, r) for o in self.rooms if o != r)
                for r in self.rooms
            }
            post = {r: prior[r] * (evidence.get(r, 0.0) + FLOOR_EPS) for r in self.rooms}
            total = sum(post.values())
            self.belief = {r: v / total for r, v in post.items()}
        if not self.belief:
            return Estimate(None, 0.0, None, self.last_seen)
        lead = max(self.belief, key=self.belief.__getitem__)
        if self.shown is None:
            self.shown, self.since = lead, now
        elif lead != self.shown and self.belief[lead] >= SWITCH_PROB:
            self._streak = self._streak + 1 if self._candidate == lead else 1
            self._candidate = lead
            if self._streak >= SWITCH_HOLD:
                self.shown, self.since = lead, now
                self._streak, self._candidate = 0, None
        else:
            self._streak, self._candidate = 0, None
        return Estimate(self.shown, round(self.belief.get(self.shown, 0.0), 3), self.since, self.last_seen)
