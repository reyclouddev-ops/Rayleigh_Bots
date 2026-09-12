import fs from "fs"
import path from "path"

const cooldowns = new Map()

const MENU_COOLDOWN = 5000
const ACTION_COOLDOWN = 3000

const sleep = ms =>
  new Promise(resolve =>
    setTimeout(resolve, ms)
  )

function isCooldown(
  chat,
  type = "menu"
) {
  const now = Date.now()

  const duration =
    type === "action"
      ? ACTION_COOLDOWN
      : MENU_COOLDOWN

  const key =
    `${chat}:${type}`

  const last =
    cooldowns.get(key) || 0

  if (
    now - last <
    duration
  ) {
    return true
  }

  cooldowns.set(
    key,
    now
  )

  setTimeout(() => {
    cooldowns.delete(key)
  }, duration)

  return false
}

async function safeReact(
  sock,
  m,
  emoji
) {
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
  } catch (err) {
    console.log(
      "[GROUP REACT ERROR]",
      err.message
    )
  }
}

function getAction(
  command,
  args
) {
  const cmd =
    String(
      command || ""
    )
      .trim()
      .toLowerCase()

  const arg =
    String(
      args?.[0] || ""
    )
      .trim()
      .toLowerCase()

  if (
    cmd === "open" ||
    cmd === "buka" ||
    arg === "open" ||
    arg === "buka"
  ) {
    return "open"
  }

  if (
    cmd === "close" ||
    cmd === "tutup" ||
    arg === "close" ||
    arg === "tutup"
  ) {
    return "close"
  }

  return null
}

export default {
  name: "Group Control Button",

  command: [
    "group",
    "gc",
    "grouplink",
    "openclose",
    "open",
    "close",
    "buka",
    "tutup"
  ],

  category: "Group",

  description:
    "Mengatur buka/tutup grup dengan command dan tombol interaktif",

  isGroup: true,

  async run(
    sock,
    m,
    {
      args,
      command,
      groupMetadata,
      isOwner,
      participants
    }
  ) {
    try {
      if (
        isCooldown(
          m.chat,
          "global"
        )
      ) {
        return
      }

      const senderJid =
        sock.decodeJid(
          m.sender
        )

      const groupAdmins =
        (
          participants || []
        )
          .filter(
            v => v.admin
          )
          .map(v =>
            sock.decodeJid(
              v.id
            )
          )

      const isAdmin =
        groupAdmins.includes(
          senderJid
        ) || isOwner

      if (!isAdmin) {
        await safeReact(
          sock,
          m,
          "❌"
        )

        await sleep(1000)

        return m.reply(
          "❌ *Fitur ini khusus Admin Group!*"
        )
      }

      const action =
        getAction(
          command,
          args
        )

      if (action) {
        if (
          isCooldown(
            m.chat,
            "action"
          )
        ) {
          return
        }

        if (
          action === "open"
        ) {
          await safeReact(
            sock,
            m,
            "🔓"
          )

          await sleep(1200)

          await sock.groupSettingUpdate(
            m.chat,
            "not_announcement"
          )

          await sleep(1500)

          return m.reply(
`╭━━〔 🔓 GROUP DIBUKA 〕━━╮

✅ Sekarang semua anggota
dapat mengirim pesan.

╰━━━━━━━━━━━━━━━━━━━━╯`
          )
        }

        if (
          action === "close"
        ) {
          await safeReact(
            sock,
            m,
            "🔒"
          )

          await sleep(1200)

          await sock.groupSettingUpdate(
            m.chat,
            "announcement"
          )

          await sleep(1500)

          return m.reply(
`╭━━〔 🔒 GROUP DITUTUP 〕━━╮

✅ Sekarang hanya admin
yang dapat mengirim pesan.

╰━━━━━━━━━━━━━━━━━━━━╯`
          )
        }
      }

      await safeReact(
        sock,
        m,
        "⚙️"
      )

      await sleep(1800)

      let thumbnail

      const thumbnailPath =
        path.join(
          process.cwd(),
          "image",
          "menu.png"
        )

      if (
        fs.existsSync(
          thumbnailPath
        )
      ) {
        thumbnail =
          fs.readFileSync(
            thumbnailPath
          )
      }

      const groupName =
        groupMetadata?.subject ||
        "Group Chat"

      const isAnnounce =
        groupMetadata?.announce ||
        false

      const currentStatus =
        isAnnounce
          ? "🔒 DITUTUP (Admin Only)"
          : "🔓 DIBUKA (Semua Anggota)"

      const sections = [
        {
          title:
            "⚙️ PENGATURAN GRUP",

          rows: [
            {
              header: "",

              title:
                "🔓 Buka Grup",

              description:
                "Izinkan semua anggota mengirim pesan",

              id: ".open"
            },

            {
              header: "",

              title:
                "🔒 Tutup Grup",

              description:
                "Batasi pengiriman pesan hanya untuk admin",

              id: ".close"
            }
          ]
        }
      ]

      const text =
`Haloo 👋 ${m.pushName || "Kak"}

╭━━〔 GROUP SETTING 〕━━╮
│ 🏢 Group : ${groupName}
│ 📊 Status : ${currentStatus}
│ ⚙️ Type : ESM Plugin
╰━━━━━━━━━━━━━━━━━━━━╯

Silakan atur status grup
menggunakan tombol di bawah.`

      await sock.sendMessage(
        m.chat,
        {
          buttonsMessage: {
            locationMessage: {
              degreesLatitude: 0,
              degreesLongitude: 0,
              name: "ReyCloud",
              address:
                "Indonesia-Batam",
              jpegThumbnail:
                thumbnail
            },

            contentText:
              text,

            footerText:
              "© ReyCloud",

            buttons: [
              {
                buttonId:
                  "group_menu",

                buttonText: {
                  displayText:
                    "🛠️ ATUR GRUP"
                },

                type: 1,

                nativeFlowInfo: {
                  name:
                    "single_select",

                  paramsJson:
                    JSON.stringify({
                      title:
                        "📂 Pilih Aksi Grup",

                      sections
                    })
                }
              }
            ],

            headerType: 6,

            viewOnce: true
          }
        },
        {
          quoted: m
        }
      )
    } catch (err) {
      console.error(
        "[GROUP CONTROL ERROR]",
        err
      )

      await sleep(1500)

      await safeReact(
        sock,
        m,
        "❌"
      )

      await sleep(1000)

      return m.reply(
`╭━━〔 ❌ GROUP ERROR 〕━━╮

⚠️ ${String(
  err.message ||
  "Terjadi kesalahan."
).slice(0, 300)}

╰━━━━━━━━━━━━━━━━━━━━╯`
      )
    }
  }
}