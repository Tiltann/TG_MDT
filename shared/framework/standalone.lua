-- ============================================================
--  TG_MDT | shared/framework/standalone.lua
--  Standalone fallback — loaded when no framework is detected.
--  Replace stubs with your own logic as needed.
-- ============================================================

if Framework.name ~= 'standalone' then return end

Debug.warn('No framework detected — using standalone bridge. Implement stubs as needed.')

-- ── server ────────────────────────────────────────────────
if IsDuplicityVersion() then
    Framework.Server = {}

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
        TriggerClientEvent('ox_lib:notify', src, { description = msg, type = type or 'inform' })
    end

    ---@param src number
    ---@return string|nil
    function Framework.Server.getJob(src)
        -- TODO: implement
        return nil
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
