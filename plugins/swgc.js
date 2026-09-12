import {
  downloadContentFromMessage,
  prepareWAMessageMedia,
  generateWAMessageFromContent
} from "@whiskeysockets/baileys"

import crypto from "node:crypto"

export default {
  name: "Status Grup",
  command: ["swgb", "swgc", "swgch"],
  help: ["swgb", "swgc", "swgcb"],
  tags: ["owner"],
  category: "Owner",
  isOwner: true,

  async run(
    sock,
    m,
    {
      text,
      prefix,
      command,
      isOwner
    }
  ) {
    const Reply = txt =>
      m.reply(txt)

    const reaction = async emoji => {
      try {
        await sock.sendMessage(
          m.chat,
          {
            react: {
              text: emoji,
              key: m.key
            }
          }
        )
      } catch {}
    }

    if (!isOwner) {
      return Reply(
        "❌ Khusus owner!"
      )
    }

    if (!m.isGroup) {
      return Reply(
        "❌ Fitur ini hanya dapat digunakan di dalam grup!"
      )
    }

    const q =
      m.quoted || null

    const botJid =
      sock.user?.id
        ? `${sock.user.id.split(":")[0]}@s.whatsapp.net`
        : sock.user?.jid

    const mime =
      q
        ? ((q.msg || q).mimetype || "")
        : ""

    const mtype =
      q
        ? (q.mtype || "")
        : ""

    const isImage =
      /image/i.test(mime) ||
      mtype === "imageMessage"

    const isVideo =
      /video/i.test(mime) ||
      mtype === "videoMessage"

    const isAudio =
      /audio/i.test(mime) ||
      mtype === "audioMessage"

    const isMedia =
      isImage ||
      isVideo ||
      isAudio

    if (!isMedia) {
      const statusText =
        text?.trim() ||
        q?.text ||
        ""

      if (!statusText) {
        return Reply(
`❌ Masukkan teks atau reply ke foto/video/audio!

*Contoh:*
${prefix}${command} Halo warga grup!`
        )
      }

      try {
        await reaction("⏳")

        const messageSecret =
          crypto.randomBytes(32)

        const waMsg =
          generateWAMessageFromContent(
            m.chat,
            {
              messageContextInfo: {
                messageSecret
              },
              groupStatusMessageV2: {
                message: {
                  extendedTextMessage: {
                    text: statusText,
                    font: 6,
                    textArgb: 0xffffffff,
                    backgroundArgb: 0xff505050,
                    contextInfo: {
                      forwardingScore: 0,
                      featureEligibilities: {
                        canBeReshared: true,
                        canReceiveMultiReact: true
                      },
                      statusSourceType: "TEXT",
                      statusAttributions: [
                        {
                          type: 10
                        }
                      ],
                      statusAudienceMetadata: {
                        audienceType:
                          "CLOSE_FRIENDS"
                      }
                    }
                  }
                }
              }
            },
            {
              userJid: botJid
            }
          )

        await sock.relayMessage(
          m.chat,
          waMsg.message,
          {
            messageId:
              waMsg.key.id
          }
        )

        await reaction("✅")

        return Reply(
`✅ Status grup teks berhasil di-upload!

*Isi Teks:*
${statusText}`
        )
      } catch (err) {
        console.error(
          "[ERROR SWGB TEXT]",
          err
        )

        await reaction("❌")

        return Reply(
`❌ Gagal upload status teks!

⚠️ ${err?.message || "Error internal"}`
        )
      }
    }

    const mediaType =
      isImage
        ? "image"
        : isVideo
          ? "video"
          : "audio"

    let mediaMessage =
      q.msg || q

    if (q.message) {
      let rawMsg =
        q.message

      if (
        rawMsg.viewOnceMessage
          ?.message
      ) {
        rawMsg =
          rawMsg.viewOnceMessage
            .message
      }

      if (
        rawMsg.viewOnceMessageV2
          ?.message
      ) {
        rawMsg =
          rawMsg.viewOnceMessageV2
            .message
      }

      if (
        rawMsg.ephemeralMessage
          ?.message
      ) {
        rawMsg =
          rawMsg.ephemeralMessage
            .message
      }

      if (
        mediaType === "image" &&
        rawMsg.imageMessage
      ) {
        mediaMessage =
          rawMsg.imageMessage
      }

      if (
        mediaType === "video" &&
        rawMsg.videoMessage
      ) {
        mediaMessage =
          rawMsg.videoMessage
      }

      if (
        mediaType === "audio" &&
        rawMsg.audioMessage
      ) {
        mediaMessage =
          rawMsg.audioMessage
      }
    }

    try {
      await reaction("⏳")

      let buffer

      if (
        typeof q.download ===
        "function"
      ) {
        buffer =
          await q.download()
      } else {
        const stream =
          await downloadContentFromMessage(
            mediaMessage,
            mediaType
          )

        const buffers = []

        for await (
          const chunk of stream
        ) {
          buffers.push(chunk)
        }

        buffer =
          Buffer.concat(buffers)
      }

      if (
        !buffer ||
        !buffer.length
      ) {
        throw new Error(
          "Gagal mengunduh media dari pesan"
        )
      }

      let mediaContent = {}

      if (
        mediaType === "image"
      ) {
        mediaContent = {
          image: buffer
        }
      }

      if (
        mediaType === "video"
      ) {
        mediaContent = {
          video: buffer,
          mimetype: "video/mp4"
        }
      }

      if (
        mediaType === "audio"
      ) {
        mediaContent = {
          audio: buffer,
          mimetype: "audio/mp4"
        }
      }

      const prepared =
        await prepareWAMessageMedia(
          mediaContent,
          {
            upload:
              sock.waUploadToServer
          }
        )

      let userCaption =
        text?.trim() || ""

      if (
        userCaption.includes("|")
      ) {
        userCaption =
          userCaption
            .split("|")
            .slice(1)
            .join("|")
            .trim()
      }

      const finalCaption =
        userCaption ||
        mediaMessage.caption ||
        q.text ||
        ""

      let messagePayload

      const contextInfo = {
        forwardingScore: 0,
        featureEligibilities: {
          canBeReshared: true,
          canReceiveMultiReact: true
        },
        statusAttributions: [
          {
            type: 10
          }
        ],
        statusAudienceMetadata: {
          audienceType:
            "CLOSE_FRIENDS"
        }
      }

      if (
        mediaType === "image"
      ) {
        messagePayload = {
          imageMessage: {
            ...prepared.imageMessage,
            caption:
              finalCaption,
            contextInfo: {
              ...contextInfo,
              statusSourceType:
                "IMAGE"
            }
          }
        }
      }

      if (
        mediaType === "video"
      ) {
        messagePayload = {
          videoMessage: {
            ...prepared.videoMessage,
            caption:
              finalCaption,
            mimetype:
              "video/mp4",
            contextInfo: {
              ...contextInfo,
              statusSourceType:
                "VIDEO"
            }
          }
        }
      }

      if (
        mediaType === "audio"
      ) {
        messagePayload = {
          audioMessage: {
            ...prepared.audioMessage,
            mimetype:
              "audio/mp4",
            ptt: false,
            contextInfo: {
              ...contextInfo,
              statusSourceType:
                "AUDIO"
            }
          }
        }
      }

      if (!messagePayload) {
        throw new Error(
          "Payload media tidak valid."
        )
      }

      const messageSecret =
        crypto.randomBytes(32)

      const waMsg =
        generateWAMessageFromContent(
          m.chat,
          {
            messageContextInfo: {
              messageSecret
            },
            groupStatusMessageV2: {
              message:
                messagePayload
            }
          },
          {
            userJid: botJid
          }
        )

      await sock.relayMessage(
        m.chat,
        waMsg.message,
        {
          messageId:
            waMsg.key.id
        }
      )

      await reaction("✅")
    } catch (err) {
      console.error(
        "[ERROR SWGB MEDIA]",
        err
      )

      await reaction("❌")

      return Reply(
`❌ Gagal upload media!

⚠️ ${err?.message || "Error internal"}`
      )
    }
  }
}