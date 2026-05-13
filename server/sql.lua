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

--- Run a SELECT and return all matching rows.
---@param query string SQL query string with ? placeholders.
---@param params table Parameter values in order.
---@return table rows Empty table if no results.
function SQL.query(query, params)
    local result = MySQL.query.await(query, params or {})
    return result or {}
end

--- Run a SELECT and return a single row.
---@param query string
---@param params table
---@return table|nil row Nil if not found.
function SQL.single(query, params)
    local result = MySQL.single.await(query, params or {})
    return result or nil
end

--- Run a SELECT and return one scalar value (first column of first row).
---@param query string
---@param params table
---@return any|nil value
function SQL.scalar(query, params)
    local result = MySQL.scalar.await(query, params or {})
    return result
end

--- Run an INSERT and return the new row id.
---@param query string
---@param params table
---@return number|nil id The inserted row id, or nil on failure.
function SQL.insert(query, params)
    local id = MySQL.insert.await(query, params or {})
    return id
end

--- Run an UPDATE, DELETE, or any non-returning statement.
--- Returns the number of affected rows.
---@param query string
---@param params table
---@return number affected_rows
function SQL.execute(query, params)
    local affected = MySQL.execute.await(query, params or {})
    return affected or 0
end

--- Run multiple queries in a transaction.
--- Rolls back automatically on failure.
---@param queries table Array of { query = string, params = table }
---@return boolean success
function SQL.transaction(queries)
    local ok = MySQL.transaction.await(queries)
    if not ok then
        Debug.error('SQL.transaction failed', json.encode(queries))
    end
    return ok == true
end
