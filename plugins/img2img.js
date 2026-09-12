import axios from "axios"
import FormData from "form-data"

const FCSI_API =
  "https://fgsi.dpdns.org/api/ai/image/img2img"

const API_KEY =
  global.config?.APIkey?.fgsi ||
  "fgsiapi-acd5b96-6d"

const sleep = ms =>
  new Promise(resolve =>
    setTimeout(resolve, ms)
  )

async function Uguu(
  buffer,
  filename
) {
  const form =
    new FormData()

  form.append(
    "files[]",
    buffer,
    {
      filename,
      contentType:
        "image/png"
    }
  )

  const res =
    await axios.post(
      "https://uguu.se/upload.php",
      form,
      {
        headers:
          form.getHeaders(),
        timeout: 30000,
        maxBodyLength:
          Infinity
      }
    )

  const url =
    res.data?.files?.[0]?.url

  if (!url) {
    throw new Error(
      "Upload ke Uguu gagal"
    )
  }

  return url
}

async function Img2Img(
  prompt,
  imageBuffer,
  filename = "upload.png"
) {
  try {
    const imageUrl =
      await Uguu(
        imageBuffer,
        filename
      )

    const startUrl =
      `${FCSI_API}?apikey=${API_KEY}&prompt=${encodeURIComponent(prompt)}&url=${encodeURIComponent(imageUrl)}`

    const start =
      await axios.get(
        startUrl,
        {
          timeout: 30000
        }
      )

    const pollUrl =
      start.data?.data?.pollUrl

    if (!pollUrl) {
      return {
        status: false,
        error:
          start.data?.error ||
          "Gagal memulai proses img2img"
      }
    }

    let result = null

    const maxAttempts = 60

    for (
      let i = 0;
      i < maxAttempts;
      i++
    ) {
      const poll =
        await axios.get(
          pollUrl,
          {
            timeout: 30000
          }
        )

      if (
        !poll.data?.status
      ) {
        return {
          status: false,
          error:
            "Polling gagal"
        }
      }

      const status =
        poll.data?.data?.status

      if (
        status === "Success"
      ) {
        result =
          poll.data.data.result
        break
      }

      if (
        status === "Failed"
      ) {
        return {
          status: false,
          error:
            "Proses img2img gagal"
        }
      }

      await sleep(2000)
    }

    if (!result) {
      return {
        status: false,
        error:
          "Timeout menunggu hasil"
      }
    }

    return {
      status: true,
      prompt,
      imageUrl,
      result
    }

  } catch (e) {
    return {
      status: false,
      error:
        e.message
    }
  }
}

export default {
  name:
    "Image to Image AI",

  command: [
    "img2img",
    "i2i"
  ],

  category:
    "AI",

  description:
    "Mengubah gambar berdasarkan petunjuk teks menggunakan AI",

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
        m.quoted
          ? m.quoted
          : m

      const mime =
        (
          q.msg ||
          q
        ).mimetype || ""

      const prompt =
        args
          .join(" ")
          .trim()

      if (
        !mime.includes(
          "image"
        )
      ) {
        return m.reply(
`╭━━〔 🎨 IMG2IMG AI 〕━━╮

❌ *Kirim atau reply foto dengan prompt!*

📌 *Contoh Penggunaan:*
└ Reply foto:
\`${prefix + command} anime style, highly detailed\`

└ Kirim foto:
\`${prefix + command} 3d render cyberpunk style\`

╰━━━━━━━━━━━━━━━━━━━━╯`
        )
      }

      if (!prompt) {
        return m.reply(
`╭━━〔 🎨 IMG2IMG AI 〕━━╮

❌ *Masukkan prompt deskripsi perubahan gambarnya!*

📌 *Contoh:*
└ \`${prefix + command} turn into anime boy with blue hair\`

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
`⏳ *Sedang memproses Img2Img AI...*

🎨 *Prompt:*
\`${prompt}\`

📌 *Proses ini membutuhkan waktu 30–60 detik.*
Mohon tunggu!`
          },
          {
            quoted: m
          }
        )

      const mediaBuffer =
        await q.download()

      if (!mediaBuffer) {
        throw new Error(
          "Gagal mengunduh gambar dari WhatsApp."
        )
      }

      const result =
        await Img2Img(
          prompt,
          mediaBuffer,
          `img2img_${Date.now()}.png`
        )

      if (
        !result?.status ||
        !result?.result
      ) {
        throw new Error(
          result?.error ||
          "Gagal menghasilkan gambar Img2Img."
        )
      }

      const resultImgUrl =
        result.result

      await sock.sendMessage(
        m.chat,
        {
          react: {
            text: "✨",
            key: m.key
          }
        }
      )

      await sock.sendMessage(
        m.chat,
        {
          image: {
            url:
              resultImgUrl
          },

          caption:
`✨ *IMG2IMG AI RESULT*

🎨 *Prompt:*
${prompt}

⚡ Powered by ReyCloudSHP`
        },
        {
          quoted: m
        }
      )

      if (
        statusMsg?.key
      ) {
        try {
          await sock.sendMessage(
            m.chat,
            {
              delete:
                statusMsg.key
            }
          )
        } catch {}
      }

    } catch (error) {
      console.error(
        "[IMG2IMG ERROR]",
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

        if (
          statusMsg?.key
        ) {
          await sock.sendMessage(
            m.chat,
            {
              delete:
                statusMsg.key
            }
          )
        }
      } catch {}

      return m.reply(
`❌ *Img2Img AI Gagal!*

⚠️ Error:
${error?.message || "Unknown error"}`
      )
    }
  }
}