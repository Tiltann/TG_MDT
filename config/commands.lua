-- ============================================================
--  TG_MDT | config/commands.lua
--  Command names and keybinds.
--  All command strings are defined here as constants so they
--  never get duplicated across feature files.
-- ============================================================

Config = Config or {}

Config.Commands = {
	-- Chat command to open/toggle the MDT
	open_mdt = 'mdt',
}

Config.Keys = {
	-- Default keybind to toggle the MDT (FiveM key name)
	-- See: https://docs.fivem.net/docs/game-references/controls/
	toggle_mdt = 'F6',
}
