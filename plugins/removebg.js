import axios from "axios"
import FormData from "form-data"
import fs from "node:fs/promises"
import path from "node:path"
import os from "node:os"
import crypto from "node:crypto"

const PIXELCUT_API =
  "https://api2.pixelcut.app/image/matte/v1"

const sleep = ms =>
  new Promise(resolve => setTimeout(resolve, ms))

async function pixa(img) {
  let filePath = img
  let shouldCleanup = false

  if (Buffer.isBuffer(img)) {
    filePath = path.join(
      os.tmpdir(),
      `removebg-${crypto.randomUUID()}.jpg`
    )

    await fs.writeFile(filePath, img)
    shouldCleanup = true
  }

  try {
    const fileBuffer =
      await fs.readFile(filePath)

    const fileName =
      path.basename(filePath)

    const form = new FormData()

    form.append(
      "image",
      new Blob(
        [fileBuffer],
        { type: "image/jpeg" }
      ),
      fileName
    )

    form.append("format", "png")
    form.append("model", "v1")

    const res = await fetch(
      PIXELCUT_API,
      {
        method: "POST",
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 Chrome/139.0.0.0 Mobile Safari/537.36",
          "Accept":
            "application/json, text/plain, */*",
          "sec-ch-ua":
            '"Chromium";v="139", "Not;A=Brand";v="99"',
          "x-locale": "en",
          "x-client-version":
            "web:pixa.com:4a5b0af2",
          "sec-ch-ua-mobile": "?1",
          "sec-ch-ua-platform":
            '"Android"',
          "origin":
            "https://www.pixa.com",
          "sec-fetch-site":
            "cross-site",
          "sec-fetch-mode":
            "cors",
          "sec-fetch-dest":
            "empty",
          "referer":
            "https://www.pixa.com/",
          "accept-language":
            "id-ID,id;q=0.9,en-AU;q=0.8,en;q=0.7,en-US;q=0.6"
        },
        body: form
      }
    )

    if (!res.ok) {
      throw new Error(
        `Pixelcut API Error Status: ${res.status}`
      )
    }

    const arrayBuffer =
      await res.arrayBuffer()

    const buffer =
      Buffer.from(arrayBuffer)

    if (!buffer.length) {
      throw new Error(
        "Pixelcut mengembalikan file kosong."
      )
    }

    return buffer

  } finally {
    if (shouldCleanup) {
      try {
        await fs.unlink(filePath)
      } catch {}
    }
  }
}

async function getImageFromUrl(url) {
  const response =
    await axios.get(url, {
      responseType: "arraybuffer",
      timeout: 30000,
      headers: {
        "User-Agent":
          "Mozilla/5.0"
      }
    })

  const buffer =
    Buffer.from(response.data)

  if (!buffer.length) {
    throw new Error(
      "Gambar dari URL kosong."
    )
  }

  return buffer
}

async function editStatus(sock, m, statusMsg, text) {
  if (!statusMsg?.key) return false

  try {
    await sock.relayMessage(
      m.chat,
      {
        protocolMessage: {
          key: {
            remoteJid: m.chat,
            id: statusMsg.key.id,
            fromMe: true
          },
          type: 14,
          editedMessage: {
            conversation: text
          }
        }
      },
      {}
    )

    return true
  } catch {
    try {
      await sock.sendMessage(
        m.chat,
        {
          text,
          edit: statusMsg.key
        }
      )

      return true
    } catch {
      return false
    }
  }
}

export default {
  name: "Remove Background",
  command: [
    "removebg",
    "nobg",
    "rmbg"
  ],
  category: "Tools",
  description:
    "Menghapus background foto secara otomatis",
  isOwner: false,

  async run(
    sock,
    m,
    {
      args,
      prefix,
      command
    }
  ) {
    let statusMsg = null

    try {
      const q =
        m.quoted || m

      const mime =
        (q.msg || q).mimetype || ""

      let imageUrl =
        args?.[0]?.trim() || ""

      if (
        !mime.includes("image") &&
        !imageUrl
      ) {
        return m.reply(
`╭━━〔 🖼️ REMOVE BACKGROUND 〕━━╮

❌ *Kirim/reply foto atau masukkan URL foto!*

📌 *Contoh:*

└ ${prefix + command}
   Reply/kirim foto

└ ${prefix + command} https://example.com/foto.jpg
   Menggunakan URL

╰━━━━━━━━━━━━━━━━━━━━╯`
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

      statusMsg =
        await sock.sendMessage(
          m.chat,
          {
            text:
`╭━━〔 🖼️ REMOVE BACKGROUND 〕━━╮

⏳ *Memproses gambar...*

▰░░░░░░░░░ 10%

╰━━━━━━━━━━━━━━━━━━━━╯`
          },
          {
            quoted: m
          }
        )

      await sleep(500)

      let imageBuffer

      if (mime.includes("image")) {
        await editStatus(
          sock,
          m,
          statusMsg,
`╭━━〔 🖼️ REMOVE BACKGROUND 〕━━╮

📥 *Mengunduh gambar...*

▰▰▰░░░░░░░ 30%

╰━━━━━━━━━━━━━━━━━━━━╯`
        )

        imageBuffer =
          await q.download()

        if (!imageBuffer) {
          throw new Error(
            "Gagal mengunduh gambar dari WhatsApp."
          )
        }
      } else {
        await editStatus(
          sock,
          m,
          statusMsg,
`╭━━〔 🖼️ REMOVE BACKGROUND 〕━━╮

🌐 *Mengambil gambar dari URL...*

▰▰▰░░░░░░░ 30%

╰━━━━━━━━━━━━━━━━━━━━╯`
        )

        imageBuffer =
          await getImageFromUrl(
            imageUrl
          )
      }

      await editStatus(
        sock,
        m,
        statusMsg,
`╭━━〔 🖼️ REMOVE BACKGROUND 〕━━╮

🤖 *AI sedang menghapus background...*

▰▰▰▰▰▰░░░░ 60%

╰━━━━━━━━━━━━━━━━━━━━╯`
      )

      const result =
        await pixa(imageBuffer)

      if (
        !result ||
        !result.length
      ) {
        throw new Error(
          "Gagal mendapatkan hasil remove background."
        )
      }

      await editStatus(
        sock,
        m,
        statusMsg,
`╭━━〔 🖼️ REMOVE BACKGROUND 〕━━╮

✨ *Background berhasil dihapus!*

▰▰▰▰▰▰▰▰▰▰ 100%

╰━━━━━━━━━━━━━━━━━━━━╯`
      )

      await sock.sendMessage(
        m.chat,
        {
          react: {
            text: "✨",
            key: m.key
          }
        }
      )

      await sleep(300)

      await sock.sendMessage(
        m.chat,
        {
          image: result,
          caption:
`╭━━━〔 ✨ REMOVE BACKGROUND 〕━━━╮

✅ *Berhasil!*

🖼️ Background foto berhasil
dihapus menggunakan AI.

📂 Format: PNG
🪄 Background: Transparent

╰━━━━━━━━━━━━━━━━━━━━━━━━━━╯

> ReyCloudSHP`
        },
        {
          quoted: m
        }
      )

      if (statusMsg?.key) {
        try {
          await sock.sendMessage(
            m.chat,
            {
              delete: statusMsg.key
            }
          )
        } catch {}
      }

    } catch (error) {
      console.error(
        "[REMOVEBG ERROR]",
        error?.response?.data ||
        error?.message ||
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
      ).catch(() => {})

      if (statusMsg?.key) {
        const edited =
          await editStatus(
            sock,
            m,
            statusMsg,
`❌ *Remove Background Gagal!*

⚠️ ${error?.message || "Unknown error"}`
          )

        if (edited) return
      }

      return m.reply(
`❌ *Remove Background Gagal!*

⚠️ ${error?.message || "Unknown error"}`
      )
    }
  }
}