-- ============================================================
--  TG_MDT | shared/exports.lua
--  Public API exports for other resources.
--  
--  All exports are PascalCase and registered here.
-- ============================================================

-- ────────────────────────────────────────────────────────
--  Server-side exports (Framework wrappers)
-- ────────────────────────────────────────────────────────

if IsDuplicityVersion() then


    --- Log an MDT action.
    ---@param player_id number The player server id
    ---@param action string The action performed
    ---@param details table Additional details about the action
    exports('LogMDTAction', function(player_id, action, details)
        if not player_id or type(player_id) ~= 'number' then return end
        if not action or type(action) ~= 'string' then return end
        details = details or {}
        TriggerEvent('tg_mdt:internal:logMDTAction', player_id, action, details)
    end)

    --- Log a player-related action.
    ---@param officer_id number The officer server id
    ---@param target_id number The target player server id
    ---@param action string The action performed
    ---@param details table Additional details about the action
    exports('LogPlayerAction', function(officer_id, target_id, action, details)
        if not officer_id or type(officer_id) ~= 'number' then return end
        if not target_id or type(target_id) ~= 'number' then return end
        if not action or type(action) ~= 'string' then return end
        details = details or {}
        TriggerEvent('tg_mdt:internal:logPlayerAction', officer_id, target_id, action, details)
    end)

    --- Log a vehicle-related action.
    ---@param player_id number The player server id
    ---@param action string The action performed
    ---@param vehicle_data table Vehicle information
    ---@param details table Additional details about the action
    exports('LogVehicleAction', function(player_id, action, vehicle_data, details)
        if not player_id or type(player_id) ~= 'number' then return end
        if not action or type(action) ~= 'string' then return end
        vehicle_data = vehicle_data or {}
        details = details or {}
        TriggerEvent('tg_mdt:internal:logVehicleAction', player_id, action, vehicle_data, details)
    end)

    --- Log an evidence-related action.
    ---@param player_id number The player server id
    ---@param action string The action performed
    ---@param evidence_data table Evidence information
    exports('LogEvidence', function(player_id, action, evidence_data)
        if not player_id or type(player_id) ~= 'number' then return end
        if not action or type(action) ~= 'string' then return end
        evidence_data = evidence_data or {}
        TriggerEvent('tg_mdt:internal:logEvidence', player_id, action, evidence_data)
    end)

    --- Log an administrative action.
    ---@param admin_id number The admin server id
    ---@param action string The action performed
    ---@param details table Additional details about the action
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

-- ────────────────────────────────────────────────────────
--  Client-side exports (Framework wrappers)
-- ────────────────────────────────────────────────────────

else
    
end