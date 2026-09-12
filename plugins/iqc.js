import {
  createCanvas,
  GlobalFonts,
  loadImage
} from "@napi-rs/canvas"

import https from "node:https"
import path from "node:path"
import fs from "node:fs"

const {
  existsSync
} = fs

const WA_COLORS = [
  "#E53935",
  "#D81B60",
  "#8E24AA",
  "#5E35B1",
  "#1E88E5",
  "#039BE5",
  "#00897B",
  "#43A047",
  "#F4511E",
  "#FB8C00"
]

const COLOR_FILE_NAME =
  ".color_index"

function getNextColor(rootDir) {
  let idx = 0

  const colorFile =
    path.join(
      rootDir,
      COLOR_FILE_NAME
    )

  if (existsSync(colorFile)) {
    idx =
      parseInt(
        fs.readFileSync(
          colorFile,
          "utf8"
        )
      ) || 0
  }

  const color =
    WA_COLORS[
      idx % WA_COLORS.length
    ]

  try {
    fs.writeFileSync(
      colorFile,
      String(
        (idx + 1) %
          WA_COLORS.length
      )
    )
  } catch {}

  return color
}

const config = {
  canvas: {
    width: 1920,
    height: 3413
  },

  safeZones: {
    namaAtas: {
      a: 980,
      b: 1080,
      c: 250,
      d: 630,
      fontSize: 55,
      maxChars: 25,
      font: "SFProSemiBold",
      align: "left"
    },

    foto: {
      a: 1125,
      b: 1713,
      c: 240,
      d: 830,
      radius: 28
    },

    waktu: {
      a: 1750,
      b: 1860,
      c: 233,
      d: 424,
      fontSize: 45,
      maxChars: 10,
      font: "SFProRegular",
      textColor: "#555555",
      align: "center"
    },

    namaBawah: {
      a: 2701,
      b: 2880,
      c: 700,
      d: 1160,
      centerY: 2787,
      fontSize: 67,
      maxChars: 25,
      font: "SFProSemiBold",
      textColor: "#100e0e",
      align: "left"
    }
  }
}

function download(url, dest) {
  return new Promise(
    (resolve, reject) => {
      if (
        existsSync(dest) &&
        fs.statSync(dest).size > 0
      ) {
        return resolve()
      }

      fs.mkdirSync(
        path.dirname(dest),
        {
          recursive: true
        }
      )

      const file =
        fs.createWriteStream(dest)

      https
        .get(url, res => {
          if (
            [
              301,
              302,
              303,
              307,
              308
            ].includes(
              res.statusCode
            )
          ) {
            file.close(() => {
              if (existsSync(dest)) {
                fs.unlinkSync(dest)
              }

              if (!res.headers.location) {
                return reject(
                  new Error(
                    "Redirect URL tidak ditemukan"
                  )
                )
              }

              download(
                res.headers.location,
                dest
              )
                .then(resolve)
                .catch(reject)
            })

            return
          }

          if (
            res.statusCode !== 200
          ) {
            file.close(() => {
              if (existsSync(dest)) {
                fs.unlinkSync(dest)
              }

              reject(
                new Error(
                  `HTTP ${res.statusCode} untuk ${url}`
                )
              )
            })

            return
          }

          res.pipe(file)

          file.on(
            "finish",
            () => {
              file.close(() => {
                if (
                  !existsSync(dest) ||
                  fs.statSync(dest).size <= 0
                ) {
                  return reject(
                    new Error(
                      `Asset gagal disimpan: ${dest}`
                    )
                  )
                }

                resolve()
              })
            }
          )
        })
        .on(
          "error",
          err => {
            file.close(() => {
              if (existsSync(dest)) {
                fs.unlinkSync(dest)
              }

              reject(err)
            })
          }
        )
    }
  )
}

async function prepareRemoteAssets(
  fontsDir,
  bgDir,
  imgDir
) {
  const remoteAssets = [
    {
      url:
        "https://raw.githubusercontent.com/Ditzzx-vibecoder/Assets/main/Font/SFPRODISPLAYREGULAR.OTF",
      dest:
        path.join(
          fontsDir,
          "SFPRODISPLAYREGULAR.OTF"
        )
    },

    {
      url:
        "https://raw.githubusercontent.com/Ditzzx-vibecoder/Assets/main/Font/SFPRODISPLAYSEMIBOLD.ttf",
      dest:
        path.join(
          fontsDir,
          "SFPRODISPLAYSEMIBOLD.ttf"
        )
    },

    {
      url:
        "https://raw.githubusercontent.com/Ditzzx-vibecoder/Assets/main/Image/bg.jpg",
      dest:
        path.join(
          bgDir,
          "bg.jpg"
        )
    }
  ]

  for (
    const asset of remoteAssets
  ) {
    await download(
      asset.url,
      asset.dest
    )
  }
}

function findFontFile(
  dir,
  basenames
) {
  if (!existsSync(dir)) {
    return null
  }

  const files =
    fs.readdirSync(dir)

  for (
    const base of basenames
  ) {
    const match =
      files.find(
        file =>
          file.toLowerCase() ===
          base.toLowerCase()
      )

    if (match) {
      return path.join(
        dir,
        match
      )
    }
  }

  return null
}

let fontsRegistered = false

function registerFonts(
  fontsDir
) {
  if (fontsRegistered) {
    return
  }

  const semiBoldFile =
    findFontFile(
      fontsDir,
      [
        "SFPRODISPLAYSEMIBOLD.TTF",
        "SFPRODISPLAYSEMIBOLD.OTF"
      ]
    )

  const regularFile =
    findFontFile(
      fontsDir,
      [
        "SFPRODISPLAYREGULAR.OTF",
        "SFPRODISPLAYREGULAR.TTF"
      ]
    )

  if (semiBoldFile) {
    GlobalFonts.registerFromPath(
      semiBoldFile,
      "SFProSemiBold"
    )
  }

  if (regularFile) {
    GlobalFonts.registerFromPath(
      regularFile,
      "SFProRegular"
    )
  }

  fontsRegistered = true
}

function roundedClipPath(
  ctx,
  x,
  y,
  w,
  h,
  r
) {
  ctx.beginPath()

  ctx.moveTo(
    x + r,
    y
  )

  ctx.lineTo(
    x + w - r,
    y
  )

  ctx.quadraticCurveTo(
    x + w,
    y,
    x + w,
    y + r
  )

  ctx.lineTo(
    x + w,
    y + h - r
  )

  ctx.quadraticCurveTo(
    x + w,
    y + h,
    x + w - r,
    y + h
  )

  ctx.lineTo(
    x + r,
    y + h
  )

  ctx.quadraticCurveTo(
    x,
    y + h,
    x,
    y + h - r
  )

  ctx.lineTo(
    x,
    y + r
  )

  ctx.quadraticCurveTo(
    x,
    y,
    x + r,
    y
  )

  ctx.closePath()
}

function drawText(
  ctx,
  text,
  zone,
  textColor
) {
  const {
    a,
    b,
    c,
    d,
    fontSize,
    maxChars,
    font,
    align,
    centerY
  } = zone

  const str =
    String(text).slice(
      0,
      maxChars
    )

  const boxW =
    d - c

  const boxH =
    b - a

  const cy =
    centerY !== undefined
      ? centerY
      : a + boxH / 2

  const weight =
    font === "SFProSemiBold"
      ? "bold"
      : "normal"

  let size =
    fontSize

  ctx.textBaseline =
    "middle"

  while (size > 12) {
    ctx.font =
      `${weight} ${size}px ${font}`

    if (
      ctx.measureText(str)
        .width <= boxW
    ) {
      break
    }

    size -= 1
  }

  ctx.font =
    `${weight} ${size}px ${font}`

  ctx.fillStyle =
    textColor

  if (align === "center") {
    ctx.textAlign =
      "center"

    ctx.fillText(
      str,
      c + boxW / 2,
      cy
    )
  } else {
    ctx.textAlign =
      "left"

    ctx.fillText(
      str,
      c,
      cy
    )
  }
}

async function drawFoto(
  ctx,
  imageBuffer,
  zone
) {
  const {
    a,
    b,
    c,
    d,
    radius
  } = zone

  const x = c
  const y = a
  const w = d - c
  const h = b - a
  const r =
    radius || 28

  const img =
    await loadImage(
      imageBuffer
    )

  const imgRatio =
    img.width /
    img.height

  const boxRatio =
    w / h

  ctx.save()

  roundedClipPath(
    ctx,
    x,
    y,
    w,
    h,
    r
  )

  ctx.clip()

  ctx.filter =
    "blur(28px)"

  ctx.drawImage(
    img,
    x - 40,
    y - 40,
    w + 80,
    h + 80
  )

  ctx.filter =
    "none"

  let fw
  let fh

  if (
    imgRatio > boxRatio
  ) {
    fw = w
    fh =
      fw / imgRatio
  } else {
    fh = h
    fw =
      fh * imgRatio
  }

  ctx.drawImage(
    img,
    x + (w - fw) / 2,
    y + (h - fh) / 2,
    fw,
    fh
  )

  ctx.restore()
}

export default {
  name:
    "IQC Generator",

  command: [
    "iqc",
    "quotecard",
    "quoteimage"
  ],

  category:
    "Maker",

  description:
    "Membuat quote gambar ala iPhone chat menggunakan custom foto dan nama",

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

      if (
        !mime.includes(
          "image"
        )
      ) {
        return m.reply(
`❌ *Format salah!*

Silakan reply/balas foto dengan format:
\`${prefix + command} Nama | Waktu\`

📌 *Contoh:*
\`${prefix + command} mie ayam | 13.56\``
        )
      }

      const textPayload =
        args.join(" ")

      const [
        namaInput,
        waktuInput
      ] =
        textPayload.split("|")

      const nama =
        namaInput
          ? namaInput.trim()
          : "mie ayam."

      const waktu =
        waktuInput
          ? waktuInput.trim()
          : "13.56"

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
              "⏳ *Sedang menyiapkan aset dan merender IQC Canvas...*"
          },
          {
            quoted: m
          }
        )

      const rootDir =
        process.cwd()

      const assetsDir =
        path.join(
          rootDir,
          "assets"
        )

      const fontsDir =
        path.join(
          assetsDir,
          "fonts"
        )

      const bgDir =
        path.join(
          assetsDir,
          "backgrounds"
        )

      await prepareRemoteAssets(
        fontsDir,
        bgDir,
        assetsDir
      )

      registerFonts(
        fontsDir
      )

      const namaColor =
        getNextColor(
          rootDir
        )

      const {
        width,
        height
      } =
        config.canvas

      const canvas =
        createCanvas(
          width,
          height
        )

      const ctx =
        canvas.getContext(
          "2d"
        )

      const bgPath =
        path.join(
          bgDir,
          "bg.jpg"
        )

      if (
        existsSync(bgPath)
      ) {
        const bgImg =
          await loadImage(
            bgPath
          )

        ctx.drawImage(
          bgImg,
          0,
          0,
          width,
          height
        )
      } else {
        ctx.fillStyle =
          "#f0ece4"

        ctx.fillRect(
          0,
          0,
          width,
          height
        )
      }

      const photoBuffer =
        await q.download()

      if (!photoBuffer) {
        throw new Error(
          "Gagal mengunduh gambar dari pesan yang direply."
        )
      }

      await drawFoto(
        ctx,
        photoBuffer,
        config.safeZones.foto
      )

      drawText(
        ctx,
        nama,
        config.safeZones.namaAtas,
        namaColor
      )

      drawText(
        ctx,
        waktu,
        config.safeZones.waktu,
        config.safeZones.waktu.textColor
      )

      drawText(
        ctx,
        nama,
        config.safeZones.namaBawah,
        config.safeZones.namaBawah.textColor
      )

      const resultBuffer =
        await canvas.encode(
          "png"
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

      await sock.sendMessage(
        m.chat,
        {
          image:
            resultBuffer,

          caption:
`✨ *IQC GENERATOR SUCCESS*

👤 *Nama:* ${nama}
⏰ *Waktu:* ${waktu}`
        },
        {
          quoted: m
        }
      )

      return sock.sendMessage(
        m.chat,
        {
          delete:
            statusMsg.key
        }
      )

    } catch (error) {
      console.error(
        "[IQC ERROR]",
        error
      )

      if (
        statusMsg?.key
      ) {
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

          await sock.sendMessage(
            m.chat,
            {
              text:
`❌ *IQC Generator Gagal!*

⚠️ Error: ${error.message}`,

              edit:
                statusMsg.key
            }
          )

          return
        } catch {}
      }

      return m.reply(
`❌ *IQC Generator Gagal!*

⚠️ Error: ${error.message}`
      )
    }
  }
}