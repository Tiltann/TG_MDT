-- ============================================================
--  TG_MDT | shared/framework/sh-qbox.lua
--  Qbox (qbx_core) bridge — loaded dynamically when active framework is Qbox.
-- ============================================================

local Bridge = Framework.Bridges.qbox

local EVENT_OX_NOTIFY = 'ox_lib:notify'

---@param src number
---@param msg string
---@param notifyType string|nil
---@return boolean
local function notifyQbox(src, msg, notifyType)
    local player = exports.qbx_core:GetPlayer(src)
    if player and player.Functions and type(player.Functions.Notify) == 'function' then
        local ok = pcall(function()
            player.Functions.Notify(msg, notifyType or 'inform')
        end)

        if ok then
            return true
        end
    end

    local ok = pcall(function()
        exports.qbx_core:Notify(src, msg, notifyType or 'inform')
    end)

    if ok then
        return true
    end

    ok = pcall(function()
        exports.qbx_core:Notify(src, msg)
    end)

    return ok
end

-- ── server ────────────────────────────────────────────────
if IsDuplicityVersion() then
    Bridge.Server = {}

    function Bridge.init()
        Bridge.initialized = true
    end


    --- Get Qbox player object by server id.
    ---@param src number
    ---@return table|nil
    function Bridge.Server.getPlayer(src)
        return exports.qbx_core:GetPlayer(src)
    end

    --- Get all online players.
    ---@return table
    function Bridge.Server.getPlayers()
        return exports.qbx_core:GetPlayers()
    end

    --- Get player identifier (citizenid).
    ---@param src number
    ---@return string|nil
    function Bridge.Server.getIdentifier(src)
        local player = exports.qbx_core:GetPlayer(src)
        return player and player.PlayerData.citizenid or nil
    end

    --- Send a notification to a player.
    ---@param src number
    ---@param msg string
    ---@param type string
    function Bridge.Server.notify(src, msg, type)
        if notifyQbox(src, msg, type) then
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
        local player = exports.qbx_core:GetPlayer(src)
        return player and player.PlayerData.job.name or nil
    end

    --- Get normalized job details.
    ---@param src number
    ---@return table
    function Bridge.Server.getJobData(src)
        local player = exports.qbx_core:GetPlayer(src)
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

    --- Persist custom player state in metadata-like storage.
    ---@param src number
    ---@param key string
    ---@param value any
    ---@return boolean
    function Bridge.Server.setPlayerState(src, key, value)
        local player = exports.qbx_core:GetPlayer(src)
        if not player then
            return false
        end

        local funcs = player.Functions or {}
        if type(funcs.SetMetaData) == 'function' then
            local ok = pcall(function()
                funcs.SetMetaData(key, value)
            end)
            if ok then return true end
        end

        if type(player.Set) == 'function' then
            local ok = pcall(function()
                player:Set(key, value)
            end)
            if ok then return true end
        end

        return false
    end

    --- Read custom player state.
    ---@param src number
    ---@param key string
    ---@return any
    function Bridge.Server.getPlayerState(src, key)
        local player = exports.qbx_core:GetPlayer(src)
        if not player then
            return nil
        end

        if type(player.PlayerData) == 'table' and type(player.PlayerData.metadata) == 'table' then
            if player.PlayerData.metadata[key] ~= nil then
                return player.PlayerData.metadata[key]
            end
        end

        if type(player.Get) == 'function' then
            local ok, value = pcall(function()
                return player:Get(key)
            end)
            if ok then
                return value
            end
        end

        return nil
    end

    --- Set player job by name + grade.
    ---@param src number
    ---@param name string
    ---@param grade number|string|nil
    ---@return boolean
    function Bridge.Server.setJob(src, name, grade)
        local player = exports.qbx_core:GetPlayer(src)
        if not player then
            return false
        end

        local funcs = player.Functions or {}
        if type(funcs.SetJob) == 'function' then
            local ok = pcall(function()
                funcs.SetJob(name, grade or 0)
            end)
            if ok then return true end
        end

        return false
    end

    --- Set job duty state.
    ---@param src number
    ---@param onDuty boolean
    ---@return boolean
    function Bridge.Server.setJobDuty(src, onDuty)
        local player = exports.qbx_core:GetPlayer(src)
        if not player then
            return false
        end

        local funcs = player.Functions or {}
        if type(funcs.SetJobDuty) == 'function' then
            local ok = pcall(function()
                funcs.SetJobDuty(onDuty == true)
            end)
            if ok then return true end
        end

        if type(player.PlayerData) == 'table' and type(player.PlayerData.job) == 'table' then
            player.PlayerData.job.onduty = onDuty == true
            return true
        end

        return false
    end

-- ── client ────────────────────────────────────────────────
else
    Bridge.Client = {}

    function Bridge.init()
        Bridge.initialized = true
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
        return exports.qbx_core:GetPlayerData()
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

if Framework.name == 'qbox' then
    Bridge.init()
end
