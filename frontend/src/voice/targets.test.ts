import assert from "node:assert/strict";
import { test } from "node:test";
import { emptyBuilding, newFloor, type Room } from "../model.ts";
import { showTarget, SYNONYMS, type Shown } from "./targets.ts";

const room = (id: string, name: string): Room => ({ id, name, area_id: null, points: [], floor_material: "wood" });
const building = {
  ...emptyBuilding(),
  floors: [{ ...newFloor("eg", "Erdgeschoss", 0), rooms: [room("wz", "Wohnzimmer"), room("fl", "Flur"), room("ga", "Garten"), room("hw", "HWR")] }],
};
const dev = (entity: string, name: string, room: string, camera = false): Shown => ({ id: entity, entity, name, room, camera });
const devices: Shown[] = [
  dev("camera.haustuer", "Kamera Haustür", "Flur", true),
  dev("camera.garten", "Garten Cam", "Garten", true),
  dev("switch.waschmaschine", "Waschmaschine", "", false),
  dev("light.stehlampe", "Stehlampe", "Wohnzimmer"),
  dev("light.flur", "Flur Licht", "Flur"),
  dev("light.wz", "Wohnzimmer Decke", "Wohnzimmer"),
];

const t = (s: string, d: readonly Shown[] = devices) => showTarget(s, building, d);
const id = (r: ReturnType<typeof t>) => (r as { id: string } | null)?.id;

test("devices by name, with a word that asks to see them", () => {
  assert.deepEqual(t("Zeig die Waschmaschine"), { kind: "device", id: "switch.waschmaschine", entity: "switch.waschmaschine", name: "Waschmaschine", camera: false });
  assert.equal(id(t("Wo ist die Stehlampe")), "light.stehlampe");
  // naming a device without asking to see it is for Assist
  assert.equal(t("Flur Licht an"), null);
});

test("cameras: by name, by 'camera' and their room, or all of them", () => {
  assert.equal(id(t("Zeig die Kamera Haustür")), "camera.haustuer");
  // a compound: "Haustürkamera" is "Haustür" and "Kamera"; so is "Gartencam"
  assert.equal(id(t("Zeig die Haustürkamera")), "camera.haustuer");
  assert.equal(id(t("zeig mal die Gartencam")), "camera.garten");
  assert.equal(id(t("zeig die Kamera im Garten")), "camera.garten");
  assert.equal(t("Zeig mir die Kameras")?.kind, "cameras");
});

test("own aliases: a device by its further names, a room by its own", () => {
  const items: Shown[] = [{ id: "media_player.tv", entity: "media_player.tv", name: "Smart TV Pro", names: ["Smart TV Pro", "Wohnzimmerfernseher", "Glotze"], room: "Wohnzimmer", camera: false }];
  assert.equal(id(t("Zeig den Wohnzimmerfernseher", items)), "media_player.tv");
  assert.equal(id(t("wo ist die Glotze", items)), "media_player.tv");
  const b = { ...building, floors: [{ ...building.floors[0], rooms: [{ ...room("wz", "Wohnzimmer"), aliases: ["Stube"] }] }] };
  assert.equal(showTarget("Zeig die Stube", b, [])?.kind, "room");
});

test("rooms stay rooms when a device only shares their name", () => {
  assert.deepEqual(t("Zeig das Wohnzimmer"), { kind: "room", floorId: "eg", roomId: "wz", name: "Wohnzimmer" });
  assert.equal(id(t("Zeig die Wohnzimmer Decke")), "light.wz");
  assert.equal(t("Garten")?.kind, "room");
});

test("furniture answers to its kind, its own name, everyday words and its sensor's name without the measuring word", () => {
  const items: Shown[] = [
    { id: "sensor.waschmaschine_leistung", entity: "sensor.waschmaschine_leistung", name: "Waschmaschine", names: ["Waschmaschine", "Waschmaschine Leistung", ...SYNONYMS.washer], room: "HWR", camera: false },
    { id: "furniture:t1", entity: null, name: "Trockner", names: ["Trockner", ...SYNONYMS.dryer], room: "HWR", camera: false },
    { id: "media_player.tv", entity: "media_player.tv", name: "Fernseher", names: ["Samsung TV", "Fernseher", ...SYNONYMS.tv_board], room: "Wohnzimmer", camera: false },
    { id: "furniture:p1", entity: null, name: "Poolpumpe", names: ["Poolpumpe", ...SYNONYMS.pool_pump], room: "Garten", camera: false },
    { id: "furniture:h1", entity: null, name: "Heizkörper", names: ["Heizkörper", ...SYNONYMS.radiator], room: "Flur", camera: false },
    { id: "furniture:h2", entity: null, name: "Heizkörper", names: ["Heizkörper", ...SYNONYMS.radiator], room: "Wohnzimmer", camera: false },
  ];
  // the sensor is "Waschmaschine Leistung", asked for as the machine
  assert.equal(id(t("Zeig die Waschmaschine", items)), "sensor.waschmaschine_leistung");
  assert.equal(id(t("Läuft die Wäsche? zeig mal", items)), "sensor.waschmaschine_leistung");
  // without any entity, by its kind
  assert.equal(id(t("Wo ist der Trockner", items)), "furniture:t1");
  // everyday words
  assert.equal(id(t("Zeig den Fernseher", items)), "media_player.tv");
  assert.equal(id(t("zeig mal die Glotze", items)), "media_player.tv");
  assert.equal(id(t("wo ist die Poolpumpe", items)), "furniture:p1");
  assert.equal(id(t("zeig die Pumpe", items)), "furniture:p1");
  // two of a kind: the one in the room named, else the first
  assert.equal(id(t("Zeig die Heizung im Wohnzimmer", items)), "furniture:h2");
  assert.equal(id(t("Zeig die Heizung", items)), "furniture:h1");
  // the room still wins over a device that only shares its name
  assert.equal(t("Zeig das Wohnzimmer", items)?.kind, "room");
});

test("a room's own name wins over an outdoor area answering to the same name (#668)", () => {
  // the driveway on the ground floor is linked to the Home Assistant area "Garage"; the room "Garage" is in the cellar
  const square: [number, number][] = [
    [0, 0],
    [4, 0],
    [4, 4],
    [0, 4],
  ];
  const drive = { id: "drive", type: "driveway" as const, points: square, area_id: "garage", name: "" };
  const eg = { ...newFloor("eg", "Erdgeschoss", 0), rooms: [room("wz", "Wohnzimmer")], outdoor: [drive] };
  const kg = { ...newFloor("kg", "Keller", -2.5), rooms: [room("vl", "Vorratslager"), { ...room("ga", "Garage"), area_id: "garage" }] };
  const b = { ...emptyBuilding(), floors: [eg, kg] };
  const areas: Record<string, string> = { garage: "Garage" };
  const alias = (r: Room) => (r.area_id ? areas[r.area_id] : null);
  assert.deepEqual(showTarget("Zeige mir Garage", b, [], alias), { kind: "room", floorId: "kg", roomId: "ga", name: "Garage" });
  assert.deepEqual(showTarget("Zeige mir Vorratslager", b, [], alias), { kind: "room", floorId: "kg", roomId: "vl", name: "Vorratslager" });
  // a device in the driveway called "Garage" (the door's drive) does not take the room's place either
  const opener: Shown[] = [{ id: "cover.garage", entity: "cover.garage", name: "Garage", room: "", camera: false }];
  assert.equal(showTarget("Zeige mir Garage", b, opener, alias)?.kind, "room");
  // the room's own name only, without Home Assistant's area name: the same
  const b2 = { ...b, floors: [eg, { ...kg, rooms: [room("vl", "Vorratslager"), room("ga", "Garage")] }] };
  assert.equal((showTarget("Zeige mir Garage", b2, [], alias) as { roomId: string }).roomId, "ga");
  // an outdoor area's own name still beats a further name (alias) of a room
  const b3 = { ...b, floors: [{ ...eg, outdoor: [{ ...drive, name: "Einfahrt" }] }, { ...kg, rooms: [{ ...room("ga", "Garage"), aliases: ["Einfahrt"] }] }] };
  assert.equal((showTarget("Zeige die Einfahrt", b3, [], alias) as { roomId: string }).roomId, "drive");
});
