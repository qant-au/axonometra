# Accurona import format

*Deutsch weiter unten.*

The **import page** – <https://neonplan3d.mastershort.de/import/> – turns plans from other programs into a Accurona plan. It reads Sweet Home 3D (`.sh3d`), iPhone/iPad LiDAR scans (RoomPlan JSON), CAD drawings (`.dxf`), 3D models (`.glb`, `.gltf`, `.obj`, `.stl`), Floorplanner exports, Valetudo robot vacuum maps – and the simple format described here. Everything runs in your browser; the file is uploaded nowhere. The result is a Accurona file you load in the editor under **Backup → Import …**.

The simple format is meant for anyone who writes a plan by hand, with a script or with an AI (see [ai-import.md](ai-import.md)): you describe rooms, doors and windows by plain coordinates, and the import page places everything properly (doors and windows on their walls, rooms joined, furniture mapped).

## The file

```json
{
  "format": "neonplan-import",
  "units": "m",
  "rooms_at": "centre",
  "floors": [
    {
      "name": "Ground floor",
      "elevation": 0,
      "height": 2.5,
      "rooms": [
        { "name": "Living room", "points": [[0, 0], [6, 0], [6, 4.5], [0, 4.5]] },
        { "name": "Kitchen", "points": [[6, 0], [10, 0], [10, 4.5], [6, 4.5]] }
      ],
      "walls": [{ "from": [3, 4.5], "to": [3, 2.5], "thickness": 0.1 }],
      "doors": [{ "at": [6, 2.25], "width": 0.9, "height": 2.01 }],
      "windows": [{ "at": [3, 0], "width": 1.5, "height": 1.3, "sill": 0.9 }],
      "furniture": [
        { "type": "sofa", "at": [3, 3.6], "rotation": 180 },
        { "name": "Dining table", "at": [8, 2], "width": 1.6, "depth": 0.9, "height": 0.75 }
      ]
    }
  ]
}
```

| Field | Meaning |
|---|---|
| `format` | always `"neonplan-import"` |
| `units` | `"m"` (default), `"cm"` or `"mm"` – for every length in the file |
| `rooms_at` | `"centre"` (default): room outlines run along the **middle of the walls**, so neighbouring rooms share their edge. `"inner"`: outlines along the **inner faces** (measured inside dimensions) – rooms a wall apart are joined. |
| `floors[]` | lowest first. `elevation` = height of the floor above the ground floor (the ground floor is 0, a cellar is negative), `height` = storey height (default 2.5 m) |
| `rooms[]` | `name` and `points` – the outline as `[x, z]` corners in order (at least 3). **x** runs to the right, **z** down the plan (from the top of the drawing to the bottom). Do not repeat the first corner at the end. |
| `walls[]` | optional, only walls that are **no room edge**: a partition through half a room, a half-height wall. `from`/`to`, `thickness`, `height` (optional) |
| `doors[]` | `at` = the **middle** of the door on its wall (a point on a room edge), `width`, `height` (optional) |
| `windows[]` | `at`, `width`, `height`, `sill` (bottom edge above the floor), optional `sill_board`: `"auto"` (default: board inside and sill outside from 0.3 m sill height, none for a window directly above another opening), `"none"`, `"inside"` or `"outside"`. Two windows above each other (a transom light) are listed as two windows with the same `at`. |
| `furniture[]` | `at` = the middle, `type` (a built-in kind, see below) or `name` (recognised in many languages: "Sofa", "Kühlschrank", "lit double" …), `width` (along its front), `depth`, `height` (optional: the kind's usual size), `rotation` in degrees clockwise (0 = its front faces down the plan, 180 = up), `elevation` (bottom above the floor, e.g. a wall cabinet) |

Built-in furniture kinds: `sofa`, `sofa_l`, `sofa_u`, `armchair`, `stool`, `coffee_table`, `tv_board`, `tv_wall`, `sideboard`, `shelf`, `plant`, `rug`, `table`, `table_round`, `chair`, `bench`, `corner_bench`, `bar_stool`, `kitchen` (base cabinet), `kitchen_wall`, `kitchen_tall`, `island`, `worktop`, `sink`, `stove`, `dishwasher`, `fridge`, `bed`, `bunk_bed`, `nightstand`, `wardrobe`, `dresser`, `bathtub`, `shower`, `wc`, `washbasin`, `washer`, `dryer`, `desk`, `office_chair`, `tall_cabinet`, `coat_rack`, `stairs`, `stairs_u`, `radiator`, `ac_unit`, `robot_vacuum`, lamps `lamp_ceiling`, `lamp_downlight`, `lamp_spot`, `lamp_panel`, `lamp_pendant`, `lamp_floor`, `lamp_table`, `lamp_wall`, `led_strip`.

## Tips

- Keep the corners exact: rooms that share a wall should share the same coordinates (with `rooms_at: "centre"`).
- A door between two rooms is listed once.
- The import page shows a preview and tells you what it had to leave out (a door that lies on no room edge, a room with too few corners).
- A complete Accurona plan (an export from the editor, or one an AI wrote in that format) can be checked and repaired on the import page too.

---

# Accurona-Importformat

Die **Import-Seite** – <https://neonplan3d.mastershort.de/import/> – macht aus Plänen anderer Programme einen Accurona-Plan: Sweet Home 3D (`.sh3d`), iPhone-/iPad-LiDAR-Scans (RoomPlan-JSON), CAD-Zeichnungen (`.dxf`), 3D-Modelle (`.glb`, `.gltf`, `.obj`, `.stl`), Floorplanner-Exporte, Valetudo-Saugroboterkarten – und das hier beschriebene einfache Format. Alles läuft im Browser, die Datei wird nirgendwohin hochgeladen. Das Ergebnis lädst du im Editor unter **Sicherung → Importieren …**.

Das einfache Format ist für alle, die einen Plan von Hand, mit einem Skript oder mit einer KI schreiben (siehe [ai-import.md](ai-import.md)). Aufbau wie oben:

- `units`: `"m"` (Standard), `"cm"` oder `"mm"`.
- `rooms_at`: `"centre"` (Standard) = Raumumrisse auf der **Wandmitte**, Nachbarräume teilen sich die Kante; `"inner"` = an den **Innenkanten** gemessen, Räume im Wandabstand werden zusammengeführt.
- `floors[]`: von unten nach oben; `elevation` = Höhe über dem Erdgeschoss (Keller negativ), `height` = Geschosshöhe.
- `rooms[]`: `name` und `points` als `[x, z]`-Ecken der Reihe nach; **x** nach rechts, **z** im Plan nach unten.
- `walls[]`: nur Wände, die **keine** Raumkante sind (halbe Trennwand).
- `doors[]` / `windows[]`: `at` = **Mitte** der Tür bzw. des Fensters auf der Wand, `width`, `height`, bei Fenstern `sill` (Brüstung) und optional `sill_board` (Fensterbank): `"auto"` (Standard: ab 0,3 m Brüstung innen und außen, keine bei einem Fenster direkt über einer anderen Öffnung), `"none"`, `"inside"` oder `"outside"`. Zwei Fenster übereinander (Oberlicht) sind zwei Fenster mit demselben `at`.
- `furniture[]`: `at` = Mitte, `type` (siehe Liste oben) oder `name` (wird in vielen Sprachen erkannt), `width`, `depth`, `height`, `rotation` im Uhrzeigersinn (0 = Vorderseite zeigt im Plan nach unten), `elevation` (z. B. Hängeschrank).
