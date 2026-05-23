fx_version 'cerulean'
game 'gta5'
name 'TG_MDT'

description 'TG MDT - Mobile Data Terminal'
version '1.0.0'
author 'TG (Lucentix, Tiltann, BillyG, DominikVatoo)'

shared_scripts {
    '@ox_lib/init.lua',
    'config/config.lua',
    'config/akte-models.lua',
    'config/commands.lua',
    'config/logs.lua',
    'config/modules.lua',
    'shared/sh-debug.lua',
    'shared/framework/sh-init.lua',
    'shared/framework/sh-esx.lua',
    'shared/framework/sh-qbcore.lua',
    'shared/framework/sh-qbox.lua',
    'shared/framework/sh-standalone.lua',
}

client_scripts {
    'client/cl-nui.lua',
    'client/cl-init.lua',
    'client/modules/cl-dispatch.lua',
    'client/modules/cl-tablet.lua',
    'client/cl-exports.lua',
}

server_scripts {
    '@oxmysql/lib/MySQL.lua',
    'server/sv-sql.lua',
    'server/sv-logs.lua',
    'server/sv-updater.lua',
    'server/sv-duty.lua',
    'server/sv-init.lua',
    'server/modules/sv-dispatch.lua',
    'server/sv-exports.lua',
}

ui_page 'web/dist/index.html'

files {
    'locales/*.json',
    'web/dist/index.html',
    'web/dist/**/*.*'
}

dependencies {
    'ox_lib',
    'oxmysql',
    'screenshot-basic',
    'es_extended',
}
