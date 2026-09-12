import axios from "axios"
import FormData from "form-data"
import sharp from "sharp"

const sleep = ms =>
  new Promise(resolve => setTimeout(resolve, ms))

async function updateProgress(
  sock,
  m,
  statusMessage,
  progress,
  statusText
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

  if (!statusMessage?.key?.id) {
    return false
  }

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
`╭━━〔 😂 SMEME SYSTEM 〕━━╮

⏳ ${statusText}

[${bar}] ${progress}%

╰━━━━━━━━━━━━━━━━━━━━╯`
          }
        }
      },
      {}
    )

    return true
  } catch (err) {
    console.log(
      "[SMEME PROGRESS ERROR]",
      err?.message || err
    )

    try {
      await sock.sendMessage(
        m.chat,
        {
          text:
`╭━━〔 😂 SMEME SYSTEM 〕━━╮

⏳ ${statusText}

[${bar}] ${progress}%

╰━━━━━━━━━━━━━━━━━━━━╯`,
          edit: statusMessage.key
        }
      )

      return true
    } catch {
      return false
    }
  }
}

async function editStatus(
  sock,
  m,
  statusMessage,
  text
) {
  if (!statusMessage?.key?.id) {
    return false
  }

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
            conversation: text
          }
        }
      },
      {}
    )

    return true
  } catch (err) {
    console.log(
      "[SMEME STATUS ERROR]",
      err?.message || err
    )

    try {
      await sock.sendMessage(
        m.chat,
        {
          text,
          edit: statusMessage.key
        }
      )

      return true
    } catch {
      return false
    }
  }
}

async function uploadImage(buffer) {
  try {
    const form = new FormData()

    form.append("file", buffer, {
      filename: "meme.png",
      contentType: "image/png"
    })

    const response = await axios.post(
      "https://c.termai.cc/api/upload?key=AIzaBj7z2z3xBjsk",
      form,
      {
        headers: form.getHeaders(),
        timeout: 30000,
        maxContentLength: Infinity,
        maxBodyLength: Infinity
      }
    )

    if (
      response.data?.status &&
      response.data?.path
    ) {
      return response.data.path
    }
  } catch (error) {
    console.log(
      "[SMEME] Termai upload failed:",
      error?.response?.data ||
      error?.message ||
      error
    )
  }

  try {
    const form = new FormData()

    form.append("file", buffer, {
      filename: "meme.png",
      contentType: "image/png"
    })

    const response = await axios.post(
      "https://telegra.ph/upload",
      form,
      {
        headers: form.getHeaders(),
        timeout: 30000,
        maxContentLength: Infinity,
        maxBodyLength: Infinity
      }
    )

    if (response.data?.[0]?.src) {
      return (
        "https://telegra.ph" +
        response.data[0].src
      )
    }
  } catch (error) {
    console.log(
      "[SMEME] Telegraph upload failed:",
      error?.message || error
    )
  }

  return null
}

function encodeText(text) {
  if (!text) {
    return "_"
  }

  return encodeURIComponent(text)
    .replace(/-/g, "--")
    .replace(/_/g, "__")
    .replace(/%20/g, "_")
}

export default {
  name: "Smeme",

  command: [
    "smeme",
    "memesticker",
    "memes"
  ],

  category: "Sticker",

  description:
    "Membuat sticker meme dari gambar",

  isOwner: false,

  async run(
    sock,
    m,
    { args, prefix, command }
  ) {
    let statusMsg = null

    try {
      const isImage =
        m.isImage ||
        (m.quoted &&
          m.quoted.isImage)

      const isSticker =
        m.isSticker ||
        (m.quoted &&
          (
            m.quoted.isSticker ||
            m.quoted.type ===
              "stickerMessage"
          ))

      if (!isImage && !isSticker) {
        return m.reply(
`╭━━〔 😂 MEME STICKER 〕━━╮

❌ *Kirim atau reply gambar/sticker!*

📌 *Contoh Penggunaan:*
└ \`${prefix + command} Ketika|Kamu Lupa\`

💡 Format:
└ \`Top|Bottom\`

╰━━━━━━━━━━━━━━━━━━━━╯`
        )
      }

      const input =
        args
          .join(" ")
          .trim()

      if (
        !input ||
        !input.includes("|")
      ) {
        return m.reply(
`╭━━〔 😂 MEME STICKER 〕━━╮

❌ *Format teks tidak valid!*

📌 Gunakan format:
└ \`Top|Bottom\`

📝 Contoh:
└ \`${prefix + command} Ketika|Kamu Lupa\`

╰━━━━━━━━━━━━━━━━━━━━╯`
        )
      }

      const separatorIndex =
        input.indexOf("|")

      const top =
        input
          .slice(0, separatorIndex)
          .trim()

      const bottom =
        input
          .slice(separatorIndex + 1)
          .trim()

      if (!top && !bottom) {
        return m.reply(
          "❌ Teks meme tidak boleh kosong."
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
`╭━━〔 😂 SMEME SYSTEM 〕━━╮

⏳ Menyiapkan media...

[░░░░░░░░░░] 0%

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
        20,
        "Mengunduh gambar/sticker..."
      )

      await sleep(500)

      let mediaBuffer

      if (m.quoted) {
        mediaBuffer =
          await m.quoted.download()
      } else if (
        typeof m.download ===
        "function"
      ) {
        mediaBuffer =
          await m.download()
      }

      if (!mediaBuffer) {
        throw new Error(
          "Gagal mengunduh media."
        )
      }

      await updateProgress(
        sock,
        m,
        statusMsg,
        40,
        "Memproses ukuran gambar..."
      )

      await sleep(500)

      let imageBuffer

      try {
        imageBuffer =
          await sharp(mediaBuffer)
            .resize(512, 512, {
              fit: "contain",
              background: {
                r: 0,
                g: 0,
                b: 0,
                alpha: 0
              }
            })
            .png()
            .toBuffer()
      } catch (error) {
        console.log(
          "[SMEME] Sharp resize failed:",
          error?.message || error
        )

        imageBuffer =
          mediaBuffer
      }

      await updateProgress(
        sock,
        m,
        statusMsg,
        55,
        "Mengupload gambar..."
      )

      await sleep(500)

      const imageUrl =
        await uploadImage(
          imageBuffer
        )

      if (!imageUrl) {
        throw new Error(
          "Gagal mengupload gambar."
        )
      }

      await updateProgress(
        sock,
        m,
        statusMsg,
        75,
        "Membuat meme..."
      )

      await sleep(500)

      const topEncoded =
        encodeText(top)

      const bottomEncoded =
        encodeText(bottom)

      const memeUrl =
        `https://api.memegen.link/images/custom/` +
        `${topEncoded}/${bottomEncoded}.png` +
        `?background=${encodeURIComponent(
          imageUrl
        )}`

      const response =
        await axios.get(
          memeUrl,
          {
            responseType:
              "arraybuffer",
            timeout: 30000,
            headers: {
              "User-Agent":
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
            }
          }
        )

      const memeBuffer =
        Buffer.from(
          response.data
        )

      if (!memeBuffer.length) {
        throw new Error(
          "API meme tidak mengembalikan gambar."
        )
      }

      await updateProgress(
        sock,
        m,
        statusMsg,
        90,
        "Menambahkan WM sticker..."
      )

      await sleep(500)

      const botName =
        String(
          global.botname ||
          "ReyCloud"
        )

      const author =
        String(
          global.author ||
          "ReyCloud"
        )

      const stickerBuffer =
        await sharp(memeBuffer)
          .resize(512, 512, {
            fit: "contain",
            background: {
              r: 0,
              g: 0,
              b: 0,
              alpha: 0
            }
          })
          .webp({
            quality: 90
          })
          .toBuffer()

      await sock.sendMessage(
        m.chat,
        {
          sticker: stickerBuffer,
          packname: botName,
          author
        },
        {
          quoted: m
        }
      )

      await updateProgress(
        sock,
        m,
        statusMsg,
        100,
        "Sticker meme berhasil dibuat!"
      )

      await sleep(400)

      await sock.sendMessage(
        m.chat,
        {
          react: {
            text: "✅",
            key: m.key
          }
        }
      )

      await editStatus(
        sock,
        m,
        statusMsg,
`╭━━〔 ✅ SMEME SELESAI 〕━━╮

😂 *Meme sticker berhasil dibuat!*

🔝 *Top:* ${top.slice(0, 80)}
🔻 *Bottom:* ${bottom.slice(0, 80)}

🏷️ *Pack:* ${botName}
✍️ *Author:* ${author}

🟢 *Status:* SUCCESS

╰━━━━━━━━━━━━━━━━━━━━╯`
      )

    } catch (error) {
      console.error(
        "[SMEME ERROR]",
        error
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

      const errorMessage =
        String(
          error?.message ||
          "Terjadi kesalahan."
        ).slice(0, 200)

      if (statusMsg?.key) {
        await editStatus(
          sock,
          m,
          statusMsg,
`╭━━〔 ❌ SMEME GAGAL 〕━━╮

❌ *Gagal membuat meme sticker!*

⚠️ ${errorMessage}

╰━━━━━━━━━━━━━━━━━━━━╯`
        )

        return
      }

      return m.reply(
`╭━━〔 ❌ SMEME GAGAL 〕━━╮

❌ *Gagal membuat meme sticker!*

⚠️ ${errorMessage}

╰━━━━━━━━━━━━━━━━━━━━╯`
      )
    }
  }
}