-- ============================================================
--  TG_MDT | config/config.lua
--  Main resource configuration.
--  Edit values here — do not touch feature code for tuning.
-- ============================================================

Config = Config or {}

-- ── General ───────────────────────────────────────────────

Config.Locale = 'en'                  -- locale file to load from locales/

-- ── Debug ─────────────────────────────────────────────────
-- true         = enable debug output
-- false        = disable (default for prod)
-- table        = granular control (see debug.lua)

Config.Debug = {
    enabled   = true,
    sensitive = false,
}

-- ── MDT ───────────────────────────────────────────────────

Config.MDT = {
    -- Agency Departments Configuration
    -- Group jobs under distinct departments/compartments.
    -- Jobs in the same department share the same database compartment and see/edit
    -- each other's records. It also automatically sets their sidebar branding title.
    departments = {
        pd = {
            label = 'LSPD',
            jobs = { 'police', 'sheriff' },
            logo_url = 'lspd.png',
        },
        mdt = {
            label = 'DoJ',
            jobs = { 'mdt' },
            logo_url = 'doj.png',
            shared_with = { 'police', 'sheriff' },
        },
        mechanic = {
            label = 'Mechanics',
            jobs = { 'mechanic' },
            logo_url = 'mechanic.png',
        },
        ems = {
            label = 'EMS',
            jobs = { 'ambulance' },
            logo_url = 'ems.png',
        },
    },

    -- If true, players without allowed jobs will get a notify.
    notify_on_denied = true,

    -- How long (ms) the MDT open/close animation takes.
    animation_duration = 300,

    -- Record photo capture settings.
    photo = {
        -- JPEG quality used by screenshot-basic (range 0.1 - 1.0).
        -- 1.0 = best quality / biggest payload.
        screenshot_quality = 1,
    },

    -- Chat behavior.
    chat = {
        -- Automatically delete chat messages after this many minutes.
        -- 0 disables auto-delete.
        auto_delete_after_minutes = 0,
    },

    -- Which part of the RP name is used in dashboard greetings.
    -- Supported: fullname | firstname | lastname
    player_name_mode = 'fullname',

    -- Sidebar branding options.
    branding = {
        -- Available placeholder: {job}
        -- Example output for police job: "POLICE MDT"
        title_template = '{job} MDT',

        -- Optional logo image for the top-left sidebar block.
        -- Use a data URL or https URL. Empty = initials fallback.
        logo_url = '',

        -- Optional job-specific overrides.
        -- job_overrides = {
        --     police = { title = 'LSPD MDT', logo_url = 'https://example.com/lspd.png' },
        --     sheriff = { title = 'BCSO MDT', logo_url = 'https://example.com/bcso.png' },
        -- },
        job_overrides = {},
    },

    -- Allow users to switch the live map tile style from the settings page.
    allow_map_style_change = true,

    -- Default live map tile style. Supported values: styleAtlas, styleGrid, styleSatelite.
    default_map_style = 'styleAtlas',

    -- Duty system behavior (used by tablet toggle + exports).
    duty = {
        enabled = true,

        -- Persist key for duty state (ESX xPlayer.set/get, QB/Qbox metadata).
        duty_key = 'tg_mdt_duty',

        -- Stores the original duty job while temporarily switched to off-duty job.
        last_job_key = 'tg_mdt_duty_last_job',

        -- If true, off-duty uses offduty_job_prefix .. dutyJobName.
        -- If false, off-duty stays on the same job and only duty state is toggled.
        switch_job_on_offduty = false,

        -- Used when switch_job_on_offduty=true.
        -- off-duty job becomes: prefix .. dutyJobName (example: offpolice)
        offduty_job_prefix = 'off',

        -- If true, duty state is reset on disconnect.
        -- In job-switch mode this also tries to restore the saved duty job.
        reset_on_disconnect = false,

        notify_on_toggle = true,
    },
}

-- ── BOLO / Warrants ───────────────────────────────────────

-- Config.BOLO = {
--     -- Maximum active BOLOs stored per officer
--     max_per_officer = 5,

--     -- Auto-expire BOLOs after this many hours (0 = never)
--     expire_hours = 72,
-- }
