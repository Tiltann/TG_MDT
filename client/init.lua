-- ============================================================
--  TG_MDT | client/init.lua
--  Client-side startup and initialization.
-- ============================================================


-- ── Startup ────────────────────────────────────────────
Debug.info('Client started')
Debug.info(('Locale set to: %s'):format(Config.Locale))
Debug.debug(('Framework: %s'):format(Framework.name))

NUI.onReady(function()
	NUI.send('setScreen', { screen = (Config.MDT and Config.MDT.default_screen) or 'tablet' })
	NUI.send('setData', {
		key = 'meta',
		value = {
			resource = GetCurrentResourceName(),
			framework = Framework.name,
			modules = Config.Modules or {},
		},
	})

	NUI.send('setData', {
		key = 'allowedJobs',
		value = (Config.MDT and Config.MDT.allowed_jobs) or {},
	})
end)
