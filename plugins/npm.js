import { spawn } from "node:child_process"

const sleep = ms =>
  new Promise(resolve => setTimeout(resolve, ms))

export default {
  name: "NPM Install",

  command: [
    "install",
    "npm"
  ],

  category: "Owner",

  description:
    "Install npm module",

  isOwner: true,

  async run(
    sock,
    m,
    { text }
  ) {
    const moduleName =
      String(text || "").trim()

    if (!moduleName) {
      return m.reply(
`❌ *Nama module wajib diisi!*

Contoh:
.install axios

atau:
.npm axios`
      )
    }

    if (
      !/^(?:@[a-zA-Z0-9._-]+\/)?[a-zA-Z0-9._-]+(?:@[a-zA-Z0-9._*-]+)?$/.test(
        moduleName
      )
    ) {
      return m.reply(
`❌ *Nama module tidak valid!*

Contoh:
.install axios
.install cheerio
.install archiver
.install @napi-rs/canvas
.install axios@1.7.9`
      )
    }

    let statusMessage = null
    let finished = false
    let lastUpdate = 0
    let progress = 0
    let output = ""

    const updateProgress = async (
      value,
      status,
      force = false
    ) => {
      if (finished) return

      value = Math.max(
        progress,
        Math.min(100, value)
      )

      const now = Date.now()

      if (
        !force &&
        value !== 100 &&
        now - lastUpdate < 1200
      ) {
        return
      }

      progress = value
      lastUpdate = now

      const total = 10

      const filled =
        Math.round(
          (progress / 100) *
          total
        )

      const bar =
        "█".repeat(filled) +
        "░".repeat(
          total - filled
        )

      const message =
`╭━━〔 📦 NPM INSTALL 〕━━╮

📦 Package:
${moduleName}

${status}

[${bar}] ${progress}%

${
  progress < 100
    ? "⏳ Mohon tunggu..."
    : "✅ Selesai diproses"
}

╰━━━━━━━━━━━━━━━━━━━━╯`

      try {
        if (!statusMessage) {
          statusMessage =
            await m.reply(message)
        } else {
          await statusMessage.edit(
            message
          )
        }
      } catch (error) {
        console.log(
          "[NPM EDIT ERROR]",
          error?.message ||
            error
        )
      }
    }

    try {
      statusMessage =
        await m.reply(
`╭━━〔 📦 NPM INSTALL 〕━━╮

📦 Package:
${moduleName}

⏳ Status: Memulai...

[░░░░░░░░░░] 0%

Mohon tunggu...
╰━━━━━━━━━━━━━━━━━━━━╯`
        )

      await updateProgress(
        5,
        "🔄 Status: Menjalankan npm...",
        true
      )

      const npmCommand =
        process.platform === "win32"
          ? "npm.cmd"
          : "npm"

      const npm = spawn(
        npmCommand,
        [
          "install",
          moduleName,
          "--no-audit",
          "--no-fund",
          "--progress=false"
        ],
        {
          cwd: process.cwd(),

          env: {
            ...process.env,
            NPM_CONFIG_PROGRESS:
              "false",
            npm_config_audit:
              "false",
            npm_config_fund:
              "false"
          },

          shell: false,

          stdio: [
            "ignore",
            "pipe",
            "pipe"
          ]
        }
      )

      let currentProgress = 5

      const progressTimer =
        setInterval(() => {
          if (finished) return

          if (
            currentProgress < 90
          ) {
            currentProgress += 2
          }

          updateProgress(
            currentProgress,
            "🔄 Status: Menginstall package..."
          ).catch(() => {})
        }, 1500)

      const appendOutput = data => {
        const text =
          data?.toString() || ""

        if (!text) return

        output += text

        if (
          output.length > 12000
        ) {
          output =
            output.slice(-12000)
        }

        console.log(
          "[NPM]",
          text.trim()
        )
      }

      npm.stdout?.on(
        "data",
        appendOutput
      )

      npm.stderr?.on(
        "data",
        data => {
          const text =
            data?.toString() || ""

          if (!text) return

          output += text

          if (
            output.length > 12000
          ) {
            output =
              output.slice(-12000)
          }

          console.log(
            "[NPM STDERR]",
            text.trim()
          )
        }
      )

      await new Promise(
        resolve => {
          let settled = false

          const finish = () => {
            if (settled) return

            settled = true
            resolve()
          }

          npm.once(
            "error",
            async error => {
              if (settled) return

              finished = true
              clearInterval(
                progressTimer
              )

              console.error(
                "[NPM INSTALL ERROR]",
                error
              )

              try {
                await statusMessage.edit(
`╭━━〔 ❌ NPM INSTALL 〕━━╮

📦 Package:
${moduleName}

[██████████] ERROR

❌ Gagal menjalankan npm.

⚠️ Error:
${error?.message || error}

╰━━━━━━━━━━━━━━━━━━━━╯`
                )
              } catch {}

              finish()
            }
          )

          npm.once(
            "close",
            async code => {
              if (settled) return

              clearInterval(
                progressTimer
              )

              if (code !== 0) {
                finished = true

                let errorText =
                  output
                    .trim()
                    .split("\n")
                    .filter(Boolean)
                    .slice(-10)
                    .join("\n")

                if (
                  errorText.length >
                  1800
                ) {
                  errorText =
                    errorText.slice(
                      -1800
                    )
                }

                try {
                  await statusMessage.edit(
`╭━━〔 ❌ NPM INSTALL 〕━━╮

📦 Package:
${moduleName}

[██████████] FAILED

❌ Installation gagal.

⚠️ Exit Code:
${code}

${
  errorText
    ? `📄 Output:\n${errorText}`
    : "📄 Tidak ada output error."
}

╰━━━━━━━━━━━━━━━━━━━━╯`
                  )
                } catch {}

                finish()
                return
              }

              finished = true

              try {
                await statusMessage.edit(
`╭━━〔 📦 NPM INSTALL 〕━━╮

📦 Package:
${moduleName}

[██████████] 100%

✅ *Berhasil install module!*

🚀 ${global.botname || "ReyCloud"}
© ${global.author || "ReyCloudShop"}

╰━━━━━━━━━━━━━━━━━━━━╯`
                )
              } catch (error) {
                console.log(
                  "[NPM FINAL EDIT ERROR]",
                  error?.message ||
                    error
                )
              }

              finish()
            }
          )
        }
      )

      await sleep(100)

    } catch (error) {
      finished = true

      console.error(
        "[NPM INSTALL FATAL ERROR]",
        error
      )

      try {
        if (statusMessage) {
          await statusMessage.edit(
`╭━━〔 ❌ NPM INSTALL 〕━━╮

📦 Package:
${moduleName}

❌ Terjadi kesalahan.

⚠️ Error:
${error?.message || error}

╰━━━━━━━━━━━━━━━━━━━━╯`
          )
        } else {
          await m.reply(
`❌ *NPM Install Error*

${error?.message || error}`
          )
        }
      } catch {}
    }
  }
}