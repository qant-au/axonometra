## NeonPlan 3D 2.0.4 – The garden on the ground, and a request

### Help make NeonPlan better

NeonPlan runs in thousands of homes, on wall tablets, old Fire tablets, phones and big PCs. I can't test every one of them. The anonymous usage reports show me where NeonPlan stutters and which errors really happen in your homes. This update already fixes one error that was found that way.

- **What is sent:** the versions of NeonPlan and Home Assistant, the kind of device and browser, how smoothly the 3D view runs, counts from your plan (floors, rooms, furniture), and error messages.
- **What is never sent:** names, entities, areas, the shape of your floor plan, IP addresses, your licence key.
- **Off by default.** You can look at every report before it is sent, switch it off again at any time, and delete your data with one tap.

Switch it on under **⚙ Settings → 🛟 Help improve**. Admins see a short invitation once in the editor. **Not now** hides it for good.

### Fixed

- **Garden items stand on the ground.** Bins, mowers, garden furniture and outdoor steps outside the rooms now stand on the lawn, the terrace or the lowered terrain beneath them. By default the lawn lies 20 cm below the floor, so until now they floated a little in every garden. Heights you set by hand stay as they are. Thanks to @Anrolosia (#708)!
- **Window boards on windows down to the floor.** A board you choose ("inside only" or "outside only") now shows on windows down to the floor and on terrace doors, lying at the floor. Glass walls offer the setting too. By default nothing changes. Thanks to @daene85 (#702)!
- **Round things cast round shadows.** Round tables, plants, a trampoline, a parasol or a fire pit cast a round contact shadow instead of a square one. In the garden the shadow lies on the ground the item stands on. Thanks to @PetrMa (#719)!
- **Slat buttons only where there are slats.** Some integrations, KNX among them, announce slat buttons for roller shutters too. Roller shutters, garage doors and curtains now only get them when they report a slat position. Thanks to @daene85 (#704)!
- **Pets stay inside upstairs.** An outer door or French window on an upper floor only lets pets (and the walk through the house) out when a balcony or terrace is drawn behind it. Thanks to @twynne (#766)!
- **Window contacts without a device class.** Binary sensors without a class, as KNX, enOcean or template sensors often are, now show up in the contact list of windows and doors.
- **Editor:** typing into a furniture field and then selecting something else no longer causes an error.

Found a problem? Please open an [issue on GitHub](https://github.com/Mastershort/neonplan3d/issues).

### How to update

Settings → System → Updates. HACS only checks for new versions every few hours, so a fresh update is sometimes missing there. If it is: HACS → NeonPlan 3D → ⋮ → **Update information** → **Download**. Restart Home Assistant and reload the page (Ctrl+F5).

---

## NeonPlan 3D 2.0.4 – Der Garten auf dem Boden, und eine Bitte

### Hilf mit, NeonPlan besser zu machen

NeonPlan läuft in tausenden Haushalten, auf Wandtablets, alten Fire-Tablets, Handys und großen PCs. Ich kann nicht jedes davon testen. Die anonymen Nutzungsberichte zeigen mir, wo NeonPlan ruckelt und welche Fehler bei euch wirklich auftreten. Ein Fehler, der so gefunden wurde, ist in diesem Update schon behoben.

- **Was gesendet wird:** die Versionen von NeonPlan und Home Assistant, die Art von Gerät und Browser, wie flüssig die 3D-Ansicht läuft, Anzahlen aus deinem Plan (Etagen, Räume, Möbel) und Fehlermeldungen.
- **Was nie gesendet wird:** Namen, Entitäten, Bereiche, die Form deines Grundrisses, IP-Adressen, dein Lizenzschlüssel.
- **Ab Werk aus.** Du kannst jeden Bericht vor dem Senden ansehen, es jederzeit wieder ausschalten und deine Daten mit einem Tipp löschen.

Einschalten unter **⚙ Einstellungen → 🛟 Hilf mit**. Admins sehen im Editor einmal einen kurzen Hinweis. **Nicht jetzt** blendet ihn für immer aus.

### Behoben

- **Gartenmöbel stehen auf dem Boden.** Mülltonnen, Mähroboter, Gartenmöbel und Außentreppen außerhalb der Räume stehen jetzt auf dem Rasen, der Terrasse oder dem abgesenkten Gelände darunter. Ab Werk liegt der Rasen 20 cm unter dem Boden, deshalb schwebten sie bisher in jedem Garten ein Stück. Höhen, die du von Hand eingestellt hast, bleiben. Danke an @Anrolosia (#708)!
- **Fensterbänke an bodentiefen Fenstern.** Eine gewählte Fensterbank („nur innen“ oder „nur außen“) erscheint jetzt auch bei bodentiefen Fenstern und Terrassentüren, dann auf Bodenhöhe. Auch die Glaswand bietet die Einstellung. Ab Werk ändert sich nichts. Danke an @daene85 (#702)!
- **Runde Dinge werfen runde Schatten.** Runde Tische, Pflanzen, ein Trampolin, ein Sonnenschirm oder eine Feuerschale werfen einen runden statt eines eckigen Schattens. Im Garten liegt der Schatten auf dem Boden, auf dem das Möbel steht. Danke an @PetrMa (#719)!
- **Lamellen-Knöpfe nur, wo es Lamellen gibt.** Manche Integrationen, darunter KNX, melden auch bei Rollläden Lamellen-Knöpfe. Rollläden, Garagentore und Vorhänge bekommen sie jetzt nur noch, wenn sie eine Lamellen-Stellung melden. Danke an @daene85 (#704)!
- **Haustiere bleiben oben im Haus.** Eine Außentür oder ein bodentiefes Fenster in einer oberen Etage lässt Haustiere (und den Rundgang) nur noch hinaus, wenn dahinter ein Balkon oder eine Terrasse gezeichnet ist. Danke an @twynne (#766)!
- **Fensterkontakte ohne Geräteklasse.** Binärsensoren ohne Klasse, wie sie KNX, enOcean oder Template-Sensoren oft haben, stehen jetzt in der Kontakt-Auswahl von Fenstern und Türen.
- **Editor:** In ein Möbelfeld tippen und dann gleich etwas anderes auswählen löst keinen Fehler mehr aus.

Ein Problem gefunden? Bitte schreib ein [Issue auf GitHub](https://github.com/Mastershort/neonplan3d/issues).

### So bekommst du das Update

Einstellungen → System → Updates. HACS sucht nur alle paar Stunden nach neuen Versionen, deshalb fehlt ein frisches Update dort manchmal noch. Dann: HACS → NeonPlan 3D → ⋮ → **Informationen aktualisieren** → **Herunterladen**. Home Assistant neu starten und die Seite neu laden (Strg+F5).
