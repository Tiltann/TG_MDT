-- ============================================================
--  TG_MDT | server/sv-exports.lua
--  Public server exports for integrations.
-- ============================================================

--- Log an MDT action.
---@param player_id number
---@param action string
---@param details table
exports('LogMDTAction', function(player_id, action, details)
    if not player_id or type(player_id) ~= 'number' then return end
    if not action or type(action) ~= 'string' then return end
    details = details or {}
    TriggerEvent('tg_mdt:internal:logMDTAction', player_id, action, details)
end)

--- Log a player-related action.
---@param officer_id number
---@param target_id number
---@param action string
---@param details table
exports('LogPlayerAction', function(officer_id, target_id, action, details)
    if not officer_id or type(officer_id) ~= 'number' then return end
    if not target_id or type(target_id) ~= 'number' then return end
    if not action or type(action) ~= 'string' then return end
    details = details or {}
    TriggerEvent('tg_mdt:internal:logPlayerAction', officer_id, target_id, action, details)
end)

--- Log a vehicle-related action.
---@param player_id number
---@param action string
---@param vehicle_data table
---@param details table
exports('LogVehicleAction', function(player_id, action, vehicle_data, details)
    if not player_id or type(player_id) ~= 'number' then return end
    if not action or type(action) ~= 'string' then return end
    vehicle_data = vehicle_data or {}
    details = details or {}
    TriggerEvent('tg_mdt:internal:logVehicleAction', player_id, action, vehicle_data, details)
end)

--- Log an evidence-related action.
---@param player_id number
---@param action string
---@param evidence_data table
exports('LogEvidence', function(player_id, action, evidence_data)
    if not player_id or type(player_id) ~= 'number' then return end
    if not action or type(action) ~= 'string' then return end
    evidence_data = evidence_data or {}
    TriggerEvent('tg_mdt:internal:logEvidence', player_id, action, evidence_data)
end)

--- Log an administrative action.
---@param admin_id number
---@param action string
---@param details table
exports('LogAdminAction', function(admin_id, action, details)
    if not admin_id or type(admin_id) ~= 'number' then return end
    if not action or type(action) ~= 'string' then return end
    details = details or {}
    TriggerEvent('tg_mdt:internal:logAdminAction', admin_id, action, details)
end)

--- Get duty state for a player.
---@param src number
---@return table
exports('GetDutyState', function(src)
    if type(src) ~= 'number' then
        return { onDuty = true, reason = 'invalid_source' }
    end
    if not Duty or type(Duty.getState) ~= 'function' then
        return { onDuty = true, reason = 'duty_module_unavailable' }
    end
    return Duty.getState(src)
end)

--- Set duty state for a player.
---@param src number
---@param onDuty boolean
---@param options table|nil
---@return table
exports('SetDutyState', function(src, onDuty, options)
    if type(src) ~= 'number' then
        return { onDuty = true, reason = 'invalid_source' }
    end
    if not Duty or type(Duty.setState) ~= 'function' then
        return { onDuty = true, reason = 'duty_module_unavailable' }
    end
    return Duty.setState(src, onDuty == true, options)
end)

--- Toggle duty state for a player.
---@param src number
---@param options table|nil
---@return table
exports('ToggleDutyState', function(src, options)
    if type(src) ~= 'number' then
        return { onDuty = true, reason = 'invalid_source' }
    end
    if not Duty or type(Duty.toggleState) ~= 'function' then
        return { onDuty = true, reason = 'duty_module_unavailable' }
    end
    return Duty.toggleState(src, options)
end)

--- Create dispatch with optional autofill (coords, street, caller).
---@param payload table
---@param sourceOverride number|nil
---@return table
exports('CreateDispatch', function(payload, sourceOverride)
    if not DispatchModule or type(DispatchModule.createFromExternal) ~= 'function' then
        return { ok = false, reason = 'dispatch_module_unavailable' }
    end

    local src = type(sourceOverride) == 'number' and sourceOverride or 0
    return DispatchModule.createFromExternal(src, payload)
end)

--- Returns current module state for a player source.
---@param src number
---@return table
exports('GetDispatchModuleState', function(src)
    if type(src) ~= 'number' then
        return { dispatch = false, livemap = false, reason = 'invalid_source' }
    end

    if not DispatchModule or type(DispatchModule.getModuleStateForSource) ~= 'function' then
        return { dispatch = true, livemap = true }
    end

    return DispatchModule.getModuleStateForSource(src)
end)

--- Returns running (open) dispatch calls.
--- viewerSource optional: when provided, respects visibility for that source.
---@param viewerSource number|nil
---@return table
exports('GetRunningDispatches', function(viewerSource)
    if not DispatchModule or type(DispatchModule.getCurrentDispatches) ~= 'function' then
        return {}
    end

    return DispatchModule.getCurrentDispatches(type(viewerSource) == 'number' and viewerSource or nil)
end)

--- Returns dispatch log entries from database logs.
--- options supports: limit, offset, dispatchId
---@param options table|nil
---@return table
exports('GetDispatchLogs', function(options)
    if not DispatchModule or type(DispatchModule.getDispatchLogs) ~= 'function' then
        return {}
    end

    return DispatchModule.getDispatchLogs(type(options) == 'table' and options or {})
end)

--- Returns closed dispatch history.
--- viewerSource optional: when provided, respects visibility for that source.
--- options supports: limit, offset
---@param viewerSource number|nil
---@param options table|nil
---@return table
exports('GetDispatchHistory', function(viewerSource, options)
    if not DispatchModule or type(DispatchModule.getDispatchHistory) ~= 'function' then
        return {}
    end

    return DispatchModule.getDispatchHistory(type(viewerSource) == 'number' and viewerSource or nil, type(options) == 'table' and options or {})
end)

--- Returns running + logs (+ optional history) in one call.
--- options supports: limit, offset, dispatchId, includeHistory
---@param viewerSource number|nil
---@param options table|nil
---@return table
exports('GetDispatchDataBundle', function(viewerSource, options)
    if not DispatchModule then
        return { running = {}, logs = {}, history = {} }
    end

    local sourceId = type(viewerSource) == 'number' and viewerSource or nil
    local opts = type(options) == 'table' and options or {}

    return {
        running = type(DispatchModule.getCurrentDispatches) == 'function' and DispatchModule.getCurrentDispatches(sourceId) or {},
        logs = type(DispatchModule.getDispatchLogs) == 'function' and DispatchModule.getDispatchLogs(opts) or {},
        history = opts.includeHistory == true and type(DispatchModule.getDispatchHistory) == 'function'
            and DispatchModule.getDispatchHistory(sourceId, opts)
            or {},
    }
end)

--- Returns a person case (Akte) by identifier.
---@param identifier string
---@param options table|nil
---@return table
exports('GetPersonCaseByIdentifier', function(identifier, options)
    if type(identifier) ~= 'string' or identifier == '' then
        return {}
    end

    if type(TG_MDT_GetPersonCaseByIdentifier) ~= 'function' then
        return {}
    end

    local opts = type(options) == 'table' and options or {}
    return TG_MDT_GetPersonCaseByIdentifier(identifier, opts.src, opts.compartment)
end)

--- Returns a person case (Akte) by online player source id.
---@param src number
---@param options table|nil
---@return table
exports('GetPersonCaseBySource', function(src, options)
    if type(src) ~= 'number' then
        return {}
    end

    if not Framework or not Framework.Server or type(Framework.Server.getIdentifier) ~= 'function' then
        return {}
    end

    local identifier = Framework.Server.getIdentifier(src)
    if type(identifier) ~= 'string' or identifier == '' then
        return {}
    end

    if type(TG_MDT_GetPersonCaseByIdentifier) ~= 'function' then
        return {}
    end

    local opts = type(options) == 'table' and options or {}
    return TG_MDT_GetPersonCaseByIdentifier(identifier, src, opts.compartment)
end)

--- Returns a vehicle case (Akte) by plate.
---@param plate string
---@param options table|nil
---@return table
exports('GetVehicleCaseByPlate', function(plate, options)
    if type(plate) ~= 'string' or plate == '' then
        return {}
    end

    if type(TG_MDT_GetVehicleCaseByPlate) ~= 'function' then
        return {}
    end

    local opts = type(options) == 'table' and options or {}
    return TG_MDT_GetVehicleCaseByPlate(plate, opts.src, opts.compartment)
end)
