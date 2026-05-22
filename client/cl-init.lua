-- ============================================================
--  TG_MDT | client/cl-init.lua
--  Client-side startup and initialization.
-- ============================================================


-- ── Startup ────────────────────────────────────────────
Debug.debug('Client started')
Debug.debug(('Locale set to: %s'):format(Config.Locale))
Debug.debug(('Framework: %s'):format(Framework.name))

TG_MDT_CLIENT_INITIALIZED = false

local EVENT_SERVER_JOIN_RADIO = 'TG_MDT:server:joinRadioChannel'
local EVENT_SERVER_LEAVE_RADIO = 'TG_MDT:server:leaveRadioChannel'
local EVENT_CLIENT_UPDATE_RADIO_MEMBERS = 'TG_MDT:client:updateRadioMembers'
local EVENT_CLIENT_AKTE_UPDATED = 'TG_MDT:akteUpdated'
local EVENT_CLIENT_DUTY_STATE_CHANGED = 'TG_MDT:dutyStateChanged'
local EVENT_CLIENT_DISPATCH_STATE_CHANGED = 'TG_MDT:dispatchStateChanged'
local EVENT_CLIENT_DISPATCH_HISTORY_CHANGED = 'TG_MDT:dispatchHistoryChanged'

local CALLBACK_TOGGLE_DUTY = 'TG_MDT:toggleDuty'
local CALLBACK_SET_DUTY_STATE = 'TG_MDT:setDutyState'
local CALLBACK_SET_DISPATCH_STATUS = 'TG_MDT:setDispatchStatus'
local CALLBACK_GET_PERSONS = 'TG_MDT:getPersons'
local CALLBACK_GET_VEHICLES = 'TG_MDT:getVehicles'
local CALLBACK_GET_AKTE_BOOTSTRAP = 'TG_MDT:getAkteBootstrap'
local CALLBACK_GET_DISPATCH_STATE = 'TG_MDT:getDispatchState'
local CALLBACK_ASSIGN_DISPATCH_UNIT = 'TG_MDT:assignDispatchUnit'
local CALLBACK_UNASSIGN_DISPATCH_UNIT = 'TG_MDT:unassignDispatchUnit'
local CALLBACK_ASSIGN_DISPATCH_VEHICLE = 'TG_MDT:assignDispatchVehicle'
local CALLBACK_UNASSIGN_DISPATCH_VEHICLE = 'TG_MDT:unassignDispatchVehicle'
local CALLBACK_ACCEPT_DISPATCH_CASE = 'TG_MDT:acceptDispatchCase'
local CALLBACK_CLOSE_DISPATCH_CASE = 'TG_MDT:closeDispatchCase'
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
local CALLBACK_GET_DISPATCH_MODULE_STATE = 'TG_MDT:getDispatchModuleState'
local CALLBACK_GET_DISPATCH_HISTORY = 'TG_MDT:getDispatchHistory'

local function countKeys(value)
	local total = 0
	for _ in pairs(value or {}) do
		total = total + 1
	end
	return total
end

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

	Debug.debug(('Loaded locale dictionary: %s | keys=%s'):format(path, tostring(countKeys(decoded))))
	return decoded
end

local function buildClockData()
	local hours = tonumber(GetClockHours()) or 0
	local minutes = tonumber(GetClockMinutes()) or 0
	local period = hours < 12 and 'morning' or 'evening'

	return {
		hour = hours,
		minute = minutes,
		period = period,
		label = ('%02d:%02d'):format(hours, minutes),
	}
end


local translations_by_locale = {
	en = loadLocaleDictionary('en'),
	de = loadLocaleDictionary('de'),
}
local locale_dictionary = translations_by_locale[Config.Locale] or translations_by_locale.en

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
		gradeDisplay = '',
		gradeLevel = nil,
		gradeCount = nil,
	}

	if not Framework or not Framework.Client or type(Framework.Client.getPlayerData) ~= 'function' then
		return fallback
	end

	local pdata = Framework.Client.getPlayerData() or {}
	local job = (Framework.Client.getJob and Framework.Client.getJob()) or pdata.job or {}

	local first = nil
	local last = nil
	local name = nil
	local gradeName = nil
	local gradeNumber = nil
	local gradeLevel = nil
	local gradeCount = nil

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

	if type(job) == 'table' then
		if type(job.grade) == 'table' then
			if type(job.grade.label) == 'string' and job.grade.label ~= '' then
				gradeName = job.grade.label
			elseif type(job.grade.name) == 'string' and job.grade.name ~= '' then
				gradeName = job.grade.name
			end

			if type(job.grade.level) == 'number' or type(job.grade.level) == 'string' then
				gradeNumber = tostring(job.grade.level)
				gradeLevel = tonumber(job.grade.level)
			elseif type(job.grade.grade) == 'number' or type(job.grade.grade) == 'string' then
				gradeNumber = tostring(job.grade.grade)
				gradeLevel = tonumber(job.grade.grade)
			elseif type(job.grade.value) == 'number' or type(job.grade.value) == 'string' then
				gradeNumber = tostring(job.grade.value)
				gradeLevel = tonumber(job.grade.value)
			end
		else
			if type(job.grade_label) == 'string' and job.grade_label ~= '' then
				gradeName = job.grade_label
			elseif type(job.grade_name) == 'string' and job.grade_name ~= '' then
				gradeName = job.grade_name
			end

			if type(job.grade) == 'number' or type(job.grade) == 'string' then
				gradeNumber = tostring(job.grade)
				gradeLevel = tonumber(job.grade)
			end
		end

		local grades = job.grades
		if type(grades) == 'table' then
			local total = 0
			for _ in pairs(grades) do
				total = total + 1
			end
			if total > 0 then
				gradeCount = total
			end
		end
	end

	local gradeDisplay = ''
	if type(gradeName) == 'string' and gradeName ~= '' and type(gradeNumber) == 'string' and gradeNumber ~= '' then
		gradeDisplay = ('%s %s'):format(gradeName, gradeNumber)
	elseif type(gradeName) == 'string' and gradeName ~= '' then
		gradeDisplay = gradeName
	elseif type(gradeNumber) == 'string' and gradeNumber ~= '' then
		gradeDisplay = gradeNumber
	end

	return {
		name = (type(name) == 'string' and name ~= '') and name or fallback.name,
		gradeDisplay = gradeDisplay,
		gradeName = type(gradeName) == 'string' and gradeName or '',
		gradeLevel = gradeLevel,
		gradeCount = gradeCount,
	}
end

NUI.onCallback('toggleDuty', function(body, cb)
	local payload = type(body) == 'table' and body or {}
	local ok, result = pcall(function()
		return lib.callback.await(CALLBACK_TOGGLE_DUTY, false, payload)
	end)
	cb(ok and result or { onDuty = true })
end)

NUI.onCallback('setDutyState', function(body, cb)
	local payload = type(body) == 'table' and body or {}
	local ok, result = pcall(function()
		return lib.callback.await(CALLBACK_SET_DUTY_STATE, false, payload)
	end)
	cb(ok and result or { onDuty = true })
end)

NUI.onCallback('setDispatchStatus', function(body, cb)
	local payload = type(body) == 'table' and body or {}
	local status = type(payload.status) == 'string' and payload.status or ''
	if status == '' then
		cb({ ok = false })
		return
	end

	local ok, result = pcall(function()
		return lib.callback.await(CALLBACK_SET_DISPATCH_STATUS, false, { status = status })
	end)

	cb({ ok = ok and result == true })
end)

-- ── Radio helper functions & NUI callbacks ──────────────

local function isRadioFeatureEnabled()
	local mdtCfg = Config and Config.MDT or {}
	local radioCfg = type(mdtCfg.radio) == 'table' and mdtCfg.radio or {}
	return radioCfg.enabled ~= false
end

local function isStandaloneRadioAllowed()
	local mdtCfg = Config and Config.MDT or {}
	local radioCfg = type(mdtCfg.radio) == 'table' and mdtCfg.radio or {}
	return radioCfg.allow_standalone == true
end

local function getActiveVoiceSystem()
	if not isRadioFeatureEnabled() then
		return 'disabled'
	end

	if GetResourceState('pma-voice') == 'started' then
		return 'pma-voice'
	elseif GetResourceState('saltychat') == 'started' then
		return 'saltychat'
	end

	if isStandaloneRadioAllowed() then
		return 'standalone'
	end

	return 'disabled'
end

local function getActiveRadioFrequency()
	local system = getActiveVoiceSystem()
	if system == 'disabled' then
		return ''
	end

	if system == 'pma-voice' then
		local ok, freq = pcall(function()
			return exports['pma-voice']:getRadioChannel()
		end)
		if not ok then
			return '0'
		end
		if freq == nil or freq == false then
			return '0'
		end
		return tostring(freq)
	elseif system == 'saltychat' then
		local ok, freq = pcall(function()
			return exports['saltychat']:GetRadioChannel()
		end)
		if not ok then
			return 'none'
		end
		if freq == nil or freq == false then
			return 'none'
		end
		return tostring(freq)
	end
	return 'none'
end

NUI.onCallback('joinRadioChannel', function(body, cb)
	local payload = type(body) == 'table' and body or {}
	local freq = type(payload.frequency) == 'string' and payload.frequency or tostring(payload.frequency or '')
	local system = getActiveVoiceSystem()
	if system == 'disabled' then
		cb({ ok = false, reason = 'radio_disabled', frequency = '', system = system })
		return
	end

	local freqNum = tonumber(freq)

	if system == 'pma-voice' and freqNum then
		pcall(function()
			exports['pma-voice']:setRadioChannel(freqNum)
		end)
	elseif system == 'saltychat' then
		pcall(function()
			exports['saltychat']:SetRadioChannel(freq, true)
		end)
	end

	TriggerServerEvent(EVENT_SERVER_JOIN_RADIO, freq)
	cb({ ok = true, frequency = freq, system = system })
end)

NUI.onCallback('leaveRadioChannel', function(_, cb)
	local system = getActiveVoiceSystem()
	if system == 'disabled' then
		cb({ ok = false, reason = 'radio_disabled', frequency = '', system = system })
		return
	end

	if system == 'pma-voice' then
		pcall(function()
			exports['pma-voice']:setRadioChannel(0)
		end)
	elseif system == 'saltychat' then
		pcall(function()
			exports['saltychat']:SetRadioChannel('', true)
		end)
	end

	TriggerServerEvent(EVENT_SERVER_LEAVE_RADIO)
	cb({ ok = true, frequency = '', system = system })
end)

RegisterNetEvent(EVENT_CLIENT_UPDATE_RADIO_MEMBERS, function(members)
	NUI.send('setData', {
		key = 'radioMembers',
		value = members or {}
	})
end)

NUI.onCallback('debugUiLog', function(body, cb)
	local payload = type(body) == 'table' and body or {}
	local tag = type(payload.tag) == 'string' and payload.tag or 'ui'
	local message = type(payload.message) == 'string' and payload.message or ''
	Debug.debug(('[ui:%s] %s'):format(tag, message))
	cb({ ok = true })
end)

NUI.onCallback('getTabletBootstrap', function(_, cb)
	local ok, result = pcall(function()
		return {
			persons = lib.callback.await(CALLBACK_GET_PERSONS, false),
			vehicles = lib.callback.await(CALLBACK_GET_VEHICLES, false),
			akteBootstrap = lib.callback.await(CALLBACK_GET_AKTE_BOOTSTRAP, false),
		}
	end)

	if not ok then
		Debug.warn(('getTabletBootstrap failed: %s'):format(tostring(result)))
		cb({ persons = {}, vehicles = {}, akteBootstrap = { personAkten = {}, vehicleAkten = {} } })
		return
	end

	cb(result or { persons = {}, vehicles = {}, akteBootstrap = { personAkten = {}, vehicleAkten = {} } })
end)

NUI.onCallback('getDispatchState', function(_, cb)
	local ok, result = pcall(function()
		return lib.callback.await(CALLBACK_GET_DISPATCH_STATE, false)
	end)
	cb(ok and result or {})
end)

NUI.onCallback('assignDispatchUnit', function(body, cb)
	local payload = type(body) == 'table' and body or {}
	local ok, result = pcall(function()
		return lib.callback.await(CALLBACK_ASSIGN_DISPATCH_UNIT, false, payload)
	end)
	cb({ ok = ok and result == true })
end)

NUI.onCallback('unassignDispatchUnit', function(body, cb)
	local payload = type(body) == 'table' and body or {}
	local ok, result = pcall(function()
		return lib.callback.await(CALLBACK_UNASSIGN_DISPATCH_UNIT, false, payload)
	end)
	cb({ ok = ok and result == true })
end)

NUI.onCallback('assignDispatchVehicle', function(body, cb)
	local payload = type(body) == 'table' and body or {}
	local ok, result = pcall(function()
		return lib.callback.await(CALLBACK_ASSIGN_DISPATCH_VEHICLE, false, payload)
	end)
	cb({ ok = ok and result == true })
end)

NUI.onCallback('unassignDispatchVehicle', function(body, cb)
	local payload = type(body) == 'table' and body or {}
	local ok, result = pcall(function()
		return lib.callback.await(CALLBACK_UNASSIGN_DISPATCH_VEHICLE, false, payload)
	end)
	cb({ ok = ok and result == true })
end)

NUI.onCallback('acceptDispatchCase', function(body, cb)
	local payload = type(body) == 'table' and body or {}
	local ok, result = pcall(function()
		return lib.callback.await(CALLBACK_ACCEPT_DISPATCH_CASE, false, payload)
	end)
	cb({ ok = ok and result == true })
end)

NUI.onCallback('closeDispatchCase', function(body, cb)
	local payload = type(body) == 'table' and body or {}
	local ok, result = pcall(function()
		return lib.callback.await(CALLBACK_CLOSE_DISPATCH_CASE, false, payload)
	end)
	cb({ ok = ok and result == true })
end)

NUI.onCallback('getAkteCompartments', function(body, cb)
	local payload = type(body) == 'table' and body or {}
	local kind = type(payload.kind) == 'string' and payload.kind or ''
	local value = type(payload.value) == 'string' and payload.value or ''
	local ok, result = pcall(function()
		return lib.callback.await(CALLBACK_GET_AKTE_COMPARTMENTS, false, kind, value)
	end)
	cb(ok and result or {})
end)

NUI.onCallback('getPersonAkte', function(body, cb)
	local payload = type(body) == 'table' and body or {}
	local identifier = type(payload.identifier) == 'string' and payload.identifier or ''
	local compartment = type(payload.compartment) == 'string' and payload.compartment or nil
	local ok, result = pcall(function()
		return lib.callback.await(CALLBACK_GET_PERSON_AKTE, false, identifier, compartment)
	end)
	cb(ok and result or {})
end)

NUI.onCallback('savePersonAkte', function(body, cb)
	local payload = type(body) == 'table' and body or {}
	local identifier = type(payload.identifier) == 'string' and payload.identifier or ''
	local akte = type(payload.akte) == 'table' and payload.akte or {}
	local compartment = type(payload.compartment) == 'string' and payload.compartment or nil
	local ok, result = pcall(function()
		return lib.callback.await(CALLBACK_SAVE_PERSON_AKTE, false, identifier, akte, compartment)
	end)
	cb(ok and result or {})
end)

NUI.onCallback('getVehicleAkte', function(body, cb)
	local payload = type(body) == 'table' and body or {}
	local plate = type(payload.plate) == 'string' and payload.plate or ''
	local compartment = type(payload.compartment) == 'string' and payload.compartment or nil
	local ok, result = pcall(function()
		return lib.callback.await(CALLBACK_GET_VEHICLE_AKTE, false, plate, compartment)
	end)
	cb(ok and result or {})
end)

NUI.onCallback('saveVehicleAkte', function(body, cb)
	local payload = type(body) == 'table' and body or {}
	local plate = type(payload.plate) == 'string' and payload.plate or ''
	local akte = type(payload.akte) == 'table' and payload.akte or {}
	local compartment = type(payload.compartment) == 'string' and payload.compartment or nil
	local ok, result = pcall(function()
		return lib.callback.await(CALLBACK_SAVE_VEHICLE_AKTE, false, plate, akte, compartment)
	end)
	cb(ok and result or {})
end)

NUI.onCallback('removeAkteCompartment', function(body, cb)
	local payload = type(body) == 'table' and body or {}
	local kind = type(payload.kind) == 'string' and payload.kind or ''
	local value = type(payload.value) == 'string' and payload.value or ''
	local compartment = type(payload.compartment) == 'string' and payload.compartment or ''
	local ok, result = pcall(function()
		return lib.callback.await(CALLBACK_REMOVE_AKTE_COMPARTMENT, false, kind, value, compartment)
	end)
	cb({ ok = ok and result == true })
end)

NUI.onCallback('getNearbyAgencyPlayers', function(body, cb)
	local payload = type(body) == 'table' and body or {}
	local compartment = type(payload.compartment) == 'string' and payload.compartment or nil
	local maxDistance = tonumber(payload.maxDistance)
	local ok, result = pcall(function()
		return lib.callback.await(CALLBACK_GET_NEARBY_AGENCY_PLAYERS, false, compartment, maxDistance)
	end)
	cb(ok and result or {})
end)

NUI.onCallback('shareAkteWithPlayer', function(body, cb)
	local payload = type(body) == 'table' and body or {}
	local kind = type(payload.kind) == 'string' and payload.kind or ''
	local value = type(payload.value) == 'string' and payload.value or ''
	local targetSource = tonumber(payload.targetSource)
	local compartment = type(payload.compartment) == 'string' and payload.compartment or nil
	local ok, result = pcall(function()
		return lib.callback.await(CALLBACK_SHARE_AKTE_WITH_PLAYER, false, kind, value, targetSource, compartment)
	end)
	cb({ ok = ok and result == true })
end)

NUI.onCallback('getLeadershipMembers', function(_, cb)
	local ok, result = pcall(function()
		return lib.callback.await(CALLBACK_GET_LEADERSHIP_MEMBERS, false)
	end)
	cb(ok and result or {})
end)

NUI.onCallback('setLeadershipMemberPermission', function(body, cb)
	local payload = type(body) == 'table' and body or {}
	local ok, result = pcall(function()
		return lib.callback.await(CALLBACK_LEADERSHIP_SET_MEMBER_PERMISSION, false, payload)
	end)
	if type(result) == 'table' then
		cb(result)
		return
	end
	cb({ ok = ok and result == true })
end)

NUI.onCallback('getAuditLogs', function(body, cb)
	local payload = type(body) == 'table' and body or {}
	local ok, result = pcall(function()
		return lib.callback.await(CALLBACK_GET_AUDIT_LOGS, false, payload)
	end)
	cb(ok and result or {})
end)

NUI.onCallback('getLaws', function(_, cb)
	local ok, result = pcall(function()
		return lib.callback.await(CALLBACK_GET_LAWS, false)
	end)
	cb(ok and result or '')
end)

NUI.onCallback('saveLaws', function(body, cb)
	local payload = type(body) == 'table' and body or {}
	local content = type(payload.content) == 'string' and payload.content or ''
	local ok, result = pcall(function()
		return lib.callback.await(CALLBACK_SAVE_LAWS, false, content)
	end)
	if type(result) == 'table' then
		cb(result)
		return
	end
	cb({ ok = ok and result == true })
end)

RegisterNetEvent(EVENT_CLIENT_AKTE_UPDATED, function(payload)
	if type(payload) ~= 'table' then return end
	
	if type(payload.kind) ~= 'string' or (payload.kind ~= 'person' and payload.kind ~= 'vehicle') then
		return
	end
	
	if payload.kind == 'person' and (type(payload.identifier) ~= 'string' or payload.identifier == '') then
		return
	end
	
	if payload.kind == 'vehicle' and (type(payload.plate) ~= 'string' or payload.plate == '') then
		return
	end
	
	if type(payload.akte) ~= 'table' then
		return
	end
	
	NUI.send('setData', {
		key = 'akteSync',
		value = payload,
	})
end)

RegisterNetEvent(EVENT_CLIENT_DUTY_STATE_CHANGED, function(payload)
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

RegisterNetEvent(EVENT_CLIENT_DISPATCH_STATE_CHANGED, function(payload)
	if type(payload) ~= 'table' then return end
	NUI.send('setData', {
		key = 'dispatchState',
		value = payload,
	})
end)

RegisterNetEvent(EVENT_CLIENT_DISPATCH_HISTORY_CHANGED, function(payload)
	if type(payload) ~= 'table' then return end
	NUI.send('setData', {
		key = 'dispatchHistory',
		value = payload,
	})
end)

-- ── Meta / initial-state helpers ──────────────────────────
-- These are module-level so cl-tablet.lua can also call TG_MDT_sendInitialState().

local function serializeAkteField(f)
	if type(f) ~= 'table' then return nil end
	local out = {
		key      = f.key,
		label_key = f.label_key,
		type     = f.type,
		editable = f.editable,
		options  = f.options,
	}
	if type(f.default) ~= 'function' and type(f.default) ~= 'table' then
		out.default = f.default
	end
	return out
end

local function serializeDataField(f)
	if type(f) ~= 'table' then return nil end
	local src = type(f.source) ~= 'function' and type(f.source) ~= 'table' and f.source or nil
	return { key = f.key, label_key = f.label_key, fallback = f.fallback, source = src }
end

local function serializeModel(m)
	if type(m) ~= 'table' then return {} end
	local fields = {}
	if type(m.fields) == 'table' then
		for _, f in ipairs(m.fields) do
			local sf = serializeAkteField(f)
			if sf then fields[#fields + 1] = sf end
		end
	end
	local data_fields = {}
	if type(m.data_fields) == 'table' then
		for _, f in ipairs(m.data_fields) do
			local sf = serializeDataField(f)
			if sf then data_fields[#data_fields + 1] = sf end
		end
	end
	return { fields = fields, data_fields = data_fields }
end

--- Build and push the full meta + player payload to the NUI.
--- Called on nuiReady AND every time the tablet is opened.
function TG_MDT_sendInitialState()
	local modules_flat = {}
	if type(Config.Modules) == 'table' then
		for modName, modCfg in pairs(Config.Modules) do
			if type(modCfg) == 'table' then
				modules_flat[modName] = modCfg.enabled ~= false
			end
		end
	end

	if DispatchClient and type(DispatchClient.getModuleState) == 'function' then
		local agencyModules = DispatchClient.getModuleState() or {}
		if type(agencyModules.dispatch) == 'boolean' then
			modules_flat.dispatch = agencyModules.dispatch
		end
		if type(agencyModules.livemap) == 'boolean' then
			modules_flat.livemap = agencyModules.livemap
		end
	else
		local okModules, agencyModules = pcall(function()
			return lib.callback.await(CALLBACK_GET_DISPATCH_MODULE_STATE, false)
		end)
		if okModules and type(agencyModules) == 'table' then
			if type(agencyModules.dispatch) == 'boolean' then
				modules_flat.dispatch = agencyModules.dispatch
			end
			if type(agencyModules.livemap) == 'boolean' then
				modules_flat.livemap = agencyModules.livemap
			end
		end
	end

	local akteModels = nil
	if type(Config.AkteModels) == 'table' then
		akteModels = {
			person  = serializeModel(Config.AkteModels.person),
			vehicle = serializeModel(Config.AkteModels.vehicle),
		}
		if type(Config.AkteModels.job_models) == 'table' then
			local jm = {}
			for jobKey, jobModel in pairs(Config.AkteModels.job_models) do
				if type(jobModel) == 'table' then
					jm[jobKey] = {
						compartment = jobModel.compartment,
						jobs        = jobModel.jobs,
						shared_with = jobModel.shared_with,
						person      = serializeModel(jobModel.person),
						vehicle     = serializeModel(jobModel.vehicle),
					}
				end
			end
			akteModels.job_models = jm
		end
	end

	local mdtCfg     = Config.MDT or {}
	local brandingCfg = type(mdtCfg.branding) == 'table' and mdtCfg.branding or {}

	local activeSystem = getActiveVoiceSystem()
	local activeFreq = getActiveRadioFrequency()
	if activeSystem ~= 'disabled' and activeFreq ~= '' and activeFreq ~= 'none' and activeFreq ~= '0' then
		TriggerServerEvent(EVENT_SERVER_JOIN_RADIO, activeFreq)
	end

	local leadershipCanAccess = false
	do
		local okBoss, bossState = pcall(function()
			return lib.callback.await(CALLBACK_IS_BOSS, false)
		end)
		if okBoss and type(bossState) == 'table' and bossState.isBoss == true then
			leadershipCanAccess = true
		end
		Debug.debug(('leadership canOpen=%s | callbackOk=%s | agency=%s | job=%s'):format(
			tostring(leadershipCanAccess),
			tostring(okBoss),
			type(bossState) == 'table' and tostring(bossState.agency) or 'nil',
			type(bossState) == 'table' and tostring(bossState.job) or 'nil'
		))
	end

	NUI.send('setData', {
		key = 'meta',
		value = {
			locale               = Config.Locale,
			framework            = Framework and Framework.name or 'standalone',
			modules              = modules_flat,
			translations         = locale_dictionary,
			translationsByLocale = translations_by_locale,
			akteModels           = akteModels,
			radio = {
				enabled = activeSystem ~= 'disabled',
				allowStandalone = isStandaloneRadioAllowed(),
				activeSystem = activeSystem,
				activeFrequency = activeFreq,
			},
			mdt = {
				allowed_jobs           = mdtCfg.allowed_jobs,
				departments            = mdtCfg.departments,
				player_name_mode       = mdtCfg.player_name_mode,
				allow_map_style_change = mdtCfg.allow_map_style_change,
				default_map_style      = mdtCfg.default_map_style,
				chat = {
					auto_delete_after_minutes = type(mdtCfg.chat) == 'table'
						and mdtCfg.chat.auto_delete_after_minutes or 0,
				},
				branding = {
					title_template = brandingCfg.title_template,
					logo_url       = brandingCfg.logo_url,
					job_overrides  = brandingCfg.job_overrides,
				},
				dispatch = {
					share_between_jobs = type(mdtCfg.dispatch) == 'table' and mdtCfg.dispatch.share_between_jobs or nil,
					default_status = type(mdtCfg.dispatch) == 'table' and mdtCfg.dispatch.default_status or nil,
					off_duty_status = type(mdtCfg.dispatch) == 'table' and mdtCfg.dispatch.off_duty_status or nil,
					status_codes = type(mdtCfg.dispatch) == 'table' and mdtCfg.dispatch.status_codes or nil,
					history_limit = type(mdtCfg.dispatch) == 'table' and mdtCfg.dispatch.history_limit or nil,
				},
				leadership = {
					can_access = leadershipCanAccess,
				},
			},
		},
	})

	NUI.send('setData', {
		key = 'player',
		value = buildPlayerUiData(),
	})

	local okDispatch, dispatchState = pcall(function()
		return lib.callback.await(CALLBACK_GET_DISPATCH_STATE, false)
	end)
	if okDispatch then
		NUI.send('setData', {
			key = 'dispatchState',
			value = dispatchState or {},
		})
	end

	local okDispatchHistory, dispatchHistory = pcall(function()
		return lib.callback.await(CALLBACK_GET_DISPATCH_HISTORY, false)
	end)
	if okDispatchHistory then
		NUI.send('setData', {
			key = 'dispatchHistory',
			value = dispatchHistory or {},
		})
	end

	Debug.debug('TG_MDT_sendInitialState: done')
end

-- ── NUI ready handshake ────────────────────────────────────
-- Called once by the UI after it has mounted. Sends all initial state.

NUI.onReady(function()
	Debug.debug('NUI ready signal — sending initial state')
	TG_MDT_sendInitialState()
end)

-- Mark client as initialized so the tablet can be opened.
-- This runs at script load time — all callbacks are registered by now.
TG_MDT_CLIENT_INITIALIZED = true
Debug.debug('Client initialized')
