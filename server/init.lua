-- ============================================================
--  TG_MDT | server/init.lua
--  Server-side startup and initialization.
-- ============================================================

--- Check if database connection is available.
---@return boolean
local function checkDatabase()
    local result = MySQL.query.await('SELECT 1')
    return result ~= nil
end

-- ── Map tile check ─────────────────────────────────────────

local MAP_TILE_WARNING = [[

╔══════════════════════════════════════════════════════════════╗
║               TG_MDT ── MAP TILES MISSING                    ║
╠══════════════════════════════════════════════════════════════╣
║  The map tile files are not installed.                       ║
║  The live map view will show a blank/broken map.             ║
║                                                              ║
║  HOW TO FIX:                                                 ║
║  1. Download the map tiles from:                             ║
║     https://drive.proton.me/urls/YZE057HH5G#KN3aoWGvPXb8    ║
║                                                              ║
║  2. Extract and place the folders so the structure looks     ║
║     like this inside your resource:                          ║
║       web/public/map/styleAtlas/{z}/{x}/{y}.jpg              ║
║       web/public/map/styleGrid/{z}/{x}/{y}.png               ║
║       web/public/map/styleSatelite/{z}/{x}/{y}.jpg           ║
║                                                              ║
║  3. Rebuild the web UI:                                      ║
║       cd web && npm run build                                ║
║     The build copies public/ into dist/ automatically.       ║
║     After building, restart the resource.                    ║
║                                                              ║
║  Map tiles originally from:                                  ║
║     https://github.com/RiceaRaul/gta-v-map-leaflet           ║
║     All credit goes to RiceaRaul and contributors.           ║
╚══════════════════════════════════════════════════════════════╝
]]

--- Check whether map tile assets are installed.
---@return boolean
local function checkMapTiles()
    local resource = GetCurrentResourceName()
    -- Check for a small marker file that only exists when tiles are installed.
    local marker = LoadResourceFile(resource, 'web/public/map/styleAtlas/empty.jpg')
    return marker ~= nil
end

-- ── Startup ────────────────────────────────────────────
Debug.debug(('Framework: %s'):format(Framework.name))

-- Check database availability
if checkDatabase() then
    Debug.info('Database connection OK')
else
    Debug.warn('Database connection failed — some features may not work')
end

-- Check map tiles on startup
if not checkMapTiles() then
    print(MAP_TILE_WARNING)
end

-- ── Map tile missing event (reported by NUI via client) ────
RegisterNetEvent('TG_MDT:mapTilesMissing', function()
    local src = source
    Debug.warn(('Map tiles missing — reported by client %s'):format(tostring(src)))
    print(MAP_TILE_WARNING)
end)
