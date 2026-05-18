-- ============================================================
--  TG_MDT | client/init.lua
--  Client-side startup and initialization.
-- ============================================================


-- ── Startup ────────────────────────────────────────────
Debug.debug('Client started')
Debug.debug(('Locale set to: %s'):format(Config.Locale))
Debug.debug(('Framework: %s'):format(Framework.name))

TG_MDT_CLIENT_INITIALIZED = false

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
		gradeLevel = gradeLevel,
		gradeCount = gradeCount,
	}
end

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

NUI.onCallback('getTabletBootstrap', function(_, cb)
	local ok, result = pcall(function()
		return {
			persons = lib.callback.await('TG_MDT:getPersons', false),
			vehicles = lib.callback.await('TG_MDT:getVehicles', false),
			akteBootstrap = lib.callback.await('TG_MDT:getAkteBootstrap', false),
		}
	end)

	if not ok then
		Debug.warn(('getTabletBootstrap failed: %s'):format(tostring(result)))
		cb({ persons = {}, vehicles = {}, akteBootstrap = { personAkten = {}, vehicleAkten = {} } })
		return
	end

	cb(result or { persons = {}, vehicles = {}, akteBootstrap = { personAkten = {}, vehicleAkten = {} } })
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

-- ── Meta / initial-state helpers ──────────────────────────
-- These are module-level so tablet.lua can also call TG_MDT_sendInitialState().

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
						person      = serializeModel(jobModel.person),
						vehicle     = serializeModel(jobModel.vehicle),
						shared_with = jobModel.shared_with,
					}
				end
			end
			akteModels.job_models = jm
		end
	end

	local mdtCfg     = Config.MDT or {}
	local brandingCfg = type(mdtCfg.branding) == 'table' and mdtCfg.branding or {}

	NUI.send('setData', {
		key = 'meta',
		value = {
			locale               = Config.Locale,
			framework            = Framework and Framework.name or 'standalone',
			modules              = modules_flat,
			translations         = locale_dictionary,
			translationsByLocale = translations_by_locale,
			akteModels           = akteModels,
			mdt = {
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
			},
		},
	})

	NUI.send('setData', {
		key = 'player',
		value = buildPlayerUiData(),
	})

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
