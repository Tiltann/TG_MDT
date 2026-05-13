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

-- Config.MDT = {
--     -- Jobs that are allowed to access the MDT
--     allowed_jobs = {
--         'police',
--         'sheriff',
--         'fbi',
--     },

--     -- Distance (metres) within which a player can run a plate check on a vehicle
--     plate_check_distance = 10.0,

--     -- How long (ms) the MDT open/close animation takes
--     animation_duration = 300,
-- }

-- ── BOLO / Warrants ───────────────────────────────────────

-- Config.BOLO = {
--     -- Maximum active BOLOs stored per officer
--     max_per_officer = 5,

--     -- Auto-expire BOLOs after this many hours (0 = never)
--     expire_hours = 72,
-- }
