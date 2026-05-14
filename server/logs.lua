-- ============================================================
--  TG_MDT | server/sv-logs.lua
--  Server-side logging system for Fivemanage and Discord webhooks.
--  Handles all log dispatching based on config toggles.
-- ============================================================

local RESOURCE_NAME = GetCurrentResourceName()

local EVENT_LOG_MDT_ACTION     = 'tg_mdt:internal:logMDTAction'
local EVENT_LOG_PLAYER_ACTION  = 'tg_mdt:internal:logPlayerAction'
local EVENT_LOG_VEHICLE_ACTION = 'tg_mdt:internal:logVehicleAction'
local EVENT_LOG_EVIDENCE       = 'tg_mdt:internal:logEvidence'
local EVENT_LOG_ADMIN_ACTION   = 'tg_mdt:internal:logAdminAction'

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

-- ── Event Handlers ────────────────────────────────────────

--- Handles MDT action logging event.
---@param player_id number The player server id.
---@param action string The action performed.
---@param details table Additional details about the action.
AddEventHandler(EVENT_LOG_MDT_ACTION, function(player_id, action, details)
    logMDTAction(player_id, action, details)
end)

--- Handles player action logging event.
---@param officer_id number The officer server id.
---@param target_id number The target player server id.
---@param action string The action performed.
---@param details table Additional details about the action.
AddEventHandler(EVENT_LOG_PLAYER_ACTION, function(officer_id, target_id, action, details)
    logPlayerAction(officer_id, target_id, action, details)
end)

--- Handles vehicle action logging event.
---@param player_id number The player server id.
---@param action string The action performed.
---@param vehicle_data table Vehicle information.
---@param details table Additional details about the action.
AddEventHandler(EVENT_LOG_VEHICLE_ACTION, function(player_id, action, vehicle_data, details)
    logVehicleAction(player_id, action, vehicle_data, details)
end)

--- Handles evidence logging event.
---@param player_id number The player server id.
---@param action string The action performed.
---@param evidence_data table Evidence information.
AddEventHandler(EVENT_LOG_EVIDENCE, function(player_id, action, evidence_data)
    logEvidence(player_id, action, evidence_data)
end)

--- Handles admin action logging event.
---@param admin_id number The admin server id.
---@param action string The action performed.
---@param details table Additional details about the action.
AddEventHandler(EVENT_LOG_ADMIN_ACTION, function(admin_id, action, details)
    logAdminAction(admin_id, action, details)
end)
