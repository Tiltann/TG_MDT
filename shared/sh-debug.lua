-- ============================================================
--  TG_MDT | shared/sh-debug.lua
--  Structured logging utility.
--  Exposes a global `Debug` table loaded by every context.
--
--  Levels:
--    Debug.info      – debug only, normal flow
--    Debug.warn      – always printed, something is off
--    Debug.error     – always printed, something broke
--    Debug.debug     – opt-in verbose output
--    Debug.sensitive – separate opt-in, never in prod
--
--  Enable via config or convar:
--    Config.Debug = true
--    Config.Debug = { enabled = true, sensitive = false }
--    set debug_tg_mdt 1            (server.cfg)
--    set debug_tg_mdt_sensitive 1  (server.cfg)
-- ============================================================

local RESOURCE = GetCurrentResourceName()
local PREFIX   = ('[TG][%s]'):format(RESOURCE)

-- ── helper: resolve a convar bool ──────────────────────────
local function getConvar(name)
    return GetConvar(name, '0') == '1'
end

-- ── resolve debug flags ────────────────────────────────────
local function resolveFlags()
    local debug_on     = false
    local sensitive_on = false

    -- check Config.Debug (set in config/config.lua or similar)
    if type(Config) == 'table' and Config.Debug ~= nil then
        local d = Config.Debug
        if type(d) == 'boolean' then
            debug_on = d
        elseif type(d) == 'table' then
            debug_on     = d.enabled or d.default or d.debug or false
            sensitive_on = d.sensitive or d.sensitive_information or false
        end
    end

    -- convar fallback / override
    if not debug_on then
        debug_on = getConvar(('debug_%s'):format(RESOURCE))
    end
    if not sensitive_on then
        sensitive_on = getConvar(('debug_%s_sensitive'):format(RESOURCE))
    end

    return debug_on, sensitive_on
end

-- ── core print ────────────────────────────────────────────
local function log(level, color, ...)
    local parts = {}
    for i = 1, select('#', ...) do
        local v = select(i, ...)
        parts[#parts + 1] = type(v) == 'table' and json.encode(v) or tostring(v)
    end
    print(('^%d%s[%s]^7 %s'):format(color, PREFIX, level, table.concat(parts, ' ')))
end

-- ── public API ────────────────────────────────────────────
Debug = {}

--- Debug-only. Use for startup messages and normal state changes.
---@param ... any
function Debug.info(...)
    local enabled, _ = resolveFlags()
    if not enabled then return end
    log('INFO', 6, ...)
end

--- Always visible. Use when something optional is missing or degraded.
---@param ... any
function Debug.warn(...)
    log('WARN', 3, ...)
end

--- Always visible. Use when something is broken and affects features.
---@param ... any
function Debug.error(...)
    log('ERROR', 1, ...)
end

--- Opt-in. Verbose internals, raw data dumps.
---@param ... any
function Debug.debug(...)
    local enabled, _ = resolveFlags()
    if not enabled then return end
    log('DEBUG', 5, ...)
end

--- Separate opt-in. IDs, payloads — dev only, never in production.
---@param ... any
function Debug.sensitive(...)
    local _, sensitive = resolveFlags()
    if not sensitive then return end
    log('SENSITIVE', 4, ...)
end
