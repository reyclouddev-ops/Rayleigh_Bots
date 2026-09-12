import fs from "fs"
import path from "path"

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))

async function updateProgress(sock, m, statusMessage, progress, statusText, details = "") {
    progress = Math.max(0, Math.min(100, Math.round(progress)))

    const totalBars = 10
    const filled = Math.round((progress / 100) * totalBars)
    const bar = "█".repeat(filled) + "░".repeat(totalBars - filled)

    try {
        const editKey = {
            remoteJid: m.chat,
            id: statusMessage.key.id,
            fromMe: true
        }

        if (statusMessage.key.participant) {
            editKey.participant = statusMessage.key.participant
        }

        await sock.relayMessage(
            m.chat,
            {
                protocolMessage: {
                    key: editKey,
                    type: 14,
                    editedMessage: {
                        conversation:
`╭━━〔 📥 ADD PLUGIN 〕━━╮

⌛ ${statusText}

[${bar}] ${progress}%

${details ? `📄 ${details}` : ""}

╰━━━━━━━━━━━━━━━━━━━━╯`
                    }
                }
            },
            {}
        )
    } catch (err) {
        console.log("[PROGRESS EDIT ERROR]", err.message)
    }
}

function getQuotedMessage(m) {
    return m.quoted || null
}

async function getQuotedSource(m) {
    const quoted = getQuotedMessage(m)

    if (!quoted) {
        throw new Error(
            "Silakan reply pesan teks atau file `.js` yang berisi source code."
        )
    }

    const mime =
        quoted.mtype ||
        quoted.msg?.mimetype ||
        quoted.message?.documentMessage?.mimetype ||
        ""

    const fileName =
        quoted.fileName ||
        quoted.msg?.fileName ||
        quoted.message?.documentMessage?.fileName ||
        ""

    const isDocument =
        mime.includes("javascript") ||
        mime.includes("text") ||
        mime.includes("application/octet-stream") ||
        mime.includes("application/x-javascript") ||
        !!fileName

    if (isDocument) {
        if (
            fileName &&
            !fileName.toLowerCase().endsWith(".js")
        ) {
            throw new Error(
                `File yang direply harus berekstensi .js\n\nFile: ${fileName}`
            )
        }

        if (typeof quoted.download !== "function") {
            throw new Error(
                "Fungsi download file tidak tersedia pada quoted message."
            )
        }

        const buffer = await quoted.download()

        if (!buffer || !buffer.length) {
            throw new Error(
                "Gagal mengambil file source code."
            )
        }

        return buffer.toString("utf8")
    }

    const text =
        quoted.text ||
        quoted.body ||
        quoted.msg?.text ||
        quoted.message?.conversation ||
        quoted.message?.extendedTextMessage?.text ||
        ""

    if (!text.trim()) {
        throw new Error(
            "Pesan yang direply tidak berisi source code."
        )
    }

    return text.trim()
}

export default {
    name: "Add Plugin",

    command: [
        "addp",
        "addplug"
    ],

    category: "Owner",
    isOwner: true,

    run: async (sock, m, { text }) => {
        let statusMsg = null

        try {
            if (!text) {
                return m.reply(
`❌ Format salah!

Gunakan:

.addp nama.js

Lalu reply source code atau file .js.

Contoh:

.addp ping.js

↳ Reply source code plugin

atau:

.addp ping.js

↳ Reply file ping.js`
                )
            }

            let fileName = text
                .trim()
                .split(/\s+/)[0]

            if (!fileName.endsWith(".js")) {
                fileName += ".js"
            }

            if (!/^[a-zA-Z0-9_-]+\.js$/.test(fileName)) {
                return m.reply(
`❌ Nama file tidak valid!

Gunakan hanya:
• Huruf
• Angka
• _
• -

Contoh:
ping.js
menu-owner.js
ai.js`
                )
            }

            const quoted = getQuotedMessage(m)

            if (!quoted) {
                return m.reply(
`❌ Source code belum ditemukan!

Gunakan:

.addp nama.js

lalu reply:
📄 file .js
atau
📝 pesan berisi source code`
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

            statusMsg = await sock.sendMessage(
                m.chat,
                {
                    text:
`╭━━〔 📥 ADD PLUGIN 〕━━╮

⏳ Membaca source code...

[░░░░░░░░░░] 0%

📄 Target: ${fileName}

╰━━━━━━━━━━━━━━━━━━━━╯`
                },
                {
                    quoted: m
                }
            )

            await sleep(500)

            await updateProgress(
                sock,
                m,
                statusMsg,
                25,
                "Memeriksa source code...",
                fileName
            )

            const code = await getQuotedSource(m)

            if (!code.trim()) {
                throw new Error(
                    "Source code kosong."
                )
            }

            await sleep(600)

            await updateProgress(
                sock,
                m,
                statusMsg,
                50,
                "Menyiapkan direktori plugins...",
                fileName
            )

            const pluginDir = path.join(
                process.cwd(),
                "plugins"
            )

            if (!fs.existsSync(pluginDir)) {
                fs.mkdirSync(
                    pluginDir,
                    {
                        recursive: true
                    }
                )
            }

            const filePath = path.join(
                pluginDir,
                fileName
            )

            if (fs.existsSync(filePath)) {
                throw new Error(
                    `Plugin \`${fileName}\` sudah ada! Gunakan nama file lain.`
                )
            }

            await sleep(500)

            await updateProgress(
                sock,
                m,
                statusMsg,
                75,
                "Menulis source code...",
                fileName
            )

            fs.writeFileSync(
                filePath,
                code,
                "utf8"
            )

            await sleep(700)

            await updateProgress(
                sock,
                m,
                statusMsg,
                100,
                "Plugin berhasil dibuat!",
                fileName
            )

            await sleep(500)

            await sock.sendMessage(
                m.chat,
                {
                    react: {
                        text: "✅",
                        key: m.key
                    }
                }
            )

            const size =
                Buffer.byteLength(
                    code,
                    "utf8"
                )

            const successText =
`╭━━〔 ✅ ADD PLUGIN 〕━━╮

✅ Plugin berhasil dibuat!

📁 Folder:
plugins/

📄 File:
${fileName}

📦 Size:
${size} bytes

📌 Source:
Reply teks/file.js

📂 Lokasi:
plugins/${fileName}

╰━━━━━━━━━━━━━━━━━━━━╯`

            try {
                const editKey = {
                    remoteJid: m.chat,
                    id: statusMsg.key.id,
                    fromMe: true
                }

                if (statusMsg.key.participant) {
                    editKey.participant =
                        statusMsg.key.participant
                }

                await sock.relayMessage(
                    m.chat,
                    {
                        protocolMessage: {
                            key: editKey,
                            type: 14,
                            editedMessage: {
                                conversation:
                                    successText
                            }
                        }
                    },
                    {}
                )
            } catch (editError) {
                console.log(
                    "[SUCCESS EDIT ERROR]",
                    editError.message
                )

                return m.reply(
                    successText
                )
            }

        } catch (err) {
            console.error(
                "Add Plugin Error:",
                err
            )

            if (statusMsg?.key) {
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
                        remoteJid: m.chat,
                        id: statusMsg.key.id,
                        fromMe: true
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
                                key: errKey,
                                type: 14,
                                editedMessage: {
                                    conversation:
`╭━━〔 ❌ ADD GAGAL 〕━━╮

❌ ${err.message}

╰━━━━━━━━━━━━━━━━━━━━╯`
                                }
                            }
                        },
                        {}
                    )

                    return
                } catch (editError) {
                    console.log(
                        "[ERROR EDIT FAILED]",
                        editError.message
                    )
                }
            }

            return m.reply(
`❌ Gagal membuat plugin!

${err.message}`
            )
        }
    }
}