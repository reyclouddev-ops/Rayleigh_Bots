import axios from "axios"

const API_URL = "https://api.siputzx.my.id/api/s/pinterest"

export default {
  name: "Pinterest",
  command: ["pin", "pinterest"],
  category: "Search",
  description: "Mencari gambar, video, atau GIF dari Pinterest",
  help: [
    "pin <query>",
    "pin <query> image",
    "pin <query> video",
    "pin <query> gif"
  ],
  tags: ["search"],
  isOwner: false,

  async run(sock, m, { text, prefix, command }) {
    let loading = null

    try {
      if (!text?.trim()) {
        return m.reply(
`📌 *PINTEREST SEARCH*

Contoh:
> ${prefix + command} cat
> ${prefix + command} anime image
> ${prefix + command} anime video
> ${prefix + command} cute gif

Type tersedia: *image, video, gif*`
        )
      }

      const args = text.trim().split(/\s+/)

      let type = "image"

      const lastArg =
        args[args.length - 1]?.toLowerCase()

      if (
        ["image", "video", "gif"].includes(lastArg)
      ) {
        type = lastArg
        args.pop()
      }

      const query =
        args.join(" ").trim()

      if (!query) {
        return m.reply(
`❌ *Query tidak boleh kosong.*

Contoh:
> ${prefix + command} cat
> ${prefix + command} anime image`
        )
      }

      loading = await m.reply(
`🔎 *Mencari Pinterest...*

📌 Query: *${query}*
📂 Type: *${type}*`
      )

      const response = await axios.get(
        API_URL,
        {
          params: {
            query,
            type
          },
          timeout: 20000,
          headers: {
            "User-Agent":
              "ReyCloudSHP-Bot/1.0"
          }
        }
      )

      const result = response.data

      if (
        !result ||
        result.status !== true ||
        !Array.isArray(result.data) ||
        !result.data.length
      ) {
        throw new Error(
          "Hasil Pinterest tidak ditemukan."
        )
      }

      const available =
        result.data.filter(item => {
          if (type === "video") {
            return Boolean(item.video_url)
          }

          if (type === "gif") {
            return Boolean(item.gif_url)
          }

          return Boolean(item.image_url)
        })

      if (!available.length) {
        throw new Error(
          `Tidak ada media ${type} yang tersedia untuk "${query}".`
        )
      }

      const pin =
        available[
          Math.floor(
            Math.random() *
            available.length
          )
        ]

      const title =
        pin.grid_title ||
        pin.seo_alt_text ||
        "Pinterest Result"

      const description =
        typeof pin.description === "string" &&
        pin.description.trim()
          ? pin.description.trim()
          : "-"

      const pinner =
        pin.pinner?.full_name ||
        pin.pinner?.username ||
        "-"

      const board =
        pin.board?.name ||
        "-"

      const created =
        pin.created_at ||
        "-"

      const pinUrl =
        pin.pin ||
        (
          pin.id
            ? `https://www.pinterest.com/pin/${pin.id}`
            : "-"
        )

      let mediaUrl

      if (type === "video") {
        mediaUrl = pin.video_url
      } else if (type === "gif") {
        mediaUrl = pin.gif_url
      } else {
        mediaUrl = pin.image_url
      }

      if (!mediaUrl) {
        throw new Error(
          "URL media Pinterest tidak tersedia."
        )
      }

      const caption =
`╭━━━〔 📌 PINTEREST 〕━━━╮
┃
┃ 🔎 *Query:* ${query}
┃ 📂 *Type:* ${type}
┃
┃ 📝 *Title:*
┃ ${title}
┃
┃ 👤 *Pinner:* ${pinner}
┃ 📋 *Board:* ${board}
┃ 📅 *Created:* ${created}
┃
┃ 📖 *Description:*
┃ ${description}
┃
╰━━━━━━━━━━━━━━━━━━━━━━╯

🔗 ${pinUrl}

> ReyCloudSHP`

      if (type === "video") {
        await sock.sendMessage(
          m.chat,
          {
            video: {
              url: mediaUrl
            },
            caption,
            mimetype: "video/mp4"
          },
          {
            quoted: m
          }
        )
      } else {
        await sock.sendMessage(
          m.chat,
          {
            image: {
              url: mediaUrl
            },
            caption
          },
          {
            quoted: m
          }
        )
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
              text: "📌",
              key: m.key
            }
          }
        )
      } catch {}

    } catch (err) {
      console.error(
        "[PINTEREST ERROR]",
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
`❌ *Gagal mengambil data Pinterest.*

⚠️ ${err?.message || "Unknown error"}`
      )
    }
  }
}