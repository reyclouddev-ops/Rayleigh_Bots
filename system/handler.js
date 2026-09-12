import { serialize } from "./helper.js"
import chalk from "chalk"
import fs from "fs"
import path from "path"
import { fileURLToPath, pathToFileURL } from "url"
import NodeCache from "node-cache"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const groupCache = new NodeCache({
    stdTTL: 5 * 60,
    useClones: false
})

global.plugins = global.plugins || {}

const pluginsDir = path.join(__dirname, "../plugins")
const caseFile = path.join(__dirname, "case.js")

const prefixFile = path.join(
    __dirname,
    "../database/setperfix.json"
)

const MULTI_PREFIXES = [
    ".",
    "/",
    "&",
    "$",
    "!",
    "#"
]

const pluginLocks = new Map()

const sleep = ms =>
    new Promise(resolve => setTimeout(resolve, ms))

const getActivePrefix = () => {
    try {
        const databaseDir = path.dirname(prefixFile)

        if (!fs.existsSync(databaseDir)) {
            fs.mkdirSync(databaseDir, {
                recursive: true
            })
        }

        if (!fs.existsSync(prefixFile)) {
            const defaultData = {
                perfix: global.prefix || "."
            }

            fs.writeFileSync(
                prefixFile,
                JSON.stringify(defaultData, null, 2),
                "utf8"
            )

            return defaultData.perfix
        }

        const db = JSON.parse(
            fs.readFileSync(
                prefixFile,
                "utf8"
            )
        )

        const activePrefix =
            String(
                db.perfix ?? "."
            ).trim()

        return activePrefix || "."

    } catch (err) {
        console.error(
            chalk.redBright("[ PREFIX ERROR ]"),
            err.message
        )

        return "."
    }
}

const runtime = seconds => {
    const d = Math.floor(seconds / 86400)

    const h = Math.floor(
        (seconds % 86400) / 3600
    )

    const m = Math.floor(
        (seconds % 3600) / 60
    )

    const s = Math.floor(seconds % 60)

    return `${d}d ${h}h ${m}m ${s}s`
}

global.qjpm = m => ({
    key: {
        participant: "0@s.whatsapp.net",
        ...(m?.chat
            ? {
                remoteJid: "status@broadcast"
            }
            : {})
    },

    message: {
        locationMessage: {
            name:
                `々 ReyCloudSHP: ${runtime(
                    process.uptime()
                )}`,
            jpegThumbnail: ""
        }
    }
})

const importFresh = async file => {
    const url =
        pathToFileURL(
            path.resolve(file)
        ).href

    return import(
        `${url}?update=${Date.now()}_${Math.random()}`
    )
}

const normalizePlugin = plugin => {
    if (!plugin) return null

    if (
        typeof plugin === "function"
    ) {
        return {
            run: plugin
        }
    }

    if (
        typeof plugin === "object"
    ) {
        return plugin
    }

    return null
}

const normalizeCommands = plugin => {
    if (!plugin) return []

    const commands =
        Array.isArray(plugin.command)
            ? plugin.command
            : plugin.command
                ? [plugin.command]
                : []

    return commands
        .flat()
        .filter(Boolean)
        .map(v =>
            String(v)
                .trim()
                .toLowerCase()
        )
}

const loadSinglePlugin = async filename => {
    filename = String(filename || "")

    if (
        !filename ||
        !filename.endsWith(".js")
    ) {
        return
    }

    const pluginPath =
        path.join(
            pluginsDir,
            filename
        )

    if (!fs.existsSync(pluginPath)) {
        if (global.plugins[filename]) {
            delete global.plugins[filename]

            console.log(
                chalk.yellowBright(
                    `[ PLUGIN ] Dihapus: ${filename}`
                )
            )
        }

        return
    }

    try {
        const module =
            await importFresh(
                pluginPath
            )

        const plugin =
            normalizePlugin(
                module.default ||
                module.plugin ||
                module
            )

        if (
            !plugin ||
            !plugin.command
        ) {
            throw new Error(
                "Plugin tidak memiliki command."
            )
        }

        if (
            typeof plugin.run !== "function"
        ) {
            throw new Error(
                "Plugin tidak memiliki function run()."
            )
        }

        const oldPlugin =
            global.plugins[filename]

        global.plugins[filename] =
            plugin

        const commands =
            normalizeCommands(plugin)

        console.log(
            chalk.greenBright(
                `[ PLUGIN ] ${oldPlugin ? "Diupdate" : "Dimuat"}: ${filename}`
            ),
            chalk.gray(
                commands.length
                    ? `→ ${commands.join(", ")}`
                    : ""
            )
        )

    } catch (e) {
        console.error(
            chalk.red(
                `[ PLUGIN ERROR ] ${filename}`
            ),
            e.message
        )
    }
}

const loadAllPlugins = async () => {
    if (!fs.existsSync(pluginsDir)) {
        fs.mkdirSync(
            pluginsDir,
            {
                recursive: true
            }
        )
    }

    const files =
        fs.readdirSync(
            pluginsDir
        ).filter(
            file =>
                file.endsWith(".js")
        )

    for (const file of files) {
        await loadSinglePlugin(file)
    }

    console.log(
        chalk.greenBright(
            `[ SYSTEM ] Total ${Object.keys(global.plugins).length} Plugins Siap DIGUNAKAN.`
        )
    )
}

await loadAllPlugins()

let watchTimer = null

fs.watch(
    pluginsDir,
    (eventType, filename) => {
        filename = String(filename || "")

        if (
            !filename ||
            !filename.endsWith(".js")
        ) {
            return
        }

        if (watchTimer) {
            clearTimeout(watchTimer)
        }

        watchTimer = setTimeout(
            async () => {
                try {
                    await loadSinglePlugin(
                        filename
                    )
                } catch (e) {
                    console.error(
                        chalk.red(
                            `[ HOT RELOAD ERROR ] ${filename}`
                        ),
                        e.message
                    )
                }
            },
            350
        )
    }
)

let caseHandler = null
let caseWatchTimer = null

const loadCase = async () => {
    try {
        const module =
            await importFresh(
                caseFile
            )

        const handler =
            module.default ||
            module.caseHandler ||
            module

        if (
            typeof handler !== "function"
        ) {
            throw new Error(
                "case.js harus export default function."
            )
        }

        caseHandler = handler

        return true

    } catch (e) {
        console.error(
            chalk.red(
                "[ CASE ERROR ] Gagal memuat case.js:"
            ),
            e.message
        )

        return false
    }
}

await loadCase()

if (fs.existsSync(caseFile)) {
    fs.watchFile(
        caseFile,
        {
            interval: 1000
        },
        () => {
            if (caseWatchTimer) {
                clearTimeout(
                    caseWatchTimer
                )
            }

            caseWatchTimer =
                setTimeout(
                    async () => {
                        const success =
                            await loadCase()

                        if (success) {
                            console.log(
                                chalk.greenBright(
                                    "[ SYSTEM ] case.js berhasil di-update."
                                )
                            )
                        }
                    },
                    400
                )
        }
    )
}

function unwrapMessage(message) {
    let current = message

    for (
        let i = 0;
        i < 20 && current;
        i++
    ) {
        if (
            current.ephemeralMessage
                ?.message
        ) {
            current =
                current
                    .ephemeralMessage
                    .message

            continue
        }

        if (
            current.viewOnceMessage
                ?.message
        ) {
            current =
                current
                    .viewOnceMessage
                    .message

            continue
        }

        if (
            current.viewOnceMessageV2
                ?.message
        ) {
            current =
                current
                    .viewOnceMessageV2
                    .message

            continue
        }

        if (
            current.viewOnceMessageV2Extension
                ?.message
        ) {
            current =
                current
                    .viewOnceMessageV2Extension
                    .message

            continue
        }

        if (
            current.documentWithCaptionMessage
                ?.message
        ) {
            current =
                current
                    .documentWithCaptionMessage
                    .message

            continue
        }

        break
    }

    return current || {}
}

function parseJsonSafe(value) {
    if (!value) {
        return null
    }

    if (
        typeof value === "object"
    ) {
        return value
    }

    if (
        typeof value !== "string"
    ) {
        return null
    }

    try {
        return JSON.parse(value)
    } catch {
        return null
    }
}

function getInteractiveParams(chat) {
    try {
        const root =
            unwrapMessage(
                chat?.message || {}
            )

        const interactiveResponse =
            root?.interactiveResponseMessage

        if (interactiveResponse) {
            const nativeFlow =
                interactiveResponse
                    ?.nativeFlowResponseMessage

            if (
                nativeFlow?.paramsJson
            ) {
                const parsed =
                    parseJsonSafe(
                        nativeFlow.paramsJson
                    )

                if (parsed) {
                    return {
                        ...parsed,
                        _type:
                            "nativeFlowResponseMessage",
                        _raw:
                            nativeFlow
                    }
                }
            }
        }

        const nativeFlow =
            root?.nativeFlowResponseMessage

        if (
            nativeFlow?.paramsJson
        ) {
            const parsed =
                parseJsonSafe(
                    nativeFlow.paramsJson
                )

            if (parsed) {
                return {
                    ...parsed,
                    _type:
                        "nativeFlowResponseMessage",
                    _raw:
                        nativeFlow
                }
            }
        }

        const list =
            root?.listResponseMessage

        if (list) {
            const row =
                list.singleSelectReply

            return {
                id:
                    row?.selectedRowId || "",
                selectedRowId:
                    row?.selectedRowId || "",
                title:
                    row?.title ||
                    list.title ||
                    "",
                description:
                    row?.description || "",
                _type:
                    "listResponseMessage"
            }
        }

        const button =
            root?.buttonsResponseMessage

        if (button) {
            return {
                id:
                    button.selectedButtonId ||
                    "",
                selectedButtonId:
                    button.selectedButtonId ||
                    "",
                displayText:
                    button.selectedDisplayText ||
                    "",
                _type:
                    "buttonsResponseMessage"
            }
        }

        const template =
            root?.templateButtonReplyMessage

        if (template) {
            return {
                id:
                    template.selectedId ||
                    "",
                selectedId:
                    template.selectedId ||
                    "",
                displayText:
                    template.selectedDisplayText ||
                    "",
                _type:
                    "templateButtonReplyMessage"
            }
        }

        return null

    } catch (err) {
        console.error(
            "[ INTERACTIVE ERROR ]",
            err.message
        )

        return null
    }
}

function isInteractiveMessage(chat) {
    return !!getInteractiveParams(chat)
}

function getInteractiveId(params) {
    if (!params) {
        return ""
    }

    return String(
        params.id ||
        params.buttonId ||
        params.selectedRowId ||
        params.selectedButtonId ||
        params.selectedId ||
        params.action ||
        params.actionId ||
        params.command ||
        params.cmd ||
        ""
    ).trim()
}

function getInteractiveCommand(params) {
    if (!params) {
        return ""
    }

    const explicit =
        params.command ||
        params.cmd ||
        params.actionCommand

    if (explicit) {
        return String(
            explicit
        )
            .trim()
            .toLowerCase()
    }

    const id =
        getInteractiveId(params)

    if (!id) {
        return ""
    }

    const cleanId =
        String(id).trim()

    const prefixes = [
        "cmd_",
        "command_",
        "action_",
        "button_"
    ]

    for (const prefix of prefixes) {
        if (
            cleanId.startsWith(prefix)
        ) {
            return cleanId
                .slice(prefix.length)
                .split(/[\s:|]/)[0]
                .toLowerCase()
        }
    }

    return cleanId
        .split(/[\s:|]/)[0]
        .toLowerCase()
}

function buildInteractiveText(params) {
    if (!params) {
        return ""
    }

    const id =
        getInteractiveId(params)

    const title =
        params.title ||
        params.displayText ||
        params.selectedDisplayText ||
        params.text ||
        ""

    return String(
        id ||
        title ||
        ""
    ).trim()
}

function getInteractiveArgs(params) {
    if (!params) {
        return []
    }

    const values = [
        params.id,
        params.action,
        params.actionId,
        params.command,
        params.cmd,
        params.selectedRowId,
        params.selectedButtonId,
        params.selectedId
    ]

    const value =
        values.find(
            v =>
                v !== undefined &&
                v !== null &&
                String(v).trim()
        )

    if (!value) {
        return []
    }

    return String(value)
        .trim()
        .split(/\s+/)
        .filter(Boolean)
}

const normalizeNumbers = list =>
    (
        Array.isArray(list)
            ? list
            : [list]
    )
        .filter(Boolean)
        .map(v =>
            String(v)
                .replace(
                    /[^0-9]/g,
                    ""
                )
        )
        .filter(Boolean)

const getPluginContext = ({
    sock,
    m,
    args,
    text,
    command,
    prefix,
    isOwner,
    isPremium,
    groupMetadata,
    participants,
    groupAdmins,
    isBotAdmin,
    isAdmin,
    messageType,
    quotedMessage,
    mentionedJid,
    interactive,
    interactiveParams,
    rawMessage
}) => ({
    args,
    text,
    command,
    prefix,

    isOwner,
    isPremium,

    groupMetadata,
    participants,
    groupAdmins,

    isBotAdmin,
    isAdmin,

    messageType,
    quotedMessage,
    mentionedJid,

    interactive,
    interactiveParams,

    interactiveId:
        getInteractiveId(
            interactiveParams
        ),

    rawMessage,

    qjpm: () =>
        global.qjpm(m),

    runtime: () =>
        runtime(
            process.uptime()
        ),

    reply: (...args) =>
        m.reply(...args),

    sock,
    m
})

const runMessageHooks = async (
    sock,
    m,
    context
) => {
    for (
        const [filename, plugin]
        of Object.entries(
            global.plugins || {}
        )
    ) {
        if (!plugin) {
            continue
        }

        if (
            typeof plugin.onMessage !==
            "function"
        ) {
            continue
        }

        try {
            const result =
                await plugin.onMessage(
                    sock,
                    m,
                    context
                )

            if (result === false) {
                return false
            }

        } catch (error) {
            console.error(
                chalk.red(
                    `[ ONMESSAGE ERROR ] ${filename}`
                ),
                error.message
            )
        }
    }

    return true
}

const handler = async (
    sock,
    chat
) => {
    try {
        if (
            !chat ||
            !chat.message
        ) {
            return
        }

        if (
            chat.key?.remoteJid ===
            "status@broadcast"
        ) {
            return
        }

        const rawMessage =
            unwrapMessage(
                chat.message
            )

        const interactiveParams =
            getInteractiveParams(chat)

        const interactive =
            !!interactiveParams

        const m =
            await serialize(
                sock,
                chat
            )

        if (
            !m ||
            m.isBot
        ) {
            return
        }

        const currentPrefix =
            getActivePrefix()

        const normalizedPrefix =
            String(
                currentPrefix || "."
            )
                .trim()
                .toLowerCase()

        const multiPrefixMode =
            normalizedPrefix === "multi"

        const noPrefixMode =
            normalizedPrefix === "none" ||
            normalizedPrefix === "tanpa"

        const multiMode =
            multiPrefixMode ||
            noPrefixMode

        const bodyStr =
            String(
                m.body || ""
            ).trim()

        let isCmd = false
        let command = ""
        let prefix = ""
        let args = []

        if (interactive) {
            const interactiveCommand =
                getInteractiveCommand(
                    interactiveParams
                )

            if (!interactiveCommand) {
                return
            }

            isCmd = true
            prefix =
                multiMode
                    ? ""
                    : currentPrefix

            command =
                interactiveCommand

            args =
                getInteractiveArgs(
                    interactiveParams
                )

        } else if (multiMode) {
            const firstChar =
                bodyStr.charAt(0)

            if (
                !MULTI_PREFIXES.includes(
                    firstChar
                )
            ) {
                isCmd = false
            } else {
                prefix = firstChar

                const cleanBody =
                    bodyStr
                        .slice(1)
                        .trim()

                const parts =
                    cleanBody
                        .split(/\s+/)
                        .filter(Boolean)

                command =
                    parts[0]
                        ?.toLowerCase() || ""

                args =
                    parts.slice(1)

                isCmd =
                    !!command
            }

        } else {
            const activePrefix =
                String(
                    currentPrefix
                )

            if (
                bodyStr.startsWith(
                    activePrefix
                )
            ) {
                prefix =
                    activePrefix

                const cleanBody =
                    bodyStr
                        .slice(
                            activePrefix.length
                        )
                        .trim()

                const parts =
                    cleanBody
                        .split(/\s+/)
                        .filter(Boolean)

                command =
                    parts[0]
                        ?.toLowerCase() || ""

                args =
                    parts.slice(1)

                isCmd =
                    !!command
            }
        }

        const text =
            interactive
                ? buildInteractiveText(
                    interactiveParams
                )
                : args.join(" ")

        const senderNumber =
            m.sender
                ? String(
                    m.sender
                ).replace(
                    /[^0-9]/g,
                    ""
                )
                : ""

        const botNumber =
            sock
                .decodeJid(
                    sock.user.id
                )
                .replace(
                    /[^0-9]/g,
                    ""
                )

        const ownerList =
            normalizeNumbers(
                global.owner || []
            )

        const premiumList =
            normalizeNumbers(
                global.premium || []
            )

        const isOwner =
            m.fromMe ||
            ownerList.includes(
                senderNumber
            ) ||
            botNumber === senderNumber

        const isPremium =
            isOwner ||
            premiumList.includes(
                senderNumber
            )

        if (
            !sock.public &&
            !isOwner
        ) {
            return
        }

        let groupMetadata = null
        let participants = []
        let groupAdmins = []

        let isBotAdmin = false
        let isAdmin = false

        if (m.isGroup) {
            groupMetadata =
                groupCache.get(
                    m.chat
                )

            if (!groupMetadata) {
                groupMetadata =
                    await sock
                        .groupMetadata(
                            m.chat
                        )
                        .catch(
                            () => null
                        )

                if (groupMetadata) {
                    groupCache.set(
                        m.chat,
                        groupMetadata
                    )
                }
            }

            if (groupMetadata) {
                participants =
                    groupMetadata.participants ||
                    []

                groupAdmins =
                    participants
                        .filter(
                            v => v.admin
                        )
                        .map(
                            v =>
                                sock.decodeJid(
                                    v.id
                                )
                        )

                const senderJid =
                    sock.decodeJid(
                        m.sender
                    )

                const botJid =
                    sock.decodeJid(
                        sock.user.id
                    )

                isAdmin =
                    groupAdmins.includes(
                        senderJid
                    ) ||
                    isOwner

                isBotAdmin =
                    groupAdmins.includes(
                        botJid
                    ) ||
                    isOwner
            }
        }

        const messageType =
            Object.keys(
                rawMessage
            )[0] || ""

        const quotedMessage =
            m.quoted || null

        const mentionedJid =
            m.mentionedJid || []

        const context =
            getPluginContext({
                sock,
                m,
                args,
                text,
                command,
                prefix,
                isOwner,
                isPremium,
                groupMetadata,
                participants,
                groupAdmins,
                isBotAdmin,
                isAdmin,
                messageType,
                quotedMessage,
                mentionedJid,
                interactive,
                interactiveParams,
                rawMessage
            })

        const hookResult =
            await runMessageHooks(
                sock,
                m,
                context
            )

        if (hookResult === false) {
            return
        }

        if (
            !isCmd ||
            !command
        ) {
            return
        }

        const commandName =
            String(
                command
            )
                .trim()
                .toLowerCase()

        const timeLog =
            new Date()
                .toLocaleTimeString(
                    "id-ID"
                )

        const userName =
            m.pushName ||
            "No Name"

        const groupName =
            m.isGroup &&
            groupMetadata
                ? groupMetadata.subject
                : "Private Chat"

        const chatTypeBadge =
            m.isGroup
                ? chalk.bgYellow.black(
                    " GROUP "
                )
                : chalk.bgCyan.black(
                    " PRIVATE "
                )

        console.log(
            chalk.gray(
                "\n╭──────────────────────────────────────────────────"
            ) +
            chalk.gray("\n│ ") +
            chalk.bold.green(
                `🕒 ${timeLog} `
            ) +
            chatTypeBadge +
            chalk.gray("\n│ ") +
            chalk.cyan(
                "💬 Cmd   : "
            ) +
            chalk.whiteBright(
                commandName
            ) +
            chalk.gray("\n│ ") +
            chalk.cyan(
                "📝 Body  : "
            ) +
            chalk.whiteBright(
                bodyStr || "-"
            ) +
            chalk.gray("\n│ ") +
            chalk.cyan(
                "🔰 Prefix: "
            ) +
            chalk.yellowBright(
                multiMode
                    ? "MULTI"
                    : currentPrefix
            ) +
            chalk.gray("\n│ ") +
            chalk.cyan(
                "🎯 Used  : "
            ) +
            chalk.yellowBright(
                prefix || "NONE"
            ) +
            chalk.gray("\n│ ") +
            chalk.cyan(
                "🆔 ID    : "
            ) +
            chalk.yellowBright(
                getInteractiveId(
                    interactiveParams
                ) || "-"
            ) +
            chalk.gray("\n│ ") +
            chalk.cyan(
                "🔘 Int.  : "
            ) +
            chalk.magentaBright(
                interactive
                    ? "YES"
                    : "NO"
            ) +
            chalk.gray("\n│ ") +
            chalk.cyan(
                "📦 Type  : "
            ) +
            chalk.blueBright(
                messageType
            ) +
            chalk.gray("\n│ ") +
            chalk.cyan(
                "👤 User  : "
            ) +
            chalk.yellowBright(
                userName
            ) +
            chalk.gray(
                ` (${senderNumber})`
            ) +
            chalk.gray("\n│ ") +
            chalk.cyan(
                "📍 Chat  : "
            ) +
            chalk.magentaBright(
                groupName
            ) +
            chalk.gray(
                "\n╰──────────────────────────────────────────────────"
            )
        )

        let isPluginTriggered =
            false

        for (
            const [filename, plugin]
            of Object.entries(
                global.plugins || {}
            )
        ) {
            if (!plugin) {
                continue
            }

            const commands =
                normalizeCommands(
                    plugin
                )

            if (
                !commands.includes(
                    commandName
                )
            ) {
                continue
            }

            isPluginTriggered = true

            const lockKey =
                `${m.chat}:${filename}`

            if (
                plugin.noConcurrent &&
                pluginLocks.has(lockKey)
            ) {
                return
            }

            if (
                plugin.isOwner &&
                !isOwner
            ) {
                return m.reply(
                    "❌ Fitur ini khusus Owner!"
                )
            }

            if (
                plugin.isPremium &&
                !isPremium
            ) {
                return m.reply(
                    "❌ Fitur ini khusus Premium!"
                )
            }

            if (
                plugin.isGroup &&
                !m.isGroup
            ) {
                return m.reply(
                    "❌ Fitur ini khusus Group!"
                )
            }

            if (
                plugin.isPrivate &&
                m.isGroup
            ) {
                return m.reply(
                    "❌ Fitur ini hanya dapat digunakan di Private Chat!"
                )
            }

            if (
                plugin.isAdmin &&
                !isAdmin
            ) {
                return m.reply(
                    "❌ Fitur ini khusus Admin Group!"
                )
            }

            if (
                plugin.isBotAdmin &&
                !isBotAdmin
            ) {
                return m.reply(
                    "❌ Bot harus menjadi Admin Group!"
                )
            }

            if (
                typeof plugin.before ===
                "function"
            ) {
                try {
                    const beforeResult =
                        await plugin.before(
                            sock,
                            m,
                            context
                        )

                    if (
                        beforeResult === false
                    ) {
                        return
                    }
                } catch (error) {
                    console.error(
                        chalk.red(
                            `[ BEFORE ERROR ] ${filename}`
                        ),
                        error.message
                    )
                }
            }

            if (
                plugin.noConcurrent
            ) {
                pluginLocks.set(
                    lockKey,
                    true
                )
            }

            try {
                await plugin.run(
                    sock,
                    m,
                    context
                )
            } catch (error) {
                console.error(
                    chalk.red(
                        `[ PLUGIN ERROR ] ${filename}`
                    ),
                    error
                )

                try {
                    await m.reply(
`╭━━〔 ❌ PLUGIN ERROR 〕━━╮

⚠️ Terjadi kesalahan saat menjalankan plugin.

📦 Plugin:
${filename}

📝 Error:
${String(
    error?.message ||
    "Unknown error"
).slice(0, 500)}

╰━━━━━━━━━━━━━━━━━━━━╯`
                    )
                } catch {}
            } finally {
                if (
                    plugin.noConcurrent
                ) {
                    pluginLocks.delete(
                        lockKey
                    )
                }
            }

            if (
                typeof plugin.after ===
                "function"
            ) {
                try {
                    await plugin.after(
                        sock,
                        m,
                        context
                    )
                } catch (error) {
                    console.error(
                        chalk.red(
                            `[ AFTER ERROR ] ${filename}`
                        ),
                        error.message
                    )
                }
            }

            break
        }

        if (
            !isPluginTriggered &&
            !interactive &&
            typeof caseHandler ===
            "function"
        ) {
            try {
                await caseHandler(
                    sock,
                    m,
                    context
                )
            } catch (error) {
                console.error(
                    chalk.red(
                        "[ CASE ERROR ]"
                    ),
                    error
                )
            }
        }

    } catch (err) {
        console.error(
            chalk.red(
                "[ HANDLER ENGINE ERROR ]"
            ),
            err
        )
    }
}

export default handler

export {
    getActivePrefix,
    runtime,
    unwrapMessage,
    parseJsonSafe,
    getInteractiveParams,
    isInteractiveMessage,
    getInteractiveId,
    getInteractiveCommand,
    buildInteractiveText,
    getInteractiveArgs,
    normalizeCommands
}