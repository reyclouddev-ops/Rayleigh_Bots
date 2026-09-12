import axios from "axios"
import fs from "fs"

const sleep = ms =>
    new Promise(resolve => setTimeout(resolve, ms))

async function downloadMedia(m) {
    if (!m?.download) {
        throw new Error("Media tidak ditemukan.")
    }

    const buffer = await m.download()

    if (!buffer || !Buffer.isBuffer(buffer)) {
        throw new Error("Gagal mengambil media.")
    }

    return buffer
}

async function imageToPrompt(media) {
    if (!media) {
        throw new Error("Input media required")
    }

    let base64 = ""

    if (Buffer.isBuffer(media)) {
        base64 = media.toString("base64")
    } else if (
        typeof media === "string" &&
        fs.existsSync(media)
    ) {
        base64 =
            fs.readFileSync(media).toString("base64")
    } else {
        throw new Error(
            "Media not found or invalid format"
        )
    }

    const response = await axios.post(
        "https://imageprompt.org/api/ai/prompts/image",
        {
            base64Url:
                `data:image/webp;base64,${base64}`,
            imageModelId: 0,
            language: "en"
        },
        {
            headers: {
                "User-Agent":
                    "Mozilla/5.0 (Linux; Android 10)",
                "Content-Type":
                    "application/json",
                origin:
                    "https://imageprompt.org",
                referer:
                    "https://imageprompt.org/image-to-prompt"
            },
            timeout: 60000
        }
    )

    return {
        status: true,
        prompt: response.data?.prompt,
        generatedAt:
            response.data?.generatedAt
    }
}

export default {
    name: "Image To Prompt",

    command: [
        "imgtoprompt",
        "imagetoprompt",
        "itp"
    ],

    category: "AI",

    description:
        "Mengubah gambar menjadi prompt AI",

    async run(sock, m) {
        try {
            const quoted = m.quoted

            const isImage =
                m.type === "imageMessage" ||
                quoted?.type === "imageMessage" ||
                quoted?.mimetype?.startsWith("image/")

            if (!isImage) {
                return m.reply(
`╭━━〔 🖼️ IMAGE TO PROMPT 〕━━╮

❌ *Gambar tidak ditemukan!*

Cara penggunaan:

1. Reply gambar:
.imgtoprompt

2. Kirim gambar dengan caption:
.imgtoprompt

╰━━━━━━━━━━━━━━━━━━━━╯`
                )
            }

            await sock.sendMessage(
                m.chat,
                {
                    react: {
                        text: "🖼️",
                        key: m.key
                    }
                }
            )

            const status =
                await m.reply(
`╭━━〔 🖼️ IMAGE TO PROMPT 〕━━╮

⏳ *Sedang menganalisis gambar...*

🤖 AI sedang membuat prompt.

╰━━━━━━━━━━━━━━━━━━━━╯`
                )

            await sleep(1000)

            const target =
                quoted || m

            const image =
                await downloadMedia(target)

            await sleep(1000)

            const result =
                await imageToPrompt(image)

            if (
                !result.status ||
                !result.prompt
            ) {
                throw new Error(
                    "Prompt tidak berhasil dibuat."
                )
            }

            await sock.sendMessage(
                m.chat,
                {
                    react: {
                        text: "✅",
                        key: m.key
                    }
                }
            )

            await sleep(500)

            return m.reply(
`╭━━〔 ✨ IMAGE TO PROMPT 〕━━╮

🖼️ *Image berhasil dianalisis.*

📝 *Generated Prompt:*

${result.prompt}

╰━━━━━━━━━━━━━━━━━━━━╯`
            )

        } catch (error) {
            console.error(
                "[IMG TO PROMPT ERROR]",
                error
            )

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
            } catch {}

            return m.reply(
`╭━━〔 ❌ IMAGE TO PROMPT 〕━━╮

⚠️ ${
    String(
        error?.message ||
        "Gagal membuat prompt."
    ).slice(0, 500)
}

╰━━━━━━━━━━━━━━━━━━━━╯`
            )
        }
    }
}