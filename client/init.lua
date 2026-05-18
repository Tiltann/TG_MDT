-- ============================================================
--  TG_MDT | client/init.lua
--  Client-side startup and initialization.
-- ============================================================


-- ── Startup ────────────────────────────────────────────
Debug.debug('Client started')
Debug.debug(('Locale set to: %s'):format(Config.Locale))
Debug.debug(('Framework: %s'):format(Framework.name))

TG_MDT_CLIENT_INITIALIZED = false

local function loadLocaleDictionary(locale)
	local resource = GetCurrentResourceName()
	local path = ('locales/%s.json'):format(locale or 'en')
	Debug.debug(('Loading locale dictionary: %s'):format(path))
	local raw = LoadResourceFile(resource, path)

	if not raw and locale ~= 'en' then
		raw = LoadResourceFile(resource, 'locales/en.json')
	end

	if not raw then
		Debug.warn(('Could not load locale file: %s'):format(path))
		return {}
	end

	local ok, decoded = pcall(json.decode, raw)
	if not ok or type(decoded) ~= 'table' then
		Debug.warn(('Invalid locale json in %s'):format(path))
		return {}
	end

	Debug.debug(('Loaded locale dictionary: %s | keys=%s'):format(path, tostring(#decoded)))
	return decoded
end

local function countKeys(value)
	local total = 0
	for _ in pairs(value or {}) do
		total = total + 1
	end
	return total
end

local locale_dictionary = loadLocaleDictionary(Config.Locale)
local translations_by_locale = {
	en = loadLocaleDictionary('en'),
	de = loadLocaleDictionary('de'),
}

---@param key string
---@param fallback string
---@return string
local function t(key, fallback)
	if type(locale_dictionary) == 'table' and type(locale_dictionary[key]) == 'string' and locale_dictionary[key] ~= '' then
		return locale_dictionary[key]
	end
	return fallback
end

---@return table
local function buildPlayerUiData()
	local fallback = {
		name = 'Unknown User',
		badge = '',
	}

	if not Framework or not Framework.Client or type(Framework.Client.getPlayerData) ~= 'function' then
		return fallback
	end

	local pdata = Framework.Client.getPlayerData() or {}
	local job = (Framework.Client.getJob and Framework.Client.getJob()) or pdata.job or {}

	local first = nil
	local last = nil
	local name = nil
	local badge = nil

	if type(pdata.firstname) == 'string' then first = pdata.firstname end
	if type(pdata.lastname) == 'string' then last = pdata.lastname end

	if type(pdata.charinfo) == 'table' then
		if type(pdata.charinfo.firstname) == 'string' then first = first or pdata.charinfo.firstname end
		if type(pdata.charinfo.lastname) == 'string' then last = last or pdata.charinfo.lastname end
	end

	if type(pdata.name) == 'string' and pdata.name ~= '' then
		name = pdata.name
	elseif type(first) == 'string' and type(last) == 'string' then
		name = (first .. ' ' .. last)
	elseif type(first) == 'string' and first ~= '' then
		name = first
	elseif type(last) == 'string' and last ~= '' then
		name = last
	elseif type(GetPlayerName(PlayerId())) == 'string' then
		name = GetPlayerName(PlayerId())
	end

	if type(pdata.badge) == 'string' then
		badge = pdata.badge
	elseif type(pdata.callsign) == 'string' then
		badge = pdata.callsign
	elseif type(pdata.citizenid) == 'string' then
		badge = pdata.citizenid
	elseif type(pdata.identifier) == 'string' then
		badge = pdata.identifier
	elseif type(job) == 'table' and type(job.label) == 'string' then
		badge = job.label
	elseif type(job) == 'table' and type(job.name) == 'string' then
		badge = job.name
	end

	return {
		name = (type(name) == 'string' and name ~= '') and name or fallback.name,
		badge = (type(badge) == 'string') and badge or fallback.badge,
	}
end

Debug.debug('Client init: locale dictionaries loaded', {
	active_locale = Config.Locale,
	default_screen = (Config.MDT and Config.MDT.default_screen) or 'tablet',
	active_locale_keys = countKeys(locale_dictionary),
	locale_cache_keys = countKeys(translations_by_locale),
})

NUI.onReady(function()
	Debug.debug('NUI.onReady: preparing initial UI payloads')
	NUI.send('setScreen', { screen = (Config.MDT and Config.MDT.default_screen) or 'tablet' })
	Debug.debug('Client init: sent initial screen')
	NUI.send('setData', {
		key = 'meta',
		value = {
			resource = GetCurrentResourceName(),
			framework = Framework.name,
			locale = Config.Locale,
			translations = locale_dictionary,
			translationsByLocale = translations_by_locale,
			modules = Config.Modules or {},
			mdt = Config.MDT or {},
			akteModels = Config.AkteModels or {},
		},
	})
	Debug.debug('Client init: sent meta payload')

	NUI.send('setData', {
		key = 'allowedJobs',
		value = (Config.MDT and Config.MDT.allowed_jobs) or {},
	})
	Debug.debug('Client init: sent allowedJobs payload')

	NUI.send('setData', {
		key = 'player',
		value = buildPlayerUiData(),
	})
	Debug.debug('Client init: sent player payload')

	local duty = {
		onDuty = true,
	}
	local okDuty, resultDuty = pcall(function()
		return lib.callback.await('TG_MDT:getDutyState', false)
	end)

	if okDuty and type(resultDuty) == 'table' then
		duty = resultDuty
	else
		Debug.warn('Client init: failed to fetch duty state from server callback')
	end

	NUI.send('setData', {
		key = 'duty',
		value = duty,
	})
	Debug.debug('Client init: sent duty payload')

	local persons = {}
	local ok, result = pcall(function()
		return lib.callback.await('TG_MDT:getPersons', false)
	end)

	if ok and type(result) == 'table' then
		persons = result
	else
		Debug.warn('Client init: failed to fetch persons from server callback')
	end

	NUI.send('setData', {
		key = 'persons',
		value = persons,
	})
	Debug.debug(('Client init: sent persons payload (%s records)'):format(#persons))

	local vehicles = {}
	local okVehicles, resultVehicles = pcall(function()
		return lib.callback.await('TG_MDT:getVehicles', false)
	end)

	if okVehicles and type(resultVehicles) == 'table' then
		vehicles = resultVehicles
	else
		Debug.warn('Client init: failed to fetch vehicles from server callback')
	end

	NUI.send('setData', {
		key = 'vehicles',
		value = vehicles,
	})
	Debug.debug(('Client init: sent vehicles payload (%s records)'):format(#vehicles))

	local bootstrap = {}
	local okBootstrap, resultBootstrap = pcall(function()
		return lib.callback.await('TG_MDT:getAkteBootstrap', false)
	end)

	if okBootstrap and type(resultBootstrap) == 'table' then
		bootstrap = resultBootstrap
	else
		Debug.warn('Client init: failed to fetch Akte bootstrap')
	end

	NUI.send('setData', {
		key = 'personAkten',
		value = bootstrap.personAkten or {},
	})

	NUI.send('setData', {
		key = 'vehicleAkten',
		value = bootstrap.vehicleAkten or {},
	})
	Debug.debug('Client init: sent Akte bootstrap payload')

	TG_MDT_CLIENT_INITIALIZED = true
	Debug.debug('Client init: initialization complete')
end)

-- ── Map tile missing — NUI → client → server ───────────────
-- The web UI fires 'mapTilesMissing' via fetchNui when it detects
-- that tiles are not loading. We relay it to the server once per session.
local _mapWarningFired = false
NUI.onCallback('mapTilesMissing', function(_, cb)
    if not _mapWarningFired then
        _mapWarningFired = true
        Debug.warn('Map tiles missing — reported by NUI, notifying server')
        TriggerServerEvent('TG_MDT:mapTilesMissing')
    end
    cb('ok')
end)

-- ── Akte bridge (NUI <-> client <-> server) ───────────────
NUI.onCallback('getPersonAkte', function(body, cb)
	local identifier = body and body.identifier or nil
	local ok, result = pcall(function()
		return lib.callback.await('TG_MDT:getPersonAkte', false, identifier)
	end)
	cb(ok and result or {})
end)

NUI.onCallback('savePersonAkte', function(body, cb)
	local identifier = body and body.identifier or nil
	local akte = body and body.akte or {}
	local imageLen = 0
	if type(akte) == 'table' and type(akte.personImage) == 'string' then
		imageLen = #akte.personImage
	end
	local ok, result = pcall(function()
		return lib.callback.await('TG_MDT:savePersonAkte', false, identifier, akte)
	end)
	if not ok then
		Debug.warn(('savePersonAkte failed identifier=%s imageLen=%s err=%s')
			:format(tostring(identifier), tostring(imageLen), tostring(result)))
	end
	cb(ok and result or {})
end)

NUI.onCallback('getVehicleAkte', function(body, cb)
	local plate = body and body.plate or nil
	local ok, result = pcall(function()
		return lib.callback.await('TG_MDT:getVehicleAkte', false, plate)
	end)
	cb(ok and result or {})
end)

NUI.onCallback('saveVehicleAkte', function(body, cb)
	local plate = body and body.plate or nil
	local akte = body and body.akte or {}
	local imageLen = 0
	if type(akte) == 'table' and type(akte.vehicleImage) == 'string' then
		imageLen = #akte.vehicleImage
	end
	local ok, result = pcall(function()
		return lib.callback.await('TG_MDT:saveVehicleAkte', false, plate, akte)
	end)
	if not ok then
		Debug.warn(('saveVehicleAkte failed plate=%s imageLen=%s err=%s')
			:format(tostring(plate), tostring(imageLen), tostring(result)))
	end
	cb(ok and result or {})
end)

NUI.onCallback('toggleDuty', function(body, cb)
	local payload = type(body) == 'table' and body or {}
	local ok, result = pcall(function()
		return lib.callback.await('TG_MDT:toggleDuty', false, payload)
	end)
	cb(ok and result or { onDuty = true })
end)

NUI.onCallback('setDutyState', function(body, cb)
	local payload = type(body) == 'table' and body or {}
	local ok, result = pcall(function()
		return lib.callback.await('TG_MDT:setDutyState', false, payload)
	end)
	cb(ok and result or { onDuty = true })
end)

NUI.onCallback('debugUiLog', function(body, cb)
	local payload = type(body) == 'table' and body or {}
	local tag = type(payload.tag) == 'string' and payload.tag or 'ui'
	local message = type(payload.message) == 'string' and payload.message or ''
	Debug.debug(('[ui:%s] %s'):format(tag, message))
	cb({ ok = true })
end)

NUI.onCallback('openAktePhotoMode', function(body, cb)
	local payload = type(body) == 'table' and body or {}
	local _targetType = type(payload.kind) == 'string' and payload.kind or 'person'
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
			screen = reopenScreen,
		})
	end

	SetFollowPedCamViewMode(4)

	local helpText = t(
		'tablet.camera.capture_help',
		'Press ENTER to take photo. ESC/BACKSPACE/DELETE to cancel.'
	)

	while running do
		Wait(0)

		if not DoesEntityExist(ped) then
			break
		end

		-- Keep player in first-person while still allowing normal movement/look.
		SetFollowPedCamViewMode(4)

		BeginTextCommandDisplayHelp('STRING')
		AddTextComponentSubstringPlayerName(helpText)
		EndTextCommandDisplayHelp(0, false, false, -1)

		if GetGameTimer() < inputUnlockAt then
			goto continue
		end

		local enterDown =
			isDown(18) or -- INPUT_ENTER
			isDown(176) or -- INPUT_CELLPHONE_SELECT
			isDown(191) or -- INPUT_FRONTEND_RRIGHT (Enter)
			isDown(201) -- INPUT_FRONTEND_ACCEPT

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

RegisterNetEvent('TG_MDT:akteUpdated', function(payload)
	if type(payload) ~= 'table' then return end
	NUI.send('setData', {
		key = 'akteSync',
		value = payload,
	})
end)

RegisterNetEvent('TG_MDT:dutyStateChanged', function(payload)
	if type(payload) ~= 'table' then return end
	NUI.send('setData', {
		key = 'duty',
		value = payload,
	})

	NUI.send('setData', {
		key = 'player',
		value = buildPlayerUiData(),
	})
end)
