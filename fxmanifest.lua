fx_version 'cerulean'
game 'gta5'
name 'TG_MDT'

description 'TG MDT - Mobile Data Terminal'
version '1.0.0'
author 'TG (Lucentix, Tiltann, BillyG, DominikVatoo)'

shared_scripts {
    '@ox_lib/init.lua',
    'shared/**/*.*'
}

client_scripts {
    'client/**/*.*'
}

server_scripts {
    '@oxmysql/lib/MySQL.lua',
    'server/**/*.*'
}

ui_page 'web/dist/index.html'

files {
    'web/dist/index.html',
    'web/dist/**/*.*'
}

dependencies {
    'ox_lib',
    'oxmysql'
}
