-- ============================================================
--  TG_MDT | server/sv-logs.lua
--  Server-side logging system for Fivemanage and Discord webhooks.
--  Handles all log dispatching based on config toggles.
-- ============================================================

local RESOURCE_NAME = GetCurrentResourceName()

-- ── Fivemanage Logging ────────────────────────────────────

--- Sends a log to Fivemanage.
---@param log_type string The type of log (e.g., 'mdt_action', 'player_action').
---@param data table The log data to send.
local function sendToFivemanage(log_type, data)
    if not Config.Logs.use_fivemanage then return end
    if not Config.Logs.fivemanage_token or Config.Logs.fivemanage_token == '' then
        Debug.warn('Fivemanage logging enabled but no token configured')
        return
    end

end

-- ── Discord Webhook Logging ───────────────────────────────

--- Sends a log to Discord webhook.
---@param webhook_type string The webhook type from config (e.g., 'mdt_actions').
---@param embed table The Discord embed data.
local function sendToDiscord(webhook_type, embed)
    if not Config.Logs.use_discord then return end
    if not Config.Logs.discord_webhooks[webhook_type] or Config.Logs.discord_webhooks[webhook_type] == '' then
        Debug.warn(('Discord webhook for %s not configured'):format(webhook_type))
        return
    end

end

-- ── Public Logging Functions ──────────────────────────────

--- Logs an MDT action.
---@param player_id number The player server id.
---@param action string The action performed.
---@param details table Additional details about the action.
local function logMDTAction(player_id, action, details)
    if not Config.Logs.use_fivemanage and not Config.Logs.use_discord then return end

end

--- Logs a player-related action.
---@param officer_id number The officer server id.
---@param target_id number The target player server id.
---@param action string The action performed.
---@param details table Additional details about the action.
local function logPlayerAction(officer_id, target_id, action, details)
    if not Config.Logs.use_fivemanage and not Config.Logs.use_discord then return end

end

--- Logs a vehicle-related action.
---@param player_id number The player server id.
---@param action string The action performed.
---@param vehicle_data table Vehicle information.
---@param details table Additional details about the action.
local function logVehicleAction(player_id, action, vehicle_data, details)
    if not Config.Logs.use_fivemanage and not Config.Logs.use_discord then return end

end

--- Logs an evidence-related action.
---@param player_id number The player server id.
---@param action string The action performed.
---@param evidence_data table Evidence information.
local function logEvidence(player_id, action, evidence_data)
    if not Config.Logs.use_fivemanage and not Config.Logs.use_discord then return end

end

--- Logs an administrative action.
---@param admin_id number The admin server id.
---@param action string The action performed.
---@param details table Additional details about the action.
local function logAdminAction(admin_id, action, details)
    if not Config.Logs.use_fivemanage and not Config.Logs.use_discord then return end

end

-- ── Exports ───────────────────────────────────────────────

exports('LogMDTAction', logMDTAction)
exports('LogPlayerAction', logPlayerAction)
exports('LogVehicleAction', logVehicleAction)
exports('LogEvidence', logEvidence)
exports('LogAdminAction', logAdminAction)
