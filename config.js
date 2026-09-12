import fs from 'fs'
import chalk from 'chalk'

// ========================================
// BOT CONFIG
// ========================================

global.owner = [
    '6281260512743',
    '6285837513050'
]

global.premium = [
    '6281260512743'
]

global.packname = 'Rayleigh_Bots'
global.author = 'ReyCode'
global.botname = 'Rayleigh_Bots'
global.prefix = '.'


// ========================================
// VERCEL CONFIG
// ========================================

global.vercel = {
    token: process.env.VERCEL_TOKEN || '',

    domains: [
        'legionteknologi.my.id',
        'reycode.my.id'
    ]
}


// ========================================
// SUBDOMAIN / VPS CONFIG
// ========================================

global.setup = {
    ipvps: process.env.VPS_IP || '',

    username: process.env.VPS_USERNAME || 'root',

    password: process.env.VPS_PASSWORD || '',

    sshPort: 22,

    panelUrl: 'https://reydev.panel-prvt.web.id',

    domain: 'reycode.my.id',

    cloudflare: {
        apiToken:
            process.env.CLOUDFLARE_API_TOKEN || '',

        zoneId:
            process.env.CLOUDFLARE_ZONE_ID || ''
    },

    nginx: {
        configPath:
            '/etc/nginx/sites-available',

        enabledPath:
            '/etc/nginx/sites-enabled'
    },

    ssl: {
        enabled: true,

        email:
            process.env.SSL_EMAIL || 'reyclouddev@gmail.com'
    }
}


// ========================================
// PTERODACTYL PANEL CONFIG
// ========================================

global.panel = {

    domain:
        'https://reydev.panel-prvt.web.id',

    apikey:
        process.env.PTERODACTYL_API_KEY || '',

    nestid: 5,

    egg: 15,

    loc: 1
}


// ========================================
// EXPORT CONFIG
// ========================================

export const config = {
    owner: global.owner,

    premium: global.premium,

    packname: global.packname,

    author: global.author,

    botname: global.botname,

    prefix: global.prefix,

    vercel: global.vercel,

    setup: global.setup,

    panel: global.panel
}

export default config