import fs from "fs"
import path from "path"
import crypto from "crypto"
import { execFile } from "child_process"
import { promisify } from "util"

const execFileAsync =
  promisify(execFile)

const TEMP_DIR =
  path.join(
    process.cwd(),
    "tmp",
    "gitclone"
  )

function ensureTempDir() {
  if (
    !fs.existsSync(
      TEMP_DIR
    )
  ) {
    fs.mkdirSync(
      TEMP_DIR,
      {
        recursive: true
      }
    )
  }
}

function getRepoName(url) {
  try {
    const clean =
      url
        .split("?")[0]
        .split("#")[0]
        .replace(/\/+$/, "")

    const parts =
      clean.split("/")

    let name =
      parts[
        parts.length - 1
      ] || "repository"

    if (
      name.endsWith(".git")
    ) {
      name =
        name.slice(
          0,
          -4
        )
    }

    name =
      name.replace(
        /[^a-zA-Z0-9._-]/g,
        "_"
      )

    return (
      name ||
      "repository"
    )
  } catch {
    return "repository"
  }
}

function isValidGitUrl(url) {
  try {
    const parsed =
      new URL(url)

    if (
      parsed.protocol !==
        "https:" &&
      parsed.protocol !==
        "http:"
    ) {
      return false
    }

    const host =
      parsed.hostname.toLowerCase()

    return (
      host ===
        "github.com" ||
      host ===
        "gitlab.com" ||
      host ===
        "bitbucket.org"
    )
  } catch {
    return false
  }
}

async function cleanup(dir) {
  try {
    await fs.promises.rm(
      dir,
      {
        recursive: true,
        force: true
      }
    )
  } catch {}
}

export default {
  name: "Git Clone",

  command: [
    "gitclone",
    "clonegit",
    "git-clone"
  ],

  category: "Tools",

  description:
    "Clone repository Git publik dan mengirimkannya dalam bentuk ZIP",

  async run(
    sock,
    m,
    {
      args,
      prefix,
      command
    }
  ) {
    let workDir = null
    let zipPath = null

    try {
      const text =
        Array.isArray(args)
          ? args
              .join(" ")
              .trim()
          : ""

      if (!text) {
        return m.reply(
`╭━━〔 📦 GIT CLONE 〕━━╮

❌ URL repository belum diberikan.

Contoh:

${prefix}${command} https://github.com/user/repo

Bot akan:
• Clone repository
• Membuat ZIP
• Mengirim ZIP ke chat
• Menghapus file temporary

Supported:
• GitHub
• GitLab
• Bitbucket

╰━━━━━━━━━━━━━━━━━━━━╯`
        )
      }

      const url =
        text
          .split(/\s+/)[0]
          .trim()

      if (
        !isValidGitUrl(url)
      ) {
        return m.reply(
`❌ URL Git tidak valid.

Gunakan repository publik dari:

• github.com
• gitlab.com
• bitbucket.org

Contoh:

${prefix}${command} https://github.com/user/repo`
        )
      }

      ensureTempDir()

      const id =
        `${Date.now()}-${crypto.randomBytes(4).toString("hex")}`

      const repoName =
        getRepoName(url)

      const safeName =
        `${repoName}-${id}`

      workDir =
        path.join(
          TEMP_DIR,
          safeName
        )

      zipPath =
        path.join(
          TEMP_DIR,
          `${safeName}.zip`
        )

      await m.reply(
`╭━━〔 ⏳ GIT CLONE 〕━━╮

📦 Repository
${repoName}

🔗 URL
${url}

⏳ Sedang melakukan clone...

╰━━━━━━━━━━━━━━━━━━━━╯`
      )

      await execFileAsync(
        "git",
        [
          "clone",
          "--depth",
          "1",
          url,
          workDir
        ],
        {
          timeout:
            120000,
          maxBuffer:
            1024 *
            1024 *
            10
        }
      )

      if (
        !fs.existsSync(
          workDir
        )
      ) {
        throw new Error(
          "Folder repository tidak ditemukan setelah clone."
        )
      }

      await execFileAsync(
        "zip",
        [
          "-r",
          zipPath,
          safeName
        ],
        {
          cwd:
            TEMP_DIR,
          timeout:
            120000,
          maxBuffer:
            1024 *
            1024 *
            10
        }
      )

      if (
        !fs.existsSync(
          zipPath
        )
      ) {
        throw new Error(
          "Gagal membuat file ZIP."
        )
      }

      const stat =
        await fs.promises.stat(
          zipPath
        )

      if (
        stat.size <= 0
      ) {
        throw new Error(
          "File ZIP kosong."
        )
      }

      const sizeMB =
        (
          stat.size /
          1024 /
          1024
        ).toFixed(2)

      await sock.sendMessage(
        m.chat,
        {
          document:
            fs.readFileSync(
              zipPath
            ),

          mimetype:
            "application/zip",

          fileName:
            `${repoName}.zip`,

          caption:
`╭━━〔 ✅ GIT CLONE BERHASIL 〕━━╮

📦 Repository
${repoName}

📁 File
${repoName}.zip

💾 Size
${sizeMB} MB

🔗 Source
${url}

╰━━━━━━━━━━━━━━━━━━━━╯`
        },
        {
          quoted: m
        }
      )

    } catch (error) {
      console.error(
        "[GITCLONE ERROR]",
        error
      )

      let message =
        error?.stderr ||
        error?.message ||
        "Unknown error"

      message =
        String(message)
          .replace(
            /\x1B\[[0-?]*[ -/]*[@-~]/g,
            ""
          )
          .trim()

      if (
        message.length >
        1500
      ) {
        message =
          message.slice(
            0,
            1500
          ) + "..."
      }

      await m.reply(
`╭━━〔 ❌ GIT CLONE ERROR 〕━━╮

Gagal melakukan clone
repository.

📦 Error:
${message}

╰━━━━━━━━━━━━━━━━━━━━╯`
      )

    } finally {
      if (workDir) {
        await cleanup(
          workDir
        )
      }

      if (zipPath) {
        await cleanup(
          zipPath
        )
      }
    }
  }
}