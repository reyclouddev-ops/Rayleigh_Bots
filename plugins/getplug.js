import fs from "fs"
import path from "path"

export default {
  name: "Get Plugin",

  command: [
    "getp",
    "getplug"
  ],

  category: "Owner",

  isOwner: true,

  async run(
    sock,
    m,
    { text }
  ) {
    try {
      if (!text) {
        return m.reply(
`❌ Masukkan nama plugin!

Contoh:
.getp ping.js
.getplug ping`
        )
      }

      let fileName =
        text.trim()

      if (
        !fileName.endsWith(".js")
      ) {
        fileName += ".js"
      }

      if (
        !/^[a-zA-Z0-9_-]+\.js$/.test(
          fileName
        )
      ) {
        return m.reply(
          "❌ Nama plugin tidak valid!"
        )
      }

      const pluginDir =
        path.join(
          process.cwd(),
          "plugins"
        )

      const filePath =
        path.join(
          pluginDir,
          fileName
        )

      if (
        !fs.existsSync(
          filePath
        )
      ) {
        throw new Error(
          `Plugin \`${fileName}\` tidak ditemukan!`
        )
      }

      const code =
        fs.readFileSync(
          filePath,
          "utf8"
        )

      await sock.sendMessage(
        m.chat,
        {
          react: {
            text: "✅",
            key: m.key
          }
        }
      )

      await sock.sendMessage(
        m.chat,
        {
          richMessage: {
            title:
              "📂 GET PLUGIN",

            text:
              `Berhasil mengambil source code plugin: ${fileName}`,

            editrich: {
              title:
                "📂 GET PLUGIN",

              text:
                `Source code untuk plugin: ${fileName}`,

              code: {
                language:
                  "javascript",

                code
              },

              footer:
                "Powered by ReyCloudSHP"
            }
          }
        },
        {
          quoted: m
        }
      )

    } catch (err) {
      console.error(
        "[GET PLUGIN ERROR]",
        err
      )

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
      } catch {}

      return m.reply(
`❌ Gagal mengambil plugin!

${err?.message || "Terjadi kesalahan."}`
      )
    }
  }
}