const sleep = ms =>
  new Promise(resolve => setTimeout(resolve, ms))

export default {
  name: "Restart",
  command: ["restart", "reboot"],
  category: "Owner",
  description: "Merestart bot WhatsApp",
  isOwner: true,

  async run(sock, m) {
    let statusMessage = null

    try {
      statusMessage = await sock.sendMessage(
        m.chat,
        {
          text:
`╭━━〔 🔄 RESTART SYSTEM 〕━━╮

⏳ Status: Mempersiapkan restart...

[░░░░░░░░░░░░] 0%

╰━━━━━━━━━━━━━━━━━━━━╯`
        },
        {
          quoted: m
        }
      )

      const editProgress = async (progress, text) => {
        if (!statusMessage?.key?.id) return

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

          const totalBars = 12
          const filled = Math.round(
            (progress / 100) * totalBars
          )

          const bar =
            "█".repeat(filled) +
            "░".repeat(totalBars - filled)

          await sock.relayMessage(
            m.chat,
            {
              protocolMessage: {
                key: editKey,
                type: 14,
                editedMessage: {
                  conversation:
`╭━━〔 🔄 RESTART SYSTEM 〕━━╮

${text}

[${bar}] ${progress}%

╰━━━━━━━━━━━━━━━━━━━━╯`
                }
              }
            },
            {}
          )

          return true
        } catch (error) {
          console.log(
            "[RESTART EDIT ERROR]",
            error?.message || error
          )

          try {
            await sock.sendMessage(
              m.chat,
              {
                text:
`╭━━〔 🔄 RESTART SYSTEM 〕━━╮

${text}

[${bar}] ${progress}%

╰━━━━━━━━━━━━━━━━━━━━╯`,
                edit: statusMessage.key
              }
            )

            return true
          } catch {
            return false
          }
        }
      }

      await editProgress(
        30,
        "🔄 Status: Menutup koneksi..."
      )

      await sleep(1000)

      await editProgress(
        70,
        "🔄 Status: Memuat ulang sistem..."
      )

      await sleep(1000)

      await editProgress(
        100,
        "✅ Status: Bot berhasil direstart!"
      )

      await sleep(1000)

      console.log(
        "[ RESTART ] Bot sedang direstart oleh owner..."
      )

      process.exit(0)

    } catch (error) {
      console.error(
        "[ RESTART ERROR ]",
        error
      )

      const errorText =
`❌ *Restart gagal!*

⚠️ Error:
${error?.message || "Unknown error"}`

      if (statusMessage?.key) {
        try {
          const errKey = {
            remoteJid: m.chat,
            id: statusMessage.key.id,
            fromMe: true
          }

          if (statusMessage.key.participant) {
            errKey.participant =
              statusMessage.key.participant
          }

          await sock.relayMessage(
            m.chat,
            {
              protocolMessage: {
                key: errKey,
                type: 14,
                editedMessage: {
                  conversation: errorText
                }
              }
            },
            {}
          )

          return
        } catch {}
      }

      return m.reply(errorText)
    }
  }
}