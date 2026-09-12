import {
  proto,
  generateWAMessageContent,
  generateWAMessageFromContent
} from "@whiskeysockets/baileys"

import crypto from "node:crypto"
import fs from "node:fs"
import path from "node:path"
import { execFile } from "node:child_process"
import { fileURLToPath } from "node:url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

async function sendMenuAudio(sock, m) {
  const audioDir = path.join(
    __dirname,
    "./image/sound.mp3"
  )

  if (!fs.existsSync(audioDir)) {
    console.log("[MENU AUDIO] Folder audio tidak ditemukan")
    return
  }

  const files = fs.readdirSync(audioDir)

  const audioFile =
    files.find(file =>
      /^sound\.(mp3|wav|m4a|aac|ogg|opus|flac)$/i.test(file)
    ) ||
    files.find(file =>
      /\.(mp3|wav|m4a|aac|ogg|opus|flac)$/i.test(file)
    )

  if (!audioFile) {
    console.log("[MENU AUDIO] File audio tidak ditemukan")
    return
  }

  const inputAudioPath = path.join(
    audioDir,
    audioFile
  )

  if (/\.opus$/i.test(audioFile)) {
    await sock.sendMessage(
      m.chat,
      {
        audio: fs.readFileSync(inputAudioPath),
        mimetype: "audio/ogg; codecs=opus",
        ptt: true
      },
      {
        quoted: m
      }
    )

    return
  }

  const outputAudioPath = path.join(
    audioDir,
    `temp_menu_${Date.now()}_${crypto.randomUUID()}.opus`
  )

  try {
    await new Promise((resolve, reject) => {
      execFile(
        "ffmpeg",
        [
          "-y",
          "-i",
          inputAudioPath,
          "-vn",
          "-c:a",
          "libopus",
          "-b:a",
          "64k",
          "-ac",
          "1",
          "-ar",
          "48000",
          outputAudioPath
        ],
        error => {
          if (error) {
            return reject(error)
          }

          resolve()
        }
      )
    })

    if (!fs.existsSync(outputAudioPath)) {
      throw new Error(
        "Hasil convert audio tidak ditemukan"
      )
    }

    await sock.sendMessage(
      m.chat,
      {
        audio: fs.readFileSync(
          outputAudioPath
        ),
        mimetype: "audio/ogg; codecs=opus",
        ptt: true
      },
      {
        quoted: m
      }
    )

    console.log(
      `[MENU AUDIO] Berhasil convert: ${audioFile} → OPUS`
    )

  } catch (error) {
    console.error(
      "[MENU AUDIO] Gagal convert audio:",
      error.message
    )

    try {
      await sock.sendMessage(
        m.chat,
        {
          audio: fs.readFileSync(
            inputAudioPath
          ),
          mimetype: "audio/mpeg",
          ptt: false
        },
        {
          quoted: m
        }
      )

    } catch (sendError) {
      console.error(
        "[MENU AUDIO] Gagal mengirim audio:",
        sendError.message
      )
    }

  } finally {
    if (
      fs.existsSync(
        outputAudioPath
      )
    ) {
      try {
        fs.unlinkSync(
          outputAudioPath
        )
      } catch {}
    }
  }
}

export default {
  name: "Menu",

  command: [
    "menu",
    "help"
  ],

  category: "Main",

  async run(
    sock,
    m,
    {
      text,
      command,
      prefix
    }
  ) {
    try {
      const bannerUrl =
        "https://api.legionteknologi.my.id/r/fo5tbp.jpeg"

      const videoUrl =
        "https://files.catbox.moe/nn24zj.mp4"

      const senderJid =
        m.sender ||
        m.key.remoteJid

      const senderNumber =
        senderJid
          ? senderJid.split("@")[0]
          : ""

      const name =
        m.pushName ||
        m.pushname ||
        "User"

      const mode =
        sock.public
          ? "Public"
          : "Self"

      const timestamp =
        m.messageTimestamp
          ? Number(
              m.messageTimestamp
            ) * 1000
          : Date.now()

      const ping =
        Date.now() -
        timestamp

      const uptimeRuntime =
        process.uptime()

      const days =
        Math.floor(
          uptimeRuntime / 86400
        )

      const hours =
        Math.floor(
          (uptimeRuntime % 86400) /
          3600
        )

      const minutes =
        Math.floor(
          (uptimeRuntime % 3600) /
          60
        )

      const seconds =
        Math.floor(
          uptimeRuntime % 60
        )

      const emojis = [
        "🔥",
        "⭐",
        "🚀",
        "✨",
        "🎉",
        "👑",
        "💖",
        "⚡",
        "🤖",
        "📌"
      ]

      const randomEmoji =
        emojis[
          Math.floor(
            Math.random() *
            emojis.length
          )
        ]

      await sock.sendMessage(
        m.chat,
        {
          react: {
            text: randomEmoji,
            key: m.key
          }
        }
      )

      const mediaMessageContent =
        await generateWAMessageContent(
          {
            video: {
              url: videoUrl
            },
            gifPlayback: true
          },
          {
            upload:
              sock.waUploadToServer
          }
        )

      const IM =
        proto.Message.InteractiveMessage

      if (!IM?.BloksWidget) {
        throw new Error(
          "BloksWidget tidak tersedia di WAProto versi ini"
        )
      }

      const uuid =
        crypto.randomUUID()

      const usedPrefix =
        prefix === "multi" ||
        prefix === "none" ||
        !prefix
          ? "."
          : prefix

      const tekst =
`𝐂𝐫𝐞𝐚𝐭𝐨𝐫 : ${
  global.nu ||
  "𝘙𝘦𝘺𝘊𝘭𝘰𝘶𝘥𝘚𝘏𝘗"
}
𝐒𝐭𝐚𝐭𝐮𝐬 : ${mode}
𝐏𝐢𝐧𝐠 : ${Math.floor(ping)} ms
𝐑𝐮𝐧𝐭𝐢𝐦𝐞 : ${days}D ${hours}H ${minutes}M ${seconds}S

Name : ${name}
Number : ${senderNumber}
`

      const widgetData = {
        version: "v0.9",

        createSurface: {
          surfaceId:
            `starcore-widget=${uuid}`,

          catalogId:
            "https://a2ui.org/specification/v0_9/catalogs/basic/catalog.json",

          components: [
            {
              id: "root",
              component: "Column",
              children: [
                "header_image",
                "information",
                "button2"
              ]
            },

            {
              id: "header_image",
              component: "Image",
              url: bannerUrl,
              variant: "header",
              fit: "cover"
            },

            {
              id: "information",
              component: "Card",
              child: "information_card"
            },

            {
              id: "information_card",
              component: "Column",
              children: [
                "title_text",
                "Divider8",
                "infor_text"
              ]
            },

            {
              id: "title_text",
              component: "Text",
              text: "𝘙𝘢𝘺𝘭𝘦𝘪𝘨𝘩𝘉𝘰𝘵𝘴",
              variant: "h3"
            },

            {
              id: "Divider8",
              component: "Divider"
            },

            {
              id: "infor_text",
              component: "Text",
              text: tekst,
              variant: "body"
            },

            {
              id: "send",
              component: "Text",
              text: "Owner WA"
            },

            {
              id: "button2",
              component: "Button",
              child: "send",
              variant: "borderless",

              action: {
                call: "openUrl",

                args: {
                  url:
                    "https://wa.me/6281260512743"
                }
              }
            }
          ]
        }
      }

      const widget =
        IM.BloksWidget.create({
          uuid,
          type: "im_a2ui",
          data:
            JSON.stringify(
              widgetData
            )
        })

      const prepMsg =
        generateWAMessageFromContent(
          m.chat,
          {
            interactiveMessage:
              IM.create({
                header: {
                  hasMediaAttachment: true,

                  videoMessage:
                    mediaMessageContent.videoMessage
                },

                body: {
                  text: "\u200b"
                },

                footer: {
                  text:
                    "𝘙𝘦𝘺𝘊𝘭𝘰𝘶𝘥𝘚𝘏𝘗"
                },

                nativeFlowMessage: {
                  messageParamsJson:
                    JSON.stringify({
                      limited_time_offer: {
                        text:
                          "𝘙𝘢𝘺𝘭𝘪𝘦𝘨𝘩𝘉𝘰𝘵𝘴",

                        url:
                          "https://t.me/ReyCloudShop",

                        copy_code:
                          "WaBot¿Support",

                        expiration_time:
                          Date.now() +
                          86400000
                      },

                      bottom_sheet: {
                        in_thread_buttons_limit: 2,

                        divider_indices: [
                          1,
                          2,
                          3,
                          4,
                          5,
                          999
                        ],

                        list_title:
                          "WaBot¿ Menu",

                        icon:
                          "REVIEW",

                        button_title:
                          "WaBot¿ Menu"
                      }
                    }),

                  buttons: [
                    {
                      name:
                        "single_select",

                      buttonParamsJson:
                        JSON.stringify({
                          title:
                            "Click",

                          icon:
                            "DOCUMENT",

                          sections: [
                            {
                              title:
                                "𝘙𝘢𝘺𝘭𝘪𝘦𝘨𝘩𝘉𝘰𝘵𝘴 × 𝘙𝘦𝘺𝘊𝘭𝘰𝘶𝘥𝘚𝘏𝘗",

                              highlight_label:
                                "Rekomendasi",

                              rows: [
                                {
                                  header:
                                    "𝘈𝘭𝘭 𝘔𝘦𝘯𝘶",

                                  title:
                                    "𝘓𝘪𝘩𝘢𝘵 𝘚𝘦𝘮𝘶𝘢 𝘔𝘦𝘯𝘶 𝘚𝘦𝘬𝘢𝘭𝘪 𝘊𝘭𝘪𝘤𝐤!",

                                  id:
                                    `${usedPrefix}allmenu`
                                },

                                {
                                  header:
                                    "𝘔𝘢𝘬𝘦𝘳𝘔𝘦𝘯𝘶",

                                  title:
                                    "𝘍𝘪𝘵𝘶𝘳 𝘔𝘢𝘬𝘦𝘳 𝘓𝘢𝘪𝘯𝘯𝘺𝘢",

                                  id:
                                    `${usedPrefix}makermenu`
                                },

                                {
                                  header:
                                    "𝘖𝘸𝘯𝘦𝘳 𝘔𝘦𝘯𝘶",

                                  title:
                                    "𝘍𝘪𝘵𝘶𝘳 𝘒husus 𝘖𝘸𝘯𝘦𝘳 𝘉𝘰𝘵",

                                  id:
                                    `${usedPrefix}ownermenu`
                                },

                                {
                                  header:
                                    "𝐅𝐮𝐧 𝐌𝐞𝐧𝐮",

                                  title:
                                    "𝘍𝘪𝘵𝘶𝘳 𝘗ermainan & 𝘍𝘶𝘯",

                                  id:
                                    `${usedPrefix}funmenu`
                                }
                              ]
                            }
                          ]
                        })
                    },

                    {
                      name:
                        "cta_url",

                      buttonParamsJson:
                        JSON.stringify({
                          display_text:
                            "Owner",

                          url:
                            "https://wa.me/6281260512743",

                          merchant_url:
                            "https://wa.me/6281260512743"
                        })
                    }
                  ],

                  messageVersion: 1
                },

                bloksWidget:
                  widget
              })
          },

          {
            quoted: m
          }
        )

      await sock.relayMessage(
        m.chat,
        prepMsg.message,
        {
          messageId:
            prepMsg.key.id
        }
      )

      await sendMenuAudio(
        sock,
        m
      )

    } catch (error) {
      console.error(
        "[MENU ERROR]",
        error
      )
    }
  }
}