-- ============================================================
--  TG_MDT | shared/framework/esx.lua
--  ESX bridge — loaded when Framework.name == 'esx'
-- ============================================================

if Framework.name ~= 'esx' then return end

-- ── server ────────────────────────────────────────────────
if IsDuplicityVersion() then
    local ESX = exports['es_extended']:getSharedObject()

    Framework.Server = {}

    --- Get ESX player object by server id.
    ---@param src number
    ---@return table|nil
    function Framework.Server.getPlayer(src)
        return ESX.GetPlayerFromId(src)
    end

    --- Get all online players.
    ---@return table
    function Framework.Server.getPlayers()
        return ESX.GetPlayers()
    end

    --- Get player identifier (license by default).
    ---@param src number
    ---@return string|nil
    function Framework.Server.getIdentifier(src)
        local player = ESX.GetPlayerFromId(src)
        return player and player.identifier or nil
    end

    --- Send a notification to a player.
    ---@param src number
    ---@param msg string
    ---@param type string 'success' | 'error' | 'info'
    function Framework.Server.notify(src, msg, type)
        TriggerClientEvent('ox_lib:notify', src, { description = msg, type = type or 'inform' })
    end

    --- Get player job name.
    ---@param src number
    ---@return string|nil
    function Framework.Server.getJob(src)
        local player = ESX.GetPlayerFromId(src)
        return player and player.job.name or nil
    end

-- ── client ────────────────────────────────────────────────
else
    local ESX = nil
    CreateThread(function()
        while ESX == nil do
            TriggerEvent('esx:getSharedObject', function(obj) ESX = obj end)
            if ESX == nil then Wait(100) end
        end
    end)

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
        return ESX and ESX.GetPlayerData() or nil
    end

    --- Get the local player's job.
    ---@return table|nil
    function Framework.Client.getJob()
        local data = Framework.Client.getPlayerData()
        return data and data.job or nil
    end
end
