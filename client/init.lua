-- ============================================================
--  TG_MDT | client/init.lua
--  Client-side startup and initialization.
-- ============================================================
print("hey")

-- ── Startup ────────────────────────────────────────────
Debug.debug('Client started')
Debug.debug(('Locale set to: %s'):format(Config.Locale))
Debug.debug(('Framework: %s'):format(Framework.name))

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
		},
	})
	Debug.debug('Client init: sent meta payload')

	NUI.send('setData', {
		key = 'allowedJobs',
		value = (Config.MDT and Config.MDT.allowed_jobs) or {},
	})
	Debug.debug('Client init: sent allowedJobs payload')
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
