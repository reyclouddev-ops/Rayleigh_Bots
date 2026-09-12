import https from "https"

const API_HOST = "api-synhs.my.id"
const API_PATH = "/api/fun/cekkhodam"

function requestKhodam(nama) {
    return new Promise((resolve, reject) => {
        const path =
            `${API_PATH}?nama=${encodeURIComponent(nama)}`

        const req = https.request(
            {
                hostname: API_HOST,
                path,
                method: "GET",
                timeout: 15000,
                headers: {
                    Accept: "application/json",
                    "User-Agent": "ReyCloudBot/1.0"
                }
            },
            res => {
                let body = ""

                res.setEncoding("utf8")

                res.on(
                    "data",
                    chunk => {
                        body += chunk
                    }
                )

                res.on(
                    "end",
                    () => {
                        if (
                            res.statusCode < 200 ||
                            res.statusCode >= 300
                        ) {
                            return reject(
                                new Error(
                                    `HTTP ${res.statusCode}`
                                )
                            )
                        }

                        try {
                            const json =
                                JSON.parse(body)

                            if (
                                !json ||
                                json.status !== true ||
                                !json.data
                            ) {
                                return reject(
                                    new Error(
                                        json?.message ||
                                        "Data API tidak valid."
                                    )
                                )
                            }

                            resolve(json)
                        } catch {
                            reject(
                                new Error(
                                    "Response API tidak valid."
                                )
                            )
                        }
                    }
                )
            }
        )

        req.on(
            "timeout",
            () => {
                req.destroy(
                    new Error(
                        "Request API timeout."
                    )
                )
            }
        )

        req.on(
            "error",
            reject
        )

        req.end()
    })
}

function cleanText(text) {
    return String(text || "")
        .replace(/[*_~`]/g, "")
        .trim()
}

export default {
    name: "Cek Khodam",

    command: [
        "cekkodam",
        "kodam",
        "cekkhodam"
    ],

    category: "Fun",

    description:
        "Mengecek khodam untuk hiburan",

    isOwner: false,

    async run(
        sock,
        m,
        { text }
    ) {
        const nama =
            cleanText(text)

        if (!nama) {
            return m.reply(
`❌ *Nama wajib diisi!*

Contoh:

.cekkodam rey

.kodam rey`
            )
        }

        if (nama.length < 2) {
            return m.reply(
                "❌ Nama minimal 2 karakter."
            )
        }

        if (nama.length > 50) {
            return m.reply(
                "❌ Nama terlalu panjang."
            )
        }

        if (
            !/^[a-zA-ZÀ-ÿ0-9 ._'’-]+$/.test(
                nama
            )
        ) {
            return m.reply(
                "❌ Nama mengandung karakter yang tidak valid."
            )
        }

        try {
            const result =
                await requestKhodam(
                    nama
                )

            const data =
                result.data

            const resultNama =
                cleanText(
                    data.nama ||
                    nama
                )

            const khodam =
                cleanText(
                    data.khodam
                ) ||
                "Tidak diketahui"

            const arti =
                cleanText(
                    data.arti
                ) ||
                "-"

            const pesan =
                cleanText(
                    data.pesan
                ) ||
                `Halo kak ${resultNama}, Khodam kamu adalah ${khodam}.`

            return m.reply(
`╭━━〔 🔮 CEK KHODAM 〕━━╮

👤 Nama:
${resultNama}

👻 Khodam:
*${khodam}*

📖 Arti:
${arti}

💬 Pesan:
${pesan}

━━━━━━━━━━━━━━━━━━

🎭 Sekadar hiburan
📡 Source:
${cleanText(
    result.source ||
    "Synhs API"
)}

╰━━━━━━━━━━━━━━━━━━━━╯`
            )

        } catch (error) {
            console.error(
                "[ CEK KHODAM ERROR ]",
                error
            )

            return m.reply(
`❌ *Cek khodam gagal!*

👤 Nama:
${nama}

⚠️ Error:
${cleanText(
    error.message
) || "Terjadi kesalahan."}

💡 Silakan coba lagi nanti.`
            )
        }
    }
}