-- ============================================================
--  TG_MDT | shared/framework/sh-qbcore.lua
--  QBCore bridge — loaded when Framework.name == 'qbcore'
-- ============================================================

if Framework.name ~= 'qbcore' then return end

-- ── server ────────────────────────────────────────────────
if IsDuplicityVersion() then
    local QBCore = exports['qb-core']:GetCoreObject()

    Framework.Server = {}

    --- Get QBCore player object by server id.
    ---@param src number
    ---@return table|nil
    function Framework.Server.getPlayer(src)
        return QBCore.Functions.GetPlayer(src)
    end

    --- Get all online players.
    ---@return table
    function Framework.Server.getPlayers()
        return QBCore.Functions.GetPlayers()
    end

    --- Get player identifier (citizenid).
    ---@param src number
    ---@return string|nil
    function Framework.Server.getIdentifier(src)
        local player = QBCore.Functions.GetPlayer(src)
        return player and player.PlayerData.citizenid or nil
    end

    --- Send a notification to a player.
    ---@param src number
    ---@param msg string
    ---@param type string 'success' | 'error' | 'primary'
    function Framework.Server.notify(src, msg, type)
        TriggerClientEvent('ox_lib:notify', src, { description = msg, type = type or 'inform' })
    end

    --- Get player job name.
    ---@param src number
    ---@return string|nil
    function Framework.Server.getJob(src)
        local player = QBCore.Functions.GetPlayer(src)
        return player and player.PlayerData.job.name or nil
    end

    --- Get normalized job details.
    ---@param src number
    ---@return table
    function Framework.Server.getJobData(src)
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
    function Framework.Server.setPlayerState(src, key, value)
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
    function Framework.Server.getPlayerState(src, key)
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
    function Framework.Server.setJob(src, name, grade)
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
    function Framework.Server.setJobDuty(src, onDuty)
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
    local QBCore = exports['qb-core']:GetCoreObject()

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
        return QBCore.Functions.GetPlayerData()
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
