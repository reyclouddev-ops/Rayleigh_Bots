import fs from "fs"
import path from "path"

const sleep = ms =>
    new Promise(resolve => setTimeout(resolve, ms))

async function updateProgress(
    sock,
    m,
    statusMessage,
    progress,
    statusText,
    details = ""
) {
    progress = Math.max(
        0,
        Math.min(
            100,
            Math.round(progress)
        )
    )

    const totalBars = 10

    const filled =
        Math.round(
            (progress / 100) *
            totalBars
        )

    const bar =
        "█".repeat(filled) +
        "░".repeat(
            totalBars - filled
        )

    try {
        const editKey = {
            remoteJid: m.chat,
            id: statusMessage.key.id,
            fromMe: true
        }

        if (
            statusMessage.key.participant
        ) {
            editKey.participant =
                statusMessage.key.participant
        }

        await sock.relayMessage(
            m.chat,
            {
                protocolMessage: {
                    key: editKey,
                    type: 14,
                    editedMessage: {
                        conversation:
`╭━━〔 🗑️ DELETE PLUGIN 〕━━╮

⏳ ${statusText}

[${bar}] ${progress}%

${details ? `📄 ${details}` : ""}

╰━━━━━━━━━━━━━━━━━━━━╯`
                    }
                }
            },
            {}
        )
    } catch (err) {
        console.log(
            "[PROGRESS EDIT ERROR]",
            err.message
        )
    }
}

export default {
    name: "Delete Plugin",

    command: [
        "delp",
        "delplug"
    ],

    category: "Owner",

    isOwner: true,

    async run(
        sock,
        m,
        { text }
    ) {
        let statusMsg = null

        try {
            if (!text) {
                return m.reply(
`❌ Masukkan nama plugin!

Contoh:
.delplugin ping.js
.delplug ping`
                )
            }

            let fileName =
                text.trim()

            if (
                !fileName.endsWith(
                    ".js"
                )
            ) {
                fileName += ".js"
            }

            if (
                !/^[a-zA-Z0-9_-]+\.js$/.test(
                    fileName
                )
            ) {
                return m.reply(
                    "❌ Nama plugin tidak valid!"
                )
            }

            await sock.sendMessage(
                m.chat,
                {
                    react: {
                        text: "⏳",
                        key: m.key
                    }
                }
            )

            statusMsg =
                await sock.sendMessage(
                    m.chat,
                    {
                        text:
`╭━━〔 🗑️ DELETE PLUGIN 〕━━╮

⏳ Memeriksa file plugin...

[░░░░░░░░░░] 0%

╰━━━━━━━━━━━━━━━━━━━━╯`
                    },
                    {
                        quoted: m
                    }
                )

            await updateProgress(
                sock,
                m,
                statusMsg,
                30,
                "Mencari path direktori plugin...",
                fileName
            )

            await sleep(600)

            const pluginDir =
                path.join(
                    process.cwd(),
                    "plugins"
                )

            const filePath =
                path.join(
                    pluginDir,
                    fileName
                )

            if (
                !fs.existsSync(
                    filePath
                )
            ) {
                throw new Error(
                    `Plugin \`${fileName}\` tidak ditemukan!`
                )
            }

            await updateProgress(
                sock,
                m,
                statusMsg,
                70,
                "Menghapus file dari direktori...",
                fileName
            )

            await sleep(600)

            fs.unlinkSync(
                filePath
            )

            await updateProgress(
                sock,
                m,
                statusMsg,
                100,
                "Plugin berhasil dihapus!",
                fileName
            )

            await sleep(400)

            await sock.sendMessage(
                m.chat,
                {
                    react: {
                        text: "✅",
                        key: m.key
                    }
                }
            )

            const successText =
`✅ *Plugin berhasil dihapus!*

📄 File : ${fileName}
📁 Path : plugins/${fileName}`

            try {
                const editKey = {
                    remoteJid:
                        m.chat,
                    id:
                        statusMsg.key.id,
                    fromMe:
                        true
                }

                if (
                    statusMsg.key.participant
                ) {
                    editKey.participant =
                        statusMsg.key.participant
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
                                    successText
                            }
                        }
                    },
                    {}
                )
            } catch {
                return m.reply(
                    successText
                )
            }

        } catch (err) {
            console.error(
                "Delete Plugin Error:",
                err
            )

            if (
                statusMsg?.key
            ) {
                try {
                    await sock.sendMessage(
                        m.chat,
                        {
                            react: {
                                text: "❌",
                                key: m.key
                            }
                        }
                    )

                    const errKey = {
                        remoteJid:
                            m.chat,
                        id:
                            statusMsg.key.id,
                        fromMe:
                            true
                    }

                    if (
                        statusMsg.key.participant
                    ) {
                        errKey.participant =
                            statusMsg.key.participant
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
`╭━━〔 ❌ DELETE GAGAL 〕━━╮

❌ ${err.message}

╰━━━━━━━━━━━━━━━━━━━━╯`
                                }
                            }
                        },
                        {}
                    )

                    return
                } catch {}
            }

            return m.reply(
`❌ Gagal menghapus plugin!

${err.message}`
            )
        }
    }
}