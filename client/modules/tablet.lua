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

local allowedJobLookupCache = nil

--- Whether current player can use the tablet.
---@return boolean
---@return string|nil
local function canOpenTablet()
    if not allowedJobLookupCache then
        allowedJobLookupCache = buildAllowedJobLookup()
    end
    local lookup = allowedJobLookupCache
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

    local screen = MODULE_NAME
    Debug.debug(('toggleTablet: opening screen "%s"'):format(screen))

    NUI.toggle(screen)
    Debug.debug(('toggleTablet: after NUI.toggle | visible=%s | activeScreen=%s'):format(
        tostring(NUI.isVisible()),
        tostring(NUI.getActiveScreen())
    ))

    -- Always resend meta + player when opening so the UI has fresh data
    -- even if the nuiReady handshake was skipped.
    if NUI.isVisible() and type(TG_MDT_sendInitialState) == 'function' then
        TG_MDT_sendInitialState()
    end

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

local function requestModel(model)
    if not IsModelInCdimage(model) then return false end
    RequestModel(model)
    local timeoutAt = GetGameTimer() + 3000
    while not HasModelLoaded(model) and GetGameTimer() < timeoutAt do
        Wait(0)
    end
    return HasModelLoaded(model)
end

local function deleteEntitySafe(entity)
    if entity and DoesEntityExist(entity) then
        DeleteEntity(entity)
    end
end

local function startPhotoSelfieSetup(ped)
    local phoneModel = joaat('prop_phone_ing_02_lod')
    local phone = nil
    local cam = nil
    local animDict = 'cellphone@'
    local animName = 'cellphone_text_read_base'
    local phoneCoords = GetEntityCoords(ped)

    if requestModel(phoneModel) then
        phone = CreateObject(phoneModel, phoneCoords.x, phoneCoords.y, phoneCoords.z, true, true, false)
        SetEntityCollision(phone, false, false)
        AttachEntityToEntity(
            phone,
            ped,
            GetPedBoneIndex(ped, 28422),
            0.02,
            0.0,
            0.0,
            0.0,
            0.0,
            -10.0,
            true,
            true,
            false,
            true,
            1,
            true
        )
        SetModelAsNoLongerNeeded(phoneModel)
    end

    if not HasAnimDictLoaded(animDict) then
        RequestAnimDict(animDict)
        local timeoutAt = GetGameTimer() + 3000
        while not HasAnimDictLoaded(animDict) and GetGameTimer() < timeoutAt do
            Wait(0)
        end
    end

    TaskPlayAnim(ped, animDict, animName, 8.0, -8.0, -1, 49, 0, false, false, false)

    cam = CreateCam('DEFAULT_SCRIPTED_CAMERA', true)
    local camPos = GetOffsetFromEntityInWorldCoords(ped, 0.0, 1.15, 0.7)
    SetCamCoord(cam, camPos.x, camPos.y, camPos.z)
    PointCamAtEntity(cam, ped, 0.0, 0.0, 0.65, true)
    SetCamFov(cam, 42.0)
    SetCamActive(cam, true)
    RenderScriptCams(true, false, 0, true, true)

    return {
        cam = cam,
        phone = phone,
    }
end

NUI.onCallback('openAktePhotoMode', function(body, cb)
    local payload = type(body) == 'table' and body or {}
    local _targetType = type(payload.kind) == 'string' and payload.kind or 'person'
    local captureMode = type(payload.mode) == 'string' and payload.mode:lower() or 'standard'
    local rawQuality = (((Config or {}).MDT or {}).photo or {}).screenshot_quality
    local captureQuality = tonumber(rawQuality) or 0.65
    if captureQuality < 0.1 then captureQuality = 0.1 end
    if captureQuality > 1.0 then captureQuality = 1.0 end

    if GetResourceState('screenshot-basic') ~= 'started' then
        cb({ ok = false, error = 'screenshot_basic_not_started', images = {} })
        return
    end

    local wasVisible = NUI and NUI.isVisible and NUI.isVisible() or false
    local activeScreen = NUI and NUI.getActiveScreen and NUI.getActiveScreen() or 'tablet'
    local requestedScreen = type(payload.screen) == 'string' and payload.screen or nil
    local reopenScreen = requestedScreen or activeScreen
    if reopenScreen == 'tablet' and _targetType == 'person' then
        reopenScreen = 'persons'
    elseif reopenScreen == 'tablet' and _targetType == 'vehicle' then
        reopenScreen = 'vehicles'
    end
    local previousViewMode = GetFollowPedCamViewMode()
    local ped = PlayerPedId()

    local images = {}
    local running = true
    local inputUnlockAt = GetGameTimer() + 300
    local selfieState = nil
    local function normalizeShotData(raw)
        if type(raw) == 'string' then
            local trimmed = raw:gsub('^%s+', ''):gsub('%s+$', '')
            if trimmed == '' then return nil end

            if trimmed:sub(1, 5) == 'data:' then
                return trimmed
            end

            if trimmed:sub(1, 1) == '{' then
                local okJson, decoded = pcall(json.decode, trimmed)
                if okJson and type(decoded) == 'table' and type(decoded.data) == 'string' then
                    local nested = decoded.data:gsub('^%s+', ''):gsub('%s+$', '')
                    if nested ~= '' then
                        if nested:sub(1, 5) == 'data:' then
                            return nested
                        end
                        return ('data:image/jpeg;base64,%s'):format(nested)
                    end
                end
            end

            return ('data:image/jpeg;base64,%s'):format(trimmed)
        end

        if type(raw) == 'table' and type(raw.data) == 'string' then
            local nested = raw.data:gsub('^%s+', ''):gsub('%s+$', '')
            if nested == '' then return nil end
            if nested:sub(1, 5) == 'data:' then
                return nested
            end
            return ('data:image/jpeg;base64,%s'):format(nested)
        end

        return nil
    end
    local function justPressed(control)
        for group = 0, 2 do
            if IsControlJustPressed(group, control) or IsDisabledControlJustPressed(group, control) then
                return true
            end
        end
        return false
    end

    local function isDown(control)
        for group = 0, 2 do
            if IsControlPressed(group, control) or IsDisabledControlPressed(group, control) then
                return true
            end
        end
        return false
    end

    local enterHeld = false

    if wasVisible then
        SetNuiFocus(false, false)
        NUI.send('setVisible', {
            visible = false,
            screen = nil,
        })
    end

    if captureMode == 'selfie' then
        selfieState = startPhotoSelfieSetup(ped)
    else
        SetFollowPedCamViewMode(4)
    end

    local helpText = 'Press ENTER to take photo. ESC/BACKSPACE/DELETE to cancel.'

    while running do
        Wait(0)

        if not DoesEntityExist(ped) then
            break
        end

        if captureMode == 'selfie' then
            local camPos = GetOffsetFromEntityInWorldCoords(ped, 0.0, 1.15, 0.7)
            SetCamCoord(selfieState.cam, camPos.x, camPos.y, camPos.z)
            PointCamAtEntity(selfieState.cam, ped, 0.0, 0.0, 0.65, true)
        else
            SetFollowPedCamViewMode(4)
        end

        BeginTextCommandDisplayHelp('STRING')
        AddTextComponentSubstringPlayerName(helpText)
        EndTextCommandDisplayHelp(0, false, false, -1)

        if GetGameTimer() < inputUnlockAt then
            goto continue
        end

        local enterDown =
            isDown(18) or
            isDown(176) or
            isDown(191) or
            isDown(201)

        local pressedEnter = (not enterHeld and enterDown)
            or justPressed(18)
            or justPressed(176)
            or justPressed(191)
            or justPressed(201)

        enterHeld = enterDown

        if pressedEnter then
            Debug.debug(('[photo] Enter detected, requesting screenshot (quality=%s)...'):format(captureQuality))
            local shotData = nil
            local captureDone = false

            exports['screenshot-basic']:requestScreenshot({
                encoding = 'jpg',
                quality = captureQuality,
            }, function(data)
                shotData = data
                captureDone = true
                local dataType = type(data)
                local dataLen = dataType == 'string' and #data or -1
                Debug.debug(('[photo] screenshot callback type=%s len=%s'):format(dataType, dataLen))
            end)

            local timeoutAt = GetGameTimer() + 5000
            while not captureDone and GetGameTimer() < timeoutAt do
                Wait(0)
            end

            local normalized = normalizeShotData(shotData)
            if type(normalized) == 'string' and normalized ~= '' then
                images[#images + 1] = normalized
                Debug.debug(('[photo] normalized screenshot accepted len=%s'):format(#normalized))
            else
                Debug.debug('[photo] screenshot was empty/invalid after normalization')
            end

            running = false
        elseif justPressed(200) or justPressed(177) or justPressed(178) then
            running = false
        end

        ::continue::
    end

    if selfieState and selfieState.cam then
        RenderScriptCams(false, false, 0, true, true)
        SetCamActive(selfieState.cam, false)
        DestroyCam(selfieState.cam, false)
    end
    deleteEntitySafe(selfieState and selfieState.phone or nil)
    ClearPedSecondaryTask(ped)
    SetFollowPedCamViewMode(previousViewMode)

    if wasVisible then
        SetNuiFocus(true, true)
        NUI.send('setScreen', { screen = reopenScreen })
        NUI.send('setVisible', {
            visible = true,
            screen = reopenScreen,
        })
    end

    Debug.debug(('[photo] returning images count=%s'):format(#images))
    cb({ ok = true, images = images })
end)



Debug.debug(('Tablet module loaded. Command: /%s'):format(OPEN_COMMAND))
