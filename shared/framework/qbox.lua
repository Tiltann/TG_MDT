-- ============================================================
--  TG_MDT | shared/framework/qbox.lua
--  Qbox (qbx_core) bridge — loaded when Framework.name == 'qbox'
-- ============================================================

if Framework.name ~= 'qbox' then return end

-- ── server ────────────────────────────────────────────────
if IsDuplicityVersion() then
    Framework.Server = {}

    --- Get Qbox player object by server id.
    ---@param src number
    ---@return table|nil
    function Framework.Server.getPlayer(src)
        return exports.qbx_core:GetPlayer(src)
    end

    --- Get all online players.
    ---@return table
    function Framework.Server.getPlayers()
        return exports.qbx_core:GetPlayers()
    end

    --- Get player identifier (citizenid).
    ---@param src number
    ---@return string|nil
    function Framework.Server.getIdentifier(src)
        local player = exports.qbx_core:GetPlayer(src)
        return player and player.PlayerData.citizenid or nil
    end

    --- Send a notification to a player.
    ---@param src number
    ---@param msg string
    ---@param type string
    function Framework.Server.notify(src, msg, type)
        TriggerClientEvent('ox_lib:notify', src, { description = msg, type = type or 'inform' })
    end

    --- Get player job name.
    ---@param src number
    ---@return string|nil
    function Framework.Server.getJob(src)
        local player = exports.qbx_core:GetPlayer(src)
        return player and player.PlayerData.job.name or nil
    end

-- ── client ────────────────────────────────────────────────
else
    Framework.Client = {}

    --- Send a local notification.
    ---@param msg string
    ---@param type string
    function Framework.Client.notify(msg, type)
        lib.notify({ description = msg, type = type or 'inform' })
    end

    --- Get the local player's data.
    ---@return table|nil
    function Framework.Client.getPlayerData()
        return exports.qbx_core:GetPlayerData()
    end

    --- Get the local player's job.
    ---@return table|nil
    function Framework.Client.getJob()
        local data = Framework.Client.getPlayerData()
        return data and data.job or nil
    end
end
