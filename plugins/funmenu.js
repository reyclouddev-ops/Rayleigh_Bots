import fs from "fs"
import path from "path"

export default {
  name: "Fun Menu",

  command: [
    "funmenu",
    "fun"
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
        "🎮",
        "🎯",
        "🎲",
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

      const funPlugins =
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
              "fun"
            )
          }
        )

      if (!funPlugins.length) {
        return m.reply(
`╭━━〔 🎮 FUN MENU 〕━━╮

❌ Belum ada plugin Fun.

Tambahkan plugin dengan:

category: "Fun"

╰━━━━━━━━━━━━━━━━━━╯`
        )
      }

      const commands = []

      for (
        const plugin of funPlugins
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
`╭━━〔 🎮 FUN MENU 〕━━╮

👋 Halo ${m.pushName || "Kak"}!

🎮 *FUN & ENTERTAINMENT*

━━━━━━━━━━━━━━━━━━
`

      for (
        const cmd of commands
      ) {
        menu +=
          `│ 🎲 ${prefix}${cmd}\n`
      }

      menu +=
`━━━━━━━━━━━━━━━━━━

📦 Total Plugin : ${funPlugins.length}
🎮 Total Command : ${commands.length}

╰━━━━━━━━━━━━━━━━━━╯

© ${global.author || "ReyCloudShop"}`

      const imagePath =
        path.join(
          process.cwd(),
          "image",
          "menu.png"
        )

      if (
        fs.existsSync(imagePath)
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
        "[ FUN MENU ERROR ]",
        error
      )

      return m.reply(
`❌ *Fun Menu Error*

${error.message}`
      )
    }
  }
}