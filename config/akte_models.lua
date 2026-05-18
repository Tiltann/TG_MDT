-- ============================================================
--  TG_MDT | config/akte_models.lua
--  Modular Akte schema definitions for persons and vehicles.
--
--  You can add/edit fields here without touching UI/server logic.
--  Supported field types: text, textarea, select
--  data_fields are shown in the left profile/data panel.
--  fields are the editable Akte section on the right.
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
--    Define compartment-based Akte schemas.
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
--      - Jobs in the same compartment share the same Akte data.
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
        -- Example:
        -- lspd = {
        --     compartment = 'lspd',
        --     jobs = { 'police', 'sheriff' },
        --     person = {
        --         data_fields = {
        --             { key = 'name', label_key = 'tablet.persons.field.name', source = 'name' },
        --         },
        --         fields = {
        --             { key = 'notes', label_key = 'tablet.persons.akte.notes', type = 'textarea', default = '', editable = true },
        --         },
        --     },
        --     vehicle = {
        --         data_fields = {
        --             { key = 'model', label_key = 'tablet.vehicles.field.model', source = 'model', fallback = '-' },
        --         },
        --         fields = {
        --             { key = 'notes', label_key = 'tablet.vehicles.akte.notes', type = 'textarea', default = '', editable = true },
        --         },
        --     },
        -- },
        -- mdt = {
        --     compartment = 'mdt',
        --     jobs = { 'mdt' },
        --     person = { ... },
        --     vehicle = { ... },
        -- },
    },
}
