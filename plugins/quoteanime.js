import axios from "axios"

const API_URL =
  "https://api.siputzx.my.id/api/r/quotesanime"

export default {
  name: "QuoteAnime",
  command: [
    "quoteanime",
    "animequote",
    "qanime"
  ],
  category: "Anime",
  description: "Mengambil quote anime secara random",
  help: ["quoteanime"],
  tags: ["anime"],
  isOwner: false,

  async run(sock, m, { prefix, command }) {
    let loading = null

    try {
      loading = await m.reply(
        "⏳ *Mengambil quote anime...*"
      )

      const { data: res } =
        await axios.get(API_URL, {
          timeout: 15000,
          headers: {
            "User-Agent":
              "ReyCloudSHP-Bot/1.0"
          }
        })

      if (
        !res ||
        res.status !== true ||
        !Array.isArray(res.data) ||
        !res.data.length
      ) {
        throw new Error(
          "Quote anime tidak ditemukan."
        )
      }

      const quote =
        res.data[
          Math.floor(
            Math.random() *
            res.data.length
          )
        ]

      if (!quote) {
        throw new Error(
          "Gagal mengambil quote anime."
        )
      }

      const karakter =
        quote.karakter || "-"

      const anime =
        quote.anime || "-"

      const episode =
        quote.episode || "-"

      const quotes =
        quote.quotes || "-"

      const caption =
`╭━━━〔 🎌 QUOTE ANIME 〕━━━╮
┃
┃ 👤 *Karakter*
┃ ${karakter}
┃
┃ 🎬 *Anime*
┃ ${anime}
┃
┃ 📺 *Episode*
┃ ${episode}
┃
┃ 💬 *Quote*
┃
┃ "${quotes}"
┃
╰━━━━━━━━━━━━━━━━━━━━━━╯`

      if (quote.gambar) {
        await sock.sendMessage(
          m.chat,
          {
            image: {
              url: quote.gambar
            },
            caption
          },
          {
            quoted: m
          }
        )
      } else {
        await m.reply(caption)
      }

      if (loading?.key) {
        try {
          await sock.sendMessage(
            m.chat,
            {
              delete: loading.key
            }
          )
        } catch {}
      }

      try {
        await sock.sendMessage(
          m.chat,
          {
            react: {
              text: "🎌",
              key: m.key
            }
          }
        )
      } catch {}

    } catch (err) {
      console.error(
        "[QUOTEANIME ERROR]",
        err?.response?.data ||
        err?.message ||
        err
      )

      if (loading?.key) {
        try {
          await sock.sendMessage(
            m.chat,
            {
              delete: loading.key
            }
          )
        } catch {}
      }

      return m.reply(
`❌ *Terjadi kesalahan saat mengambil quote anime.*

⚠️ ${err?.message || "Unknown error"}`
      )
    }
  }
}