import * as geografisModule from "geografis"

const geografis =
  geografisModule.default || geografisModule

function getConfig() {
  if (!global.searchname) {
    global.searchname = {}
  }

  return global.searchname
}

function cleanText(text) {
  return String(text ?? "")
    .replace(/[*_~`]/g, "")
    .trim()
}

function normalize(text) {
  return cleanText(text)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
}

function getName(item) {
  return (
    item.village ||
    item.desa ||
    item.kelurahan ||
    item.name ||
    item.district ||
    item.kecamatan ||
    item.city ||
    item.kabupaten ||
    item.regency ||
    item.province ||
    item.provinsi ||
    ""
  )
}

function getScore(item, query) {
  const q = normalize(query)
  const name = normalize(getName(item))

  if (!name || !q) {
    return 0
  }

  if (name === q) {
    return 100
  }

  if (name.startsWith(q)) {
    return 90
  }

  if (name.includes(q)) {
    return 80
  }

  const queryWords = q.split(" ")
  let matched = 0

  for (const word of queryWords) {
    if (
      word &&
      name.includes(word)
    ) {
      matched++
    }
  }

  if (!queryWords.length) {
    return 0
  }

  return (
    matched /
    queryWords.length *
    70
  )
}

function getValue(item, keys) {
  for (const key of keys) {
    if (
      item[key] !== undefined &&
      item[key] !== null &&
      String(item[key]).trim() !== ""
    ) {
      return item[key]
    }
  }

  return "-"
}

function formatCoordinate(value, type) {
  const number = Number(value)

  if (!Number.isFinite(number)) {
    return "-"
  }

  const direction =
    type === "latitude"
      ? number >= 0
        ? "N"
        : "S"
      : number >= 0
        ? "E"
        : "W"

  return `${Math.abs(number).toFixed(6)}° ${direction}`
}

function formatResult(item, index) {
  const name = cleanText(
    getValue(item, [
      "village",
      "desa",
      "kelurahan",
      "name"
    ])
  )

  const district = cleanText(
    getValue(item, [
      "district",
      "kecamatan"
    ])
  )

  const city = cleanText(
    getValue(item, [
      "city",
      "kabupaten",
      "regency",
      "kota"
    ])
  )

  const province = cleanText(
    getValue(item, [
      "province",
      "provinsi"
    ])
  )

  const code = cleanText(
    getValue(item, [
      "code",
      "kode",
      "kode_wilayah",
      "id"
    ])
  )

  const postal = cleanText(
    getValue(item, [
      "postal",
      "postal_code",
      "kode_pos",
      "postcode"
    ])
  )

  const latitude = Number(
    getValue(item, [
      "latitude",
      "lat"
    ])
  )

  const longitude = Number(
    getValue(item, [
      "longitude",
      "lng",
      "lon"
    ])
  )

  const elevation = Number(
    getValue(item, [
      "elevation",
      "elevasi"
    ])
  )

  let text =
`*${index + 1}. ${name || "Tidak diketahui"}*`

  text +=
`\n├ Kecamatan: ${district || "-"}`

  text +=
`\n├ Kabupaten/Kota: ${city || "-"}`

  text +=
`\n├ Provinsi: ${province || "-"}`

  text +=
`\n├ Kode Pos: ${postal || "-"}`

  text +=
`\n├ Kode Wilayah: ${code || "-"}`

  if (
    Number.isFinite(latitude) &&
    Number.isFinite(longitude)
  ) {
    text +=
`\n├ Latitude: ${formatCoordinate(
      latitude,
      "latitude"
    )}`

    text +=
`\n├ Longitude: ${formatCoordinate(
      longitude,
      "longitude"
    )}`
  } else {
    text +=
`\n├ Koordinat: -`
  }

  if (Number.isFinite(elevation)) {
    text +=
`\n└ Elevasi: ${elevation} mdpl`
  } else {
    text +=
`\n└ Elevasi: -`
  }

  return text
}

function extractResults(result) {
  if (Array.isArray(result)) {
    return result
  }

  if (Array.isArray(result?.data)) {
    return result.data
  }

  if (Array.isArray(result?.results)) {
    return result.results
  }

  if (Array.isArray(result?.result)) {
    return result.result
  }

  return []
}

export default {
  name: "Search Name",

  command: [
    "searchname",
    "carinama",
    "wilayah"
  ],

  category: "Tools",

  description:
    "Mencari nama wilayah Indonesia",

  isOwner: false,

  async run(sock, m, { text }) {
    try {
      const query =
        String(text || "").trim()

      if (!query) {
        return m.reply(
`❌ *Nama wilayah wajib diisi!*

Contoh:

.searchname Rodok

.searchname Batam

.searchname Bandung`
        )
      }

      if (query.length < 2) {
        return m.reply(
          "❌ Minimal masukkan 2 karakter."
        )
      }

      if (query.length > 100) {
        return m.reply(
          "❌ Nama pencarian terlalu panjang."
        )
      }

      getConfig()

      await m.reply(
`🔎 *Mencari wilayah...*

📍 Query:
${query}

⏳ Mohon tunggu...`
      )

      let result

      try {
        if (
          typeof geografis.search !==
          "function"
        ) {
          throw new Error(
            "Method geografis.search tidak tersedia."
          )
        }

        result =
          geografis.search(
            query,
            999999,
            0
          )
      } catch (error) {
        console.log(
          "[GEOGRAFIS SEARCH FALLBACK]",
          error?.message || error
        )

        try {
          result =
            geografis.search(query)
        } catch {
          result = []
        }
      }

      const rawResults =
        extractResults(result)

      if (!rawResults.length) {
        return m.reply(
`❌ *Tidak ditemukan*

Wilayah dengan nama:

*${query}*

tidak ditemukan di database Indonesia.`
        )
      }

      const results =
        rawResults
          .map((item, index) => ({
            item,
            score: getScore(
              item,
              query
            ),
            index
          }))
          .sort((a, b) => {
            if (
              b.score !==
              a.score
            ) {
              return (
                b.score -
                a.score
              )
            }

            return (
              a.index -
              b.index
            )
          })
          .map(item => item.item)

      let message =
`*Ada* ✅

Ditemukan *${results.length} hasil* untuk:

🔎 *${query}*

━━━━━━━━━━━━━━━━━━

`

      results.forEach(
        (item, index) => {
          message +=
            formatResult(
              item,
              index
            )

          if (
            index <
            results.length - 1
          ) {
            message +=
`\n\n━━━━━━━━━━━━━━━━━━\n\n`
          }
        }
      )

      message +=
`\n\n━━━━━━━━━━━━━━━━━━

📊 *Total hasil:* ${results.length}

📚 *Database:* Geografis Indonesia`

      return m.reply(message)

    } catch (error) {
      console.error(
        "[SEARCHNAME ERROR]",
        error
      )

      return m.reply(
`❌ *Search wilayah gagal!*

⚠️ ${error?.message || "Unknown error"}`
      )
    }
  }
}