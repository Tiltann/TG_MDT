-- ============================================================
--  TG_MDT | shared/framework/sh-qbox.lua
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

    --- Get normalized job details.
    ---@param src number
    ---@return table
    function Framework.Server.getJobData(src)
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
    function Framework.Server.setPlayerState(src, key, value)
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
    function Framework.Server.getPlayerState(src, key)
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
    function Framework.Server.setJob(src, name, grade)
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
    function Framework.Server.setJobDuty(src, onDuty)
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

    --- Get the local player's duty flag.
    ---@return boolean
    function Framework.Client.getDuty()
        local job = Framework.Client.getJob()
        if type(job) == 'table' and job.onduty ~= nil then
            return job.onduty == true
        end
        return true
    end
end
