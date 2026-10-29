# Möbel-Packs

Möbel-Packs bringen zusätzliche Möbel in Axonometra. Sie werden wie die eingebauten Möbel aus
Quadern und Zylindern gebaut und laufen deshalb genauso flüssig auf schwachen Tablets.

Nur Packs, die mit dem Herausgeber-Schlüssel unterschrieben sind, lassen sich importieren. Der
öffentliche Schlüssel steht in `custom_components/axonometra/packs.py` (`PACK_PUBLIC_KEYS`); der
geheime Schlüssel liegt nur beim Herausgeber und gehört nie ins Repo.

## Ablauf

1. Pack-Quelle schreiben (JSON, Format unten), z. B. `private/packs/kueche.json`
   (`private/` wird von Git ignoriert).
2. Unterschreiben:

   ```
   python tools/fp3dpack.py sign private/packs/kueche.json --key %USERPROFILE%\.floorplan3d\pack-signing-key.pem
   ```

   Mit `--licensee "Name oder E-Mail"` wird der Käufer mit unterschrieben und beim Import angezeigt.
3. Prüfen: `python tools/fp3dpack.py verify private/packs/kueche.fp3dpack`
4. Die `.fp3dpack`-Datei verteilen. Import in Home Assistant: Editor → **Möbel** →
   **Möbel-Pack importieren …**

Den geheimen Schlüssel sicher aufbewahren (Backup, z. B. Passwort-Manager): Geht er verloren, können
keine neuen Packs mehr unterschrieben werden. Mit `keygen` einen neuen zu erzeugen hilft nur, wenn
dessen öffentlicher Schlüssel zusätzlich in `PACK_PUBLIC_KEYS` eingetragen und ausgeliefert wird.

## Format

```json
{
  "format": "fp3dpack",
  "version": 1,
  "id": "mastershort.kueche",
  "name": "Küchen-Pack",
  "publisher": "Mastershort",
  "description": "optional",
  "items": [
    {
      "id": "retro_fridge",
      "name": { "de": "Retro-Kühlschrank", "en": "Retro fridge" },
      "size": [0.6, 0.65, 1.5],
      "electric": true,
      "parts": [{ "shape": "box", "x": 0, "z": 0, "w": 1, "d": 1, "y": 0, "h": 1, "color": "white", "edges": true }],
      "symbol": [{ "shape": "rect", "x": 0, "z": 0, "w": 1, "d": 1 }]
    }
  ]
}
```

- `size`: Standardgröße in Metern (Breite, Tiefe, Höhe). Im Plan lässt sich jedes Möbel danach frei
  skalieren; alle Teile wachsen mit – außer denen mit `fix`.
- `fix` an einem Teil (ab Axonometra 1.23, Mindestversion setzen): welche Maße das Teil beim Skalieren
  **behält** – `"w"`, `"d"`, `"h"` oder mehrere (`"wdh"`). Beine, Armlehnen, Platten und Griffe
  behalten so ihre Größe und ihren Abstand zur Kante des Möbels, die Teile dazwischen (Sitzfläche,
  Korpus) strecken sich. Je Achse gibt es damit eine feste Zone an jedem Ende und eine Mitte, die
  wächst; ein festes Teil in der Mitte bleibt mittig. Reicht der Platz für die festen Teile nicht
  (ein sehr schmales Möbel), skaliert alles wie früher.
- `parts` (max. 60): `box`, `cyl` oder `loft`. Alle Maße sind **Anteile der Möbelgröße**: `x`/`z`
  Mitte (−0,5 … 0,5, vorne ist +z), `w`/`d` Breite/Tiefe (0 … 1), `y` Unterkante und `h` Höhe (0 … 1
  der Höhe). Ein Zylinder hat den kleineren Wert von `w` und `d` als Durchmesser; mit `axis: "x"` oder
  `"z"` liegt er (Räder, Rollen – die Länge ist die Ausdehnung entlang der Achse, der Durchmesser der
  kleinere Wert aus Querausdehnung und `h`). Ein `loft` ist ein Quader, dessen Oberseite ein anderes
  Rechteck ist (`tx`/`tz` Mitte, `tw`/`td` Größe; Standard wie unten) – für schräge Flächen wie
  Motorhauben, Windschutzscheiben oder Lampenschirme.
  Ein Teil mit `rot` (Grad) ist um seine eigene Mitte um die Hochachse gedreht – für Wendeltreppen
  oder diagonale Streben; ein schmaler `loft` mit versetzter Oberseite ergibt eine schräge Stange
  (Handlauf).
- `color`: `#rrggbb` oder eine Rolle der eingebauten Palette (`body`, `fabric`, `cushion`, `wood`,
  `white`, `metal`, `dark`, `glass`, `plant`, `pot`, `accent`) – Rollen passen zum Look. `top` setzt
  eine eigene Farbe für die Oberseite, `edges` zeichnet leuchtende Kanten (`true`: dezent blau,
  `"glow"`: cyan wie die Wände, `"faint"`: sehr zart).
- `symbol` (optional, max. 40): Draufsicht im Plan aus `rect` (`fill` für gefüllt), `circle` (`r` als
  Anteil der kleineren Seite) und `line` (`x1`, `z1`, `x2`, `z2`). Ohne Symbol zeichnet der Plan die
  Teile von oben.
- `electric`: das Möbel lässt sich mit einem Schalter und Leistungssensor verknüpfen.
- `mount`: wo das Möbel sitzt – `floor` (Standard), `surface` (auf dem Möbel darunter, z. B.
  Kaffeemaschine auf der Arbeitsplatte), `wall` (Unterkante bei `wall_y` Metern, z. B. Wallbox) oder
  `ceiling` (hängt von der Decke, z. B. Dunstabzug, Pendelleuchten).
- `surface`: die Oberseite trägt andere Möbel (Tisch, Kücheninsel, Werkbank).
- `hole`: eine Treppe – reicht sie bis zur Etage darüber, schneidet sie dort die Treppenöffnung in den
  Boden (wie die eingebaute Treppe); die Stufen steigen von der Vorderkante (+z) nach hinten an.
- `light`: das Möbel ist eine Leuchte und wird mit einem Licht (oder Schalter) verknüpft. Der Wert sagt,
  wie das Licht den Raum ausleuchtet (`ceiling`, `pendant`, `floor`, `table`, `wall`, `spot`, `garden` …).
  Teile mit `"glow": true` leuchten in Farbe und Helligkeit des Lichts.
- `screen`: ein Teil mit `"screen": true` ist ein Bildschirm (Fernseher, Monitor). Das Möbel lässt sich
  dann mit einem Media Player verknüpfen; die Vorderseite (+z) zeigt die Farbe der laufenden App und
  ihr Bild, wie die eingebauten Fernseher.
- **Bibliothek** (optional, ab Axonometra 1.23 – ältere Versionen lehnen Packs mit diesen Feldern ab,
  also die Mindestversion setzen): `group` sagt, was das Möbel ist (`sofa`, `seating`, `table`,
  `storage`, `bed`, `kitchen`, `appliance`, `bath`, `lamp`, `media`, `office`, `tech`, `heating`,
  `energy`, `household`, `deco`, `plant`, `outdoor`, `kids`, `sport`, `pets`, `vehicle`, `stairs`,
  `architecture`), `room` die Räume, für die es gedacht ist (`living`, `dining`, `kitchen`,
  `bedroom`, `kids`, `bath`, `office`, `hall`, `utility`, `garage`, `garden`, `hobby`; leer = überall),
  `tags` weitere Suchwörter. `family` fasst Varianten eines Möbels (ein Tisch in drei Längen) zu
  einer Karte zusammen, `variant` (Text je Sprache wie `name`) beschriftet den Chip der Variante.
  Ohne diese Felder ordnet Axonometra das Möbel nach seinen Wörtern und dem Pack ein; Varianten
  erkennt es an der Größe am Ende der ID (`table_160`) und an den Zahlen im Namen.

## Feature-Packs (Axonometra Pro)

Ein Pack darf statt Möbeln (oder zusätzlich) `features` tragen, zum Beispiel
`"features": ["weather"]` mit `"items": []`. Ist so ein Pack installiert, ist die Pro-Funktion frei:
`camera_cockpit` (durch die Kamera schauen, Bewegungsspur), `weather` (Wetter draußen) oder
`screens` (Bildschirme live: App-Farbe und Cover des Media Players, Bildregeln, Kamera-Livebild auf
Bildschirmen – ohne das Feature ist ein Bildschirm nur an oder aus). Ohne Pack zeigen die Schalter
ein Schloss und ein Hinweis führt zum Shop. Die Pro-Packs werden wie jedes Pack signiert, gebunden
und über die Shop-Verbindung installiert (`private/packs/defs/pro_*.py`, Produkt-Schlüssel
`pro_camera`, `pro_weather`, `pro_screens`); jede Erweiterung wird einzeln verkauft.

## Shop-Bilder

`cd frontend && node pack-images.mjs <pack.json>... --out <ordner>` rendert mit der echten 3D-Grafik
(vorher `npm run build`) je Pack ein Übersichtsbild (`overview.png`, 3200 × 2400) und ein freigestelltes
PNG pro Möbel (`items/<id>.png`).

## Personalisierte Downloads im Shop

Zwei Schlüssel sind eingetragen: der **Master-Schlüssel** (offline, signiert die Packs) und der
**Shop-Schlüssel** (auf dem Server, signiert jeden Kauf mit dem Käufernamen). Wird der Server je
kompromittiert, fliegt nur der Shop-Schlüssel aus `PACK_PUBLIC_KEYS`; alte Signaturen bleiben gültig.

Damit der Server nicht die ganze Kanonisierung nachbauen muss, liegt neben jeder Pack-Datei eine
**Vorlage** `<pack>.canonical.json` (die kanonischen Bytes ohne Lizenznehmer, aus
`python tools/fp3dpack.py canonical <pack>.json`; `private/packs/build.py` erzeugt sie mit). Der Shop
ersetzt darin das letzte `"licensee":null` durch den Namen und signiert genau diese Bytes –
`tools/shop/ms-np-sign.php` macht das für WooCommerce (Hook `woocommerce_download_product`).

Einrichtung auf dem Server:

1. Seed des Shop-Schlüssels ausgeben: `python tools/fp3dpack.py seed shop-signing-key.pem` und in
   `wp-config.php` eintragen: `define('MS_NP_SIGNING_SEED', '<base64>');`
2. `<pack>.canonical.json` zu jeder `<pack>.fp3dpack` in den WooCommerce-Upload-Ordner legen.
3. `tools/shop/ms-np-sign.php` in den Code-Ordner des Shops kopieren.

Fehlt Seed oder Vorlage, liefert WooCommerce die unpersonalisierte Datei wie bisher aus.

Möbel eines entfernten Packs bleiben im Plan als einfache Kästen stehen und erscheinen wieder, wenn das
Pack erneut importiert wird.

## Lizenzschlüssel, Gerätebindung und Updates

Jeder Kunde bekommt mit dem ersten Pack-Kauf **einen Schlüssel** (`NP-XXXX-XXXX-XXXX-XXXX`), der in
der Bestell-Mail, auf der Danke-Seite und im Kundenkonto steht. In Axonometra wird er einmal unter
*Erweiterungen › Shop-Verbindung* eingetragen. Danach:

- listet die Integration die gekauften Packs (Knopf „Installieren“ beziehungsweise „Aktualisieren“),
- holt sie **signiert für diese Installation**: das Payload-Feld `instance` trägt den Fingerabdruck
  (`sha256("neonplan3d:" + Instanz-ID)[:16]`, in der Oberfläche als „Installations-Kennung“ zu
  sehen); ein so signiertes Pack lehnt jede andere Installation mit `wrong_instance` ab,
- prüft **einmal täglich** beim Shop nach neuen Käufen und neueren Releases (Payload-Feld `release`,
  Standard 1; ein höheres Release derselben Pack-ID ersetzt das installierte Pack).

Installierte Packs brauchen den Shop nie wieder: die Signatur wird lokal geprüft. Fällt der Shop aus
oder wird die Verbindung getrennt, bleibt alles, nur Updates kommen nicht mehr von selbst.

Ein Schlüssel ist mit höchstens drei Installationen gleichzeitig verbunden. Kommt eine neue dazu
(Umzug auf neue Hardware), fällt die älteste heraus. Bis zu fünf neue Verbindungen sind in 365 Tagen
möglich; darüber antwortet der Shop mit `activation_limit`. Downloads von der Website sind an die zuletzt
aktivierte Installation gebunden; wer noch nie aktiviert hat, bekommt die Datei nur mit Namen signiert.

Serverseite (`tools/shop/ms-np-license.php`, neben `ms-np-sign.php`):

1. WooCommerce-Hooks legen den Schlüssel beim ersten Pack-Kauf an (Nutzer-Meta `_ms_np_license`,
   bei Gastbestellungen Bestell-Meta) und zeigen ihn in Mail, Bestellung und Konto.
2. `POST /wp-json/axonometra/v1/catalog` `{key, instance}` bindet die Installation und liefert
   `{licensee, packs: [{id, name, release, url}]}`; `POST /wp-json/axonometra/v1/pack`
   `{key, instance, pack}` liefert die signierte Datei. Fehler sind `{code, message}` mit HTTP 4xx.
3. `release` und `instance` stehen in den Vorlagen `<pack>.canonical.json` (neu erzeugen mit
   `python tools/fp3dpack.py canonical`); der Shop ersetzt das letzte `"instance":null`.

Nutzt der Shop ein Mail-Template-Plugin, das `woocommerce_email_after_order_table` nicht ausführt
(zum Beispiel „Email Template Customizer for WooCommerce“), hängt eine kleine Zusatzdatei
`ms-np-license-mail.php` auf dem Server den Schlüssel über den Filter `woocommerce_mail_callback_params`
an die fertige Mail an. Sie liegt nur auf dem Server, weil sie zum jeweiligen Shop gehört.

Beim Speichern eines Produkts leert `ms-np-license.php` die zwischengespeicherten Produkt-Links und
Pack-Angaben, damit der Katalog nach dem Veröffentlichen sofort die richtigen URLs liefert.

Signieren von Hand: `python tools/fp3dpack.py sign PACK.json --key … --licensee "Name" --instance <Kennung>`.

