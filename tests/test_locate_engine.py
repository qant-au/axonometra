"""The locating engine: pure logic, loaded straight from its file (no Home Assistant needed)."""

import importlib.util
from pathlib import Path
import random
import sys

_spec = importlib.util.spec_from_file_location(
    "locate_engine", Path(__file__).parents[1] / "custom_components" / "accurona" / "locate" / "engine.py"
)
engine = importlib.util.module_from_spec(_spec)
sys.modules["locate_engine"] = engine
_spec.loader.exec_module(engine)

# three rooms in a row: kitchen - hall - living; one scanner in the kitchen and one in the living room, none in the hall
PROFILE = {
    "kitchen": {"s_kitchen": -60, "s_living": -88},
    "hall": {"s_kitchen": -74, "s_living": -76},
    "living": {"s_kitchen": -90, "s_living": -58},
}
DOORS = [("kitchen", "hall"), ("hall", "living")]


def reading(room: str, rng: random.Random) -> list[tuple[str, float]]:
    return [(s, rssi + rng.gauss(0, 4)) for s, rssi in PROFILE[room].items() if rng.random() > 0.2]


def calibrated(rng: random.Random) -> "engine.Fingerprints":
    fp = engine.Fingerprints()
    for room in PROFILE:
        for _ in range(30):
            vec: dict[str, list[float]] = {}
            for _ in range(4):
                for s, v in reading(room, rng):
                    vec.setdefault(s, []).append(v)
            fp.add(room, {s: sum(v) / len(v) for s, v in vec.items()})
    return fp


def walk(tracker, fp, plan: list[tuple[str, int]], rng: random.Random, t: float = 0.0):
    shown = []
    for room, seconds in plan:
        for _ in range(seconds):
            t += 1.0
            for s, v in reading(room, rng):
                tracker.add(t, s, v)
            est = tracker.step(t, fp.scores(tracker.window(t)))
            shown.append((room, est.room))
    return shown, t


def test_distance_counts_missing_scanners() -> None:
    assert engine.distance({"a": -60}, {"a": -60}) == 0
    one_sided = engine.distance({"a": -60}, {"a": -60, "b": -80})
    assert one_sided > engine.distance({"a": -60, "b": -80}, {"a": -62, "b": -80})


def test_finds_the_hall_without_a_scanner_of_its_own() -> None:
    rng = random.Random(1)
    fp = calibrated(rng)
    tracker = engine.RoomTracker(list(PROFILE), DOORS)
    shown, _t = walk(tracker, fp, [("kitchen", 40), ("hall", 40), ("living", 40)], rng)
    settled = [(want, got) for i, (want, got) in enumerate(shown) if i % 40 >= 12]
    assert sum(want == got for want, got in settled) / len(settled) > 0.9


def test_room_changes_arrive_within_seconds_and_do_not_flicker() -> None:
    rng = random.Random(2)
    fp = calibrated(rng)
    tracker = engine.RoomTracker(list(PROFILE), DOORS)
    shown, _t = walk(tracker, fp, [("kitchen", 30), ("hall", 30)], rng)
    hall = [got for _want, got in shown[30:]]
    assert "hall" in hall[:12]
    first = hall.index("hall")
    assert all(g == "hall" for g in hall[first:])


def test_nearest_scanner_fallback_without_calibration() -> None:
    scores = engine.nearest_scores({"s_kitchen": -60, "s_living": -85}, {"s_kitchen": "kitchen", "s_living": "living"})
    assert max(scores, key=scores.get) == "kitchen"
    assert engine.nearest_scores({"unknown": -50}, {"s_kitchen": "kitchen"}) == {}


def test_unheard_device_is_away() -> None:
    rng = random.Random(3)
    fp = calibrated(rng)
    tracker = engine.RoomTracker(list(PROFILE), DOORS)
    _shown, t = walk(tracker, fp, [("living", 10)], rng)
    later = t + engine.AWAY_AFTER + 5
    est = tracker.step(later, fp.scores(tracker.window(later)))
    assert est.room is None


def test_presence_sensor_moves_to_a_plausible_room_at_once() -> None:
    rng = random.Random(4)
    fp = calibrated(rng)
    tracker = engine.RoomTracker(list(PROFILE), DOORS)
    _shown, t = walk(tracker, fp, [("kitchen", 20)], rng)
    assert tracker.shown == "kitchen"
    # living is two doors away: a sensor there does not pull the kitchen device over
    assert not tracker.confirm("living", t)
    assert tracker.shown == "kitchen"
    # the hall is the neighbour: its sensor moves the device at once
    assert tracker.confirm("hall", t)
    assert tracker.shown == "hall"


def test_a_quiet_device_keeps_its_last_room() -> None:
    rng = random.Random(5)
    fp = calibrated(rng)
    tracker = engine.RoomTracker(list(PROFILE), DOORS, away_after=engine.THING_AWAY_AFTER)
    _shown, t = walk(tracker, fp, [("living", 15)], rng)
    later = t + 600  # a phone in a drawer for ten minutes
    est = tracker.step(later, fp.scores(tracker.window(later)))
    assert est.room == "living"
    assert est.last_seen == t or est.last_seen <= t


def test_a_room_not_learned_yet_comes_from_its_scanner() -> None:
    rng = random.Random(6)
    fp = calibrated(rng)
    del fp.samples["living"]  # the living room was never learned
    rooms = {"s_kitchen": "kitchen", "s_living": "living"}
    # far from every learned sample: the living room's own scanner speaks
    far = {"s_kitchen": -95.0, "s_living": -55.0}
    assert fp.nearest(far) > engine.UNLEARNED_DISTANCE
    assert max(engine.evidence(fp, far, rooms).items(), key=lambda kv: kv[1])[0] == "living"
    # close to the kitchen: the fingerprints decide
    near = {"s_kitchen": -60.0, "s_living": -88.0}
    assert max(engine.evidence(fp, near, rooms).items(), key=lambda kv: kv[1])[0] == "kitchen"


def test_a_quiet_device_gets_a_longer_window() -> None:
    tracker = engine.RoomTracker(list(PROFILE), DOORS)
    tracker.add(100.0, "s_kitchen", -60)
    tracker.add(92.0, "s_living", -85)
    tracker.add(90.0, "s_hall", -75)
    assert set(tracker.adaptive_window(101.0)) == {"s_kitchen", "s_living", "s_hall"}
    # a talkative device keeps the short window
    for s in ("s_a", "s_b", "s_c"):
        tracker.add(100.5, s, -70)
    assert "s_hall" not in tracker.adaptive_window(101.0)
