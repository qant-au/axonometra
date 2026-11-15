## NeonPlan 3D 2.0.5 – Roofs at an angle

### New: turn a roof part

Not every house is built at right angles. A wing or an extension that stands at an angle to the house can now get its own roof at that angle.

- In the editor, choose the **Roof** tool and tap a roof part. Under the ridge direction there is a new **Turn** field with the buttons **↺ 15°** and **↻ 15°**.
- The part turns clockwise in the plan. Dormers and cross gables on it turn along, roof windows and solar fields stay on it.
- Where a turned wing runs into another roof, that roof's slopes cut it off.
- A turned part is moved by dragging. To change its size, turn it back to 0°, drag the corners, and turn it again.
- **Every roof drawn so far stays at 0° and looks exactly as before.** Nothing changes unless you turn a part.

Thanks to @s0undmaker and @goldrapper19872504 for the wish (discussions #634, #724)!

### Fixed

- **Cameras shown as furniture keep their camera pin.** The camera keeps its pin with all its settings (field of view, view wedge, Camera Cockpit); the furniture model only joins it instead of taking the camera over. Thanks to @EduK85 (#779)!
- **Roof windows find their floor and room.** For the window watch and the spoken answers a roof window now counts in the room of its sensor's area, or in the room beneath it, instead of always on the top floor without a room. Thanks to @sjess and @frops83 (#783, #712)!
- **Jumping to a warning on slow tablets.** The room of the warning now opens even when the floor takes a moment to draw. Thanks to @sjess (#784)!
- **"Mark as put out" on bins.** The button in a bin's bubble takes the tap again. Thanks to @246tbwpjzk-cell (#793)!
- **Floor order.** The floor's up/down buttons in the editor now say that they only change the order in the list. Where a floor sits in 3D comes from its height above the ground. Thanks to @liltoddy (#777)!
- **The point the view turns about.** The editor's 3D pane shows a small cross where the view turns about, and pointing at 📌 in the 3D view shows it too, so you can frame the house before saving a start view. Thanks to @PetrMa (#733)!

Found a problem? Please open an [issue on GitHub](https://github.com/Mastershort/neonplan3d/issues).

### How to update

Settings → System → Updates. HACS only checks for new versions every few hours, so a fresh update is sometimes missing there. If it is: HACS → NeonPlan 3D → ⋮ → **Update information** → **Download**. Restart Home Assistant and reload the page (Ctrl+F5).

---

## NeonPlan 3D 2.0.5 – Dächer im Winkel

### Neu: Dachflächen drehen

Nicht jedes Haus ist rechtwinklig gebaut. Ein Anbau oder Flügel, der schräg zum Haus steht, bekommt jetzt sein eigenes Dach im passenden Winkel.

- Im Editor das Werkzeug **Dach** wählen und eine Dachfläche antippen. Unter der Firstrichtung gibt es das neue Feld **Drehung** mit den Knöpfen **↺ 15°** und **↻ 15°**.
- Die Fläche dreht sich im Plan im Uhrzeigersinn. Gauben und Zwerchgiebel darauf drehen mit, Dachfenster und Solarfelder bleiben auf ihr.
- Wo ein gedrehter Flügel in ein anderes Dach läuft, schneidet ihn dessen Dachfläche ab.
- Eine gedrehte Fläche verschiebst du durch Ziehen. Zum Ändern der Größe drehst du sie auf 0° zurück, ziehst die Ecken und drehst sie wieder.
- **Jedes bisher gezeichnete Dach bleibt auf 0° und sieht genau so aus wie vorher.** Es ändert sich nur etwas, wenn du eine Fläche drehst.

Danke an @s0undmaker und @goldrapper19872504 für den Wunsch (Diskussionen #634, #724)!

### Behoben

- **Kameras als Möbel behalten ihren Kamera-Pin.** Die Kamera behält ihren Pin mit allen Einstellungen (Blickfeld, Sichtkegel, Kamera-Cockpit); das Möbelmodell kommt nur dazu, statt die Kamera zu übernehmen. Danke an @EduK85 (#779)!
- **Dachfenster finden ihre Etage und ihren Raum.** Für die Fensterwache und die Sprachantworten zählt ein Dachfenster jetzt im Raum aus dem Bereich seines Sensors oder im Raum darunter, statt immer in der obersten Etage ohne Raum. Danke an @sjess und @frops83 (#783, #712)!
- **Sprung zur Warnung auf langsamen Tablets.** Der Raum der Warnung öffnet sich jetzt auch, wenn die Etage einen Moment zum Zeichnen braucht. Danke an @sjess (#784)!
- **„Als rausgestellt markieren“ bei Mülltonnen.** Der Knopf in der Blase einer Tonne nimmt den Tipp wieder an. Danke an @246tbwpjzk-cell (#793)!
- **Reihenfolge der Etagen.** Die Knöpfe Nach oben/Nach unten im Editor sagen jetzt, dass sie nur die Reihenfolge in der Liste ändern. Wo eine Etage in 3D liegt, bestimmt ihre Höhe über dem Boden. Danke an @liltoddy (#777)!
- **Der Drehpunkt der Ansicht.** Die 3D-Ansicht im Editor zeigt ein kleines Kreuz, um das sich die Ansicht dreht, und in der 3D-Ansicht erscheint es auch, wenn du auf 📌 zeigst. So rückst du das Haus zurecht, bevor du eine Startansicht speicherst. Danke an @PetrMa (#733)!

Ein Problem gefunden? Bitte schreib ein [Issue auf GitHub](https://github.com/Mastershort/neonplan3d/issues).

### So bekommst du das Update

Einstellungen → System → Updates. HACS sucht nur alle paar Stunden nach neuen Versionen, deshalb fehlt ein frisches Update dort manchmal noch. Dann: HACS → NeonPlan 3D → ⋮ → **Informationen aktualisieren** → **Herunterladen**. Home Assistant neu starten und die Seite neu laden (Strg+F5).
