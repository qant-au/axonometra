## NeonPlan 3D 2.0.3 – People at the sofa, meter readings, and a round of fixes

### Live Presence

- **People stand where a presence zone says.** When a presence sensor of the room (such as an Aqara FP2 with zones) reports its "Sofa" or "Armchair" zone as occupied, the person's figure stands at that sofa or armchair instead of in the middle of the room. Zones are matched to the room's furniture by name: built-in furniture, pack furniture, or a name you gave the furniture yourself.
- **Door zones work too.** A zone like "Entrance hall" or "Terrace door" places the figure just inside the room, in front of the door to that room or to the outside. "Rest of the room" keeps the middle.
- **Located people show without a tracker of their own.** A Home Assistant person without a tracker (state "unknown") counted as away, so the figure stayed hidden although the person was located at home. Thanks to @marcus2k9 (#744)!

### Fixed

- **Blinds are outside again on walls drawn on their own.** A single wall drawn as an outer wall (rooms on one side only) took its inside from the direction it was drawn in. Its blinds and sills could end up in the room, and it never turned to glass like the other outer walls. It now finds its outside by the rooms. Thanks to @Kodak1976 and @Deninho91 (#542)!
- **Pets walk smoothly again on phones and tablets.** On the tablet level they moved at 5 frames a second and stood still after half a minute. Now they run at about 15 and keep walking while the view rests. Thanks to @Deninho91 (#752)!
- **A light's power is its own.** Where one device carries several lights (an actuator, PowerCalc), every light got the device's first power sensor, so a bathroom light's power showed in the office. Now PowerCalc's sensor named after the light comes first, otherwise one in the light's room. Thanks to @daene85 (#743)!
- **Gas and water meters from the Utilities pack take their reading.** They asked for a power sensor in W. Now they offer a meter reading in m³ or litres, shown at the symbol. Thanks to @PetrMa (#730)!
- **Energie Pro: cables are back when rooms are drawn a little apart.** Rooms with a small gap between them (a stairwell, a hallway) cut the cable's way. Gaps up to about a metre are now bridged. Thanks to @netrunnercs (#731)!
- **Roof windows with a window motor count as open** for the window watch and the spoken answers, as the 3D view shows them. Thanks to @frops83 (#712)!
- **Front doors with glass show the pane from both sides.** From outside, the solid leaf hid it (#712).
- **The Deco pack's plants take a plant sensor.** Monstera, fiddle-leaf fig, palms, bonsai and the other new plants were not recognised as plants. Plants are now also known by their name (#712).

### Wärme Pro (release 5)

- **"Heating since" tells the real time.** A card opened while the heat pump was already heating said "since 0 min". A target of 0 °C (none reported) is no longer shown. Thanks to @tomv79 (#735)!
- **Towel radiators** from the bath pack now get their heating pipes like other radiators. The electric one stays without pipes. Thanks to @holle021272 (#751)!
- The update comes through the shop: on the **✦ Extensions** tab, as soon as it is offered there.

Found a problem? Please open an [issue on GitHub](https://github.com/Mastershort/neonplan3d/issues).

### How to update

Settings → System → Updates. HACS only checks for new versions every few hours, so a fresh update is sometimes missing there. If it is: HACS → NeonPlan 3D → ⋮ → **Update information** → **Download**. Restart Home Assistant and reload the page (Ctrl+F5).

---

## NeonPlan 3D 2.0.3 – Personen am Sofa, Zählerstände und eine Runde Korrekturen

### Live-Präsenz

- **Personen stehen dort, wo eine Präsenzzone es sagt.** Meldet ein Präsenzmelder des Raums (etwa ein Aqara FP2 mit Zonen) seine Zone „Sofa“ oder „Sessel“ als belegt, steht die Figur an diesem Sofa oder Sessel statt in der Raummitte. Zonen werden über den Namen den Möbeln im Raum zugeordnet: eingebaute Möbel, Möbel aus Paketen oder ein Name, den du dem Möbel selbst gegeben hast.
- **Tür-Zonen gehen auch.** Eine Zone wie „Eingang Flur“ oder „Terrassentür“ stellt die Figur knapp in den Raum, vor die Tür zu diesem Raum oder nach draußen. „Restlicher Raum“ bleibt die Raummitte.
- **Geortete Personen erscheinen auch ohne eigenen Tracker.** Eine Person in Home Assistant ohne Tracker (Zustand „unbekannt“) galt als abwesend. Die Figur blieb deshalb verborgen, obwohl die Person zu Hause geortet war. Danke an @marcus2k9 (#744)!

### Behoben

- **Rollläden sind an einzeln gezeichneten Wänden wieder außen.** Eine einzelne Wand, die als Außenwand gezeichnet ist (nur auf einer Seite Räume), nahm ihre Innenseite aus der Zeichenrichtung. Rollläden und Fensterbänke konnten so im Raum landen, und die Wand wurde nie wie die übrigen Außenwände zu Glas. Jetzt findet sie ihre Außenseite über die Räume. Danke an @Kodak1976 und @Deninho91 (#542)!
- **Haustiere laufen auf Handy und Tablet wieder flüssig.** Auf der Tablet-Stufe bewegten sie sich mit 5 Bildern pro Sekunde und blieben nach einer halben Minute stehen. Jetzt laufen sie mit etwa 15 und laufen weiter, während die Ansicht ruht. Danke an @Deninho91 (#752)!
- **Jede Lampe zeigt ihre eigene Leistung.** Wo ein Gerät mehrere Lampen trägt (ein Aktor, PowerCalc), bekam jede Lampe den ersten Leistungssensor des Geräts. Die Leistung einer Badlampe stand so im Büro. Jetzt kommt zuerst der PowerCalc-Sensor, der nach der Lampe benannt ist, sonst einer im Raum der Lampe. Danke an @daene85 (#743)!
- **Gas- und Wasserzähler aus dem Versorgungs-Paket nehmen ihren Zählerstand.** Sie wollten einen Leistungssensor in W. Jetzt bieten sie einen Zählerstand in m³ oder Litern an, der am Symbol steht. Danke an @PetrMa (#730)!
- **Energie Pro: Die Kabel sind wieder da, wenn Räume mit etwas Abstand gezeichnet sind.** Räume mit einer kleinen Lücke dazwischen (ein Treppenhaus, ein Flur) schnitten dem Kabel den Weg ab. Lücken bis etwa einen Meter werden jetzt überbrückt. Danke an @netrunnercs (#731)!
- **Dachfenster mit Fenstermotor gelten als offen** für die Fensterwache und die gesprochenen Antworten, so wie die 3D-Ansicht sie zeigt. Danke an @frops83 (#712)!
- **Haustüren mit Glas zeigen die Scheibe von beiden Seiten.** Von außen verdeckte das volle Türblatt sie (#712).
- **Die Pflanzen aus dem Deko-Paket nehmen einen Pflanzensensor.** Monstera, Geigenfeige, Palmen, Bonsai und die anderen neuen Pflanzen wurden nicht als Pflanzen erkannt. Pflanzen werden jetzt auch an ihrem Namen erkannt (#712).

### Wärme Pro (Release 5)

- **„Heizt seit“ nennt die echte Zeit.** Eine Karte, die geöffnet wurde, während die Wärmepumpe schon heizte, sagte „seit 0 Min.“. Ein Sollwert von 0 °C (keiner gemeldet) wird nicht mehr gezeigt. Danke an @tomv79 (#735)!
- **Handtuchheizkörper** aus dem Bad-Paket bekommen jetzt ihre Heizungsrohre wie andere Heizkörper. Der elektrische bleibt ohne Rohre. Danke an @holle021272 (#751)!
- Das Update kommt über den Shop: im Reiter **✦ Erweiterungen**, sobald es dort angeboten wird.

Ein Problem gefunden? Bitte schreib ein [Issue auf GitHub](https://github.com/Mastershort/neonplan3d/issues).

### So bekommst du das Update

Einstellungen → System → Updates. HACS sucht nur alle paar Stunden nach neuen Versionen, deshalb fehlt ein frisches Update dort manchmal noch. Dann: HACS → NeonPlan 3D → ⋮ → **Informationen aktualisieren** → **Herunterladen**. Home Assistant neu starten und die Seite neu laden (Strg+F5).
