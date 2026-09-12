const sleep = ms =>
  new Promise(resolve =>
    setTimeout(resolve, ms)
  )

export default {
  name: "Join",

  command: ["join"],

  category: "Tools",

  description:
    "Join grup atau channel WhatsApp",

  async run(sock, m) {
    try {
      const input = String(
        m.text || ""
      )
        .replace(
          /^[.!#/]?join\b/i,
          ""
        )
        .trim()

      if (!input) {
        return await sock.sendMessage(
          m.chat,
          {
            text:
              "📥 *Join WhatsApp*\n\n" +
              "Gunakan:\n" +
              "`.join link`\n\n" +
              "Contoh grup:\n" +
              "`.join https://chat.whatsapp.com/XXXXXXXX`\n\n" +
              "Contoh channel:\n" +
              "`.join https://whatsapp.com/channel/XXXXXXXX/XXXXXXXX`"
          },
          {
            quoted: m
          }
        )
      }

      const groupMatch =
        input.match(
          /chat\.whatsapp\.com\/([A-Za-z0-9_-]+)/i
        )

      const channelMatch =
        input.match(
          /whatsapp\.com\/channel\/([A-Za-z0-9_-]+)(?:\/([A-Za-z0-9_-]+))?/i
        )

      if (
        !groupMatch &&
        !channelMatch
      ) {
        return await sock.sendMessage(
          m.chat,
          {
            text:
              "❌ *Link tidak valid*\n\n" +
              "Gunakan link grup atau channel WhatsApp yang benar."
          },
          {
            quoted: m
          }
        )
      }

      const status =
        await sock.sendMessage(
          m.chat,
          {
            text:
              "⏳ *Join WhatsApp*\n\n" +
              "Memproses link..."
          },
          {
            quoted: m
          }
        )

      const edit = async text => {
        let attempt = 0

        while (attempt < 3) {
          try {
            attempt++

            await sock.sendMessage(
              m.chat,
              {
                text,
                edit: status.key
              }
            )

            return true
          } catch (err) {
            console.log(
              `[JOIN] Edit gagal percobaan ${attempt}:`,
              err.message
            )

            if (
              attempt < 3
            ) {
              await sleep(2000)
            }
          }
        }

        return false
      }

      if (groupMatch) {
        const inviteCode =
          groupMatch[1]

        await edit(
          "🔎 *Join WhatsApp*\n\n" +
          "Memeriksa invite grup..."
        )

        await sleep(1000)

        let groupId

        try {
          groupId =
            await sock.groupAcceptInvite(
              inviteCode
            )
        } catch (err) {
          const message =
            err?.data?.message ||
            err?.output?.payload?.message ||
            err?.message ||
            "Gagal bergabung ke grup."

          throw new Error(
            message
          )
        }

        await sleep(1000)

        await edit(
          "✅ *Berhasil Join Grup*\n\n" +
          `🆔 ${groupId}`
        )

        await sock.sendMessage(
          m.chat,
          {
            react: {
              text: "✅",
              key: m.key
            }
          }
        )

        return
      }

      if (channelMatch) {
        const inviteCode =
          channelMatch[2]

        if (!inviteCode) {
          return await edit(
            "❌ *Link Channel Tidak Lengkap*\n\n" +
            "Gunakan link channel lengkap yang memiliki invite code."
          )
        }

        await edit(
          "🔎 *Join WhatsApp Channel*\n\n" +
          "Memeriksa channel..."
        )

        await sleep(1000)

        let metadata

        try {
          metadata =
            await sock.newsletterMetadata(
              "invite",
              inviteCode
            )
        } catch (err) {
          const message =
            err?.data?.message ||
            err?.output?.payload?.message ||
            err?.message ||
            "Gagal mendapatkan informasi channel."

          throw new Error(
            message
          )
        }

        if (!metadata?.id) {
          throw new Error(
            "Channel tidak ditemukan atau link sudah tidak valid."
          )
        }

        await edit(
          "📡 *Join WhatsApp Channel*\n\n" +
          "Bergabung ke channel..."
        )

        await sleep(1000)

        try {
          await sock.newsletterFollow(
            metadata.id
          )
        } catch (err) {
          const message =
            err?.data?.message ||
            err?.output?.payload?.message ||
            err?.message ||
            "Gagal mengikuti channel."

          throw new Error(
            message
          )
        }

        await sleep(1000)

        const channelName =
          metadata.name ||
          metadata.thread_metadata?.name ||
          "WhatsApp Channel"

        await edit(
          "✅ *Berhasil Join Channel*\n\n" +
          `📢 ${channelName}\n` +
          `🆔 ${metadata.id}`
        )

        await sock.sendMessage(
          m.chat,
          {
            react: {
              text: "✅",
              key: m.key
            }
          }
        )

        return
      }
    } catch (err) {
      console.error(
        "[JOIN ERROR]",
        err?.response?.data ||
          err?.output?.payload ||
          err?.stack ||
          err?.message
      )

      const errorMessage =
        err?.data?.message ||
        err?.output?.payload?.message ||
        err?.message ||
        "Terjadi kesalahan saat mencoba join."

      await sock.sendMessage(
        m.chat,
        {
          react: {
            text: "❌",
            key: m.key
          }
        }
      )

      try {
        if (status?.key) {
          await sock.sendMessage(
            m.chat,
            {
              text:
                "❌ *Join Gagal*\n\n" +
                `> ${errorMessage}`,
              edit: status.key
            }
          )
        }
      } catch {
        await sock.sendMessage(
          m.chat,
          {
            text:
              "❌ *Join Gagal*\n\n" +
              `> ${errorMessage}`
          },
          {
            quoted: m
          }
        )
      }
    }
  }
}