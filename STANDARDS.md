# STANDARDS - MDT Coding & Design Guidelines

**Alle Beiträge zu diesem Projekt müssen diese Standards einhalten.** Dies ist verbindlich für alle Pull Requests.

---

## 📋 Inhaltsverzeichnis

1. [Allgemeine Prinzipien](#allgemeine-prinzipien)
2. [Git & Versionskontrolle](#git--versionskontrolle)
3. [Code-Stil](#code-stil)
4. [Projektstruktur](#projektstruktur)
5. [Komponenten & UI](#komponenten--ui)
6. [Styling & Design-System](#styling--design-system)
7. [Internationalisierung (i18n)](#internationalisierung-i18n)
8. [Dokumentation](#dokumentation)
9. [Testing](#testing)
10. [Performance](#performance)
11. [Sicherheit](#sicherheit)
12. [Accessibility (a11y)](#accessibility-a11y)
13. [Naming Conventions](#naming-conventions)

---

## 🎯 Allgemeine Prinzipien

### Modularität
- **Bausteine statt Monolith**: Jede Fraktion sollte Module unabhängig aktivieren/deaktivieren können
- **Lose Kopplung**: Module kommunizieren über definierte Interfaces, nicht über globale Zustände
- **High Cohesion**: Zusammengehörige Funktionalität in einem Modul

### Wartbarkeit
- Code sollte lesbar sein - **Klarheit vor Cleverness**
- Kurze Funktionen mit klaren Aufgaben (Single Responsibility Principle)
- Häufig änderter Code sollte leicht testbar sein

### Skalierbarkeit
- Architektur muss wachsen können: von 5 auf 50+ Fraktionen
- Datenstrukturen müssen für große Datenmengen optimiert sein
- UI sollte responsive und schnell auch bei vielen Elementen bleiben

### "Eine Familie"
- Einheitliche Code-Standards über alle Module hinweg
- Gemeinsames Design-System (Farben, Typen, Komponenten)
- Aber: Jede Fraktion hat ihre Identität (Akzentfarbe, Logo)

---

## 🌳 Git & Versionskontrolle

### Pull Requests

**Titel:**
- Kurz und beschreibend
- Format: `[Module] Was macht der PR`
- Beispiel: `[Login] Add two-factor authentication`

**Beschreibung:**
```markdown
## 📝 Beschreibung
Kurze Zusammenfassung, was sich ändert.

## 🎯 Ziel
Warum ist dieser Change nötig? Welches Problem wird gelöst?

## ✅ Checkliste
- [ ] Tests hinzugefügt/aktualisiert
- [ ] Dokumentation aktualisiert
- [ ] Code-Standards beachtet
- [ ] Performance geprüft
- [ ] Keine Breaking Changes (oder dokumentiert)

## 📸 Screenshots (falls UI-Change)
Wenn visuell: Before/After Screenshots oder GIF

## 🔗 Bezug zu Issues
Closes #123
```

---

## 💻 Code-Stil

### JavaScript/TypeScript

**Sprache:** Verwende **TypeScript** mit strikter Typ-Prüfung
```json
{
  "strict": true,
  "noImplicitAny": true,
  "strictNullChecks": true
}
```

**Formatierung:**
- **Prettier** für automatische Formatierung
- **ESLint** für Code-Quality
- 2 Spaces Indentation
- Semikolons erforderlich

---

## 📁 Projektstruktur

```
src/
├── assets/
│   ├── icons/          - SVG Icons
│   ├── images/         - Bilder, Logos
│   └── fonts/          - Custom Fonts
├── components/
│   ├── common/         - Wiederverwendbare Komponenten (Button, Modal, etc.)
│   ├── layout/         - Layout-Komponenten (Header, Sidebar, etc.)
│   └── [module]/       - Modul-spezifische Komponenten
│       ├── PersonSearch.vue
│       └── PersonDetails.vue
├── modules/            - Feature-Module
│   ├── login/
│   │   ├── composables/
│   │   ├── services/
│   │   ├── views/
│   │   ├── types.ts
│   │   └── index.ts
│   ├── person-records/
│   └── [modul]/
├── services/           - API & externe Services
│   ├── api.ts          - HTTP-Client
│   ├── auth.ts         - Authentication
│   └── person.ts       - Person-Service
├── composables/        - Reusable Vue 3 Composables
│   ├── useAuth.ts
│   ├── useFetch.ts
│   └── [composable].ts
├── stores/             - Pinia State Management
│   ├── auth.ts
│   ├── ui.ts
│   └── [store].ts
├── types/              - Globale TypeScript Types
│   ├── index.ts
│   ├── models.ts
│   └── api.ts
├── utils/              - Utility-Funktionen
│   ├── formatting.ts   - Datum, Währung, etc.
│   ├── validation.ts   - Input-Validierung
│   └── [util].ts
├── styles/
│   ├── main.css        - Global Styles
│   ├── variables.css   - CSS Variables (Farben, Größen)
│   └── components.css  - Komponenten-Styles (wenn nicht scoped)
├── router/
│   └── index.ts        - Vue Router Konfiguration
├── i18n/               - Internationalisierung
│   ├── de.json         - Deutsche Texte
│   ├── en.json         - Englische Texte
│   └── index.ts
├── App.vue             - Root Komponente
└── main.ts             - Entry Point
```

**Regeln:**
- Dateinamen: `kebab-case` für Komponenten/Dateien (außer TS-Interfaces → PascalCase)
- Module sind unabhängig: `modules/[name]/index.ts` exportsiert das Modul
- Services abstrahieren externe APIs
- Composables für wiederverwendbare Logik
- Stores für globalen State (Auth, UI-Einstellungen)

---

## 🎨 Komponenten & UI

### Komponenten-Struktur

Jede Komponente sollte:
1. **Eine klare Aufgabe** haben
2. **Wiederverwendbar** sein
3. **Props dokumentiert** haben
4. **Fallbacks** für Edge-Cases haben

**Beispiel:**
```vue
<template>
  <button 
    :class="['btn', `btn--${variant}`, { 'btn--loading': isLoading }]"
    :disabled="isLoading || disabled"
    @click="$emit('click')"
  >
    <span v-if="isLoading" class="btn__spinner" />
    <slot>{{ label }}</slot>
  </button>
</template>

<script setup lang="ts">
interface Props {
  /** Visual variant of the button */
  variant?: 'primary' | 'secondary' | 'danger';
  /** Button label (alternative: use slot) */
  label?: string;
  /** Whether button is disabled */
  disabled?: boolean;
  /** Whether button is in loading state */
  isLoading?: boolean;
}

withDefaults(defineProps<Props>(), {
  variant: 'primary',
  disabled: false,
  isLoading: false,
});

defineEmits<{
  click: [];
}>();
</script>
```

### Component Library

Basis-Komponenten in `components/common/`:
- `Button.vue` - mit Varianten: primary, secondary, danger, ghost
- `Modal.vue` - Dialog/Popup
- `Input.vue` - Textfeld mit Label und Error-State
- `Select.vue` - Dropdown
- `Table.vue` - Daten-Tabelle
- `Card.vue` - Container
- `Badge.vue` - Status-Indicator
- `Spinner.vue` - Loading-Animation
- `Alert.vue` - Benachrichtigungen
- `Tabs.vue` - Tab-Navigation

---

## 🎨 Styling & Design-System

**Regeln:**
- BEM-Notation für Klassen: `.block`, `.block__element`, `.block--modifier`
- CSS-Variablen für alles, was wiederverwendet wird
- Scoped Styles in Vue-Komponenten
- Media Queries für Responsive Design
- Mobile-first Approach

---

## 🌍 Internationalisierung (i18n)

### Datei-Struktur

```
i18n/
├── de.json
├── en.json
└── index.ts
```

### Texte (JSON)

```json
{
  "common": {
    "save": "Speichern",
    "cancel": "Abbrechen",
    "delete": "Löschen",
    "edit": "Bearbeiten",
    "loading": "Laden...",
    "error": "Ein Fehler ist aufgetreten"
  },
  "login": {
    "title": "Anmelden",
    "username": "Benutzername",
    "password": "Passwort",
    "loginButton": "Anmelden",
    "errors": {
      "invalidCredentials": "Ungültige Anmeldedaten"
    }
  },
  "personRecords": {
    "title": "Personenakte",
    "searchPlaceholder": "Nach Name oder ID suchen...",
    "noResults": "Keine Ergebnisse gefunden"
  }
}
```

### Verwendung in Komponenten

```vue
<template>
  <div>
    <h1>{{ $t('personRecords.title') }}</h1>
    <input :placeholder="$t('personRecords.searchPlaceholder')" />
    <p v-if="!results.length">{{ $t('personRecords.noResults') }}</p>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n';

const { t } = useI18n();
</script>
```

**Regeln:**
- Alle UI-Texte müssen übersetzt sein (Deutsch + Englisch minimum)
- Keys: `module.feature.element` (hierarchisch)
- Platzhalter mit Interpolation: `"hello": "Hallo {{ name }}"`
- Deutsche Version ist die Referenz, Englisch sollte idiomatisch sein

---

## 📚 Dokumentation

### README für Module

Jedes Modul sollte eine `README.md` haben:

```markdown
# Person Records Module

## Übersicht
Verwaltung von Personenakten: Suche, Anzeige, Bearbeitung.

## Features
- Personen-Suche nach Name, ID, Kennzeichen
- Personenakte mit Foto, Strafregister, Krankenakte
- Berechtigungssystem

## Verwendung
\`\`\`vue
<PersonSearch @select="handleSelect" />
\`\`\`

## Komponenten
- `PersonSearch.vue` - Suchformular
- `PersonDetails.vue` - Akten-Detailansicht
- `PersonTable.vue` - Tabelle aller Personen

## Types
Siehe `types.ts`

## Services
- `personService.ts` - API-Aufrufe
```

### Kommentar-Standard

```typescript
/**
 * Sucht Personen nach Name, ID oder Kennzeichen
 * @param query Suchtext (mind. 2 Zeichen)
 * @returns Promise mit Array von gefundenen Personen
 * @throws {ValidationError} Wenn Query zu kurz
 */
export async function searchPersons(query: string): Promise<Person[]> {
  if (query.length < 2) {
    throw new ValidationError('Query must be at least 2 characters');
  }
  return api.get(`/persons/search?q=${encodeURIComponent(query)}`);
}
```

**Regeln:**
- JSDoc für alle öffentliche Funktionen/Klassen
- Inline-Kommentare nur für komplexe Logik (nicht offensichtliches)
- Warum, nicht Wie: **"Warum macht dieser Code das?"**
- Deutsche oder englische Dokumentation (konsistent im Modul)

---

## 🧪 Testing

### Unit Tests

**Regeln:**
- Teste Behavior, nicht Implementation
- Mindestens: Happy Path + Error Cases
- Mocks für externe APIs
- 80% Code Coverage anstreben

### Integration Tests

```typescript
import { describe, it, expect } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useAuthStore } from '@/stores/auth';

describe('Auth Integration', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('logs in user and stores token', async () => {
    const store = useAuthStore();
    await store.login('user@example.com', 'password123');
    
    expect(store.isAuthenticated).toBe(true);
    expect(store.user?.email).toBe('user@example.com');
  });
});
```

---

## ⚡ Performance

### Code-Level

```typescript
// ❌ Ineffizient: Neue Array jeden Render
const filteredResults = results.filter(r => r.active);

// ✅ Effizient: Computed Property (gecacht)
const filteredResults = computed(() => {
  return results.value.filter(r => r.active);
});

// ❌ Speicherleck: Event Listener nicht entfernt
mounted(() => {
  window.addEventListener('resize', handleResize);
});

// ✅ Korrekt: Cleanup
onMounted(() => {
  window.addEventListener('resize', handleResize);
});
onUnmounted(() => {
  window.removeEventListener('resize', handleResize);
});
```

### UI Performance

```vue
<!-- ❌ Ineffizient: Alle Elemente rendern -->
<div v-for="item in largeList" :key="item.id">
  {{ item.name }}
</div>

<!-- ✅ Effizient: Virtual Scrolling für große Listen -->
<VirtualScroll :items="largeList">
  <template #default="{ item }">
    {{ item.name }}
  </template>
</VirtualScroll>
```

**Richtlinien:**
- Nutze `v-show` statt `v-if` für häufig wechselnde Elemente
- Lazy-Loading für große Listen (Virtual Scrolling)
- Code-Splitting: Jedes Modul eigenes Bundle
- Bilder optimieren & komprimieren
- Bundle-Größe monitoren

---

## 🔒 Sicherheit

### Authentifizierung

```typescript
// ❌ Niemals im localStorage speichern
localStorage.setItem('authToken', token);

// ✅ In HttpOnly Cookie (Server-gesetzt)
// Server setzt Cookie automatisch, Frontend braucht nicht speichern

// ✅ Oder in Memory (bei Page-Reload verloren)
let authToken: string | null = null;
```

### XSS-Prevention

```vue
<!-- ❌ Unsicher: Raw HTML -->
<div v-html="userInput"></div>

<!-- ✅ Sicher: Text interpolation (auto-escaped) -->
<div>{{ userInput }}</div>

<!-- ✅ Wenn HTML nötig: sanitize zuerst -->
<div v-html="sanitizeHtml(userInput)"></div>
```

### API-Sicherheit

```typescript
// Immer HTTPS verwenden
const API_BASE = 'https://api.example.com';

// CORS-Headers prüfen
// Rate-Limiting nutzen
// Input validieren
if (!isValidEmail(email)) {
  throw new ValidationError('Invalid email');
}

// Sensitive Daten nicht in URLs
// ❌ /users?password=123
// ✅ POST /login { email, password }
```

**Richtlinien:**
- Alle Inputs validieren (Client + Server)
- HTTPS überall
- Keine sensitiven Daten in URLs oder LocalStorage
- CSRF-Tokens für State-changing Requests
- Security Headers (CSP, etc.)

---

## ♿ Accessibility (a11y)

### Semantisches HTML

```vue
<!-- ❌ Unzugänglich -->
<div @click="handleClick">Click me</div>

<!-- ✅ Zugänglich -->
<button @click="handleClick">Click me</button>

<!-- Für Custom Buttons -->
<div 
  role="button" 
  @click="handleClick"
  @keydown.enter="handleClick"
  @keydown.space="handleClick"
  tabindex="0"
>
  Click me
</div>
```

### ARIA Labels

```vue
<!-- Bilder -->
<img :src="avatar" :alt="userName" />

<!-- Icons ohne Text -->
<button :aria-label="$t('common.close')">
  <Icon name="close" />
</button>

<!-- Form Labels -->
<label for="email">Email</label>
<input id="email" type="email" />

<!-- Live Regions -->
<div aria-live="polite" aria-atomic="true">
  {{ notification }}
</div>
```

### Tastatur-Navigation

```vue
<!-- Navigation mit Tab-Order -->
<button tabindex="0">First</button>
<button tabindex="0">Second</button>
<button tabindex="0">Third</button>

<!-- Keyboard Shortcuts dokumentieren -->
<input @keydown.slash="focusSearch" />
```

**Richtlinien:**
- Alle Buttons/Links müssen fokussierbar sein
- Farbe allein reicht nicht zur Info
- Kontrast-Verhältnis: mind. 4.5:1
- Keyboard-Navigation ohne Maus möglich
- Screenreader-freundliche Labels

---

## 📛 Naming Conventions

### Zusammenfassung

| Element | Convention | Beispiel |
|---------|-----------|----------|
| **Vue-Komponenten** | PascalCase | `PersonSearch.vue` |
| **Dateinamen (JS/TS)** | camelCase | `personService.ts` |
| **Verzeichnisse** | kebab-case | `person-records/` |
| **Funktionen** | camelCase | `getUserById()` |
| **Klassen** | PascalCase | `UserService` |
| **Konstanten** | SCREAMING_SNAKE_CASE | `MAX_LOGIN_ATTEMPTS` |
| **Boolean-Props** | is/has/can | `isLoading`, `hasPermission` |
| **Private Eigenschaften** | _prefix | `_secretKey` |
| **Interfaces/Types** | PascalCase | `UserRecord`, `ApiResponse` |
| **Stores** | use[Name]Store | `useAuthStore` |
| **Composables** | use[Name] | `useFetch`, `useAuth` |
| **Events** | camelCase | `@personSelected` |
| **CSS-Klassen** | BEM | `.person-card__avatar` |
| **Branch-Namen** | kebab-case | `feature/login-2fa` |
| **Commit-Messages** | Conventional Commits | `feat: add 2FA` |

---

## ✅ Checkliste vor PR

- [ ] Code folgt diesen Standards
- [ ] TypeScript: Strikt Mode, keine `any`
- [ ] Tests geschrieben/aktualisiert
- [ ] Komponenten-Props dokumentiert (JSDoc)
- [ ] Alle neuen UI-Texte übersetzt (DE + EN)
- [ ] CSS-Variablen für Farben/Größen
- [ ] Accessibility geprüft (ARIA, Tastatur)
- [ ] Performance überprüft (keine n+1 Queries)
- [ ] Sicherheit geprüft (XSS, CSRF)
- [ ] Git-History sauber (gute Commit-Messages)
- [ ] README aktualisiert (falls neues Modul)
- [ ] Keine Breaking Changes (oder dokumentiert)

---

## 📞 Support & Fragen

**Fragen zu Standards?** → GitHub Issues

**Hast du eine bessere Idee?** → Pull Request mit `docs/` Label

Vielen Dank für die Einhaltung dieser Standards! 💙

