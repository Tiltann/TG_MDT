-- ============================================================
--  TG_MDT | shared/framework/sh-standalone.lua
--  Standalone fallback — loaded dynamically when no active framework is found.
--  Replace stubs with your own logic as needed.
-- ============================================================
if  Framework.name ~= 'standalone' then
    return
end
local Bridge = Framework.Bridges.standalone

local EVENT_OX_NOTIFY = 'ox_lib:notify'

Debug.warn('No framework detected — using standalone bridge. Implement stubs as needed.')

-- ── server ────────────────────────────────────────────────
if IsDuplicityVersion() then
    Bridge.Server = {}
    local _state = {}

    function Bridge.init()
        Bridge.initialized = true
        Debug.debug('Standalone Server Bridge: init() called')
    end

    ---@param src number
    ---@return nil
    function Bridge.Server.getPlayer(src)
        Debug.debug(('Standalone Server: getPlayer(%s) called'):format(src))
        return nil
    end

    ---@return table
    function Bridge.Server.getPlayers()
        Debug.debug('Standalone Server: getPlayers() called')
        return {}
    end

    ---@param src number
    ---@return string|nil
    function Bridge.Server.getIdentifier(src)
        Debug.debug(('Standalone Server: getIdentifier(%s) called'):format(src))
        for _, id in ipairs(GetPlayerIdentifiers(src)) do
            if id:find('license:') then 
                Debug.debug(('Standalone Server: getIdentifier(%s) returned "%s"'):format(src, id))
                return id 
            end
        end
        Debug.debug(('Standalone Server: getIdentifier(%s) returned nil'):format(src))
        return nil
    end

    ---@param src number
    ---@param msg string
    ---@param type string
    function Bridge.Server.notify(src, msg, type)
        Debug.debug(('Standalone Server: notify(%s, "%s", "%s") called'):format(src, msg, type))
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
    function Bridge.Server.getJob(src)
        Debug.debug(('Standalone Server: getJob(%s) called'):format(src))
        return nil
    end

    ---@param src number
    ---@return table
    function Bridge.Server.getJobData(src)
        Debug.debug(('Standalone Server: getJobData(%s) called'):format(src))
        local res = {
            name = nil,
            grade = nil,
            onduty = _state[src] and _state[src].tg_mdt_duty or true,
        }
        Debug.debug(('Standalone Server: getJobData(%s) resolved to: %s'):format(src, json.encode(res)))
        return res
    end

    ---@param src number
    ---@param key string
    ---@param value any
    ---@return boolean
    function Bridge.Server.setPlayerState(src, key, value)
        Debug.debug(('Standalone Server: setPlayerState(%s, "%s", %s) called'):format(src, key, tostring(value)))
        _state[src] = _state[src] or {}
        _state[src][key] = value
        return true
    end

    ---@param src number
    ---@param key string
    ---@return any
    function Bridge.Server.getPlayerState(src, key)
        Debug.debug(('Standalone Server: getPlayerState(%s, "%s") called'):format(src, key))
        local val = _state[src] and _state[src][key] or nil
        Debug.debug(('Standalone Server: getPlayerState(%s, "%s") resolved to: %s'):format(src, key, tostring(val)))
        return val
    end

    ---@param _src number
    ---@param _name string
    ---@param _grade number|string|nil
    ---@return boolean
    function Bridge.Server.setJob(_src, _name, _grade)
        Debug.debug(('Standalone Server: setJob(%s, "%s", %s) called - STUB return false'):format(_src, _name, tostring(_grade)))
        return false
    end

    ---@param _src number
    ---@param _onDuty boolean
    ---@return boolean
    function Bridge.Server.setJobDuty(_src, _onDuty)
        Debug.debug(('Standalone Server: setJobDuty(%s, %s) called - STUB return false'):format(_src, tostring(_onDuty)))
        return false
    end

-- ── client ────────────────────────────────────────────────
else
    Bridge.Client = {}

    function Bridge.init()
        Bridge.initialized = true
        Debug.debug('Standalone Client Bridge: init() called')
    end

    ---@param msg string
    ---@param type string
    function Bridge.Client.notify(msg, type)
        Debug.debug(('Standalone Client: notify("%s", "%s") called'):format(msg, type))
        lib.notify({ description = msg, type = type or 'inform' })
    end

    ---@return nil
    function Bridge.Client.getPlayerData()
        Debug.debug('Standalone Client: getPlayerData() called - STUB return nil')
        return nil
    end

    ---@return nil
    function Bridge.Client.getJob()
        Debug.debug('Standalone Client: getJob() called - STUB return nil')
        return nil
    end
end

if Framework.name == 'standalone' then
    Bridge.init()
end
