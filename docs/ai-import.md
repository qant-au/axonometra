# Let an AI write your plan

*Deutsch weiter unten.*

Many people already ask ChatGPT, Claude or Gemini to turn their floor plan into Axonometra. This works best with the template below: the AI writes the simple [import format](plan-format.md), and the **import page** (<https://neonplan3d.mastershort.de/import/>) checks it, places doors and windows on their walls, fixes small mistakes and gives you the Axonometra file for **Editor → Backup → Import …**.

Tip: for a Sweet Home 3D file, a CAD drawing, an iPhone scan or a 3D model you do not need an AI – drop the file on the import page directly.

## Template (copy it into the chat, then attach your plan)

```text
You convert floor plans into the "neonplan-import" JSON format of Axonometra.

Output ONLY one JSON object, no explanation, in this structure:
{
  "format": "neonplan-import",
  "units": "m",
  "rooms_at": "centre",
  "floors": [
    {
      "name": "<floor name>",
      "elevation": <metres above the ground floor, ground floor 0>,
      "height": <storey height in metres, usually 2.5>,
      "rooms": [ { "name": "<room>", "points": [[x, z], ...] } ],
      "doors": [ { "at": [x, z], "width": 0.9 } ],
      "windows": [ { "at": [x, z], "width": 1.2, "height": 1.3, "sill": 0.9 } ],
      "furniture": [ { "type": "<kind>", "at": [x, z], "width": w, "depth": d, "rotation": 0 } ]
    }
  ]
}

Rules:
- Metres. x runs to the right, z runs DOWN the plan (top of the drawing = small z). Put the top-left corner of the house at [0, 0].
- Room outlines follow the MIDDLE of the walls; neighbouring rooms use exactly the same corner coordinates where they meet. List the corners in order around the room, do not repeat the first one.
- Use the measurements written in the plan. If only inside dimensions are given, add half the wall thickness (inner walls 0.12 m, outer walls 0.3 m unless stated).
- Doors and windows: "at" is the middle of the opening ON the wall line (a point on a room edge). A door between two rooms is listed once.
- Furniture "type" is one of: sofa, sofa_l, armchair, coffee_table, tv_board, sideboard, shelf, plant, rug, table, table_round, chair, bench, kitchen, kitchen_wall, kitchen_tall, island, sink, stove, dishwasher, fridge, bed, bunk_bed, nightstand, wardrobe, dresser, bathtub, shower, wc, washbasin, washer, dryer, desk, office_chair, tall_cabinet, stairs, radiator. "rotation" in degrees clockwise; 0 = the front faces down the plan, 180 = up.
- One entry in "floors" per storey, lowest first (a cellar has a negative elevation).
- If something is unreadable, leave it out rather than guessing wildly.

Here is my floor plan:
```

Then save the AI's answer as a `.json` file and drop it on the import page. Check the preview: rooms, doors and windows should sit where they are in your plan. If something is off, tell the AI what to change ("the kitchen is 4.2 m wide, not 3.8") and try again.

---

# Den Plan von einer KI schreiben lassen

Viele lassen sich ihren Grundriss schon von ChatGPT, Claude oder Gemini für Axonometra umbauen. Am besten klappt das mit der Vorlage unten: Die KI schreibt das einfache [Importformat](plan-format.md), und die **Import-Seite** (<https://neonplan3d.mastershort.de/import/>) prüft es, setzt Türen und Fenster auf ihre Wände, repariert kleine Fehler und gibt dir die Axonometra-Datei für **Editor → Sicherung → Importieren …**.

Tipp: Für eine Sweet-Home-3D-Datei, eine CAD-Zeichnung, einen iPhone-Scan oder ein 3D-Modell brauchst du keine KI – die Datei einfach direkt auf die Import-Seite ziehen.

## Vorlage (in den Chat kopieren, dann den Grundriss anhängen)

```text
Du wandelst Grundrisse in das JSON-Format "neonplan-import" von Axonometra um.

Gib NUR ein JSON-Objekt aus, ohne Erklärung, in diesem Aufbau:
{
  "format": "neonplan-import",
  "units": "m",
  "rooms_at": "centre",
  "floors": [
    {
      "name": "<Etagenname>",
      "elevation": <Meter über dem Erdgeschoss, Erdgeschoss 0>,
      "height": <Geschosshöhe in Metern, meist 2.5>,
      "rooms": [ { "name": "<Raum>", "points": [[x, z], ...] } ],
      "doors": [ { "at": [x, z], "width": 0.9 } ],
      "windows": [ { "at": [x, z], "width": 1.2, "height": 1.3, "sill": 0.9 } ],
      "furniture": [ { "type": "<Art>", "at": [x, z], "width": b, "depth": t, "rotation": 0 } ]
    }
  ]
}

Regeln:
- Meter. x nach rechts, z im Plan nach UNTEN (oben in der Zeichnung = kleines z). Die linke obere Hausecke liegt bei [0, 0].
- Raumumrisse laufen auf der MITTE der Wände; Nachbarräume nutzen dort, wo sie sich treffen, genau dieselben Eckkoordinaten. Ecken der Reihe nach um den Raum, die erste nicht wiederholen.
- Die Maße aus dem Plan verwenden. Stehen nur Innenmaße da, die halbe Wanddicke dazurechnen (Innenwände 0,12 m, Außenwände 0,3 m, wenn nichts anderes angegeben ist).
- Türen und Fenster: "at" ist die Mitte der Öffnung AUF der Wandlinie (ein Punkt auf einer Raumkante). Eine Tür zwischen zwei Räumen nur einmal angeben.
- Möbel-"type" ist eins von: sofa, sofa_l, armchair, coffee_table, tv_board, sideboard, shelf, plant, rug, table, table_round, chair, bench, kitchen, kitchen_wall, kitchen_tall, island, sink, stove, dishwasher, fridge, bed, bunk_bed, nightstand, wardrobe, dresser, bathtub, shower, wc, washbasin, washer, dryer, desk, office_chair, tall_cabinet, stairs, radiator. "rotation" in Grad im Uhrzeigersinn; 0 = Vorderseite zeigt im Plan nach unten, 180 = nach oben.
- Pro Geschoss ein Eintrag in "floors", das unterste zuerst (Keller mit negativer elevation).
- Was unleserlich ist, lieber weglassen als wild raten.

Hier ist mein Grundriss:
```

Die Antwort der KI als `.json`-Datei speichern und auf die Import-Seite ziehen. In der Vorschau prüfen: Räume, Türen und Fenster sollten so sitzen wie in deinem Plan. Passt etwas nicht, der KI sagen, was sie ändern soll („die Küche ist 4,2 m breit, nicht 3,8“), und noch einmal versuchen.
