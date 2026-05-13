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