-- ============================================================
--  TG_MDT | server/sql.lua
--  OxMySQL wrapper.
--  Provides a clean SQL table so feature code never touches
--  MySQL directly.
--
--  Usage:
--    SQL.query('SELECT * FROM users WHERE job = ?', { job })
--    SQL.single('SELECT * FROM users WHERE id = ?', { id })
--    SQL.scalar('SELECT COUNT(*) FROM users', {})
--    SQL.insert('INSERT INTO users (name) VALUES (?)', { name })
--    SQL.execute('UPDATE users SET job = ? WHERE id = ?', { job, id })
-- ============================================================

SQL = {}

---@param result any
---@return any
local function awaitResult(result)
    if result == nil then return nil end
    if Citizen and Citizen.Await and (type(result) == 'table' or type(result) == 'userdata') then
        local ok, awaited = pcall(Citizen.Await, result)
        if ok then
            return awaited
        end
    end
    return result
end

---@param method string
---@return any
local function callMySQL(method, ...)
    local fn = MySQL[method]
    if type(fn) == 'table' and type(fn.await) == 'function' then
        return fn.await(...)
    end

    if type(fn) == 'function' then
        return awaitResult(fn(...))
    end

    return nil
end

--- Run a SELECT and return all matching rows.
---@param query string SQL query string with ? placeholders.
---@param params table Parameter values in order.
---@return table rows Empty table if no results.
function SQL.query(query, params)
    local result = callMySQL('query', query, params or {})
    return result or {}
end

--- Run a SELECT and return a single row.
---@param query string
---@param params table
---@return table|nil row Nil if not found.
function SQL.single(query, params)
    local result = callMySQL('single', query, params or {})
    return result or nil
end

--- Run a SELECT and return one scalar value (first column of first row).
---@param query string
---@param params table
---@return any|nil value
function SQL.scalar(query, params)
    local result = callMySQL('scalar', query, params or {})
    return result
end

--- Run an INSERT and return the new row id.
---@param query string
---@param params table
---@return number|nil id The inserted row id, or nil on failure.
function SQL.insert(query, params)
    local id = callMySQL('insert', query, params or {})
    return id
end

--- Run an UPDATE, DELETE, or any non-returning statement.
--- Returns the number of affected rows.
---@param query string
---@param params table
---@return number affected_rows
function SQL.execute(query, params)
    local sqlParams = params or {}
    local affected = callMySQL('update', query, sqlParams)
    if affected == nil then
        affected = callMySQL('execute', query, sqlParams)
    end
    return affected or 0
end

--- Run multiple queries in a transaction.
--- Rolls back automatically on failure.
---@param queries table Array of { query = string, params = table }
---@return boolean success
function SQL.transaction(queries)
    local ok = callMySQL('transaction', queries)
    if not ok then
        Debug.error('SQL.transaction failed', json.encode(queries))
    end
    return ok == true
end
