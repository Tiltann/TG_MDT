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
-- table        = granular control (see sh-debug.lua)

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
            subtitle = 'Law Enforcement Operations Desk',
            jobs = { 'police', 'sheriff' },
            boss = {
                -- Per-job leadership access rules.
                -- IMPORTANT: Use exactly ONE rule per job (rank_name OR min_grade OR last), not multiple.
                -- rank_name = exact grade name match (string or array)
                -- min_grade = grade level must be >= this number
                -- last = allow top N grades (example: 2 means highest two grades)
                jobs = {
                    police = {
                        min_grade = 2,
                    },
                    sheriff = {
                         rank_name = { 'chief', 'captain' },
                    },
                },
            },
            logo_url = 'lspd.png',
            dispatch_notify_on_accept = true,
            modules = {
                dispatch = true,
                livemap = true,
            },
        },
        mdt = {
            label = 'DoJ',
            subtitle = 'Judicial Records & Processing Desk',
            jobs = { 'mdt' },
            boss = {
                jobs = {
                    mdt = {
                        last = 2,
                    },
                },
            },
            logo_url = 'doj.png',
            shared_with = { 'police', 'sheriff' },
            dispatch_notify_on_accept = false,
            modules = {
                dispatch = true,
                livemap = true,
            },
        },
        mechanic = {
            label = 'Mechanics',
            subtitle = 'Vehicle Service Coordination Desk',
            jobs = { 'mechanic' },
            boss = {
                jobs = {
                    mechanic = {
                        rank_name = { 'boss', 'owner' },
                    },
                },
            },
            logo_url = 'mechanic.png',
            dispatch_notify_on_accept = false,
            modules = {
                dispatch = true,
                livemap = true,
            },
        },
        ems = {
            label = 'EMS',
            subtitle = 'Medical Response Coordination Desk',
            jobs = { 'ambulance' },
            boss = {
                jobs = {
                    ambulance = {
                        min_grade = 3,
                    },
                },
            },
            logo_url = 'ems.png',
            dispatch_notify_on_accept = true,
            modules = {
                dispatch = true,
                livemap = true,
            },
        },
    },

    -- If true, players without allowed jobs will get a notify if they want to open the MDT.
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

    -- Radio integration behavior for the MDT radio/chat tab.
    radio = {
        -- Master switch for MDT radio features.
        -- false = fully disabled in UI and callbacks.
        enabled = true,

        -- If no supported voice script is running:
        -- true  = allow MDT standalone radio state sync only.
        -- false = radio is disabled entirely.
        allow_standalone = false,
    },

    -- Which part of the RP name is used in dashboard greetings.
    -- Supported: fullname | firstname | lastname
    player_name_mode = 'fullname',

    -- Sidebar branding options.
    branding = {
        -- Available placeholder: {job}
        -- Example output for police job: "POLICE MDT"
        title_template = '{job} MDT',

        -- Default subtitle shown if no agency/job-specific subtitle is defined.
        subtitle = 'Agency Operations Terminal',

        -- Optional logo image for the top-left sidebar block.
        -- Use a data URL or https URL. Empty = initials fallback.
        logo_url = '',

        -- Optional job-specific overrides.
        -- job_overrides = {
        --     police = { title = 'LSPD MDT', subtitle = 'Law Enforcement Desk', logo_url = 'https://example.com/lspd.png' },
        --     sheriff = { title = 'BCSO MDT', subtitle = 'County Operations Desk', logo_url = 'https://example.com/bcso.png' },
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

    -- Dispatch status codes shown in tablet (dispatch + topbar when on-duty).
    dispatch = {
        -- Share dispatch calls between different MDT jobs.
        -- Supported values:
        --   'all'  = everyone with MDT access sees all dispatch calls.
        --   true   = same as 'all' (backward compatible).
        --   false  = users only see calls created by their own job.
        --   table  = sharing setup using one or more share groups:
        --            Single group (everyone in this group shares together):
        --              { 'police', 'sheriff', 'ems' }
        --            Multiple groups (independent share clusters):
        --              {
        --                  { 'pd' },                  -- entire PD agency (department key)
        --                  { 'ems', 'mechanic' },     -- mixed agency/job group
        --              }
        --            You can use job names OR department keys from MDT.departments.
        share_between_jobs = 'all',

        -- Default status when none is set.
        default_status = '10-8',

        -- Optional status used when a user is off duty.
        off_duty_status = '10-7',

        -- Configurable status catalog (numeric/radio-style codes).
        -- IMPORTANT: Use label_key for localization and add the key to locales/*.json.
        -- Optional `label` acts as fallback if the localization key is missing.
        -- Optional scope fields per status entry:
        --   jobs     = { 'police', 'sheriff' }   -- only these jobs can use/see this status
        --   agencies = { 'pd', 'ems' }           -- only these department keys can use/see this status
        -- If both are set, both conditions must match.
        -- color supports: green, blue, yellow, purple, gray, red, or hex like '#ff6b00'
        status_codes = {
            { code = '10-8', label_key = 'tablet.dispatch.status.10-8', label = 'Available', color = 'green' },
            { code = '10-6', label_key = 'tablet.dispatch.status.10-6', label = 'Busy', color = 'yellow' },
            { code = '10-97', label_key = 'tablet.dispatch.status.10-97', label = 'On Scene', color = 'blue', agencies = { 'pd' } },
            { code = '10-23', label_key = 'tablet.dispatch.status.10-23', label = 'En Route', color = 'blue' },
            { code = '10-7', label_key = 'tablet.dispatch.status.10-7', label = 'Out of Service', color = 'gray', jobs = { 'ambulance' } },
        },

        -- Number of closed dispatch records kept for history panels/log views.
        history_limit = 500,
    },
}
