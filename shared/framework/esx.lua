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
        if not player then
            return nil
        end

        if type(player.identifier) == 'string' and player.identifier ~= '' then
            return player.identifier
        end

        if type(player.getIdentifier) == 'function' then
            local ok, identifier = pcall(function()
                return player.getIdentifier()
            end)
            if ok and type(identifier) == 'string' and identifier ~= '' then
                return identifier
            end
        end

        return nil
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
        if not player then
            return nil
        end

        if type(player.job) == 'table' and type(player.job.name) == 'string' and player.job.name ~= '' then
            return player.job.name
        end

        if type(player.getJob) == 'function' then
            local ok, job = pcall(function()
                return player.getJob()
            end)
            if ok and type(job) == 'table' and type(job.name) == 'string' and job.name ~= '' then
                return job.name
            end
        end

        return nil
    end

    --- Get normalized job details.
    ---@param src number
    ---@return table
    function Framework.Server.getJobData(src)
        local player = ESX.GetPlayerFromId(src)
        if not player then
            return {}
        end

        local job = nil

        if type(player.job) == 'table' then
            job = player.job
        elseif type(player.getJob) == 'function' then
            local ok, resolved = pcall(function()
                return player.getJob()
            end)
            if ok and type(resolved) == 'table' then
                job = resolved
            end
        end

        if type(job) ~= 'table' then
            return {}
        end

        return {
            name = job.name,
            grade = job.grade,
            grade_name = job.grade_name,
            onduty = job.onDuty ~= false,
        }
    end

    --- Persist a custom duty flag for the player (xPlayer.set/get storage).
    ---@param src number
    ---@param key string
    ---@param value any
    ---@return boolean
    function Framework.Server.setPlayerState(src, key, value)
        local player = ESX.GetPlayerFromId(src)
        if not player or type(player.set) ~= 'function' then
            return false
        end

        local ok = pcall(function()
            player.set(key, value)
        end)

        return ok
    end

    --- Read a custom state value from xPlayer.get.
    ---@param src number
    ---@param key string
    ---@return any
    function Framework.Server.getPlayerState(src, key)
        local player = ESX.GetPlayerFromId(src)
        if not player or type(player.get) ~= 'function' then
            return nil
        end

        local ok, value = pcall(function()
            return player.get(key)
        end)

        return ok and value or nil
    end

    --- Set job while preserving compatibility across ESX versions.
    ---@param src number
    ---@param name string
    ---@param grade number|string|nil
    ---@param onDuty boolean|nil
    ---@return boolean
    function Framework.Server.setJob(src, name, grade, onDuty)
        local player = ESX.GetPlayerFromId(src)
        if not player or type(player.setJob) ~= 'function' then
            return false
        end

        local ok = pcall(function()
            player.setJob(name, grade or 0)
        end)

        if onDuty ~= nil then
            pcall(function()
                player.setJob(name, grade or 0, onDuty)
            end)

            if type(player.job) == 'table' then
                player.job.onDuty = onDuty
            end
        end

        return ok
    end

-- ── client ────────────────────────────────────────────────
else
    local ESX = nil

    CreateThread(function()
        -- Attempt modern export first
        local status = GetResourceState('es_extended')
        if status == 'started' or status == 'starting' then
            pcall(function() ESX = exports['es_extended']:getSharedObject() end)
        end

        -- Fallback to legacy event
        while ESX == nil do
            TriggerEvent('esx:getSharedObject', function(obj) ESX = obj end)
            Wait(100)
        end
    end)

    local PlayerData = {}

    RegisterNetEvent('esx:playerLoaded')
    AddEventHandler('esx:playerLoaded', function(xPlayer)
        PlayerData = xPlayer
    end)

    RegisterNetEvent('esx:setJob')
    AddEventHandler('esx:setJob', function(job)
        PlayerData.job = job
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
        if not ESX then return PlayerData end
        
        local data = nil
        if type(ESX.GetPlayerData) == 'function' then
            pcall(function() data = ESX.GetPlayerData() end)
        end
        
        if data and data.job then
            PlayerData = data
        elseif ESX.PlayerData and ESX.PlayerData.job then
            PlayerData = ESX.PlayerData
        end

        return PlayerData
    end

    --- Get the local player's job.
    ---@return table|nil
    function Framework.Client.getJob()
        local data = Framework.Client.getPlayerData()
        return data and data.job or nil
    end

    --- Get the local player's duty flag.
    ---@return boolean
    function Framework.Client.getDuty()
        local job = Framework.Client.getJob()
        if type(job) == 'table' and job.onDuty ~= nil then
            return job.onDuty == true
        end
        return true
    end
end
