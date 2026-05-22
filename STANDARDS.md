# TG_MDT — Coding Standards

All contributions must follow these standards. No exceptions.

---

## Table of Contents

1. [General Principles](#general-principles)
2. [Project Structure](#project-structure)
3. [Naming Conventions](#naming-conventions)
4. [File Naming](#file-naming)
5. [Constants](#constants)
6. [Documentation & Comments](#documentation--comments)
7. [Events](#events)
8. [Exports](#exports)
9. [Communication](#communication)
10. [Framework Bridge](#framework-bridge)
11. [ox_lib](#ox_lib)
12. [Debug Library](#debug-library)
13. [Server Validation](#server-validation)
14. [SQL](#sql)
15. [fxmanifest](#fxmanifest)
16. [Git & Versioning](#git--versioning)
17. [Frontend (Next.js / NUI)](#frontend-nextjs--nui)

---

## General Principles

- **Clarity over cleverness.** Write code that the next person can read without context.
- **Single responsibility.** Functions and files do one thing.
- **Server/client separation.** Server logic in `server/`, client logic in `client/`, shared in `shared/`.
- **Never trust the client.** Always validate server-side: type, entity, distance, ownership, state.
- **Use bridges and abstractions.** Never call ESX/QBCore/Qbox APIs directly in feature code.

---

## Project Structure

```
TG_MDT/
├── config/                    # All editable config (loaded first)
│   ├── config.lua             # Main settings (jobs, distances, toggles)
│   └── commands.lua           # Command names and keybinds
├── client/                    # Client-side Lua (`cl-*.lua`)
├── server/                    # Server-side Lua (`sv-*.lua`)
│   └── sv-sql.lua             # OxMySQL wrapper
├── shared/                    # Shared Lua (constants, exports)
│   ├── sh-debug.lua           # Structured logging
│   └── framework/             # Framework bridge
│       ├── sh-init.lua        # Detection + Framework.name
│       ├── sh-esx.lua
│       ├── sh-qbcore.lua
│       ├── sh-qbox.lua
│       └── sh-standalone.lua
├── locales/                   # ox_lib locale files
├── web/                       # Next.js NUI app
│   └── dist/                  # Build output — served by FiveM
└── fxmanifest.lua
```

---

## Naming Conventions

| Type | Case |
|------|------|
| Local variables | `snake_case` |
| Local functions | `camelCase` |
| File-local constants | `UPPER_SNAKE_CASE` |
| Module/global tables | `PascalCase` |
| Exported functions | `PascalCase` |
| Event names | `resource:context:action` |
| File names | `kebab-case` |
| JSON/config keys | `snake_case` |
| Convars / command names | `lowercase_with_separators` |

### Variables

Use `snake_case`. Be specific, use singular/plural correctly.

```lua
-- good
local player_id = ...
local vehicle_net_id = ...
local allowed_class_lookup = {}

-- bad
local tmp = ...
local data2 = ...
local x = ...
```

### Functions

- `camelCase` for private/local helpers — verb-first.
- `PascalCase` for public/exported functions — stable and descriptive.

```lua
-- private
local function isAllowedVehicleClass(vehicle) end
local function getVehicleOwner(vehicle) end

-- exported
exports('GetBalance', function(src) end)
exports('HasPermission', function(src, perm) end)
```

### Tables & Modules

Use `PascalCase` noun-based names.

```lua
Framework = {}
Config = {}
Editable = {}
```

### Booleans

Prefix with `is`, `has`, `can`, `should`, or `was`.

```lua
local is_player_dead = ...
local has_license = ...
```

### Constants

Use `UPPER_SNAKE_CASE`. Define at top of file.

```lua
local MAX_DISTANCE = 5.0
local DEFAULT_DURATION_MS = 3000
local EVENT_PLAYER_JOINED = 'tg_mdt:player:joined'
```

---

## Config

All editable values live in `config/`. Feature code reads from `Config` — it never hardcodes values.

- `config/config.lua` — main settings: jobs, distances, timers, feature flags.
- `config/commands.lua` — command names and keybinds.
- Never put logic in config files. Only data: strings, numbers, booleans, tables.
- `Config` is a global table. All files extend it with `Config = Config or {}`.
- Keep keys in `snake_case`.
- Add a comment above every value explaining what it does and what unit it uses.

```lua
Config = Config or {}

Config.MDT = {
    allowed_jobs         = { 'police', 'sheriff' },
    plate_check_distance = 10.0,   -- metres
    animation_duration   = 300,    -- ms
}

Config.Debug = {
    enabled   = false,
    sensitive = false,
}
```

Load order in `fxmanifest.lua`: `config/*.lua` must come before `shared/*.lua`.

---

## File Naming

- Lowercase only, `kebab-case`, no spaces.
- Prefix by context:
  - `cl-*.lua` — client only
  - `sv-*.lua` — server only
  - `sh-*.lua` — shared

```
config/config.lua
config/commands.lua
client/cl-vehicles.lua
server/sv-paychecks.lua
shared/sh-config.lua
```

---

## Constants

All event, callback, and convar names must be defined as constants at the top of each file.

```lua
local EVENT_PLAYER_JOINED   = 'tg_mdt:player:joined'
local CALLBACK_GET_DATA     = 'tg_mdt:callback:getData'
local MAX_DISTANCE          = 5.0
```

---

## Documentation & Comments

Every non-trivial function and every event handler must have an EmmyLua doc comment.

```lua
--- Checks whether a vehicle belongs to an allowed class list.
---@param vehicle number Vehicle entity id.
---@return boolean is_allowed True if vehicle class is allowed.
local function isAllowedVehicleClass(vehicle)
    if not next(allowedClassLookup) then return true end
    return allowedClassLookup[GetVehicleClass(vehicle)] == true
end

--- Handles player join event.
---@param player number Player server id.
RegisterNetEvent(EVENT_PLAYER_JOINED, function(player)
    -- ...
end)
```

Use inline markers for intent:

```lua
-- TODO:  unfinished or planned work
-- NOTE:  important explanation
-- HACK:  temporary or dirty solution
```

---

## Events

Events are fire-and-forget signals — not function calls.

**Use events when:**
- Broadcasting an action or state change.
- Communicating between client and server.
- Decoupling modules (producer does not need to know the consumer).

**Use exports instead when:**
- You need a return value.
- The call is local and tightly coupled.

### Naming

Format: `resource:context:action`

```
tg_mdt:server:vehicleStored
tg_mdt:client:openMenu
tg_mdt:internal:itemAdded
```

Use `internal` for in-resource events that do not cross the network.

### Rules

- Define handlers inline when registering.
- Use `RegisterNetEvent` for networked handlers.
- Use `AddEventHandler` for local/internal handlers.
- Never expose local-only events as net events.
- Keep payloads minimal and explicit.
- Always validate client-sent payloads on the server.

```lua
RegisterNetEvent('tg_mdt:server:addItem', function(item_name, amount)
    local source = source
    if type(item_name) ~= 'string' or type(amount) ~= 'number' then return end
    -- ...
end)
```

---

## Exports

Use exports for function-like APIs called from other resources.

- Register exports in code, not in `fxmanifest.lua`.
- Keep registrations in `shared/exports.lua`.
- Use `PascalCase` names.

```lua
exports('GetPlayerData', function(player_id)
    -- ...
end)

exports('HasPermission', function(player_id, permission)
    -- ...
end)
```

---

## Communication

| Need | Use |
|------|-----|
| Signal / state change | Event |
| Return value / sync call | Export |

Patterns:

```lua
-- Client → Server
TriggerServerEvent(EVENT_NAME, ...)

-- Server → Client
TriggerClientEvent(EVENT_NAME, player_id, ...)

-- Local / internal
TriggerEvent(EVENT_NAME, ...)
```

All event names must be constants defined at the top of each file.

---

## Framework Bridge

Never call ESX, QBCore, or Qbox APIs directly in feature code. Always go through the bridge.

Bridge lives in `shared/framework/` — auto-loaded by fxmanifest.

Detection order: `esx → qbox → qbcore → standalone`

```lua
-- good
Framework.Server.notify(source, 'message', 'success')
Framework.Client.notify('message', 'error')

-- bad
ESX.ShowNotification('message')
QBCore.Functions.Notify('message')
```

For notifications: use `Framework.Client.notify` / `Framework.Server.notify`. If unavailable, fall back to `lib.notify` from ox_lib.

### Citizen Aliases

Prefer aliases over `Citizen.` prefix:

```lua
CreateThread(function() end)   -- not Citizen.CreateThread
Wait(1000)                      -- not Citizen.Wait
SetTimeout(1000, cb)            -- not Citizen.SetTimeout
```

---

## ox_lib

- Init in `shared_scripts` with `@ox_lib/init.lua` — must come first.
- Put locale files in `locales/`, list them in `fxmanifest.lua`.
- Use ox_lib for UI, notifications, dialogs, progress bars, and locale.
- Prefer lib helpers over custom implementations.

---

## Debug Library

`shared/sh-debug.lua` — structured logging for all TG resources.

| Level | Always visible | Use for |
|-------|---------------|---------|
| `info` | yes | Startup messages, state changes |
| `warn` | yes | Missing optional config, degraded function |
| `error` | yes | Failures that break features |
| `debug` | opt-in | Verbose internals, raw data |
| `sensitive` | separate opt-in | IDs, payloads — dev only |

Output format: `[TG][resource-name][LEVEL] message`

### Usage

```lua
Debug.info('Resource started')
Debug.warn('Missing config value, using default')
Debug.error('Failed to load player data')
Debug.debug('Raw payload', payload)
Debug.sensitive('Player identifiers', ids)
```

---

## Server Validation

Never trust client input. Always validate on the server.

```lua
RegisterNetEvent('tg_mdt:server:sellVehicle', function(vehicle_net_id)
    local src = source

    -- type check
    if type(vehicle_net_id) ~= 'number' then return end

    -- entity check
    local vehicle = NetworkGetEntityFromNetworkId(vehicle_net_id)
    if not DoesEntityExist(vehicle) then return end

    -- ownership check
    if GetEntityOwner(vehicle) ~= src then return end

    -- distance check
    local ped = GetPlayerPed(src)
    if #(GetEntityCoords(ped) - GetEntityCoords(vehicle)) > 5.0 then return end

    -- ...
end)
```

---

## SQL

Use `server/sv-sql.lua` — the OxMySQL wrapper. Never make direct DB calls in feature code.

```lua
-- Select multiple rows
local rows = SQL.query('SELECT * FROM users WHERE job = ?', { job })

-- Select one row
local player = SQL.single('SELECT * FROM users WHERE id = ?', { player_id })

-- Select one value
local count = SQL.scalar('SELECT COUNT(*) FROM users WHERE job = ?', { job })

-- Insert
local id = SQL.insert('INSERT INTO users (name, job) VALUES (?, ?)', { name, job })

-- Update / Delete
SQL.execute('UPDATE users SET job = ? WHERE id = ?', { job, player_id })
```


---

### Pull Requests

Title format: `[Module] Short description`
Example: `[MDT] Add vehicle lookup panel`

PR description template:

```
## What changed
Short summary.

## Why
What problem does this solve?

## Checklist
- [ ] Follows coding standards
- [ ] No direct framework calls
- [ ] Server-side validation added
- [ ] Debug logging added where useful
- [ ] Screenshots (if UI change)
```

---

## Frontend (Next.js / NUI)

The NUI is a static Next.js app built to `web/dist/` and served by FiveM.


### Rules

- Keep NUI logic in `web/`. No Lua in NUI, no NUI logic in Lua.
- Use `fetchNui` for all client → NUI communication.
- Use `useNuiEvent` for all NUI → receives from client.
- TypeScript only — no plain `.js` files.
- Use Tailwind for styling. No inline styles.
