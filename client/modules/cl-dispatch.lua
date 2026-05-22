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
    local ok, state = pcall(function()
        return lib.callback.await(CALLBACK_GET_DISPATCH_MODULE_STATE, false)
    end)

    if ok and type(state) == 'table' then
        moduleStateCache.dispatch = state.dispatch ~= false
        moduleStateCache.livemap = state.livemap ~= false
    end

    return {
        dispatch = moduleStateCache.dispatch,
        livemap = moduleStateCache.livemap,
    }
end

---@return boolean
function DispatchClient.isDispatchEnabled()
    return DispatchClient.getModuleState().dispatch == true
end

---@return boolean
function DispatchClient.isLivemapEnabled()
    return DispatchClient.getModuleState().livemap == true
end
