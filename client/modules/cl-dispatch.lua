-- ============================================================
--  TG_MDT | client/modules/cl-dispatch.lua
--  Dispatch module helper for agency-scoped module state.
-- ============================================================

DispatchClient = DispatchClient or {}

local CALLBACK_GET_DISPATCH_MODULE_STATE = 'TG_MDT:getDispatchModuleState'

local moduleStateCache = {
    dispatch = true,
    livemap = true,
}

---@return table
function DispatchClient.getModuleState()
    if Debug and type(Debug.debug) == 'function' then
        Debug.debug('[cl-dispatch:getModuleState] fetching state from server...')
    end
    local ok, state = pcall(function()
        return lib.callback.await(CALLBACK_GET_DISPATCH_MODULE_STATE, false)
    end)

    if Debug and type(Debug.debug) == 'function' then
        Debug.debug(('[cl-dispatch:getModuleState] callback response: ok=%s state=%s'):format(tostring(ok), json.encode(state)))
    end

    if ok and type(state) == 'table' then
        moduleStateCache.dispatch = state.dispatch ~= false
        moduleStateCache.livemap = state.livemap ~= false
    end

    local out = {
        dispatch = moduleStateCache.dispatch,
        livemap = moduleStateCache.livemap,
    }
    if Debug and type(Debug.debug) == 'function' then
        Debug.debug(('[cl-dispatch:getModuleState] returned state=%s'):format(json.encode(out)))
    end
    return out
end

---@return boolean
function DispatchClient.isDispatchEnabled()
    local enabled = DispatchClient.getModuleState().dispatch == true
    if Debug and type(Debug.debug) == 'function' then
        Debug.debug(('[cl-dispatch:isDispatchEnabled] resolved enabled=%s'):format(tostring(enabled)))
    end
    return enabled
end

---@return boolean
function DispatchClient.isLivemapEnabled()
    local enabled = DispatchClient.getModuleState().livemap == true
    if Debug and type(Debug.debug) == 'function' then
        Debug.debug(('[cl-dispatch:isLivemapEnabled] resolved enabled=%s'):format(tostring(enabled)))
    end
    return enabled
end
