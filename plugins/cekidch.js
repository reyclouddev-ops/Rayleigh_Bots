import {
    generateWAMessageFromContent,
    proto
} from "@whiskeysockets/baileys"

export default {
    name: "Cek ID Channel",

    command: [
        "cekidch",
        "idch"
    ],

    help: [
        "cekidch url"
    ],

    tags: [
        "tools"
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
        const reaction =
            async emoji => {
                try {
                    await sock.sendMessage(
                        m.chat,
                        {
                            react: {
                                text: emoji,
                                key: m.key
                            }
                        }
                    )
                } catch {}
            }

        const match =
            text
                ? text.match(
                    /whatsapp\.com\/channel\/([a-zA-Z0-9_-]+)/i
                )
                : null

        if (!match) {
            return m.reply(
`*Contoh:*

${prefix}${command} https://whatsapp.com/channel/0029VaXXXXX`
            )
        }

        const channelCode =
            match[1]

        try {
            await reaction("⏳")

            const metadata =
                await sock.newsletterMetadata(
                    "invite",
                    channelCode
                )

            if (
                !metadata ||
                !metadata.id
            ) {
                await reaction("❌")

                return m.reply(
                    "❌ Gagal mengambil data channel. Pastikan link valid dan aktif!"
                )
            }

            const channelJid =
                metadata.id

            const channelName =
                metadata.name ||
                "Tidak Diketahui"

            const subscribers =
                metadata.subscribers
                    ? Number(
                        metadata.subscribers
                    ).toLocaleString(
                        "id-ID"
                    )
                    : "-"

            const captionText =
`◈ *Nama Channel:* ${channelName}
◈ *ID Channel:* \`${channelJid}\`
◈ *Pengikut:* ${subscribers}`

            const msg =
                generateWAMessageFromContent(
                    m.chat,
                    {
                        viewOnceMessage: {
                            message: {
                                interactiveMessage:
                                    proto.Message.InteractiveMessage.create(
                                        {
                                            body:
                                                proto.Message.InteractiveMessage.Body.create(
                                                    {
                                                        text:
                                                            captionText
                                                    }
                                                ),

                                            footer:
                                                proto.Message.InteractiveMessage.Footer.create(
                                                    {
                                                        text:
                                                            String(
                                                                global.botname ||
                                                                "ReyCloud"
                                                            )
                                                    }
                                                ),

                                            nativeFlowMessage:
                                                proto.Message.InteractiveMessage.NativeFlowMessage.create(
                                                    {
                                                        buttons: [
                                                            {
                                                                name:
                                                                    "cta_copy",

                                                                buttonParamsJson:
                                                                    JSON.stringify(
                                                                        {
                                                                            display_text:
                                                                                "Copy ID",

                                                                            id:
                                                                                "copy_channel_id",

                                                                            copy_code:
                                                                                channelJid
                                                                        }
                                                                    )
                                                            }
                                                        ]
                                                    }
                                                )
                                        }
                                    )
                            }
                        }
                    },
                    {
                        userJid:
                            sock.user?.id,

                        quoted:
                            m
                    }
                )

            await sock.relayMessage(
                m.chat,
                msg.message,
                {
                    messageId:
                        msg.key.id
                }
            )

            await reaction("✅")

        } catch (e) {
            console.error(
                "[CEKIDCH ERROR]",
                e
            )

            await reaction("❌")

            return m.reply(
`❌ *Link tidak valid atau terjadi kesalahan!*

> ${e.message || String(e)}`
            )
        }
    }
}