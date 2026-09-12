const sleep = ms =>
    new Promise(resolve => setTimeout(resolve, ms))

const cooldowns = new Map()

const COOLDOWN = 3000

function isCooldown(chat) {
    const now = Date.now()
    const last =
        cooldowns.get(chat) || 0

    if (
        now - last <
        COOLDOWN
    ) {
        return true
    }

    cooldowns.set(
        chat,
        now
    )

    setTimeout(() => {
        cooldowns.delete(chat)
    }, COOLDOWN)

    return false
}

function normalizeJid(jid) {
    if (!jid) {
        return null
    }

    const value =
        String(jid)

    if (
        value.includes("@")
    ) {
        return value
    }

    const number =
        value.replace(
            /[^0-9]/g,
            ""
        )

    if (!number) {
        return null
    }

    return `${number}@s.whatsapp.net`
}

function getTargetJids(
    m,
    mentionedJid = []
) {
    const targets = []

    if (
        Array.isArray(
            mentionedJid
        )
    ) {
        for (
            const jid of mentionedJid
        ) {
            const normalized =
                normalizeJid(jid)

            if (normalized) {
                targets.push(
                    normalized
                )
            }
        }
    }

    if (m.quoted) {
        const quotedSender =
            m.quoted.sender ||
            m.quoted.participant

        const normalized =
            normalizeJid(
                quotedSender
            )

        if (
            normalized &&
            !targets.includes(
                normalized
            )
        ) {
            targets.push(
                normalized
            )
        }
    }

    return [
        ...new Set(
            targets
        )
    ]
}

function getNumber(jid) {
    return String(
        jid || ""
    ).replace(
        /[^0-9]/g,
        ""
    )
}

export default {
    name: "Group Promote Demote",

    command: [
        "promote",
        "demote"
    ],

    category: "Group",

    description:
        "Promote atau demote member menggunakan tag atau reply",

    isGroup: true,

    async run(
        sock,
        m,
        {
            command,
            mentionedJid,
            isOwner,
            isAdmin,
            isBotAdmin
        }
    ) {
        try {
            if (
                isCooldown(
                    m.chat
                )
            ) {
                return
            }

            if (!m.isGroup) {
                return m.reply(
                    "❌ *Command ini hanya bisa digunakan di Group!*"
                )
            }

            if (
                !isAdmin &&
                !isOwner
            ) {
                return m.reply(
                    "❌ *Fitur ini khusus Admin Group!*"
                )
            }

            if (
                !isBotAdmin &&
                !isOwner
            ) {
                return m.reply(
                    "❌ *Bot harus menjadi Admin Group terlebih dahulu!*"
                )
            }

            const action =
                String(
                    command || ""
                ).toLowerCase()

            if (
                action !==
                    "promote" &&
                action !==
                    "demote"
            ) {
                return
            }

            const targets =
                getTargetJids(
                    m,
                    mentionedJid
                )

            if (
                !targets.length
            ) {
                return m.reply(
`╭━━〔 👥 GROUP ADMIN 〕━━╮

❌ *Target tidak ditemukan!*

Gunakan salah satu:

• Reply pesan target
  \`.${action}\`

• Tag target
  \`.${action} @628xxx\`

╰━━━━━━━━━━━━━━━━━━━━╯`
                )
            }

            const botJid =
                sock.decodeJid(
                    sock.user.id
                )

            const validTargets =
                targets.filter(
                    jid =>
                        sock.decodeJid(
                            jid
                        ) !==
                        botJid
                )

            if (
                !validTargets.length
            ) {
                return m.reply(
                    "❌ Bot tidak dapat mengubah status dirinya sendiri."
                )
            }

            await sock.sendMessage(
                m.chat,
                {
                    react: {
                        text:
                            action ===
                            "promote"
                                ? "⬆️"
                                : "⬇️",
                        key:
                            m.key
                    }
                }
            )

            await sleep(1200)

            const success = []
            const failed = []

            for (
                const target of
                validTargets
            ) {
                try {
                    await sock.groupParticipantsUpdate(
                        m.chat,
                        [target],
                        action
                    )

                    success.push(
                        target
                    )

                    await sleep(
                        1500
                    )
                } catch (err) {
                    failed.push({
                        jid:
                            target,
                        error:
                            err.message
                    })

                    await sleep(
                        1000
                    )
                }
            }

            let resultText =
`╭━━〔 ${
    action ===
    "promote"
        ? "⬆️ PROMOTE"
        : "⬇️ DEMOTE"
} 〕━━╮

`

            if (
                success.length
            ) {
                resultText +=
`✅ *Berhasil:*
`

                for (
                    const jid of
                    success
                ) {
                    resultText +=
                        `• @${getNumber(jid)}\n`
                }

                resultText +=
                    "\n"
            }

            if (
                failed.length
            ) {
                resultText +=
`❌ *Gagal:*
`

                for (
                    const item of
                    failed
                ) {
                    resultText +=
                        `• @${getNumber(item.jid)}\n`
                }

                resultText +=
                    "\n"
            }

            resultText +=
`📊 *Total Target:* ${validTargets.length}
✅ *Berhasil:* ${success.length}
❌ *Gagal:* ${failed.length}

╰━━━━━━━━━━━━━━━━━━━━╯`

            await sleep(
                1200
            )

            await sock.sendMessage(
                m.chat,
                {
                    text:
                        resultText,

                    mentions: [
                        ...success,
                        ...failed.map(
                            v =>
                                v.jid
                        )
                    ]
                },
                {
                    quoted:
                        m
                }
            )

            await sleep(
                500
            )

            await sock.sendMessage(
                m.chat,
                {
                    react: {
                        text:
                            failed.length &&
                            !success.length
                                ? "❌"
                                : "✅",

                        key:
                            m.key
                    }
                }
            )

        } catch (err) {
            console.error(
                "[PROMOTE DEMOTE ERROR]",
                err
            )

            await sleep(
                1000
            )

            return m.reply(
`╭━━〔 ❌ ERROR 〕━━╮

${String(
    err.message ||
    "Terjadi kesalahan."
).slice(0, 300)}

╰━━━━━━━━━━━━━━━━━━━━╯`
            )
        }
    }
}