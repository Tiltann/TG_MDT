-- ============================================================
--  TG_MDT | client/nui.lua
--  NUI bridge — all NUI interaction goes through this file.
--
--  NUI.show()                      open the tablet + focus
--  NUI.hide()                      close the tablet + unfocus
--  NUI.toggle()                    flip visibility
--  NUI.isVisible()                 returns current state
--  NUI.send(type, data)            push data to the web UI
--  NUI.onCallback(name, handler)   handle fetchNui() calls from the UI
--  NUI.onReady(handler)            fires once the UI signals it has loaded
-- ============================================================

NUI = {}

local _visible = false
local _active_screen = nil

-- Add allowed screens here.
-- For now only tablet exists.
local SCREENS = {
    tablet = true,
}

local DEFAULT_SCREEN = 'tablet'

--- Validate a screen id and fallback to default.
---@param screen string|nil
---@return string
local function resolveScreen(screen)
    if type(screen) ~= 'string' then return DEFAULT_SCREEN end
    if SCREENS[screen] then return screen end
    Debug.warn(('Unknown NUI screen "%s", fallback to "%s"'):format(screen, DEFAULT_SCREEN))
    return DEFAULT_SCREEN
end

-- ── internal ──────────────────────────────────────────────

--- Set NUI visibility and focus state.
---@param state boolean
---@param screen string|nil
local function setState(state, screen)
    if state then
        _active_screen = resolveScreen(screen)
    else
        _active_screen = nil
    end

    _visible = state
    SetNuiFocus(state, state)
    NUI.send('setVisible', {
        visible = state,
        screen = _active_screen,
    })

    if state then
        NUI.send('setScreen', { screen = _active_screen })
    end

    Debug.debug(('NUI visibility -> %s | screen -> %s'):format(tostring(state), tostring(_active_screen)))
end

-- ── visibility ────────────────────────────────────────────

--- Open the tablet and give focus to the NUI.
---@param screen string|nil
function NUI.show(screen)
    if _visible then return end
    setState(true, screen)
end

--- Close the tablet and return focus to the game.
function NUI.hide()
    if not _visible then return end
    setState(false)
end

--- Toggle the tablet open/closed.
---@param screen string|nil
function NUI.toggle(screen)
    if _visible then NUI.hide() else NUI.show(screen) end
end

--- Returns whether the NUI is currently visible.
---@return boolean
function NUI.isVisible()
    return _visible
end

--- Returns the currently active screen, or nil when hidden.
---@return string|nil
function NUI.getActiveScreen()
    return _active_screen
end

--- Returns a list of allowed screen names.
---@return table
function NUI.getScreens()
    local list = {}
    for name, _ in pairs(SCREENS) do
        list[#list + 1] = name
    end
    table.sort(list)
    return list
end

-- ── data ──────────────────────────────────────────────────

--- Send any data to the web UI via SendNUIMessage.
--- The UI receives this as: window.addEventListener('message', e => e.data)
--- with shape: { type = type, data = data }
---@param type string Message type the UI listens for.
---@param data table|nil Payload (optional).
function NUI.send(type, data)
    SendNUIMessage({
        type = type,
        data = data or {},
    })
    Debug.debug(('NUI.send -> %s'):format(type), data)
end

--- Register a callback handler for fetchNui() calls from the UI.
--- The UI calls: await fetchNui('name', payload)
--- The handler receives the payload and must call cb() to resolve the promise.
---@param name string Callback name matching fetchNui('name', ...).
---@param handler fun(body: table, cb: fun(response: any))
function NUI.onCallback(name, handler)
    RegisterNUICallback(name, function(body, cb)
        Debug.debug(('NUI.onCallback <- %s'):format(name), body)
        handler(body, cb)
    end)
end

--- Register a one-time handler for when the UI signals it is ready.
--- The UI should call: await fetchNui('nuiReady', {})
--- Useful for sending initial state (player data, config, etc.)
---@param handler fun()
function NUI.onReady(handler)
    NUI.onCallback('nuiReady', function(_, cb)
        Debug.info('NUI ready signal received')
        handler()
        cb('ok')
    end)
end

-- ── built-in callbacks ────────────────────────────────────

-- UI calls fetchNui('hideUI') to close itself (e.g. pressing Escape inside React)
NUI.onCallback('hideUI', function(_, cb)
    NUI.hide()
    cb('ok')
end)

-- ── escape key passthrough ────────────────────────────────
-- Close the tablet when the player presses Escape while the NUI is focused.

CreateThread(function()
    while true do
        Wait(0)
        if _visible and IsControlJustPressed(0, 200) then -- 200 = INPUT_FRONTEND_CANCEL (Escape)
            NUI.hide()
        end
    end
end)
