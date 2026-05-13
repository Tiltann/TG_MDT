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
local function canOpenTablet()
    local lookup = buildAllowedJobLookup()

    -- Empty allowed_jobs means allow everybody.
    if next(lookup) == nil then
        return true
    end

    local job_name = getLocalJobName()
    return job_name ~= nil and lookup[job_name] == true
end

--- Open/toggle tablet only if player has an allowed job.
local function toggleTablet()
    if not canOpenTablet() then
        if Config.MDT and Config.MDT.notify_on_denied ~= false then
            local denied = 'You are not allowed to use this tablet.'
            if Framework and Framework.Client and Framework.Client.notify then
                Framework.Client.notify(denied, 'error')
            else
                lib.notify({ description = denied, type = 'error' })
            end
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

Debug.info(('Tablet module loaded. Command: /%s'):format(OPEN_COMMAND))
