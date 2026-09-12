const cooldowns = new Map()

const sleep = ms =>
    new Promise(resolve => setTimeout(resolve, ms))

const COOLDOWN = 5000

function isCooldown(chat) {
    const now = Date.now()
    const last = cooldowns.get(chat) || 0

    if (now - last < COOLDOWN) {
        return true
    }

    cooldowns.set(chat, now)

    setTimeout(() => {
        cooldowns.delete(chat)
    }, COOLDOWN)

    return false
}

function normalizeJid(jid) {
    if (!jid) return null

    const value = String(jid)

    if (value.includes("@")) {
        return value
    }

    const number = value.replace(/[^0-9]/g, "")

    if (!number) return null

    return `${number}@s.whatsapp.net`
}

function getTarget(m, mentionedJid = []) {
    if (m.quoted) {
        const quotedSender =
            m.quoted.sender ||
            m.quoted.participant

        const jid = normalizeJid(quotedSender)

        if (jid) return jid
    }

    if (
        Array.isArray(mentionedJid) &&
        mentionedJid.length
    ) {
        return normalizeJid(mentionedJid[0])
    }

    return null
}

async function getProfilePicture(sock, jid) {
    try {
        return await sock.profilePictureUrl(
            jid,
            "image"
        )
    } catch {
        try {
            return await sock.profilePictureUrl(
                jid,
                "preview"
            )
        } catch {
            return null
        }
    }
}

async function downloadImage(url) {
    const response = await fetch(url)

    if (!response.ok) {
        throw new Error(
            `Gagal mengambil foto. HTTP ${response.status}`
        )
    }

    const buffer = Buffer.from(
        await response.arrayBuffer()
    )

    if (!buffer.length) {
        throw new Error("Foto PP kosong.")
    }

    return buffer
}

export default {
    name: "Use PP",

    command: [
        "usepp"
    ],

    category: "Owner",

    description:
        "Menggunakan PP target sebagai PP bot",

    isOwner: true,

    async run(
        sock,
        m,
        {
            mentionedJid
        }
    ) {
        try {
            if (isCooldown(m.chat)) {
                return
            }

            const target = getTarget(
                m,
                mentionedJid
            )

            if (!target) {
                return m.reply(
`╭━━〔 🖼️ USE PP 〕━━╮

❌ *Target tidak ditemukan!*

Reply pesan target:
.usepp

Atau tag target:
.usepp @628xxxxxxxxxx

╰━━━━━━━━━━━━━━━━━━━━╯`
                )
            }

            const botJid = sock.decodeJid(
                sock.user.id
            )

            if (
                sock.decodeJid(target) ===
                botJid
            ) {
                return m.reply(
                    "❌ PP bot sudah menggunakan foto tersebut."
                )
            }

            await sock.sendMessage(
                m.chat,
                {
                    react: {
                        text: "🖼️",
                        key: m.key
                    }
                }
            )

            await sleep(1500)

            const ppUrl =
                await getProfilePicture(
                    sock,
                    target
                )

            if (!ppUrl) {
                throw new Error(
                    "Target tidak memiliki foto profil yang bisa diakses."
                )
            }

            await sleep(1000)

            const image =
                await downloadImage(ppUrl)

            await sleep(1000)

            await sock.updateProfilePicture(
                botJid,
                image
            )

            await sleep(2000)

            await sock.sendMessage(
                m.chat,
                {
                    react: {
                        text: "✅",
                        key: m.key
                    }
                }
            )

            await sleep(1000)

            return m.reply(
`╭━━〔 🖼️ USE PP SUCCESS 〕━━╮

✅ *Foto profil berhasil digunakan!*

👤 Target:
@${target.split("@")[0]}

🤖 PP bot telah diperbarui.

╰━━━━━━━━━━━━━━━━━━━━╯`,
                {
                    mentions: [target]
                }
            )

        } catch (err) {
            console.error(
                "[USEPP ERROR]",
                err
            )

            await sleep(1000)

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

            await sleep(1000)

            return m.reply(
`╭━━〔 ❌ USE PP ERROR 〕━━╮

⚠️ ${String(
    err?.message ||
    "Gagal mengganti PP bot."
).slice(0, 300)}

╰━━━━━━━━━━━━━━━━━━━━╯`
            )
        }
    }
}