-- ============================================================
--  TG_MDT | config/logs.lua
--  Logging configuration for Fivemanage and Discord webhooks.
--  Edit values here — do not touch feature code for tuning.
-- ============================================================

Config = Config or {}

-- ── Logging System ────────────────────────────────────────
-- Configure which logs to send and where.
-- 
-- fivemanage_token: Your Fivemanage API token (get from fivemanage.com)
-- discord_webhook:  Single Discord webhook URL for all logs
--
-- For each log type:
--   enabled     = true/false  → Enable/disable this log type completely
--   fivemanage  = true/false  → Send to Fivemanage (requires token)
--   discord     = true/false  → Send to Discord (requires webhook)

Config.Logs = {
    fivemanage_token = '',
    discord_webhook = '',

    types = {
        mdt_actions = {
            enabled = true,
            fivemanage = false,
            discord = false,
        },

        player_actions = {
            enabled = true,
            fivemanage = false,
            discord = false,
        },

        vehicle_actions = {
            enabled = true,
            fivemanage = false,
            discord = false,
        },

        evidence = {
            enabled = true,
            fivemanage = false,
            discord = false,
        },

        admin_actions = {
            enabled = true,
            fivemanage = false,
            discord = true,
        },
    },
}
