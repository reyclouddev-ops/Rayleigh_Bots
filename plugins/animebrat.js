import axios from "axios"
import sharp from "sharp"
import { Sticker, StickerTypes } from "wa-sticker-formatter"

const sleep = ms =>
    new Promise(resolve => setTimeout(resolve, ms))

async function updateProgress(
    sock,
    m,
    statusMessage,
    progress,
    statusText
) {
    progress = Math.max(
        0,
        Math.min(100, Math.round(progress))
    )

    const totalBars = 10
    const filled = Math.round(
        (progress / 100) * totalBars
    )

    const bar =
        "█".repeat(filled) +
        "░".repeat(totalBars - filled)

    try {
        const editKey = {
            remoteJid: m.chat,
            id: statusMessage.key.id,
            fromMe: true
        }

        if (statusMessage.key.participant) {
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
`╭━━〔 🖼️ BRAT ANIME SYSTEM 〕━━╮

⏳ ${statusText}

[${bar}] ${progress}%

╰━━━━━━━━━━━━━━━━━━━━╯`
                    }
                }
            },
            {}
        )
    } catch (err) {
        console.log(
            "[BRATANIME PROGRESS ERROR]",
            err.message
        )
    }
}

async function editStatus(
    sock,
    m,
    statusMessage,
    text
) {
    try {
        const editKey = {
            remoteJid: m.chat,
            id: statusMessage.key.id,
            fromMe: true
        }

        if (statusMessage.key.participant) {
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
                        conversation: text
                    }
                }
            },
            {}
        )
    } catch (err) {
        console.log(
            "[BRATANIME STATUS ERROR]",
            err.message
        )
    }
}

export default {
    name: "Brat Anime Sticker",

    command: [
        "animebrat",
        "bratanime"
    ],

    category: "Sticker",

    description:
        "Membuat sticker Brat Anime dari teks",

    isOwner: false,

    async run(
        sock,
        m,
        { args, prefix, command }
    ) {
        let statusMsg = null

        try {
            const text =
                args
                    .join(" ")
                    .trim()

            if (!text) {
                return m.reply(
`╭━━〔 🖼️ BRAT ANIME STICKER 〕━━╮

❌ *Masukkan teks yang ingin dibuat menjadi sticker!*

📌 *Contoh Penggunaan:*
└ \`${prefix + command} Hai semua\`

╰━━━━━━━━━━━━━━━━━━━━╯`
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
`╭━━〔 🖼️ BRAT ANIME SYSTEM 〕━━╮

⏳ Menyiapkan teks...

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
                25,
                "Menghubungkan ke API Brat Anime..."
            )

            await sleep(600)

            const apiUrl =
                `https://api.nexray.web.id/maker/bratanime?text=${encodeURIComponent(text)}`

            const response =
                await axios.get(
                    apiUrl,
                    {
                        responseType:
                            "arraybuffer",

                        timeout: 60000,

                        headers: {
                            "User-Agent":
                                "Mozilla/5.0"
                        }
                    }
                )

            const imageBuffer =
                Buffer.from(
                    response.data
                )

            if (
                !imageBuffer.length
            ) {
                throw new Error(
                    "API tidak mengembalikan gambar."
                )
            }

            await updateProgress(
                sock,
                m,
                statusMsg,
                45,
                "Gambar Brat Anime berhasil didapatkan..."
            )

            await sleep(500)

            const processedBuffer =
                await sharp(
                    imageBuffer
                )
                    .resize(
                        512,
                        512,
                        {
                            fit: "contain",

                            background: {
                                r: 0,
                                g: 0,
                                b: 0,
                                alpha: 0
                            }
                        }
                    )
                    .png()
                    .toBuffer()

            await updateProgress(
                sock,
                m,
                statusMsg,
                65,
                "Mengubah gambar menjadi sticker..."
            )

            await sleep(500)

            const packname =
                String(
                    global.botname ||
                    "ReyCloud"
                )

            const author =
                String(
                    global.author ||
                    "ReyCloud"
                )

            const sticker =
                new Sticker(
                    processedBuffer,
                    {
                        pack: packname,
                        author: author,
                        type:
                            StickerTypes.FULL,
                        quality: 90
                    }
                )

            const stickerBuffer =
                await sticker.toBuffer()

            if (
                !stickerBuffer ||
                !stickerBuffer.length
            ) {
                throw new Error(
                    "Gagal membuat WebP sticker."
                )
            }

            await updateProgress(
                sock,
                m,
                statusMsg,
                90,
                "Mengirim sticker..."
            )

            await sleep(500)

            await sock.sendMessage(
                m.chat,
                {
                    sticker:
                        stickerBuffer,

                    contextInfo: {
                        isForwarded: true,
                        forwardingScore: 1
                    }
                },
                {
                    quoted: m
                }
            )

            await updateProgress(
                sock,
                m,
                statusMsg,
                100,
                "Sticker berhasil dibuat!"
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

            await editStatus(
                sock,
                m,
                statusMsg,
`╭━━〔 ✅ BRAT ANIME SELESAI 〕━━╮

🖼️ *Sticker berhasil dibuat!*

📝 *Teks:* ${text.slice(0, 100)}

🏷️ *Pack:* ${packname}
✍️ *Author:* ${author}

🟢 *Status:* SUCCESS

╰━━━━━━━━━━━━━━━━━━━━╯`
            )

        } catch (error) {
            console.error(
                "[BRATANIME ERROR]",
                error
            )

            await sock.sendMessage(
                m.chat,
                {
                    react: {
                        text: "❌",
                        key: m.key
                    }
                }
            )

            if (statusMsg?.key) {
                await editStatus(
                    sock,
                    m,
                    statusMsg,
`╭━━〔 ❌ BRAT ANIME GAGAL 〕━━╮

❌ *Gagal membuat sticker!*

⚠️ ${String(
    error.message ||
    "Terjadi kesalahan."
).slice(0, 150)}

╰━━━━━━━━━━━━━━━━━━━━╯`
                )

                return
            }

            return m.reply(
`╭━━〔 ❌ BRAT ANIME GAGAL 〕━━╮

❌ *Gagal membuat sticker!*

⚠️ ${error.message || "Terjadi kesalahan."}

╰━━━━━━━━━━━━━━━━━━━━╯`
            )
        }
    }
}