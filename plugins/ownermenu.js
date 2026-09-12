import fs from "node:fs"
import path from "node:path"

export default {
  name: "Owner Menu",

  command: [
    "ownermenu",
    "ownmenu"
  ],

  category: "Main",

  async run(
    sock,
    m,
    { prefix }
  ) {
    try {
      console.log(
        "[ OWNER MENU ] Plugin terpanggil!"
      )

      const plugins =
        Object.values(
          global.plugins || {}
        )

      const ownerPlugins =
        plugins.filter(
          plugin => {
            if (!plugin) {
              return false
            }

            if (!plugin.category) {
              return false
            }

            if (!plugin.command) {
              return false
            }

            return (
              String(
                plugin.category
              )
                .toLowerCase()
                .trim() === "owner"
            )
          }
        )

      let menu =
`╭━━〔 👑 OWNER COMMANDS 〕━━╮
│
`

      if (
        ownerPlugins.length === 0
      ) {
        menu +=
          `│ ❌ Belum ada plugin Owner.\n`
      } else {
        for (
          const plugin of ownerPlugins
        ) {
          const name =
            plugin.name ||
            "Unknown"

          const commands =
            Array.isArray(
              plugin.command
            )
              ? plugin.command
              : [plugin.command]

          const commandList =
            commands
              .filter(Boolean)
              .map(
                cmd =>
                  `${prefix}${cmd}`
              )
              .join(", ")

          menu +=
            `│ 📌 ${name}\n`

          menu +=
            `│    Command : ${commandList}\n`

          menu +=
            `│\n`
        }
      }

      menu +=
        `╰━━━━━━━━━━━━━━━━━━━━╯`

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
        await m.reply(
          menu
        )
      }

    } catch (err) {
      console.error(
        "[ OWNER MENU ERROR ]",
        err
      )

      await m.reply(
`❌ Owner Menu Error

${err?.message || err}`
      )
    }
  }
}