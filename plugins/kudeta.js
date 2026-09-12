export default {
  command: [
    "kudeta",
    "demoteall"
  ],

  category: "Group",

  description:
    "Mencabut admin semua anggota kecuali bot dan owner bot",

  isGroup: true,
  isAdmin: true,
  isBotAdmin: true,

  async run(
    sock,
    m,
    {
      isOwner,
      groupMetadata
    }
  ) {
    try {
      if (!groupMetadata) {
        return m.reply(
          "❌ Gagal mengambil data grup."
        )
      }

      const botJid =
        sock.decodeJid(
          sock.user.id
        )

      const senderJid =
        sock.decodeJid(
          m.sender
        )

      const ownerList = (
        global.owner || []
      ).map(v =>
        String(v).replace(
          /[^0-9]/g,
          ""
        )
      )

      const keepAdmins =
        new Set([
          botJid
        ])

      if (isOwner) {
        keepAdmins.add(
          senderJid
        )
      }

      const targets =
        groupMetadata.participants
          .filter(p => {
            if (!p.admin) {
              return false
            }

            const jid =
              sock.decodeJid(
                p.id
              )

            if (jid === botJid) {
              return false
            }

            if (
              ownerList.includes(
                jid.replace(
                  /[^0-9]/g,
                  ""
                )
              )
            ) {
              return false
            }

            if (
              p.admin ===
              "superadmin"
            ) {
              return false
            }

            return !keepAdmins.has(
              jid
            )
          })
          .map(p =>
            sock.decodeJid(
              p.id
            )
          )

      if (!targets.length) {
        return m.reply(
          "✅ Tidak ada admin yang bisa dicabut."
        )
      }

      await m.reply(
        `⏳ Mencabut admin dari ${targets.length} anggota...`
      )

      await sock.groupParticipantsUpdate(
        m.chat,
        targets,
        "demote"
      )

      return m.reply(
`✅ *KUDETA SELESAI*

👤 Dicabut: ${targets.length} admin
🤖 Bot: Tetap admin
👑 Owner bot: Tetap admin
🏠 Creator grup: Tidak disentuh`
      )

    } catch (error) {
      console.error(
        "[UNADMIN ERROR]",
        error
      )

      return m.reply(
`❌ Gagal mencabut admin.

⚠️ ${error.message}`
      )
    }
  }
}