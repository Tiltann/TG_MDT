-- ============================================================
--  TG_MDT | server/sv-duty.lua
--  Unified duty state handling + optional off-duty job switching.
-- ============================================================

Duty = Duty or {}

local DUTY_KEY_DEFAULT = 'tg_mdt_duty'
local LAST_JOB_KEY_DEFAULT = 'tg_mdt_duty_last_job'
local DutyCache = {}
local LastJobCache = {}

---@return table
local function getDutyConfig()
    local cfg = (Config.MDT and Config.MDT.duty) or {}
    local switchJobs = cfg.switch_job_on_offduty == true
    return {
        enabled = cfg.enabled ~= false,
        switch_job_on_offduty = switchJobs,
        offduty_same_as_duty_job = not switchJobs,
        offduty_job_prefix = type(cfg.offduty_job_prefix) == 'string' and cfg.offduty_job_prefix or 'off',
        reset_on_disconnect = cfg.reset_on_disconnect == true,
        duty_key = type(cfg.duty_key) == 'string' and cfg.duty_key or DUTY_KEY_DEFAULT,
        last_job_key = type(cfg.last_job_key) == 'string' and cfg.last_job_key or LAST_JOB_KEY_DEFAULT,
        notify_on_toggle = cfg.notify_on_toggle ~= false,
    }
end

--- Returns value if it's a boolean, otherwise returns fallback.
---@param value any
---@param fallback boolean
---@return boolean
local function boolOr(value, fallback)
    return type(value) == 'boolean' and value or fallback
end

---@param src number
---@return table
local function getJobData(src)
    if Framework and Framework.Server and type(Framework.Server.getJobData) == 'function' then
        local ok, data = pcall(Framework.Server.getJobData, src)
        if ok and type(data) == 'table' then
            return data
        end
    end

    local name = nil
    if Framework and Framework.Server and type(Framework.Server.getJob) == 'function' then
        local ok, result = pcall(Framework.Server.getJob, src)
        if ok then
            name = result
        end
    end

    return {
        name = name,
        grade = nil,
        grade_name = nil,
        onduty = nil,
    }
end

---@param src number
---@param key string
---@return any
local function getPlayerState(src, key)
    if Framework and Framework.Server and type(Framework.Server.getPlayerState) == 'function' then
        local ok, value = pcall(Framework.Server.getPlayerState, src, key)
        if ok then
            return value
        end
    end
    return nil
end

---@param src number
---@param key string
---@param value any
---@return boolean
local function setPlayerState(src, key, value)
    if Framework and Framework.Server and type(Framework.Server.setPlayerState) == 'function' then
        local ok, result = pcall(Framework.Server.setPlayerState, src, key, value)
        if ok then
            return result == true
        end
    end
    return false
end

---@param src number
---@param name string
---@param grade number|string|nil
---@param onDuty boolean|nil
---@return boolean
local function setJob(src, name, grade, onDuty)
    if Framework and Framework.Server and type(Framework.Server.setJob) == 'function' then
        local ok, result = pcall(Framework.Server.setJob, src, name, grade, onDuty)
        if ok and result == true then
            return true
        end
    end
    return false
end

---@param src number
---@param onDuty boolean
local function setJobDuty(src, onDuty)
    if Framework and Framework.Server and type(Framework.Server.setJobDuty) == 'function' then
        pcall(Framework.Server.setJobDuty, src, onDuty)
    end
end

---@param dutyJobName string
---@param cfg table
---@return string
local function resolveOffDutyJobName(dutyJobName, cfg)
    local prefix = cfg.offduty_job_prefix or 'off'
    return ('%s%s'):format(prefix, dutyJobName)
end

---@param src number
---@param cfg table
---@return table
local function buildState(src, cfg)
    local job = getJobData(src)
    local storedDuty = getPlayerState(src, cfg.duty_key)
    local onDuty = true

    if type(DutyCache[src]) == 'boolean' then
        onDuty = DutyCache[src]
    elseif type(storedDuty) == 'boolean' then
        onDuty = storedDuty
    elseif type(job.onduty) == 'boolean' then
        onDuty = job.onduty
    end

    local lastJob = getPlayerState(src, cfg.last_job_key)
    local baseJobName = job.name
    local baseJobGrade = job.grade

    if type(LastJobCache[src]) == 'table' and type(LastJobCache[src].name) == 'string' and LastJobCache[src].name ~= '' then
        baseJobName = LastJobCache[src].name
        baseJobGrade = LastJobCache[src].grade
    end

    if type(lastJob) == 'table' and type(lastJob.name) == 'string' and lastJob.name ~= '' then
        baseJobName = lastJob.name
        baseJobGrade = lastJob.grade
    end

    return {
        enabled = cfg.enabled,
        onDuty = onDuty,
        framework = Framework and Framework.name or 'unknown',
        jobName = job.name,
        dutyJobName = baseJobName,
        grade = baseJobGrade,
        switchJobEnabled = cfg.switch_job_on_offduty and (not cfg.offduty_same_as_duty_job),
        offDutyJobName = type(baseJobName) == 'string' and baseJobName ~= '' and resolveOffDutyJobName(baseJobName, cfg) or nil,
    }
end

---@param src number
---@param state table
local function pushState(src, state)
    TriggerClientEvent('TG_MDT:dutyStateChanged', src, state)
end

---@param src number
---@param message string
---@param level string|nil
local function notify(src, message, level)
    if Framework and Framework.Server and type(Framework.Server.notify) == 'function' then
        pcall(Framework.Server.notify, src, message, level or 'inform')
    end
end

---@param src number
---@return table
function Duty.getState(src)
    local cfg = getDutyConfig()
    return buildState(src, cfg)
end

---@param src number
---@param onDuty boolean
---@param options table|nil
---@return table
function Duty.setState(src, onDuty, options)
    local cfg = getDutyConfig()
    local result = buildState(src, cfg)

    if not cfg.enabled then
        result.reason = 'disabled'
        pushState(src, result)
        return result
    end

    local job = getJobData(src)
    local switchRequested = options and options.switchJob
    local switchJobs = boolOr(switchRequested, cfg.switch_job_on_offduty)
    if cfg.offduty_same_as_duty_job then
        switchJobs = false
    end

    if switchJobs and type(job.name) == 'string' and job.name ~= '' then
        if onDuty then
            local cachedLastJob = LastJobCache[src]
            local lastJob = getPlayerState(src, cfg.last_job_key)
            if type(cachedLastJob) == 'table' and type(cachedLastJob.name) == 'string' and cachedLastJob.name ~= '' then
                lastJob = cachedLastJob
            end

            if type(lastJob) == 'table' and type(lastJob.name) == 'string' and lastJob.name ~= '' then
                setJob(src, lastJob.name, lastJob.grade, true)
                setPlayerState(src, cfg.last_job_key, nil)
                LastJobCache[src] = nil
            end
        else
            local offDutyJobName = resolveOffDutyJobName(job.name, cfg)
            if offDutyJobName ~= job.name then
                local savedJob = {
                    name = job.name,
                    grade = job.grade,
                }

                LastJobCache[src] = savedJob
                setPlayerState(src, cfg.last_job_key, savedJob)
                setJob(src, offDutyJobName, job.grade, false)
            end
        end
    end

    DutyCache[src] = onDuty == true
    setPlayerState(src, cfg.duty_key, onDuty == true)
    setJobDuty(src, onDuty == true)

    result = buildState(src, cfg)
    pushState(src, result)
    return result
end

---@param src number
---@param options table|nil
---@return table
function Duty.toggleState(src, options)
    local current = Duty.getState(src)
    return Duty.setState(src, not current.onDuty, options)
end

local function hasAccess(src)
    if not Framework or not Framework.Server or type(Framework.Server.getJob) ~= 'function' then
        return false
    end
    
    local ok, job = pcall(Framework.Server.getJob, src)
    if not ok or not job then return false end
    
    local allowed = (Config.MDT and Config.MDT.allowed_jobs) or {}
    if #allowed == 0 then return true end
    
    local job_lower = string.lower(job)
    for i = 1, #allowed do
        if string.lower(allowed[i]) == job_lower then
            return true
        end
    end
    
    return false
end

lib.callback.register('TG_MDT:getDutyState', function(src)
    if not hasAccess(src) then
        Debug.warn(('Unauthorized duty state access: Player %s'):format(src))
        return { enabled = false, onDuty = false, reason = 'unauthorized' }
    end
    
    return Duty.getState(src)
end)

lib.callback.register('TG_MDT:setDutyState', function(src, payload)
    if not hasAccess(src) then
        Debug.warn(('Unauthorized duty state change: Player %s'):format(src))
        return { enabled = false, onDuty = false, reason = 'unauthorized' }
    end
    
    local onDuty = type(payload) == 'table' and payload.onDuty == true or false
    local state = Duty.setState(src, onDuty, payload)

    local cfg = getDutyConfig()
    if cfg.notify_on_toggle then
        local text = state.onDuty and lib.locale('duty_on') or lib.locale('duty_off')
        notify(src, text, state.onDuty and 'success' or 'inform')
    end

    return state
end)

lib.callback.register('TG_MDT:toggleDuty', function(src, payload)
    if not hasAccess(src) then
        Debug.warn(('Unauthorized duty toggle: Player %s'):format(src))
        return { enabled = false, onDuty = false, reason = 'unauthorized' }
    end
    
    local state = Duty.toggleState(src, payload)

    local cfg = getDutyConfig()
    if cfg.notify_on_toggle then
        local text = state.onDuty and lib.locale('duty_on') or lib.locale('duty_off')
        notify(src, text, state.onDuty and 'success' or 'inform')
    end

    return state
end)

AddEventHandler('playerDropped', function()
    local src = source
    local cfg = getDutyConfig()

    if cfg.reset_on_disconnect then
        local lastJob = LastJobCache[src] or getPlayerState(src, cfg.last_job_key)
        if cfg.switch_job_on_offduty and type(lastJob) == 'table' and type(lastJob.name) == 'string' and lastJob.name ~= '' then
            setJob(src, lastJob.name, lastJob.grade, true)
        end

        setPlayerState(src, cfg.duty_key, nil)
        setPlayerState(src, cfg.last_job_key, nil)
    else
        setPlayerState(src, cfg.last_job_key, nil)
    end

    DutyCache[src] = nil
    LastJobCache[src] = nil
end)
