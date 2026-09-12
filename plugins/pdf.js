import fs from "node:fs"
import path from "node:path"
import { PDFDocument } from "pdf-lib"
import sharp from "sharp"

const databaseDir = path.join(
  process.cwd(),
  "database"
)

const sessionFile = path.join(
  databaseDir,
  "sesionpdf.json"
)

const tempDir = path.join(
  databaseDir,
  "pdf-temp"
)

const SESSION_EXPIRE =
  10 * 60 * 1000

const MAX_PHOTOS = 30

const sleep = ms =>
  new Promise(resolve =>
    setTimeout(resolve, ms)
  )

function ensureDatabase() {
  if (
    !fs.existsSync(
      databaseDir
    )
  ) {
    fs.mkdirSync(
      databaseDir,
      {
        recursive: true
      }
    )
  }

  if (
    !fs.existsSync(
      tempDir
    )
  ) {
    fs.mkdirSync(
      tempDir,
      {
        recursive: true
      }
    )
  }

  if (
    !fs.existsSync(
      sessionFile
    )
  ) {
    fs.writeFileSync(
      sessionFile,
      "[]",
      "utf8"
    )
  }
}

function readSessions() {
  ensureDatabase()

  try {
    const data =
      JSON.parse(
        fs.readFileSync(
          sessionFile,
          "utf8"
        )
      )

    return Array.isArray(data)
      ? data
      : []
  } catch {
    return []
  }
}

function writeSessions(data) {
  ensureDatabase()

  fs.writeFileSync(
    sessionFile,
    JSON.stringify(
      data,
      null,
      2
    ),
    "utf8"
  )
}

function removeFile(file) {
  try {
    if (
      file &&
      fs.existsSync(file)
    ) {
      fs.unlinkSync(file)
    }
  } catch {}
}

function cleanExpiredSessions() {
  const sessions =
    readSessions()

  const now =
    Date.now()

  const active = []

  for (
    const session of sessions
  ) {
    const createdAt =
      Number(
        session.createdAt || 0
      )

    const expired =
      now - createdAt >=
      SESSION_EXPIRE

    if (expired) {
      for (
        const photo of
        session.photos || []
      ) {
        removeFile(
          photo?.path
        )
      }
    } else {
      active.push(session)
    }
  }

  if (
    active.length !==
    sessions.length
  ) {
    writeSessions(active)
  }

  return active
}

function getSessionKey(m) {
  return String(
    m?.sender ||
    m?.chat ||
    ""
  )
}

function getSession(m) {
  const key =
    getSessionKey(m)

  return (
    cleanExpiredSessions()
      .find(
        session =>
          session.user === key
      ) || null
  )
}

function saveSession(session) {
  const sessions =
    cleanExpiredSessions()

  const index =
    sessions.findIndex(
      item =>
        item.user ===
        session.user
    )

  if (index === -1) {
    sessions.push(
      session
    )
  } else {
    sessions[index] =
      session
  }

  writeSessions(
    sessions
  )
}

function deleteSession(m) {
  const key =
    getSessionKey(m)

  const sessions =
    cleanExpiredSessions()

  const session =
    sessions.find(
      item =>
        item.user === key
    )

  if (session) {
    for (
      const photo of
      session.photos || []
    ) {
      removeFile(
        photo?.path
      )
    }
  }

  const filtered =
    sessions.filter(
      item =>
        item.user !== key
    )

  writeSessions(
    filtered
  )
}

function cleanFileName(name) {
  return String(name || "")
    .trim()
    .replace(
      /\.pdf$/i,
      ""
    )
    .replace(
      /[^a-zA-Z0-9_\- ]/g,
      ""
    )
    .replace(
      /\s+/g,
      "-"
    )
    .replace(
      /-+/g,
      "-"
    )
    .replace(
      /^-|-$/g,
      ""
    )
    .slice(0, 80)
}

function getQuoted(m) {
  return m?.quoted || null
}

function getQuotedMime(m) {
  const quoted =
    getQuoted(m)

  if (!quoted) {
    return ""
  }

  const candidates = [
    quoted.mimetype,
    quoted.mimeType,
    quoted.msg?.mimetype,
    quoted.msg?.mimeType,
    quoted.message?.imageMessage?.mimetype,
    quoted.message?.documentMessage?.mimetype,
    quoted.message?.viewOnceMessage?.message?.imageMessage?.mimetype,
    quoted.message?.viewOnceMessageV2?.message?.imageMessage?.mimetype,
    quoted.message?.viewOnceMessageV2Extension?.message?.imageMessage?.mimetype,
    quoted.message?.ephemeralMessage?.message?.imageMessage?.mimetype
  ]

  for (
    const value of candidates
  ) {
    if (
      typeof value ===
        "string" &&
      value.trim()
    ) {
      return value
        .toLowerCase()
        .split(";")[0]
        .trim()
    }
  }

  return ""
}

function getQuotedFileName(m) {
  const quoted =
    getQuoted(m)

  if (!quoted) {
    return ""
  }

  const candidates = [
    quoted.fileName,
    quoted.filename,
    quoted.msg?.fileName,
    quoted.msg?.filename,
    quoted.message?.documentMessage?.fileName
  ]

  for (
    const value of candidates
  ) {
    if (
      typeof value ===
        "string" &&
      value.trim()
    ) {
      return value.trim()
    }
  }

  return ""
}

function detectImageMime(buffer) {
  if (
    !Buffer.isBuffer(buffer)
  ) {
    return ""
  }

  if (
    buffer.length >= 3 &&
    buffer[0] === 0xff &&
    buffer[1] === 0xd8 &&
    buffer[2] === 0xff
  ) {
    return "image/jpeg"
  }

  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return "image/png"
  }

  if (
    buffer.length >= 12 &&
    buffer.toString(
      "ascii",
      0,
      4
    ) === "RIFF" &&
    buffer.toString(
      "ascii",
      8,
      12
    ) === "WEBP"
  ) {
    return "image/webp"
  }

  return ""
}

function isImage(m) {
  const mime =
    getQuotedMime(m)

  if (
    mime.startsWith(
      "image/"
    )
  ) {
    return true
  }

  const filename =
    getQuotedFileName(m)

  return /\.(jpe?g|png|webp)$/i.test(
    filename
  )
}

async function downloadQuotedImage(m) {
  const quoted =
    getQuoted(m)

  if (!quoted) {
    throw new Error(
      "Foto tidak ditemukan."
    )
  }

  if (
    typeof quoted.download !==
    "function"
  ) {
    throw new Error(
      "Media tidak dapat didownload."
    )
  }

  const buffer =
    await quoted.download()

  if (
    !Buffer.isBuffer(buffer) ||
    buffer.length === 0
  ) {
    throw new Error(
      "File foto kosong."
    )
  }

  let mime =
    getQuotedMime(m)

  if (
    !mime ||
    !mime.startsWith(
      "image/"
    )
  ) {
    mime =
      detectImageMime(
        buffer
      )
  }

  if (!mime) {
    throw new Error(
      "Format foto tidak dapat dikenali."
    )
  }

  return {
    buffer,
    mime
  }
}

async function normalizeImage(
  buffer,
  mime
) {
  mime =
    String(
      mime || ""
    ).toLowerCase()

  if (
    mime.includes(
      "jpeg"
    ) ||
    mime.includes(
      "jpg"
    )
  ) {
    await sharp(buffer)
      .jpeg()
      .toBuffer()

    return {
      buffer,
      mime: "image/jpeg"
    }
  }

  if (
    mime.includes("png")
  ) {
    return {
      buffer,
      mime: "image/png"
    }
  }

  if (
    mime.includes("webp")
  ) {
    const converted =
      await sharp(buffer)
        .png()
        .toBuffer()

    return {
      buffer: converted,
      mime: "image/png"
    }
  }

  const detected =
    detectImageMime(
      buffer
    )

  if (
    detected ===
    "image/jpeg"
  ) {
    return {
      buffer,
      mime: "image/jpeg"
    }
  }

  if (
    detected ===
    "image/png"
  ) {
    return {
      buffer,
      mime: "image/png"
    }
  }

  if (
    detected ===
    "image/webp"
  ) {
    const converted =
      await sharp(buffer)
        .png()
        .toBuffer()

    return {
      buffer: converted,
      mime: "image/png"
    }
  }

  throw new Error(
    "Format gambar tidak didukung."
  )
}

async function createPDF(
  images
) {
  if (
    !Array.isArray(images) ||
    !images.length
  ) {
    throw new Error(
      "Tidak ada foto untuk dibuat PDF."
    )
  }

  const pdf =
    await PDFDocument.create()

  for (
    const image of images
  ) {
    const normalized =
      await normalizeImage(
        image.buffer,
        image.mime
      )

    let embedded

    if (
      normalized.mime ===
      "image/jpeg"
    ) {
      embedded =
        await pdf.embedJpg(
          normalized.buffer
        )
    } else {
      embedded =
        await pdf.embedPng(
          normalized.buffer
        )
    }

    const width =
      Number(
        embedded.width
      )

    const height =
      Number(
        embedded.height
      )

    if (
      !Number.isFinite(width) ||
      !Number.isFinite(height) ||
      width <= 0 ||
      height <= 0
    ) {
      throw new Error(
        "Ukuran gambar tidak valid."
      )
    }

    const maxWidth = 595
    const maxHeight = 842

    const scale =
      Math.min(
        maxWidth / width,
        maxHeight / height
      )

    const finalWidth =
      width * scale

    const finalHeight =
      height * scale

    const page =
      pdf.addPage([
        finalWidth,
        finalHeight
      ])

    page.drawImage(
      embedded,
      {
        x: 0,
        y: 0,
        width: finalWidth,
        height: finalHeight
      }
    )
  }

  return Buffer.from(
    await pdf.save()
  )
}

async function updateProgress(
  sock,
  m,
  statusMessage,
  progress,
  titleText,
  descText = ""
) {
  progress = Math.max(
    0,
    Math.min(
      100,
      Math.round(progress)
    )
  )

  if (
    !statusMessage?.key?.id
  ) {
    return
  }

  const totalBars = 10

  const filled =
    Math.round(
      (progress / 100) *
      totalBars
    )

  const bar =
    "█".repeat(filled) +
    "░".repeat(
      totalBars - filled
    )

  const text =
`╭━━〔 📄 PDF SYSTEM 〕━━╮

⏳ ${titleText}

[${bar}] ${progress}%

${
  descText
    ? `📁 ${descText}`
    : ""
}

╰━━━━━━━━━━━━━━━━━━━━╯`

  try {
    const editKey = {
      remoteJid:
        m.chat,
      id:
        statusMessage.key.id,
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
            conversation:
              text
          }
        }
      },
      {}
    )
  } catch (err) {
    console.log(
      "[PROGRESS EDIT ERROR]",
      err?.message ||
        err
    )
  }
}

async function editStatus(
  sock,
  m,
  statusMessage,
  text
) {
  if (
    !statusMessage?.key?.id
  ) {
    return false
  }

  try {
    const editKey = {
      remoteJid:
        m.chat,
      id:
        statusMessage.key.id,
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
            conversation:
              text
          }
        }
      },
      {}
    )

    return true
  } catch {
    return false
  }
}

function helpText(prefix) {
  return `
╭━━〔 📄 REYCLOUD TOPDF 〕━━╮

📸 *PHOTO → PDF*

${prefix}topdf nama
→ 1 foto langsung jadi PDF

${prefix}topdfmulti nama
→ Mulai PDF multiple foto

${prefix}addpdf
→ Tambahkan foto

${prefix}topdfstatus
→ Cek session

${prefix}topdfdone
→ Selesai & buat PDF

${prefix}topdfcancel
→ Batalkan session

━━━━━━━━━━━━━━━━━━

📌 *Contoh 1 FOTO*

Reply foto:

${prefix}topdf laporan

Hasil:
📄 laporan.pdf

━━━━━━━━━━━━━━━━━━

📚 *MULTIPLE FOTO*

1. Buat session:

${prefix}topdfmulti album

2. Reply foto:

${prefix}addpdf

3. Ulangi untuk foto berikutnya.

4. Selesai:

${prefix}topdfdone

Hasil:
📄 album.pdf

━━━━━━━━━━━━━━━━━━

📦 JPG • JPEG • PNG • WEBP
📸 Maksimal ${MAX_PHOTOS} foto
⏱️ Session 10 menit

☁️ ${global.botname || "ReyCloud"}

╰━━━━━━━━━━━━━━━━━━━━╯`
}

export default {
  name: "Photo To PDF",

  command: [
    "topdf",
    "topdfmulti",
    "addpdf",
    "topdfdone",
    "topdfstatus",
    "topdfcancel"
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
    try {
      ensureDatabase()
      cleanExpiredSessions()

      if (
        command === "topdf"
      ) {
        if (!args.length) {
          return m.reply(
            helpText(prefix)
          )
        }

        if (!m.quoted) {
          return m.reply(
`📸 *Reply foto terlebih dahulu!*

Contoh:

${prefix}topdf laporan`
          )
        }

        if (!isImage(m)) {
          return m.reply(
            "❌ File yang direply bukan foto."
          )
        }

        const fileName =
          cleanFileName(
            args.join("-")
          ) || "document"

        if (
          typeof m.react ===
          "function"
        ) {
          await m.react(
            "⏳"
          )
        }

        const statusMsg =
          await sock.sendMessage(
            m.chat,
            {
              text:
`╭━━〔 📄 PDF SYSTEM 〕━━╮

⏳ Mengunduh foto...

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
          35,
          "Mengunduh & memproses foto...",
          fileName
        )

        const image =
          await downloadQuotedImage(
            m
          )

        await sleep(300)

        await updateProgress(
          sock,
          m,
          statusMsg,
          75,
          "Mengonversi ke PDF...",
          fileName
        )

        const pdfBuffer =
          await createPDF([
            image
          ])

        await sleep(300)

        await updateProgress(
          sock,
          m,
          statusMsg,
          100,
          "Selesai!",
          fileName
        )

        await sleep(300)

        await sock.sendMessage(
          m.chat,
          {
            document:
              pdfBuffer,
            mimetype:
              "application/pdf",
            fileName:
              `${fileName}.pdf`
          },
          {
            quoted: m
          }
        )

        if (
          typeof m.react ===
          "function"
        ) {
          await m.react(
            "✅"
          )
        }

        return
      }

      if (
        command ===
        "topdfmulti"
      ) {
        const fileName =
          cleanFileName(
            args.join("-")
          )

        if (!fileName) {
          return m.reply(
`❌ Nama file wajib diisi.

Contoh:

${prefix}topdfmulti album`
          )
        }

        const oldSession =
          getSession(m)

        if (oldSession) {
          return m.reply(
`⚠️ Session PDF masih aktif.

📄 ${oldSession.name}.pdf
📸 ${oldSession.photos.length}/${MAX_PHOTOS}

${prefix}addpdf
${prefix}topdfdone
${prefix}topdfcancel`
          )
        }

        const session = {
          user:
            getSessionKey(m),
          chat:
            m.chat,
          name:
            fileName,
          photos: [],
          createdAt:
            Date.now()
        }

        saveSession(
          session
        )

        return m.reply(
`╭━━〔 📚 PDF SESSION 〕━━╮

✅ Session dibuat!

📄 File:
${fileName}.pdf

📸 Foto:
0/${MAX_PHOTOS}

━━━━━━━━━━━━━━━━━━

Reply foto lalu:

${prefix}addpdf

Ulangi untuk foto berikutnya.

Jika selesai:

${prefix}topdfdone

Batalkan:

${prefix}topdfcancel

╰━━━━━━━━━━━━━━━━━━━━╯`
        )
      }

      if (
        command ===
        "addpdf"
      ) {
        const session =
          getSession(m)

        if (!session) {
          return m.reply(
`❌ Tidak ada session PDF.

Gunakan:

${prefix}topdfmulti nama`
          )
        }

        if (!m.quoted) {
          return m.reply(
`📸 Reply foto terlebih dahulu.

${prefix}addpdf`
          )
        }

        if (!isImage(m)) {
          return m.reply(
            "❌ File yang direply bukan foto."
          )
        }

        if (
          session.photos.length >=
          MAX_PHOTOS
        ) {
          return m.reply(
`❌ Maksimal ${MAX_PHOTOS} foto telah tercapai.

Gunakan:

${prefix}topdfdone`
          )
        }

        if (
          typeof m.react ===
          "function"
        ) {
          await m.react(
            "⏳"
          )
        }

        const statusMsg =
          await sock.sendMessage(
            m.chat,
            {
              text:
`╭━━〔 📄 PDF SYSTEM 〕━━╮

⏳ Mengunduh foto ke session...

[░░░░░░░░░░] 0%

╰━━━━━━━━━━━━━━━━━━━━╯`
            },
            {
              quoted: m
            }
          )

        try {
          await updateProgress(
            sock,
            m,
            statusMsg,
            40,
            "Mengunduh foto...",
            `${session.name}.pdf`
          )

          const image =
            await downloadQuotedImage(
              m
            )

          await sleep(300)

          await updateProgress(
            sock,
            m,
            statusMsg,
            80,
            "Menormalkan gambar...",
            `${session.name}.pdf`
          )

          const normalized =
            await normalizeImage(
              image.buffer,
              image.mime
            )

          const photoName =
            `${Date.now()}_${Math.random()
              .toString(36)
              .slice(2, 9)}.png`

          const photoPath =
            path.join(
              tempDir,
              photoName
            )

          fs.writeFileSync(
            photoPath,
            normalized.buffer
          )

          session.photos.push({
            path:
              photoPath,
            mime:
              normalized.mime
          })

          session.createdAt =
            Date.now()

          saveSession(
            session
          )

          await updateProgress(
            sock,
            m,
            statusMsg,
            100,
            "Berhasil ditambahkan!",
            `${session.name}.pdf (${session.photos.length}/${MAX_PHOTOS})`
          )

          await sleep(300)

          if (
            typeof m.react ===
            "function"
          ) {
            await m.react(
              "✅"
            )
          }

          const successText =
`✅ *Foto ditambahkan!*

📄 ${session.name}.pdf
📸 ${session.photos.length}/${MAX_PHOTOS}

Tambah lagi:
${prefix}addpdf

Jika selesai:
${prefix}topdfdone`

          const edited =
            await editStatus(
              sock,
              m,
              statusMsg,
              successText
            )

          if (!edited) {
            await m.reply(
              successText
            )
          }

        } catch (error) {
          removeFile(
            statusMsg?.key?.id
          )

          if (
            typeof m.react ===
            "function"
          ) {
            await m.react(
              "❌"
            )
          }

          await editStatus(
            sock,
            m,
            statusMsg,
`❌ *Gagal menambahkan foto!*

${error?.message || "Terjadi kesalahan."}`
          )

          throw error
        }

        return
      }

      if (
        command ===
        "topdfstatus"
      ) {
        const session =
          getSession(m)

        if (!session) {
          return m.reply(
`📂 *PDF SESSION*

Tidak ada session aktif.

Gunakan:

${prefix}topdfmulti nama`
          )
        }

        const remaining =
          Math.max(
            0,
            SESSION_EXPIRE -
              (
                Date.now() -
                session.createdAt
              )
          )

        const minutes =
          Math.ceil(
            remaining /
              60000
          )

        return m.reply(
`╭━━〔 📄 PDF SESSION 〕━━╮

📄 File:
${session.name}.pdf

📸 Foto:
${session.photos.length}/${MAX_PHOTOS}

⏱️ Sisa:
±${minutes} menit

━━━━━━━━━━━━━━━━━━

${prefix}addpdf
→ Tambah foto

${prefix}topdfdone
→ Buat PDF

${prefix}topdfcancel
→ Batalkan

╰━━━━━━━━━━━━━━━━━━━━╯`
        )
      }

      if (
        command ===
        "topdfcancel"
      ) {
        const session =
          getSession(m)

        if (!session) {
          return m.reply(
            "❌ Tidak ada session PDF aktif."
          )
        }

        deleteSession(m)

        return m.reply(
`❌ *PDF session dibatalkan.*

📄 ${session.name}.pdf
📸 ${session.photos.length} foto

Temporary file telah dibersihkan.`
        )
      }

      if (
        command ===
        "topdfdone"
      ) {
        const session =
          getSession(m)

        if (!session) {
          return m.reply(
`❌ Tidak ada session PDF.

Gunakan:

${prefix}topdfmulti nama`
          )
        }

        if (
          !session.photos.length
        ) {
          return m.reply(
`❌ Belum ada foto.

Gunakan:

${prefix}addpdf`
          )
        }

        if (
          typeof m.react ===
          "function"
        ) {
          await m.react(
            "⏳"
          )
        }

        const statusMsg =
          await sock.sendMessage(
            m.chat,
            {
              text:
`╭━━〔 📄 PDF SYSTEM 〕━━╮

⏳ Mempersiapkan penggabungan...

[░░░░░░░░░░] 0%

╰━━━━━━━━━━━━━━━━━━━━╯`
            },
            {
              quoted: m
            }
          )

        try {
          await updateProgress(
            sock,
            m,
            statusMsg,
            20,
            "Memuat foto dari session...",
            `${session.name}.pdf`
          )

          await sleep(300)

          const images = []

          for (
            const photo of
            session.photos
          ) {
            if (
              !photo?.path ||
              !fs.existsSync(
                photo.path
              )
            ) {
              continue
            }

            const buffer =
              fs.readFileSync(
                photo.path
              )

            if (
              !buffer.length
            ) {
              continue
            }

            images.push({
              buffer,
              mime:
                photo.mime ||
                detectImageMime(
                  buffer
                )
            })
          }

          if (!images.length) {
            throw new Error(
              "Tidak ada foto yang dapat diproses."
            )
          }

          await updateProgress(
            sock,
            m,
            statusMsg,
            60,
            `Menggabungkan ${images.length} foto ke PDF...`,
            `${session.name}.pdf`
          )

          const pdfBuffer =
            await createPDF(
              images
            )

          await sleep(300)

          await updateProgress(
            sock,
            m,
            statusMsg,
            95,
            "Mengirim file dokumen...",
            `${session.name}.pdf`
          )

          await sock.sendMessage(
            m.chat,
            {
              document:
                pdfBuffer,
              mimetype:
                "application/pdf",
              fileName:
                `${session.name}.pdf`
            },
            {
              quoted: m
            }
          )

          deleteSession(m)

          if (
            typeof m.react ===
            "function"
          ) {
            await m.react(
              "✅"
            )
          }

          await editStatus(
            sock,
            m,
            statusMsg,
`╭━━〔 ✅ PDF SELESAI 〕━━╮

📄 File:
${session.name}.pdf

📸 Total Foto:
${images.length}

📤 PDF berhasil dibuat & dikirim.

╰━━━━━━━━━━━━━━━━━━━━╯`
          )

          return

        } catch (error) {
          if (
            typeof m.react ===
            "function"
          ) {
            await m.react(
              "❌"
            )
          }

          await editStatus(
            sock,
            m,
            statusMsg,
`╭━━〔 ❌ PDF ERROR 〕━━╮

📄 File:
${session.name}.pdf

❌ Gagal membuat PDF.

⚠️ ${error?.message || "Terjadi kesalahan."}

Session tetap aktif.
Silakan coba:
${prefix}topdfdone

╰━━━━━━━━━━━━━━━━━━━━╯`
          )

          throw error
        }
      }

    } catch (error) {
      console.error(
        "[TOPDF ERROR]",
        error
      )

      if (
        typeof m.react ===
        "function"
      ) {
        try {
          await m.react(
            "❌"
          )
        } catch {}
      }

      return m.reply(
`❌ *Gagal membuat PDF!*

${error?.message || "Terjadi kesalahan tidak diketahui."}`
      )
    }
  }
}