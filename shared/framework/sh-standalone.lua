-- ============================================================
--  TG_MDT | shared/framework/sh-standalone.lua
--  Standalone fallback — loaded when no framework is detected.
--  Replace stubs with your own logic as needed.
-- ============================================================

if Framework.name ~= 'standalone' then return end

local EVENT_OX_NOTIFY = 'ox_lib:notify'

Debug.warn('No framework detected — using standalone bridge. Implement stubs as needed.')

-- ── server ────────────────────────────────────────────────
if IsDuplicityVersion() then
    Framework.Server = {}
    local _state = {}

    ---@param src number
    ---@return nil
    function Framework.Server.getPlayer(src)
        -- TODO: implement or return nil
        return nil
    end

    ---@return table
    function Framework.Server.getPlayers()
        -- TODO: implement
        return {}
    end

    ---@param src number
    ---@return string|nil
    function Framework.Server.getIdentifier(src)
        -- fallback: first license identifier
        for _, id in ipairs(GetPlayerIdentifiers(src)) do
            if id:find('license:') then return id end
        end
        return nil
    end

    ---@param src number
    ---@param msg string
    ---@param type string
    function Framework.Server.notify(src, msg, type)
        local ok = pcall(function()
            TriggerClientEvent(EVENT_OX_NOTIFY, src, { description = msg, type = type or 'inform' })
        end)

        if ok then
            return
        end

        pcall(function()
            TriggerClientEvent('chat:addMessage', src, {
                color = { 255, 255, 255 },
                args = { 'TG_MDT', msg },
            })
        end)
    end

    ---@param src number
    ---@return string|nil
    function Framework.Server.getJob(src)
        -- TODO: implement
        return nil
    end

    ---@param src number
    ---@return table
    function Framework.Server.getJobData(src)
        return {
            name = nil,
            grade = nil,
            onduty = _state[src] and _state[src].tg_mdt_duty or true,
        }
    end

    ---@param src number
    ---@param key string
    ---@param value any
    ---@return boolean
    function Framework.Server.setPlayerState(src, key, value)
        _state[src] = _state[src] or {}
        _state[src][key] = value
        return true
    end

    ---@param src number
    ---@param key string
    ---@return any
    function Framework.Server.getPlayerState(src, key)
        return _state[src] and _state[src][key] or nil
    end

    ---@param _src number
    ---@param _name string
    ---@param _grade number|string|nil
    ---@return boolean
    function Framework.Server.setJob(_src, _name, _grade)
        return false
    end

    ---@param _src number
    ---@param _onDuty boolean
    ---@return boolean
    function Framework.Server.setJobDuty(_src, _onDuty)
        return false
    end

-- ── client ────────────────────────────────────────────────
else
    Framework.Client = {}

    ---@param msg string
    ---@param type string
    function Framework.Client.notify(msg, type)
        lib.notify({ description = msg, type = type or 'inform' })
    end

    ---@return nil
    function Framework.Client.getPlayerData()
        -- TODO: implement
        return nil
    end

    ---@return nil
    function Framework.Client.getJob()
        -- TODO: implement
        return nil
    end
end
