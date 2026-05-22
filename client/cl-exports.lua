-- ============================================================
--  TG_MDT | client/cl-exports.lua
--  Public client exports for integrations.
-- ============================================================

local CALLBACK_CREATE_DISPATCH = 'TG_MDT:createDispatch'

exports('CreateDispatch', function(payload)
    local body = type(payload) == 'table' and payload or {}
    local ok, result = pcall(function()
        return lib.callback.await(CALLBACK_CREATE_DISPATCH, false, body)
    end)

    if not ok or type(result) ~= 'table' or result.ok ~= true then
        return nil
    end

    return result.id
end)

exports('GetDispatchModuleState', function()
    if DispatchClient and type(DispatchClient.getModuleState) == 'function' then
        return DispatchClient.getModuleState()
    end

    return {
        dispatch = true,
        livemap = true,
    }
end)
