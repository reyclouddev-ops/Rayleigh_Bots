import fetch from "node-fetch"

export default {
    name: "TempMail",

    command: [
        "tempmail",
        "temp",
        "mail",
        "akunlama"
    ],

    category: "Tools",

    async run(sock, m, { text, args, prefix, command }) {
        const DOMAIN = "akunlama.com"
        const BASE_URL = "https://akunlama.com/api"

        const action = (args[0] || "").toLowerCase()
        const param = args.slice(1).join(" ").trim()

        const frontName = [
            "haru", "yuki", "sora", "nana", "mika", "iroha", "akari", "hina", "yuna", "rin",
            "mio", "emi", "aya", "mei", "riko", "saki", "kana", "kira", "aoi", "rei",
            "yui", "mari", "nami", "runa", "shiro", "kuro", "hana", "suzu", "kaori", "sayu",
            "miku", "niko", "risa", "eri", "mina", "noa", "yume", "koko", "momo", "fuyu"
        ]

        const endName = [
            "chan", "san", "kun", "nya", "neko", "mimi", "koko", "yume", "sora", "yuki",
            "hana", "hime", "kira", "luna", "star", "moon", "sky", "cloud", "rain", "snow",
            "code", "dev", "tech", "bot", "mail", "zone", "hub", "lab", "base", "core"
        ]

        async function requestApi(url) {
            const res = await fetch(url)
            const textData = await res.text()
            try {
                return JSON.parse(textData)
            } catch {
                return textData
            }
        }

        async function listInbox(username) {
            const recipient = username.replace(`@${DOMAIN}`, "").trim()
            const reqUrl = `${BASE_URL}/list?recipient=${encodeURIComponent(recipient)}`
            const res = await requestApi(reqUrl)
            return Array.isArray(res) ? res : []
        }

        async function updateProgress(statusMessage, progress, statusText, details = "") {
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
`╭━━〔 📧 TEMPMAIL SYSTEM 〕━━╮

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
                console.log("[PROGRESS EDIT ERROR]", err.message)
            }
        }

        // Sub-command: CEK INBOX / PESAN MASUK
        if (action === "inbox" || action === "cek") {
            const username = param
            if (!username) {
                const guideText = 
`📌 *CARA PENGGUNAAN TEMPMAIL INBOX*\n\n` +
`└ \`${prefix + command} inbox <username>\`\n` +
`Contoh: \`${prefix + command} inbox haru_chan\``

                const buttons = [
                    {
                        name: "cta_copy",
                        buttonParamsJson: JSON.stringify({
                            display_text: "📋 Salin Format Perintah",
                            copy_code: `${prefix + command} inbox haru_chan`
                        })
                    }
                ]

                return sock.sendMessage(m.chat, {
                    text: guideText,
                    footer: "Powered by ReyCloudSHP",
                    interactiveButtons: buttons
                }, { quoted: m })
            }

            const cleanUser = username.replace(`@${DOMAIN}`, "").trim()
            let statusMsg = null

            try {
                await sock.sendMessage(m.chat, { react: { text: '⏳', key: m.key } })

                statusMsg = await sock.sendMessage(
                    m.chat,
                    {
                        text: 
`╭━━〔 📧 TEMPMAIL SYSTEM 〕━━╮

⏳ Mengambil data inbox...

[░░░░░░░░░░] 0%

╰━━━━━━━━━━━━━━━━━━━━╯`
                    },
                    { quoted: m }
                )

                await updateProgress(statusMsg, 50, "Menghubungkan ke server akunlama...", `${cleanUser}@${DOMAIN}`)
                const emails = await listInbox(cleanUser)
                await updateProgress(statusMsg, 100, "Berhasil memuat inbox!", `${cleanUser}@${DOMAIN}`)
                await new Promise(resolve => setTimeout(resolve, 4000))

                try {
                    if (statusMsg?.key) {
                        await sock.sendMessage(m.chat, { delete: statusMsg.key })
                    }
                } catch {}

                if (!emails || emails.length === 0) {
                    const emptyText = 
`📭 *INBOX KOSONG*\n\n` +
`📧 Email: \`${cleanUser}@${DOMAIN}\`\n` +
`Status: Belum ada pesan masuk.`

                    await sock.sendMessage(m.chat, { react: { text: '📭', key: m.key } })

                    const buttons = [
                        {
                            name: "cta_copy",
                            buttonParamsJson: JSON.stringify({
                                display_text: "📋 Salin Email",
                                copy_code: `${cleanUser}@${DOMAIN}`
                            })
                        }
                    ]

                    return sock.sendMessage(m.chat, {
                        text: emptyText,
                        footer: "Powered by ReyCloudSHP",
                        interactiveButtons: buttons
                    }, { quoted: m })
                }

                let textResult = 
`📬 *TEMPMAIL INBOX*\n\n` +
`📧 Email: \`${cleanUser}@${DOMAIN}\`\n` +
`📥 Total Pesan: ${emails.length}\n\n`

                for (let i = 0; i < Math.min(emails.length, 5); i++) {
                    const e = emails[i]
                    textResult += 
`🔹 *Pesan #${i + 1}*\n` +
`👤 Dari: ${e.from || "Tidak diketahui"}\n` +
`📌 Subjek: ${e.subject || "Tanpa Subjek"}\n` +
`🔑 Storage Key: \`${e.storage?.key || "-"}\`\n` +
`🌍 Region: ${e.storage?.region || "us"}\n\n`
                }

                await sock.sendMessage(m.chat, { react: { text: '✅', key: m.key } })

                const buttons = [
                    {
                        name: "cta_copy",
                        buttonParamsJson: JSON.stringify({
                            display_text: "📋 Salin Email",
                            copy_code: `${cleanUser}@${DOMAIN}`
                        })
                    }
                ]

                if (emails[0]?.storage?.key) {
                    buttons.push({
                        name: "cta_copy",
                        buttonParamsJson: JSON.stringify({
                            display_text: "📋 Salin Storage Key Terbaru",
                            copy_code: emails[0].storage.key
                        })
                    })
                }

                return sock.sendMessage(m.chat, {
                    text: textResult,
                    footer: "Powered by ReyCloudSHP",
                    interactiveButtons: buttons
                }, { quoted: m })

            } catch (err) {
                if (statusMsg?.key) {
                    try { await sock.sendMessage(m.chat, { delete: statusMsg.key }) } catch {}
                }
                await sock.sendMessage(m.chat, { react: { text: '❌', key: m.key } })
                return m.reply(`❌ Terjadi kesalahan saat mengambil inbox:\n${err.message}`)
            }
        }

        // Sub-command: DETAIL ISI PESAN BERDASARKAN KEY
        if (action === "detail" || action === "read") {
            const storageKey = param
            if (!storageKey) {
                const guideText = 
`📌 *CARA PENGGUNAAN TEMPMAIL DETAIL*\n\n` +
`└ \`${prefix + command} detail <storage_key>\``

                const buttons = [
                    {
                        name: "cta_copy",
                        buttonParamsJson: JSON.stringify({
                            display_text: "📋 Salin Format Perintah",
                            copy_code: `${prefix + command} detail 97ae0dxx-...`
                        })
                    }
                ]

                return sock.sendMessage(m.chat, {
                    text: guideText,
                    footer: "Powered by ReyCloudSHP",
                    interactiveButtons: buttons
                }, { quoted: m })
            }

            let statusMsg = null

            try {
                await sock.sendMessage(m.chat, { react: { text: '⏳', key: m.key } })

                statusMsg = await sock.sendMessage(
                    m.chat,
                    {
                        text: 
`╭━━〔 📧 TEMPMAIL SYSTEM 〕━━╮

⏳ Mengambil detail pesan...

[░░░░░░░░░░] 0%

╰━━━━━━━━━━━━━━━━━━━━╯`
                    },
                    { quoted: m }
                )

                await updateProgress(statusMsg, 50, "Mengambil HTML & Metadata pesan...", storageKey)
                const metaUrl = `${BASE_URL}/getKey?region=us&key=${encodeURIComponent(storageKey)}`
                const htmlUrl = `${BASE_URL}/getHtml?region=us&key=${encodeURIComponent(storageKey)}`
                const [meta, html] = await Promise.all([requestApi(metaUrl), requestApi(htmlUrl)])

                await updateProgress(statusMsg, 100, "Berhasil memuat detail pesan!", storageKey)
                await new Promise(resolve => setTimeout(resolve, 4000))

                try {
                    if (statusMsg?.key) {
                        await sock.sendMessage(m.chat, { delete: statusMsg.key })
                    }
                } catch {}

                const htmlContent = typeof html === 'string' ? html : JSON.stringify(html)
                const cleanText = htmlContent.replace(/<[^>]*>?/gm, ' ').replace(/\s+/g, ' ').trim()
                const snippet = cleanText.length > 800 ? cleanText.substring(0, 800) + "..." : cleanText

                const resultText =
`📄 *DETAIL EMAIL*\n\n` +
`🔑 Key: \`${storageKey}\`\n\n` +
`✉️ *Isi Pesan (Preview):*\n` +
`${snippet || "(Kosong / Format HTML)"}`

                await sock.sendMessage(m.chat, { react: { text: '✅', key: m.key } })

                const buttons = [
                    {
                        name: "cta_copy",
                        buttonParamsJson: JSON.stringify({
                            display_text: "📋 Salin Storage Key",
                            copy_code: storageKey
                        })
                    }
                ]

                return sock.sendMessage(m.chat, {
                    text: resultText,
                    footer: "Powered by ReyCloudSHP",
                    interactiveButtons: buttons
                }, { quoted: m })

            } catch (err) {
                if (statusMsg?.key) {
                    try { await sock.sendMessage(m.chat, { delete: statusMsg.key }) } catch {}
                }
                await sock.sendMessage(m.chat, { react: { text: '❌', key: m.key } })
                return m.reply(`❌ Gagal mengambil detail pesan:\n${err.message}`)
            }
        }

        // DEFAULT: BUAT EMAIL BARU (GENERATE)
        let customUser = param.replace(`@${DOMAIN}`, "").trim()
        let username = customUser

        if (!username) {
            const randomFront = frontName[Math.floor(Math.random() * frontName.length)]
            const randomEnd = endName[Math.floor(Math.random() * endName.length)]
            const randomNum = Math.floor(Math.random() * 900) + 100
            username = `${randomFront}_${randomEnd}_${randomNum}`
        }

        username = username.toLowerCase().replace(/\s+/g, "_")
        const email = `${username}@${DOMAIN}`
        const weblogin = `https://${DOMAIN}/inbox/${username}/list`
        const checkCommand = `${prefix + command} inbox ${username}`

        let statusMsg = null

        try {
            await sock.sendMessage(m.chat, { react: { text: '⏳', key: m.key } })

            statusMsg = await sock.sendMessage(
                m.chat,
                {
                    text: 
`╭━━〔 📧 TEMPMAIL SYSTEM 〕━━╮

⏳ Memproses pembuatan email...

[░░░░░░░░░░] 0%

╰━━━━━━━━━━━━━━━━━━━━╯`
                },
                { quoted: m }
            )

            await updateProgress(statusMsg, 50, "Mendaftarkan email sementara...", email)
            await listInbox(username)

            await updateProgress(statusMsg, 100, "Email sementara berhasil dibuat!", email)
            await new Promise(resolve => setTimeout(resolve, 4000))

            try {
                if (statusMsg?.key) {
                    await sock.sendMessage(m.chat, { delete: statusMsg.key })
                }
            } catch {}

            const successText = 
`✅ *EMAIL SEMENTARA BERHASIL DIBUAT*\n\n` +
`📧 *Email:* \`${email}\`\n` +
`🌐 *Web Inbox:* ${weblogin}\n\n` +
`💡 *Cara Cek Pesan:* Ketik atau salin perintah cek inbox di bawah.`

            await sock.sendMessage(m.chat, { react: { text: '✅', key: m.key } })

            const buttons = [
                {
                    name: "cta_copy",
                    buttonParamsJson: JSON.stringify({
                        display_text: "📋 Salin Email",
                        copy_code: email
                    })
                },
                {
                    name: "cta_copy",
                    buttonParamsJson: JSON.stringify({
                        display_text: "📋 Salin Perintah Cek Inbox",
                        copy_code: checkCommand
                    })
                }
            ]

            return sock.sendMessage(m.chat, {
                text: successText,
                footer: "Powered by ReyCloudSHP",
                interactiveButtons: buttons
            }, { quoted: m })

        } catch (error) {
            if (statusMsg?.key) {
                try { await sock.sendMessage(m.chat, { delete: statusMsg.key }) } catch {}
            }
            await sock.sendMessage(m.chat, { react: { text: '❌', key: m.key } })

            const errText = 
`╭━━〔 ❌ TEMPMAIL GAGAL 〕━━╮

❌ *Gagal membuat TempMail!*

⚠️ ${String(error.message).slice(0, 150)}

╰━━━━━━━━━━━━━━━━━━━━╯`

            return sock.sendMessage(m.chat, {
                text: errText,
                footer: "Powered by ReyCloudSHP",
                interactiveButtons: [
                    {
                        name: "cta_copy",
                        buttonParamsJson: JSON.stringify({
                            display_text: "📋 Salin Pesan Error",
                            copy_code: String(error.message)
                        })
                    }
                ]
            }, { quoted: m })
        }
    }
}