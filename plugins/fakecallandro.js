import {
  createCanvas,
  loadImage,
  GlobalFonts
} from "@napi-rs/canvas"

import {
  writeFile,
  mkdir
} from "node:fs/promises"

import {
  existsSync,
  readFileSync
} from "node:fs"

import {
  join
} from "node:path"

import axios from "axios"

export default {
  name: "Fake Call Android",

  command: [
    "fakecall2",
    "fakecallandro",
    "fakecal"
  ],

  category: "Maker",

  description:
    "Membuat tampilan panggilan WhatsApp Android palsu",

  isOwner: false,

  async run(
    sock,
    m,
    {
      args,
      text,
      prefix,
      command
    }
  ) {
    const q = m.quoted || m
    const mime =
      (q.msg || q).mimetype || ""

    if (!mime.includes("image")) {
      return m.reply(
`❌ *Format salah!*

Silakan reply/balas foto yang mau dijadikan Foto Profil dengan format:
\`${prefix + command} Nama|Durasi\`

📌 *Contoh:*
\`${prefix + command} Sayangku | 01:32:04\``
      )
    }

    const payloadText =
      text || args.join(" ")

    if (
      !payloadText ||
      !payloadText.includes("|")
    ) {
      return m.reply(
`❌ *Format salah!*

Pastikan menggunakan pemisah tanda garis (\`|\`)

📌 *Contoh:*
\`${prefix + command} Sayangku | 01:32:04\``
      )
    }

    const [
      namaPayload,
      durasiPayload
    ] = payloadText.split("|")

    const txtNama =
      namaPayload?.trim()

    const txtDurasi =
      durasiPayload?.trim()

    if (!txtNama || !txtDurasi) {
      return m.reply(
        "❌ Nama dan Durasi tidak boleh kosong!"
      )
    }

    let statusMsg = null

    try {
      await sock.sendMessage(
        m.chat,
        {
          react: {
            text: "⏳",
            key: m.key
          }
        }
      )

      statusMsg =
        await sock.sendMessage(
          m.chat,
          {
            text:
              "⏳ *Memproses Canvas Fake Call Android...*"
          },
          {
            quoted: m
          }
        )

      const ASSETS_DIR = join(
        process.cwd(),
        "assets",
        "wacall_meme"
      )

      const FONTS_DIR = join(
        ASSETS_DIR,
        "fonts"
      )

      const BG_LOCAL = join(
        ASSETS_DIR,
        "template_call_new.png"
      )

      const TMP_DIR = join(
        process.cwd(),
        "tmp"
      )

      const BG_URL =
        "https://raw.githubusercontent.com/ryyntwx/allimagerin/refs/heads/main/3b1a98bd-2ebd-4035-a645-f42556300408.png"

      const APPLE_EMOJI_JSON_URL =
        "https://media.githubusercontent.com/media/Ditzzx-vibecoder/entahlah/main/emoji-apple.json"

      const APPLE_EMOJI_JSON_LOCAL =
        join(
          FONTS_DIR,
          "emoji-apple-image.json"
        )

      await mkdir(
        FONTS_DIR,
        {
          recursive: true
        }
      )

      await mkdir(
        TMP_DIR,
        {
          recursive: true
        }
      )

      const fontConfigs = [
        {
          url:
            "https://fonts.gstatic.com/s/roboto/v30/KFOlCnqEu92Fr1MmWUlfBBc4AMP6lQ.woff2",
          name:
            "Roboto-Bold.ttf",
          family:
            "RobotoWA"
        },
        {
          url:
            "https://fonts.gstatic.com/s/roboto/v30/KFOmCnqEu92Fr1Mu4mxKKTU1Kg.woff2",
          name:
            "Roboto-Regular.ttf",
          family:
            "RobotoWA"
        }
      ]

      for (const font of fontConfigs) {
        const fontPath =
          join(
            FONTS_DIR,
            font.name
          )

        if (!existsSync(fontPath)) {
          const response =
            await axios.get(
              font.url,
              {
                responseType:
                  "arraybuffer",
                headers: {
                  "User-Agent":
                    "Mozilla/5.0"
                }
              }
            )

          await writeFile(
            fontPath,
            Buffer.from(
              response.data
            )
          )
        }

        try {
          GlobalFonts.registerFromPath(
            fontPath,
            font.family
          )
        } catch {}
      }

      if (
        !existsSync(
          APPLE_EMOJI_JSON_LOCAL
        )
      ) {
        const emojiResponse =
          await axios.get(
            APPLE_EMOJI_JSON_URL,
            {
              responseType:
                "arraybuffer"
            }
          )

        await writeFile(
          APPLE_EMOJI_JSON_LOCAL,
          Buffer.from(
            emojiResponse.data
          )
        )
      }

      const appleEmojiMap =
        JSON.parse(
          readFileSync(
            APPLE_EMOJI_JSON_LOCAL,
            "utf-8"
          )
        )

      const emojiCache =
        new Map()

      if (!existsSync(BG_LOCAL)) {
        const response =
          await axios.get(
            BG_URL,
            {
              responseType:
                "arraybuffer",
              headers: {
                "User-Agent":
                  "Mozilla/5.0"
              }
            }
          )

        await writeFile(
          BG_LOCAL,
          Buffer.from(
            response.data
          )
        )
      }

      const ppBuffer =
        await q.download()

      const avImg =
        await loadImage(
          ppBuffer
        )

      const bgImg =
        await loadImage(
          BG_LOCAL
        )

      const canvas =
        createCanvas(
          bgImg.width,
          bgImg.height
        )

      const ctx =
        canvas.getContext("2d")

      ctx.drawImage(
        bgImg,
        0,
        0,
        canvas.width,
        canvas.height
      )

      const ppX =
        canvas.width / 2

      const ppY = 728
      const ppRadius = 220

      const namaY = 75
      const namaSize = 42

      const durasiY = 130
      const durasiSize = 30

      ctx.save()

      ctx.beginPath()

      ctx.arc(
        ppX,
        ppY,
        ppRadius,
        0,
        Math.PI * 2
      )

      ctx.closePath()
      ctx.clip()

      ctx.drawImage(
        avImg,
        ppX - ppRadius,
        ppY - ppRadius,
        ppRadius * 2,
        ppRadius * 2
      )

      ctx.restore()

      const EMOJI_DETECTOR =
        /(\p{Emoji_Presentation}|\p{Extended_Pictographic})/u

      function emojiToUnicode(
        emoji
      ) {
        return [...emoji]
          .map(char =>
            char
              .codePointAt(0)
              .toString(16)
              .padStart(4, "0")
          )
          .join("-")
      }

      async function getEmojiImage(
        emoji
      ) {
        if (
          emojiCache.has(
            emoji
          )
        ) {
          return emojiCache.get(
            emoji
          )
        }

        const base =
          emojiToUnicode(
            emoji
          )

        const variants = [
          base,
          base.replace(
            /-fe0f/gi,
            ""
          ),
          `${base.replace(
            /-fe0f/gi,
            ""
          )}-fe0f`,
          base.toUpperCase(),
          base
            .replace(
              /-fe0f/gi,
              ""
            )
            .toUpperCase(),
          base
            .replace(
              /-fe0f/gi,
              ""
            )
            .toUpperCase() +
            "-FE0F"
        ]

        let b64 = null

        for (
          const variant of variants
        ) {
          if (
            appleEmojiMap[
              variant
            ]
          ) {
            b64 =
              appleEmojiMap[
                variant
              ]

            break
          }
        }

        if (!b64) {
          return null
        }

        const img =
          await loadImage(
            Buffer.from(
              b64,
              "base64"
            )
          )

        emojiCache.set(
          emoji,
          img
        )

        return img
      }

      function parseTextAndEmojis(
        textStr
      ) {
        const tokens = []
        const chars = [
          ...textStr
        ]

        let currentText = ""

        for (
          let i = 0;
          i < chars.length;
          i++
        ) {
          if (
            EMOJI_DETECTOR.test(
              chars[i]
            )
          ) {
            if (currentText) {
              tokens.push({
                type: "text",
                value:
                  currentText
              })

              currentText = ""
            }

            let emojiVal =
              chars[i]

            if (
              chars[i + 1] ===
              "\uFE0F"
            ) {
              emojiVal +=
                chars[i + 1]

              i++
            }

            tokens.push({
              type: "emoji",
              value:
                emojiVal
            })
          } else {
            currentText +=
              chars[i]
          }
        }

        if (currentText) {
          tokens.push({
            type: "text",
            value:
              currentText
          })
        }

        return tokens
      }

      function measureTextCustom(
        context,
        tokens,
        fontSize
      ) {
        let totalWidth = 0

        for (
          const token of tokens
        ) {
          if (
            token.type ===
            "emoji"
          ) {
            totalWidth +=
              fontSize * 1.05
          } else {
            totalWidth +=
              context.measureText(
                token.value
              ).width
          }
        }

        return totalWidth
      }

      async function drawTextWithEmojisCenter(
        context,
        textStr,
        yPos,
        fontSize,
        fontString
      ) {
        context.font =
          fontString

        context.textBaseline =
          "top"

        const tokens =
          parseTextAndEmojis(
            textStr
          )

        const totalWidth =
          measureTextCustom(
            context,
            tokens,
            fontSize
          )

        let currentX =
          canvas.width / 2 -
          totalWidth / 2

        for (
          const token of tokens
        ) {
          if (
            token.type ===
            "emoji"
          ) {
            const emojiSize =
              fontSize * 1.05

            const img =
              await getEmojiImage(
                token.value
              )

            if (img) {
              context.drawImage(
                img,
                currentX,
                yPos +
                  (fontSize -
                    emojiSize) /
                    2,
                emojiSize,
                emojiSize
              )
            } else {
              context.fillText(
                token.value,
                currentX,
                yPos
              )
            }

            currentX +=
              emojiSize
          } else {
            context.fillText(
              token.value,
              currentX,
              yPos
            )

            currentX +=
              context.measureText(
                token.value
              ).width
          }
        }
      }

      ctx.fillStyle =
        "#FFFFFF"

      await drawTextWithEmojisCenter(
        ctx,
        txtNama,
        namaY,
        namaSize,
        `700 ${namaSize}px RobotoWA, sans-serif`
      )

      ctx.fillStyle =
        "#AEBAC1"

      await drawTextWithEmojisCenter(
        ctx,
        txtDurasi,
        durasiY,
        durasiSize,
        `400 ${durasiSize}px RobotoWA, sans-serif`
      )

      const outBuffer =
        await canvas.encode("png")

      await sock.sendMessage(
        m.chat,
        {
          react: {
            text: "📞",
            key: m.key
          }
        }
      )

      await sock.sendMessage(
        m.chat,
        {
          image: outBuffer,
          caption:
`📞 *FAKE CALL ANDROID*

👤 *Nama:* ${txtNama}
⏱️ *Durasi:* ${txtDurasi}`
        },
        {
          quoted: m
        }
      )

      if (statusMsg?.key) {
        try {
          await sock.sendMessage(
            m.chat,
            {
              delete:
                statusMsg.key
            }
          )
        } catch {}
      }
    } catch (e) {
      console.error(
        "[FAKE CALL ERROR]",
        e
      )

      if (statusMsg?.key) {
        try {
          await sock.sendMessage(
            m.chat,
            {
              react: {
                text: "❌",
                key: m.key
              }
            }
          )

          await sock.sendMessage(
            m.chat,
            {
              text:
`❌ *Gagal membuat Fake Call*

⚠️ Error: ${e.message}`,
              edit:
                statusMsg.key
            }
          )

          return
        } catch {}
      }

      return m.reply(
`❌ *Gagal membuat Fake Call*

⚠️ Error: ${e.message}`
      )
    }
  }
}