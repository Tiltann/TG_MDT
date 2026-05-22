-- ============================================================
--  TG_MDT | server/modules/sv-dispatch.lua
--  Dispatch helpers: per-agency module state, payload enrichment,
--  and SQL-backed dispatch logs/history.
-- ============================================================

DispatchModule = DispatchModule or {}

local CALLBACK_GET_DISPATCH_MODULE_STATE = 'TG_MDT:getDispatchModuleState'
local CALLBACK_GET_RUNNING_DISPATCHES = 'TG_MDT:getRunningDispatches'
local CALLBACK_GET_DISPATCH_LOGS = 'TG_MDT:getDispatchLogs'
local CALLBACK_GET_DISPATCH_DATA_BUNDLE = 'TG_MDT:getDispatchDataBundle'
local EVENT_SERVER_CREATE_DISPATCH = 'TG_MDT:server:createDispatch'

local function normalizeJobName(job)
    if type(job) ~= 'string' then
        return ''
    end

    return string.lower((job:gsub('^%s+', ''):gsub('%s+$', '')))
end

local function getDepartmentConfigForJob(jobName)
    local normalized = normalizeJobName(jobName)
    if normalized == '' then
        return nil
    end

    local departments = Config and Config.MDT and Config.MDT.departments
    if type(departments) ~= 'table' then
        return nil
    end

    for _, deptCfg in pairs(departments) do
        if type(deptCfg) == 'table' and type(deptCfg.jobs) == 'table' then
            for i = 1, #deptCfg.jobs do
                if normalizeJobName(deptCfg.jobs[i]) == normalized then
                    return deptCfg
                end
            end
        end
    end

    return nil
end

local function getJobNameFromSource(src)
    if not Framework or not Framework.Server then
        return ''
    end

    if type(Framework.Server.getJob) == 'function' then
        local ok, jobName = pcall(Framework.Server.getJob, src)
        if ok and type(jobName) == 'string' then
            return normalizeJobName(jobName)
        end
    end

    if type(Framework.Server.getJobData) == 'function' then
        local ok, jobData = pcall(Framework.Server.getJobData, src)
        if ok and type(jobData) == 'table' then
            return normalizeJobName(jobData.name)
        end
    end

    return ''
end

local function hasMdtAccess(src)
    local jobName = getJobNameFromSource(src)
    if jobName == '' then
        return false
    end

    local allowed = (Config and Config.MDT and Config.MDT.allowed_jobs) or {}
    if #allowed == 0 then
        return true
    end

    for i = 1, #allowed do
        if normalizeJobName(allowed[i]) == jobName then
            return true
        end
    end

    return false
end

--- Returns agency-scoped module state.
--- Business rule: dispatch and livemap are coupled per agency.
---@param src number
---@return table
function DispatchModule.getModuleStateForSource(src)
    local globalModules = Config and Config.Modules or {}
    local globalDispatch = not (type(globalModules.dispatch) == 'table' and globalModules.dispatch.enabled == false)
    local globalLivemap = not (type(globalModules.livemap) == 'table' and globalModules.livemap.enabled == false)

    local result = {
        dispatch = globalDispatch,
        livemap = globalLivemap,
        reason = nil,
    }

    local jobName = getJobNameFromSource(src)
    local deptCfg = getDepartmentConfigForJob(jobName)
    if type(deptCfg) ~= 'table' then
        return result
    end

    local deptModules = type(deptCfg.modules) == 'table' and deptCfg.modules or {}
    local deptDispatch = deptModules.dispatch ~= false
    local deptLivemap = deptModules.livemap ~= false

    if deptDispatch == false or deptLivemap == false then
        result.dispatch = false
        result.livemap = false
        result.reason = 'agency_module_disabled'
        return result
    end

    return result
end

---@param src number
---@return boolean
function DispatchModule.isDispatchEnabledForSource(src)
    if not hasMdtAccess(src) then
        return false
    end

    local state = DispatchModule.getModuleStateForSource(src)
    return state.dispatch == true
end

local function resolveStreetFromCoords(coords)
    if type(coords) ~= 'table' then
        return nil
    end

    local x = tonumber(coords.x)
    local y = tonumber(coords.y)
    local z = tonumber(coords.z)
    if not x or not y or not z then
        return nil
    end

    local streetHash, crossingHash = GetStreetNameAtCoord(x + 0.0, y + 0.0, z + 0.0)
    local street = streetHash and streetHash ~= 0 and GetStreetNameFromHashKey(streetHash) or ''
    local crossing = crossingHash and crossingHash ~= 0 and GetStreetNameFromHashKey(crossingHash) or ''

    if street ~= '' and crossing ~= '' then
        return ('%s / %s'):format(street, crossing)
    end

    if street ~= '' then
        return street
    end

    return nil
end

---@param payload table
---@param src number|nil
---@return table
function DispatchModule.enrichPayload(payload, src)
    local body = type(payload) == 'table' and payload or {}
    local enriched = {}

    for key, value in pairs(body) do
        enriched[key] = value
    end

    local sourceId = tonumber(src)

    if type(enriched.coords) ~= 'table' and sourceId and sourceId > 0 then
        local ped = GetPlayerPed(sourceId)
        if ped and ped > 0 then
            local vec = GetEntityCoords(ped)
            if vec then
                enriched.coords = { x = vec.x + 0.0, y = vec.y + 0.0, z = vec.z + 0.0 }
            end
        end
    end

    if (type(enriched.location) ~= 'string' or enriched.location == '') and type(enriched.coords) == 'table' then
        local street = resolveStreetFromCoords(enriched.coords)
        if street and street ~= '' then
            enriched.location = street
        end
    end

    if (type(enriched.who) ~= 'string' or enriched.who == '') and sourceId and sourceId > 0 then
        local pName = GetPlayerName(sourceId)
        if type(pName) == 'string' and pName ~= '' then
            enriched.who = pName
        end
    end

    if type(enriched.scopeJob) ~= 'string' or enriched.scopeJob == '' then
        enriched.scopeJob = getJobNameFromSource(sourceId)
    end

    return enriched
end

local function ensureTables()
    if not SQL or type(SQL.execute) ~= 'function' then
        return
    end

    SQL.execute([[CREATE TABLE IF NOT EXISTS tg_mdt_dispatch_cases (
        id VARCHAR(64) NOT NULL PRIMARY KEY,
        creator_source INT NULL,
        creator_identifier VARCHAR(96) NULL,
        creator_name VARCHAR(128) NULL,
        scope_job VARCHAR(64) NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT NULL,
        location VARCHAR(255) NULL,
        priority VARCHAR(24) NULL,
        status VARCHAR(24) NULL,
        payload_json LONGTEXT NULL,
        coords_json LONGTEXT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        closed_at DATETIME NULL,
        closed_by_source INT NULL,
        closed_by_name VARCHAR(128) NULL
    )]], {})

    SQL.execute([[CREATE TABLE IF NOT EXISTS tg_mdt_dispatch_logs (
        id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        dispatch_id VARCHAR(64) NOT NULL,
        action VARCHAR(64) NOT NULL,
        actor_source INT NULL,
        actor_name VARCHAR(128) NULL,
        details_json LONGTEXT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_dispatch_id (dispatch_id)
    )]], {})
end

---@param dispatchId string
---@param action string
---@param actorSrc number|nil
---@param details table|nil
function DispatchModule.logAction(dispatchId, action, actorSrc, details)
    if type(dispatchId) ~= 'string' or dispatchId == '' then
        return
    end

    if not SQL or type(SQL.execute) ~= 'function' then
        return
    end

    local src = tonumber(actorSrc)
    local actorName = src and GetPlayerName(src) or nil
    local detailsJson = type(details) == 'table' and json.encode(details) or nil

    SQL.execute(
        'INSERT INTO tg_mdt_dispatch_logs (dispatch_id, action, actor_source, actor_name, details_json) VALUES (?, ?, ?, ?, ?)',
        { dispatchId, tostring(action or ''), src, actorName, detailsJson }
    )
end

---@param call table
---@param sourceId number|nil
function DispatchModule.persistOpenCall(call, sourceId)
    if type(call) ~= 'table' or type(call.id) ~= 'string' or call.id == '' then
        return
    end

    if not SQL or type(SQL.execute) ~= 'function' then
        return
    end

    SQL.execute(
        [[INSERT INTO tg_mdt_dispatch_cases
            (id, creator_source, creator_identifier, creator_name, scope_job, title, description, location, priority, status, payload_json, coords_json)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE
            creator_source = VALUES(creator_source),
            creator_identifier = VALUES(creator_identifier),
            creator_name = VALUES(creator_name),
            scope_job = VALUES(scope_job),
            title = VALUES(title),
            description = VALUES(description),
            location = VALUES(location),
            priority = VALUES(priority),
            status = VALUES(status),
            payload_json = VALUES(payload_json),
            coords_json = VALUES(coords_json)]],
        {
            call.id,
            tonumber(sourceId),
            call.callerIdentifier,
            call.callerName,
            call.scopeJob,
            call.title,
            call.description,
            call.location,
            call.priority,
            call.status,
            json.encode(call),
            type(call.coords) == 'table' and json.encode(call.coords) or nil,
        }
    )
end

---@param historyEntry table
---@param sourceId number|nil
function DispatchModule.persistClosedCall(historyEntry, sourceId)
    if type(historyEntry) ~= 'table' or type(historyEntry.id) ~= 'string' or historyEntry.id == '' then
        return
    end

    if not SQL or type(SQL.execute) ~= 'function' then
        return
    end

    SQL.execute(
        [[UPDATE tg_mdt_dispatch_cases
          SET status = ?,
              payload_json = ?,
              closed_at = CURRENT_TIMESTAMP,
              closed_by_source = ?,
              closed_by_name = ?
          WHERE id = ?]],
        {
            historyEntry.status or 'closed',
            json.encode(historyEntry),
            tonumber(sourceId),
            type(historyEntry.closedBy) == 'table' and historyEntry.closedBy.name or nil,
            historyEntry.id,
        }
    )
end

---@param src number|nil
---@param payload table
---@return table
function DispatchModule.createFromExternal(src, payload)
    local body = DispatchModule.enrichPayload(payload, src)
    local createFn = rawget(_G, 'TG_MDT_InternalCreateDispatch')
    if type(createFn) ~= 'function' then
        return { ok = false, reason = 'dispatch_unavailable' }
    end

    local call, reason = createFn(body, src)
    if not call then
        return { ok = false, reason = reason or 'create_failed' }
    end

    return { ok = true, id = call.id }
end

---@param value any
---@return table|nil
local function decodeObject(value)
    if type(value) == 'table' then
        return value
    end

    if type(value) ~= 'string' or value == '' then
        return nil
    end

    local ok, decoded = pcall(json.decode, value)
    if ok and type(decoded) == 'table' then
        return decoded
    end

    return nil
end

---@param options table|nil
---@return number
local function getLimit(options)
    local limit = type(options) == 'table' and tonumber(options.limit) or nil
    if not limit or limit < 1 then
        return 200
    end

    if limit > 1000 then
        return 1000
    end

    return math.floor(limit)
end

---@param options table|nil
---@return number
local function getOffset(options)
    local offset = type(options) == 'table' and tonumber(options.offset) or nil
    if not offset or offset < 0 then
        return 0
    end

    return math.floor(offset)
end

---@param viewerSrc number|nil
---@return table
function DispatchModule.getCurrentDispatches(viewerSrc)
    local snapshotFn = rawget(_G, 'TG_MDT_InternalGetDispatchCallsSnapshot')
    if type(snapshotFn) == 'function' then
        local ok, rows = pcall(snapshotFn, viewerSrc)
        if ok and type(rows) == 'table' then
            return rows
        end
    end

    if not SQL or type(SQL.query) ~= 'function' then
        return {}
    end

    local rows = SQL.query(
        'SELECT payload_json FROM tg_mdt_dispatch_cases WHERE closed_at IS NULL ORDER BY created_at DESC LIMIT 500',
        {}
    )

    local list = {}
    for i = 1, #rows do
        local decoded = decodeObject(rows[i].payload_json)
        if decoded then
            list[#list + 1] = decoded
        end
    end

    return list
end

---@param viewerSrc number|nil
---@param options table|nil
---@return table
function DispatchModule.getDispatchHistory(viewerSrc, options)
    local snapshotFn = rawget(_G, 'TG_MDT_InternalGetDispatchHistorySnapshot')
    if type(snapshotFn) == 'function' then
        local ok, rows = pcall(snapshotFn, viewerSrc)
        if ok and type(rows) == 'table' then
            local limit = getLimit(options)
            local offset = getOffset(options)
            local list = {}
            for i = offset + 1, math.min(#rows, offset + limit) do
                list[#list + 1] = rows[i]
            end
            return list
        end
    end

    if not SQL or type(SQL.query) ~= 'function' then
        return {}
    end

    local limit = getLimit(options)
    local offset = getOffset(options)
    local rows = SQL.query(
        'SELECT payload_json FROM tg_mdt_dispatch_cases WHERE closed_at IS NOT NULL ORDER BY closed_at DESC LIMIT ? OFFSET ?',
        { limit, offset }
    )

    local list = {}
    for i = 1, #rows do
        local decoded = decodeObject(rows[i].payload_json)
        if decoded then
            list[#list + 1] = decoded
        end
    end

    return list
end

---@param options table|nil
---@return table
function DispatchModule.getDispatchLogs(options)
    if not SQL or type(SQL.query) ~= 'function' then
        return {}
    end

    local limit = getLimit(options)
    local offset = getOffset(options)
    local dispatchId = type(options) == 'table' and type(options.dispatchId) == 'string' and options.dispatchId or nil

    local query = [[
        SELECT
            l.id,
            l.dispatch_id,
            l.action,
            l.actor_source,
            l.actor_name,
            l.details_json,
            l.created_at,
            c.scope_job,
            c.title,
            c.status
        FROM tg_mdt_dispatch_logs l
        LEFT JOIN tg_mdt_dispatch_cases c ON c.id = l.dispatch_id
    ]]

    local params = {}
    if dispatchId and dispatchId ~= '' then
        query = query .. ' WHERE l.dispatch_id = ?'
        params[#params + 1] = dispatchId
    end

    query = query .. ' ORDER BY l.id DESC LIMIT ? OFFSET ?'
    params[#params + 1] = limit
    params[#params + 1] = offset

    local rows = SQL.query(query, params)
    local out = {}

    for i = 1, #rows do
        local row = rows[i]
        out[#out + 1] = {
            id = row.id,
            dispatchId = row.dispatch_id,
            action = row.action,
            actorSource = row.actor_source,
            actorName = row.actor_name,
            details = decodeObject(row.details_json) or {},
            createdAt = row.created_at,
            scopeJob = row.scope_job,
            title = row.title,
            status = row.status,
        }
    end

    return out
end

---@param src number
---@param options table|nil
---@return table
local function getDispatchDataBundle(src, options)
    local includeHistory = type(options) == 'table' and options.includeHistory == true

    local bundle = {
        running = DispatchModule.getCurrentDispatches(src),
        logs = DispatchModule.getDispatchLogs(options),
    }

    if includeHistory then
        bundle.history = DispatchModule.getDispatchHistory(src, options)
    end

    return bundle
end

lib.callback.register(CALLBACK_GET_DISPATCH_MODULE_STATE, function(src)
    if not hasMdtAccess(src) then
        return { dispatch = false, livemap = false, reason = 'unauthorized' }
    end

    return DispatchModule.getModuleStateForSource(src)
end)

lib.callback.register(CALLBACK_GET_RUNNING_DISPATCHES, function(src)
    if not hasMdtAccess(src) then
        return {}
    end

    if not DispatchModule.isDispatchEnabledForSource(src) then
        return {}
    end

    return DispatchModule.getCurrentDispatches(src)
end)

lib.callback.register(CALLBACK_GET_DISPATCH_LOGS, function(src, options)
    if not hasMdtAccess(src) then
        return {}
    end

    if not DispatchModule.isDispatchEnabledForSource(src) then
        return {}
    end

    return DispatchModule.getDispatchLogs(options)
end)

lib.callback.register(CALLBACK_GET_DISPATCH_DATA_BUNDLE, function(src, options)
    if not hasMdtAccess(src) then
        return { running = {}, logs = {}, history = {} }
    end

    if not DispatchModule.isDispatchEnabledForSource(src) then
        return { running = {}, logs = {}, history = {} }
    end

    return getDispatchDataBundle(src, options)
end)

RegisterNetEvent(EVENT_SERVER_CREATE_DISPATCH, function(payload)
    local src = source
    local result = DispatchModule.createFromExternal(src, payload)
    if result.ok ~= true then
        Debug.warn(('Dispatch event create failed: %s'):format(tostring(result.reason or 'unknown')))
    end
end)

CreateThread(function()
    ensureTables()
end)
