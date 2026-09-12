export default {
  name: "Read View Once",
  command: [
    "rvo",
    "readvo",
    "readviewonce",
    "readview"
  ],
  category: "Tools",
  description: "Membuka dan membaca media pesan sekali lihat",
  usage: ".rvo (reply pesan view once)",
  example: ".rvo",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 5,

  async run(sock, m, { prefix, command }) {
    const quoted = m.quoted

    if (!quoted) {
      return m.reply(
`Reply pesan sekali lihat (view once) untuk membukanya.

Contoh:
${prefix + command} (reply pesan view once)`
      )
    }

    if (!quoted.isViewOnce && !quoted.isMedia) {
      return m.reply(
        "❌ Reply pesan view once (sekali lihat) untuk membukanya."
      )
    }

    await sock.sendMessage(m.chat, {
      react: {
        text: "⏱️",
        key: m.key
      }
    })

    try {
      let originalCaption = ""

      if (
        quoted.message?.[quoted.type]?.caption
      ) {
        originalCaption =
          quoted.message[quoted.type].caption
      } else if (quoted.body) {
        originalCaption = quoted.body
      }

      const buffer = await quoted.download()

      if (!buffer) {
        throw new Error(
          "Gagal download media"
        )
      }

      const caption = originalCaption
        ? `\`Pesan :\`\n> ${originalCaption}`
        : ""

      if (quoted.isImage) {
        await sock.sendMessage(
          m.chat,
          {
            image: buffer,
            caption
          },
          {
            quoted: m
          }
        )

      } else if (quoted.isVideo) {
        await sock.sendMessage(
          m.chat,
          {
            video: buffer,
            caption
          },
          {
            quoted: m
          }
        )

      } else if (quoted.isAudio) {
        await sock.sendMessage(
          m.chat,
          {
            audio: buffer,
            mimetype:
              quoted.message?.[quoted.type]
                ?.mimetype ||
              "audio/mpeg"
          },
          {
            quoted: m
          }
        )

      } else {
        const ext =
          quoted.type
            ?.replace("Message", "")
            ?.toLowerCase() ||
          "bin"

        const mimetype =
          quoted.message?.[quoted.type]
            ?.mimetype ||
          "application/octet-stream"

        await sock.sendMessage(
          m.chat,
          {
            document: buffer,
            fileName:
              `rvo_${Date.now()}.${ext}`,
            mimetype,
            caption:
              caption ||
              "📎 View once media"
          },
          {
            quoted: m
          }
        )
      }

      await sock.sendMessage(m.chat, {
        react: {
          text: "✅",
          key: m.key
        }
      })

    } catch (e) {
      console.error(
        "[RVO ERROR]",
        e
      )

      await sock.sendMessage(m.chat, {
        react: {
          text: "☢️",
          key: m.key
        }
      })

      let msg =
        e?.message ||
        String(e)

      if (
        msg.includes("Gagal download") ||
        msg.toLowerCase().includes("decrypt") ||
        msg.toLowerCase().includes("download") ||
        msg.toLowerCase().includes("timeout") ||
        msg.includes("404") ||
        msg.includes("Gone")
      ) {
        msg =
`Media sudah kadaluarsa atau sudah tidak tersedia dari server WhatsApp.

_Pesan View Once yang sudah terlalu lama atau sudah tidak dapat diakses tidak bisa diunduh kembali._`
      }

      return m.reply(
`❌ *Gagal Membuka View Once*

> ${msg}`
      )
    }
  }
}