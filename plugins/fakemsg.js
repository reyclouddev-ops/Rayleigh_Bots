const delay = ms =>
  new Promise(resolve =>
    setTimeout(resolve, ms)
  )

export default {
  command: [
    "fakemsg",
    "fmsg",
    "fakedmsg"
  ],

  help: [
    "fakemsg"
  ],

  tags: [
    "owner"
  ],

  isOwner: true,

  async run(
    sock,
    m,
    {
      text,
      prefix,
      command
    }
  ) {
    if (!m.quoted) {
      return m.reply(
        "Reply msg"
      )
    }

    if (!text) {
      return m.reply(
`contoh:
${prefix}${command} mark`
      )
    }

    const stanzaId =
      m.quoted.id

    try {
      const temp =
        await sock.relayMessage(
          m.chat,
          {
            extendedTextMessage: {
              text: "",
              contextInfo: {
                isGroupStatus:
                  true
              }
            }
          },
          {}
        )

      const tempId =
        temp?.key?.id || temp

      const edited =
        await sock.relayMessage(
          m.chat,
          {
            protocolMessage: {
              key: {
                remoteJid:
                  m.chat,
                fromMe: true,
                id: tempId
              },
              type: 14,
              editedMessage: {
                extendedTextMessage: {
                  text,
                  contextInfo: {
                    isGroupStatus:
                      false
                  }
                }
              }
            }
          },
          {
            messageId:
              stanzaId
          }
        )

      const tempId2 =
        edited?.key?.id ||
        edited

      await delay(100)

      await Promise.allSettled([
        sock.sendMessage(
          m.chat,
          {
            delete: {
              remoteJid:
                m.chat,
              id: tempId,
              fromMe: true
            }
          }
        ),

        sock.sendMessage(
          m.chat,
          {
            delete: {
              remoteJid:
                m.chat,
              id: tempId2,
              fromMe: true
            }
          }
        )
      ])
    } catch (e) {
      console.error(
        "[fakemsg]",
        e
      )

      await m.reply(
        "❌ Error: " +
        (
          e?.message ||
          String(e)
        )
      )
    }
  }
}