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

-- ── Map tile check ─────────────────────────────────────────

local MAP_TILE_WARNING = [[

╔══════════════════════════════════════════════════════════════╗
║               TG_MDT ── MAP TILES MISSING                    ║
╠══════════════════════════════════════════════════════════════╣
║  The map tile files are not installed.                       ║
║  The live map view will show a blank/broken map.             ║
║                                                              ║
║  HOW TO FIX:                                                 ║
║  1. Download the map tiles from:                             ║
║     https://drive.proton.me/urls/YZE057HH5G#KN3aoWGvPXb8    ║
║                                                              ║
║  2. Extract and place the folders so the structure looks     ║
║     like this inside your resource:                          ║
║       web/public/map/styleAtlas/{z}/{x}/{y}.jpg              ║
║       web/public/map/styleGrid/{z}/{x}/{y}.png               ║
║       web/public/map/styleSatelite/{z}/{x}/{y}.jpg           ║
║                                                              ║
║  3. Rebuild the web UI:                                      ║
║       cd web && npm run build                                ║
║     The build copies public/ into dist/ automatically.       ║
║     After building, restart the resource.                    ║
║                                                              ║
║  Map tiles originally from:                                  ║
║     https://github.com/RiceaRaul/gta-v-map-leaflet           ║
║     All credit goes to RiceaRaul and contributors.           ║
╚══════════════════════════════════════════════════════════════╝
]]

--- Check whether map tile assets are installed.
---@return boolean
local function checkMapTiles()
    local resource = GetCurrentResourceName()
    -- Check for a small marker file that only exists when tiles are installed.
    local marker = LoadResourceFile(resource, 'web/public/map/styleAtlas/empty.jpg')
    return marker ~= nil
end

-- ══════════════════════════════════════════════════════════
-- PERMISSION CHECK
-- ══════════════════════════════════════════════════════════

local allowedJobsCache = nil

--- Check if player has MDT access based on job.
---@param src number Player server ID
---@return boolean has_access True if player job is in allowed_jobs
local function hasAccess(src)
    local job = Framework.Server.getJob(src)
    if not job then return false end
    
    if not allowedJobsCache then
        local allowed = Config.MDT.allowed_jobs or {}
        if #allowed == 0 then
            allowedJobsCache = 'all'
        else
            allowedJobsCache = {}
            for i = 1, #allowed do
                allowedJobsCache[string.lower(allowed[i])] = true
            end
        end
    end
    
    if allowedJobsCache == 'all' then return true end
    return allowedJobsCache[string.lower(job)] == true
end

-- ══════════════════════════════════════════════════════════

--- Build a display name from row values.
---@param firstname string|nil
---@param lastname string|nil
---@param fallback string|nil
---@return string
local function buildDisplayName(firstname, lastname, fallback)
    local first = type(firstname) == 'string' and firstname or ''
    local last = type(lastname) == 'string' and lastname or ''
    local full = (first .. ' ' .. last):gsub('^%s+', ''):gsub('%s+$', '')
    if full ~= '' then return full end
    if type(fallback) == 'string' and fallback ~= '' then return fallback end
    return 'Unknown Person'
end

--- Decode json string/table safely.
---@param value any
---@return table|nil
local function decodeObject(value)
    if type(value) == 'table' then return value end
    if type(value) ~= 'string' or value == '' then return nil end
    local ok, decoded = pcall(json.decode, value)
    if ok and type(decoded) == 'table' then
        return decoded
    end
    return nil
end

local MODEL_HASH_NAMES = ((Config.AkteModels or {}).vehicle_model_names) or {}

---@param job any
---@return string
local function normalizeJobName(job)
    if type(job) ~= 'string' then
        return ''
    end

    return string.lower((job:gsub('^%s+', ''):gsub('%s+$', '')))
end

---@param list table|nil
---@param viewerJob string
---@return boolean
local function jobListContains(list, viewerJob)
    if viewerJob == '' or type(list) ~= 'table' then
        return false
    end

    for i = 1, #list do
        if normalizeJobName(list[i]) == viewerJob then
            return true
        end
    end

    return false
end

---@param src number|nil
---@return string
local function getViewerJobName(src)
    if type(src) ~= 'number' then
        return ''
    end

    if not Framework or not Framework.Server or type(Framework.Server.getJob) ~= 'function' then
        return ''
    end

    return normalizeJobName(Framework.Server.getJob(src))
end

---@param modelRoot table
---@param viewerJob string
---@return string|nil
---@return table|nil
local function resolveJobModelOwner(modelRoot, viewerJob)
    if viewerJob == '' then
        return nil, nil
    end

    local jobModels = type(modelRoot.job_models) == 'table' and modelRoot.job_models or {}

    if type(jobModels[viewerJob]) == 'table' then
        return viewerJob, jobModels[viewerJob]
    end

    for ownerJob, config in pairs(jobModels) do
        if type(config) == 'table' then
            if jobListContains(config.jobs, viewerJob) or jobListContains(config.shared_with, viewerJob) then
                return ownerJob, config
            end
        end
    end

    return nil, nil
end

---@param value any
---@return string
local function normalizeAkteScopeName(value)
    local scope = normalizeJobName(type(value) == 'string' and value or '')
    if scope == '' then
        return 'default'
    end

    return scope
end

---@param modelRoot table
---@param src number|nil
---@return string
---@return table|nil
local function resolveAkteScope(modelRoot, src)
    local viewerJob = getViewerJobName(src)
    local ownerJob, config = resolveJobModelOwner(modelRoot, viewerJob)

    if type(config) == 'table' then
        return normalizeAkteScopeName(config.compartment or config.scope or config.group or ownerJob or viewerJob), config
    end

    return normalizeAkteScopeName(viewerJob), nil
end

---@param modelRoot table
---@param kind string
---@param src number|nil
---@return table
local function resolveAkteModelForViewer(modelRoot, kind, src)
    local _, config = resolveAkteScope(modelRoot, src)
    if type(config) == 'table' and type(config[kind]) == 'table' then
        return config[kind]
    end

    if type(modelRoot[kind]) == 'table' then
        return modelRoot[kind]
    end

    return {}
end

---@param jobLabel any
---@param gradeLabel any
---@param gradeNumber any
---@return string
local function formatJobDisplay(jobLabel, gradeLabel, gradeNumber)
    local base = tostring(jobLabel or '')
    local gLabel = tostring(gradeLabel or '')
    local gNumber = gradeNumber ~= nil and tostring(gradeNumber) or ''

    if base == '' and gLabel == '' and gNumber == '' then
        return ''
    end

    local suffix = ''
    if gLabel ~= '' and gNumber ~= '' then
        suffix = ('%s - %s'):format(gLabel, gNumber)
    elseif gLabel ~= '' then
        suffix = gLabel
    elseif gNumber ~= '' then
        suffix = gNumber
    end

    if base ~= '' and suffix ~= '' then
        return ('%s - %s'):format(base, suffix)
    end

    if base ~= '' then
        return base
    end

    return suffix
end

---@param kind string
---@param key string
---@param message string
local function warnAkteDefault(kind, key, message)
    print(('[TG_MDT] Akte default resolver failed (%s.%s): %s'):format(kind, key, message))
end

---@param value any
---@return any, boolean
local function awaitIfNeeded(value)
    if not value then
        return value, true
    end

    if Citizen and Citizen.Await then
        local valueType = type(value)
        if valueType == 'table' or valueType == 'userdata' then
            local okAwait, awaited = pcall(Citizen.Await, value)
            if okAwait then
                return awaited, true
            end
            return nil, false
        end
    end

    return value, true
end

---@param descriptor table
---@param ctx table
---@return any, string|nil
local function resolveExportDefault(descriptor, ctx)
    local resource = descriptor.resource or descriptor.res
    local exportName = descriptor.export or descriptor.name
    if type(resource) ~= 'string' or resource == '' then
        return nil, 'missing export resource'
    end
    if type(exportName) ~= 'string' or exportName == '' then
        return nil, 'missing export name'
    end

    local exportRoot = exports and exports[resource]
    if type(exportRoot) ~= 'table' then
        return nil, ('resource exports not found: %s'):format(resource)
    end

    local exportFn = exportRoot[exportName]
    if type(exportFn) ~= 'function' then
        return nil, ('export not found: %s.%s'):format(resource, exportName)
    end

    local args = descriptor.args
    if type(args) ~= 'table' then
        args = {}
    end

    if descriptor.pass_context == true then
        local withCtx = {}
        for i = 1, #args do
            withCtx[i] = args[i]
        end
        withCtx[#withCtx + 1] = ctx
        args = withCtx
    end

    local okCall, result = pcall(exportFn, table.unpack(args))
    if not okCall then
        return nil, tostring(result)
    end

    if descriptor.await == true then
        local awaited, okAwait = awaitIfNeeded(result)
        if not okAwait then
            return nil, 'await failed for export result'
        end
        result = awaited
    end

    return result, nil
end

---@param kind string
---@param field table
---@return string
local function resolveFieldDefaultValue(kind, field)
    local key = tostring(field.key or 'unknown')
    local defaultValue = field.default

    if defaultValue == nil then
        return ''
    end

    local ctx = {
        kind = kind,
        key = key,
        field = field,
    }

    local resolved = defaultValue
    local defaultType = type(defaultValue)

    if defaultType == 'function' then
        local okCall, result = pcall(defaultValue, ctx)
        if not okCall then
            warnAkteDefault(kind, key, tostring(result))
            return ''
        end

        local awaited, okAwait = awaitIfNeeded(result)
        if not okAwait then
            warnAkteDefault(kind, key, 'await failed for function default result')
            return ''
        end
        resolved = awaited
    elseif defaultType == 'table' and (defaultValue.type == 'export' or defaultValue.export ~= nil) then
        local result, err = resolveExportDefault(defaultValue, ctx)
        if err then
            warnAkteDefault(kind, key, err)
            return tostring(defaultValue.fallback or '')
        end
        resolved = result
    end

    if resolved == nil then
        return ''
    end

    return tostring(resolved)
end

---@param kind string
---@param src number|nil
---@return table
local function getAkteModel(kind, src)
    local models = Config.AkteModels or {}
    return resolveAkteModelForViewer(models, kind, src)
end

---@param kind string
---@param src number|nil
---@return table
local function getAkteFieldMap(kind, src)
    local model = getAkteModel(kind, src)
    local map = {}
    for _, field in ipairs((model.fields or {})) do
        if type(field.key) == 'string' and field.key ~= '' then
            map[field.key] = field
        end
    end
    return map
end

---@param kind string
---@param src number|nil
---@return table
local function defaultAkteFromModel(kind, src)
    local model = getAkteModel(kind, src)
    local defaults = {}
    for _, field in ipairs((model.fields or {})) do
        if type(field.key) == 'string' and field.key ~= '' then
            defaults[field.key] = resolveFieldDefaultValue(kind, field)
        end
    end
    return defaults
end

--- Normalize model value to a human-readable model name.
---@param model any
---@return string
local function normalizeModelName(model)
    if model == nil then return '' end
    local key = tostring(model)
    if key == '' then return '' end
    if MODEL_HASH_NAMES[key] then
        return MODEL_HASH_NAMES[key]
    end
    return key
end

---@param kind string
---@param src number|nil
---@return table
local function getAkteDataFields(kind, src)
    local model = getAkteModel(kind, src)
    return model.data_fields or {}
end

---@param scope string
---@param value string
---@return string
local function buildAkteStorageKey(scope, value)
    return ('%s::%s'):format(normalizeAkteScopeName(scope), tostring(value))
end

---@param storageKey string
---@return string|nil
---@return string
local function splitAkteStorageKey(storageKey)
    if type(storageKey) ~= 'string' then
        return nil, ''
    end

    local scope, rawKey = storageKey:match('^(.-)::(.+)$')
    if scope and rawKey then
        return normalizeAkteScopeName(scope), rawKey
    end

    return nil, storageKey
end

---@param tableName string
---@param columnName string
---@param scope string
---@param value string
---@return table|nil
local function loadAkteRow(tableName, columnName, scope, value)
    local scopedKey = buildAkteStorageKey(scope, value)
    local row = SQL.single(('SELECT data FROM %s WHERE %s = ? LIMIT 1'):format(tableName, columnName), { scopedKey })
    if row then
        return row
    end

    if scopedKey ~= value then
        row = SQL.single(('SELECT data FROM %s WHERE %s = ? LIMIT 1'):format(tableName, columnName), { value })
        if row then
            return row
        end
    end

    return nil
end

---@param kind string
---@param field table
---@param record table
---@return string
local function resolveDataFieldValue(kind, field, record)
    local key = tostring(field.key or 'unknown')
    local fallback = tostring(field.fallback or '')
    local source = field.source

    local ctx = {
        kind = kind,
        key = key,
        field = field,
        record = record or {},
    }

    local resolved = nil
    local sourceType = type(source)

    if sourceType == 'nil' then
        resolved = record and record[key]
    elseif sourceType == 'string' then
        resolved = record and record[source]
    elseif sourceType == 'function' then
        local okCall, result = pcall(source, ctx)
        if not okCall then
            warnAkteDefault(kind, key, tostring(result))
            return fallback
        end

        local awaited, okAwait = awaitIfNeeded(result)
        if not okAwait then
            warnAkteDefault(kind, key, 'await failed for data source function result')
            return fallback
        end
        resolved = awaited
    elseif sourceType == 'table' and (source.type == 'export' or source.export ~= nil) then
        local result, err = resolveExportDefault(source, ctx)
        if err then
            warnAkteDefault(kind, key, err)
            return tostring(source.fallback or fallback)
        end
        resolved = result
    end

    if resolved == nil then
        return fallback
    end

    local str = tostring(resolved)
    if str == '' then
        return fallback
    end

    return str
end

---@param kind 'person'|'vehicle'
---@param record table
---@param src number|nil
---@return table
local function applyDataFields(kind, record, src)
    local output = record or {}
    for _, field in ipairs(getAkteDataFields(kind, src)) do
        if type(field.key) == 'string' and field.key ~= '' then
            output[field.key] = resolveDataFieldValue(kind, field, output)
        end
    end
    return output
end

---@param src number|nil
local function defaultPersonAkte(src)
    return defaultAkteFromModel('person', src)
end

---@param src number|nil
local function defaultVehicleAkte(src)
    return defaultAkteFromModel('vehicle', src)
end

---@param target table
---@param key string
---@param value any
local function setIfDefinedField(target, key, value)
    if target[key] ~= nil and value ~= nil then
        target[key] = tostring(value)
    end
end

---@param kind 'person'|'vehicle'
---@param current table
---@param incoming table
---@param src number|nil
---@return table
local function applyEditableAkteFields(kind, current, incoming, src)
    local fieldMap = getAkteFieldMap(kind, src)
    local merged = current or {}
    if type(incoming) ~= 'table' then
        return merged
    end

    for key, value in pairs(incoming) do
        local field = fieldMap[key]
        if field and field.editable ~= false and type(value) == 'string' then
            merged[key] = value
        end
    end

    return merged
end

---@param kind 'person'|'vehicle'
---@param decoded table|nil
---@param defaults table
---@param src number|nil
---@return table
local function normalizeAkteToSchema(kind, decoded, defaults, src)
    local result = {}
    local fieldMap = getAkteFieldMap(kind, src)

    for key, defaultValue in pairs(defaults or {}) do
        local value = decoded and decoded[key] or nil
        if type(value) == 'string' and value ~= '' then
            result[key] = value
        else
            result[key] = defaultValue
        end
    end

    -- Keep compatibility with future schema changes only for known field keys.
    if type(decoded) == 'table' then
        for key, value in pairs(decoded) do
            if result[key] == nil and fieldMap[key] and type(value) == 'string' then
                result[key] = value
            end
        end
    end

    return result
end

--- Ensure Akte tables exist.
local function ensureAkteTables()
    SQL.execute([[
        CREATE TABLE IF NOT EXISTS tg_mdt_person_akten (
            identifier VARCHAR(80) NOT NULL PRIMARY KEY,
            data LONGTEXT NOT NULL,
            updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
    ]], {})

    SQL.execute([[
        CREATE TABLE IF NOT EXISTS tg_mdt_vehicle_akten (
            plate VARCHAR(20) NOT NULL PRIMARY KEY,
            data LONGTEXT NOT NULL,
            updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
    ]], {})
end

--- Build framework defaults for a person Akte.
---@param identifier string
---@param src number|nil
---@return table
local function buildPersonAkteDefaults(identifier, src)
    local defaults = defaultPersonAkte(src)

    if Framework.name == 'esx' then
        local row = SQL.single([[
            SELECT phone_number, job
            FROM users
            WHERE identifier = ?
            LIMIT 1
        ]], { identifier })

        if row then
            setIfDefinedField(defaults, 'phone', row.phone_number)
            setIfDefinedField(defaults, 'occupation', row.job)
        end
        return defaults
    end

    if Framework.name == 'qbcore' or Framework.name == 'qbox' then
        local row = SQL.single([[
            SELECT charinfo, job
            FROM players
            WHERE citizenid = ?
            LIMIT 1
        ]], { identifier })

        if row then
            local charinfo = decodeObject(row.charinfo)
            setIfDefinedField(defaults, 'phone', charinfo and (charinfo.phone or charinfo.phone_number))
            setIfDefinedField(defaults, 'address', charinfo and (charinfo.address or charinfo.street))

            local jobName = row.job
            if type(row.job) == 'string' and row.job:sub(1, 1) == '{' then
                local ok, decodedJob = pcall(json.decode, row.job)
                if ok and type(decodedJob) == 'table' and decodedJob.name then
                    jobName = decodedJob.name
                end
            end
            setIfDefinedField(defaults, 'occupation', jobName)
        end
    end

    return defaults
end

--- Build framework defaults for a vehicle Akte.
---@param plate string
---@param src number|nil
---@return table
local function buildVehicleAkteDefaults(plate, src)
    local defaults = defaultVehicleAkte(src)

    if Framework.name == 'esx' then
        local row = SQL.single([[
            SELECT vehicle
            FROM owned_vehicles
            WHERE plate = ?
            LIMIT 1
        ]], { plate })

        if row then
            local vehicleData = decodeObject(row.vehicle)
            setIfDefinedField(defaults, 'modelName', normalizeModelName(vehicleData and (vehicleData.modelName or vehicleData.model)))
            setIfDefinedField(defaults, 'color', vehicleData and (vehicleData.color1 or vehicleData.color2))
        end
        return defaults
    end

    if Framework.name == 'qbcore' or Framework.name == 'qbox' then
        local row = SQL.single([[
            SELECT vehicle, state
            FROM player_vehicles
            WHERE plate = ?
            LIMIT 1
        ]], { plate })

        if row then
            local vehicleData = decodeObject(row.vehicle)
            setIfDefinedField(defaults, 'modelName', normalizeModelName(vehicleData and (vehicleData.modelName or vehicleData.model)))
            setIfDefinedField(defaults, 'color', vehicleData and (vehicleData.color1 or vehicleData.color2))

            if row.state ~= nil then
                setIfDefinedField(defaults, 'registrationStatus', tonumber(row.state) == 1 and 'valid' or 'expired')
            end
        end
    end

    return defaults
end

---@param src number|nil
---@return string
local function getAkteScope(src)
    local models = Config.AkteModels or {}
    local scope = resolveAkteScope(models, src)
    return scope
end

---@param src number|nil
---@param requestedScope string|nil
---@return string
local function resolveRequestedAkteScope(src, requestedScope)
    if type(requestedScope) == 'string' and requestedScope ~= '' then
        return normalizeAkteScopeName(requestedScope)
    end

    return getAkteScope(src)
end

---@param identifier string
---@param src number|nil
---@param compartment string|nil
---@return table
local function getPersonAkte(identifier, src, compartment)
    local defaults = buildPersonAkteDefaults(identifier, src)
    local scope = resolveRequestedAkteScope(src, compartment)
    local row = loadAkteRow('tg_mdt_person_akten', 'identifier', scope, identifier)
    local decoded = row and decodeObject(row.data) or nil
    return normalizeAkteToSchema('person', decoded, defaults, src)
end

---@param plate string
---@param src number|nil
---@param compartment string|nil
---@return table
local function getVehicleAkte(plate, src, compartment)
    local defaults = buildVehicleAkteDefaults(plate, src)
    local scope = resolveRequestedAkteScope(src, compartment)
    local row = loadAkteRow('tg_mdt_vehicle_akten', 'plate', scope, plate)
    local decoded = row and decodeObject(row.data) or nil
    return normalizeAkteToSchema('vehicle', decoded, defaults, src)
end

--- Fetch persons from active framework data source.
---@param src number|nil
---@return table
local function getPersonsFromFramework(src)
    if Framework.name == 'esx' then
        local rows = SQL.query([[ 
            SELECT u.identifier, u.firstname, u.lastname, u.dateofbirth, u.sex, u.job, u.job_grade,
                   j.label AS job_label,
                   jg.label AS job_grade_label
            FROM users u
            LEFT JOIN jobs j ON j.name = u.job
            LEFT JOIN job_grades jg ON jg.job_name = u.job AND jg.grade = u.job_grade
            ORDER BY lastname ASC, firstname ASC
        ]], {})

        local persons = {}
        for i = 1, #rows do
            local row = rows[i]
            local identifier = row.identifier or ('esx_%s'):format(i)
            local firstname = row.firstname or ''
            local lastname = row.lastname or ''
            persons[#persons + 1] = {
                identifier = identifier,
                firstname = firstname,
                lastname = lastname,
                name = buildDisplayName(firstname, lastname, identifier),
                dob = row.dateofbirth,
                gender = row.sex,
                job = formatJobDisplay(row.job_label or row.job, row.job_grade_label, row.job_grade),
                address = nil,
            }
            persons[#persons] = applyDataFields('person', persons[#persons], src)
        end
        return persons
    end

    if Framework.name == 'qbcore' or Framework.name == 'qbox' then
        local rows = SQL.query([[ 
            SELECT citizenid, charinfo, job
            FROM players
            ORDER BY citizenid ASC
        ]], {})

        local persons = {}
        for i = 1, #rows do
            local row = rows[i]
            local charinfo = decodeObject(row.charinfo)

            local firstname = charinfo and charinfo.firstname or ''
            local lastname = charinfo and charinfo.lastname or ''
            local identifier = row.citizenid or ('qb_%s'):format(i)
            local jobName = row.job
            local jobLabel = row.job
            local gradeLabel = nil
            local gradeNumber = nil
            if type(row.job) == 'string' and row.job:sub(1, 1) == '{' then
                local ok, decodedJob = pcall(json.decode, row.job)
                if ok and type(decodedJob) == 'table' then
                    if decodedJob.name then
                        jobName = decodedJob.name
                    end
                    if decodedJob.label then
                        jobLabel = decodedJob.label
                    else
                        jobLabel = jobName
                    end

                    local grade = decodedJob.grade
                    if type(grade) == 'table' then
                        gradeLabel = grade.name or grade.label or nil
                        gradeNumber = grade.level or grade.grade or grade.value or nil
                    elseif type(grade) == 'number' or type(grade) == 'string' then
                        gradeNumber = grade
                    end
                end
            end

            persons[#persons + 1] = {
                identifier = identifier,
                firstname = firstname,
                lastname = lastname,
                name = buildDisplayName(firstname, lastname, identifier),
                dob = charinfo and (charinfo.birthdate or charinfo.dob) or nil,
                gender = charinfo and charinfo.gender or nil,
                job = formatJobDisplay(jobLabel, gradeLabel, gradeNumber),
                address = charinfo and (charinfo.address or charinfo.street) or nil,
            }
            persons[#persons] = applyDataFields('person', persons[#persons], src)
        end
        return persons
    end

    -- Standalone fallback: currently online players only.
    local persons = {}
    local online = GetPlayers()
    for i = 1, #online do
        local src = tonumber(online[i])
        if src then
            persons[#persons + 1] = {
                identifier = Framework.Server.getIdentifier(src) or ('src_%s'):format(src),
                firstname = nil,
                lastname = nil,
                name = GetPlayerName(src) or ('Player %s'):format(src),
                dob = nil,
                gender = nil,
                job = Framework.Server.getJob(src),
                address = nil,
            }
            persons[#persons] = applyDataFields('person', persons[#persons], src)
        end
    end
    return persons
end

--- Fetch vehicles from active framework data source.
---@param src number|nil
---@return table
local function getVehiclesFromFramework(src)
    if Framework.name == 'esx' then
        local rows = SQL.query([[
            SELECT ov.plate, ov.owner, ov.vehicle, u.firstname, u.lastname
            FROM owned_vehicles ov
            LEFT JOIN users u ON u.identifier = ov.owner
            ORDER BY ov.plate ASC
        ]], {})

        local vehicles = {}
        for i = 1, #rows do
            local row = rows[i]
            local vehicleData = decodeObject(row.vehicle)
            vehicles[#vehicles + 1] = {
                plate = row.plate or ('NO-PLATE-%s'):format(i),
                ownerIdentifier = row.owner,
                ownerName = buildDisplayName(row.firstname, row.lastname, row.owner),
                model = normalizeModelName(vehicleData and (vehicleData.modelName or vehicleData.model) or nil),
                state = nil,
            }
            vehicles[#vehicles] = applyDataFields('vehicle', vehicles[#vehicles], src)
        end
        return vehicles
    end

    if Framework.name == 'qbcore' or Framework.name == 'qbox' then
        local rows = SQL.query([[
            SELECT pv.plate, pv.citizenid, pv.vehicle, pv.state, p.charinfo
            FROM player_vehicles pv
            LEFT JOIN players p ON p.citizenid = pv.citizenid
            ORDER BY pv.plate ASC
        ]], {})

        local vehicles = {}
        for i = 1, #rows do
            local row = rows[i]
            local vehicleData = decodeObject(row.vehicle)
            local charinfo = decodeObject(row.charinfo)
            local ownerName = buildDisplayName(
                charinfo and charinfo.firstname or nil,
                charinfo and charinfo.lastname or nil,
                row.citizenid
            )

            vehicles[#vehicles + 1] = {
                plate = row.plate or ('NO-PLATE-%s'):format(i),
                ownerIdentifier = row.citizenid,
                ownerName = ownerName,
                model = normalizeModelName(vehicleData and (vehicleData.modelName or vehicleData.model) or nil),
                state = row.state,
            }
            vehicles[#vehicles] = applyDataFields('vehicle', vehicles[#vehicles], src)
        end
        return vehicles
    end

    return {}
end

---@param tableName string
---@param columnName string
---@param value string
---@return string[]
local function getAkteCompartmentsForRow(tableName, columnName, value)
    local validTables = {
        tg_mdt_person_akten = { identifier = true },
        tg_mdt_vehicle_akten = { plate = true }
    }
    
    if not validTables[tableName] or not validTables[tableName][columnName] then
        return {}
    end
    
    local query = ('SELECT %s FROM %s WHERE %s = ? OR %s LIKE ?'):format(columnName, tableName, columnName, columnName)
    local rows = SQL.query(query, { value, ('%%::%s'):format(value) })
    local scopes = {}
    local seen = {}

    for i = 1, #rows do
        local row = rows[i]
        local scope, _ = splitAkteStorageKey(row[columnName])
        if scope and not seen[scope] then
            seen[scope] = true
            scopes[#scopes + 1] = scope
        end
    end

    table.sort(scopes)
    return scopes
end

-- ── Startup ────────────────────────────────────────────
Debug.debug(('Framework: %s'):format(Framework.name))

-- Check database availability
if checkDatabase() then
    Debug.info('Database connection OK')
    ensureAkteTables()
else
    Debug.warn('Database connection failed — some features may not work')
end

-- Check map tiles on startup
if not checkMapTiles() then
    print(MAP_TILE_WARNING)
end

-- ── Map tile missing event (reported by NUI via client) ────
RegisterNetEvent('TG_MDT:mapTilesMissing', function()
    local src = source
    Debug.warn(('Map tiles missing — reported by client %s'):format(tostring(src)))
    print(MAP_TILE_WARNING)
end)


-- ── Persons callback (framework-backed) ────────────────────
lib.callback.register('TG_MDT:getPersons', function(src)
    if not hasAccess(src) then
        Debug.warn(('Unauthorized MDT access attempt: Player %s'):format(src))
        return {}
    end
    
    local persons = getPersonsFromFramework(src)
    Debug.debug(('Persons callback: returned %s records'):format(#persons))
    return persons
end)

-- ── Vehicles callback (framework-backed) ───────────────────
lib.callback.register('TG_MDT:getVehicles', function(src)
    if not hasAccess(src) then
        Debug.warn(('Unauthorized MDT access attempt: Player %s'):format(src))
        return {}
    end
    
    local vehicles = getVehiclesFromFramework(src)
    Debug.debug(('Vehicles callback: returned %s records'):format(#vehicles))
    return vehicles
end)

-- ── Akte callbacks (db-backed + live sync) ────────────────
lib.callback.register('TG_MDT:getAkteBootstrap', function(src)
    if not hasAccess(src) then
        Debug.warn(('Unauthorized akte bootstrap attempt: Player %s'):format(src))
        return { personAkten = {}, vehicleAkten = {} }
    end
    
    local scope = getAkteScope(src)
    local personRows = SQL.query('SELECT identifier, data FROM tg_mdt_person_akten', {})
    local vehicleRows = SQL.query('SELECT plate, data FROM tg_mdt_vehicle_akten', {})

    local personAkten = {}
    for i = 1, #personRows do
        local row = personRows[i]
        local rowScope, rawIdentifier = splitAkteStorageKey(row.identifier)
        if rowScope == scope or (rowScope == nil and personAkten[rawIdentifier] == nil) then
            personAkten[rawIdentifier] = normalizeAkteToSchema('person', decodeObject(row.data), defaultPersonAkte(src), src)
        end
    end

    local vehicleAkten = {}
    for i = 1, #vehicleRows do
        local row = vehicleRows[i]
        local rowScope, rawPlate = splitAkteStorageKey(row.plate)
        if rowScope == scope or (rowScope == nil and vehicleAkten[rawPlate] == nil) then
            vehicleAkten[rawPlate] = normalizeAkteToSchema('vehicle', decodeObject(row.data), defaultVehicleAkte(src), src)
        end
    end

    return {
        personAkten = personAkten,
        vehicleAkten = vehicleAkten,
    }
end)

lib.callback.register('TG_MDT:getAkteCompartments', function(src, kind, value)
    if not hasAccess(src) then
        Debug.warn(('Unauthorized compartments access: Player %s'):format(src))
        return {}
    end
    
    if kind == 'vehicle' and type(value) == 'string' and value ~= '' then
        return getAkteCompartmentsForRow('tg_mdt_vehicle_akten', 'plate', value)
    end

    if kind == 'person' and type(value) == 'string' and value ~= '' then
        return getAkteCompartmentsForRow('tg_mdt_person_akten', 'identifier', value)
    end

    return {}
end)

lib.callback.register('TG_MDT:getPersonAkte', function(src, identifier, compartment)
    if not hasAccess(src) then
        Debug.warn(('Unauthorized person akte access: Player %s'):format(src))
        return defaultPersonAkte(src)
    end
    
    if type(identifier) ~= 'string' or identifier == '' then
        return defaultPersonAkte(src)
    end
    return getPersonAkte(identifier, src, compartment)
end)

lib.callback.register('TG_MDT:savePersonAkte', function(src, identifier, akte, compartment)
    if not hasAccess(src) then
        Debug.warn(('Unauthorized person akte save: Player %s'):format(src))
        return nil
    end
    
    if type(identifier) ~= 'string' or identifier == '' then
        return nil
    end

    local scope = resolveRequestedAkteScope(src, compartment)
    local merged = applyEditableAkteFields('person', getPersonAkte(identifier, src, scope), akte, src)
    local storageKey = buildAkteStorageKey(scope, identifier)

    SQL.execute(
        'INSERT INTO tg_mdt_person_akten (identifier, data) VALUES (?, ?) ON DUPLICATE KEY UPDATE data = VALUES(data)',
        { storageKey, json.encode(merged) }
    )

    TriggerClientEvent('TG_MDT:akteUpdated', -1, {
        kind = 'person',
        identifier = identifier,
        compartment = scope,
        akte = merged,
    })

    return merged
end)

lib.callback.register('TG_MDT:getVehicleAkte', function(src, plate, compartment)
    if not hasAccess(src) then
        Debug.warn(('Unauthorized vehicle akte access: Player %s'):format(src))
        return defaultVehicleAkte(src)
    end
    
    if type(plate) ~= 'string' or plate == '' then
        return defaultVehicleAkte(src)
    end
    return getVehicleAkte(plate, src, compartment)
end)

lib.callback.register('TG_MDT:saveVehicleAkte', function(src, plate, akte, compartment)
    if not hasAccess(src) then
        Debug.warn(('Unauthorized vehicle akte save: Player %s'):format(src))
        return nil
    end
    
    if type(plate) ~= 'string' or plate == '' then
        return nil
    end

    local scope = resolveRequestedAkteScope(src, compartment)
    local merged = applyEditableAkteFields('vehicle', getVehicleAkte(plate, src, scope), akte, src)
    local storageKey = buildAkteStorageKey(scope, plate)

    SQL.execute(
        'INSERT INTO tg_mdt_vehicle_akten (plate, data) VALUES (?, ?) ON DUPLICATE KEY UPDATE data = VALUES(data)',
        { storageKey, json.encode(merged) }
    )

    TriggerClientEvent('TG_MDT:akteUpdated', -1, {
        kind = 'vehicle',
        plate = plate,
        compartment = scope,
        akte = merged,
    })

    return merged
end)
