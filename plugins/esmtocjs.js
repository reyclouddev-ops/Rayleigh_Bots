const sleep = ms =>
  new Promise(resolve => setTimeout(resolve, ms))

function convertEsmToCjs(code) {
  let result = code
  const exportedItems = []
  let hasDefaultExport = false
  let defaultExportValue = null

  result = result.replace(
    /import\s+(\w+)\s*,\s*\{\s*([^}]+)\s*\}\s*from\s+['"]([^'"]+)['"]\s*;?/g,
    (m, def, named, path) => {
      const items = named
        .split(",")
        .map(i => i.trim())
        .join(", ")

      return `const ${def} = require('${path}')\nconst { ${items} } = require('${path}')`
    }
  )

  result = result.replace(
    /import\s+(\w+)\s+from\s+['"]([^'"]+)['"]\s*;?/g,
    (m, name, path) => {
      return `const ${name} = require('${path}')`
    }
  )

  result = result.replace(
    /import\s*\{\s*([^}]+)\s*\}\s*from\s+['"]([^'"]+)['"]\s*;?/g,
    (m, imports, path) => {
      const items = imports
        .split(",")
        .map(i => {
          const parts = i
            .trim()
            .split(/\s+as\s+/)

          if (parts.length === 2) {
            return `${parts[0]}: ${parts[1]}`
          }

          return parts[0]
        })

      return `const { ${items.join(", ")} } = require('${path}')`
    }
  )

  result = result.replace(
    /import\s*\*\s*as\s+(\w+)\s+from\s+['"]([^'"]+)['"]\s*;?/g,
    (m, name, path) => {
      return `const ${name} = require('${path}')`
    }
  )

  result = result.replace(
    /import\s+['"]([^'"]+)['"]\s*;?/g,
    (m, path) => {
      return `require('${path}')`
    }
  )

  result = result.replace(
    /export\s+default\s+(\w+)\s*;?/g,
    (m, name) => {
      hasDefaultExport = true
      defaultExportValue = name
      return ""
    }
  )

  result = result.replace(
    /export\s+default\s+(function|class|async\s+function)\s*(\w*)\s*(\([^)]*\))?\s*\{/g,
    (m, type, name, params) => {
      hasDefaultExport = true

      if (name) {
        defaultExportValue = name
        return `${type} ${name}${params || ""} {`
      }

      defaultExportValue = "__default__"
      return `const __default__ = ${type}${params || ""} {`
    }
  )

  result = result.replace(
    /export\s+default\s+(\{[\s\S]*?\})\s*;?/g,
    (m, obj) => {
      hasDefaultExport = true
      defaultExportValue = obj
      return ""
    }
  )

  result = result.replace(
    /export\s*\{\s*([^}]+)\s*\}\s*;?/g,
    (m, exports) => {
      exports.split(",").forEach(i => {
        const parts = i
          .trim()
          .split(/\s+as\s+/)

        if (parts.length === 2) {
          exportedItems.push({
            name: parts[0],
            alias: parts[1]
          })
        } else {
          exportedItems.push({
            name: parts[0],
            alias: null
          })
        }
      })

      return ""
    }
  )

  result = result.replace(
    /export\s+(const|let|var)\s+(\w+)\s*=/g,
    (m, type, name) => {
      exportedItems.push({
        name,
        alias: null
      })

      return `${type} ${name} =`
    }
  )

  result = result.replace(
    /export\s+(async\s+)?function\s+(\w+)/g,
    (m, async, name) => {
      exportedItems.push({
        name,
        alias: null
      })

      return `${async || ""}function ${name}`
    }
  )

  result = result.replace(
    /export\s+class\s+(\w+)/g,
    (m, name) => {
      exportedItems.push({
        name,
        alias: null
      })

      return `class ${name}`
    }
  )

  result = result.replace(
    /export\s*\*\s*from\s+['"]([^'"]+)['"]\s*;?/g,
    (m, path) => {
      return `Object.assign(module.exports, require('${path}'))`
    }
  )

  let exportCode = ""

  if (hasDefaultExport) {
    exportCode +=
      `\nmodule.exports = ${defaultExportValue}`
  }

  if (exportedItems.length > 0) {
    const items = exportedItems
      .map(e =>
        e.alias
          ? `${e.alias}: ${e.name}`
          : e.name
      )
      .join(", ")

    exportCode += hasDefaultExport
      ? `\nmodule.exports = { ...module.exports, ${items} }`
      : `\nmodule.exports = { ${items} }`
  }

  result =
    result.trim() +
    exportCode

  result =
    result.replace(
      /\n{3,}/g,
      "\n\n"
    )

  return result
}

async function sendRichResult(
  sock,
  m,
  title,
  text,
  code
) {
  return sock.sendMessage(
    m.chat,
    {
      richMessage: {
        title,
        text,
        editrich: {
          title,
          text,
          code: {
            language: "javascript",
            code
          },
          footer: "Powered by ReyCloudSHP"
        }
      }
    },
    {
      quoted: m
    }
  )
}

export default {
  name: "ESM to CJS Converter",

  command: [
    "esmtocjs",
    "esm2cjs",
    "esmconvert"
  ],

  category: "Tools",

  description:
    "Convert ES Modules (import/export) ke CommonJS (require/module.exports)",

  async run(
    sock,
    m,
    { text }
  ) {
    const code =
      m.quoted
        ? (
            m.quoted.text ||
            m.quoted.caption
          )
        : text

    if (!code) {
      return m.reply(
`🔄 *ESM TO CJS CONVERTER*

> Convert kode ES Modules ke CommonJS instan.

📌 *Cara Penggunaan:*

• Reply kode ESM lalu:
└ *.esmtocjs*

• Atau ketik langsung:
└ *.esmtocjs import axios from 'axios'*

╰━━━━━━━━━━━━━━━━━━━━╯`
      )
    }

    let statusMsg = null

    try {
      statusMsg =
        await sock.sendMessage(
          m.chat,
          {
            text:
              "⏳ *Menerjemahkan kode ESM ke CommonJS...*"
          },
          {
            quoted: m
          }
        )

      const convertedCode =
        convertEsmToCjs(code)

      await sleep(1000)

      if (statusMsg?.key) {
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
                    "✅ *Konversi berhasil!*\n\nKode ESM berhasil dikonversi ke CommonJS."
                }
              }
            },
            {}
          )
        } catch {}
      }

      return await sendRichResult(
        sock,
        m,
        "🔄 ESM TO CJS",
        "Berhasil mengkonversi kode ES Modules ke CommonJS.",
        convertedCode
      )
    } catch (error) {
      console.error(
        "[ESM2CJS ERROR]",
        error
      )

      if (statusMsg?.key) {
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
`❌ *Gagal mengkonversi kode!*

⚠️ Error: ${error.message}`
                }
              }
            },
            {}
          )

          return
        } catch {}
      }

      return m.reply(
`❌ *Gagal mengkonversi kode!*

⚠️ Error: ${error.message}`
      )
    }
  }
}