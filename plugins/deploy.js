import fs from "fs"
import path from "path"
import os from "os"
import axios from "axios"
import AdmZip from "adm-zip"

const VERCEL_API = "https://api.vercel.com"

const sleep = ms =>
  new Promise(resolve => setTimeout(resolve, ms))

async function updateProgress(
  sock,
  m,
  statusMessage,
  progress,
  statusText,
  details = ""
) {
  progress = Math.max(
    0,
    Math.min(100, Math.round(progress))
  )

  const totalBars = 10

  const filled = Math.round(
    (progress / 100) * totalBars
  )

  const bar =
    "█".repeat(filled) +
    "░".repeat(totalBars - filled)

  try {
    const editKey = {
      remoteJid: m.chat,
      id: statusMessage.key.id,
      fromMe: true
    }

    if (statusMessage.key.participant) {
      editKey.participant =
        statusMessage.key.participant
    }

    await sock.relayMessage(
      m.chat,
      {
        protocolMessage: {
          key: editKey,
          type: 14,
          editedMessage: {
            conversation:
`╭━━〔 🚀 VERCEL DEPLOY SYSTEM 〕━━╮

⏳ ${statusText}

[${bar}] ${progress}%

${details ? `📄 ${details}` : ""}

╰━━━━━━━━━━━━━━━━━━━━╯`
          }
        }
      },
      {}
    )
  } catch (err) {
    console.log(
      "[PROGRESS EDIT ERROR]",
      err.message
    )
  }
}

function getVercelConfig() {
  if (!global.vercel) {
    throw new Error(
      "global.vercel belum dikonfigurasi di config.js"
    )
  }

  const token = String(
    global.vercel.token || ""
  ).trim()

  if (!token) {
    throw new Error(
      "Vercel token belum dikonfigurasi."
    )
  }

  return {
    token,
    domains: [
      "legionteknologi.my.id",
      "reycode.my.id"
    ]
  }
}

function vercelHeaders(token) {
  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/json",
    "Content-Type": "application/json"
  }
}

function cleanProjectName(name) {
  return String(name || "")
    .trim()
    .toLowerCase()
    .replace(/\.zip$/i, "")
    .replace(/\.html?$/i, "")
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
}

function isValidProjectName(name) {
  return /^[a-z0-9][a-z0-9-]{1,62}$/.test(name)
}

function getExtension(filename) {
  return path
    .extname(filename || "")
    .toLowerCase()
}

function isZip(filename) {
  return getExtension(filename) === ".zip"
}

function isHtml(filename) {
  return [".html", ".htm"].includes(
    getExtension(filename)
  )
}

function getQuotedFileName(m) {
  if (!m.quoted) return null

  return (
    m.quoted.fileName ||
    m.quoted.filename ||
    m.quoted.msg?.fileName ||
    m.quoted.msg?.filename ||
    null
  )
}

function collectFiles(
  directory,
  base = directory
) {
  const result = []

  const entries = fs.readdirSync(
    directory,
    {
      withFileTypes: true
    }
  )

  for (const entry of entries) {
    const fullPath = path.join(
      directory,
      entry.name
    )

    if (entry.isDirectory()) {
      result.push(
        ...collectFiles(
          fullPath,
          base
        )
      )
    } else {
      result.push({
        filePath: fullPath,
        fileName: path
          .relative(
            base,
            fullPath
          )
          .replace(/\\/g, "/")
      })
    }
  }

  return result
}

function findFileRecursive(
  directory,
  filename
) {
  const entries = fs.readdirSync(
    directory,
    {
      withFileTypes: true
    }
  )

  for (const entry of entries) {
    const fullPath = path.join(
      directory,
      entry.name
    )

    if (
      entry.isFile() &&
      entry.name.toLowerCase() ===
      filename.toLowerCase()
    ) {
      return fullPath
    }

    if (entry.isDirectory()) {
      const found =
        findFileRecursive(
          fullPath,
          filename
        )

      if (found) {
        return found
      }
    }
  }

  return null
}

function readJsonSafe(file) {
  try {
    return JSON.parse(
      fs.readFileSync(
        file,
        "utf8"
      )
    )
  } catch {
    return null
  }
}

function detectFramework(siteDir) {
  const indexPath =
    findFileRecursive(
      siteDir,
      "index.html"
    )

  const vercelPath =
    findFileRecursive(
      siteDir,
      "vercel.json"
    )

  const packagePath =
    findFileRecursive(
      siteDir,
      "package.json"
    )

  let html = ""

  if (indexPath) {
    try {
      html = fs
        .readFileSync(
          indexPath,
          "utf8"
        )
        .toLowerCase()
    } catch {}
  }

  const vercelConfig =
    vercelPath
      ? readJsonSafe(vercelPath)
      : null

  const packageJson =
    packagePath
      ? readJsonSafe(packagePath)
      : null

  const dependencies = {
    ...(packageJson?.dependencies || {}),
    ...(packageJson?.devDependencies || {})
  }

  if (
    dependencies.next ||
    html.includes("__next") ||
    html.includes("_next/")
  ) {
    return {
      name: "Next.js",
      source: "package.json / index.html",
      type: "node",
      vercel: "nextjs"
    }
  }

  if (
    dependencies.react ||
    html.includes("react")
  ) {
    return {
      name: "React",
      source: "package.json / index.html",
      type: "node",
      vercel: "create-react-app"
    }
  }

  if (
    dependencies.vue ||
    html.includes("vue")
  ) {
    return {
      name: "Vue",
      source: "package.json / index.html",
      type: "node",
      vercel: "vue"
    }
  }

  if (
    dependencies.svelte ||
    html.includes("svelte")
  ) {
    return {
      name: "Svelte",
      source: "package.json / index.html",
      type: "node",
      vercel: "svelte"
    }
  }

  if (
    dependencies["@angular/core"] ||
    html.includes("ng-version")
  ) {
    return {
      name: "Angular",
      source: "package.json / index.html",
      type: "node",
      vercel: "angular"
    }
  }

  if (
    dependencies.astro ||
    String(
      vercelConfig?.buildCommand || ""
    )
      .toLowerCase()
      .includes("astro")
  ) {
    return {
      name: "Astro",
      source: "package.json / vercel.json",
      type: "node",
      vercel: "astro"
    }
  }

  if (
    dependencies.tailwindcss ||
    html.includes("tailwind")
  ) {
    return {
      name: "HTML + Tailwind",
      source: "package.json / index.html",
      type: "static",
      vercel: null
    }
  }

  if (indexPath) {
    return {
      name: "HTML Static",
      source: "index.html",
      type: "static",
      vercel: null
    }
  }

  if (packagePath) {
    return {
      name: "Node.js",
      source: "package.json",
      type: "node",
      vercel: null
    }
  }

  return {
    name: "Other",
    source: "Tidak terdeteksi",
    type: "static",
    vercel: null
  }
}

async function downloadQuotedFile(
  m,
  targetPath
) {
  if (
    !m.quoted ||
    typeof m.quoted.download !==
      "function"
  ) {
    throw new Error(
      "File reply tidak dapat didownload."
    )
  }

  const buffer =
    await m.quoted.download()

  if (
    !buffer ||
    !Buffer.isBuffer(buffer) ||
    !buffer.length
  ) {
    throw new Error(
      "File yang diterima kosong."
    )
  }

  fs.writeFileSync(
    targetPath,
    buffer
  )

  return buffer
}

async function prepareProject(
  m,
  workDir,
  filename
) {
  const sourcePath =
    path.join(
      workDir,
      filename
    )

  await downloadQuotedFile(
    m,
    sourcePath
  )

  if (isZip(filename)) {
    const extractDir =
      path.join(
        workDir,
        "site"
      )

    fs.mkdirSync(
      extractDir,
      {
        recursive: true
      }
    )

    const zip =
      new AdmZip(
        sourcePath
      )

    zip.extractAllTo(
      extractDir,
      true
    )

    const indexPath =
      findFileRecursive(
        extractDir,
        "index.html"
      )

    if (indexPath) {
      const indexDir =
        path.dirname(
          indexPath
        )

      if (
        indexDir !== extractDir
      ) {
        const rootFiles =
          fs.readdirSync(
            indexDir
          )

        if (
          rootFiles.length
        ) {
          const normalizedRoot =
            path.join(
              workDir,
              "site-root"
            )

          fs.mkdirSync(
            normalizedRoot,
            {
              recursive: true
            }
          )

          fs.cpSync(
            indexDir,
            normalizedRoot,
            {
              recursive: true
            }
          )

          return normalizedRoot
        }
      }
    }

    return extractDir
  }

  if (isHtml(filename)) {
    const siteDir =
      path.join(
        workDir,
        "site"
      )

    fs.mkdirSync(
      siteDir,
      {
        recursive: true
      }
    )

    fs.copyFileSync(
      sourcePath,
      path.join(
        siteDir,
        "index.html"
      )
    )

    return siteDir
  }

  throw new Error(
    "Format file tidak didukung. Gunakan ZIP atau HTML."
  )
}

async function getVercelUser(token) {
  const response =
    await axios.get(
      `${VERCEL_API}/v2/user`,
      {
        headers:
          vercelHeaders(
            token
          ),
        timeout: 30000
      }
    )

  return response.data
}

async function createProject(
  token,
  projectName
) {
  try {
    const response =
      await axios.post(
        `${VERCEL_API}/v9/projects`,
        {
          name: projectName
        },
        {
          headers:
            vercelHeaders(
              token
            ),
          timeout: 30000
        }
      )

    return response.data
  } catch (error) {
    if (
      error.response?.status ===
      409
    ) {
      const response =
        await axios.get(
          `${VERCEL_API}/v9/projects/${encodeURIComponent(
            projectName
          )}`,
          {
            headers:
              vercelHeaders(
                token
              ),
            timeout: 30000
          }
        )

      return response.data
    }

    throw error
  }
}

async function deployFiles(
  token,
  projectName,
  directory,
  framework
) {
  const files =
    collectFiles(
      directory
    )

  if (!files.length) {
    throw new Error(
      "Tidak ada file untuk dideploy."
    )
  }

  const payloadFiles = []

  for (const file of files) {
    const buffer =
      fs.readFileSync(
        file.filePath
      )

    payloadFiles.push({
      file: file.fileName,
      data: buffer.toString(
        "base64"
      ),
      encoding: "base64"
    })
  }

  const response =
    await axios.post(
      `${VERCEL_API}/v13/deployments`,
      {
        name: projectName,
        project: projectName,
        files: payloadFiles,
        projectSettings: {
          framework:
            framework.vercel
        }
      },
      {
        headers:
          vercelHeaders(
            token
          ),
        timeout: 120000,
        maxContentLength:
          50 * 1024 * 1024,
        maxBodyLength:
          50 * 1024 * 1024
      }
    )

  return response.data
}

async function getDeployment(
  token,
  deploymentId
) {
  const response =
    await axios.get(
      `${VERCEL_API}/v13/deployments/${encodeURIComponent(
        deploymentId
      )}`,
      {
        headers:
          vercelHeaders(
            token
          ),
        timeout: 30000
      }
    )

  return response.data
}

async function addCustomDomain(
  token,
  projectName,
  customDomain
) {
  try {
    const response =
      await axios.post(
        `${VERCEL_API}/v10/projects/${encodeURIComponent(
          projectName
        )}/domains`,
        {
          name: customDomain
        },
        {
          headers:
            vercelHeaders(
              token
            ),
          timeout: 30000
        }
      )

    return {
      success: true,
      data: response.data
    }
  } catch (error) {
    const status =
      error.response?.status

    const data =
      error.response?.data

    const message =
      JSON.stringify(
        data || ""
      ).toLowerCase()

    if (
      status === 400 ||
      status === 409
    ) {
      if (
        message.includes("already") ||
        message.includes("exists") ||
        message.includes("configured")
      ) {
        return {
          success: true,
          alreadyExists: true,
          data
        }
      }
    }

    return {
      success: false,
      error:
        data?.error?.message ||
        data?.message ||
        error.message
    }
  }
}

async function waitDeployment(
  token,
  deploymentId,
  sock,
  m,
  statusMsg
) {
  const maxAttempts = 90

  for (
    let attempt = 0;
    attempt < maxAttempts;
    attempt++
  ) {
    const deployment =
      await getDeployment(
        token,
        deploymentId
      )

    const state =
      deployment.readyState ||
      "BUILDING"

    if (
      state === "READY"
    ) {
      return deployment
    }

    if (
      state === "ERROR" ||
      state === "CANCELED"
    ) {
      throw new Error(
        `Deployment ${String(
          state
        ).toLowerCase()}.`
      )
    }

    const progress =
      Math.min(
        90,
        75 +
          Math.floor(
            (attempt /
              maxAttempts) *
              15
          )
      )

    await updateProgress(
      sock,
      m,
      statusMsg,
      progress,
      `Building project... (State: ${state})`,
      `Deployment ID: ${deploymentId}`
    )

    await sleep(2000)
  }

  throw new Error(
    "Deployment terlalu lama diproses."
  )
}

export default {
  name: "Vercel Deploy",

  command: [
    "deploy",
    "vdeploy"
  ],

  category: "Tools",

  async run(
    sock,
    m,
    {
      args = [],
      command,
      prefix
    }
  ) {
    let workDir = null
    let statusMsg = null

    try {
      const {
        token,
        domains
      } = getVercelConfig()

      const rawArgs =
        args.join(" ").trim()

      const parts =
        rawArgs
          .split(",")
          .map(x => x.trim())

      const reqname =
        cleanProjectName(
          parts[0]
        )

      const domainNumber =
        parts[1] === "2"
          ? 2
          : 1

      const selectedDomain =
        domains[
          domainNumber - 1
        ]

      if (!selectedDomain) {
        throw new Error(
          "Domain tidak tersedia."
        )
      }

      if (!reqname) {
        return m.reply(
`╭━━〔 🚀 VERCEL DEPLOY 〕━━╮

❌ *reqname wajib diisi!*

Reply file ZIP / HTML lalu:

${prefix}${command} <reqname>

Contoh:

${prefix}${command} reyshop

🌐 Default:
https://reyshop.legionteknologi.my.id

🌐 ReyCode:
${prefix}${command} reyshop,2

https://reyshop.reycode.my.id

╰━━━━━━━━━━━━━━━━━━━━╯`
        )
      }

      if (
        !isValidProjectName(
          reqname
        )
      ) {
        return m.reply(
`❌ *Nama project tidak valid!*

Gunakan:
• huruf kecil
• angka
• tanda -

Contoh:

${prefix}${command} reyshop`
        )
      }

      if (!m.quoted) {
        return m.reply(
`📦 *Reply file terlebih dahulu!*

Contoh:

1. Reply website.zip
2. Ketik:

${prefix}${command} reyshop`
        )
      }

      const filename =
        getQuotedFileName(m)

      if (!filename) {
        return m.reply(
          "❌ Nama file tidak ditemukan."
        )
      }

      if (
        !isZip(filename) &&
        !isHtml(filename)
      ) {
        return m.reply(
`❌ Format tidak didukung.

File:
${filename}

Gunakan:
• .zip
• .html
• .htm`
        )
      }

      if (
        typeof m.react ===
        "function"
      ) {
        await m.react("⏳")
      }

      workDir =
        fs.mkdtempSync(
          path.join(
            os.tmpdir(),
            "reycloud-deploy-"
          )
        )

      statusMsg =
        await sock.sendMessage(
          m.chat,
          {
            text:
`╭━━〔 🚀 VERCEL DEPLOY SYSTEM 〕━━╮

⏳ Memulai deployment...

[░░░░░░░░░░] 0%

📦 Project: ${reqname}
🌐 Domain: ${reqname}.${selectedDomain}

╰━━━━━━━━━━━━━━━━━━━━╯`
          },
          {
            quoted: m
          }
        )

      await updateProgress(
        sock,
        m,
        statusMsg,
        15,
        "Downloading file...",
        filename
      )

      const siteDir =
        await prepareProject(
          m,
          workDir,
          filename
        )

      await sleep(600)

      await updateProgress(
        sock,
        m,
        statusMsg,
        30,
        "Membaca project...",
        filename
      )

      const siteFiles =
        collectFiles(
          siteDir
        )

      if (!siteFiles.length) {
        throw new Error(
          "Project tidak mempunyai file."
        )
      }

      await sleep(600)

      await updateProgress(
        sock,
        m,
        statusMsg,
        45,
        "Mendeteksi framework...",
        filename
      )

      const framework =
        detectFramework(
          siteDir
        )

      await sleep(600)

      await updateProgress(
        sock,
        m,
        statusMsg,
        55,
        "Menghubungkan ke Vercel...",
        reqname
      )

      const vercelUser =
        await getVercelUser(
          token
        )

      await createProject(
        token,
        reqname
      )

      await sleep(600)

      await updateProgress(
        sock,
        m,
        statusMsg,
        65,
        "Uploading project...",
        `${siteFiles.length} files`
      )

      const deployment =
        await deployFiles(
          token,
          reqname,
          siteDir,
          framework
        )

      await sleep(600)

      await updateProgress(
        sock,
        m,
        statusMsg,
        75,
        "Building project...",
        deployment.id
      )

      const ready =
        await waitDeployment(
          token,
          deployment.id,
          sock,
          m,
          statusMsg
        )

      const vercelUrl =
        ready.url
          ? `https://${ready.url}`
          : `https://${reqname}.vercel.app`

      const customDomain =
        `${reqname}.${selectedDomain}`

      await updateProgress(
        sock,
        m,
        statusMsg,
        90,
        "Mengatur custom domain...",
        customDomain
      )

      const domainResult =
        await addCustomDomain(
          token,
          reqname,
          customDomain
        )

      await sleep(600)

      let domainStatus

      if (
        domainResult.success
      ) {
        domainStatus =
          "✅ Custom domain terhubung"
      } else {
        domainStatus =
`⚠️ Custom domain belum terhubung
${domainResult.error}`
      }

      await updateProgress(
        sock,
        m,
        statusMsg,
        100,
        "Deployment berhasil!",
        reqname
      )

      await sleep(400)

      const finalText =
`╭━━〔 🚀 RAYLEIGH DEPLOY 〕━━╮

🎉 *DEPLOYMENT BERHASIL!*

━━━━━━━━━━━━━━━━━━

📦 Project
${reqname}

⚙️ Framework
${framework.name}

📁 Files
${siteFiles.length}

━━━━━━━━━━━━━━━━━━

🌐 *VERCEL URL*

${vercelUrl}

━━━━━━━━━━━━━━━━━━

🔗 *CUSTOM DOMAIN*

https://${customDomain}

${domainStatus}

━━━━━━━━━━━━━━━━━━

🆔 Deployment
${deployment.id}

👤 Account
${vercelUser?.user?.username ||
 vercelUser?.user?.email ||
 "-"}

📄 File
${filename}

━━━━━━━━━━━━━━━━━━

🚀 ${
  global.botname ||
  "REYCLOUD"
}

© ${
  global.author ||
  "ReyCloud"
}

╰━━━━━━━━━━━━━━━━━━━━╯`

      try {
        const editKey = {
          remoteJid: m.chat,
          id: statusMsg.key.id,
          fromMe: true
        }

        if (
          statusMsg.key.participant
        ) {
          editKey.participant =
            statusMsg.key.participant
        }

        await sock.relayMessage(
          m.chat,
          {
            protocolMessage: {
              key: editKey,
              type: 14,
              editedMessage: {
                conversation:
                  finalText
              }
            }
          },
          {}
        )
      } catch {
        await m.reply(
          finalText
        )
      }

      if (
        typeof m.react ===
        "function"
      ) {
        await m.react("✅")
      }

      return
    } catch (error) {
      console.error(
        "[VERCEL DEPLOY ERROR]",
        error.response?.data ||
        error
      )

      if (
        typeof m.react ===
        "function"
      ) {
        await m.react("❌")
      }

      const apiError =
        error.response?.data?.error?.message ||
        error.response?.data?.message ||
        error.message ||
        "Unknown error"

      if (
        statusMsg?.key
      ) {
        try {
          const errKey = {
            remoteJid: m.chat,
            id: statusMsg.key.id,
            fromMe: true
          }

          if (
            statusMsg.key.participant
          ) {
            errKey.participant =
              statusMsg.key.participant
          }

          await sock.relayMessage(
            m.chat,
            {
              protocolMessage: {
                key: errKey,
                type: 14,
                editedMessage: {
                  conversation:
`╭━━〔 ❌ VERCEL ERROR 〕━━╮

Gagal melakukan deployment.

📌 Error:
${String(
  apiError
).slice(0, 150)}

╰━━━━━━━━━━━━━━━━━━━━╯`
                }
              }
            },
            {}
          )

          return
        } catch {}
      }

      return m.reply(
`╭━━〔 ❌ VERCEL ERROR 〕━━╮

Gagal melakukan deployment.

📌 Error:
${apiError}

╰━━━━━━━━━━━━━━━━━━━━╯`
      )
    } finally {
      if (
        workDir &&
        fs.existsSync(
          workDir
        )
      ) {
        try {
          fs.rmSync(
            workDir,
            {
              recursive: true,
              force: true
            }
          )
        } catch (error) {
          console.error(
            "[DEPLOY CLEANUP]",
            error.message
          )
        }
      }
    }
  }
}