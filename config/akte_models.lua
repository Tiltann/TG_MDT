-- ============================================================
--  TG_MDT | config/akte_models.lua
--  Modular Akte schema definitions for persons and vehicles.
--
--  You can add/edit fields here without touching UI/server logic.
--  Supported field types: text, textarea, select
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
-- ============================================================

Config = Config or {}

Config.AkteModels = Config.AkteModels or {
    -- Map GTA vehicle model hashes to readable names.
    -- Add more entries as needed.
    vehicle_model_names = {
        ['1663218586'] = 'Sultan RS',
    },

    person = {
        fields = {
            {
                key = 'phone',
                label_key = 'tablet.persons.akte.phone',
                type = 'text',
                default = '',
                editable = true,
            },
            {
                key = 'address',
                label_key = 'tablet.persons.akte.address',
                type = 'text',
                default = '',
                editable = true,
            },
            {
                key = 'occupation',
                label_key = 'tablet.persons.akte.occupation',
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
        fields = {
            {
                key = 'modelName',
                label_key = 'tablet.vehicles.field.model',
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
}
