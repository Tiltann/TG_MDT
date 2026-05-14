fx_version 'cerulean'
game 'gta5'
name 'TG_MDT'

description 'TG MDT - Mobile Data Terminal'
version '1.0.0'
author 'TG (Lucentix, Tiltann, BillyG, DominikVatoo)'

shared_scripts {
    '@ox_lib/init.lua',
    'config/*.lua',
    'shared/debug.lua',
    'shared/framework/init.lua',
    'shared/framework/esx.lua',
    'shared/framework/qbcore.lua',
    'shared/framework/qbox.lua',
    'shared/framework/standalone.lua',
    'shared/**/*.lua',
}

client_scripts {
    'client/**/*.lua',
}

server_scripts {
    '@oxmysql/lib/MySQL.lua',
    'server/sql.lua',
    'server/logs.lua',
    'server/**/*.lua',
}

ui_page 'web/dist/index.html'

files {
    'locales/*.json',
    'web/dist/index.html',
    'web/dist/**/*.*'
}

dependencies {
    'ox_lib',
    'oxmysql'
}
