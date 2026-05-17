-- ============================================================
--  TG_MDT | client/modules/tablet.lua
--  Tablet module: permission gate + open/toggle entrypoint.
-- ============================================================

local MODULE_NAME = 'tablet'
local module_cfg = (Config.Modules and Config.Modules.tablet) or { enabled = true }

if module_cfg.enabled == false then
    Debug.info('Tablet module disabled by Config.Modules.tablet.enabled')
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

    for i = 1, #allowed do
        if type(allowed[i]) == 'string' then
            lookup[string.lower(allowed[i])] = true
        end
    end

    return lookup
end

--- Whether current player can use the tablet.
---@return boolean
---@return string|nil
local function canOpenTablet()
    local lookup = buildAllowedJobLookup()

    -- Empty allowed_jobs means allow everybody.
    if next(lookup) == nil then
        return true, nil
    end

    local job_name = getLocalJobName()
    if not job_name then
        Debug.warn(('canOpenTablet: getLocalJobName() returned nil. Details: Framework=%s'):format(Framework and Framework.name or 'nil'))
        return false, 'no_job_detected'
    end

    local is_allowed = lookup[job_name] == true
    if not is_allowed then
        Debug.warn(('canOpenTablet: Job "%s" is not in allowed_jobs'):format(tostring(job_name)))
        return false, ('job_not_allowed:%s'):format(job_name)
    end

    return true, nil
end

--- Open/toggle tablet only if player has an allowed job.
local function toggleTablet()
    local allowed, deny_reason = canOpenTablet()
    if not allowed then
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

    NUI.toggle(screen)

    NUI.send('setData', {
        key = 'session',
        value = {
            module = MODULE_NAME,
            screen = screen,
            job = getLocalJobName(),
        },
    })
end

local OPEN_COMMAND = (Config.Commands and Config.Commands.open_mdt) or 'mdt'
RegisterCommand(OPEN_COMMAND, toggleTablet)

-- Keep /mdt as a stable alias so admins can rely on it even if Config.Commands.open_mdt changes.
if OPEN_COMMAND ~= 'mdt' then
    RegisterCommand('mdt', toggleTablet)
end

Debug.info(('Tablet module loaded. Command: /%s'):format(OPEN_COMMAND))
