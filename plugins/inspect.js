export default {
  command: ["^", "inspect"],
  help: ["inspect"],
  tags: ["owner"],
  isOwner: true,

  async run(sock, m, { prefix }) {
    try {
      if (!m.quoted) {
        return m.reply("reply message")
      }

      await sock.sendMessage(
        m.chat,
        {
          react: {
            text: "⚡",
            key: m.key
          }
        }
      ).catch(() => {})

      const target = m.quoted
      const chatJid = m.chat
      const senderNum = (target.sender || "").split("@")[0]

      const rawQuotedMessage =
        m.message?.extendedTextMessage?.contextInfo?.quotedMessage

      let msgStructure =
        rawQuotedMessage ||
        target.message ||
        (target.fakeObj && target.fakeObj.message) ||
        target

      let realType =
        target.mtype || "unknown"

      if (
        msgStructure &&
        typeof msgStructure === "object"
      ) {
        let tempStructure = msgStructure

        if (
          tempStructure.viewOnceMessage &&
          tempStructure.viewOnceMessage.message
        ) {
          tempStructure =
            tempStructure.viewOnceMessage.message
        } else if (
          tempStructure.documentWithCaptionMessage &&
          tempStructure.documentWithCaptionMessage.message
        ) {
          tempStructure =
            tempStructure.documentWithCaptionMessage.message
        }

        const detectedKey =
          Object.keys(tempStructure)[0]

        if (
          detectedKey &&
          isNaN(detectedKey)
        ) {
          realType = detectedKey
        }
      }

      let finalCodeOutput = ""

      if (
        realType === "pollCreationMessageV3" &&
        msgStructure?.pollCreationMessageV3
      ) {
        const pollData =
          msgStructure.pollCreationMessageV3

        const optionsArray =
          pollData.options
            ? pollData.options.map(
                opt => opt.optionName
              )
            : []

        const sCount =
          pollData.selectableOptionsCount

        const finalSelectableCount =
          typeof sCount === "number"
            ? sCount
            : 1

        const pollTemplate = {
          poll: {
            name:
              pollData.name ||
              "Polling",
            values:
              optionsArray,
            selectableCount:
              finalSelectableCount
          }
        }

        finalCodeOutput =
`x sock.sendMessage(
  m.chat,
  ${JSON.stringify(
    pollTemplate,
    null,
    2
  )}
)`
      } else {
        let finalCodeToDisplay = ""

        if (
          msgStructure &&
          typeof msgStructure === "object"
        ) {
          finalCodeToDisplay =
            JSON.stringify(
              msgStructure,
              null,
              2
            )
        } else {
          const fallbackObj = {}

          fallbackObj[realType] =
            target.text ||
            msgStructure ||
            ""

          finalCodeToDisplay =
            JSON.stringify(
              fallbackObj,
              null,
              2
            )
        }

        finalCodeOutput =
`x sock.relayMessage(
  m.chat,
  ${finalCodeToDisplay},
  {}
)`
      }

      await sock.sendMessage(
        m.chat,
        {
          richMessage: {
            editrich: {
              title: "inspect",
              text:
                `inspectCode\n\n` +
                `• **Type** : ${realType}\n` +
                `• **Chat** : ${chatJid.substring(0, 7)}.....\n` +
                `• **Sender** : ${senderNum}`,
              code: {
                language: "javascript",
                code: finalCodeOutput
              },
              suggestions: [
                `Tipe: ${realType}`,
                "WhatsappCode"
              ],
              footer: "©Whatsapp"
            }
          }
        },
        {
          quoted: m
        }
      )
    } catch (err) {
      return m.reply(
        `❌ Gagal : ${err.message}`
      )
    }
  }
}