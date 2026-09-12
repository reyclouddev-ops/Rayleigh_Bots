import axios from "axios"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { execFile } from "node:child_process"
import { promisify } from "node:util"

import * as cheerio from "cheerio"

import {
  prepareWAMessageMedia,
  generateWAMessageFromContent,
  proto
} from "@whiskeysockets/baileys"

const execFileAsync =
  promisify(execFile)

const __filename =
  fileURLToPath(import.meta.url)

const __dirname =
  path.dirname(__filename)

const sleep = ms =>
  new Promise(resolve =>
    setTimeout(resolve, ms)
  )

function formatNumber(integer) {
  const numb =
    parseInt(integer) || 0

  return Number(numb)
    .toLocaleString()
    .replace(/,/g, ".")
}

function formatDate(
  value,
  locale = "id-ID"
) {
  const date =
    new Date(value)

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "-"
  }

  return date.toLocaleString(
    locale,
    {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "numeric",
      minute: "numeric",
      second: "numeric"
    }
  )
}

async function tiktokv1(url) {
  try {
    const response =
      await axios.post(
        "https://www.tikwm.com/api/",
        {},
        {
          params: {
            url,
            count: 12,
            cursor: 0,
            web: 1,
            hd: 1
          },
          headers: {
            Accept:
              "application/json, text/javascript, */*; q=0.01",
            "Accept-Language":
              "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
            "Content-Type":
              "application/x-www-form-urlencoded; charset=UTF-8",
            Origin:
              "https://www.tikwm.com",
            Referer:
              "https://www.tikwm.com/",
            "User-Agent":
              "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Mobile Safari/537.36",
            "X-Requested-With":
              "XMLHttpRequest"
          },
          timeout: 30000
        }
      )

    const res =
      response?.data?.data

    if (!res) {
      return {
        status: false,
        msg:
          "Data TikTok tidak ditemukan."
      }
    }

    const data = []

    if (
      Number(res.duration) === 0 &&
      Array.isArray(res.images)
    ) {
      for (
        const image of res.images
      ) {
        if (!image) continue

        data.push({
          type: "photo",
          url: image
        })
      }
    } else {
      const wm =
        res.wmplay
          ? `https://www.tikwm.com${res.wmplay}`
          : null

      const nowm =
        res.play
          ? `https://www.tikwm.com${res.play}`
          : null

      const hd =
        res.hdplay
          ? `https://www.tikwm.com${res.hdplay}`
          : null

      if (wm) {
        data.push({
          type: "watermark",
          url: wm
        })
      }

      if (nowm) {
        data.push({
          type: "nowatermark",
          url: nowm
        })
      }

      if (hd) {
        data.push({
          type: "nowatermark_hd",
          url: hd
        })
      }
    }

    const music =
      res.music_info || {}

    const author =
      res.author || {}

    return {
      status: true,

      title:
        res.title || "-",

      taken_at:
        formatDate(
          res.create_time
        ),

      region:
        res.region || "-",

      id:
        res.id || "-",

      durations:
        res.duration || 0,

      duration:
        `${res.duration || 0} Seconds`,

      cover:
        res.cover
          ? `https://www.tikwm.com${res.cover}`
          : null,

      size_wm:
        res.wm_size || 0,

      size_nowm:
        res.size || 0,

      size_nowm_hd:
        res.hd_size || 0,

      data,

      music_info: {
        id:
          music.id || null,

        title:
          music.title || "-",

        author:
          music.author || "-",

        album:
          music.album ||
          null,

        url:
          res.music
            ? `https://www.tikwm.com${res.music}`
            : music.play || null
      },

      stats: {
        views:
          formatNumber(
            res.play_count
          ),

        likes:
          formatNumber(
            res.digg_count
          ),

        comment:
          formatNumber(
            res.comment_count
          ),

        share:
          formatNumber(
            res.share_count
          ),

        download:
          formatNumber(
            res.download_count
          )
      },

      author: {
        id:
          author.id || null,

        fullname:
          author.unique_id || "-",

        nickname:
          author.nickname || "-",

        avatar:
          author.avatar
            ? `https://www.tikwm.com${author.avatar}`
            : null
      }
    }
  } catch (error) {
    return {
      status: false,
      msg:
        error?.message ||
        "TikWM error"
    }
  }
}

async function tiktokv2(url) {
  try {
    const response =
      await axios.post(
        "https://savetik.co/api/ajaxSearch",
        new URLSearchParams({
          q: url,
          lang: "id"
        }).toString(),
        {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Linux; Android 10)",
            "Content-Type":
              "application/x-www-form-urlencoded",
            "X-Requested-With":
              "XMLHttpRequest",
            origin:
              "https://savetik.co",
            referer:
              "https://savetik.co/id1"
          },
          timeout: 30000
        }
      )

    const html =
      response?.data?.data

    if (!html) {
      throw new Error(
        "Response SaveTik kosong."
      )
    }

    const $ =
      cheerio.load(html)

    const mp4 =
      $('.dl-action a:contains("MP4")')
        .not(':contains("HD")')
        .attr("href") ||
      null

    const mp4Hd =
      $('.dl-action a:contains("HD")')
        .first()
        .attr("href") ||
      null

    const mp3 =
      $('.dl-action a:contains("MP3")')
        .first()
        .attr("href") ||
      null

    const foto =
      $('.photo-list a[href*="snapcdn"]')
        .map(
          (_, element) =>
            $(element).attr("href")
        )
        .get()
        .filter(Boolean)

    return {
      status: true,

      title:
        $("h3")
          .first()
          .text()
          .trim() || null,

      thumbnail:
        $(".image-tik img")
          .attr("src") ||
        $(".thumbnail img")
          .attr("src") ||
        null,

      mp4,

      mp4_hd:
        mp4Hd,

      mp3,

      foto
    }
  } catch (error) {
    return {
      status: false,
      msg:
        error?.message ||
        "SaveTik error"
    }
  }
}

async function updateProgress(
  sock,
  m,
  statusMessage,
  progress,
  statusText
) {
  if (!statusMessage?.key) {
    return false
  }

  progress = Math.max(
    0,
    Math.min(
      100,
      Math.round(progress)
    )
  )

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
`╭━━〔 🎵 TIKTOK SYSTEM 〕━━╮

⏳ ${statusText}

[${bar}] ${progress}%

╰━━━━━━━━━━━━━━━━━━━━╯`

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
          edit:
            statusMessage.key
        }
      )

      return true
    } catch {
      return false
    }
  }
}

async function deleteStatus(
  sock,
  statusMessage
) {
  if (!statusMessage?.key) {
    return
  }

  try {
    await sock.sendMessage(
      statusMessage.key.remoteJid,
      {
        delete:
          statusMessage.key
      }
    )
  } catch {}
}

async function sendVoiceNoteOrAudio(
  sock,
  m,
  audioUrl
) {
  if (!audioUrl) {
    return
  }

  let tempMp3 = null
  let tempOpus = null

  try {
    const response =
      await axios.get(
        audioUrl,
        {
          responseType:
            "arraybuffer",
          timeout: 30000
        }
      )

    const buffer =
      Buffer.from(
        response.data
      )

    if (!buffer.length) {
      throw new Error(
        "Audio kosong."
      )
    }

    const audioDir =
      path.join(
        process.cwd(),
        "media",
        "audio"
      )

    if (
      !fs.existsSync(audioDir)
    ) {
      fs.mkdirSync(
        audioDir,
        {
          recursive: true
        }
      )
    }

    const id =
      `${Date.now()}_${Math.random()
        .toString(36)
        .slice(2, 8)}`

    tempMp3 =
      path.join(
        audioDir,
        `temp_${id}.mp3`
      )

    tempOpus =
      path.join(
        audioDir,
        `temp_${id}.opus`
      )

    fs.writeFileSync(
      tempMp3,
      buffer
    )

    try {
      await execFileAsync(
        "ffmpeg",
        [
          "-y",
          "-i",
          tempMp3,
          "-c:a",
          "libopus",
          "-ac",
          "1",
          "-ar",
          "48000",
          tempOpus
        ],
        {
          timeout: 120000
        }
      )

      if (
        fs.existsSync(
          tempOpus
        ) &&
        fs.statSync(
          tempOpus
        ).size > 0
      ) {
        await sock.sendMessage(
          m.chat,
          {
            audio:
              fs.readFileSync(
                tempOpus
              ),
            mimetype:
              "audio/ogg; codecs=opus",
            ptt: true
          },
          {
            quoted: m
          }
        )

        return
      }
    } catch {}

    await sock.sendMessage(
      m.chat,
      {
        audio: buffer,
        mimetype:
          "audio/mpeg",
        ptt: false
      },
      {
        quoted: m
      }
    )
  } catch (error) {
    console.error(
      "[AUDIO ERROR]",
      error
    )
  } finally {
    try {
      if (
        tempMp3 &&
        fs.existsSync(tempMp3)
      ) {
        fs.unlinkSync(
          tempMp3
        )
      }
    } catch {}

    try {
      if (
        tempOpus &&
        fs.existsSync(tempOpus)
      ) {
        fs.unlinkSync(
          tempOpus
        )
      }
    } catch {}
  }
}

async function sendTikTokPhotos(
  sock,
  m,
  photos
) {
  const cards =
    await Promise.all(
      photos.map(
        async (
          imgUrl,
          index
        ) => {
          try {
            if (!imgUrl) {
              return null
            }

            const media =
              await prepareWAMessageMedia(
                {
                  image: {
                    url: imgUrl
                  }
                },
                {
                  upload:
                    sock.waUploadToServer
                }
              )

            return {
              body:
                proto.Message
                  .InteractiveMessage
                  .Body
                  .fromObject({
                    text:
                      `Slide ${index + 1} dari ${photos.length}`
                  }),

              footer:
                proto.Message
                  .InteractiveMessage
                  .Footer
                  .fromObject({
                    text:
                      "© ReyCloudSHP"
                  }),

              header:
                proto.Message
                  .InteractiveMessage
                  .Header
                  .fromObject({
                    title:
                      "TikTok Slide",
                    hasMediaAttachment:
                      true,
                    imageMessage:
                      media.imageMessage
                  }),

              nativeFlowMessage:
                proto.Message
                  .InteractiveMessage
                  .NativeFlowMessage
                  .fromObject({
                    buttons: [
                      {
                        name:
                          "cta_url",

                        buttonParamsJson:
                          JSON.stringify({
                            display_text:
                              "🔗 Lihat Gambar Asli",
                            url:
                              imgUrl
                          })
                      }
                    ]
                  })
            }
          } catch {
            return null
          }
        }
      )
    )

  const validCards =
    cards.filter(Boolean)

  if (!validCards.length) {
    return false
  }

  const carouselMsg =
    generateWAMessageFromContent(
      m.chat,
      {
        viewOnceMessage: {
          message: {
            interactiveMessage:
              proto.Message
                .InteractiveMessage
                .fromObject({
                  body:
                    proto.Message
                      .InteractiveMessage
                      .Body
                      .fromObject({
                        text:
                          `🎵 *TIKTOK SLIDE CAROUSEL*\nTotal: ${validCards.length} Foto`
                      }),

                  footer:
                    proto.Message
                      .InteractiveMessage
                      .Footer
                      .fromObject({
                        text:
                          "Powered by ReyCloudSHP"
                      }),

                  carouselMessage:
                    proto.Message
                      .InteractiveMessage
                      .CarouselMessage
                      .fromObject({
                        cards:
                          validCards
                      })
                })
          }
        }
      },
      {
        quoted: m
      }
    )

  await sock.relayMessage(
    m.chat,
    carouselMsg.message,
    {
      messageId:
        carouselMsg.key.id
    }
  )

  return true
}

function getAudioUrl(data) {
  return (
    data?.music_info?.url ||
    data?.audio ||
    data?.mp3 ||
    null
  )
}

function getVideoUrl(data) {
  if (
    Array.isArray(data?.data)
  ) {
    return (
      data.data.find(
        item =>
          item.type ===
            "nowatermark_hd" &&
          item.url
      )?.url ||

      data.data.find(
        item =>
          item.type ===
            "nowatermark" &&
          item.url
      )?.url ||

      data.data.find(
        item =>
          item.type ===
            "watermark" &&
          item.url
      )?.url ||

      null
    )
  }

  return (
    data?.mp4_hd ||
    data?.mp4 ||
    null
  )
}

export default {
  name:
    "TikTok Downloader",

  command: [
    "tiktok",
    "tt",
    "ttdl",
    "ttnowm"
  ],

  category:
    "Downloader",

  description:
    "Mengunduh video HD, audio sebagai VN PTT, atau foto slide carousel dari TikTok tanpa watermark",

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
      let url =
        args?.[0]?.trim()

      if (
        !url &&
        m.quoted?.text
      ) {
        const match =
          m.quoted.text.match(
            /https?:\/\/(?:www\.|vt\.|vm\.)?tiktok\.com\/[^\s]+/i
          )

        if (match) {
          url =
            match[0]
        }
      }

      if (
        !url ||
        !/tiktok\.com/i.test(
          url
        )
      ) {
        return sock.sendMessage(
          m.chat,
          {
            text:
`╭━━〔 🎵 TIKTOK DOWNLOADER 〕━━╮

❌ *Masukkan URL video / slide TikTok yang valid!*

📌 *Contoh Penggunaan:*
└ \`${prefix}${command} https://vt.tiktok.com/xxxx/\`

╰━━━━━━━━━━━━━━━━━━━━╯`
          },
          {
            quoted: m
          }
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
`╭━━〔 🎵 TIKTOK SYSTEM 〕━━╮

⏳ Memproses URL TikTok...

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
        "Menghubungkan ke TikTok API..."
      )

      await sleep(500)

      let data =
        await tiktokv1(url)

      if (
        !data?.status
      ) {
        await updateProgress(
          sock,
          m,
          statusMsg,
          50,
          "Beralih ke Endpoint v2..."
        )

        await sleep(500)

        data =
          await tiktokv2(url)
      }

      if (
        !data?.status
      ) {
        throw new Error(
          data?.msg ||
          "Gagal mengambil media dari link TikTok tersebut."
        )
      }

      await updateProgress(
        sock,
        m,
        statusMsg,
        100,
        "Media berhasil didapatkan!"
      )

      await sleep(400)

      await sock.sendMessage(
        m.chat,
        {
          react: {
            text: "📥",
            key: m.key
          }
        }
      )

      if (
        Array.isArray(
          data.data
        )
      ) {
        const photos =
          data.data
            .filter(
              item =>
                item?.type ===
                  "photo" &&
                item?.url
            )
            .map(
              item =>
                item.url
            )

        if (photos.length) {
          await deleteStatus(
            sock,
            statusMsg
          )

          await sendTikTokPhotos(
            sock,
            m,
            photos
          )

          const audioUrl =
            getAudioUrl(data)

          if (audioUrl) {
            await sendVoiceNoteOrAudio(
              sock,
              m,
              audioUrl
            )
          }

          return
        }
      }

      const videoNoWm =
        getVideoUrl(data)

      if (videoNoWm) {
        const caption =
`╭━━〔 🎵 TIKTOK RESULT (HD) 〕━━╮

📝 *Title:* ${data.title || "-"}
👤 *Author:* ${data.author?.nickname || "-"} (@${data.author?.fullname || "-"})
⏱️ *Duration:* ${data.duration || "-"}
👀 *Views:* ${data.stats?.views || "0"} | ❤️ *Likes:* ${data.stats?.likes || "0"}

Powered by ReyCloudSHP
╰━━━━━━━━━━━━━━━━━━━━╯`

        await deleteStatus(
          sock,
          statusMsg
        )

        await sock.sendMessage(
          m.chat,
          {
            video: {
              url:
                videoNoWm
            },
            caption
          },
          {
            quoted: m
          }
        )

        const audioUrl =
          getAudioUrl(data)

        if (audioUrl) {
          await sendVoiceNoteOrAudio(
            sock,
            m,
            audioUrl
          )
        }

        return
      }

      if (
        Array.isArray(
          data.foto
        ) &&
        data.foto.length
      ) {
        await deleteStatus(
          sock,
          statusMsg
        )

        await sendTikTokPhotos(
          sock,
          m,
          data.foto
        )

        const audioUrl =
          getAudioUrl(data)

        if (audioUrl) {
          await sendVoiceNoteOrAudio(
            sock,
            m,
            audioUrl
          )
        }

        return
      }

      const videoUrl =
        data.mp4_hd ||
        data.mp4

      if (videoUrl) {
        await deleteStatus(
          sock,
          statusMsg
        )

        await sock.sendMessage(
          m.chat,
          {
            video: {
              url: videoUrl
            },
            caption:
`🎵 *TikTok Video (HD):* ${data.title || "-"}

Powered by ReyCloudSHP`
          },
          {
            quoted: m
          }
        )

        const audioUrl =
          getAudioUrl(data)

        if (audioUrl) {
          await sendVoiceNoteOrAudio(
            sock,
            m,
            audioUrl
          )
        }

        return
      }

      throw new Error(
        "Media TikTok tidak ditemukan."
      )
    } catch (error) {
      console.error(
        "[TIKTOK ERROR]",
        error
      )

      await deleteStatus(
        sock,
        statusMsg
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

      const errMsg =
        error?.message ||
        "Terjadi kesalahan."

      const failText =
`╭━━〔 ❌ TIKTOK GAGAL 〕━━╮

❌ *TikTok Download Gagal!*

⚠️ ${String(
  errMsg
).slice(0, 150)}

╰━━━━━━━━━━━━━━━━━━━━╯`

      return sock.sendMessage(
        m.chat,
        {
          text: failText
        },
        {
          quoted: m
        }
      )
    }
  }
}
