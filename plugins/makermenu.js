import fs from "node:fs"
import path from "node:path"

export default {
  name: "Maker Menu",

  command: [
    "makermenu",
    "maker"
  ],

  category: "Main",

  async run(
    sock,
    m,
    { prefix }
  ) {
    try {
      const emojis = [
        "⏳",
        "⌛",
        "✅",
        "🛠️",
        "⚙️",
        "📦",
        "🚀",
        "✨"
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

      const plugins =
        Object.values(
          global.plugins || {}
        )

      const makerPlugins =
        plugins.filter(
          plugin => {
            if (!plugin) {
              return false
            }

            if (!plugin.command) {
              return false
            }

            return (
              String(
                plugin.category || ""
              ).toLowerCase() ===
              "maker"
            )
          }
        )

      if (
        !makerPlugins.length
      ) {
        return m.reply(
`╭━━〔 🛠️ MAKER MENU 〕━━╮

❌ Belum ada plugin Maker.

Tambahkan plugin dengan:

category: "Maker"

╰━━━━━━━━━━━━━━━━━━╯`
        )
      }

      const commands = []

      for (
        const plugin of makerPlugins
      ) {
        const cmds =
          Array.isArray(
            plugin.command
          )
            ? plugin.command
            : [plugin.command]

        for (
          const cmd of cmds
        ) {
          if (!cmd) {
            continue
          }

          const commandName =
            String(cmd)
              .replace(
                /^[.\/]/,
                ""
              )
              .toLowerCase()

          if (
            !commands.includes(
              commandName
            )
          ) {
            commands.push(
              commandName
            )
          }
        }
      }

      commands.sort()

      let menu =
`╭━━〔 🛠️ MAKER MENU 〕━━╮

👋 Halo ${m.pushName || "Kak"}!

🛠️ *MAKER & CREATOR TOOLS*

━━━━━━━━━━━━━━━━━━
`

      for (
        const cmd of commands
      ) {
        menu +=
          `│ ⚙️ ${prefix}${cmd}\n`
      }

      menu +=
`━━━━━━━━━━━━━━━━━━

📦 Total Plugin : ${makerPlugins.length}
🛠️ Total Command : ${commands.length}

╰━━━━━━━━━━━━━━━━━━╯

© ${global.author || "ReyCloudShop"}`

      const imagePath =
        path.join(
          process.cwd(),
          "image",
          "menu.png"
        )

      if (
        fs.existsSync(
          imagePath
        )
      ) {
        await sock.sendMessage(
          m.chat,
          {
            image:
              fs.readFileSync(
                imagePath
              ),
            caption: menu,
            mentions: [
              m.sender
            ]
          },
          {
            quoted: m
          }
        )
      } else {
        await sock.sendMessage(
          m.chat,
          {
            text: menu,
            mentions: [
              m.sender
            ]
          },
          {
            quoted: m
          }
        )
      }

    } catch (error) {
      console.error(
        "[ MAKER MENU ERROR ]",
        error
      )

      return m.reply(
`❌ *Maker Menu Error*

${error.message}`
      )
    }
  }
}