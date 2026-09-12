import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const configPath = path.join(
  __dirname,
  "../config.json"
)

function getConfig() {
  try {
    if (fs.existsSync(configPath)) {
      return JSON.parse(
        fs.readFileSync(
          configPath,
          "utf8"
        )
      )
    }
  } catch {}

  return {
    public: true
  }
}

function saveConfig(data) {
  fs.writeFileSync(
    configPath,
    JSON.stringify(
      data,
      null,
      2
    )
  )
}

export default {
  name: "Mode Selector Button",

  command: [
    "mode",
    "setmode",
    "public",
    "private",
    "self"
  ],

  category: "Owner",

  description:
    "Mengubah mode akses bot via Interactive Message Button atau Command Langsung",

  isOwner: true,

  async run(
    sock,
    m,
    {
      command,
      prefix
    }
  ) {
    const config =
      getConfig()

    if (
      command === "public"
    ) {
      sock.public = true

      config.public = true

      saveConfig(config)

      await sock.sendMessage(
        m.chat,
        {
          react: {
            text: "🌐",
            key: m.key
          }
        }
      )

      return m.reply(
`🌐 *MODE PUBLIC AKTIF*

Sekarang semua pengguna dapat menggunakan bot.`
      )
    }

    if (
      command === "private" ||
      command === "self"
    ) {
      sock.public = false

      config.public = false

      saveConfig(config)

      await sock.sendMessage(
        m.chat,
        {
          react: {
            text: "🔒",
            key: m.key
          }
        }
      )

      return m.reply(
`🔒 *MODE PRIVATE AKTIF*

Sekarang hanya Owner yang dapat menggunakan bot.`
      )
    }

    const currentMode =
      sock.public
        ? "🌐 PUBLIC"
        : "🔒 PRIVATE"

    const caption =
`⚙️ *PENGATURAN MODE BOT*

Status Mode Saat Ini: *${currentMode}*

Silakan pilih mode akses bot melalui tombol di bawah ini:`

    try {
      await sock.sendMessage(
        m.chat,
        {
          text: caption,

          interactiveMessage: {
            body: {
              text: caption
            },

            footer: {
              text:
                "ReyCloud Bot Mode Switcher"
            },

            nativeFlowMessage: {
              buttons: [
                {
                  name:
                    "quick_reply",

                  buttonParamsJson:
                    JSON.stringify({
                      display_text:
                        "🌐 PUBLIC",

                      id:
                        `${prefix}public`
                    })
                },

                {
                  name:
                    "quick_reply",

                  buttonParamsJson:
                    JSON.stringify({
                      display_text:
                        "🔒 PRIVATE",

                      id:
                        `${prefix}private`
                    })
                }
              ]
            }
          }
        },
        {
          quoted: m
        }
      )

    } catch (err) {
      console.error(
        "Interactive button error, fallback to text:",
        err
      )

      return m.reply(
`${caption}

Ketik *${prefix}public* atau *${prefix}private* untuk mengubah mode.`
      )
    }
  }
}