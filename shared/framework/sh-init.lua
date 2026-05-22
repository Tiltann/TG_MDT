-- ============================================================
--  TG_MDT | shared/framework/init.lua
--  Auto-detects the active framework and loads the right bridge.
--  Exposes a global `Framework` table to all contexts.
--
--  Detection order: esx → qbox → qbcore → standalone
--  Access:
--    Framework.name                  -- 'esx' | 'qbcore' | 'qbox' | 'standalone'
--    Framework.Server.getPlayer(src) -- server-side helpers
--    Framework.Client.notify(msg)    -- client-side helpers
-- ============================================================

local function detect()
    if GetResourceState('es_extended')     == 'started' then return 'esx'        end
    if GetResourceState('qbx_core')        == 'started' then return 'qbox'       end
    if GetResourceState('qb-core')         == 'started' then return 'qbcore'     end
    return 'standalone'
end

Framework      = {}
Framework.name = detect()

Debug.info(('Framework detected: %s'):format(Framework.name))


