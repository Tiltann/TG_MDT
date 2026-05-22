# MDT — Multi-Faction Tablet

[🇩🇪 Deutsch](#-deutsch) · [🇬🇧 English](#-english)

> ⚠️ **Status:** Mockup / Work in Progress — kein fertiges Script. · *Mockup / Work in Progress — not a finished script.*

---

## 🇩🇪 Deutsch

**Tablet Vorschau:** [https://tiltann.github.io/TG_MDT/](https://tiltann.github.io/TG_MDT/)

Ein freies, modulares **MDT (Mobile Data Terminal)** als Ingame-Tablet für **alle Fraktionen** — nicht nur Polizei, sondern auch Medic, Mechanic, Justiz und mehr. Jede Fraktion sieht ihre eigenen Daten, kann aber je nach Rechten auch auf relevante Informationen anderer Fraktionen zugreifen (z. B. Medic → Krankenakte, Polizei → Strafakte).

Entwickelt als **Community-Projekt** von Mitgliedern des Tubehosting Discord. **Nicht offiziell mit Tubehosting affiliiert.**

### Was es ist

Ein Tablet ingame, das jede Fraktion bekommt. Jede Fraktion sieht nur ihre eigenen Sachen, kann aber je nach Rechten auch auf andere Daten zugreifen.

### Feature-Status (aktuell)

- [ ] 🔐 **Login** per Charakter
- [x] 📊 **Dashboard** mit Status-/Aktivitätsübersicht
- [x] 👤 **Personenakte** (modellbasiert, mit Bild/Notizen)
- [x] 🚗 **Fahrzeugakte** (modellbasiert, inkl. Halter-/Statusdaten)
- [ ] 📝 **Berichte** (vollständiger Workflow)
- [ ] ⚖️ **Strafkatalog / Bußgeldkatalog** (vollständiger Workflow)
- [x] 🗺️ **Live-Map** (Tile-basiert, modulabhängig)
- [x] 📡 **Funk-Mitglieder-Sync** im Tablet
- [x] 💬 **Live-Chat** im MDT
- [ ] 🛠️ **Admin- / Leitungsbereich** (Ränge/Rechte-Management)
- [x] 🔔 **Benachrichtigungen**
- [x] 🧭 **Dispatch-System** (Live Calls, Zuweisungen, Verlauf/Logs)
- [x] 🧱 **Fraktions-/Agency-Module** (Dispatch/Livemap pro Department steuerbar)
- [x] 🕒 **Duty-System** (Framework-Bridge + Statuswechsel)

### Schnellstart (Server)

1. Resource sicherstellen: `ensure TG_MDTT`
2. Web bauen:
    ```bash
    cd web && bun install && bun run build
    ```
3. DB-Migrationen sind im Script enthalten (Dispatch-Tabellen werden beim Start angelegt).
4. Öffnen im Spiel mit `/mdt` (oder Keybind aus `config/commands.lua`, Standard: `F6`).

Hinweis: Wenn ein Spieler `/mdt` zu früh nach Resource-Restart nutzt, erscheint ein "Tablet lädt noch"-Hinweis. Der Open-Versuch wird vorgemerkt und nach Client-Init automatisch ausgeführt.

### Dispatch-Konfig-Highlights

- `share_between_jobs` unterstützt:
   - `'all'`
   - flache Gruppe: `{ 'police', 'sheriff' }`
   - mehrere Gruppen: `{ { 'pd' }, { 'ems', 'mechanic' } }`
   - Jobs **und** Department-Keys (Agencies) aus `Config.MDT.departments`
- `status_codes` unterstützt:
   - `label_key` + optionales `label` fallback
   - Scope je Status über `jobs = { ... }` und/oder `agencies = { ... }`
   - Farben als Named Color **oder Hex** (z. B. `'#ff6b00'`)

### Design-Prinzipien

- **Modular** — Module lassen sich pro Fraktion ein- und ausblenden
- **Sauberes, modernes UI**
- **Dark Mode** als Standard
- **Eine Familie"** über alle Fraktionen, aber jede mit eigener Identität (Akzentfarbe, Logo, ggf. Schriftart)

### Standards

Alle Coding- und Design-Standards für dieses Projekt sind in [`STANDARDS.md`](./STANDARDS.md) dokumentiert. **Bitte vor Beiträgen lesen.**

### 🧩 Modulares Akten-Modell (Lua)

Alle Aktenfelder (Personen/Fahrzeuge) und Fahrzeug-Hashnamen werden zentral in `config/akte-models.lua` gepflegt.

- `Config.AkteModels.person.fields` definiert alle Personenakten-Felder
- `Config.AkteModels.vehicle.fields` definiert alle Fahrzeugakten-Felder
- `Config.AkteModels.vehicle_model_names` mapped Modell-Hash -> Anzeigename (gegen "Unknown" Modelle)

Jedes Feld unter `fields` unterstützt:

- `key`: eindeutiger Feldname (DB/UI Schlüssel)
- `label_key`: Locale-Key für UI-Text
- `type`: `text`, `select` oder `textarea`
- `default`: Standardwert
- `editable`: `true/false` (wenn `false`, wird das Feld serverseitig nicht überschrieben)
- `options`: nur bei `select` (Liste aus `{ value, label_key }`)

Hinweise:

- Neue Felder müssen nur in `config/akte-models.lua` ergänzt werden, die UI rendert sie dynamisch.
- Beim Speichern akzeptiert der Server nur `editable = true` Felder.
- Für unbekannte Fahrzeugmodelle einfach den Hash in `vehicle_model_names` ergänzen.

### 🗺️ Live-Map — Karten-Tiles einrichten

Die Karten-Tiles sind **nicht im Repository enthalten** (zu groß für GitHub).  
Ohne die Tiles zeigt die Live-Map nur eine leere/fehlerhafte Karte — das Script gibt beim Start eine entsprechende Warnung in der Serverkonsole aus.

**So richtest du die Live-Map ein:**

1. Lade die Tiles herunter:  
   **[https://drive.proton.me/urls/YZE057HH5G#KN3aoWGvPXb8](https://drive.proton.me/urls/YZE057HH5G#KN3aoWGvPXb8)**

2. Entpacke das Archiv so, dass die Ordnerstruktur stimmt:
   ```
   web/public/map/styleAtlas/{z}/{x}/{y}.jpg
   web/public/map/styleGrid/{z}/{x}/{y}.png
   web/public/map/styleSatelite/{z}/{x}/{y}.jpg
   ```

3. Baue das Web-UI neu:
   ```bash
   cd web && npm run build
   ```
   Der Build kopiert `public/` automatisch nach `dist/`. Danach die Resource neu starten.

> Die Karten-Tiles stammen ursprünglich aus dem Projekt  
> **[RiceaRaul/gta-v-map-leaflet](https://github.com/RiceaRaul/gta-v-map-leaflet)** — alle Credits gehen an RiceaRaul und die Mitwirkenden.

### Support

Support gibt es aktuell **ausschließlich über GitHub Issues**. Bitte keine Support-Anfragen per Discord, DM oder Mail — Issues sind der einzige Weg.

---

## 🇬🇧 English

**Tablet Preview:** [https://tiltann.github.io/TG_MDT/](https://tiltann.github.io/TG_MDT/)

A free, modular **MDT (Mobile Data Terminal)** as an in-game tablet for **every faction** — not only police, but also medic, mechanic, judiciary and more. Each faction sees its own data, but depending on permissions can also access relevant information from other factions (e.g. medic → medical records, police → criminal records).

Built as a **community project** by members of the Tubehosting Discord. **Not officially affiliated with Tubehosting.**

### What it is

An in-game tablet that every faction gets. Each faction only sees its own stuff, but depending on permissions can also access other data.

### Feature Status (current)

- [x] 📊 **Dashboard** with status/activity overview
- [x] 👤 **Person records** (model-driven, photo/notes support)
- [x] 🚗 **Vehicle records** (model-driven, owner/status fields)
- [ ] 📝 **Reports** (full workflow)
- [ ] ⚖️ **Penalty / fine catalog** (full workflow)
- [x] 🗺️ **Live map** (tile-based, module-gated)
- [x] 📡 **Radio member sync** inside tablet
- [x] 💬 **Live chat** inside MDT
- [ ] 🛠️ **Admin / leadership area** (rank/permission management)
- [x] 🔔 **Notifications**
- [x] 🧭 **Dispatch system** (live calls, assignment, history/log retrieval)
- [x] 🧱 **Agency module controls** (dispatch/livemap per department)
- [x] 🕒 **Duty system** (framework bridge + status handling)

### Quick Start (server)

1. Ensure the resource: `ensure TG_MDTT`
2. Build web assets:
    ```bash
    cd web && bun install && bun run build
    ```
3. DB bootstrap is automatic for dispatch tables during startup.
4. Open in-game with `/mdt` (or keybind from `config/commands.lua`, default: `F6`).

Note: If a player runs `/mdt` too early after a resource restart, they now get a "tablet still loading" message. The open action is queued and auto-runs after client initialization.

### Dispatch Config Highlights

- `share_between_jobs` supports:
   - `'all'`
   - flat group: `{ 'police', 'sheriff' }`
   - multi-group: `{ { 'pd' }, { 'ems', 'mechanic' } }`
   - both job names and department keys (agencies) from `Config.MDT.departments`
- `status_codes` supports:
   - `label_key` with optional `label` fallback
   - per-status scope via `jobs = { ... }` and/or `agencies = { ... }`
   - named colors **and hex** (for example `'#ff6b00'`)

### Design principles

- **Modular** — modules can be toggled per faction
- **Clean, modern UI**
- **Dark mode** by default
- **"One family"** across all factions, but each with its own identity (accent color, logo, optionally font)

### Standards

All coding and design standards for this project are documented in [`STANDARDS.md`](./STANDARDS.md). **Please read before contributing.**

### 🧩 Modular Akte Model (Lua)

All Akte fields (persons/vehicles) and vehicle hash-name mappings are managed centrally in `config/akte-models.lua`.

- `Config.AkteModels.person.fields` defines person Akte fields
- `Config.AkteModels.vehicle.fields` defines vehicle Akte fields
- `Config.AkteModels.vehicle_model_names` maps model hash -> display name (to avoid "Unknown" models)

Each field inside `fields` supports:

- `key`: unique field name (DB/UI key)
- `label_key`: locale key for UI labels
- `type`: `text`, `select`, or `textarea`
- `default`: default value
- `editable`: `true/false` (if `false`, server-side save ignores changes)
- `options`: for `select` only (array of `{ value, label_key }`)

Notes:

- To add fields, update `config/akte-models.lua`; the UI renders them dynamically.
- On save, the server only applies fields with `editable = true`.
- For unknown vehicle models, add the hash to `vehicle_model_names`.

### 🗺️ Live Map — Setting up map tiles

The map tile files are **not included in this repository** (too large for GitHub).  
Without the tiles the live map will show a blank/broken map — the script will print a warning in the server console on startup.

**How to set up the live map:**

1. Download the tiles:  
   **[https://drive.proton.me/urls/YZE057HH5G#KN3aoWGvPXb8](https://drive.proton.me/urls/YZE057HH5G#KN3aoWGvPXb8)**

2. Extract and place them so the folder structure looks like this:
   ```
   web/public/map/styleAtlas/{z}/{x}/{y}.jpg
   web/public/map/styleGrid/{z}/{x}/{y}.png
   web/public/map/styleSatelite/{z}/{x}/{y}.jpg
   ```

3. Rebuild the web UI:
   ```bash
   cd web && npm run build
   ```
   The build copies `public/` into `dist/` automatically. Then restart the resource.

> Map tiles originally from  
> **[RiceaRaul/gta-v-map-leaflet](https://github.com/RiceaRaul/gta-v-map-leaflet)** — all credit goes to RiceaRaul and contributors.

### Support

Support is currently provided **exclusively via GitHub Issues**. Please do not send support requests via Discord, DM, or email — issues are the only channel.

---

## License · Lizenz

See [`LICENSE`](./LICENSE).

## Disclaimer

This project is a community effort and is **not affiliated with, endorsed by, or connected to Tubehosting**. ·
Dieses Projekt ist ein Community-Projekt und ist **nicht mit Tubehosting affiliiert, von Tubehosting unterstützt oder verbunden**.
