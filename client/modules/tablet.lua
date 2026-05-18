-- ============================================================
--  TG_MDT | client/modules/tablet.lua
--  Tablet module: permission gate + open/toggle entrypoint.
-- ============================================================


local MODULE_NAME = 'tablet'
local module_cfg = (Config.Modules and Config.Modules.tablet) or { enabled = true }

if module_cfg.enabled == false then
    Debug.debug('Tablet module disabled by Config.Modules.tablet.enabled')
    return
end

--- Best-effort user notification that works even when framework notify is unavailable.
---@param message string
---@param level string|nil
local function notifyUser(message, level)
    if Framework and Framework.Client and Framework.Client.notify then
        local ok = pcall(Framework.Client.notify, message, level or 'error')
        if ok then return end
    end

    if lib and lib.notify then
        lib.notify({ description = message, type = level or 'error' })
        return
    end

    Debug.warn(('notifyUser fallback: %s'):format(message))
end

--- Return the local job name in lowercase, if available.
---@return string|nil
local function getLocalJobName()
    if not Framework or not Framework.Client or not Framework.Client.getJob then
        return nil
    end

    local job = Framework.Client.getJob()
    if type(job) == 'string' then
        return string.lower(job)
    end

    if type(job) == 'table' then
        if type(job.name) == 'string' then
            return string.lower(job.name)
        end
        if type(job.id) == 'string' then
            return string.lower(job.id)
        end
    end

    return nil
end

--- Build a fast lowercase lookup table from allowed jobs config.
---@return table
local function buildAllowedJobLookup()
    local allowed = (Config.MDT and Config.MDT.allowed_jobs) or {}
    local lookup = {}
    local dutyCfg = (Config.MDT and Config.MDT.duty) or {}
    local switchJobs = dutyCfg.switch_job_on_offduty == true
    local offPrefix = type(dutyCfg.offduty_job_prefix) == 'string' and dutyCfg.offduty_job_prefix or 'off'

    for i = 1, #allowed do
        if type(allowed[i]) == 'string' then
            local dutyJob = string.lower(allowed[i])
            lookup[dutyJob] = true

            if switchJobs then
                lookup[string.lower(('%s%s'):format(offPrefix, dutyJob))] = true
            end
        end
    end

    return lookup
end

--- Whether current player can use the tablet.
---@return boolean
---@return string|nil
local function canOpenTablet()
    local lookup = buildAllowedJobLookup()
    Debug.debug('canOpenTablet: evaluating access', {
        allowed_jobs = (Config.MDT and Config.MDT.allowed_jobs) or {},
    })

    -- Empty allowed_jobs means allow everybody.
    if next(lookup) == nil then
        Debug.debug('canOpenTablet: allowed_jobs empty, allowing access')
        return true, nil
    end

    local job_name = getLocalJobName()
    if not job_name then
        Debug.warn(('canOpenTablet: getLocalJobName() returned nil. Details: Framework=%s'):format(Framework and Framework.name or 'nil'))
        return false, 'no_job_detected'
    end

    local is_allowed = lookup[job_name] == true
    Debug.debug(('canOpenTablet: job="%s" allowed=%s'):format(tostring(job_name), tostring(is_allowed)))
    if not is_allowed then
        Debug.warn(('canOpenTablet: Job "%s" is not in allowed_jobs'):format(tostring(job_name)))
        return false, ('job_not_allowed:%s'):format(job_name)
    end

    return true, nil
end

--- Open/toggle tablet only if player has an allowed job.
local function toggleTablet()
    if not TG_MDT_CLIENT_INITIALIZED then
        notifyUser('MDT is still loading, please wait a moment.', 'inform')
        return
    end

    Debug.debug(('toggleTablet: invoked | command=%s | visible=%s | activeScreen=%s'):format(
        tostring(Config.Commands and Config.Commands.open_mdt or 'mdt'),
        tostring(NUI.isVisible()),
        tostring(NUI.getActiveScreen())
    ))

    local allowed, deny_reason = canOpenTablet()
    if not allowed then
        Debug.debug(('toggleTablet: access denied | reason=%s'):format(tostring(deny_reason)))
        if Config.MDT and Config.MDT.notify_on_denied ~= false then
            local denied = 'You are not allowed to use this tablet.'
            if deny_reason == 'no_job_detected' then
                denied = 'MDT unavailable: your job data was not detected.'
            elseif type(deny_reason) == 'string' and deny_reason:sub(1, 16) == 'job_not_allowed:' then
                local job_name = deny_reason:sub(17)
                denied = ('MDT denied for job "%s". Check Config.MDT.allowed_jobs.'):format(job_name)
            end

            notifyUser(denied, 'error')
        end
        return
    end

    local screen = (Config.MDT and Config.MDT.default_screen) or MODULE_NAME
    Debug.debug(('toggleTablet: opening screen "%s"'):format(screen))

    NUI.toggle(screen)
    Debug.debug(('toggleTablet: after NUI.toggle | visible=%s | activeScreen=%s'):format(
        tostring(NUI.isVisible()),
        tostring(NUI.getActiveScreen())
    ))

    NUI.send('setData', {
        key = 'session',
        value = {
            module = MODULE_NAME,
            screen = screen,
            job = getLocalJobName(),
        },
    })
    Debug.debug('toggleTablet: session payload sent to NUI')
end

local OPEN_COMMAND = (Config.Commands and Config.Commands.open_mdt)
RegisterCommand(OPEN_COMMAND, toggleTablet)
Debug.debug(('Tablet command registered: /%s'):format(OPEN_COMMAND))



Debug.debug(('Tablet module loaded. Command: /%s'):format(OPEN_COMMAND))
