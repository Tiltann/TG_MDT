-- ============================================================
--  TG_MDT | client/init.lua
--  Client-side startup and initialization.
-- ============================================================


-- ── Startup ────────────────────────────────────────────
Debug.info('Client started')
Debug.info(('Locale set to: %s'):format(Config.Locale))
Debug.debug(('Framework: %s'):format(Framework.name))

local function loadLocaleDictionary(locale)
	local resource = GetCurrentResourceName()
	local path = ('locales/%s.json'):format(locale or 'en')
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

	return decoded
end

local locale_dictionary = loadLocaleDictionary(Config.Locale)
local translations_by_locale = {
	en = loadLocaleDictionary('en'),
	de = loadLocaleDictionary('de'),
}

NUI.onReady(function()
	NUI.send('setScreen', { screen = (Config.MDT and Config.MDT.default_screen) or 'tablet' })
	NUI.send('setData', {
		key = 'meta',
		value = {
			resource = GetCurrentResourceName(),
			framework = Framework.name,
			locale = Config.Locale,
			translations = locale_dictionary,
			translationsByLocale = translations_by_locale,
			modules = Config.Modules or {},
		},
	})

	NUI.send('setData', {
		key = 'allowedJobs',
		value = (Config.MDT and Config.MDT.allowed_jobs) or {},
	})
end)
