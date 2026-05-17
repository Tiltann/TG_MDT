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

--- Build a display name from row values.
---@param firstname string|nil
---@param lastname string|nil
---@param fallback string|nil
---@return string
local function buildDisplayName(firstname, lastname, fallback)
    local first = type(firstname) == 'string' and firstname or ''
    local last = type(lastname) == 'string' and lastname or ''
    local full = (first .. ' ' .. last):gsub('^%s+', ''):gsub('%s+$', '')
    if full ~= '' then return full end
    if type(fallback) == 'string' and fallback ~= '' then return fallback end
    return 'Unknown Person'
end

--- Decode json string/table safely.
---@param value any
---@return table|nil
local function decodeObject(value)
    if type(value) == 'table' then return value end
    if type(value) ~= 'string' or value == '' then return nil end
    local ok, decoded = pcall(json.decode, value)
    if ok and type(decoded) == 'table' then
        return decoded
    end
    return nil
end

--- Fetch persons from active framework data source.
---@return table
local function getPersonsFromFramework()
    if Framework.name == 'esx' then
        local rows = SQL.query([[ 
            SELECT identifier, firstname, lastname, dateofbirth, sex
            FROM users
            ORDER BY lastname ASC, firstname ASC
        ]], {})

        local persons = {}
        for i = 1, #rows do
            local row = rows[i]
            local identifier = row.identifier or ('esx_%s'):format(i)
            local firstname = row.firstname or ''
            local lastname = row.lastname or ''
            persons[#persons + 1] = {
                identifier = identifier,
                firstname = firstname,
                lastname = lastname,
                name = buildDisplayName(firstname, lastname, identifier),
                dob = row.dateofbirth,
                gender = row.sex,
                job = nil,
            }
        end
        return persons
    end

    if Framework.name == 'qbcore' or Framework.name == 'qbox' then
        local rows = SQL.query([[ 
            SELECT citizenid, charinfo, job
            FROM players
            ORDER BY citizenid ASC
        ]], {})

        local persons = {}
        for i = 1, #rows do
            local row = rows[i]
            local charinfo = decodeObject(row.charinfo)

            local firstname = charinfo and charinfo.firstname or ''
            local lastname = charinfo and charinfo.lastname or ''
            local identifier = row.citizenid or ('qb_%s'):format(i)
            local jobName = row.job
            if type(row.job) == 'string' and row.job:sub(1, 1) == '{' then
                local ok, decodedJob = pcall(json.decode, row.job)
                if ok and type(decodedJob) == 'table' and decodedJob.name then
                    jobName = decodedJob.name
                end
            end

            persons[#persons + 1] = {
                identifier = identifier,
                firstname = firstname,
                lastname = lastname,
                name = buildDisplayName(firstname, lastname, identifier),
                dob = charinfo and (charinfo.birthdate or charinfo.dob) or nil,
                gender = charinfo and charinfo.gender or nil,
                job = jobName,
            }
        end
        return persons
    end

    -- Standalone fallback: currently online players only.
    local persons = {}
    local online = GetPlayers()
    for i = 1, #online do
        local src = tonumber(online[i])
        if src then
            persons[#persons + 1] = {
                identifier = Framework.Server.getIdentifier(src) or ('src_%s'):format(src),
                firstname = nil,
                lastname = nil,
                name = GetPlayerName(src) or ('Player %s'):format(src),
                dob = nil,
                gender = nil,
                job = Framework.Server.getJob(src),
            }
        end
    end
    return persons
end

--- Fetch vehicles from active framework data source.
---@return table
local function getVehiclesFromFramework()
    if Framework.name == 'esx' then
        local rows = SQL.query([[
            SELECT ov.plate, ov.owner, ov.vehicle, u.firstname, u.lastname
            FROM owned_vehicles ov
            LEFT JOIN users u ON u.identifier = ov.owner
            ORDER BY ov.plate ASC
        ]], {})

        local vehicles = {}
        for i = 1, #rows do
            local row = rows[i]
            local vehicleData = decodeObject(row.vehicle)
            vehicles[#vehicles + 1] = {
                plate = row.plate or ('NO-PLATE-%s'):format(i),
                ownerIdentifier = row.owner,
                ownerName = buildDisplayName(row.firstname, row.lastname, row.owner),
                model = vehicleData and (vehicleData.modelName or vehicleData.model) or nil,
                state = nil,
            }
        end
        return vehicles
    end

    if Framework.name == 'qbcore' or Framework.name == 'qbox' then
        local rows = SQL.query([[
            SELECT pv.plate, pv.citizenid, pv.vehicle, pv.state, p.charinfo
            FROM player_vehicles pv
            LEFT JOIN players p ON p.citizenid = pv.citizenid
            ORDER BY pv.plate ASC
        ]], {})

        local vehicles = {}
        for i = 1, #rows do
            local row = rows[i]
            local vehicleData = decodeObject(row.vehicle)
            local charinfo = decodeObject(row.charinfo)
            local ownerName = buildDisplayName(
                charinfo and charinfo.firstname or nil,
                charinfo and charinfo.lastname or nil,
                row.citizenid
            )

            vehicles[#vehicles + 1] = {
                plate = row.plate or ('NO-PLATE-%s'):format(i),
                ownerIdentifier = row.citizenid,
                ownerName = ownerName,
                model = vehicleData and (vehicleData.modelName or vehicleData.model) or nil,
                state = row.state,
            }
        end
        return vehicles
    end

    return {}
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

-- ── Persons callback (framework-backed) ────────────────────
lib.callback.register('TG_MDT:getPersons', function(_src)
    local persons = getPersonsFromFramework()
    Debug.debug(('Persons callback: returned %s records'):format(#persons))
    return persons
end)

-- ── Vehicles callback (framework-backed) ───────────────────
lib.callback.register('TG_MDT:getVehicles', function(_src)
    local vehicles = getVehiclesFromFramework()
    Debug.debug(('Vehicles callback: returned %s records'):format(#vehicles))
    return vehicles
end)
