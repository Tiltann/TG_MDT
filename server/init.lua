-- ============================================================
--  TG_MDT | server/init.lua
--  Server-side startup and initialization.
-- ============================================================

--- Check if database connection is available.
---@return boolean
local function checkDatabase()
    local result = MySQL.query.await('SELECT 1')
    return result ~= nil
end

-- ── Startup ────────────────────────────────────────────
Debug.debug(('Framework: %s'):format(Framework.name))

-- Check database availability
if checkDatabase() then
    Debug.info('Database connection OK')
else
    Debug.warn('Database connection failed — some features may not work')
end
