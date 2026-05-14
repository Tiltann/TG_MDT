-- ============================================================
--  TG_MDT | config/logs.lua
--  Logging configuration for Fivemanage and Discord webhooks.
--  Edit values here — do not touch feature code for tuning.
-- ============================================================

Config = Config or {}

-- ── Logging System ────────────────────────────────────────

Config.Logs = {
    -- Enable or disable Fivemanage logging
    -- true  = send logs to Fivemanage
    -- false = disable Fivemanage logging
    use_fivemanage = false,

    -- Enable or disable Discord webhook logging
    -- true  = send logs to Discord webhooks
    -- false = disable Discord webhook logging
    use_discord = false,

    -- Fivemanage API token (get from fivemanage.com)
    -- Only used server-side, never exposed to client
    fivemanage_token = '',

    -- Discord webhook URLs per log type
    -- Only used server-side, never exposed to client
    discord_webhooks = {
        -- General MDT actions
        mdt_actions = '',

        -- Player-related logs
        player_actions = '',

        -- Vehicle-related logs
        vehicle_actions = '',

        -- Evidence and report logs
        evidence = '',

        -- Administrative actions
        admin_actions = '',
    },
}
