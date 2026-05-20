-- ============================================================
--  TG_MDT | config/akte_models.lua
--  Modular Record schema definitions for persons and vehicles.
--
--  You can add/edit fields here without touching UI/server logic.
--  Supported field types: text, textarea, select
--  data_fields are shown in the left profile/data panel.
--  fields are the editable Record section on the right.
--
--  default supports:
--    1) static value: default = 'none'
--    2) function: default = function(ctx) return 'value' end
--    3) export descriptor:
--       default = {
--         type = 'export',
--         resource = 'my_resource',
--         export = 'getSomeValue',
--         args = { 'arg1' },
--         await = true,
--         fallback = 'none',
--       }
--
--  ctx for function defaults:
--    ctx.kind  -> 'person' or 'vehicle'
--    ctx.key   -> field key
--    ctx.field -> full field table
--
--  data_fields source supports:
--    1) source = 'recordKey'
--    2) source = function(ctx) return ctx.record.some_value end
--    3) source = {
--         type = 'export',
--         resource = 'my_resource',
--         export = 'resolveValue',
--         args = {},
--         await = true,
--         fallback = '-',
--       }
--  ctx for source function/export:
--    ctx.kind   -> 'person' or 'vehicle'
--    ctx.key    -> field key
--    ctx.field  -> full field table
--    ctx.record -> current framework record
--
--  job_models (optional):
--    Define compartment-based Record schemas.
--    Structure:
--      job_models = {
--        lspd = {
--          compartment = 'lspd',
--          jobs = { 'police', 'sheriff' },
--          person = { data_fields = {...}, fields = {...} },
--          vehicle = { data_fields = {...}, fields = {...} },
--        },
--        mdt = {
--          compartment = 'mdt',
--          jobs = { 'mdt' },
--          person = { ... },
--          vehicle = { ... },
--        }
--      }
--
--    Rules:
--      - Jobs in the same compartment share the same Record data.
--      - shared_with still works as a compatibility alias for membership.
--      - If no compartment is configured, the job name is used as the scope.
--      - Otherwise fallback to the default person/vehicle schemas below.
-- ============================================================

Config = Config or {}

Config.AkteModels = Config.AkteModels or {
    -- Map GTA vehicle model hashes to readable names.
    -- Add more entries as needed.
    vehicle_model_names = {
        ['1663218586'] = 'Sultan RS',
    },

    person = {
        data_fields = {
            { key = 'name', label_key = 'tablet.persons.field.name', source = 'name' },
            { key = 'dob', label_key = 'tablet.persons.field.dob', source = 'dob', fallback = '-' },
            { key = 'gender', label_key = 'tablet.persons.field.gender', source = 'gender', fallback = '-' },
            { key = 'job', label_key = 'tablet.persons.akte.occupation', source = 'job', fallback = '-' },
            { key = 'address', label_key = 'tablet.persons.akte.address', source = 'address', fallback = '-' },
            -- Example export-based data field:
            -- {
            --     key = 'rank',
            --     label_key = 'tablet.persons.field.rank',
            --     source = {
            --         type = 'export',
            --         resource = 'my_resource',
            --         export = 'getPersonRank',
            --         args = {},
            --         pass_context = true,
            --         await = true,
            --         fallback = '-',
            --     },
            -- },
        },

        fields = {
            {
                key = 'personImage',
                label_key = 'tablet.persons.akte.image',
                type = 'text',
                default = '',
                editable = true,
            },
            {
                key = 'phone',
                label_key = 'tablet.persons.akte.phone',
                type = 'text',
                default = '',
                editable = true,
            },
            {
                key = 'warrantStatus',
                label_key = 'tablet.persons.akte.warrant',
                type = 'select',
                default = 'none',
                editable = true,
                options = {
                    { value = 'none', label_key = 'tablet.persons.akte.warrant.none' },
                    { value = 'active', label_key = 'tablet.persons.akte.warrant.active' },
                    { value = 'served', label_key = 'tablet.persons.akte.warrant.served' },
                },
            },
            {
                key = 'dangerLevel',
                label_key = 'tablet.persons.akte.danger',
                type = 'select',
                default = 'low',
                editable = true,
                options = {
                    { value = 'low', label_key = 'tablet.persons.akte.danger.low' },
                    { value = 'medium', label_key = 'tablet.persons.akte.danger.medium' },
                    { value = 'high', label_key = 'tablet.persons.akte.danger.high' },
                },
            },
            -- Example function default:
            -- {
            --     key = 'priorityTag',
            --     label_key = 'tablet.persons.akte.priority_tag',
            --     type = 'text',
            --     default = function(ctx)
            --         if ctx.kind == 'person' then
            --             return 'A'
            --         end
            --         return 'B'
            --     end,
            --     editable = true,
            -- },
            {
                key = 'driverLicense',
                label_key = 'tablet.persons.akte.driver_license',
                type = 'select',
                default = 'valid',
                editable = true,
                options = {
                    { value = 'valid', label_key = 'tablet.persons.akte.license.valid' },
                    { value = 'suspended', label_key = 'tablet.persons.akte.license.suspended' },
                    { value = 'revoked', label_key = 'tablet.persons.akte.license.revoked' },
                },
            },
            {
                key = 'weaponLicense',
                label_key = 'tablet.persons.akte.weapon_license',
                type = 'select',
                default = 'none',
                editable = true,
                options = {
                    { value = 'none', label_key = 'tablet.persons.akte.weapon.none' },
                    { value = 'valid', label_key = 'tablet.persons.akte.weapon.valid' },
                    { value = 'revoked', label_key = 'tablet.persons.akte.weapon.revoked' },
                },
            },
            {
                key = 'notes',
                label_key = 'tablet.persons.akte.notes',
                type = 'textarea',
                default = '',
                editable = true,
            },
        },
    },

    vehicle = {
        data_fields = {
            { key = 'model', label_key = 'tablet.vehicles.field.model', source = 'model', fallback = '-' },
            { key = 'ownerName', label_key = 'tablet.vehicles.field.owner', source = 'ownerName', fallback = '-' },
            { key = 'state', label_key = 'tablet.vehicles.field.state', source = 'state', fallback = '-' },
            -- Example function-based data field:
            -- {
            --     key = 'garage',
            --     label_key = 'tablet.vehicles.field.garage',
            --     source = function(ctx)
            --         return ctx.record.garage or '-'
            --     end,
            -- },
        },

        fields = {
            {
                key = 'vehicleImage',
                label_key = 'tablet.vehicles.akte.image',
                type = 'text',
                default = '',
                editable = true,
            },
            {
                key = 'color',
                label_key = 'tablet.vehicles.akte.color',
                type = 'text',
                default = '',
                editable = true,
            },
            -- Example export default:
            -- {
            --     key = 'impoundReason',
            --     label_key = 'tablet.vehicles.akte.impound_reason',
            --     type = 'text',
            --     default = {
            --         type = 'export',
            --         resource = 'my_resource',
            --         export = 'getDefaultImpoundReason',
            --         args = {},
            --         await = true,
            --         fallback = '',
            --     },
            --     editable = true,
            -- },
            {
                key = 'registrationStatus',
                label_key = 'tablet.vehicles.akte.registration',
                type = 'select',
                default = 'valid',
                editable = true,
                options = {
                    { value = 'valid', label_key = 'tablet.vehicles.akte.registration.valid' },
                    { value = 'expired', label_key = 'tablet.vehicles.akte.registration.expired' },
                    { value = 'revoked', label_key = 'tablet.vehicles.akte.registration.revoked' },
                },
            },
            {
                key = 'insuranceStatus',
                label_key = 'tablet.vehicles.akte.insurance',
                type = 'select',
                default = 'active',
                editable = true,
                options = {
                    { value = 'active', label_key = 'tablet.vehicles.akte.insurance.active' },
                    { value = 'expired', label_key = 'tablet.vehicles.akte.insurance.expired' },
                    { value = 'none', label_key = 'tablet.vehicles.akte.insurance.none' },
                },
            },
            {
                key = 'stolenStatus',
                label_key = 'tablet.vehicles.akte.stolen',
                type = 'select',
                default = 'no',
                editable = true,
                options = {
                    { value = 'no', label_key = 'tablet.vehicles.akte.stolen.no' },
                    { value = 'yes', label_key = 'tablet.vehicles.akte.stolen.yes' },
                    { value = 'investigation', label_key = 'tablet.vehicles.akte.stolen.investigation' },
                },
            },
            {
                key = 'notes',
                label_key = 'tablet.vehicles.akte.notes',
                type = 'textarea',
                default = '',
                editable = true,
            },
        },
    },

    -- Optional per-job schema overrides + share rules.
    -- Keep empty to use default schemas for all jobs.
    job_models = {
        pd = {
            compartment = 'pd',
            jobs = { 'police' },
            person = {
                data_fields = {
                    { key = 'name', label_key = 'tablet.persons.field.name', source = 'name' },
                    { key = 'dob', label_key = 'tablet.persons.field.dob', source = 'dob', fallback = '-' },
                    { key = 'gender', label_key = 'tablet.persons.field.gender', source = 'gender', fallback = '-' },
                    { key = 'job', label_key = 'tablet.persons.akte.occupation', source = 'job', fallback = '-' },
                },
                fields = {
                    { key = 'personImage', label_key = 'tablet.persons.akte.image', type = 'text', default = '', editable = true },
                    { key = 'phone', label_key = 'tablet.persons.akte.phone', type = 'text', default = '', editable = true },
                    {
                        key = 'warrantStatus',
                        label_key = 'tablet.persons.akte.warrant',
                        type = 'select',
                        default = 'none',
                        editable = true,
                        options = {
                            { value = 'none', label_key = 'tablet.persons.akte.warrant.none' },
                            { value = 'active', label_key = 'tablet.persons.akte.warrant.active' },
                            { value = 'served', label_key = 'tablet.persons.akte.warrant.served' },
                        },
                    },
                    {
                        key = 'dangerLevel',
                        label_key = 'tablet.persons.akte.danger',
                        type = 'select',
                        default = 'low',
                        editable = true,
                        options = {
                            { value = 'low', label_key = 'tablet.persons.akte.danger.low' },
                            { value = 'medium', label_key = 'tablet.persons.akte.danger.medium' },
                            { value = 'high', label_key = 'tablet.persons.akte.danger.high' },
                        },
                    },
                    { key = 'notes', label_key = 'tablet.persons.akte.notes', type = 'textarea', default = '', editable = true },
                },
            },
            vehicle = {
                data_fields = {
                    { key = 'plate', label_key = 'tablet.vehicles.field.plate', source = 'plate' },
                    { key = 'model', label_key = 'tablet.vehicles.field.model', source = 'model', fallback = '-' },
                    { key = 'owner', label_key = 'tablet.vehicles.field.owner', source = 'owner', fallback = '-' },
                },
                fields = {
                    { key = 'vehicleImage', label_key = 'tablet.vehicles.akte.image', type = 'text', default = '', editable = true },
                    {
                        key = 'searchStatus',
                        label_key = 'tablet.vehicles.akte.search_status',
                        type = 'select',
                        default = 'none',
                        editable = true,
                        options = {
                            { value = 'none', label_key = 'tablet.vehicles.akte.search_status.none' },
                            { value = 'wanted', label_key = 'tablet.vehicles.akte.search_status.wanted' },
                            { value = 'stolen', label_key = 'tablet.vehicles.akte.search_status.stolen' },
                        },
                    },
                    { key = 'notes', label_key = 'tablet.vehicles.akte.notes', type = 'textarea', default = '', editable = true },
                },
            },
        },

        mdt = {
            compartment = 'mdt',
            jobs = { 'mdt' },
            person = {
                data_fields = {
                    { key = 'name', label_key = 'tablet.persons.field.name', source = 'name' },
                    { key = 'dob', label_key = 'tablet.persons.field.dob', source = 'dob', fallback = '-' },
                    { key = 'job', label_key = 'tablet.persons.akte.occupation', source = 'job', fallback = '-' },
                },
                fields = {
                    { key = 'personImage', label_key = 'tablet.persons.akte.image', type = 'text', default = '', editable = true },
                    { key = 'phone', label_key = 'tablet.persons.akte.phone', type = 'text', default = '', editable = true },
                    {
                        key = 'dojStatus',
                        label = 'Legal / DoJ Status',
                        type = 'select',
                        default = 'none',
                        editable = true,
                        options = {
                            { value = 'none', label = 'No Active Cases' },
                            { value = 'trial', label = 'Awaiting Trial' },
                            { value = 'convicted', label = 'Convicted' },
                            { value = 'acquitted', label = 'Acquitted' },
                        },
                    },
                    { key = 'legalNotes', label = 'Legal Case Notes', type = 'textarea', default = '', editable = true },
                },
            },
            vehicle = {
                data_fields = {
                    { key = 'plate', label_key = 'tablet.vehicles.field.plate', source = 'plate' },
                    { key = 'model', label_key = 'tablet.vehicles.field.model', source = 'model', fallback = '-' },
                    { key = 'owner', label_key = 'tablet.vehicles.field.owner', source = 'owner', fallback = '-' },
                },
                fields = {
                    { key = 'vehicleImage', label_key = 'tablet.vehicles.akte.image', type = 'text', default = '', editable = true },
                    {
                        key = 'legalHold',
                        label = 'Legal Hold Status',
                        type = 'select',
                        default = 'no',
                        editable = true,
                        options = {
                            { value = 'no', label = 'No Hold' },
                            { value = 'seized', label = 'Seized by Court' },
                            { value = 'investigation', label = 'Under Investigation' },
                        },
                    },
                    { key = 'notes', label_key = 'tablet.vehicles.akte.notes', type = 'textarea', default = '', editable = true },
                },
            },
        },

        mechanic = {
            compartment = 'mechanic',
            jobs = { 'mechanic' },
            person = {
                data_fields = {
                    { key = 'name', label_key = 'tablet.persons.field.name', source = 'name' },
                    { key = 'dob', label_key = 'tablet.persons.field.dob', source = 'dob', fallback = '-' },
                    { key = 'job', label_key = 'tablet.persons.akte.occupation', source = 'job', fallback = '-' },
                },
                fields = {
                    { key = 'personImage', label_key = 'tablet.persons.akte.image', type = 'text', default = '', editable = true },
                    { key = 'phone', label_key = 'tablet.persons.akte.phone', type = 'text', default = '', editable = true },
                    {
                        key = 'customerRating',
                        label = 'Customer Tier',
                        type = 'select',
                        default = 'standard',
                        editable = true,
                        options = {
                            { value = 'vip', label = 'VIP Client' },
                            { value = 'standard', label = 'Standard Client' },
                            { value = 'blacklist', label = 'Blacklisted Client' },
                        },
                    },
                    { key = 'serviceNotes', label = 'Service & Billing Notes', type = 'textarea', default = '', editable = true },
                },
            },
            vehicle = {
                data_fields = {
                    { key = 'plate', label_key = 'tablet.vehicles.field.plate', source = 'plate' },
                    { key = 'model', label_key = 'tablet.vehicles.field.model', source = 'model', fallback = '-' },
                    { key = 'owner', label_key = 'tablet.vehicles.field.owner', source = 'owner', fallback = '-' },
                },
                fields = {
                    { key = 'vehicleImage', label_key = 'tablet.vehicles.akte.image', type = 'text', default = '', editable = true },
                    {
                        key = 'condition',
                        label = 'Vehicle Status',
                        type = 'select',
                        default = 'good',
                        editable = true,
                        options = {
                            { value = 'excellent', label = 'Excellent Condition' },
                            { value = 'good', label = 'Good Condition' },
                            { value = 'damaged', label = 'Needs Repair' },
                            { value = 'totaled', label = 'Totaled' },
                        },
                    },
                    {
                        key = 'tuningStage',
                        label = 'Tuning Package',
                        type = 'select',
                        default = 'stock',
                        editable = true,
                        options = {
                            { value = 'stock', label = 'Stock' },
                            { value = 'stage1', label = 'Stage 1 Street' },
                            { value = 'stage2', label = 'Stage 2 Racing' },
                            { value = 'stage3', label = 'Stage 3 Professional' },
                        },
                    },
                    { key = 'mods', label = 'Installed Modifications', type = 'textarea', default = '', editable = true },
                    { key = 'notes', label = 'Maintenance Log', type = 'textarea', default = '', editable = true },
                },
            },
        },
    },
}

-- ── Dynamic Department/Agency Hydration ────────────────────
-- Processes Config.MDT.departments to automatically:
-- 1. Hydrate job_models (compartment scopes and job sharing)
-- 2. Build branding overrides (title templates based on the agency label)
if type(Config.MDT) == 'table' and type(Config.MDT.departments) == 'table' then
    Config.AkteModels.job_models = Config.AkteModels.job_models or {}
    Config.MDT.branding = Config.MDT.branding or {}
    Config.MDT.branding.job_overrides = Config.MDT.branding.job_overrides or {}

    -- Automatically populate Config.MDT.allowed_jobs from Config.MDT.departments
    Config.MDT.allowed_jobs = {}
    local allowedSeen = {}
    for _, deptCfg in pairs(Config.MDT.departments) do
        if type(deptCfg) == 'table' and type(deptCfg.jobs) == 'table' then
            for _, job in ipairs(deptCfg.jobs) do
                local jobLower = job:lower()
                if not allowedSeen[jobLower] then
                    allowedSeen[jobLower] = true
                    table.insert(Config.MDT.allowed_jobs, jobLower)
                end
            end
        end
    end

    local titleTemplate = Config.MDT.branding.title_template or '{job} MDT'

    for deptKey, deptCfg in pairs(Config.MDT.departments) do
        if type(deptCfg) == 'table' and type(deptCfg.jobs) == 'table' then
            local comp = type(deptCfg.compartment) == 'string' and deptCfg.compartment:lower() or deptKey:lower()
            local label = deptCfg.label or deptKey:upper()

            -- Register compartment and jobs in job_models
            local targets = { comp }
            for _, job in ipairs(deptCfg.jobs) do
                table.insert(targets, job:lower())
            end

            -- Ensure we have a base model schema for this department
            -- If it was manually defined as 'pd', 'mdt', or 'mechanic' inside job_models, we reuse it.
            -- Otherwise, they fall back to default schemas.
            local baseSchema = Config.AkteModels.job_models[comp] or {}
            local basePerson = baseSchema.person
            local baseVehicle = baseSchema.vehicle

            for _, key in ipairs(targets) do
                Config.AkteModels.job_models[key] = Config.AkteModels.job_models[key] or {}
                local model = Config.AkteModels.job_models[key]
                model.compartment = comp
                model.person = model.person or basePerson
                model.vehicle = model.vehicle or baseVehicle

                -- Merge/populate shared_with from department configurations
                if type(deptCfg.shared_with) == 'table' then
                    model.shared_with = model.shared_with or {}
                    local sharedSeen = {}
                    for _, s in ipairs(model.shared_with) do
                        sharedSeen[s:lower()] = true
                    end
                    for _, s in ipairs(deptCfg.shared_with) do
                        local sLower = s:lower()
                        if not sharedSeen[sLower] then
                            sharedSeen[sLower] = true
                            table.insert(model.shared_with, s)
                        end
                    end
                end
                
                -- Merge jobs list
                model.jobs = model.jobs or {}
                local jobsSeen = {}
                for _, job in ipairs(model.jobs) do
                    jobsSeen[job:lower()] = true
                end
                for _, job in ipairs(deptCfg.jobs) do
                    local jLower = job:lower()
                    if not jobsSeen[jLower] then
                        jobsSeen[jLower] = true
                        table.insert(model.jobs, job)
                    end
                end
            end

            -- Dynamic branding overrides for the agency/department
            for _, job in ipairs(deptCfg.jobs) do
                local jobLower = job:lower()
                local resolvedTitle = titleTemplate:gsub('{job}', label)
                
                Config.MDT.branding.job_overrides[jobLower] = Config.MDT.branding.job_overrides[jobLower] or {}
                local override = Config.MDT.branding.job_overrides[jobLower]
                override.title = override.title or resolvedTitle
                if deptCfg.logo_url then
                    override.logo_url = override.logo_url or deptCfg.logo_url
                end
            end
        end
    end
end


