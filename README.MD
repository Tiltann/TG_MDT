# MDT — Multi-Faction Tablet

[🇩🇪 Deutsch](#-deutsch) · [🇬🇧 English](#-english)

> ⚠️ **Status:** Mockup / Work in Progress — kein fertiges Script. · *Mockup / Work in Progress — not a finished script.*

---

## 🇩🇪 Deutsch

Ein freies, modulares **MDT (Mobile Data Terminal)** als Ingame-Tablet für **alle Fraktionen** — nicht nur Polizei, sondern auch Medic, Mechanic, Justiz und mehr. Jede Fraktion sieht ihre eigenen Daten, kann aber je nach Rechten auch auf relevante Informationen anderer Fraktionen zugreifen (z. B. Medic → Krankenakte, Polizei → Strafakte).

Entwickelt als **Community-Projekt** von Mitgliedern des Tubehosting Discord. **Nicht offiziell mit Tubehosting affiliiert.**

### Was es ist

Ein Tablet ingame, das jede Fraktion bekommt. Jede Fraktion sieht nur ihre eigenen Sachen, kann aber je nach Rechten auch auf andere Daten zugreifen.

### Features (geplant)

- 🔐 **Login** per Charakter
- 📊 **Dashboard** mit eigenen Einsätzen, News und Schichtstatus
- 👤 **Personenakte** — Suche nach Name, ID oder Kennzeichen inkl. Foto, Strafregister, Krankenakte, Führerscheine, Waffenschein
- 🚗 **Fahrzeugakte** — Halter, Versicherung, Vermerke, Status
- 📝 **Berichte** schreiben und abrufen (Einsatz, Strafanzeige, Behandlung — je nach Fraktion)
- ⚖️ **Strafkatalog / Bußgeldkatalog** mit direkter Ausstellung
- 🗺️ **Live-Map** mit Kollegen und Markern (Einsatzorte, POIs)
- 📡 **Funk / interner Chat** zwischen Mitgliedern
- 📅 **Dienstplan & Schichten**
- 🛠️ **Admin- / Leitungsbereich** — Mitglieder, Ränge, Rechte verwalten
- 🔔 **Benachrichtigungen** (neuer Einsatz, neue Akte, etc.)

### Design-Prinzipien

- **Modular** — Module lassen sich pro Fraktion ein- und ausblenden
- **Sauberes, modernes UI**
- **Dark Mode** als Standard
- **„Eine Familie"** über alle Fraktionen, aber jede mit eigener Identität (Akzentfarbe, Logo, ggf. Schriftart)

### Standards

Alle Coding- und Design-Standards für dieses Projekt sind in [`STANDARDS.md`](./STANDARDS.md) dokumentiert. **Bitte vor Beiträgen lesen.**

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

A free, modular **MDT (Mobile Data Terminal)** as an in-game tablet for **every faction** — not only police, but also medic, mechanic, judiciary and more. Each faction sees its own data, but depending on permissions can also access relevant information from other factions (e.g. medic → medical records, police → criminal records).

Built as a **community project** by members of the Tubehosting Discord. **Not officially affiliated with Tubehosting.**

### What it is

An in-game tablet that every faction gets. Each faction only sees its own stuff, but depending on permissions can also access other data.

### Features (planned)

- 🔐 **Login** per character
- 📊 **Dashboard** with own calls, news and shift status
- 👤 **Person records** — search by name, ID or license plate, incl. photo, criminal record, medical record, driver's licenses, weapon license
- 🚗 **Vehicle records** — owner, insurance, notes, status
- 📝 **Reports** — create and retrieve (call reports, charges, treatment — per faction)
- ⚖️ **Penalty / fine catalog** with direct issuance
- 🗺️ **Live map** with colleagues and markers (incidents, POIs)
- 📡 **Radio / internal chat** between members
- 📅 **Shift planner**
- 🛠️ **Admin / leadership area** — manage members, ranks, permissions
- 🔔 **Notifications** (new call, new record, etc.)

### Design principles

- **Modular** — modules can be toggled per faction
- **Clean, modern UI**
- **Dark mode** by default
- **"One family"** across all factions, but each with its own identity (accent color, logo, optionally font)

### Standards

All coding and design standards for this project are documented in [`STANDARDS.md`](./STANDARDS.md). **Please read before contributing.**

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
