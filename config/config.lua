-- ============================================================
--  TG_MDT | config/config.lua
--  Main resource configuration.
--  Edit values here — do not touch feature code for tuning.
-- ============================================================

Config = Config or {}

-- ── General ───────────────────────────────────────────────

Config.Locale = 'en'                  -- locale file to load from locales/

-- ── Debug ─────────────────────────────────────────────────
-- true         = enable debug output
-- false        = disable (default for prod)
-- table        = granular control (see debug.lua)

Config.Debug = {
    enabled   = false,
    sensitive = false,
}

-- ── MDT ───────────────────────────────────────────────────

Config.MDT = {
    -- Jobs that are allowed to access the MDT tablet.
    allowed_jobs = {
        'police',
        'sheriff',
        'fbi',
    },

    -- Default screen opened by the tablet module.
    default_screen = 'tablet',

    -- If true, players without allowed jobs will get a notify.
    notify_on_denied = true,

    -- How long (ms) the MDT open/close animation takes.
    animation_duration = 300,
}

-- ── BOLO / Warrants ───────────────────────────────────────

-- Config.BOLO = {
--     -- Maximum active BOLOs stored per officer
--     max_per_officer = 5,

--     -- Auto-expire BOLOs after this many hours (0 = never)
--     expire_hours = 72,
-- }
