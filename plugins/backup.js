import fs from "fs"
import path from "path"
import archiver from "archiver"

const sleep = ms =>
    new Promise(resolve => setTimeout(resolve, ms))

export default {
    name: "Backup",

    command: [
        "backup",
        "bk"
    ],

    category: "Owner",

    isOwner: true,

    async run(sock, m) {
        const rootDir = process.cwd()

        const backupDir =
            path.join(
                rootDir,
                "backup"
            )

        const whitelist = [
            "image",
            "plugins",
            "system",
            "database",
            "config.js",
            "index.js",
            "package.json"
        ]

        let zipPath = null
        let statusMessage = null

        try {
            const missing = []

            for (
                const item of whitelist
            ) {
                const target =
                    path.join(
                        rootDir,
                        item
                    )

                if (
                    !fs.existsSync(
                        target
                    )
                ) {
                    missing.push(item)
                }
            }

            if (missing.length) {
                return m.reply(
`❌ *Backup gagal!*

File/folder berikut tidak ditemukan:

${missing
    .map(v => `• ${v}`)
    .join("\n")}

Periksa struktur project kamu terlebih dahulu.`
                )
            }

            if (
                !fs.existsSync(
                    backupDir
                )
            ) {
                fs.mkdirSync(
                    backupDir,
                    {
                        recursive: true
                    }
                )
            }

            const now =
                new Date()

            const pad = n =>
                String(n)
                    .padStart(
                        2,
                        "0"
                    )

            const timestamp =
                `${now.getFullYear()}-` +
                `${pad(now.getMonth() + 1)}-` +
                `${pad(now.getDate())}_` +
                `${pad(now.getHours())}-` +
                `${pad(now.getMinutes())}-` +
                `${pad(now.getSeconds())}`

            const zipName =
                `ReyCloud-Backup-${timestamp}.zip`

            zipPath =
                path.join(
                    backupDir,
                    zipName
                )

            statusMessage =
                await sock.sendMessage(
                    m.chat,
                    {
                        text:
`╭━━〔 📦 REYCLOUD BACKUP 〕━━╮

⏳ Status: Preparing...

[░░░░░░░░░░░░] 0%

📂 Menyiapkan file backup...

╰━━━━━━━━━━━━━━━━━━━━╯`
                    },
                    {
                        quoted: m
                    }
                )

            const sources = [
                {
                    path:
                        path.join(
                            rootDir,
                            "image"
                        ),
                    name:
                        "image"
                },
                {
                    path:
                        path.join(
                            rootDir,
                            "plugins"
                        ),
                    name:
                        "plugins"
                },
                {
                    path:
                        path.join(
                            rootDir,
                            "system"
                        ),
                    name:
                        "system"
                },
                {
                    path:
                        path.join(
                            rootDir,
                            "database"
                        ),
                    name:
                        "database"
                },
                {
                    path:
                        path.join(
                            rootDir,
                            "config.js"
                        ),
                    name:
                        "config.js"
                },
                {
                    path:
                        path.join(
                            rootDir,
                            "index.js"
                        ),
                    name:
                        "index.js"
                },
                {
                    path:
                        path.join(
                            rootDir,
                            "package.json"
                        ),
                    name:
                        "package.json"
                }
            ]

            function countFiles(dir) {
                if (
                    !fs.existsSync(dir)
                ) {
                    return 0
                }

                let stat

                try {
                    stat =
                        fs.statSync(dir)
                } catch {
                    return 0
                }

                if (
                    stat.isFile()
                ) {
                    return 1
                }

                if (
                    !stat.isDirectory()
                ) {
                    return 0
                }

                let items

                try {
                    items =
                        fs.readdirSync(
                            dir
                        )
                } catch {
                    return 0
                }

                let count = 0

                for (
                    const item of items
                ) {
                    const target =
                        path.join(
                            dir,
                            item
                        )

                    try {
                        const itemStat =
                            fs.statSync(
                                target
                            )

                        if (
                            itemStat.isDirectory()
                        ) {
                            count +=
                                countFiles(
                                    target
                                )
                        } else if (
                            itemStat.isFile()
                        ) {
                            count++
                        }
                    } catch {}
                }

                return count
            }

            let totalFiles = 0

            for (
                const source of sources
            ) {
                totalFiles +=
                    countFiles(
                        source.path
                    )
            }

            if (
                totalFiles < 1
            ) {
                totalFiles =
                    sources.length
            }

            let processedFiles = 0
            let lastUpdate = 0
            let lastProgress = 0

            const updateProgress =
                async (
                    progress,
                    status,
                    current = ""
                ) => {
                    progress =
                        Math.max(
                            0,
                            Math.min(
                                100,
                                Math.round(
                                    progress
                                )
                            )
                        )

                    const now =
                        Date.now()

                    if (
                        progress !== 100 &&
                        now - lastUpdate < 7000 &&
                        Math.abs(
                            progress -
                            lastProgress
                        ) < 10
                    ) {
                        return
                    }

                    lastUpdate = now
                    lastProgress =
                        progress

                    const totalBars =
                        12

                    const filled =
                        Math.round(
                            (
                                progress /
                                100
                            ) *
                            totalBars
                        )

                    const bar =
                        "█".repeat(
                            filled
                        ) +
                        "░".repeat(
                            totalBars -
                            filled
                        )

                    try {
                        const editKey = {
                            remoteJid:
                                m.chat,

                            id:
                                statusMessage
                                    .key.id,

                            fromMe:
                                true
                        }

                        if (
                            statusMessage
                                .key
                                .participant
                        ) {
                            editKey.participant =
                                statusMessage
                                    .key
                                    .participant
                        }

                        await sock.relayMessage(
                            m.chat,
                            {
                                protocolMessage: {
                                    key:
                                        editKey,

                                    type:
                                        14,

                                    editedMessage: {
                                        conversation:
`╭━━〔 📦 REYCLOUD BACKUP 〕━━╮

${status}

[${bar}] ${progress}%

📁 File:
${processedFiles}/${totalFiles}

${current
    ? `📄 Current:\n${current}`
    : ""}

╰━━━━━━━━━━━━━━━━━━━━╯`
                                    }
                                }
                            },
                            {}
                        )
                    } catch (error) {
                        console.log(
                            "[BACKUP EDIT ERROR]",
                            error.message
                        )
                    }
                }

            await updateProgress(
                5,
                "🔄 Status: Mengumpulkan file..."
            )

            await new Promise(
                (resolve, reject) => {
                    const output =
                        fs.createWriteStream(
                            zipPath
                        )

                    const archive =
                        archiver(
                            "zip",
                            {
                                zlib: {
                                    level: 9
                                }
                            }
                        )

                    let settled = false

                    const fail =
                        error => {
                            if (!settled) {
                                settled = true
                                reject(error)
                            }
                        }

                    output.on(
                        "close",
                        () => {
                            if (!settled) {
                                settled = true
                                resolve()
                            }
                        }
                    )

                    output.on(
                        "error",
                        fail
                    )

                    archive.on(
                        "error",
                        fail
                    )

                    archive.on(
                        "entry",
                        entry => {
                            processedFiles++

                            const progress =
                                Math.min(
                                    95,
                                    10 +
                                    (
                                        processedFiles /
                                        totalFiles
                                    ) *
                                    80
                                )

                            updateProgress(
                                progress,
                                "📦 Status: Membuat ZIP...",
                                entry.name
                            ).catch(() => {})
                        }
                    )

                    archive.pipe(
                        output
                    )

                    archive.directory(
                        path.join(
                            rootDir,
                            "image"
                        ),
                        "image"
                    )

                    archive.directory(
                        path.join(
                            rootDir,
                            "plugins"
                        ),
                        "plugins"
                    )

                    archive.directory(
                        path.join(
                            rootDir,
                            "system"
                        ),
                        "system"
                    )

                    archive.directory(
                        path.join(
                            rootDir,
                            "database"
                        ),
                        "database"
                    )

                    archive.file(
                        path.join(
                            rootDir,
                            "config.js"
                        ),
                        {
                            name:
                                "config.js"
                        }
                    )

                    archive.file(
                        path.join(
                            rootDir,
                            "index.js"
                        ),
                        {
                            name:
                                "index.js"
                        }
                    )

                    archive.file(
                        path.join(
                            rootDir,
                            "package.json"
                        ),
                        {
                            name:
                                "package.json"
                        }
                    )

                    archive.finalize()
                }
            )

            await updateProgress(
                98,
                "🔄 Status: Memverifikasi backup..."
            )

            if (
                !fs.existsSync(
                    zipPath
                )
            ) {
                throw new Error(
                    "File ZIP tidak terbentuk."
                )
            }

            const stats =
                fs.statSync(
                    zipPath
                )

            if (
                stats.size <= 0
            ) {
                throw new Error(
                    "File ZIP kosong."
                )
            }

            const sizeMB =
                (
                    stats.size /
                    1024 /
                    1024
                ).toFixed(2)

            const totalBars =
                12

            try {
                const editKey = {
                    remoteJid:
                        m.chat,

                    id:
                        statusMessage
                            .key.id,

                    fromMe:
                        true
                }

                if (
                    statusMessage
                        .key
                        .participant
                ) {
                    editKey.participant =
                        statusMessage
                            .key
                            .participant
                }

                await sock.relayMessage(
                    m.chat,
                    {
                        protocolMessage: {
                            key:
                                editKey,

                            type:
                                14,

                            editedMessage: {
                                conversation:
`╭━━〔 ✅ REYCLOUD BACKUP 〕━━╮

[${"█".repeat(totalBars)}] 100%

✅ Backup berhasil dibuat!

📁 File:
${zipName}

📦 Size:
${sizeMB} MB

📂 Isi backup:
• image/
• plugins/
• system/
• database/
• config.js
• index.js
• package.json

⏳ Mengirim file...

╰━━━━━━━━━━━━━━━━━━━━╯`
                            }
                        }
                    },
                    {}
                )
            } catch {}

            await sleep(
                1500
            )

            await sock.sendMessage(
                m.chat,
                {
                    document:
                        fs.readFileSync(
                            zipPath
                        ),

                    mimetype:
                        "application/zip",

                    fileName:
                        zipName,

                    caption:
`╭━━〔 📦 REYCLOUD BACKUP 〕━━╮

✅ *Backup berhasil!*

📁 File:
${zipName}

📦 Size:
${sizeMB} MB

━━━━━━━━━━━━━━━━━━

📂 Isi backup:

• image/
• plugins/
• system/
• database/
• config.js
• index.js
• package.json

━━━━━━━━━━━━━━━━━━

🔐 Backup dibuat oleh
${global.botname || "REYCLOUD"}

© ${global.author || "ReyCloudShop"}`
                },
                {
                    quoted: m
                }
            )

            try {
                const editKey = {
                    remoteJid:
                        m.chat,

                    id:
                        statusMessage
                            .key.id,

                    fromMe:
                        true
                }

                if (
                    statusMessage
                        .key
                        .participant
                ) {
                    editKey.participant =
                        statusMessage
                            .key
                            .participant
                }

                await sock.relayMessage(
                    m.chat,
                    {
                        protocolMessage: {
                            key:
                                editKey,

                            type:
                                14,

                            editedMessage: {
                                conversation:
`╭━━〔 ✅ BACKUP SELESAI 〕━━╮

📦 File:
${zipName}

💾 Size:
${sizeMB} MB

📤 Backup berhasil dikirim.

🟢 Status: COMPLETED

╰━━━━━━━━━━━━━━━━━━━━╯`
                            }
                        }
                    },
                    {}
                )
            } catch {}

            console.log(
                `[ BACKUP ] ${zipName} berhasil dibuat (${sizeMB} MB)`
            )

        } catch (error) {
            console.error(
                "[ BACKUP ERROR ]",
                error
            )

            try {
                if (
                    zipPath &&
                    fs.existsSync(
                        zipPath
                    )
                ) {
                    fs.unlinkSync(
                        zipPath
                    )
                }
            } catch {}

            if (
                statusMessage?.key
            ) {
                try {
                    const errKey = {
                        remoteJid:
                            m.chat,

                        id:
                            statusMessage
                                .key.id,

                        fromMe:
                            true
                    }

                    if (
                        statusMessage
                            .key
                            .participant
                    ) {
                        errKey.participant =
                            statusMessage
                                .key
                                .participant
                    }

                    await sock.relayMessage(
                        m.chat,
                        {
                            protocolMessage: {
                                key:
                                    errKey,

                                type:
                                    14,

                                editedMessage: {
                                    conversation:
`❌ *Backup gagal!*

⚠️ Error:
${error.message}`
                                }
                            }
                        },
                        {}
                    )

                    return
                } catch {}
            }

            return m.reply(
`❌ *Backup gagal!*

⚠️ Error:
${error.message}`
            )
        }
    }
}