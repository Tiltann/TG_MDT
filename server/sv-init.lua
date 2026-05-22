-- ============================================================
--  TG_MDT | server/sv-init.lua
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
║     https://drive.proton.me/urls/YZE057HH5G#KN3aoWGvPXb8     ║
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

local EVENT_MAP_TILES_MISSING = 'TG_MDT:mapTilesMissing'
local EVENT_SERVER_JOIN_RADIO = 'TG_MDT:server:joinRadioChannel'
local EVENT_SERVER_LEAVE_RADIO = 'TG_MDT:server:leaveRadioChannel'
local EVENT_PLAYER_DROPPED = 'playerDropped'
local EVENT_CLIENT_AKTE_UPDATED = 'TG_MDT:akteUpdated'
local EVENT_CLIENT_UPDATE_RADIO_MEMBERS = 'TG_MDT:client:updateRadioMembers'
local EVENT_CLIENT_DISPATCH_STATE_CHANGED = 'TG_MDT:dispatchStateChanged'
local EVENT_CLIENT_DISPATCH_HISTORY_CHANGED = 'TG_MDT:dispatchHistoryChanged'

local CALLBACK_GET_PERSONS = 'TG_MDT:getPersons'
local CALLBACK_GET_VEHICLES = 'TG_MDT:getVehicles'
local CALLBACK_GET_AKTE_BOOTSTRAP = 'TG_MDT:getAkteBootstrap'
local CALLBACK_GET_AKTE_COMPARTMENTS = 'TG_MDT:getAkteCompartments'
local CALLBACK_GET_PERSON_AKTE = 'TG_MDT:getPersonAkte'
local CALLBACK_SAVE_PERSON_AKTE = 'TG_MDT:savePersonAkte'
local CALLBACK_GET_VEHICLE_AKTE = 'TG_MDT:getVehicleAkte'
local CALLBACK_SAVE_VEHICLE_AKTE = 'TG_MDT:saveVehicleAkte'
local CALLBACK_REMOVE_AKTE_COMPARTMENT = 'TG_MDT:removeAkteCompartment'
local CALLBACK_GET_NEARBY_AGENCY_PLAYERS = 'TG_MDT:getNearbyAgencyPlayers'
local CALLBACK_SHARE_AKTE_WITH_PLAYER = 'TG_MDT:shareAkteWithPlayer'
local CALLBACK_IS_BOSS = 'TG_MDT:isBoss'
local CALLBACK_GET_LEADERSHIP_MEMBERS = 'TG_MDT:getLeadershipMembers'
local CALLBACK_LEADERSHIP_SET_MEMBER_PERMISSION = 'TG_MDT:leadershipSetMemberPermission'
local CALLBACK_GET_AUDIT_LOGS = 'TG_MDT:getAuditLogs'
local CALLBACK_GET_LAWS = 'TG_MDT:getLaws'
local CALLBACK_SAVE_LAWS = 'TG_MDT:saveLaws'
local CALLBACK_SET_DISPATCH_STATUS = 'TG_MDT:setDispatchStatus'
local CALLBACK_CREATE_DISPATCH = 'TG_MDT:createDispatch'
local CALLBACK_GET_DISPATCH_STATE = 'TG_MDT:getDispatchState'
local CALLBACK_GET_DISPATCH_HISTORY = 'TG_MDT:getDispatchHistory'
local CALLBACK_ASSIGN_DISPATCH_UNIT = 'TG_MDT:assignDispatchUnit'
local CALLBACK_UNASSIGN_DISPATCH_UNIT = 'TG_MDT:unassignDispatchUnit'
local CALLBACK_ASSIGN_DISPATCH_VEHICLE = 'TG_MDT:assignDispatchVehicle'
local CALLBACK_UNASSIGN_DISPATCH_VEHICLE = 'TG_MDT:unassignDispatchVehicle'
local CALLBACK_ACCEPT_DISPATCH_CASE = 'TG_MDT:acceptDispatchCase'
local CALLBACK_CLOSE_DISPATCH_CASE = 'TG_MDT:closeDispatchCase'

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

---@param src number
---@return string[]
local function buildSourceIdentifierCandidates(src)
    local out = {}
    local seen = {}

    local function push(value)
        if type(value) ~= 'string' then
            return
        end

        local normalized = value:gsub('^%s+', ''):gsub('%s+$', '')
        if normalized == '' or seen[normalized] then
            return
        end

        seen[normalized] = true
        out[#out + 1] = normalized
    end

    if Framework and Framework.Server and type(Framework.Server.getIdentifier) == 'function' then
        local ok, identifier = pcall(Framework.Server.getIdentifier, src)
        if ok then
            push(identifier)
        end
    end

    if type(GetPlayerIdentifierByType) == 'function' then
        push(GetPlayerIdentifierByType(src, 'license'))
    end

    if type(GetPlayerIdentifiers) == 'function' then
        local identifiers = GetPlayerIdentifiers(src) or {}
        for i = 1, #identifiers do
            push(identifiers[i])
        end
    end

    return out
end

---@param src number
---@return string
local function getIdentifierDebugSummary(src)
    local candidates = buildSourceIdentifierCandidates(src)
    if #candidates == 0 then
        return 'none'
    end

    return table.concat(candidates, ',')
end

---@param src number
---@return string
---@return number|nil
---@return string
local function resolveEsxJobFromDatabase(src)
    if Framework.name ~= 'esx' then
        return '', nil, ''
    end

    local identifiers = buildSourceIdentifierCandidates(src)
    if #identifiers == 0 then
        return '', nil, ''
    end

    local function queryRow(identifier)
        return SQL.single([[
            SELECT u.job, u.job_grade, jg.name AS grade_name
            FROM users u
            LEFT JOIN job_grades jg ON jg.job_name = u.job AND jg.grade = u.job_grade
            WHERE u.identifier = ?
            LIMIT 1
        ]], { identifier })
    end

    local row = nil
    for i = 1, #identifiers do
        row = queryRow(identifiers[i])
        if type(row) == 'table' then
            break
        end
    end

    if type(row) ~= 'table' then
        for i = 1, #identifiers do
            local identifier = identifiers[i]
            local licensePart = identifier:match('license:[^:]+$') or identifier:match('license:[^%s]+')
            if licensePart then
                row = SQL.single([[
                    SELECT u.job, u.job_grade, jg.name AS grade_name
                    FROM users u
                    LEFT JOIN job_grades jg ON jg.job_name = u.job AND jg.grade = u.job_grade
                    WHERE u.identifier LIKE ?
                    LIMIT 1
                ]], { ('%%' .. licensePart) })

                if type(row) == 'table' then
                    break
                end
            end
        end
    end

    if type(row) ~= 'table' then
        return '', nil, ''
    end

    local jobName = type(row.job) == 'string' and string.lower((row.job:gsub('^%s+', ''):gsub('%s+$', ''))) or ''
    local gradeLevel = tonumber(row.job_grade)
    local gradeName = type(row.grade_name) == 'string' and string.lower((row.grade_name:gsub('^%s+', ''):gsub('%s+$', ''))) or ''

    return jobName, gradeLevel, gradeName
end

---@param src number
---@return string|nil
local function resolveAccessJobName(src)
    if not Framework or not Framework.Server then
        return nil
    end

    if type(Framework.Server.getJob) == 'function' then
        local okJob, job = pcall(Framework.Server.getJob, src)
        if okJob and type(job) == 'string' and job ~= '' then
            return string.lower(job)
        end
    end

    if type(Framework.Server.getJobData) == 'function' then
        local okJobData, jobData = pcall(Framework.Server.getJobData, src)
        if okJobData and type(jobData) == 'table' and type(jobData.name) == 'string' and jobData.name ~= '' then
            return string.lower(jobData.name)
        end
    end

    if type(Framework.Server.getPlayer) == 'function' then
        local okPlayer, player = pcall(Framework.Server.getPlayer, src)
        if okPlayer and type(player) == 'table' then
            local rawJob = nil
            if type(player.job) == 'table' then
                rawJob = player.job
            elseif type(player.PlayerData) == 'table' and type(player.PlayerData.job) == 'table' then
                rawJob = player.PlayerData.job
            end

            if type(rawJob) == 'table' and type(rawJob.name) == 'string' and rawJob.name ~= '' then
                return string.lower(rawJob.name)
            end
        end
    end

    local dbJobName = select(1, resolveEsxJobFromDatabase(src))
    if dbJobName ~= '' then
        return dbJobName
    end

    return nil
end

--- Check if player has MDT access based on job.
---@param src number Player server ID
---@return boolean has_access True if player job is in allowed_jobs
local function hasAccess(src)
    local job = resolveAccessJobName(src)
    if not job then
        Debug.debug(('[access] src=%s denied=no_job_resolved identifiers=%s'):format(tostring(src), getIdentifierDebugSummary(src)))
        return false
    end
    
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
    return allowedJobsCache[job] == true
end

---@param value any
---@return string
local function normalizeRankName(value)
    if type(value) ~= 'string' then
        return ''
    end

    return string.lower((value:gsub('^%s+', ''):gsub('%s+$', '')))
end

---@param value any
---@return string
local function normalizeBossJobName(value)
    if type(value) ~= 'string' then
        return ''
    end

    return string.lower((value:gsub('^%s+', ''):gsub('%s+$', '')))
end

---@param value any
---@return number|nil
local function resolveGradeLevel(value)
    if type(value) == 'number' or type(value) == 'string' then
        return tonumber(value)
    end

    if type(value) == 'table' then
        return tonumber(value.level or value.grade or value.value or value.id)
    end

    return nil
end

---@param jobName string
---@return string|nil
---@return table|nil
local function resolveDepartmentByJobName(jobName)
    local departments = Config and Config.MDT and Config.MDT.departments
    if type(departments) ~= 'table' or jobName == '' then
        return nil, nil
    end

    for deptKey, deptCfg in pairs(departments) do
        if type(deptCfg) == 'table' and type(deptCfg.jobs) == 'table' then
            for i = 1, #deptCfg.jobs do
                if normalizeBossJobName(deptCfg.jobs[i]) == jobName then
                    return normalizeBossJobName(deptKey), deptCfg
                end
            end
        end
    end

    return nil, nil
end

---@param src number
---@return string
---@return string
---@return number|nil
---@return number|nil
local function resolvePlayerBossContext(src)
    local jobName = ''
    local gradeName = ''
    local gradeLevel = nil
    local gradeCount = nil

    if Framework and Framework.Server then
        if type(Framework.Server.getJob) == 'function' then
            local okJob, resolvedJob = pcall(Framework.Server.getJob, src)
            if okJob and type(resolvedJob) == 'string' then
                jobName = normalizeBossJobName(resolvedJob)
            end
        end

        if type(Framework.Server.getJobData) == 'function' then
            local okJobData, jobData = pcall(Framework.Server.getJobData, src)
            if okJobData and type(jobData) == 'table' then
                if jobName == '' and type(jobData.name) == 'string' then
                    jobName = normalizeBossJobName(jobData.name)
                end
                if type(jobData.grade_name) == 'string' and jobData.grade_name ~= '' then
                    gradeName = normalizeRankName(jobData.grade_name)
                end
                if gradeLevel == nil then
                    gradeLevel = resolveGradeLevel(jobData.grade)
                end
                if gradeLevel == nil then
                    gradeLevel = resolveGradeLevel(jobData.grade_level)
                end
                if gradeLevel == nil then
                    gradeLevel = resolveGradeLevel(jobData.gradeLevel)
                end
                if type(jobData.grade_count) == 'number' or type(jobData.grade_count) == 'string' then
                    gradeCount = tonumber(jobData.grade_count)
                end
            end
        end

        if type(Framework.Server.getPlayer) == 'function' then
            local okPlayer, player = pcall(Framework.Server.getPlayer, src)
            if okPlayer and type(player) == 'table' then
                local job = nil
                if type(player.job) == 'table' then
                    job = player.job
                elseif type(player.PlayerData) == 'table' and type(player.PlayerData.job) == 'table' then
                    job = player.PlayerData.job
                end

                if type(job) == 'table' then
                    local jobNameCandidate = type(job.name) == 'string' and normalizeBossJobName(job.name) or ''
                    if jobName == '' and jobNameCandidate ~= '' then
                        jobName = jobNameCandidate
                    end

                    if type(job.grade) == 'table' then
                        if gradeName == '' then
                            gradeName = normalizeRankName(job.grade.label or job.grade.name)
                        end
                        if gradeLevel == nil then
                            gradeLevel = resolveGradeLevel(job.grade)
                        end
                    else
                        if gradeName == '' then
                            gradeName = normalizeRankName(job.grade_label or job.grade_name)
                        end
                        if gradeLevel == nil then
                            gradeLevel = resolveGradeLevel(job.grade)
                        end
                    end

                    if gradeLevel == nil then
                        gradeLevel = resolveGradeLevel(job.grade_level or job.gradeLevel)
                    end

                    if gradeCount == nil and type(job.grades) == 'table' then
                        local total = 0
                        for _ in pairs(job.grades) do
                            total = total + 1
                        end
                        if total > 0 then
                            gradeCount = total
                        end
                    end
                end
            end
        end
    end

    if jobName == '' or gradeLevel == nil or gradeName == '' then
        local dbJobName, dbGradeLevel, dbGradeName = resolveEsxJobFromDatabase(src)
        if jobName == '' and dbJobName ~= '' then
            jobName = dbJobName
        end
        if gradeLevel == nil and dbGradeLevel ~= nil then
            gradeLevel = dbGradeLevel
        end
        if gradeName == '' and dbGradeName ~= '' then
            gradeName = dbGradeName
        end
    end

    return jobName, gradeName, gradeLevel, gradeCount
end

---@param bossCfg table|nil
---@param jobName string
---@return table|nil
local function resolveBossRuleForJob(bossCfg, jobName)
    if type(bossCfg) ~= 'table' then
        return nil
    end

    local byJobs = type(bossCfg.jobs) == 'table' and bossCfg.jobs or {}

    if type(byJobs[jobName]) == 'table' then
        return byJobs[jobName]
    end

    for configuredJob, rule in pairs(byJobs) do
        if normalizeBossJobName(configuredJob) == jobName and type(rule) == 'table' then
            return rule
        end
    end

    if type(bossCfg.default) == 'table' then
        return bossCfg.default
    end

    return nil
end

---@param src number
---@return boolean
---@return string|nil
---@return string
local function isBossSource(src)
    local jobName, gradeName, gradeLevel, gradeCount = resolvePlayerBossContext(src)
    local departmentKey, departmentCfg = resolveDepartmentByJobName(jobName)
    local fallbackTopTwo = gradeLevel ~= nil and gradeLevel >= (gradeCount and math.max(0, gradeCount - 2) or 2)

    local function logBossDecision(decision, reason)
        Debug.debug(('[leadership:isBoss] src=%s job=%s agency=%s gradeName=%s gradeLevel=%s gradeCount=%s decision=%s reason=%s'):format(
            tostring(src),
            tostring(jobName),
            tostring(departmentKey),
            tostring(gradeName),
            tostring(gradeLevel),
            tostring(gradeCount),
            tostring(decision),
            tostring(reason)
        ))
    end

    if type(departmentCfg) ~= 'table' then
        logBossDecision(fallbackTopTwo, 'no_department_cfg_fallback_top2')
        return fallbackTopTwo, nil, jobName
    end

    local rule = resolveBossRuleForJob(departmentCfg.boss, jobName)
    if type(rule) ~= 'table' then
        logBossDecision(fallbackTopTwo, 'no_rule_fallback_top2')
        return fallbackTopTwo, departmentKey, jobName
    end

    local matched = false

    local names = {}
    if type(rule.rank_name) == 'string' then
        names[#names + 1] = rule.rank_name
    elseif type(rule.rank_name) == 'table' then
        for i = 1, #rule.rank_name do
            names[#names + 1] = rule.rank_name[i]
        end
    end
    if type(rule.rank_names) == 'table' then
        for i = 1, #rule.rank_names do
            names[#names + 1] = rule.rank_names[i]
        end
    end

    -- Single-mode rule resolution: rank_name OR min_grade OR last (never combined).
    -- Priority: rank_name > min_grade > last.
    if #names > 0 then
        local normalizedNames = {}
        for i = 1, #names do
            normalizedNames[#normalizedNames + 1] = normalizeRankName(names[i])
        end

        for i = 1, #names do
            if normalizeRankName(names[i]) == gradeName and gradeName ~= '' then
                matched = true
                break
            end
        end

        logBossDecision(matched, ('rule=rank_name configured=%s'):format(table.concat(normalizedNames, ',')))

        return matched, departmentKey, jobName
    end

    local minGrade = tonumber(rule.min_grade)
    if minGrade ~= nil then
        if gradeLevel ~= nil and gradeLevel >= minGrade then
            matched = true
        end

        logBossDecision(matched, ('rule=min_grade configured=%s'):format(tostring(minGrade)))

        return matched, departmentKey, jobName
    end

    local lastRanks = tonumber(rule.last)
    if lastRanks ~= nil and lastRanks > 0 then
        if gradeLevel ~= nil and gradeCount ~= nil then
            local threshold = math.max(0, gradeCount - lastRanks)
            if gradeLevel >= threshold then
                matched = true
            end
        end

        logBossDecision(matched, ('rule=last configured=%s'):format(tostring(lastRanks)))

        return matched, departmentKey, jobName
    end

    logBossDecision(false, 'rule_config_present_but_no_valid_mode')
    return false, departmentKey, jobName
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

    return normalizeJobName(resolveAccessJobName(src) or '')
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
    
    SQL.execute([[
        CREATE INDEX IF NOT EXISTS idx_person_akten_identifier 
        ON tg_mdt_person_akten(identifier)
    ]], {})
    
    SQL.execute([[
        CREATE INDEX IF NOT EXISTS idx_vehicle_akten_plate 
        ON tg_mdt_vehicle_akten(plate)
    ]], {})

    SQL.execute([[
        CREATE TABLE IF NOT EXISTS tg_mdt_akte_player_shares (
            id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
            kind VARCHAR(16) NOT NULL,
            record_key VARCHAR(80) NOT NULL,
            source_scope VARCHAR(64) NOT NULL,
            target_identifier VARCHAR(80) NOT NULL,
            granted_by_identifier VARCHAR(80) NULL,
            created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
            UNIQUE KEY uniq_akte_player_share (kind, record_key, source_scope, target_identifier)
        )
    ]], {})

    SQL.execute([[
        CREATE INDEX IF NOT EXISTS idx_akte_player_share_lookup
        ON tg_mdt_akte_player_shares(kind, record_key, target_identifier)
    ]], {})

    SQL.execute([[
        CREATE TABLE IF NOT EXISTS tg_mdt_member_permissions (
            id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
            identifier VARCHAR(80) NOT NULL,
            agency VARCHAR(64) NOT NULL,
            permissions LONGTEXT NOT NULL,
            updated_by VARCHAR(80) NULL,
            updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            UNIQUE KEY uniq_member_permissions (identifier, agency)
        )
    ]], {})

    SQL.execute([[
        CREATE TABLE IF NOT EXISTS tg_mdt_audit_logs (
            id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
            scope VARCHAR(64) NOT NULL,
            action VARCHAR(64) NOT NULL,
            actor_identifier VARCHAR(80) NULL,
            actor_name VARCHAR(128) NULL,
            target_identifier VARCHAR(80) NULL,
            target_name VARCHAR(128) NULL,
            details LONGTEXT NULL,
            created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_mdt_audit_scope_time (scope, created_at),
            INDEX idx_mdt_audit_action (action)
        )
    ]], {})

    SQL.execute([[
        CREATE TABLE IF NOT EXISTS tg_mdt_laws (
            scope VARCHAR(64) NOT NULL PRIMARY KEY,
            content LONGTEXT NOT NULL,
            updated_by VARCHAR(80) NULL,
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

---@param src number|nil
---@return string
local function getPlayerIdentifier(src)
    if type(src) ~= 'number' then
        return ''
    end

    if not Framework or not Framework.Server or type(Framework.Server.getIdentifier) ~= 'function' then
        return ''
    end

    local identifier = Framework.Server.getIdentifier(src)
    if type(identifier) ~= 'string' then
        return ''
    end

    identifier = identifier:gsub('^%s+', ''):gsub('%s+$', '')
    return identifier
end

---@param kind string
---@param value string
---@return string
local function normalizeAkteShareRecordKey(kind, value)
    local normalized = string.lower((type(value) == 'string' and value or ''):gsub('^%s+', ''):gsub('%s+$', ''))

    if kind == 'vehicle' then
        return normalized:sub(1, 20)
    end

    return normalized:sub(1, 80)
end

---@param src number
---@param kind 'person'|'vehicle'
---@param value string
---@return string|nil
local function getSharedAkteScopeForPlayer(src, kind, value)
    local targetIdentifier = getPlayerIdentifier(src)
    if targetIdentifier == '' then
        return nil
    end

    local recordKey = normalizeAkteShareRecordKey(kind, value)
    if recordKey == '' then
        return nil
    end

    local row = SQL.single([[
        SELECT source_scope
        FROM tg_mdt_akte_player_shares
        WHERE kind = ?
          AND record_key = ?
          AND target_identifier = ?
        ORDER BY id DESC
        LIMIT 1
    ]], { kind, recordKey, targetIdentifier })

    if not row or type(row.source_scope) ~= 'string' or row.source_scope == '' then
        return nil
    end

    return normalizeAkteScopeName(row.source_scope)
end

---@param sourceSrc number
---@param targetSrc number
---@param maxDistance number
---@return boolean
local function isPlayerNearby(sourceSrc, targetSrc, maxDistance)
    local sourcePed = GetPlayerPed(sourceSrc)
    local targetPed = GetPlayerPed(targetSrc)
    if not sourcePed or sourcePed <= 0 or not targetPed or targetPed <= 0 then
        return false
    end

    local sourceCoords = GetEntityCoords(sourcePed)
    local targetCoords = GetEntityCoords(targetPed)
    if not sourceCoords or not targetCoords then
        return false
    end

    local dx = (sourceCoords.x or 0.0) - (targetCoords.x or 0.0)
    local dy = (sourceCoords.y or 0.0) - (targetCoords.y or 0.0)
    local dz = (sourceCoords.z or 0.0) - (targetCoords.z or 0.0)
    local distance = math.sqrt((dx * dx) + (dy * dy) + (dz * dz))
    return distance <= maxDistance
end

---@param identifier string
---@param src number|nil
---@param compartment string|nil
---@return table
local function getPersonAkte(identifier, src, compartment)
    local defaults = buildPersonAkteDefaults(identifier, src)
    local scope = resolveRequestedAkteScope(src, compartment)
    local row = loadAkteRow('tg_mdt_person_akten', 'identifier', scope, identifier)

    if not row and type(src) == 'number' then
        local sharedScope = getSharedAkteScopeForPlayer(src, 'person', identifier)
        if sharedScope and sharedScope ~= '' and sharedScope ~= scope then
            row = loadAkteRow('tg_mdt_person_akten', 'identifier', sharedScope, identifier)
        end
    end

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

    if not row and type(src) == 'number' then
        local sharedScope = getSharedAkteScopeForPlayer(src, 'vehicle', plate)
        if sharedScope and sharedScope ~= '' and sharedScope ~= scope then
            row = loadAkteRow('tg_mdt_vehicle_akten', 'plate', sharedScope, plate)
        end
    end

    local decoded = row and decodeObject(row.data) or nil
    return normalizeAkteToSchema('vehicle', decoded, defaults, src)
end

--- Export bridge helper: fetch a person case by identifier.
---@param identifier string
---@param src number|nil
---@param compartment string|nil
---@return table
function TG_MDT_GetPersonCaseByIdentifier(identifier, src, compartment)
    if type(identifier) ~= 'string' or identifier == '' then
        return defaultPersonAkte(src)
    end
    return getPersonAkte(identifier, src, compartment)
end

--- Export bridge helper: fetch a vehicle case by plate.
---@param plate string
---@param src number|nil
---@param compartment string|nil
---@return table
function TG_MDT_GetVehicleCaseByPlate(plate, src, compartment)
    if type(plate) ~= 'string' or plate == '' then
        return defaultVehicleAkte(src)
    end
    return getVehicleAkte(plate, src, compartment)
end

local personsCache = { data = nil, timestamp = 0 }
local vehiclesCache = { data = nil, timestamp = 0 }
local CACHE_TTL = 30000

local saveRateLimiter = {}
local SAVE_COOLDOWN = 1000

local function canSave(src)
    local now = GetGameTimer()
    local last = saveRateLimiter[src] or 0
    
    if (now - last) < SAVE_COOLDOWN then
        return false
    end
    
    saveRateLimiter[src] = now
    return true
end

local function safeJsonEncode(data)
    if type(data) ~= 'table' then 
        return '{}' 
    end
    
    local ok, encoded = pcall(json.encode, data)
    if not ok then
        Debug.error('JSON encode failed - circular reference or invalid data')
        return '{}'
    end
    
    if #encoded > 65535 then
        Debug.warn('Akte data exceeds size limit, rejecting save')
        return nil
    end
    
    return encoded
end

--- Fetch persons from active framework data source.
---@param src number|nil
---@return table
local function getPersonsFromFramework(src)
    local now = GetGameTimer()
    if personsCache.data and #personsCache.data > 0 and (now - personsCache.timestamp) < CACHE_TTL then
        return personsCache.data
    end
    
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
        personsCache.data = persons
        personsCache.timestamp = now

        if #persons == 0 then
            Debug.warn('[persons] ESX query returned 0 records. Check users/jobs/job_grades tables and identifiers.')
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
        personsCache.data = persons
        personsCache.timestamp = now

        if #persons == 0 then
            Debug.warn('[persons] QB query returned 0 records. Check players table, charinfo/job JSON, and database connection.')
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
    personsCache.data = persons
    personsCache.timestamp = now

    if #persons == 0 then
        Debug.warn('[persons] Standalone fallback has 0 online players.')
    end

    return persons
end

--- Fetch vehicles from active framework data source.
---@param src number|nil
---@return table
local function getVehiclesFromFramework(src)
    local now = GetGameTimer()
    if vehiclesCache.data and #vehiclesCache.data > 0 and (now - vehiclesCache.timestamp) < CACHE_TTL then
        return vehiclesCache.data
    end
    
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
            local ownerName = buildDisplayName(row.firstname, row.lastname, row.owner)
            local modelName = normalizeModelName(vehicleData and (vehicleData.modelName or vehicleData.displayName or vehicleData.name or vehicleData.model) or nil)
            vehicles[#vehicles + 1] = {
                plate = row.plate or ('NO-PLATE-%s'):format(i),
                ownerIdentifier = row.owner,
                ownerName = ownerName,
                owner = ownerName,
                halter = ownerName,
                model = modelName,
                modelName = modelName,
                state = nil,
            }
            vehicles[#vehicles] = applyDataFields('vehicle', vehicles[#vehicles], src)
        end
        vehiclesCache.data = vehicles
        vehiclesCache.timestamp = now

        if #vehicles == 0 then
            Debug.warn('[vehicles] ESX query returned 0 records. Check owned_vehicles and owner links.')
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
            local modelName = normalizeModelName(vehicleData and (vehicleData.modelName or vehicleData.displayName or vehicleData.name or vehicleData.model) or nil)

            vehicles[#vehicles + 1] = {
                plate = row.plate or ('NO-PLATE-%s'):format(i),
                ownerIdentifier = row.citizenid,
                ownerName = ownerName,
                owner = ownerName,
                halter = ownerName,
                model = modelName,
                modelName = modelName,
                state = row.state,
            }
            vehicles[#vehicles] = applyDataFields('vehicle', vehicles[#vehicles], src)
        end
        vehiclesCache.data = vehicles
        vehiclesCache.timestamp = now

        if #vehicles == 0 then
            Debug.warn('[vehicles] QB query returned 0 records. Check player_vehicles and citizenid links.')
        end

        return vehicles
    end

    vehiclesCache.data = {}
    vehiclesCache.timestamp = now
    Debug.warn('[vehicles] No provider available for current framework, returning 0 records.')
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
RegisterNetEvent(EVENT_MAP_TILES_MISSING, function()
    local src = source
    Debug.warn(('Map tiles missing — reported by client %s'):format(tostring(src)))
    print(MAP_TILE_WARNING)
end)


-- ── Persons callback (framework-backed) ────────────────────
lib.callback.register(CALLBACK_GET_PERSONS, function(src)
    if not hasAccess(src) then
        Debug.warn(('Unauthorized MDT access attempt: Player %s'):format(src))
        return {}
    end
    
    local persons = getPersonsFromFramework(src)
    Debug.debug(('Persons callback: returned %s records'):format(#persons))
    return persons
end)

-- ── Vehicles callback (framework-backed) ───────────────────
lib.callback.register(CALLBACK_GET_VEHICLES, function(src)
    if not hasAccess(src) then
        Debug.warn(('Unauthorized MDT access attempt: Player %s'):format(src))
        return {}
    end
    
    local vehicles = getVehiclesFromFramework(src)
    Debug.debug(('Vehicles callback: returned %s records'):format(#vehicles))
    return vehicles
end)

local akteBootstrapCache = {}
local AKTE_CACHE_TTL = 60000

-- ── Akte callbacks (db-backed + live sync) ────────────────
lib.callback.register(CALLBACK_GET_AKTE_BOOTSTRAP, function(src)
    if not hasAccess(src) then
        Debug.warn(('Unauthorized akte bootstrap attempt: Player %s'):format(src))
        return { personAkten = {}, vehicleAkten = {} }
    end
    
    local scope = getAkteScope(src)
    local now = GetGameTimer()
    
    if akteBootstrapCache[scope] and (now - akteBootstrapCache[scope].timestamp) < AKTE_CACHE_TTL then
        return akteBootstrapCache[scope].data
    end
    
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

    local result = {
        personAkten = personAkten,
        vehicleAkten = vehicleAkten,
    }
    
    akteBootstrapCache[scope] = {
        data = result,
        timestamp = now
    }
    
    return result
end)

lib.callback.register(CALLBACK_GET_AKTE_COMPARTMENTS, function(src, kind, value)
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

---@param src number
---@return string
---@return string
---@return string
local function getLeadershipScopeInfo(src)
    local _, agency, job = isBossSource(src)
    local scope = normalizeJobName(agency)
    if scope == '' then
        scope = normalizeJobName(job)
    end
    if scope == '' then
        scope = 'global'
    end

    return scope, normalizeJobName(agency), normalizeJobName(job)
end

---@param identifier string
---@param agency string
---@return table
local function getMemberPermissions(identifier, agency)
    if identifier == '' or agency == '' then
        return {}
    end

    local row = SQL.single('SELECT permissions FROM tg_mdt_member_permissions WHERE identifier = ? AND agency = ? LIMIT 1', { identifier, agency })
    local decoded = row and decodeObject(row.permissions) or nil
    return type(decoded) == 'table' and decoded or {}
end

---@param payload table|nil
---@param defaultPageSize number
---@param maxPageSize number
---@return number page
---@return number pageSize
---@return number offset
local function normalizePagination(payload, defaultPageSize, maxPageSize)
    local body = type(payload) == 'table' and payload or {}
    local page = math.floor(tonumber(body.page) or 1)
    if page < 1 then
        page = 1
    end

    local pageSize = math.floor(tonumber(body.pageSize) or tonumber(body.limit) or defaultPageSize)
    if pageSize < 1 then
        pageSize = defaultPageSize
    end
    if pageSize > maxPageSize then
        pageSize = maxPageSize
    end

    local offset = tonumber(body.offset)
    if type(offset) ~= 'number' then
        offset = (page - 1) * pageSize
    end

    if offset < 0 then
        offset = 0
    end

    return page, pageSize, math.floor(offset)
end

---@param scope string
---@param actionFilter string
---@param search string
---@return string whereClause
---@return table params
local function buildAuditLogFilters(scope, actionFilter, search)
    local parts = { 'scope = ?' }
    local params = { scope }

    if actionFilter ~= '' and actionFilter ~= 'all' then
        parts[#parts + 1] = 'action = ?'
        params[#params + 1] = actionFilter
    end

    if search ~= '' then
        parts[#parts + 1] = [[
            (
                LOWER(actor_name) LIKE ? OR
                LOWER(COALESCE(target_name, '')) LIKE ? OR
                LOWER(COALESCE(details, '')) LIKE ? OR
                LOWER(action) LIKE ?
            )
        ]]
        local needle = ('%%%s%%'):format(search)
        params[#params + 1] = needle
        params[#params + 1] = needle
        params[#params + 1] = needle
        params[#params + 1] = needle
    end

    return table.concat(parts, ' AND '), params
end

---@param src number
---@return string
local function getActorDisplayName(src)
    local playerName = GetPlayerName(src)
    if type(playerName) == 'string' and playerName ~= '' then
        return playerName
    end
    return ('Player %s'):format(tostring(src))
end

---@param scope string
---@param action string
---@param actorSrc number
---@param targetIdentifier string|nil
---@param targetName string|nil
---@param details table|string|nil
local function appendLeadershipAuditLog(scope, action, actorSrc, targetIdentifier, targetName, details)
    if scope == '' then
        scope = 'global'
    end

    local actorIdentifier = getPlayerIdentifier(actorSrc)
    local actorName = getActorDisplayName(actorSrc)
    local encodedDetails = nil
    if type(details) == 'table' then
        encodedDetails = safeJsonEncode(details)
    elseif type(details) == 'string' and details ~= '' then
        encodedDetails = details
    end

    SQL.execute([[
        INSERT INTO tg_mdt_audit_logs (scope, action, actor_identifier, actor_name, target_identifier, target_name, details)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    ]], {
        scope,
        action,
        actorIdentifier ~= '' and actorIdentifier or nil,
        actorName,
        type(targetIdentifier) == 'string' and targetIdentifier ~= '' and targetIdentifier or nil,
        type(targetName) == 'string' and targetName ~= '' and targetName or nil,
        encodedDetails,
    })
end

---@param src number
---@param agencyKey string
---@return table
local function buildLeadershipGrades(src, agencyKey)
    local out = {}
    local seen = {}

    if Framework.name == 'esx' and agencyKey ~= '' then
        local departments = Config and Config.MDT and Config.MDT.departments or {}
        local dept = type(departments) == 'table' and departments[agencyKey] or nil
        local jobs = type(dept) == 'table' and type(dept.jobs) == 'table' and dept.jobs or {}

        for i = 1, #jobs do
            local job = normalizeJobName(jobs[i])
            if job ~= '' then
                local rows = SQL.query('SELECT grade, name, label FROM job_grades WHERE job_name = ? ORDER BY grade ASC', { job })
                for j = 1, #rows do
                    local row = rows[j]
                    local level = tonumber(row.grade)
                    if level ~= nil then
                        local key = tostring(level)
                        if not seen[key] then
                            seen[key] = true
                            out[#out + 1] = {
                                level = level,
                                label = type(row.label) == 'string' and row.label ~= '' and row.label or (type(row.name) == 'string' and row.name or ('Grade %s'):format(level)),
                                name = type(row.name) == 'string' and row.name or ('grade_%s'):format(level),
                            }
                        end
                    end
                end
            end
        end
    end

    if #out == 0 then
        for level = 0, 12 do
            out[#out + 1] = { level = level, label = ('Grade %s'):format(level), name = ('grade_%s'):format(level) }
        end
    end

    table.sort(out, function(a, b)
        return (a.level or 0) < (b.level or 0)
    end)

    return out
end

lib.callback.register(CALLBACK_IS_BOSS, function(src)
    if not hasAccess(src) then
        Debug.debug(('[leadership:canOpen] src=%s denied=no_access'):format(tostring(src)))
        return {
            isBoss = false,
            agency = nil,
            job = '',
        }
    end

    local boss, agency, jobName = isBossSource(src)
    Debug.debug(('[leadership:canOpen] src=%s canOpenLeadership=%s agency=%s job=%s'):format(
        tostring(src),
        tostring(boss == true),
        tostring(agency),
        tostring(jobName)
    ))
    return {
        isBoss = boss == true,
        agency = agency,
        job = jobName,
    }
end)

lib.callback.register(CALLBACK_GET_LEADERSHIP_MEMBERS, function(src)
    if not hasAccess(src) then
        Debug.warn(('Unauthorized leadership members access: Player %s'):format(src))
        return { members = {}, grades = {} }
    end

    local boss, agencyKey = isBossSource(src)
    if not boss then
        Debug.warn(('Blocked leadership members access (not boss): Player %s'):format(src))
        return { members = {}, grades = {} }
    end

    local members = {}
    local agencyScope = normalizeJobName(agencyKey)
    local players = GetPlayers()
    for i = 1, #players do
        local targetSrc = tonumber(players[i])
        if targetSrc and hasAccess(targetSrc) then
            local targetBoss, targetAgency = isBossSource(targetSrc)
            local includeMember = agencyKey == nil or agencyKey == '' or targetAgency == agencyKey
            if includeMember then
                local data = buildPlayerRadioData(targetSrc)
                data.isBoss = targetBoss == true

                local identifier = getPlayerIdentifier(targetSrc)
                local jobData = Framework and Framework.Server and type(Framework.Server.getJobData) == 'function'
                    and Framework.Server.getJobData(targetSrc)
                    or {}
                local gradeLevel = tonumber(jobData and jobData.grade)
                if gradeLevel == nil and type(jobData and jobData.grade) == 'table' then
                    gradeLevel = tonumber(jobData.grade.level or jobData.grade.grade or jobData.grade.value)
                end
                gradeLevel = gradeLevel or 0
                local gradeLabel = type(jobData and jobData.grade_name) == 'string' and jobData.grade_name ~= ''
                    and jobData.grade_name
                    or (data.gradeDisplay ~= '' and data.gradeDisplay or ('Grade %s'):format(gradeLevel))

                members[#members + 1] = {
                    identifier = identifier ~= '' and identifier or ('src:%s'):format(targetSrc),
                    name = data.name,
                    grade = gradeLevel,
                    gradeLabel = gradeLabel,
                    online = true,
                    source = targetSrc,
                    status = data.status,
                    radioCode = data.radioCode,
                    avatarUrl = data.avatarUrl,
                    permissions = getMemberPermissions(identifier, agencyScope ~= '' and agencyScope or 'global'),
                }
            end
        end
    end

    table.sort(members, function(a, b)
        return (a.name or '') < (b.name or '')
    end)

    return {
        members = members,
        grades = buildLeadershipGrades(src, agencyScope),
    }
end)

lib.callback.register(CALLBACK_LEADERSHIP_SET_MEMBER_PERMISSION, function(src, payload)
    if not hasAccess(src) then
        Debug.warn(('Unauthorized leadership permission update: Player %s'):format(src))
        return false
    end

    local boss = isBossSource(src)
    if not boss then
        Debug.warn(('Blocked leadership permission update (not boss): Player %s'):format(src))
        return false
    end

    if type(payload) ~= 'table' then
        return { ok = false, reason = 'invalid_payload' }
    end

    local targetIdentifier = type(payload.identifier) == 'string' and payload.identifier:gsub('^%s+', ''):gsub('%s+$', '') or ''
    if targetIdentifier == '' then
        return { ok = false, reason = 'missing_identifier' }
    end

    local scope, agencyScope = getLeadershipScopeInfo(src)
    local targetName = type(payload.name) == 'string' and payload.name or nil

    if type(payload.permissions) == 'table' then
        local encoded = safeJsonEncode(payload.permissions)
        if not encoded then
            return { ok = false, reason = 'permissions_encode_failed' }
        end

        SQL.execute([[
            INSERT INTO tg_mdt_member_permissions (identifier, agency, permissions, updated_by)
            VALUES (?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE permissions = VALUES(permissions), updated_by = VALUES(updated_by), updated_at = CURRENT_TIMESTAMP
        ]], {
            targetIdentifier,
            agencyScope ~= '' and agencyScope or scope,
            encoded,
            getPlayerIdentifier(src),
        })

        appendLeadershipAuditLog(scope, 'permission_change', src, targetIdentifier, targetName, {
            permissions = payload.permissions,
        })

        return { ok = true }
    end

    local grade = tonumber(payload.grade)
    if grade ~= nil then
        local players = GetPlayers()
        local targetSource = nil
        for i = 1, #players do
            local candidate = tonumber(players[i])
            if candidate and getPlayerIdentifier(candidate) == targetIdentifier then
                targetSource = candidate
                break
            end
        end

        if targetSource and Framework and Framework.Server and type(Framework.Server.setJob) == 'function' then
            local currentJob = normalizeJobName(Framework.Server.getJob(targetSource) or '')
            if currentJob ~= '' then
                Framework.Server.setJob(targetSource, currentJob, grade)
            end
        end

        appendLeadershipAuditLog(scope, 'rank_change', src, targetIdentifier, targetName, {
            grade = grade,
        })

        return { ok = true }
    end

    return { ok = false, reason = 'nothing_to_update' }
end)

lib.callback.register(CALLBACK_GET_AUDIT_LOGS, function(src, payload)
    if not hasAccess(src) then
        return {}
    end

    local boss = isBossSource(src)
    if not boss then
        return {}
    end

    local body = type(payload) == 'table' and payload or {}
    local scope = select(1, getLeadershipScopeInfo(src))
    local actionFilter = type(body.action) == 'string' and normalizeJobName(body.action) or ''
    local search = type(body.search) == 'string' and string.lower(body.search:gsub('^%s+', ''):gsub('%s+$', '')) or ''
    local page, pageSize, offset = normalizePagination(body, 25, 100)
    local whereClause, params = buildAuditLogFilters(scope, actionFilter, search)

    local totalRow = SQL.single(('SELECT COUNT(*) AS total FROM tg_mdt_audit_logs WHERE %s'):format(whereClause), params)
    local total = tonumber(totalRow and totalRow.total) or 0

    local rows = SQL.query(
        ('SELECT id, created_at, action, actor_name, actor_identifier, target_name, target_identifier, details FROM tg_mdt_audit_logs WHERE %s ORDER BY id DESC LIMIT ? OFFSET ?'):format(whereClause),
        { table.unpack(params), pageSize, offset }
    )

    local out = {}
    for i = 1, #rows do
        local row = rows[i]
        local action = type(row.action) == 'string' and row.action or 'unknown'
        if actionFilter ~= '' and actionFilter ~= 'all' and action ~= actionFilter then
            goto continue
        end

        local actorName = type(row.actor_name) == 'string' and row.actor_name or 'Unknown'
        local targetName = type(row.target_name) == 'string' and row.target_name or nil
        local details = type(row.details) == 'string' and row.details or ''
        local searchHaystack = string.lower(table.concat({ actorName, tostring(targetName or ''), details, action }, ' '))
        if search ~= '' and not string.find(searchHaystack, search, 1, true) then
            goto continue
        end

        out[#out + 1] = {
            id = tonumber(row.id) or i,
            timestamp = type(row.created_at) == 'string' and row.created_at or os.date('!%Y-%m-%dT%H:%M:%SZ'),
            action = action,
            actor_name = actorName,
            actor_identifier = type(row.actor_identifier) == 'string' and row.actor_identifier or '',
            target_name = targetName,
            details = details,
            job = scope,
        }

        ::continue::
    end

    return {
        items = out,
        total = total,
        page = page,
        pageSize = pageSize,
    }
end)

lib.callback.register(CALLBACK_GET_LAWS, function(src)
    if not hasAccess(src) then
        return ''
    end

    local scope = select(1, getLeadershipScopeInfo(src))
    local row = SQL.single('SELECT content FROM tg_mdt_laws WHERE scope = ? LIMIT 1', { scope })
    return type(row) == 'table' and type(row.content) == 'string' and row.content or ''
end)

lib.callback.register(CALLBACK_SAVE_LAWS, function(src, content)
    if not hasAccess(src) then
        return { ok = false, reason = 'no_access' }
    end

    local boss = isBossSource(src)
    if not boss then
        return { ok = false, reason = 'not_boss' }
    end

    local scope = select(1, getLeadershipScopeInfo(src))
    local text = type(content) == 'string' and content or ''
    SQL.execute([[
        INSERT INTO tg_mdt_laws (scope, content, updated_by)
        VALUES (?, ?, ?)
        ON DUPLICATE KEY UPDATE content = VALUES(content), updated_by = VALUES(updated_by), updated_at = CURRENT_TIMESTAMP
    ]], { scope, text, getPlayerIdentifier(src) })

    appendLeadershipAuditLog(scope, 'laws_update', src, nil, nil, {
        length = #text,
    })

    return { ok = true }
end)

lib.callback.register(CALLBACK_GET_NEARBY_AGENCY_PLAYERS, function(src, requestedScope, maxDistance)
    if not hasAccess(src) then
        Debug.warn(('Unauthorized nearby-agency access: Player %s'):format(src))
        return {}
    end

    local scope = resolveRequestedAkteScope(src, requestedScope)
    local distanceLimit = tonumber(maxDistance) or 15.0
    if distanceLimit < 2.0 then distanceLimit = 2.0 end
    if distanceLimit > 40.0 then distanceLimit = 40.0 end

    local sourcePed = GetPlayerPed(src)
    if not sourcePed or sourcePed <= 0 then
        return {}
    end

    local sourceCoords = GetEntityCoords(sourcePed)
    if not sourceCoords then
        return {}
    end

    local nearby = {}
    local players = GetPlayers()
    for i = 1, #players do
        local targetSrc = tonumber(players[i])
        if targetSrc and targetSrc ~= src and hasAccess(targetSrc) and getAkteScope(targetSrc) == scope then
            local targetPed = GetPlayerPed(targetSrc)
            if targetPed and targetPed > 0 then
                local targetCoords = GetEntityCoords(targetPed)
                if targetCoords then
                    local dx = (sourceCoords.x or 0.0) - (targetCoords.x or 0.0)
                    local dy = (sourceCoords.y or 0.0) - (targetCoords.y or 0.0)
                    local dz = (sourceCoords.z or 0.0) - (targetCoords.z or 0.0)
                    local distance = math.sqrt((dx * dx) + (dy * dy) + (dz * dz))

                    if distance <= distanceLimit then
                        nearby[#nearby + 1] = {
                            source = targetSrc,
                            name = GetPlayerName(targetSrc) or ('Player %s'):format(targetSrc),
                            job = Framework.Server.getJob(targetSrc) or '',
                            distance = distance,
                        }
                    end
                end
            end
        end
    end

    table.sort(nearby, function(a, b)
        return (a.distance or 9999.0) < (b.distance or 9999.0)
    end)

    return nearby
end)

lib.callback.register(CALLBACK_SHARE_AKTE_WITH_PLAYER, function(src, kind, value, targetSource, compartment)
    if not hasAccess(src) then
        Debug.warn(('Unauthorized akte share attempt: Player %s'):format(src))
        return false
    end

    if type(kind) ~= 'string' or (kind ~= 'person' and kind ~= 'vehicle') then
        return false
    end

    if type(value) ~= 'string' or value == '' then
        return false
    end

    local targetSrc = tonumber(targetSource)
    if not targetSrc or targetSrc <= 0 or targetSrc == src or not hasAccess(targetSrc) then
        return false
    end

    local sourceScope = resolveRequestedAkteScope(src, compartment)
    if getAkteScope(targetSrc) ~= sourceScope then
        return false
    end

    if not isPlayerNearby(src, targetSrc, 20.0) then
        return false
    end

    local targetIdentifier = getPlayerIdentifier(targetSrc)
    if targetIdentifier == '' then
        return false
    end

    local grantedByIdentifier = getPlayerIdentifier(src)
    local recordKey = normalizeAkteShareRecordKey(kind, value)
    if recordKey == '' then
        return false
    end

    SQL.execute([[
        INSERT INTO tg_mdt_akte_player_shares (kind, record_key, source_scope, target_identifier, granted_by_identifier)
        VALUES (?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE created_at = CURRENT_TIMESTAMP, granted_by_identifier = VALUES(granted_by_identifier)
    ]], { kind, recordKey, sourceScope, targetIdentifier, grantedByIdentifier ~= '' and grantedByIdentifier or nil })

    return true
end)

lib.callback.register(CALLBACK_GET_PERSON_AKTE, function(src, identifier, compartment)
    if not hasAccess(src) then
        Debug.warn(('Unauthorized person akte access: Player %s'):format(src))
        return defaultPersonAkte(src)
    end
    
    if type(identifier) ~= 'string' or identifier == '' then
        return defaultPersonAkte(src)
    end
    return getPersonAkte(identifier, src, compartment)
end)

lib.callback.register(CALLBACK_SAVE_PERSON_AKTE, function(src, identifier, akte, compartment)
    if not hasAccess(src) then
        Debug.warn(('Unauthorized person akte save: Player %s'):format(src))
        return nil
    end
    
    if not canSave(src) then
        Debug.warn(('Rate limit exceeded for person akte save: Player %s'):format(src))
        return nil
    end
    
    if type(identifier) ~= 'string' or identifier == '' or #identifier > 80 then
        Debug.warn(('Invalid identifier for person akte save: Player %s'):format(src))
        return nil
    end

    local scope = resolveRequestedAkteScope(src, compartment)
    local merged = applyEditableAkteFields('person', getPersonAkte(identifier, src, scope), akte, src)
    local storageKey = buildAkteStorageKey(scope, identifier)
    
    local encoded = safeJsonEncode(merged)
    if not encoded then
        Debug.error(('Failed to encode person akte data: Player %s'):format(src))
        return nil
    end

    SQL.execute(
        'INSERT INTO tg_mdt_person_akten (identifier, data) VALUES (?, ?) ON DUPLICATE KEY UPDATE data = VALUES(data)',
        { storageKey, encoded }
    )

    akteBootstrapCache[scope] = nil
    
    local players = GetPlayers()
    for i = 1, #players do
        local targetSrc = tonumber(players[i])
        if targetSrc and hasAccess(targetSrc) then
            TriggerClientEvent(EVENT_CLIENT_AKTE_UPDATED, targetSrc, {
                kind = 'person',
                identifier = identifier,
                compartment = scope,
                akte = merged,
            })
        end
    end

    return merged
end)

lib.callback.register(CALLBACK_GET_VEHICLE_AKTE, function(src, plate, compartment)
    if not hasAccess(src) then
        Debug.warn(('Unauthorized vehicle akte access: Player %s'):format(src))
        return defaultVehicleAkte(src)
    end
    
    if type(plate) ~= 'string' or plate == '' then
        return defaultVehicleAkte(src)
    end
    return getVehicleAkte(plate, src, compartment)
end)

lib.callback.register(CALLBACK_SAVE_VEHICLE_AKTE, function(src, plate, akte, compartment)
    if not hasAccess(src) then
        Debug.warn(('Unauthorized vehicle akte save: Player %s'):format(src))
        return nil
    end
    
    if not canSave(src) then
        Debug.warn(('Rate limit exceeded for vehicle akte save: Player %s'):format(src))
        return nil
    end
    
    if type(plate) ~= 'string' or plate == '' or #plate > 20 then
        Debug.warn(('Invalid plate for vehicle akte save: Player %s'):format(src))
        return nil
    end

    local scope = resolveRequestedAkteScope(src, compartment)
    local merged = applyEditableAkteFields('vehicle', getVehicleAkte(plate, src, scope), akte, src)
    local storageKey = buildAkteStorageKey(scope, plate)
    
    local encoded = safeJsonEncode(merged)
    if not encoded then
        Debug.error(('Failed to encode vehicle akte data: Player %s'):format(src))
        return nil
    end

    SQL.execute(
        'INSERT INTO tg_mdt_vehicle_akten (plate, data) VALUES (?, ?) ON DUPLICATE KEY UPDATE data = VALUES(data)',
        { storageKey, encoded }
    )

    akteBootstrapCache[scope] = nil
    
    local players = GetPlayers()
    for i = 1, #players do
        local targetSrc = tonumber(players[i])
        if targetSrc and hasAccess(targetSrc) then
            TriggerClientEvent(EVENT_CLIENT_AKTE_UPDATED, targetSrc, {
                kind = 'vehicle',
                plate = plate,
                compartment = scope,
                akte = merged,
            })
        end
    end

    return merged
end)

lib.callback.register(CALLBACK_REMOVE_AKTE_COMPARTMENT, function(src, kind, value, compartment)
    if not hasAccess(src) then
        Debug.warn(('Unauthorized akte compartment delete: Player %s'):format(src))
        return false
    end

    if type(kind) ~= 'string' or (kind ~= 'person' and kind ~= 'vehicle') then
        return false
    end

    if type(value) ~= 'string' or value == '' then
        return false
    end

    local scope = normalizeAkteScopeName(compartment)
    if scope == '' or scope == 'default' then
        return false
    end

    local tableName = kind == 'vehicle' and 'tg_mdt_vehicle_akten' or 'tg_mdt_person_akten'
    local columnName = kind == 'vehicle' and 'plate' or 'identifier'
    local storageKey = buildAkteStorageKey(scope, value)

    SQL.execute(('DELETE FROM %s WHERE %s = ?'):format(tableName, columnName), { storageKey })
    akteBootstrapCache[scope] = nil
    return true
end)

-- ══════════════════════════════════════════════════════════
-- RADIO MEMBERS SYNCHRONIZATION
-- ══════════════════════════════════════════════════════════

local activeRadioChannels = {}
local playerActiveFrequencies = {}
local playerDispatchStatuses = {}

local function isRadioAvailable()
    local mdtCfg = Config and Config.MDT or {}
    local radioCfg = type(mdtCfg.radio) == 'table' and mdtCfg.radio or {}
    if radioCfg.enabled == false then
        return false
    end

    local hasPma = GetResourceState('pma-voice') == 'started'
    local hasSalty = GetResourceState('saltychat') == 'started'
    if hasPma or hasSalty then
        return true
    end

    return radioCfg.allow_standalone == true
end

local function getDispatchDefaultStatus()
    local dispatchCfg = Config and Config.MDT and Config.MDT.dispatch
    if type(dispatchCfg) == 'table' and type(dispatchCfg.default_status) == 'string' and dispatchCfg.default_status ~= '' then
        return dispatchCfg.default_status
    end
    return '10-8'
end

local function getPlayerDispatchStatus(src)
    local current = playerDispatchStatuses[src]
    if type(current) == 'string' and current ~= '' then
        return current
    end
    return getDispatchDefaultStatus()
end

---@param list table
---@param out table<string, boolean>
local function appendDepartmentJobsToSet(list, out)
    if type(list) ~= 'table' then
        return
    end

    for i = 1, #list do
        local jobName = normalizeJobName(list[i])
        if jobName ~= '' then
            out[jobName] = true
        end
    end
end

---@param group table
---@return table<string, boolean>|nil
local function buildDispatchShareGroup(group)
    if type(group) ~= 'table' then
        return nil
    end

    local departments = Config and Config.MDT and Config.MDT.departments
    local resolved = {}

    for i = 1, #group do
        local token = normalizeJobName(group[i])
        if token ~= '' then
            local dept = type(departments) == 'table' and departments[token] or nil
            if type(dept) == 'table' and type(dept.jobs) == 'table' then
                appendDepartmentJobsToSet(dept.jobs, resolved)
            else
                resolved[token] = true
            end
        end
    end

    if next(resolved) == nil then
        return nil
    end

    return resolved
end

---@return boolean, table[]|nil
local function resolveDispatchSharing()
    local dispatchCfg = Config and Config.MDT and Config.MDT.dispatch
    if type(dispatchCfg) ~= 'table' then
        return true, nil
    end

    local shareSetting = dispatchCfg.share_between_jobs
    if shareSetting == false then
        return false, nil
    end

    if shareSetting == true then
        return true, nil
    end

    if type(shareSetting) == 'string' then
        local normalized = normalizeJobName(shareSetting)
        if normalized == '' or normalized == 'all' or normalized == '*' then
            return true, nil
        end

        local group = buildDispatchShareGroup({ normalized })
        if group then
            return false, { group }
        end

        return false, nil
    end

    if type(shareSetting) ~= 'table' then
        return true, nil
    end

    local groups = {}
    local hasNestedGroup = false

    for i = 1, #shareSetting do
        if type(shareSetting[i]) == 'table' then
            hasNestedGroup = true
            break
        end
    end

    if hasNestedGroup then
        for i = 1, #shareSetting do
            local entry = shareSetting[i]
            if type(entry) == 'string' then
                local token = normalizeJobName(entry)
                if token == 'all' or token == '*' then
                    return true, nil
                end
                local group = buildDispatchShareGroup({ token })
                if group then
                    groups[#groups + 1] = group
                end
            elseif type(entry) == 'table' then
                local group = buildDispatchShareGroup(entry)
                if group then
                    groups[#groups + 1] = group
                end
            end
        end
    else
        local normalizedFlatGroup = {}
        for i = 1, #shareSetting do
            local token = normalizeJobName(shareSetting[i])
            if token == 'all' or token == '*' then
                return true, nil
            end
            normalizedFlatGroup[#normalizedFlatGroup + 1] = token
        end

        local group = buildDispatchShareGroup(normalizedFlatGroup)
        if group then
            groups[#groups + 1] = group
        end
    end

    if #groups == 0 then
        return false, nil
    end

    return false, groups
end

---@param left table<string, boolean>
---@param right table<string, boolean>
---@return boolean
local function setsIntersect(left, right)
    if type(left) ~= 'table' or type(right) ~= 'table' then
        return false
    end

    for key, value in pairs(left) do
        if value == true and right[key] == true then
            return true
        end
    end

    return false
end

local function resolvePlayerJobInfo(src)
    local jobName = ''
    local jobLabel = ''

    if Framework and Framework.Server then
        if type(Framework.Server.getJobData) == 'function' then
            local okJobData, jobData = pcall(Framework.Server.getJobData, src)
            if okJobData and type(jobData) == 'table' then
                if type(jobData.name) == 'string' then
                    jobName = jobData.name
                end
                if type(jobData.label) == 'string' then
                    jobLabel = jobData.label
                end
            end
        end

        if type(Framework.Server.getJob) == 'function' and jobName == '' then
            local okJob, resolvedJob = pcall(Framework.Server.getJob, src)
            if okJob and type(resolvedJob) == 'string' then
                jobName = resolvedJob
            end
        end

        if type(Framework.Server.getPlayer) == 'function' then
            local okPlayer, player = pcall(Framework.Server.getPlayer, src)
            if okPlayer and type(player) == 'table' then
                local rawJob = nil
                if type(player.job) == 'table' then
                    rawJob = player.job
                elseif type(player.PlayerData) == 'table' and type(player.PlayerData.job) == 'table' then
                    rawJob = player.PlayerData.job
                end

                if type(rawJob) == 'table' then
                    if jobName == '' and type(rawJob.name) == 'string' then
                        jobName = rawJob.name
                    end
                    if jobLabel == '' and type(rawJob.label) == 'string' then
                        jobLabel = rawJob.label
                    end
                end
            end
        end
    end

    return jobName, jobLabel
end

local function canViewDispatchCall(src, call)
    local isSharedForAll, shareGroups = resolveDispatchSharing()
    if isSharedForAll then
        return true
    end

    if type(call) ~= 'table' then
        return false
    end

    local viewerJob = getViewerJobName(src)
    if viewerJob == '' then
        return false
    end

    local viewerSet = { [viewerJob] = true }

    local scopeToken = normalizeJobName(call.scopeJob)
    if scopeToken == '' then
        return true
    end

    local scopeSet = buildDispatchShareGroup({ scopeToken })
    if type(scopeSet) ~= 'table' then
        return false
    end

    if setsIntersect(viewerSet, scopeSet) then
        return true
    end

    if type(shareGroups) ~= 'table' then
        return false
    end

    for i = 1, #shareGroups do
        local group = shareGroups[i]
        if type(group) == 'table' and setsIntersect(viewerSet, group) and setsIntersect(scopeSet, group) then
            return true
        end
    end

    return false
end

---@param viewerJob string
---@return string
local function resolveViewerAgencyKey(viewerJob)
    local departments = Config and Config.MDT and Config.MDT.departments
    if viewerJob == '' or type(departments) ~= 'table' then
        return ''
    end

    for agencyKey, deptCfg in pairs(departments) do
        if type(deptCfg) == 'table' and jobListContains(deptCfg.jobs, viewerJob) then
            return normalizeJobName(agencyKey)
        end
    end

    return ''
end

---@param value any
---@return table|nil
local function normalizeStatusScopeList(value)
    if type(value) == 'table' then
        return value
    end
    if type(value) == 'string' and value ~= '' then
        return { value }
    end
    return nil
end

---@param statusCfg table
---@param viewerJob string
---@param viewerAgency string
---@return boolean
local function statusCodeMatchesScope(statusCfg, viewerJob, viewerAgency)
    if type(statusCfg) ~= 'table' then
        return false
    end

    local jobsScope = normalizeStatusScopeList(statusCfg.jobs)
    if jobsScope and not jobListContains(jobsScope, viewerJob) then
        return false
    end

    local agenciesScope = normalizeStatusScopeList(statusCfg.agencies or statusCfg.departments)
    if agenciesScope and not jobListContains(agenciesScope, viewerAgency) then
        return false
    end

    return true
end

---@param src number
---@return table
local function getScopedDispatchStatusCodes(src)
    local dispatchCfg = Config and Config.MDT and Config.MDT.dispatch
    local rawCodes = type(dispatchCfg) == 'table' and dispatchCfg.status_codes or nil
    if type(rawCodes) ~= 'table' then
        return {}
    end

    local viewerJob = getViewerJobName(src)
    local viewerAgency = resolveViewerAgencyKey(viewerJob)
    local filtered = {}

    for i = 1, #rawCodes do
        local entry = rawCodes[i]
        if type(entry) == 'table' and type(entry.code) == 'string' and entry.code ~= '' then
            if statusCodeMatchesScope(entry, viewerJob, viewerAgency) then
                filtered[#filtered + 1] = entry
            end
        end
    end

    return filtered
end

---@param src number
---@param status string
---@return boolean
local function isDispatchStatusAllowedForSource(src, status)
    local scopedCodes = getScopedDispatchStatusCodes(src)
    if #scopedCodes == 0 then
        return true
    end

    for i = 1, #scopedCodes do
        if scopedCodes[i].code == status then
            return true
        end
    end

    return false
end

local function buildPlayerRadioData(src)
    local fallback = {
        source = src,
        name = 'Colleague ' .. src,
        gradeDisplay = '',
    }
    local playerName = GetPlayerName(src)
    local name = type(playerName) == 'string' and playerName ~= '' and playerName or fallback.name
    local gradeName = nil
    local gradeNumber = nil
    local job = {}
    local avatarUrl = nil

    if Framework and Framework.Server and type(Framework.Server.getPlayer) == 'function' then
        local okPlayer, player = pcall(Framework.Server.getPlayer, src)
        if okPlayer and type(player) == 'table' then
            local first = nil
            local last = nil

            if type(player.firstname) == 'string' then first = player.firstname end
            if type(player.lastname) == 'string' then last = player.lastname end

            if type(player.PlayerData) == 'table' and type(player.PlayerData.charinfo) == 'table' then
                first = first or player.PlayerData.charinfo.firstname
                last = last or player.PlayerData.charinfo.lastname
            end

            if type(player.name) == 'string' and player.name ~= '' then
                name = player.name
            elseif type(first) == 'string' and type(last) == 'string' then
                name = first .. ' ' .. last
            end

            if type(player.job) == 'table' then
                job = player.job
            elseif type(player.PlayerData) == 'table' and type(player.PlayerData.job) == 'table' then
                job = player.PlayerData.job
            end

            if type(player.imageUrl) == 'string' and player.imageUrl ~= '' then
                avatarUrl = player.imageUrl
            elseif type(player.PlayerData) == 'table' and type(player.PlayerData.imageUrl) == 'string' and player.PlayerData.imageUrl ~= '' then
                avatarUrl = player.PlayerData.imageUrl
            end
        end
    end

    if type(job) == 'table' then
        if type(job.grade) == 'table' then
            gradeName = job.grade.label or job.grade.name
            gradeNumber = job.grade.level or job.grade.grade or job.grade.value
        else
            gradeName = job.grade_label or job.grade_name
            gradeNumber = job.grade
        end
    end

    local jobName, jobLabel = resolvePlayerJobInfo(src)

    local gradeDisplay = ''
    if gradeName and gradeNumber then
        gradeDisplay = tostring(gradeName) .. ' ' .. tostring(gradeNumber)
    elseif gradeName then
        gradeDisplay = tostring(gradeName)
    elseif gradeNumber then
        gradeDisplay = tostring(gradeNumber)
    end

    return {
        source = src,
        name = name,
        gradeDisplay = gradeDisplay,
        jobName = jobName,
        jobLabel = jobLabel,
        avatarUrl = avatarUrl,
        radioCode = playerActiveFrequencies[src],
        status = getPlayerDispatchStatus(src)
    }
end

local function broadcastRadioMembers(freq)
    if not freq or freq == '' then return end
    local membersMap = activeRadioChannels[freq] or {}
    local membersList = {}
    for src, data in pairs(membersMap) do
        membersList[#membersList + 1] = data
    end

    -- Broadcast to all members on this frequency
    for src, _ in pairs(membersMap) do
        TriggerClientEvent(EVENT_CLIENT_UPDATE_RADIO_MEMBERS, src, membersList)
    end
end

local function removePlayerFromRadio(src)
    local oldFreq = playerActiveFrequencies[src]
    if oldFreq then
        playerActiveFrequencies[src] = nil
        if activeRadioChannels[oldFreq] then
            activeRadioChannels[oldFreq][src] = nil
            local isEmpty = true
            for _ in pairs(activeRadioChannels[oldFreq]) do
                isEmpty = false
                break
            end
            if isEmpty then
                activeRadioChannels[oldFreq] = nil
            else
                broadcastRadioMembers(oldFreq)
            end
        end
    end
end

RegisterNetEvent(EVENT_SERVER_JOIN_RADIO, function(freq)
    local src = source
    if not isRadioAvailable() then
        removePlayerFromRadio(src)
        return
    end

    if not freq or freq == '' then
        removePlayerFromRadio(src)
        return
    end

    local freqStr = tostring(freq)
    removePlayerFromRadio(src)

    playerActiveFrequencies[src] = freqStr
    if not activeRadioChannels[freqStr] then
        activeRadioChannels[freqStr] = {}
    end

    local memberData = buildPlayerRadioData(src)
    activeRadioChannels[freqStr][src] = memberData

    broadcastRadioMembers(freqStr)
end)

RegisterNetEvent(EVENT_SERVER_LEAVE_RADIO, function()
    local src = source
    removePlayerFromRadio(src)
end)

AddEventHandler(EVENT_PLAYER_DROPPED, function()
    local src = source
    removePlayerFromRadio(src)
    playerDispatchStatuses[src] = nil
end)

lib.callback.register(CALLBACK_SET_DISPATCH_STATUS, function(src, payload)
    if not hasAccess(src) then
        return false
    end

    if DispatchModule and type(DispatchModule.isDispatchEnabledForSource) == 'function' then
        if not DispatchModule.isDispatchEnabledForSource(src) then
            return false
        end
    end

    local body = type(payload) == 'table' and payload or {}
    local status = type(body.status) == 'string' and body.status or ''
    if status == '' then
        return false
    end

    if not isDispatchStatusAllowedForSource(src, status) then
        return false
    end

    playerDispatchStatuses[src] = status

    local freq = playerActiveFrequencies[src]
    if freq and activeRadioChannels[freq] and activeRadioChannels[freq][src] then
        activeRadioChannels[freq][src] = buildPlayerRadioData(src)
        broadcastRadioMembers(freq)
    end

    return true
end)

-- ══════════════════════════════════════════════════════════
-- DISPATCH CALLS (LIVE SYNC + ASSIGNMENTS)
-- ══════════════════════════════════════════════════════════

local dispatchCalls = {}
local dispatchHistory = {}
local dispatchSequence = 0

local function nowIsoUtc()
    return os.date('!%Y-%m-%dT%H:%M:%SZ')
end

local function getDispatchHistoryLimit()
    local dispatchCfg = Config and Config.MDT and Config.MDT.dispatch
    if type(dispatchCfg) ~= 'table' then
        return 500
    end

    local configured = tonumber(dispatchCfg.history_limit)
    if configured and configured > 0 then
        return math.floor(configured)
    end

    return 500
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

local function shouldNotifyCallerOnAccept(call)
    if type(call) ~= 'table' then
        return false
    end

    local deptCfg = getDepartmentConfigForJob(call.scopeJob)
    if type(deptCfg) ~= 'table' then
        return false
    end

    return deptCfg.dispatch_notify_on_accept == true
end

local function getDispatchOfficerFromSource(src)
    local member = buildPlayerRadioData(src)
    return {
        id = ('src:%s'):format(src),
        name = type(member.name) == 'string' and member.name or ('Officer %s'):format(src),
        status = getPlayerDispatchStatus(src),
        assignedAt = os.time(),
    }
end

local function nextDispatchId()
    dispatchSequence = dispatchSequence + 1
    return ('dispatch-%s-%s'):format(os.time(), dispatchSequence)
end

local function normalizeDispatchPriority(value)
    local raw = type(value) == 'string' and string.lower(value) or 'medium'
    if raw == 'low' or raw == 'medium' or raw == 'high' then
        return raw
    end
    return 'medium'
end

local function normalizeDispatchStatus(value)
    local raw = type(value) == 'string' and string.lower(value) or 'open'
    if raw == 'open' or raw == 'investigating' or raw == 'closed' then
        return raw
    end
    return 'open'
end

local function buildUnitEntry(payload)
    local id = type(payload.id) == 'string' and payload.id or ''
    local name = type(payload.name) == 'string' and payload.name or id
    if id == '' or name == '' then return nil end
    return {
        id = id,
        name = name,
        status = type(payload.status) == 'string' and payload.status or 'assigned',
        assignedAt = os.time(),
    }
end

local function buildVehicleEntry(payload)
    local plate = type(payload.plate) == 'string' and payload.plate or ''
    if plate == '' then return nil end
    return {
        plate = plate,
        model = type(payload.model) == 'string' and payload.model or nil,
        assignedAt = os.time(),
    }
end

local function upsertUnit(call, unit)
    for i = 1, #call.assignedUnits do
        if call.assignedUnits[i].id == unit.id then
            call.assignedUnits[i] = unit
            return
        end
    end
    call.assignedUnits[#call.assignedUnits + 1] = unit
end

local function upsertVehicle(call, vehicle)
    for i = 1, #call.assignedVehicles do
        if call.assignedVehicles[i].plate == vehicle.plate then
            call.assignedVehicles[i] = vehicle
            return
        end
    end
    call.assignedVehicles[#call.assignedVehicles + 1] = vehicle
end

local function removeUnit(call, unitId)
    for i = #call.assignedUnits, 1, -1 do
        if call.assignedUnits[i].id == unitId then
            table.remove(call.assignedUnits, i)
        end
    end
end

local function removeVehicle(call, plate)
    for i = #call.assignedVehicles, 1, -1 do
        if call.assignedVehicles[i].plate == plate then
            table.remove(call.assignedVehicles, i)
        end
    end
end

local function getDispatchCallsSnapshot(viewerSrc)
    local list = {}
    for _, call in pairs(dispatchCalls) do
        if type(viewerSrc) ~= 'number' or canViewDispatchCall(viewerSrc, call) then
            list[#list + 1] = call
        end
    end
    table.sort(list, function(a, b)
        return (a.createdAt or '') > (b.createdAt or '')
    end)
    return list
end

local function getDispatchHistorySnapshot(viewerSrc)
    local list = {}
    for i = 1, #dispatchHistory do
        local entry = dispatchHistory[i]
        if type(viewerSrc) ~= 'number' or canViewDispatchCall(viewerSrc, entry) then
            list[#list + 1] = entry
        end
    end

    table.sort(list, function(a, b)
        return (a.closedAt or a.createdAt or '') > (b.closedAt or b.createdAt or '')
    end)

    return list
end

TG_MDT_InternalGetDispatchCallsSnapshot = getDispatchCallsSnapshot
TG_MDT_InternalGetDispatchHistorySnapshot = getDispatchHistorySnapshot

local function broadcastDispatchState()
    local players = GetPlayers()
    for i = 1, #players do
        local targetSrc = tonumber(players[i])
        if targetSrc and hasAccess(targetSrc) then
            local snapshot = getDispatchCallsSnapshot(targetSrc)
            TriggerClientEvent(EVENT_CLIENT_DISPATCH_STATE_CHANGED, targetSrc, snapshot)
        end
    end
end

local function broadcastDispatchHistory()
    local players = GetPlayers()
    for i = 1, #players do
        local targetSrc = tonumber(players[i])
        if targetSrc and hasAccess(targetSrc) then
            local snapshot = getDispatchHistorySnapshot(targetSrc)
            TriggerClientEvent(EVENT_CLIENT_DISPATCH_HISTORY_CHANGED, targetSrc, snapshot)
        end
    end
end

local function createDispatchCall(payload, creatorSrc)
    if DispatchModule and type(DispatchModule.enrichPayload) == 'function' then
        payload = DispatchModule.enrichPayload(payload, creatorSrc)
    end

    local title = type(payload.title) == 'string' and payload.title or ''
    if title == '' then
        return nil, 'missing_title'
    end

    local id = type(payload.id) == 'string' and payload.id or nextDispatchId()
    local creatorName = ''
    local creatorIdentifier = ''
    local creatorSource = tonumber(creatorSrc)
    local isAnonymous = payload.anonymous == true

    if creatorSource and creatorSource > 0 then
        local radioData = buildPlayerRadioData(creatorSource)
        creatorName = type(radioData.name) == 'string' and radioData.name or ''
        if Framework and Framework.Server and type(Framework.Server.getIdentifier) == 'function' then
            creatorIdentifier = Framework.Server.getIdentifier(creatorSource) or ''
        end
    end

    local displayCallerName = ''
    if type(payload.who) == 'string' and payload.who ~= '' then
        displayCallerName = payload.who
    elseif isAnonymous then
        displayCallerName = 'Anonymous Caller'
    else
        displayCallerName = creatorName
    end

    local coords = type(payload.coords) == 'table' and payload.coords or nil
    local location = type(payload.location) == 'string' and payload.location or ''
    if location == '' and type(coords) == 'table' then
        local x = tonumber(coords.x)
        local y = tonumber(coords.y)
        local z = tonumber(coords.z)
        if x and y and z then
            location = ('X: %.2f | Y: %.2f | Z: %.2f'):format(x, y, z)
        end
    end
    if location == '' then
        location = 'Unknown'
    end

    local call = {
        id = id,
        title = title,
        description = type(payload.description) == 'string' and payload.description or '',
        location = location,
        priority = normalizeDispatchPriority(payload.priority),
        status = normalizeDispatchStatus(payload.status),
        createdAt = type(payload.createdAt) == 'string' and payload.createdAt or nowIsoUtc(),
        updatedAt = nowIsoUtc(),
        scopeJob = normalizeJobName(type(payload.scopeJob) == 'string' and payload.scopeJob or getViewerJobName(creatorSrc)),
        callerSource = creatorSource,
        callerName = displayCallerName,
        callerIdentifier = creatorIdentifier ~= '' and creatorIdentifier or nil,
        anonymous = isAnonymous,
        coords = coords,
        acceptedBy = {},
        acceptedNotified = false,
        assignedUnits = {},
        assignedVehicles = {},
    }

    if type(payload.assignedUnits) == 'table' then
        for i = 1, #payload.assignedUnits do
            local unit = buildUnitEntry(payload.assignedUnits[i] or {})
            if unit then
                upsertUnit(call, unit)
            end
        end
    end

    if type(payload.assignedVehicles) == 'table' then
        for i = 1, #payload.assignedVehicles do
            local vehicle = buildVehicleEntry(payload.assignedVehicles[i] or {})
            if vehicle then
                upsertVehicle(call, vehicle)
            end
        end
    end

    dispatchCalls[id] = call

    if DispatchModule then
        if type(DispatchModule.persistOpenCall) == 'function' then
            DispatchModule.persistOpenCall(call, creatorSrc)
        end
        if type(DispatchModule.logAction) == 'function' then
            DispatchModule.logAction(call.id, 'created', creatorSrc, {
                title = call.title,
                location = call.location,
                priority = call.priority,
            })
        end
    end

    broadcastDispatchState()
    return call, nil
end

TG_MDT_InternalCreateDispatch = createDispatchCall

lib.callback.register(CALLBACK_CREATE_DISPATCH, function(src, payload)
    if not hasAccess(src) then
        return { ok = false }
    end

    if DispatchModule and type(DispatchModule.isDispatchEnabledForSource) == 'function' then
        if not DispatchModule.isDispatchEnabledForSource(src) then
            return { ok = false, reason = 'dispatch_disabled' }
        end
    end

    local body = type(payload) == 'table' and payload or {}
    local call, err = createDispatchCall(body, src)
    if not call then
        Debug.warn(('Dispatch create failed: %s'):format(err or 'unknown'))
        return { ok = false }
    end

    return { ok = true, id = call.id }
end)

lib.callback.register(CALLBACK_GET_DISPATCH_STATE, function(src)
    if not hasAccess(src) then
        return {}
    end
    if DispatchModule and type(DispatchModule.isDispatchEnabledForSource) == 'function' then
        if not DispatchModule.isDispatchEnabledForSource(src) then
            return {}
        end
    end
    return getDispatchCallsSnapshot(src)
end)

lib.callback.register(CALLBACK_GET_DISPATCH_HISTORY, function(src, payload)
    if not hasAccess(src) then
        return {}
    end
    if DispatchModule and type(DispatchModule.isDispatchEnabledForSource) == 'function' then
        if not DispatchModule.isDispatchEnabledForSource(src) then
            return {}
        end
    end

    local body = type(payload) == 'table' and payload or {}
    local dispatchLimit = math.floor(tonumber(body.limit) or getDispatchHistoryLimit())
    if dispatchLimit < 1 then
        dispatchLimit = 25
    end

    local dispatchOffset = math.floor(tonumber(body.offset) or 0)
    if dispatchOffset < 0 then
        dispatchOffset = 0
    end

    local snapshot = getDispatchHistorySnapshot(src)
    local items = {}
    local startIndex = dispatchOffset + 1
    local endIndex = math.min(#snapshot, dispatchOffset + dispatchLimit)
    for i = startIndex, endIndex do
        items[#items + 1] = snapshot[i]
    end

    return {
        items = items,
        total = #snapshot,
        limit = dispatchLimit,
        offset = dispatchOffset,
    }
end)

lib.callback.register(CALLBACK_ASSIGN_DISPATCH_UNIT, function(src, payload)
    if not hasAccess(src) then return false end
    if DispatchModule and type(DispatchModule.isDispatchEnabledForSource) == 'function' then
        if not DispatchModule.isDispatchEnabledForSource(src) then return false end
    end
    local body = type(payload) == 'table' and payload or {}
    local dispatchId = type(body.dispatchId) == 'string' and body.dispatchId or ''
    local call = dispatchCalls[dispatchId]
    if not call or not canViewDispatchCall(src, call) then return false end

    local unit = buildUnitEntry({
        id = body.unitId,
        name = body.unitName,
        status = body.status,
    })
    if not unit then return false end

    upsertUnit(call, unit)
    call.updatedAt = nowIsoUtc()

    if DispatchModule and type(DispatchModule.logAction) == 'function' then
        DispatchModule.logAction(dispatchId, 'assign_unit', src, {
            unitId = unit.id,
            unitName = unit.name,
        })
    end

    broadcastDispatchState()
    return true
end)

lib.callback.register(CALLBACK_UNASSIGN_DISPATCH_UNIT, function(src, payload)
    if not hasAccess(src) then return false end
    if DispatchModule and type(DispatchModule.isDispatchEnabledForSource) == 'function' then
        if not DispatchModule.isDispatchEnabledForSource(src) then return false end
    end
    local body = type(payload) == 'table' and payload or {}
    local dispatchId = type(body.dispatchId) == 'string' and body.dispatchId or ''
    local unitId = type(body.unitId) == 'string' and body.unitId or ''
    local call = dispatchCalls[dispatchId]
    if not call or unitId == '' or not canViewDispatchCall(src, call) then return false end

    removeUnit(call, unitId)
    call.updatedAt = nowIsoUtc()

    if DispatchModule and type(DispatchModule.logAction) == 'function' then
        DispatchModule.logAction(dispatchId, 'unassign_unit', src, {
            unitId = unitId,
        })
    end

    broadcastDispatchState()
    return true
end)

lib.callback.register(CALLBACK_ASSIGN_DISPATCH_VEHICLE, function(src, payload)
    if not hasAccess(src) then return false end
    if DispatchModule and type(DispatchModule.isDispatchEnabledForSource) == 'function' then
        if not DispatchModule.isDispatchEnabledForSource(src) then return false end
    end
    local body = type(payload) == 'table' and payload or {}
    local dispatchId = type(body.dispatchId) == 'string' and body.dispatchId or ''
    local call = dispatchCalls[dispatchId]
    if not call or not canViewDispatchCall(src, call) then return false end

    local vehicle = buildVehicleEntry({
        plate = body.plate,
        model = body.model,
    })
    if not vehicle then return false end

    upsertVehicle(call, vehicle)
    call.updatedAt = nowIsoUtc()

    if DispatchModule and type(DispatchModule.logAction) == 'function' then
        DispatchModule.logAction(dispatchId, 'assign_vehicle', src, {
            plate = vehicle.plate,
            model = vehicle.model,
        })
    end

    broadcastDispatchState()
    return true
end)

lib.callback.register(CALLBACK_UNASSIGN_DISPATCH_VEHICLE, function(src, payload)
    if not hasAccess(src) then return false end
    if DispatchModule and type(DispatchModule.isDispatchEnabledForSource) == 'function' then
        if not DispatchModule.isDispatchEnabledForSource(src) then return false end
    end
    local body = type(payload) == 'table' and payload or {}
    local dispatchId = type(body.dispatchId) == 'string' and body.dispatchId or ''
    local plate = type(body.plate) == 'string' and body.plate or ''
    local call = dispatchCalls[dispatchId]
    if not call or plate == '' or not canViewDispatchCall(src, call) then return false end

    removeVehicle(call, plate)
    call.updatedAt = nowIsoUtc()

    if DispatchModule and type(DispatchModule.logAction) == 'function' then
        DispatchModule.logAction(dispatchId, 'unassign_vehicle', src, {
            plate = plate,
        })
    end

    broadcastDispatchState()
    return true
end)

lib.callback.register(CALLBACK_ACCEPT_DISPATCH_CASE, function(src, payload)
    if not hasAccess(src) then return false end
    local body = type(payload) == 'table' and payload or {}
    local dispatchId = type(body.dispatchId) == 'string' and body.dispatchId or ''
    local call = dispatchCalls[dispatchId]
    if not call or not canViewDispatchCall(src, call) then return false end

    if DispatchModule and type(DispatchModule.isDispatchEnabledForSource) == 'function' then
        if not DispatchModule.isDispatchEnabledForSource(src) then return false end
    end
    local officer = getDispatchOfficerFromSource(src)
    upsertUnit(call, officer)

    local accepted = call.acceptedBy or {}
    local alreadyAccepted = false
    for i = 1, #accepted do
        if accepted[i].id == officer.id then
            accepted[i].name = officer.name
            accepted[i].at = nowIsoUtc()
            alreadyAccepted = true
            break
        end
    end
    if not alreadyAccepted then
        accepted[#accepted + 1] = {
            id = officer.id,
            name = officer.name,
            at = nowIsoUtc(),
        }
    end
    call.acceptedBy = accepted
    call.updatedAt = nowIsoUtc()

    if not call.acceptedNotified and shouldNotifyCallerOnAccept(call) and not call.anonymous then
        local callerSrc = tonumber(call.callerSource)
        if callerSrc and GetPlayerName(callerSrc) and Framework and Framework.Server and type(Framework.Server.notify) == 'function' then
            Framework.Server.notify(callerSrc, 'Your dispatch has been accepted. Unit is on the way.', 'inform')
            call.acceptedNotified = true
        end
    end

    if DispatchModule and type(DispatchModule.logAction) == 'function' then
        DispatchModule.logAction(dispatchId, 'accepted', src, {
            officerId = officer.id,
            officerName = officer.name,
        })
    end

    broadcastDispatchState()
    return true
end)

lib.callback.register(CALLBACK_CLOSE_DISPATCH_CASE, function(src, payload)
    if not hasAccess(src) then return false end
    if DispatchModule and type(DispatchModule.isDispatchEnabledForSource) == 'function' then
        if not DispatchModule.isDispatchEnabledForSource(src) then return false end
    end
    local body = type(payload) == 'table' and payload or {}
    local dispatchId = type(body.dispatchId) == 'string' and body.dispatchId or ''
    local call = dispatchCalls[dispatchId]
    if not call or not canViewDispatchCall(src, call) then return false end

    local closer = getDispatchOfficerFromSource(src)
    local historyEntry = {
        id = call.id,
        title = call.title,
        description = call.description,
        location = call.location,
        priority = call.priority,
        status = 'closed',
        createdAt = call.createdAt,
        closedAt = nowIsoUtc(),
        scopeJob = call.scopeJob,
        callerSource = call.callerSource,
        callerIdentifier = call.callerIdentifier,
        callerName = call.callerName,
        anonymous = call.anonymous,
        acceptedBy = call.acceptedBy or {},
        assignedUnits = call.assignedUnits or {},
        assignedVehicles = call.assignedVehicles or {},
        closedBy = {
            id = closer.id,
            name = closer.name,
        },
    }

    dispatchHistory[#dispatchHistory + 1] = historyEntry
    while #dispatchHistory > getDispatchHistoryLimit() do
        table.remove(dispatchHistory, 1)
    end

    dispatchCalls[dispatchId] = nil

    if DispatchModule then
        if type(DispatchModule.persistClosedCall) == 'function' then
            DispatchModule.persistClosedCall(historyEntry, src)
        end
        if type(DispatchModule.logAction) == 'function' then
            DispatchModule.logAction(dispatchId, 'closed', src, {
                closedBy = historyEntry.closedBy,
                acceptedBy = historyEntry.acceptedBy,
            })
        end
    end

    broadcastDispatchState()
    broadcastDispatchHistory()
    return true
end)

