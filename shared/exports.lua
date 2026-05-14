-- ============================================================
--  TG_MDT | shared/exports.lua
--  Public API exports for other resources.
--  
--  All exports are PascalCase and registered here.
-- ============================================================

-- ────────────────────────────────────────────────────────
--  Server-side exports (Framework wrappers)
-- ────────────────────────────────────────────────────────

if IsDuplicityVersion() then

    --- Get a player object by server id.
    ---@param src number Player server id
    ---@return table|nil
    exports('GetPlayer', function(src)
        if not src or type(src) ~= 'number' then return nil end
        return Framework.Server.getPlayer(src)
    end)

    --- Get all online players.
    ---@return table
    exports('GetPlayers', function()
        return Framework.Server.getPlayers() or {}
    end)

    --- Get player identifier (license/citizenid).
    ---@param src number Player server id
    ---@return string|nil
    exports('GetPlayerIdentifier', function(src)
        if not src or type(src) ~= 'number' then return nil end
        return Framework.Server.getIdentifier(src)
    end)

    --- Get player job name.
    ---@param src number Player server id
    ---@return string|nil
    exports('GetPlayerJob', function(src)
        if not src or type(src) ~= 'number' then return nil end
        return Framework.Server.getJob(src)
    end)

    --- Send a notification to a player.
    ---@param src number Player server id
    ---@param msg string Message text
    ---@param type string Notification type ('success', 'error', 'info')
    exports('Notify', function(src, msg, type)
        if not src or type(src) ~= 'number' then return end
        if not msg or type(msg) ~= 'string' then return end
        type = type or 'info'
        Framework.Server.notify(src, msg, type)
    end)

    --- Log an MDT action.
    ---@param player_id number The player server id
    ---@param action string The action performed
    ---@param details table Additional details about the action
    exports('LogMDTAction', function(player_id, action, details)
        if not player_id or type(player_id) ~= 'number' then return end
        if not action or type(action) ~= 'string' then return end
        details = details or {}
        TriggerEvent('tg_mdt:internal:logMDTAction', player_id, action, details)
    end)

    --- Log a player-related action.
    ---@param officer_id number The officer server id
    ---@param target_id number The target player server id
    ---@param action string The action performed
    ---@param details table Additional details about the action
    exports('LogPlayerAction', function(officer_id, target_id, action, details)
        if not officer_id or type(officer_id) ~= 'number' then return end
        if not target_id or type(target_id) ~= 'number' then return end
        if not action or type(action) ~= 'string' then return end
        details = details or {}
        TriggerEvent('tg_mdt:internal:logPlayerAction', officer_id, target_id, action, details)
    end)

    --- Log a vehicle-related action.
    ---@param player_id number The player server id
    ---@param action string The action performed
    ---@param vehicle_data table Vehicle information
    ---@param details table Additional details about the action
    exports('LogVehicleAction', function(player_id, action, vehicle_data, details)
        if not player_id or type(player_id) ~= 'number' then return end
        if not action or type(action) ~= 'string' then return end
        vehicle_data = vehicle_data or {}
        details = details or {}
        TriggerEvent('tg_mdt:internal:logVehicleAction', player_id, action, vehicle_data, details)
    end)

    --- Log an evidence-related action.
    ---@param player_id number The player server id
    ---@param action string The action performed
    ---@param evidence_data table Evidence information
    exports('LogEvidence', function(player_id, action, evidence_data)
        if not player_id or type(player_id) ~= 'number' then return end
        if not action or type(action) ~= 'string' then return end
        evidence_data = evidence_data or {}
        TriggerEvent('tg_mdt:internal:logEvidence', player_id, action, evidence_data)
    end)

    --- Log an administrative action.
    ---@param admin_id number The admin server id
    ---@param action string The action performed
    ---@param details table Additional details about the action
    exports('LogAdminAction', function(admin_id, action, details)
        if not admin_id or type(admin_id) ~= 'number' then return end
        if not action or type(action) ~= 'string' then return end
        details = details or {}
        TriggerEvent('tg_mdt:internal:logAdminAction', admin_id, action, details)
    end)

-- ────────────────────────────────────────────────────────
--  Client-side exports (Framework wrappers)
-- ────────────────────────────────────────────────────────

else

    --- Get the local player's data.
    ---@return table|nil
    exports('GetPlayerData', function()
        return Framework.Client.getPlayerData()
    end)

    --- Get the local player's job.
    ---@return table|nil
    exports('GetPlayerJob', function()
        return Framework.Client.getJob()
    end)

    --- Send a local notification.
    ---@param msg string Message text
    ---@param type string Notification type ('success', 'error', 'info')
    exports('Notify', function(msg, type)
        if not msg or type(msg) ~= 'string' then return end
        type = type or 'info'
        Framework.Client.notify(msg, type)
    end)
end