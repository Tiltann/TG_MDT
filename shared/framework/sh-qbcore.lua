-- ============================================================
--  TG_MDT | shared/framework/sh-qbcore.lua
--  QBCore bridge — loaded dynamically when active framework is QBCore.
-- ============================================================

local Bridge = Framework.Bridges.qbcore

local EVENT_OX_NOTIFY = 'ox_lib:notify'
local QBCore = nil

local function logQbExportMissing(context)
    local message = table.concat({
        '[TG_MDT] QBCore export missing on ' .. context .. '.',
        'TG_MDT requires export-only QBCore integration.',
        'Fix checklist:',
        '1) Ensure your folder name is exactly: qb-core',
        '   Example path: resources/[framework]/qb-core',
        '2) Ensure server.cfg starts that exact resource name:',
        '   ensure qb-core',
        '3) Update QBCore to a build that exposes exports[\'qb-core\']:GetCoreObject()',
    }, '\n')

    Debug.error(message)
end

---@param context string
---@param suppressError boolean|nil
---@return table|nil
local function getQBCoreObject(context, suppressError)
    local ok, value = pcall(function()
        return exports['qb-core']:GetCoreObject()
    end)

    if ok and type(value) == 'table' then
        return value
    end

    if not suppressError then
        logQbExportMissing(context)
    end
    return nil
end

---@param src number
---@param msg string
---@param notifyType string|nil
---@return boolean
local function notifyQBCore(src, msg, notifyType)
    if not QBCore or not QBCore.Functions then
        return false
    end

    local player = nil
    if type(QBCore.Functions.GetPlayer) == 'function' then
        player = QBCore.Functions.GetPlayer(src)
    end

    if player and player.Functions and type(player.Functions.Notify) == 'function' then
        local ok = pcall(function()
            player.Functions.Notify(msg, notifyType or 'primary')
        end)

        if ok then
            return true
        end
    end

    if type(QBCore.Functions.Notify) == 'function' then
        local ok = pcall(function()
            QBCore.Functions.Notify(src, msg, notifyType or 'primary')
        end)

        if ok then
            return true
        end
    end

    return false
end

-- ── server ────────────────────────────────────────────────
if IsDuplicityVersion() then
    Bridge.Server = {}

    function Bridge.init()
        if Bridge.initialized then return end
        Bridge.initialized = true

        CreateThread(function()
            local timeout_at = GetGameTimer() + 15000

            while QBCore == nil and GetGameTimer() < timeout_at do
                local status = GetResourceState('qb-core')
                if status == 'started' or status == 'starting' then
                    QBCore = getQBCoreObject('server', true)
                    if QBCore ~= nil then
                        break
                    end
                end

                Wait(500)
            end

            if QBCore == nil then
                logQbExportMissing('server')
            end
        end)
    end

    --- Get QBCore player object by server id.
    ---@param src number
    ---@return table|nil
    function Bridge.Server.getPlayer(src)
        if not QBCore or not QBCore.Functions or type(QBCore.Functions.GetPlayer) ~= 'function' then return nil end
        return QBCore.Functions.GetPlayer(src)
    end

    --- Get all online players.
    ---@return table
    function Bridge.Server.getPlayers()
        if not QBCore or not QBCore.Functions or type(QBCore.Functions.GetPlayers) ~= 'function' then return {} end
        return QBCore.Functions.GetPlayers()
    end

    --- Get player identifier (citizenid).
    ---@param src number
    ---@return string|nil
    function Bridge.Server.getIdentifier(src)
        if not QBCore or not QBCore.Functions or type(QBCore.Functions.GetPlayer) ~= 'function' then return nil end
        local player = QBCore.Functions.GetPlayer(src)
        return player and player.PlayerData.citizenid or nil
    end

    --- Send a notification to a player.
    ---@param src number
    ---@param msg string
    ---@param type string 'success' | 'error' | 'primary'
    function Bridge.Server.notify(src, msg, type)
        if notifyQBCore(src, msg, type) then
            return
        end

        pcall(function()
            TriggerClientEvent(EVENT_OX_NOTIFY, src, { description = msg, type = type or 'inform' })
        end)
    end

    --- Get player job name.
    ---@param src number
    ---@return string|nil
    function Bridge.Server.getJob(src)
        if not QBCore or not QBCore.Functions or type(QBCore.Functions.GetPlayer) ~= 'function' then return nil end
        local player = QBCore.Functions.GetPlayer(src)
        return player and player.PlayerData.job.name or nil
    end

    --- Get normalized job details.
    ---@param src number
    ---@return table
    function Bridge.Server.getJobData(src)
        if not QBCore or not QBCore.Functions or type(QBCore.Functions.GetPlayer) ~= 'function' then return {} end
        local player = QBCore.Functions.GetPlayer(src)
        if not player or type(player.PlayerData) ~= 'table' then
            return {}
        end

        local job = player.PlayerData.job or {}
        local gradeLevel = nil
        if type(job.grade) == 'table' then
            gradeLevel = job.grade.level
        else
            gradeLevel = job.grade
        end

        return {
            name = job.name,
            grade = gradeLevel,
            grade_name = type(job.grade) == 'table' and job.grade.name or nil,
            onduty = job.onduty == true,
        }
    end

    --- Persist custom player state in metadata.
    ---@param src number
    ---@param key string
    ---@param value any
    ---@return boolean
    function Bridge.Server.setPlayerState(src, key, value)
        if not QBCore or not QBCore.Functions or type(QBCore.Functions.GetPlayer) ~= 'function' then return false end
        local player = QBCore.Functions.GetPlayer(src)
        if not player or not player.Functions or type(player.Functions.SetMetaData) ~= 'function' then
            return false
        end

        local ok = pcall(function()
            player.Functions.SetMetaData(key, value)
        end)

        return ok
    end

    --- Read custom player metadata.
    ---@param src number
    ---@param key string
    ---@return any
    function Bridge.Server.getPlayerState(src, key)
        if not QBCore or not QBCore.Functions or type(QBCore.Functions.GetPlayer) ~= 'function' then return nil end
        local player = QBCore.Functions.GetPlayer(src)
        if not player or type(player.PlayerData) ~= 'table' then
            return nil
        end

        local metadata = player.PlayerData.metadata or {}
        return metadata[key]
    end

    --- Set player job by name + grade.
    ---@param src number
    ---@param name string
    ---@param grade number|string|nil
    ---@return boolean
    function Bridge.Server.setJob(src, name, grade)
        if not QBCore or not QBCore.Functions or type(QBCore.Functions.GetPlayer) ~= 'function' then return false end
        local player = QBCore.Functions.GetPlayer(src)
        if not player or not player.Functions or type(player.Functions.SetJob) ~= 'function' then
            return false
        end

        local ok = pcall(function()
            player.Functions.SetJob(name, grade or 0)
        end)

        return ok
    end

    --- Set job duty state.
    ---@param src number
    ---@param onDuty boolean
    ---@return boolean
    function Bridge.Server.setJobDuty(src, onDuty)
        if not QBCore or not QBCore.Functions or type(QBCore.Functions.GetPlayer) ~= 'function' then return false end
        local player = QBCore.Functions.GetPlayer(src)
        if not player or not player.Functions then
            return false
        end

        local ok = false
        if type(player.Functions.SetJobDuty) == 'function' then
            ok = pcall(function()
                player.Functions.SetJobDuty(onDuty == true)
            end)
        end

        if (not ok) and type(player.PlayerData) == 'table' and type(player.PlayerData.job) == 'table' then
            player.PlayerData.job.onduty = onDuty == true
            ok = true
        end

        return ok
    end

-- ── client ────────────────────────────────────────────────
else
    Bridge.Client = {}

    function Bridge.init()
        if Bridge.initialized then return end
        Bridge.initialized = true

        CreateThread(function()
            local timeout_at = GetGameTimer() + 15000

            while QBCore == nil and GetGameTimer() < timeout_at do
                local status = GetResourceState('qb-core')
                if status == 'started' or status == 'starting' then
                    QBCore = getQBCoreObject('client', true)
                    if QBCore ~= nil then
                        break
                    end
                end

                Wait(500)
            end

            if QBCore == nil then
                logQbExportMissing('client')
            end
        end)
    end

    --- Send a local notification.
    ---@param msg string
    ---@param type string
    function Bridge.Client.notify(msg, type)
        lib.notify({ description = msg, type = type or 'inform' })
    end

    --- Get the local player's data.
    ---@return table|nil
    function Bridge.Client.getPlayerData()
        if not QBCore or not QBCore.Functions or type(QBCore.Functions.GetPlayerData) ~= 'function' then
            return nil
        end
        return QBCore.Functions.GetPlayerData()
    end

    --- Get the local player's job.
    ---@return table|nil
    function Bridge.Client.getJob()
        local data = Bridge.Client.getPlayerData()
        return data and data.job or nil
    end

    --- Get the local player's duty flag.
    ---@return boolean
    function Bridge.Client.getDuty()
        local job = Bridge.Client.getJob()
        if type(job) == 'table' and job.onduty ~= nil then
            return job.onduty == true
        end
        return true
    end
end

if Framework.name == 'qbcore' then
    Bridge.init()
end
