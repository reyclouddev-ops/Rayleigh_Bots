export default {
    name: "Donasi",

    command: [
        "donasi",
        "qris"
    ],

    category: "Info",

    description:
        "Menampilkan informasi donasi dan QRIS ReyCloud",

    async run(sock, m) {
        try {
            await sock.sendMessage(
                m.chat,
                {
                    react: {
                        text: "💖",
                        key: m.key
                    }
                }
            )

            return sock.sendMessage(
                m.chat,
                {
                    text:
`╭━━━〔 💖 DONASI REYCLOUD 〕━━━╮

✨ *SALAM HANGAT UNTUK KALIAN* ✨

🤲 Puji syukur atas segala dukungan
yang membuat ReyCloud terus berkembang.

🚀 *DUKUNG REYCLOUD*

Jika kamu ingin membantu pengembangan
bot, server, API, dan berbagai project
ReyCloud, kamu bisa memberikan dukungan
melalui halaman donasi.

💳 *QRIS / DONASI*
🌐 Mustika Payment

━━━━━━━━━━━━━━━━━━━━━━

🙏 *TERIMA KASIH*

Terima kasih untuk semua yang telah
menggunakan dan mendukung ReyCloud.

Setiap dukungan, baik besar maupun kecil,
sangat berarti bagi perjalanan project ini.

🤲 Semoga setiap kebaikan yang diberikan
mendapatkan balasan terbaik.

━━━━━━━━━━━━━━━━━━━━━━

💙 *REYCLOUD*
"Solusi Hosting Digital Terpercaya"

╰━━━━━━━━━━━━━━━━━━━━━━╯`,
                    footer:
                        "Terima kasih telah mendukung ReyCloud ❤️",
                    interactiveButtons: [
                        {
                            name: "cta_url",
                            buttonParamsJson:
                                JSON.stringify({
                                    display_text:
                                        "💳 Buka Link Donasi",
                                    url:
                                        "https://mustikapayment.com/l/donasi-untuk-reycloud"
                                })
                        }
                    ]
                },
                {
                    quoted: m
                }
            )

        } catch (error) {
            console.error(
                "[DONASI ERROR]",
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
                "❌ Gagal menampilkan menu donasi."
            )
        }
    }
}