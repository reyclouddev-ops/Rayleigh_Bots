import axios from "axios"
import FormData from "form-data"

const CLOUDINARY_URL =
  "https://api.cloudinary.com/v1_1/dtz0urit6/auto/upload"

const SIGN_URL =
  "https://cloudinary-tools.netlify.app/.netlify/functions/sign-upload-params"

const API_KEY =
  "985946268373735"

const UPLOAD_PRESET =
  "cloudinary-tools"

const USER_AGENT =
  "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Mobile Safari/537.36"

async function getSignature() {
  const timestamp =
    Math.floor(Date.now() / 1000)

  const { data } =
    await axios.post(
      SIGN_URL,
      {
        paramsToSign: {
          timestamp,
          upload_preset:
            UPLOAD_PRESET,
          source: "ml"
        }
      },
      {
        headers: {
          "Content-Type":
            "application/json",
          Origin:
            "https://cloudinary-tools.netlify.app",
          Referer:
            "https://cloudinary-tools.netlify.app/",
          "User-Agent":
            USER_AGENT
        }
      }
    )

  if (!data?.signature) {
    throw new Error(
      "Gagal mendapatkan signature Cloudinary."
    )
  }

  return {
    signature:
      data.signature,
    timestamp
  }
}

async function upscaleImage(
  fileInput,
  filename = "image.jpg"
) {
  try {
    let file =
      fileInput

    if (
      typeof fileInput ===
        "string" &&
      (
        fileInput.startsWith(
          "http://"
        ) ||
        fileInput.startsWith(
          "https://"
        )
      )
    ) {
      const response =
        await axios.get(
          fileInput,
          {
            responseType:
              "arraybuffer"
          }
        )

      file =
        Buffer.from(
          response.data
        )
    }

    let safeFilename =
      filename

    if (
      safeFilename
        .toLowerCase()
        .endsWith(".jpg")
    ) {
      safeFilename =
        safeFilename.replace(
          /\.jpg$/i,
          ".jpeg"
        )
    }

    if (
      !safeFilename.includes(".")
    ) {
      safeFilename =
        "image.jpeg"
    }

    const sig =
      await getSignature()

    const form =
      new FormData()

    form.append(
      "file",
      file,
      {
        filename:
          safeFilename
      }
    )

    form.append(
      "upload_preset",
      UPLOAD_PRESET
    )

    form.append(
      "source",
      "ml"
    )

    form.append(
      "api_key",
      API_KEY
    )

    form.append(
      "signature",
      sig.signature
    )

    form.append(
      "timestamp",
      sig.timestamp
    )

    const { data } =
      await axios.post(
        CLOUDINARY_URL,
        form,
        {
          headers: {
            ...form.getHeaders(),
            Origin:
              "https://upload-widget.cloudinary.com",
            Referer:
              "https://upload-widget.cloudinary.com/",
            "User-Agent":
              USER_AGENT
          }
        }
      )

    if (
      !data?.public_id
    ) {
      throw new Error(
        "Gagal mendapatkan public_id Cloudinary."
      )
    }

    const upscaledUrl =
      `https://res.cloudinary.com/dtz0urit6/image/upload/f_jpg,e_upscale,q_auto/${data.public_id}.jpg`

    return {
      status: true,
      creator:
        "ReyCloudSHP",
      public_id:
        data.public_id,
      original_url:
        data.secure_url,
      url:
        upscaledUrl
    }

  } catch (err) {
    throw new Error(
      err.response
        ? JSON.stringify(
            err.response.data
          )
        : err.message
    )
  }
}

export default {
  name:
    "Upscale HD",

  command: [
    "upscale",
    "hd",
    "remini"
  ],

  category:
    "Tools",

  async run(
    sock,
    m,
    { text }
  ) {
    let statusMsg = null

    try {
      const qm =
        m.quoted
          ? m.quoted
          : m

      const mime =
        (
          qm.msg ||
          qm
        ).mimetype ||
        ""

      if (
        !mime ||
        (
          !mime.includes(
            "image/jpeg"
          ) &&
          !mime.includes(
            "image/jpg"
          ) &&
          !mime.includes(
            "image/png"
          )
        )
      ) {
        return m.reply(
          "❌ ☇ Kirim atau balas/reply gambar (JPG/JPEG/PNG) dengan caption `.upscale`!"
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
              "⏳ *[1/2]* Mengunduh & memproses gambar..."
          },
          {
            quoted: m
          }
        )

      const mediaBuffer =
        await qm.download()

      let filename =
        "image.jpg"

      if (
        mime.includes("png")
      ) {
        filename =
          "image.png"
      }

      try {
        await sock.sendMessage(
          m.chat,
          {
            protocolMessage: {
              key: {
                remoteJid:
                  m.chat,
                id:
                  statusMsg.key.id,
                fromMe:
                  true
              },
              type: 14,
              editedMessage: {
                conversation:
                  "⏳ *[2/2]* Mengirim ke server upscale..."
              }
            }
          }
        )
      } catch {}

      const result =
        await upscaleImage(
          mediaBuffer,
          filename
        )

      const resultUrl =
        result?.url

      if (!resultUrl) {
        throw new Error(
          "Gagal mendapatkan URL hasil upscale."
        )
      }

      try {
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

      await sock.sendMessage(
        m.chat,
        {
          react: {
            text: "✅",
            key: m.key
          }
        }
      )

      return sock.sendMessage(
        m.chat,
        {
          image: {
            url:
              resultUrl
          },

          caption:
`✨ *UPSCALE SUCCESS*

Berhasil memperjelas kualitas gambar!

Powered by ReyCloudSHP`
        },
        {
          quoted: m
        }
      )

    } catch (err) {
      console.error(
        "[UPSCALE ERROR]",
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
`❌ Terjadi kesalahan:

${err?.message || "Unknown error"}`
      )
    }
  }
}