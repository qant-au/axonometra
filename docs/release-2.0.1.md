## NeonPlan 3D 2.0.1 – HACS works again, help make NeonPlan better

### HACS can install and update NeonPlan again

Since the evening of 23 October, HACS fails on **every** download of a release zip, for all integrations, not only NeonPlan: GitHub's downloads now carry a header that is too large for HACS (hacs/integration#5643). NeonPlan now lets HACS fetch its files one by one, and that way still works. It was tested with Home Assistant 2026.10 and HACS 2.0.5, both as a new install and as an update.

- The Home Assistant log may show **one "Failed to download zipball" error** during the update. That is HACS' first try; the update still completes. You can ignore it.
- Still on 1.x and the update to 2.0.0 failed? Simply update to 2.0.1, it contains everything from 2.0.0 (Live Presence).
- From now on, we check every few hours whether a HACS download of NeonPlan still works, so a change like this on GitHub's side is noticed within hours.

### New: help make NeonPlan better (voluntary, off by default)

Under **⚙ Settings → 🛟 Help improve** you can switch on anonymous usage and error reports. They show which devices, versions and views NeonPlan runs on, and they report NeonPlan's own errors, so bugs can be found and fixed before anyone has to write an issue.

- At most one report a day. **Never** sent: names, entities, areas, the shape of your floor plan, IP addresses, your licence key – and nothing from locating.
- **"View report"** shows the exact next report before it is sent. **"Delete data"** removes everything already sent. Switching it off forgets the random id.

### Live Presence

- **Spoken names are matched tolerantly:** "Where is Thorsten's Apple Watch?" finds "Torsten Apple Watch". "My iPhone" means the iPhone of the person who asks, and a first name alone means the person.
- The manual link in the locating assistant opens the locating chapter directly.

Found a problem? Please open an [issue on GitHub](https://github.com/Mastershort/neonplan3d/issues).

### How to update

Settings → System → Updates. HACS only checks for new versions every few hours, so a fresh update is sometimes missing there. Then: HACS → NeonPlan 3D → ⋮ → **Update information** → **Download**. Restart Home Assistant and reload the page (Ctrl+F5).

---

## NeonPlan 3D 2.0.1 – HACS geht wieder, hilf mit, NeonPlan besser zu machen

### HACS kann NeonPlan wieder installieren und aktualisieren

Seit dem Abend des 23. Oktober scheitert HACS an **jedem** Download einer Release-Zip, bei allen Integrationen, nicht nur bei NeonPlan: Die Downloads von GitHub tragen jetzt einen Header, der für HACS zu groß ist (hacs/integration#5643). NeonPlan lässt HACS seine Dateien jetzt einzeln holen, und dieser Weg funktioniert weiter. Getestet mit Home Assistant 2026.10 und HACS 2.0.5, als Neuinstallation und als Update.

- Im Log von Home Assistant kann beim Update **einmal „Failed to download zipball“** stehen. Das ist der erste Versuch von HACS, das Update klappt trotzdem. Du kannst die Meldung ignorieren.
- Noch auf 1.x und das Update auf 2.0.0 ist gescheitert? Einfach auf 2.0.1 aktualisieren, darin steckt alles aus 2.0.0 (Live-Präsenz).
- Ab jetzt prüfen wir alle paar Stunden, ob ein HACS-Download von NeonPlan noch klappt. So fällt eine solche Änderung bei GitHub innerhalb von Stunden auf.

### Neu: Hilf mit, NeonPlan besser zu machen (freiwillig, standardmäßig aus)

Unter **⚙ Einstellungen → 🛟 Hilf mit** kannst du anonyme Nutzungs- und Fehlerberichte einschalten. Sie zeigen, auf welchen Geräten, Versionen und Ansichten NeonPlan läuft, und melden Fehler von NeonPlan selbst. So lassen sich Fehler finden und beheben, bevor jemand ein Issue schreiben muss.

- Höchstens ein Bericht pro Tag. **Nie** gesendet werden: Namen, Entitäten, Bereiche, die Form deines Grundrisses, IP-Adressen, dein Lizenzschlüssel – und nichts aus der Ortung.
- **„Bericht ansehen“** zeigt genau den nächsten Bericht, bevor er gesendet wird. **„Daten löschen“** entfernt alles schon Gesendete. Ausschalten vergisst die zufällige Kennung.

### Live-Präsenz

- **Gesprochene Namen werden tolerant erkannt:** „Wo ist Thorstens Apple Watch?“ findet „Torsten Apple Watch“. „Mein iPhone“ ist das iPhone der Person, die fragt, und ein Vorname allein meint die Person.
- Der Anleitungs-Link im Ortungs-Assistenten öffnet direkt das Kapitel zur Ortung.

Ein Problem gefunden? Bitte schreib ein [Issue auf GitHub](https://github.com/Mastershort/neonplan3d/issues).

### So bekommst du das Update

Einstellungen → System → Updates. HACS sucht nur alle paar Stunden nach neuen Versionen, deshalb fehlt ein frisches Update dort manchmal noch. Dann: HACS → NeonPlan 3D → ⋮ → **Informationen aktualisieren** → **Herunterladen**. Home Assistant neu starten und die Seite neu laden (Strg+F5).
