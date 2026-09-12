const cooldowns = new Map()

const COOLDOWN = 5000

function isCooldown(chat) {
  const now = Date.now()
  const last = cooldowns.get(chat) || 0

  if (now - last < COOLDOWN) {
    return true
  }

  cooldowns.set(chat, now)

  setTimeout(() => {
    cooldowns.delete(chat)
  }, COOLDOWN)

  return false
}

export default {
  name: "Tag Group",

  command: [
    "taggroup",
    "tagall"
  ],

  category: "Group",

  description:
    "Mention seluruh anggota dengan nama grup",

  isGroup: true,

  async run(
    sock,
    m,
    {
      groupMetadata,
      participants
    }
  ) {
    try {
      if (isCooldown(m.chat)) {
        return
      }

      const metadata =
        groupMetadata ||
        await sock.groupMetadata(
          m.chat
        )

      if (!metadata) {
        return m.reply(
          "❌ Gagal mengambil metadata grup."
        )
      }

      const groupName =
        metadata.subject ||
        "Group"

      const memberList =
        participants ||
        metadata.participants ||
        []

      const mentionedJid = [
        ...new Set(
          memberList
            .map(member => {
              const jid =
                member?.id ||
                member?.jid

              if (!jid) {
                return null
              }

              return typeof sock.decodeJid ===
                "function"
                ? sock.decodeJid(jid)
                : jid
            })
            .filter(Boolean)
        )
      ]

      if (!mentionedJid.length) {
        return m.reply(
          "❌ Tidak ada member yang dapat di-mention."
        )
      }

      const groupJid = m.chat

      await sock.relayMessage(
        m.chat,
        {
          extendedTextMessage: {
            text: `@${groupJid}`,

            previewType: "NONE",

            contextInfo: {
              mentionedJid,

              groupMentions: [
                {
                  groupJid,
                  groupSubject:
                    groupName
                }
              ]
            },

            inviteLinkGroupTypeV2:
              "DEFAULT"
          }
        },
        {}
      )
    } catch (err) {
      console.error(
        "[TAGGROUP ERROR]",
        err
      )

      return m.reply(
`❌ *Gagal menjalankan taggroup!*

⚠️ ${String(
  err?.message ||
  "Terjadi kesalahan."
).slice(0, 300)}`
      )
    }
  }
}