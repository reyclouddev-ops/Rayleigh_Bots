const sleep = ms =>
    new Promise(resolve => setTimeout(resolve, ms))

function convertCjsToEsm(code) {
    let result = String(code)

    result = result.replace(
        /(?:const|let|var)\s*\{\s*([^}]+)\s*\}\s*=\s*require\s*\(\s*['"]([^'"]+)['"]\s*\)\s*;?/g,
        (match, imports, path) => {
            const items = imports
                .split(",")
                .map(item => {
                    const parts =
                        item.trim().split(/\s*:\s*/)

                    if (parts.length === 2) {
                        return `${parts[0].trim()} as ${parts[1].trim()}`
                    }

                    return parts[0].trim()
                })

            return `import { ${items.join(", ")} } from "${path}"`
        }
    )

    result = result.replace(
        /(?:const|let|var)\s+(\w+)\s*=\s*require\s*\(\s*['"]([^'"]+)['"]\s*\)\.(\w+)\s*;?/g,
        (match, name, path, prop) => {
            if (name === prop) {
                return `import { ${prop} } from "${path}"`
            }

            return `import { ${prop} as ${name} } from "${path}"`
        }
    )

    result = result.replace(
        /(?:const|let|var)\s+(\w+)\s*=\s*require\s*\(\s*['"]([^'"]+)['"]\s*\)\.default\s*;?/g,
        (match, name, path) => {
            return `import ${name} from "${path}"`
        }
    )

    result = result.replace(
        /(?:const|let|var)\s+(\w+)\s*=\s*require\s*\(\s*['"]([^'"]+)['"]\s*\)\s*;?/g,
        (match, name, path) => {
            return `import ${name} from "${path}"`
        }
    )

    result = result.replace(
        /^require\s*\(\s*['"]([^'"]+)['"]\s*\)\s*;?$/gm,
        (match, path) => {
            return `import "${path}"`
        }
    )

    result = result.replace(
        /module\.exports\s*=\s*\{([\s\S]*?)\}\s*;?/g,
        (match, exports) => {
            const items = exports
                .split(",")
                .map(item => {
                    const parts =
                        item.trim().split(/\s*:\s*/)

                    if (parts.length === 2) {
                        return `${parts[1].trim()} as ${parts[0].trim()}`
                    }

                    return parts[0].trim()
                })
                .filter(Boolean)

            return `export { ${items.join(", ")} }`
        }
    )

    result = result.replace(
        /module\.exports\s*=\s*(async\s+)?(function|class)\s*(\w*)\s*(\([^)]*\))?\s*\{/g,
        (match, asyncKeyword, type, name, params) => {
            if (name) {
                return `export default ${asyncKeyword || ""}${type} ${name}${params || ""} {`
            }

            return `export default ${asyncKeyword || ""}${type}${params || ""} {`
        }
    )

    result = result.replace(
        /module\.exports\s*=\s*(async\s+)?\(([^)]*)\)\s*=>/g,
        (match, asyncKeyword, params) => {
            return `export default ${asyncKeyword || ""}(${params}) =>`
        }
    )

    result = result.replace(
        /module\.exports\s*=\s*([^;\n]+)\s*;?/g,
        (match, value) => {
            return `export default ${value}`
        }
    )

    result = result.replace(
        /exports\.(\w+)\s*=\s*(async\s+)?function\s*(\w*)\s*(\([^)]*\))?\s*\{/g,
        (match, exportName, asyncKeyword, name, params) => {
            return `export ${asyncKeyword || ""}function ${exportName}${params || ""} {`
        }
    )

    result = result.replace(
        /exports\.(\w+)\s*=\s*(async\s+)?\(([^)]*)\)\s*=>\s*\{/g,
        (match, exportName, asyncKeyword, params) => {
            return `export const ${exportName} = ${asyncKeyword || ""}(${params}) => {`
        }
    )

    result = result.replace(
        /exports\.(\w+)\s*=\s*(\w+)\s*;?/g,
        (match, key, value) => {
            if (key === value) {
                return `export { ${key} }`
            }

            return `export { ${value} as ${key} }`
        }
    )

    result = result.replace(
        /exports\.(\w+)\s*=\s*([^;\n]+)\s*;?/g,
        (match, key, value) => {
            if (
                /^(async|function|\(|class)/.test(
                    value.trim()
                )
            ) {
                return match
            }

            return `export const ${key} = ${value}`
        }
    )

    result = result.replace(
        /module\.exports\.(\w+)\s*=\s*(\w+)\s*;?/g,
        (match, key, value) => {
            if (key === value) {
                return `export { ${key} }`
            }

            return `export { ${value} as ${key} }`
        }
    )

    result = result.replace(
        /Object\.assign\s*\(\s*module\.exports\s*,\s*require\s*\(\s*['"]([^'"]+)['"]\s*\)\s*\)\s*;?/g,
        (match, path) => {
            return `export * from "${path}"`
        }
    )

    if (
        (result.includes("__dirname") ||
            result.includes("__filename")) &&
        !result.includes("fileURLToPath")
    ) {
        const helperCode =
`import { fileURLToPath } from "url"
import { dirname } from "path"

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

`

        result =
            helperCode + result
    }

    result = result.replace(
        /\n{3,}/g,
        "\n\n"
    )

    return result.trim()
}

export default {
    name: "CJS to ESM Converter",

    command: [
        "cjstoesm",
        "cjs2esm",
        "cjsconvert"
    ],

    category: "Tools",

    description:
        "Convert CommonJS (require/module.exports) ke ES Modules (import/export)",

    isOwner: false,

    async run(
        sock,
        m,
        {
            text,
            prefix,
            command
        }
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
`🔄 *CJS TO ESM CONVERTER*

> Convert kode CommonJS ke ES Modules instan.

📌 *Cara Penggunaan:*

• Reply kode CJS yang ingin diconvert:
 └ \`${prefix}${command}\`

• Atau ketik langsung setelah perintah:
 └ \`${prefix}${command} const axios = require("axios")\``
            )
        }

        await sock.sendMessage(
            m.chat,
            {
                react: {
                    text: "⏳",
                    key: m.key
                }
            }
        )

        const statusMsg =
            await sock.sendMessage(
                m.chat,
                {
                    text:
                        "⏳ *Menerjemahkan kode CommonJS ke ES Modules...*"
                },
                {
                    quoted: m
                }
            )

        try {
            const convertedCode =
                convertCjsToEsm(code)

            await sleep(1000)

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
                        title: "🔄 CJS TO ESM",
                        text:
                            "Berhasil mengkonversi kode CommonJS ke ES Modules.",
                        editrich: {
                            title: "✅ CJS TO ESM",
                            text:
                                "Source code hasil conversion:",
                            code: {
                                language:
                                    "javascript",
                                code:
                                    convertedCode
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

            try {
                await sock.sendMessage(
                    m.chat,
                    {
                        text:
                            "✅ *Conversion selesai!*",
                        edit:
                            statusMsg.key
                    }
                )
            } catch {}

        } catch (error) {
            console.error(
                "[CJS2ESM ERROR]",
                error
            )

            await sock.sendMessage(
                m.chat,
                {
                    react: {
                        text: "❌",
                        key: m.key
                    }
                }
            )

            try {
                await sock.sendMessage(
                    m.chat,
                    {
                        text:
`❌ *Gagal mengkonversi kode!*

⚠️ Error:
${error.message}`,
                        edit:
                            statusMsg.key
                    }
                )

                return
            } catch {}

            return m.reply(
`❌ *Gagal mengkonversi kode!*

⚠️ Error:
${error.message}`
            )
        }
    }
}