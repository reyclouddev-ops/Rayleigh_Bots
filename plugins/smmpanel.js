import axios from "axios"
import fs from "node:fs"
import path from "node:path"

const API_URL = "https://indosmm.id/api/v2"
const API_KEY = process.env.SMM_API_KEY || ""

const DB_DIR = path.join(
  process.cwd(),
  "database"
)

const DB_FILE = path.join(
  DB_DIR,
  "ordersmm.json"
)

if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, {
    recursive: true
  })
}

if (!fs.existsSync(DB_FILE)) {
  fs.writeFileSync(
    DB_FILE,
    "[]",
    "utf8"
  )
}

function readOrders() {
  try {
    const data =
      fs.readFileSync(
        DB_FILE,
        "utf8"
      )

    const parsed =
      JSON.parse(data)

    return Array.isArray(parsed)
      ? parsed
      : []
  } catch (err) {
    console.error(
      "[SMM DB READ ERROR]",
      err
    )

    return []
  }
}

function saveOrders(data) {
  try {
    fs.writeFileSync(
      DB_FILE,
      JSON.stringify(
        data,
        null,
        2
      ),
      "utf8"
    )

    return true
  } catch (err) {
    console.error(
      "[SMM DB WRITE ERROR]",
      err
    )

    return false
  }
}

async function apiRequest(data) {
  if (!API_KEY) {
    throw new Error(
      "SMM_API_KEY belum dikonfigurasi."
    )
  }

  const params =
    new URLSearchParams()

  params.append(
    "key",
    API_KEY
  )

  for (
    const [key, value]
    of Object.entries(data)
  ) {
    if (
      value !== undefined &&
      value !== null
    ) {
      params.append(
        key,
        String(value)
      )
    }
  }

  const response =
    await axios.post(
      API_URL,
      params.toString(),
      {
        headers: {
          "Content-Type":
            "application/x-www-form-urlencoded"
        },
        timeout: 20000
      }
    )

  return response.data
}

function formatMoney(value) {
  const number =
    Number(value)

  if (Number.isNaN(number)) {
    return String(
      value || "0"
    )
  }

  return number.toLocaleString(
    "id-ID"
  )
}

function formatDate(date) {
  try {
    return new Date(date)
      .toLocaleString(
        "id-ID",
        {
          timeZone:
            "Asia/Jakarta"
        }
      )
  } catch {
    return "-"
  }
}

function getUserId(m) {
  return (
    m.sender ||
    m.participant ||
    m.key?.participant ||
    m.key?.remoteJid ||
    "unknown"
  )
}

export default {
  name: "SMM",

  command: [
    "smm",
    "smm_services",
    "smm_balance",
    "smm_order",
    "smm_status",
    "smm_cancel",
    "smm_myorder"
  ],

  category: "SMM",

  help: [
    "smm",
    "smm_services",
    "smm_balance",
    "smm_order",
    "smm_status",
    "smm_cancel",
    "smm_myorder"
  ],

  tags: [
    "smm"
  ],

  async run(
    sock,
    m,
    {
      text,
      prefix,
      command
    }
  ) {
    try {
      if (!API_KEY) {
        return m.reply(
`❌ *SMM API KEY belum tersedia.*

Tambahkan environment variable:

\`SMM_API_KEY=ISI_API_KEY\``
        )
      }

      if (command === "smm") {
        return m.reply(
`╭━━━〔 🚀 REYCLOUD SMM 〕━━━╮
┃
┃ 📦 SERVICES
┃ ${prefix}smm_services
┃
┃ 🔎 SEARCH SERVICE
┃ ${prefix}smm_services tiktok
┃
┃ 💰 BALANCE
┃ ${prefix}smm_balance
┃
┃ 🛒 ORDER
┃ ${prefix}smm_order
┃
┃ 📊 STATUS
┃ ${prefix}smm_status <order_id>
┃
┃ ❌ CANCEL
┃ ${prefix}smm_cancel <order_id>
┃
┃ 📋 MY ORDER
┃ ${prefix}smm_myorder
┃
╰━━━━━━━━━━━━━━━━━━━━━━╯

📌 *Contoh pencarian:*

${prefix}smm_services tiktok
${prefix}smm_services instagram
${prefix}smm_services youtube
${prefix}smm_services roblox

📄 *Pagination:*

${prefix}smm_services 2
${prefix}smm_services tiktok 2

> ReyCloudSHP`
        )
      }

      if (
        command ===
        "smm_services"
      ) {
        const result =
          await apiRequest({
            action: "services"
          })

        if (
          !Array.isArray(result)
        ) {
          return m.reply(
            "❌ Gagal mengambil daftar service."
          )
        }

        const input =
          text?.trim() || ""

        const args =
          input
            ? input.split(/\s+/)
            : []

        let page = 1
        let keyword = ""

        if (args.length > 0) {
          const last =
            args[args.length - 1]

          if (/^\d+$/.test(last)) {
            page =
              parseInt(
                last,
                10
              )

            args.pop()
          }

          keyword =
            args.join(" ")
              .trim()
        }

        if (
          !Number.isInteger(page) ||
          page < 1
        ) {
          page = 1
        }

        let filtered = result

        if (keyword) {
          const search =
            keyword
              .toLowerCase()
              .trim()

          filtered =
            result.filter(
              service => {
                const name =
                  String(
                    service.name ||
                    ""
                  ).toLowerCase()

                const type =
                  String(
                    service.type ||
                    ""
                  ).toLowerCase()

                const category =
                  String(
                    service.category ||
                    ""
                  ).toLowerCase()

                const serviceId =
                  String(
                    service.service ||
                    ""
                  ).toLowerCase()

                return (
                  name.includes(search) ||
                  type.includes(search) ||
                  category.includes(search) ||
                  serviceId === search
                )
              }
            )
        }

        const perPage = 100

        const total =
          filtered.length

        const totalPages =
          Math.max(
            1,
            Math.ceil(
              total / perPage
            )
          )

        if (
          page > totalPages
        ) {
          return m.reply(
`❌ *Halaman tidak tersedia.*

${keyword
  ? `🔎 Keyword: *${keyword}*\n`
  : ""}📦 Total service: *${total}*
📄 Total halaman: *${totalPages}*

Contoh:

${prefix}smm_services${keyword
  ? ` ${keyword}`
  : ""} ${totalPages}`
          )
        }

        const start =
          (page - 1) *
          perPage

        const end =
          Math.min(
            start + perPage,
            total
          )

        const services =
          filtered.slice(
            start,
            end
          )

        let output =
`╭━━━〔 📦 SERVICES 〕━━━╮
┃ 📄 Halaman: ${page}/${totalPages}
┃ 📦 Total: ${total}
┃ 🔢 Menampilkan: ${
  total > 0
    ? `${start + 1}-${end}`
    : "0"
}`

        if (keyword) {
          output +=
`\n┃ 🔎 Filter: ${keyword}`
        }

        output +=
`\n╰━━━━━━━━━━━━━━━━━━━━━━╯

`

        if (!services.length) {
          return m.reply(
`❌ Service tidak ditemukan.

🔎 Keyword:
${keyword || "-"}

Coba:

${prefix}smm_services tiktok
${prefix}smm_services instagram
${prefix}smm_services youtube`
          )
        }

        for (
          const service
          of services
        ) {
          output +=
`🆔 ${service.service}
📌 ${service.name || "-"}
💰 ${formatMoney(service.rate)}
📏 Min: ${service.min || "-"}
📏 Max: ${service.max || "-"}
⚡ ${service.type || "-"}
━━━━━━━━━━━━━━━━━━━━

`
        }

        output +=
`\n📄 *Halaman ${page}/${totalPages}*`

        if (
          page < totalPages
        ) {
          output +=
`\n➡️ Berikutnya:
${prefix}smm_services${
  keyword
    ? ` ${keyword}`
    : ""
} ${page + 1}`
        }

        if (page > 1) {
          output +=
`\n⬅️ Sebelumnya:
${prefix}smm_services${
  keyword
    ? ` ${keyword}`
    : ""
} ${page - 1}`
        }

        return m.reply(output)
      }

      if (
        command ===
        "smm_balance"
      ) {
        const result =
          await apiRequest({
            action: "balance"
          })

        if (
          !result ||
          result.balance === undefined
        ) {
          return m.reply(
`❌ Gagal mengambil saldo.

${
  result?.error ||
  "Response provider tidak valid."
}`
          )
        }

        return m.reply(
`╭━━━〔 💰 BALANCE 〕━━━╮
┃
┃ 💵 Saldo: ${formatMoney(result.balance)}
┃ 💱 Currency: ${result.currency || "-"}
┃
╰━━━━━━━━━━━━━━━━━━━━━━╯`
        )
      }

      if (
        command ===
        "smm_order"
      ) {
        if (!text) {
          return m.reply(
`❌ *Format order salah.*

Format:

${prefix}smm_order <service> <link> <jumlah>

Contoh:

${prefix}smm_order 123 https://example.com 100`
          )
        }

        const args =
          text
            .trim()
            .split(/\s+/)

        if (args.length < 3) {
          return m.reply(
`❌ Format:

${prefix}smm_order <service> <link> <jumlah>`
          )
        }

        const service =
          args[0]

        const link =
          args[1]

        const quantity =
          args[2]

        if (
          !/^\d+$/.test(
            service
          )
        ) {
          return m.reply(
            "❌ Service ID harus berupa angka."
          )
        }

        if (
          !/^\d+$/.test(
            quantity
          )
        ) {
          return m.reply(
            "❌ Jumlah harus berupa angka."
          )
        }

        const loading =
          await m.reply(
`⏳ *Memproses order...*

🆔 Service: ${service}
🔗 Link: ${link}
📦 Jumlah: ${quantity}`
          )

        const result =
          await apiRequest({
            action: "add",
            service,
            link,
            quantity
          })

        if (
          !result ||
          !result.order
        ) {
          return m.reply(
`❌ *Order gagal.*

${
  result?.error ||
  "Provider tidak memberikan order ID."
}`
          )
        }

        const orders =
          readOrders()

        orders.push({
          order_id:
            String(
              result.order
            ),

          user:
            getUserId(m),

          service,

          link,

          quantity:
            Number(quantity),

          status:
            "Pending",

          created_at:
            new Date()
              .toISOString()
        })

        saveOrders(orders)

        if (loading?.key) {
          try {
            await sock.sendMessage(
              m.chat,
              {
                delete:
                  loading.key
              }
            )
          } catch {}
        }

        return m.reply(
`╭━━━〔 ✅ ORDER BERHASIL 〕━━━╮
┃
┃ 🆔 Order ID: ${result.order}
┃ 📦 Service: ${service}
┃ 🔗 Link: ${link}
┃ 🔢 Jumlah: ${quantity}
┃ 📊 Status: Pending
┃
╰━━━━━━━━━━━━━━━━━━━━━━╯

📊 Cek status:

${prefix}smm_status ${result.order}`
        )
      }

      if (
        command ===
        "smm_status"
      ) {
        if (!text) {
          return m.reply(
`❌ *Order ID belum diberikan.*

Contoh:

${prefix}smm_status 123456`
          )
        }

        const orderId =
          text.trim()

        const result =
          await apiRequest({
            action: "status",
            order: orderId
          })

        if (
          !result ||
          result.status === undefined
        ) {
          return m.reply(
`❌ Gagal mengambil status.

${
  result?.error ||
  "Order tidak ditemukan."
}`
          )
        }

        const orders =
          readOrders()

        const index =
          orders.findIndex(
            order =>
              String(
                order.order_id
              ) ===
              String(orderId)
          )

        if (index !== -1) {
          orders[index].status =
            result.status

          if (
            result.remains !==
            undefined
          ) {
            orders[index].remains =
              result.remains
          }

          if (
            result.start_count !==
            undefined
          ) {
            orders[index].start_count =
              result.start_count
          }

          if (
            result.charge !==
            undefined
          ) {
            orders[index].charge =
              result.charge
          }

          orders[index].updated_at =
            new Date()
              .toISOString()

          saveOrders(orders)
        }

        return m.reply(
`╭━━━〔 📊 ORDER STATUS 〕━━━╮
┃
┃ 🆔 Order: ${orderId}
┃ 📊 Status: ${result.status}
┃ 💰 Charge: ${result.charge || "-"}
┃ 📦 Remains: ${result.remains || "-"}
┃ 🔢 Start: ${result.start_count || "-"}
┃
╰━━━━━━━━━━━━━━━━━━━━━━╯`
        )
      }

      if (
        command ===
        "smm_cancel"
      ) {
        if (!text) {
          return m.reply(
`❌ *Order ID belum diberikan.*

Contoh:

${prefix}smm_cancel 123456`
          )
        }

        const orderId =
          text.trim()

        const orders =
          readOrders()

        const index =
          orders.findIndex(
            order =>
              String(
                order.order_id
              ) ===
              String(orderId) &&
              String(
                order.user
              ) ===
              String(
                getUserId(m)
              )
          )

        if (index === -1) {
          return m.reply(
            "❌ Order tidak ditemukan atau bukan milik kamu."
          )
        }

        const result =
          await apiRequest({
            action: "cancel",
            orders: orderId
          })

        if (
          !result ||
          result.error
        ) {
          return m.reply(
`❌ *Gagal cancel order.*

${
  result?.error ||
  "Provider menolak pembatalan."
}`
          )
        }

        orders[index].status =
          "Canceled"

        orders[index].canceled_at =
          new Date()
            .toISOString()

        saveOrders(orders)

        return m.reply(
`╭━━━〔 ❌ ORDER CANCELED 〕━━━╮
┃
┃ 🆔 Order: ${orderId}
┃ 📊 Status: Canceled
┃
╰━━━━━━━━━━━━━━━━━━━━━━╯`
        )
      }

      if (
        command ===
        "smm_myorder"
      ) {
        const userId =
          getUserId(m)

        const orders =
          readOrders()
            .filter(
              order =>
                String(
                  order.user
                ) ===
                String(userId)
            )
            .reverse()

        if (!orders.length) {
          return m.reply(
            "📋 Kamu belum mempunyai order."
          )
        }

        let output =
`╭━━━〔 📋 MY ORDER 〕━━━╮
┃ 📦 Total: ${orders.length}
╰━━━━━━━━━━━━━━━━━━━━━━╯

`

        for (
          const order
          of orders.slice(0, 20)
        ) {
          output +=
`🆔 ${order.order_id}
📦 Service: ${order.service}
🔢 Qty: ${order.quantity}
📊 Status: ${order.status}
📅 ${formatDate(order.created_at)}
━━━━━━━━━━━━━━━━━━━━

`
        }

        if (
          orders.length > 20
        ) {
          output +=
`\n📌 Menampilkan 20 order terakhir.`
        }

        return m.reply(output)
      }

    } catch (err) {
      console.error(
        "[SMM ERROR]",
        err?.response?.data ||
        err?.message ||
        err
      )

      return m.reply(
`❌ *Terjadi kesalahan.*

> ${
  err?.message ||
  "Unknown error"
}`
      )
    }
  }
}