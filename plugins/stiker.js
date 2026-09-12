import fs from "node:fs"
import path from "node:path"
import { execFile } from "node:child_process"
import { promisify } from "node:util"

const execFileAsync = promisify(execFile)

const sleep = ms =>
  new Promise(resolve => setTimeout(resolve, ms))

async function writeExif(webpBuffer, packname, author) {
  const tempDir = path.join(
    process.cwd(),
    "temp"
  )

  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, {
      recursive: true
    })
  }

  const id = `${Date.now()}_${Math.random()
    .toString(36)
    .slice(2, 8)}`

  const tmpIn = path.join(
    tempDir,
    `exif_in_${id}.webp`
  )

  const tmpOut = path.join(
    tempDir,
    `exif_out_${id}.webp`
  )

  const json = {
    "sticker-pack-id":
      "https://github.com/Reyz4YouXGod",
    "sticker-pack-name":
      String(packname || "ReyCloud"),
    "sticker-pack-publisher":
      String(author || "Reyz4YouXGod"),
    emojis: ["✨", "🔥"]
  }

  const exifAttr = Buffer.from([
    0x49,
    0x49,
    0x2A,
    0x00,
    0x08,
    0x00,
    0x00,
    0x00,
    0x01,
    0x00,
    0x41,
    0x57,
    0x07,
    0x00,
    0x00,
    0x00,
    0x00,
    0x00,
    0x16,
    0x00,
    0x00,
    0x00
  ])

  const jsonBuffer =
    Buffer.from(
      JSON.stringify(json),
      "utf8"
    )

  const exif = Buffer.concat([
    exifAttr,
    jsonBuffer
  ])

  exif.writeUIntLE(
    jsonBuffer.length,
    14,
    4
  )

  try {
    fs.writeFileSync(
      tmpIn,
      webpBuffer
    )

    fs.writeFileSync(
      tmpOut,
      webpBuffer
    )

    try {
      await execFileAsync(
        "webpmux",
        [
          "-set",
          "exif",
          tmpIn,
          "-o",
          tmpOut
        ]
      )
    } catch {}

    if (
      fs.existsSync(tmpOut) &&
      fs.statSync(tmpOut).size > 0
    ) {
      return fs.readFileSync(
        tmpOut
      )
    }

    return webpBuffer
  } finally {
    try {
      if (fs.existsSync(tmpIn)) {
        fs.unlinkSync(tmpIn)
      }
    } catch {}

    try {
      if (fs.existsSync(tmpOut)) {
        fs.unlinkSync(tmpOut)
      }
    } catch {}
  }
}

async function editStatus(
  sock,
  m,
  statusMessage,
  text
) {
  if (!statusMessage?.key) {
    return false
  }

  try {
    const editKey = {
      remoteJid: m.chat,
      id: statusMessage.key.id,
      fromMe: true
    }

    if (
      statusMessage.key.participant
    ) {
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
  } catch {
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

async function getMediaBuffer(
  m,
  urlArg
) {
  if (urlArg) {
    const response =
      await fetch(urlArg, {
        headers: {
          "User-Agent":
            "Mozilla/5.0"
        }
      })

    if (!response.ok) {
      throw new Error(
        `Gagal mengambil media dari URL. HTTP ${response.status}`
      )
    }

    const buffer =
      Buffer.from(
        await response.arrayBuffer()
      )

    if (!buffer.length) {
      throw new Error(
        "Media dari URL kosong."
      )
    }

    return buffer
  }

  if (
    m.quoted &&
    typeof m.quoted.download ===
      "function"
  ) {
    const buffer =
      await m.quoted.download()

    if (!buffer) {
      throw new Error(
        "Gagal mendownload media."
      )
    }

    return buffer
  }

  if (
    typeof m.download ===
    "function"
  ) {
    const buffer =
      await m.download()

    if (!buffer) {
      throw new Error(
        "Gagal mendownload media."
      )
    }

    return buffer
  }

  throw new Error(
    "Media tidak dapat didownload."
  )
}

export default {
  name: "Sticker",

  command: [
    "sticker",
    "s",
    "stiker"
  ],

  category: "Maker",

  description:
    "Membuat sticker dari gambar atau video",

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
    let statusMessage = null
    let tempInput = null
    let tempOutput = null

    try {
      let isImage =
        m.isImage ||
        (m.quoted &&
          m.quoted.isImage)

      let isVideo =
        m.isVideo ||
        (m.quoted &&
          m.quoted.isVideo)

      const urlArg =
        args?.find(arg =>
          /^https?:\/\//i.test(
            arg
          )
        )

      const templates =
`╭━━〔 🖼️ STICKER MAKER 〕━━╮

Format:
Kirim atau reply gambar/video
${prefix}${command}

Opsi URL:
${prefix}${command} <url_gambar>

╰━━━━━━━━━━━━━━━━━━━━╯`

      if (
        !isImage &&
        !isVideo &&
        !urlArg
      ) {
        return m.reply(
          templates
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

      statusMessage =
        await sock.sendMessage(
          m.chat,
          {
            text:
`╭━━〔 🖼️ STICKER MAKER 〕━━╮

⏳ Status: Memproses media...

[░░░░░░░░░░] 0%

📥 Mengambil file dari target...

╰━━━━━━━━━━━━━━━━━━━━╯`
          },
          {
            quoted: m
          }
        )

      await sleep(500)

      await editStatus(
        sock,
        m,
        statusMessage,
`╭━━〔 🖼️ STICKER MAKER 〕━━╮

⏳ Status: Mengunduh media...

[████░░░░░░] 40%

📥 Mendownload file...

╰━━━━━━━━━━━━━━━━━━━━╯`
      )

      const mediaBuffer =
        await getMediaBuffer(
          m,
          urlArg
        )

      if (urlArg) {
        isImage = true
        isVideo = false
      } else if (
        m.quoted
      ) {
        if (
          m.quoted.isVideo
        ) {
          isVideo = true
          isImage = false
        } else if (
          m.quoted.isImage
        ) {
          isImage = true
          isVideo = false
        }
      }

      await editStatus(
        sock,
        m,
        statusMessage,
`╭━━〔 🖼️ STICKER MAKER 〕━━╮

⏳ Status: Mengonversi ke stiker...

[██████░░░░] 60%

⚙️ Menyiapkan FFmpeg...

╰━━━━━━━━━━━━━━━━━━━━╯`
      )

      const packname =
        String(
          global.botname ||
          global.packname ||
          "ReyCloud"
        )

      const author =
        String(
          global.author ||
          "Reyz4YouXGod"
        )

      const tempDir =
        path.join(
          process.cwd(),
          "temp"
        )

      if (
        !fs.existsSync(tempDir)
      ) {
        fs.mkdirSync(
          tempDir,
          {
            recursive: true
          }
        )
      }

      const fileId =
        `${Date.now()}_${Math.random()
          .toString(36)
          .slice(2, 8)}`

      const ext =
        isVideo
          ? "mp4"
          : "png"

      tempInput =
        path.join(
          tempDir,
          `stiker_in_${fileId}.${ext}`
        )

      tempOutput =
        path.join(
          tempDir,
          `stiker_out_${fileId}.webp`
        )

      fs.writeFileSync(
        tempInput,
        mediaBuffer
      )

      if (isImage) {
        await execFileAsync(
          "ffmpeg",
          [
            "-y",
            "-i",
            tempInput,
            "-vf",
            "scale=512:512:force_original_aspect_ratio=decrease,format=rgba,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=#00000000",
            "-c:v",
            "libwebp",
            "-lossless",
            "1",
            "-q:v",
            "80",
            "-loop",
            "0",
            "-an",
            "-vsync",
            "0",
            tempOutput
          ],
          {
            timeout: 120000
          }
        )
      } else if (isVideo) {
        await execFileAsync(
          "ffmpeg",
          [
            "-y",
            "-i",
            tempInput,
            "-t",
            "10",
            "-vf",
            "scale=512:512:force_original_aspect_ratio=decrease,format=rgba,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=#00000000,fps=15",
            "-c:v",
            "libwebp",
            "-lossless",
            "0",
            "-compression_level",
            "6",
            "-q:v",
            "50",
            "-loop",
            "0",
            "-an",
            "-vsync",
            "0",
            tempOutput
          ],
          {
            timeout: 120000
          }
        )
      } else {
        throw new Error(
          "Format media tidak didukung."
        )
      }

      if (
        !fs.existsSync(
          tempOutput
        ) ||
        fs.statSync(
          tempOutput
        ).size <= 0
      ) {
        throw new Error(
          "Gagal mengonversi file menjadi WebP."
        )
      }

      await editStatus(
        sock,
        m,
        statusMessage,
`╭━━〔 🖼️ STICKER MAKER 〕━━╮

⏳ Status: Menambahkan metadata...

[████████░░] 80%

🏷️ Pack: ${packname}
✍️ Author: ${author}

╰━━━━━━━━━━━━━━━━━━━━╯`
      )

      let stickerBuffer =
        fs.readFileSync(
          tempOutput
        )

      stickerBuffer =
        await writeExif(
          stickerBuffer,
          packname,
          author
        )

      await sock.sendMessage(
        m.chat,
        {
          sticker:
            stickerBuffer
        },
        {
          quoted: m
        }
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

      await editStatus(
        sock,
        m,
        statusMessage,
`╭━━〔 ✅ STICKER SELESAI 〕━━╮

[██████████] 100%

✅ Stiker berhasil dibuat!

📦 Pack: ${packname}
✍️ Author: ${author}

🟢 Status: COMPLETED

╰━━━━━━━━━━━━━━━━━━━━╯`
      )
    } catch (error) {
      console.error(
        "[STICKER ERROR]",
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

      if (
        statusMessage?.key
      ) {
        await editStatus(
          sock,
          m,
          statusMessage,
`╭━━〔 ❌ STICKER GAGAL 〕━━╮

❌ *Pembuatan stiker gagal!*

⚠️ Error:
${String(
  error?.message ||
  error ||
  "Terjadi kesalahan."
).slice(0, 1000)}

╰━━━━━━━━━━━━━━━━━━━━╯`
        )
      } else {
        return m.reply(
`╭━━〔 ❌ STICKER GAGAL 〕━━╮

❌ *Pembuatan stiker gagal!*

⚠️ Error:
${String(
  error?.message ||
  error ||
  "Terjadi kesalahan."
)}

╰━━━━━━━━━━━━━━━━━━━━━━╯`
        )
      }
    } finally {
      try {
        if (
          tempInput &&
          fs.existsSync(tempInput)
        ) {
          fs.unlinkSync(
            tempInput
          )
        }
      } catch {}

      try {
        if (
          tempOutput &&
          fs.existsSync(tempOutput)
        ) {
          fs.unlinkSync(
            tempOutput
          )
        }
      } catch {}
    }
  }
}