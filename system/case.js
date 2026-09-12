export default {
    name: 'Mode & Ping',
    command: [
        'public',
        'self',
        'private',
        'ping'
    ],
    category: 'Owner',
    help: [
        'public',
        'self',
        'private',
        'ping'
    ],
    tags: [
        'owner',
        'tools'
    ],

    async run(
        sock,
        m,
        {
            command,
            isOwner
        }
    ) {
        switch (command) {

            case 'public': {
                if (!isOwner) {
                    return m.reply(
                        '❌ *Khusus Owner!*'
                    )
                }

                sock.public = true

                await m.reply(
                    '✅ *Success: Mode Public Active*'
                )

                break
            }

            case 'self':
            case 'private': {
                if (!isOwner) {
                    return m.reply(
                        '❌ *Khusus Owner!*'
                    )
                }

                sock.public = false

                await m.reply(
                    '🔒 *Success: Mode Self Active*'
                )

                break
            }

            case 'ping': {
                const start =
                    Date.now()

                const sent =
                    await m.reply(
                        '🏓 *Pong!*'
                    )

                const latency =
                    Date.now() - start

                if (
                    sent?.key
                ) {
                    await sock.sendMessage(
                        m.chat,
                        {
                            text:
                                `🏓 *Pong!*\n\n⚡ Response: ${latency}ms`,
                        },
                        {
                            edit:
                                sent.key
                        }
                    )
                }

                break
            }
        }
    }
}