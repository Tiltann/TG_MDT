-- ============================================================
--  TG_MDT | shared/framework/sh-init.lua
--  Auto-detects the active framework and loads the right bridge dynamically.
--  Exposes a global `Framework` table to all contexts.
-- ============================================================

Framework = {
    Bridges = {
        esx = { Server = {}, Client = {} },
        qbcore = { Server = {}, Client = {} },
        qbox = { Server = {}, Client = {} },
        standalone = { Server = {}, Client = {} }
    }
}

local detectedName     = nil
local _lastLoggedIndex = nil

local function detect()
    -- Once we've successfully resolved a real framework, stick with it.
    if detectedName and detectedName ~= 'standalone' then
        return detectedName
    end

    local esx = GetResourceState('es_extended')
    if esx == 'started' or esx == 'starting' then
        if detectedName ~= 'esx' then
            Debug.debug(('Framework detect: es_extended has been detected as %s'):format(esx))
            detectedName = 'esx'
            local bridge = Framework.Bridges.esx
            if bridge and type(bridge.init) == 'function' then
                Debug.debug('Framework detect: triggering ESX bridge init')
                bridge.init()
            end
        end
        return 'esx'
    end

    local qbox = GetResourceState('qbx_core')
    if qbox == 'started' or qbox == 'starting' then
        if detectedName ~= 'qbox' then
            Debug.debug(('Framework detect: qbx_core has been detected as %s'):format(qbox))
            detectedName = 'qbox'
            local bridge = Framework.Bridges.qbox
            if bridge and type(bridge.init) == 'function' then
                Debug.debug('Framework detect: triggering Qbox bridge init')
                bridge.init()
            end
        end
        return 'qbox'
    end

    local qb = GetResourceState('qb-core')
    if qb == 'started' or qb == 'starting' then
        if detectedName ~= 'qbcore' then
            Debug.debug(('Framework detect: qb-core has been detected as %s'):format(qb))
            detectedName = 'qbcore'
            local bridge = Framework.Bridges.qbcore
            if bridge and type(bridge.init) == 'function' then
                Debug.debug('Framework detect: triggering QBCore bridge init')
                bridge.init()
            end
        end
        return 'qbcore'
    end

    if detectedName ~= 'standalone' then
        Debug.debug('Framework detect: no known frameworks found, fallback to standalone')
        detectedName = 'standalone'
        local bridge = Framework.Bridges.standalone
        if bridge and type(bridge.init) == 'function' then
            Debug.debug('Framework detect: triggering Standalone bridge init')
            bridge.init()
        end
    end
    return 'standalone'
end

setmetatable(Framework, {
    __index = function(t, key)
        if key == 'name' then
            local name = detect()
            -- Only log when the resolved name changes to avoid spam on every access.
            if name ~= _lastLoggedIndex then
                Debug.debug(('Framework.name → "%s"'):format(name))
                _lastLoggedIndex = name
            end
            return name
        end
        if key == 'Server' then
            local name = detect()
            Debug.debug(('Framework.Server → routing to "%s" bridge'):format(name))
            return Framework.Bridges[name].Server
        end
        if key == 'Client' then
            local name = detect()
            Debug.debug(('Framework.Client → routing to "%s" bridge'):format(name))
            return Framework.Bridges[name].Client
        end
        return nil
    end
})

-- Trigger initial detection
local initialFramework = detect()
Debug.info(('Framework detected: %s'):format(initialFramework))

