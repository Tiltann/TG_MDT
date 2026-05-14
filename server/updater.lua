-- ============================================================
--  TG_MDT | server/updater.lua
--  Version check system with GitHub release comparison.
--  Checks for updates on server start and prints status.
-- ============================================================

local RESOURCE_NAME = GetCurrentResourceName()
local CURRENT_VERSION = GetResourceMetadata(RESOURCE_NAME, 'version', 0) or '1.0.0'
local GITHUB_REPO = 'Tiltann/TG_MDT'
local GITHUB_API_URL = ('https://api.github.com/repos/%s/releases/latest'):format(GITHUB_REPO)
local GITHUB_DOWNLOAD_URL = ('https://github.com/%s/releases/latest'):format(GITHUB_REPO)

-- ── Helper Functions ──────────────────────────────────────

--- Parse semantic version string into comparable table.
---@param version string Version string (e.g., '1.2.3')
---@return table|nil parsed {major, minor, patch}
local function parseVersion(version)
    if type(version) ~= 'string' then return nil end
    
    local major, minor, patch = version:match('^v?(%d+)%.(%d+)%.(%d+)')
    if not major then return nil end
    
    return {
        major = tonumber(major) or 0,
        minor = tonumber(minor) or 0,
        patch = tonumber(patch) or 0,
    }
end

--- Compare two version tables.
---@param current table Current version
---@param latest table Latest version
---@return boolean is_outdated True if current < latest
local function isOutdated(current, latest)
    if not current or not latest then return false end
    
    if current.major < latest.major then return true end
    if current.major > latest.major then return false end
    
    if current.minor < latest.minor then return true end
    if current.minor > latest.minor then return false end
    
    if current.patch < latest.patch then return true end
    
    return false
end

--- Print colored startup message.
---@param version string Current version
local function printStartupMessage(version)
    print(('^2[TG][%s]^7 Script started ^2✓^7'):format(RESOURCE_NAME))
    print(('^2[TG][%s]^7 Version: ^2%s^7'):format(RESOURCE_NAME, version))
end

--- Print update available message.
---@param current string Current version
---@param latest string Latest version
local function printUpdateMessage(current, latest)
    print(('^3[TG][%s]^7 ========================================'):format(RESOURCE_NAME))
    print(('^3[TG][%s]^7 ⚠️  UPDATE AVAILABLE'):format(RESOURCE_NAME))
    print(('^3[TG][%s]^7 Current: ^1%s^7 → Latest: ^2%s^7'):format(RESOURCE_NAME, current, latest))
    print(('^3[TG][%s]^7 Download: ^5%s^7'):format(RESOURCE_NAME, GITHUB_DOWNLOAD_URL))
    print(('^3[TG][%s]^7 ========================================'):format(RESOURCE_NAME))
end

--- Print up-to-date message.
local function printUpToDateMessage()
    print(('^2[TG][%s]^7 Version check: ^2Up to date ✓^7'):format(RESOURCE_NAME))
end

--- Print error message when version check fails.
---@param reason string Error reason
local function printCheckError(reason)
    Debug.warn(('Version check failed: %s'):format(reason))
end

-- ── GitHub API Integration ────────────────────────────────

--- Fetch latest release from GitHub API.
---@param callback fun(success: boolean, version: string|nil)
local function fetchLatestVersion(callback)
    PerformHttpRequest(GITHUB_API_URL, function(status_code, response_body, headers)
        if status_code ~= 200 then
            printCheckError(('HTTP %d'):format(status_code))
            callback(false, nil)
            return
        end

        local success, data = pcall(json.decode, response_body)
        if not success or not data then
            printCheckError('Invalid JSON response')
            callback(false, nil)
            return
        end

        local tag_name = data.tag_name
        if not tag_name or type(tag_name) ~= 'string' then
            printCheckError('No tag_name in response')
            callback(false, nil)
            return
        end

        callback(true, tag_name)
    end, 'GET', '', { ['User-Agent'] = 'TG_MDT-VersionCheck' })
end

--- Perform version check and print appropriate message.
local function checkVersion()
    fetchLatestVersion(function(success, latest_version)
        if not success or not latest_version then
            return
        end

        local current = parseVersion(CURRENT_VERSION)
        local latest = parseVersion(latest_version)

        if not current or not latest then
            printCheckError('Failed to parse version strings')
            return
        end

        if isOutdated(current, latest) then
            printUpdateMessage(CURRENT_VERSION, latest_version)
        else
            printUpToDateMessage()
        end
    end)
end

-- ── Startup ───────────────────────────────────────────────

printStartupMessage(CURRENT_VERSION)

CreateThread(function()
    Wait(5000)
    checkVersion()
end)
