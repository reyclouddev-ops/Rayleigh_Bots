import fs from "fs"
import path from "path"

const DB_DIR = path.join(
    process.cwd(),
    "database"
)

const DB_FILE = path.join(
    DB_DIR,
    "antilink.json"
)

const sleep = ms =>
    new Promise(resolve =>
        setTimeout(resolve, ms)
    )

const cooldowns = new Map()

const DEFAULT_CONFIG = {
    group: false,
    channel: false,
    facebook: false,
    instagram: false
}

const LINK_PATTERNS = {
    group: [
        /(?:https?:\/\/)?(?:www\.)?chat\.whatsapp\.com\/[A-Za-z0-9_-]+/i,
        /(?:https?:\/\/)?(?:www\.)?whatsapp\.com\/channel\/[A-Za-z0-9_-]+/i
    ],

    channel: [
        /(?:https?:\/\/)?(?:www\.)?whatsapp\.com\/channel\/[A-Za-z0-9_-]+/i
    ],

    facebook: [
        /(?:https?:\/\/)?(?:www\.)?facebook\.com\/[^\s]+/i,
        /(?:https?:\/\/)?(?:www\.)?fb\.com\/[^\s]+/i,
        /(?:https?:\/\/)?m\.facebook\.com\/[^\s]+/i
    ],

    instagram: [
        /(?:https?:\/\/)?(?:www\.)?instagram\.com\/[^\s]+/i
    ]
}

function ensureDatabase() {
    if (!fs.existsSync(DB_DIR)) {
        fs.mkdirSync(
            DB_DIR,
            {
                recursive: true
            }
        )
    }

    if (!fs.existsSync(DB_FILE)) {
        fs.writeFileSync(
            DB_FILE,
            JSON.stringify(
                {},
                null,
                2
            ),
            "utf8"
        )
    }
}

function readDatabase() {
    ensureDatabase()

    try {
        const data =
            fs.readFileSync(
                DB_FILE,
                "utf8"
            )

        if (!data.trim()) {
            return {}
        }

        const parsed =
            JSON.parse(data)

        return parsed &&
            typeof parsed === "object"
            ? parsed
            : {}

    } catch {
        return {}
    }
}

function writeDatabase(data) {
    ensureDatabase()

    fs.writeFileSync(
        DB_FILE,
        JSON.stringify(
            data,
            null,
            2
        ),
        "utf8"
    )
}

function getConfig(groupId) {
    const db =
        readDatabase()

    if (!db[groupId]) {
        db[groupId] = {
            ...DEFAULT_CONFIG
        }

        writeDatabase(db)
    }

    return {
        ...DEFAULT_CONFIG,
        ...db[groupId]
    }
}

function saveConfig(
    groupId,
    config
) {
    const db =
        readDatabase()

    db[groupId] = {
        ...DEFAULT_CONFIG,
        ...config
    }

    writeDatabase(db)
}

function isCooldown(
    key,
    duration = 2500
) {
    const now =
        Date.now()

    const last =
        cooldowns.get(key) || 0

    if (
        now - last <
        duration
    ) {
        return true
    }

    cooldowns.set(
        key,
        now
    )

    setTimeout(
        () => {
            cooldowns.delete(key)
        },
        duration + 500
    )

    return false
}

function isLinkEnabled(
    config,
    type
) {
    return config[type] === true
}

function detectLinks(text) {
    const body =
        String(text || "")

    if (!body.trim()) {
        return []
    }

    const result = []

    for (
        const type of
        Object.keys(
            LINK_PATTERNS
        )
    ) {
        for (
            const regex of
            LINK_PATTERNS[type]
        ) {
            regex.lastIndex = 0

            if (
                regex.test(body)
            ) {
                result.push(type)
                break
            }
        }
    }

    return [
        ...new Set(result)
    ]
}

function getStatus(
    config,
    type
) {
    return config[type]
        ? "🟢 ON"
        : "🔴 OFF"
}

function getEnabledList(
    config
) {
    const enabled = []

    if (config.group) {
        enabled.push(
            "🌐 Group"
        )
    }

    if (config.channel) {
        enabled.push(
            "📢 Channel"
        )
    }

    if (config.facebook) {
        enabled.push(
            "📘 Facebook"
        )
    }

    if (config.instagram) {
        enabled.push(
            "📸 Instagram"
        )
    }

    return enabled.length
        ? enabled.join(", ")
        : "Tidak ada"
}

function buildMenu(
    groupName,
    config
) {
    return `╭━━〔 🛡️ ANTILINK HARDCORE 〕━━╮

🏢 *Group:*
${groupName}

📊 *STATUS ANTILINK*

🌐 Group     : ${getStatus(config, "group")}
📢 Channel   : ${getStatus(config, "channel")}
📘 Facebook  : ${getStatus(config, "facebook")}
📸 Instagram : ${getStatus(config, "instagram")}

⚡ *Aktif:*
${getEnabledList(config)}

━━━━━━━━━━━━━━━━━━━━━━

Pilih jenis link yang ingin
diaktifkan atau dimatikan.

⚠️ Tidak ada auto-kick.
🗑️ Link terdeteksi akan dihapus.

╰━━━━━━━━━━━━━━━━━━━━╯`
}

async function sendMenu(
    sock,
    m,
    groupName,
    config
) {
    const sections = [
        {
            title:
                "🛡️ PILIH ANTILINK",

            rows: [
                {
                    header: "",
                    title:
                        "🌐 Group",

                    description:
                        `Status: ${getStatus(config, "group")} • ON/OFF`,

                    id:
                        "antilink_group"
                },

                {
                    header: "",
                    title:
                        "📢 Channel",

                    description:
                        `Status: ${getStatus(config, "channel")} • ON/OFF`,

                    id:
                        "antilink_channel"
                },

                {
                    header: "",
                    title:
                        "📘 Facebook",

                    description:
                        `Status: ${getStatus(config, "facebook")} • ON/OFF`,

                    id:
                        "antilink_facebook"
                },

                {
                    header: "",
                    title:
                        "📸 Instagram",

                    description:
                        `Status: ${getStatus(config, "instagram")} • ON/OFF`,

                    id:
                        "antilink_instagram"
                },

                {
                    header: "",
                    title:
                        "☠️ ALL",

                    description:
                        "Aktifkan atau matikan semua",

                    id:
                        "antilink_all"
                }
            ]
        }
    ]

    await sock.sendMessage(
        m.chat,
        {
            text:
                buildMenu(
                    groupName,
                    config
                ),

            footer:
                "© ReyCloud • AntiLink Hardcore",

            buttons: [
                {
                    buttonId:
                        "antilink_menu",

                    buttonText: {
                        displayText:
                            "🛡️ PILIH ANTILINK"
                    },

                    type: 1,

                    nativeFlowInfo: {
                        name:
                            "single_select",

                        paramsJson:
                            JSON.stringify({
                                title:
                                    "🛡️ AntiLink Setting",

                                sections
                            })
                    }
                }
            ],

            headerType: 1
        },
        {
            quoted: m
        }
    )
}

function getActionFromInteractive(
    interactiveId
) {
    const id =
        String(
            interactiveId || ""
        )
            .trim()
            .toLowerCase()

    const actions = {
        antilink_group:
            "group",

        antilink_channel:
            "channel",

        antilink_facebook:
            "facebook",

        antilink_instagram:
            "instagram",

        antilink_all:
            "all"
    }

    return actions[id] || null
}

export default {
    name:
        "AntiLink Hardcore",

    command: [
        "antilink",
        "antilink_group",
        "antilink_channel",
        "antilink_facebook",
        "antilink_instagram",
        "antilink_all"
    ],

    category:
        "Group",

    description:
        "AntiLink Group, Channel, Facebook, Instagram",

    isGroup: true,

    async run(
        sock,
        m,
        {
            command,
            groupMetadata,
            isOwner,
            isAdmin,
            isBotAdmin,
            interactiveId
        }
    ) {
        try {
            if (!m.isGroup) {
                return m.reply(
                    "❌ *Command ini hanya bisa digunakan di Group!*"
                )
            }

            if (
                !isAdmin &&
                !isOwner
            ) {
                return m.reply(
                    "❌ *Fitur ini khusus Admin Group!*"
                )
            }

            const groupId =
                m.chat

            const groupName =
                groupMetadata?.subject ||
                "Group Chat"

            const config =
                getConfig(
                    groupId
                )

            const interactiveAction =
                getActionFromInteractive(
                    interactiveId
                )

            const commandAction =
                getActionFromInteractive(
                    command
                )

            const action =
                interactiveAction ||
                commandAction

            if (
                action &&
                isCooldown(
                    `${groupId}:setting`,
                    3000
                )
            ) {
                return
            }

            if (action) {

                if (
                    action === "all"
                ) {
                    const enableAll =
                        !(
                            config.group &&
                            config.channel &&
                            config.facebook &&
                            config.instagram
                        )

                    config.group =
                        enableAll

                    config.channel =
                        enableAll

                    config.facebook =
                        enableAll

                    config.instagram =
                        enableAll

                    saveConfig(
                        groupId,
                        config
                    )

                    await sock.sendMessage(
                        m.chat,
                        {
                            react: {
                                text:
                                    enableAll
                                        ? "🟢"
                                        : "🔴",

                                key:
                                    m.key
                            }
                        }
                    )

                    await sleep(
                        1000
                    )

                    await sock.sendMessage(
                        m.chat,
                        {
                            text:
`╭━━〔 ☠️ ANTILINK ALL 〕━━╮

${
    enableAll
        ? "🟢 *SEMUA ANTILINK AKTIF!*"
        : "🔴 *SEMUA ANTILINK NONAKTIF!*"
}

🌐 Group
${getStatus(config, "group")}

📢 Channel
${getStatus(config, "channel")}

📘 Facebook
${getStatus(config, "facebook")}

📸 Instagram
${getStatus(config, "instagram")}

⚠️ Auto-kick: ❌
🗑️ Delete link: ${
    enableAll
        ? "✅"
        : "❌"
}

╰━━━━━━━━━━━━━━━━━━━━╯`
                        },
                        {
                            quoted: m
                        }
                    )

                    return
                }

                config[action] =
                    !config[action]

                saveConfig(
                    groupId,
                    config
                )

                const names = {
                    group:
                        "🌐 Group",

                    channel:
                        "📢 Channel",

                    facebook:
                        "📘 Facebook",

                    instagram:
                        "📸 Instagram"
                }

                await sock.sendMessage(
                    m.chat,
                    {
                        react: {
                            text:
                                config[action]
                                    ? "🟢"
                                    : "🔴",

                            key:
                                m.key
                        }
                    }
                )

                await sleep(
                    1000
                )

                await sock.sendMessage(
                    m.chat,
                    {
                        text:
`╭━━〔 🛡️ ANTILINK UPDATE 〕━━╮

${names[action]}

Status:
${getStatus(
    config,
    action
)}

🗑️ Delete Link:
${
    config[action]
        ? "✅ Aktif"
        : "❌ Nonaktif"
}

⚠️ Auto-kick:
❌ Tidak digunakan.

╰━━━━━━━━━━━━━━━━━━━━╯`
                    },
                    {
                        quoted: m
                    }
                )

                return
            }

            if (
                String(command)
                    .toLowerCase() ===
                "antilink"
            ) {
                if (
                    isCooldown(
                        `${groupId}:menu`,
                        4000
                    )
                ) {
                    return
                }

                await sock.sendMessage(
                    m.chat,
                    {
                        react: {
                            text:
                                "🛡️",
                            key:
                                m.key
                        }
                    }
                )

                await sleep(
                    1000
                )

                return sendMenu(
                    sock,
                    m,
                    groupName,
                    config
                )
            }

        } catch (err) {
            console.error(
                "[ANTILINK ERROR]",
                err
            )

            await sleep(
                500
            )

            return m.reply(
`╭━━〔 ❌ ANTILINK ERROR 〕━━╮

⚠️ ${String(
    err.message ||
    "Terjadi kesalahan."
).slice(0, 300)}

╰━━━━━━━━━━━━━━━━━━━━╯`
            )
        }
    },

    onMessage: async (
        sock,
        m,
        {
            isAdmin,
            isOwner,
            isBotAdmin
        } = {}
    ) => {
        try {
            if (
                !m?.isGroup ||
                !m?.chat
            ) {
                return
            }

            const config =
                getConfig(
                    m.chat
                )

            const enabledTypes =
                Object.keys(
                    DEFAULT_CONFIG
                ).filter(
                    key =>
                        config[key] === true
                )

            if (
                !enabledTypes.length
            ) {
                return
            }

            const sender =
                sock.decodeJid
                    ? sock.decodeJid(
                        m.sender
                    )
                    : m.sender

            const botJid =
                sock.decodeJid
                    ? sock.decodeJid(
                        sock.user?.id
                    )
                    : sock.user?.id

            if (
                !sender ||
                !botJid
            ) {
                return
            }

            if (
                sender === botJid
            ) {
                return
            }

            if (
                isAdmin ||
                isOwner
            ) {
                return
            }

            if (!isBotAdmin) {
                return
            }

            const body =
                String(
                    m.body || ""
                )

            if (!body.trim()) {
                return
            }

            const detected =
                detectLinks(
                    body
                )

            if (
                !detected.length
            ) {
                return
            }

            const blocked =
                detected.filter(
                    type =>
                        isLinkEnabled(
                            config,
                            type
                        )
                )

            if (
                !blocked.length
            ) {
                return
            }

            const key =
                m.key

            if (
                !key?.id
            ) {
                return
            }

            if (
                isCooldown(
                    `${m.chat}:${key.id}`,
                    1500
                )
            ) {
                return
            }

            try {
                await sock.sendMessage(
                    m.chat,
                    {
                        delete:
                            key
                    }
                )
            } catch (err) {
                console.log(
                    "[ANTILINK DELETE ERROR]",
                    err.message
                )
            }

            await sleep(
                800
            )

            const names = {
                group:
                    "🌐 Group",

                channel:
                    "📢 Channel",

                facebook:
                    "📘 Facebook",

                instagram:
                    "📸 Instagram"
            }

            const detectedText =
                blocked
                    .map(
                        type =>
                            names[type]
                    )
                    .join(", ")

            await sock.sendMessage(
                m.chat,
                {
                    text:
`╭━━〔 🛡️ ANTILINK HARDCORE 〕━━╮

🚫 *LINK DILARANG!*

🔎 Terdeteksi:
${detectedText}

🗑️ Pesan telah dihapus.

⚠️ *Tidak ada auto-kick.*

Harap jangan mengirim link
yang dilarang di grup ini.

╰━━━━━━━━━━━━━━━━━━━━╯`,

                    mentions: [
                        sender
                    ]
                }
            )

        } catch (err) {
            console.log(
                "[ANTILINK MESSAGE ERROR]",
                err.message
            )
        }
    }
}