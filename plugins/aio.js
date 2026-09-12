import axios from "axios"

const BASE_URL = "https://getdl.space"
const API_ENDPOINT = `${BASE_URL}/api/download`

const HEADERS = {
    "User-Agent":
        "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 " +
        "(KHTML, like Gecko) Chrome/139.0.0.0 Mobile Safari/537.36",
    Referer: `${BASE_URL}/id`,
    Origin: BASE_URL,
    "Content-Type": "application/json",
    Accept: "application/json, text/plain, */*",
    Cookie: "NEXT_LOCALE=id"
}

const sleep = ms =>
    new Promise(resolve => setTimeout(resolve, ms))

function isValidUrl(url) {
    return /^https?:\/\/\S+$/i.test(url)
}

function collectUrls(data, result = []) {
    if (!data) return result

    if (typeof data === "string") {
        if (isValidUrl(data)) {
            result.push(data)
        }
        return result
    }

    if (Array.isArray(data)) {
        for (const item of data) {
            collectUrls(item, result)
        }
        return result
    }

    if (typeof data === "object") {
        for (const [key, value] of Object.entries(data)) {
            const lower = key.toLowerCase()

            if (
                lower.includes("url") ||
                lower.includes("download") ||
                lower.includes("media") ||
                lower.includes("video") ||
                lower.includes("audio") ||
                lower.includes("image") ||
                lower.includes("thumbnail")
            ) {
                collectUrls(value, result)
            } else if (
                typeof value === "object"
            ) {
                collectUrls(value, result)
            }
        }
    }

    return result
}

function getFileType(url) {
    const clean = url.split("?")[0].toLowerCase()

    if (/\.(mp4|mkv|webm|mov)$/i.test(clean)) {
        return "video"
    }

    if (/\.(mp3|m4a|wav|ogg|aac|flac)$/i.test(clean)) {
        return "audio"
    }

    if (/\.(jpg|jpeg|png|gif|webp)$/i.test(clean)) {
        return "image"
    }

    return "unknown"
}

async function getDL(targetUrl) {
    if (!targetUrl) {
        return {
            status: false,
            message: "URL wajib diisi."
        }
    }

    if (!isValidUrl(targetUrl)) {
        return {
            status: false,
            message: "URL tidak valid."
        }
    }

    try {
        const response = await axios.post(
            API_ENDPOINT,
            {
                url: targetUrl
            },
            {
                headers: HEADERS,
                timeout: 60000,
                responseType: "json",
                validateStatus: () => true
            }
        )

        if (
            response.status < 200 ||
            response.status >= 300
        ) {
            return {
                status: false,
                statusCode: response.status,
                message:
                    response.data?.message ||
                    response.data?.error ||
                    `GetDL HTTP ${response.status}`,
                data: response.data ?? null
            }
        }

        return {
            status: true,
            statusCode: response.status,
            data: response.data
        }

    } catch (error) {
        console.error(
            "[GETDL ERROR]",
            error.response?.status ||
            error.code ||
            error.message
        )

        if (error.code === "ECONNABORTED") {
            return {
                status: false,
                message: "Request GetDL timeout."
            }
        }

        return {
            status: false,
            message:
                error.response?.data?.message ||
                error.response?.data?.error ||
                error.message ||
                "Gagal menghubungi GetDL."
        }
    }
}

export default {
    name: "GetDL AIO",

    command: [
        "aio",
        "getdl",
        "download"
    ],

    category: "Downloader",

    description:
        "AIO downloader menggunakan GetDL",

    async run(sock, m, { text }) {
        try {
            let url = text?.trim()

            if (!url && m.quoted) {
                url =
                    m.quoted.text ||
                    m.quoted.body ||
                    m.quoted.caption ||
                    ""
            }

            if (!url) {
                return m.reply(
`╭━━〔 🚀 AIO DOWNLOADER 〕━━╮

❌ URL belum diberikan.

Contoh:
.aio https://contoh.com/video

╰━━━━━━━━━━━━━━━━━━━━╯`
                )
            }

            if (!isValidUrl(url)) {
                return m.reply(
`❌ URL tidak valid.

Gunakan URL lengkap:
.aio https://example.com/...`
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

            const loading = await m.reply(
`╭━━〔 🚀 AIO DOWNLOADER 〕━━╮

⏳ *Sedang memproses...*

🔗 URL diterima
🌐 Engine: GetDL

╰━━━━━━━━━━━━━━━━━━━━╯`
            )

            await sleep(1000)

            const result = await getDL(url)

            if (!result.status) {
                await sock.sendMessage(
                    m.chat,
                    {
                        react: {
                            text: "❌",
                            key: m.key
                        }
                    }
                )

                return m.reply(
`╭━━〔 ❌ GETDL ERROR 〕━━╮

${result.message}

╰━━━━━━━━━━━━━━━━━━━━╯`
                )
            }

            const urls = [
                ...new Set(
                    collectUrls(result.data)
                )
            ]

            if (!urls.length) {
                await sock.sendMessage(
                    m.chat,
                    {
                        react: {
                            text: "❌",
                            key: m.key
                        }
                    }
                )

                return m.reply(
`╭━━〔 ⚠️ GETDL 〕━━╮

Request berhasil, tetapi
link media tidak ditemukan.

📦 Response:
${JSON.stringify(
    result.data,
    null,
    2
).slice(0, 3000)}

╰━━━━━━━━━━━━━━━━━━━━╯`
                )
            }

            await sock.sendMessage(
                m.chat,
                {
                    react: {
                        text: "📥",
                        key: m.key
                    }
                }
            )

            let sent = 0

            for (const mediaUrl of urls) {
                if (sent >= 5) break

                const type =
                    getFileType(mediaUrl)

                try {
                    if (type === "image") {
                        await sock.sendMessage(
                            m.chat,
                            {
                                image: {
                                    url: mediaUrl
                                },
                                caption:
                                    sent === 0
                                        ? "🚀 *GetDL AIO*\n\n✅ Download berhasil."
                                        : ""
                            },
                            {
                                quoted: m
                            }
                        )

                        sent++
                        continue
                    }

                    if (type === "video") {
                        await sock.sendMessage(
                            m.chat,
                            {
                                video: {
                                    url: mediaUrl
                                },
                                caption:
                                    sent === 0
                                        ? "🚀 *GetDL AIO*\n\n✅ Video berhasil didownload."
                                        : "",
                                mimetype:
                                    "video/mp4"
                            },
                            {
                                quoted: m
                            }
                        )

                        sent++
                        continue
                    }

                    if (type === "audio") {
                        await sock.sendMessage(
                            m.chat,
                            {
                                audio: {
                                    url: mediaUrl
                                },
                                mimetype:
                                    "audio/mpeg"
                            },
                            {
                                quoted: m
                            }
                        )

                        sent++
                        continue
                    }

                    await sock.sendMessage(
                        m.chat,
                        {
                            document: {
                                url: mediaUrl
                            },
                            fileName:
                                `GetDL-${sent + 1}`,
                            mimetype:
                                "application/octet-stream"
                        },
                        {
                            quoted: m
                        }
                    )

                    sent++

                } catch (sendError) {
                    console.error(
                        "[GETDL SEND ERROR]",
                        sendError.message
                    )
                }

                await sleep(700)
            }

            if (!sent) {
                throw new Error(
                    "Media ditemukan tetapi gagal dikirim ke WhatsApp."
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

            return m.reply(
`╭━━〔 ✅ AIO SUCCESS 〕━━╮

🚀 *GetDL AIO*

📥 Media:
${sent} file berhasil dikirim

🌐 Engine:
GetDL

╰━━━━━━━━━━━━━━━━━━━━╯`
            )

        } catch (error) {
            console.error(
                "[AIO ERROR]",
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
`╭━━〔 ❌ AIO ERROR 〕━━╮

⚠️ ${
    String(
        error?.message ||
        "Gagal memproses download."
    ).slice(0, 500)
}

╰━━━━━━━━━━━━━━━━━━━━╯`
            )
        }
    }
}