## NeonPlan 3D 2.0.2 – Live Presence on Android, and "Where is …?" flies there

### Live Presence on Android

- **Android phones are found by themselves.** Switch on the BLE Transmitter in the Home Assistant app (Settings → Companion app → Manage sensors → BLE Transmitter). The locating assistant then lists the phone with its name and person. You don't have to hold it next to a receiver.
- **Hints for weak settings.** Out of the box the app sends at its lowest power and in power-saving mode, so the receivers barely hear it. The assistant now tells you when to set the transmit power to **High**, the advertise mode to **Low latency**, or to switch the transmitter on.
- **"⚠ not heard"** now shows next to every device that no receiver hears, in the device list and while learning. Pairing Android phones or tablets through the key helper does not work, because Android does not send that key in the background. The key helper button now says "For an iPhone", and Android uses the app's transmitter instead.
- Thanks to @frops83 and @rolandarends for testing and reporting (#726, #727)!

### Watch and phone together

- **The surer device wins.** When the watch and the phone are heard at the same time in different rooms, the phone now wins when it is clearly surer. A shared wall can fool the watch. No extra phone symbol appears next to the person any more.
- **A watch you took off is noticed.** When the watch lies in one room for ten minutes while the phone moves on, the phone tells where you are. The watch then shows as a small symbol where it lies.
- A phone left lying while you walk on with the watch still shows where it lies.

### "Where is …?" flies there

- **"Where is Anna?"** flies the open NeonPlan views into her room. **"Who is home?"** tours every room with someone in it, one after another, and a tap stops it. It is on by default and can be switched off in the locating assistant under **Live**. While people are shown to admins only, only admins' views fly to them.
- **It also works with an AI agent such as Gemini.** The Assist sentences now carry the names locating knows, so these questions are answered locally. Before, the agent only said "Anna is at home".
- **The microphone in the NeonPlan panel** now asks locating first.
- **To ask through Assist** (the Home Assistant app, a voice speaker): switch on NeonPlan's sentences under **⚙ Settings → Voice control → Sentences for Assist**. They are off by default. The microphone in the NeonPlan panel works without them.
- **Older Assist sentence files are updated again.** A file an older NeonPlan had written was taken for your own, so newer questions like "Who is home?" never arrived.

### Fixed

- **The 3D view no longer jumps after a freeze.** A turn or zoom made while the view was still busy just after opening was replayed seconds later, and the view landed somewhere else in the house. Thanks to @frops83 (#712)!

Found a problem? Please open an [issue on GitHub](https://github.com/Mastershort/neonplan3d/issues).

### How to update

Settings → System → Updates. HACS only checks for new versions every few hours, so a fresh update is sometimes missing there. If it is: HACS → NeonPlan 3D → ⋮ → **Update information** → **Download**. Restart Home Assistant and reload the page (Ctrl+F5).

---

## NeonPlan 3D 2.0.2 – Live-Präsenz mit Android, und „Wo ist …?“ fliegt hin

### Live-Präsenz mit Android

- **Android-Handys werden von selbst gefunden.** Schalte in der Home-Assistant-App den BLE-Sender ein (Einstellungen → Companion-App → Sensoren verwalten → BLE-Sender). Der Ortungs-Assistent zeigt das Handy dann mit Namen und Person an. Du musst es nicht an einen Empfänger halten.
- **Hinweise bei zu schwachen Einstellungen.** Ab Werk sendet die App mit der niedrigsten Leistung und im Stromsparmodus, deshalb hören die Empfänger sie kaum. Der Assistent sagt jetzt, wann du die Sendeleistung auf **Hoch** stellen solltest, den Sendemodus auf **Niedrige Latenz**, oder den Sender einschalten musst.
- **„⚠ nicht gehört“** steht jetzt neben jedem Gerät, das gerade kein Empfänger hört, in der Geräteliste und beim Einlernen. Android-Handys und -Tablets über den Schlüssel-Helfer zu koppeln, funktioniert nicht, weil Android diesen Schlüssel im Hintergrund nicht sendet. Der Knopf heißt jetzt „Für iPhone“, und für Android nimmst du den Sender der App.
- Danke an @frops83 und @rolandarends fürs Testen und Melden (#726, #727)!

### Uhr und Handy zusammen

- **Das sicherere Gerät gewinnt.** Hört NeonPlan Uhr und Handy gleichzeitig in verschiedenen Räumen, gewinnt jetzt das Handy, wenn es sich deutlich sicherer ist. Eine gemeinsame Wand kann die Uhr täuschen. Ein zusätzliches Handy-Symbol neben der Person gibt es nicht mehr.
- **Eine abgelegte Uhr wird erkannt.** Liegt die Uhr zehn Minuten im selben Raum, während das Handy weiterwandert, sagt das Handy, wo du bist. Die Uhr steht dann als kleines Symbol dort, wo sie liegt.
- Ein liegengelassenes Handy, während du mit der Uhr weitergehst, erscheint weiter dort, wo es liegt.

### „Wo ist …?“ fliegt hin

- **„Wo ist Anna?“** lässt die offenen NeonPlan-Ansichten in ihren Raum fliegen. **„Wer ist zu Hause?“** fliegt nacheinander alle Räume ab, in denen jemand ist, und Antippen stoppt den Flug. Das ist standardmäßig an und lässt sich im Ortungs-Assistenten unter **Live** ausschalten. Solange Personen nur Admins gezeigt werden, fliegen nur die Ansichten von Admins zu ihnen.
- **Das klappt auch mit einem KI-Agenten wie Gemini.** Die Assist-Sätze kennen jetzt die Namen aus der Ortung, deshalb werden diese Fragen lokal beantwortet. Bisher sagte der Agent nur „Anna ist zu Hause“.
- **Das Mikrofon im NeonPlan-Panel** fragt jetzt zuerst die Ortung.
- **Um über Assist zu fragen** (Home-Assistant-App, Sprachlautsprecher): Schalte die Sätze von NeonPlan unter **⚙ Einstellungen → Sprachsteuerung → Sätze für Assist** ein. Ab Werk sind sie aus. Das Mikrofon im NeonPlan-Panel braucht sie nicht.
- **Ältere Assist-Satzdateien werden wieder aktualisiert.** Eine Datei, die ein älteres NeonPlan geschrieben hatte, galt als deine eigene. Neuere Fragen wie „Wer ist zu Hause?“ kamen deshalb nie an.

### Behoben

- **Die 3D-Ansicht springt nach einem Hänger nicht mehr.** Drehen oder Zoomen, während die Ansicht kurz nach dem Öffnen noch beschäftigt war, wurde Sekunden später nachgeholt, und man landete woanders im Haus. Danke an @frops83 (#712)!

Ein Problem gefunden? Bitte schreib ein [Issue auf GitHub](https://github.com/Mastershort/neonplan3d/issues).

### So bekommst du das Update

Einstellungen → System → Updates. HACS sucht nur alle paar Stunden nach neuen Versionen, deshalb fehlt ein frisches Update dort manchmal noch. Dann: HACS → NeonPlan 3D → ⋮ → **Informationen aktualisieren** → **Herunterladen**. Home Assistant neu starten und die Seite neu laden (Strg+F5).
