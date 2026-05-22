-- ============================================================
--  TG_MDT | shared/framework/sh-esx.lua
--  ESX bridge — loaded when Framework.name == 'esx'
-- ============================================================

if Framework.name ~= 'esx' then return end

local EVENT_OX_NOTIFY = 'ox_lib:notify'
local EVENT_ESX_PLAYER_LOADED = 'esx:playerLoaded'
local EVENT_ESX_SET_JOB = 'esx:setJob'
local ESX = nil

local function logEsxExportMissing(context)
    local message = table.concat({
        '[TG_MDT] ESX export missing on ' .. context .. '.',
        'TG_MDT requires export-only ESX integration (legacy event esx:getSharedObject is NOT supported).',
        'Fix checklist:',
        '1) Ensure your folder name is exactly: es_extended',
        '   Example path: resources/[framework]/es_extended',
        '2) Ensure server.cfg starts that exact resource name:',
        '   ensure es_extended',
        '3) Update ESX to a build that exposes exports[\'es_extended\']:getSharedObject()',
    }, '\n')

    Debug.error(message)
end

---@param context string
---@return table|nil
local function getEsxObject(context)
    local ok, value = pcall(function()
        return exports['es_extended']:getSharedObject()
    end)

    if ok and type(value) == 'table' then
        return value
    end

    logEsxExportMissing(context)
    return nil
end

---@param src number
---@param msg string
---@return boolean
local function notifyEsx(src, msg)
    if not ESX or type(ESX.GetPlayerFromId) ~= 'function' then
        return false
    end

    local player = ESX.GetPlayerFromId(src)
    if not player then
        return false
    end

    if type(player.showNotification) == 'function' then
        local ok = pcall(function()
            player.showNotification(msg)
        end)

        if ok then
            return true
        end
    end

    if type(player.triggerEvent) == 'function' then
        local ok = pcall(function()
            player.triggerEvent('esx:showNotification', msg)
        end)

        if ok then
            return true
        end
    end

    return false
end

-- ── server ────────────────────────────────────────────────
if IsDuplicityVersion() then
    ESX = getEsxObject('server')

    Framework.Server = {}

    ---@param player table|nil
    ---@return table
    local function resolveEsxJob(player)
        if type(player) ~= 'table' then
            return {}
        end

        if type(player.job) == 'table' then
            return player.job
        end

        if type(player.getJob) == 'function' then
            local ok, job = pcall(player.getJob, player)
            if ok and type(job) == 'table' then
                return job
            end

            ok, job = pcall(player.getJob)
            if ok and type(job) == 'table' then
                return job
            end
        end

        return {}
    end

    --- Get ESX player object by server id.
    ---@param src number
    ---@return table|nil
    function Framework.Server.getPlayer(src)
        if not ESX or type(ESX.GetPlayerFromId) ~= 'function' then return nil end
        return ESX.GetPlayerFromId(src)
    end

    --- Get all online players.
    ---@return table
    function Framework.Server.getPlayers()
        if not ESX or type(ESX.GetPlayers) ~= 'function' then return {} end
        return ESX.GetPlayers()
    end

    --- Get player identifier (license by default).
    ---@param src number
    ---@return string|nil
    function Framework.Server.getIdentifier(src)
        if not ESX or type(ESX.GetPlayerFromId) ~= 'function' then return nil end
        local player = ESX.GetPlayerFromId(src)
        if not player then
            return nil
        end

        if type(player.identifier) == 'string' and player.identifier ~= '' then
            return player.identifier
        end

        if type(player.getIdentifier) == 'function' then
            local ok, identifier = pcall(player.getIdentifier, player)
            if ok and type(identifier) == 'string' and identifier ~= '' then
                return identifier
            end

            ok, identifier = pcall(player.getIdentifier)
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
        if notifyEsx(src, msg) then
            return
        end

        pcall(function()
            TriggerClientEvent(EVENT_OX_NOTIFY, src, { description = msg, type = type or 'inform' })
        end)
    end

    --- Get player job name.
    ---@param src number
    ---@return string|nil
    function Framework.Server.getJob(src)
        if not ESX or type(ESX.GetPlayerFromId) ~= 'function' then return nil end
        local player = ESX.GetPlayerFromId(src)
        local job = resolveEsxJob(player)
        if type(job.name) == 'string' and job.name ~= '' then
            return job.name
        end

        return nil
    end

    --- Get normalized job details.
    ---@param src number
    ---@return table
    function Framework.Server.getJobData(src)
        if not ESX or type(ESX.GetPlayerFromId) ~= 'function' then return {} end
        local player = ESX.GetPlayerFromId(src)
        local job = resolveEsxJob(player)
        if type(job) ~= 'table' or next(job) == nil then
            return {}
        end

        return {
            name = job.name,
            grade = job.grade,
            grade_name = job.grade_name or (type(job.grade) == 'table' and (job.grade.name or job.grade.label) or nil),
            label = job.label,
            onduty = job.onDuty ~= false,
        }
    end

    --- Persist a custom duty flag for the player (xPlayer.set/get storage).
    ---@param src number
    ---@param key string
    ---@param value any
    ---@return boolean
    function Framework.Server.setPlayerState(src, key, value)
        if not ESX or type(ESX.GetPlayerFromId) ~= 'function' then return false end
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
        if not ESX or type(ESX.GetPlayerFromId) ~= 'function' then return nil end
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
        if not ESX or type(ESX.GetPlayerFromId) ~= 'function' then return false end
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
    CreateThread(function()
        local timeout_at = GetGameTimer() + 15000

        while ESX == nil and GetGameTimer() < timeout_at do
            local status = GetResourceState('es_extended')
            if status == 'started' or status == 'starting' then
                ESX = getEsxObject('client')
                if ESX ~= nil then
                    break
                end
            end

            Wait(500)
        end

        if ESX == nil then
            logEsxExportMissing('client')
        end
    end)

    local PlayerData = {}

    RegisterNetEvent(EVENT_ESX_PLAYER_LOADED)
    AddEventHandler(EVENT_ESX_PLAYER_LOADED, function(xPlayer)
        PlayerData = xPlayer
    end)

    RegisterNetEvent(EVENT_ESX_SET_JOB)
    AddEventHandler(EVENT_ESX_SET_JOB, function(job)
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
