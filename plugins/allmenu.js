import fs from "fs"

export default {
    name: "All Menu",

    command: [
        "allmenu",
        "allmenus"
    ],

    category: "Main",

    description:
        "Menampilkan semua fitur bot",

    isOwner: false,

    async run(
        sock,
        m,
        { prefix }
    ) {
        try {
            const emojis = [
                "📋",
                "📂",
                "📜",
                "✨",
                "🌟",
                "⚡",
                "🤖",
                "💻",
                "🔥",
                "🚀"
            ]

            const randomEmoji =
                emojis[
                    Math.floor(
                        Math.random() *
                        emojis.length
                    )
                ]

            await sock.sendMessage(
                m.chat,
                {
                    react: {
                        text: randomEmoji,
                        key: m.key
                    }
                }
            )

            let thumbnail

            if (
                fs.existsSync(
                    "./image/menu.png"
                )
            ) {
                thumbnail =
                    fs.readFileSync(
                        "./image/menu.png"
                    )
            }

            const plugins =
                global.plugins || {}

            const categories = {}

            for (
                const filename of Object.keys(
                    plugins
                )
            ) {
                const plugin =
                    plugins[filename]

                if (!plugin) continue

                let category =
                    String(
                        plugin.category ||
                        "Other"
                    ).trim()

                let commands =
                    plugin.command

                if (!commands) continue

                if (!Array.isArray(commands)) {
                    commands = [
                        commands
                    ]
                }

                const mainCommand =
                    commands[0]

                if (!mainCommand) continue

                if (!categories[category]) {
                    categories[category] = []
                }

                categories[category].push(
                    String(mainCommand)
                        .trim()
                        .toLowerCase()
                )
            }

            let text =
`╭━━〔 📋 ALL MENU 〕━━╮
│ 🤖 Bot     : Rayleigh
│ 👤 User    : ${m.pushName || "Kak"}
│ ⚙️ Prefix  : ${prefix}
│ 📦 Plugin  : ${Object.keys(plugins).length}
╰━━━━━━━━━━━━━━━━━━━━╯

`

            for (
                const category of Object.keys(
                    categories
                ).sort()
            ) {
                const commands = [
                    ...new Set(
                        categories[category]
                    )
                ].sort()

                if (!commands.length) {
                    continue
                }

                text +=
`╭━━〔 ${category.toUpperCase()} 〕━━╮
`

                for (
                    const command of commands
                ) {
                    text +=
`│ • ${prefix}${command}
`
                }

                text +=
`╰━━━━━━━━━━━━━━━━━━━━╯

`
            }

            text +=
`╭━━〔 ℹ️ INFORMATION 〕━━╮
│ 👤 User : ${m.pushName || "Kak"}
│ 🤖 Bot  : Rayleigh
│ 📦 Total Plugin : ${Object.keys(plugins).length}
│ ⚙️ Type : ESM Plugin
╰━━━━━━━━━━━━━━━━━━━━━━╯`

            await sock.sendMessage(
                m.chat,
                {
                    buttonsMessage: {
                        locationMessage: {
                            degreesLatitude: 0,
                            degreesLongitude: 0,
                            name: "Rayleigh",
                            address:
                                "Indonesia-Batam",
                            jpegThumbnail:
                                thumbnail
                        },

                        contentText: text,

                        footerText:
                            "© ReyCloudSHP",

                        buttons: [
                            {
                                buttonId:
                                    "allmenu",

                                buttonText: {
                                    displayText:
                                        "📋 ALL MENU"
                                },

                                type: 1,

                                nativeFlowInfo: {
                                    name:
                                        "single_select",

                                    paramsJson:
                                        JSON.stringify(
                                            {
                                                title:
                                                    "📂 Menu ReyCloud",

                                                sections: [
                                                    {
                                                        title:
                                                            "NAVIGATION",

                                                        rows: [
                                                            {
                                                                header:
                                                                    "",

                                                                title:
                                                                    "🔙 Back Menu",

                                                                description:
                                                                    "Kembali ke menu utama",

                                                                id:
                                                                    `${prefix}menu`
                                                            },

                                                            {
                                                                header:
                                                                    "",

                                                                title:
                                                                    "🎮 Fun Menu",

                                                                description:
                                                                    "Game dan hiburan",

                                                                id:
                                                                    `${prefix}funmenu`
                                                            },

                                                            {
                                                                header:
                                                                    "",

                                                                title:
                                                                    "👑 Owner Menu",

                                                                description:
                                                                    "Menu khusus Owner",

                                                                id:
                                                                    `${prefix}ownermenu`
                                                            }
                                                        ]
                                                    }
                                                ]
                                            }
                                        )
                                }
                            }
                        ],

                        headerType: 6,

                        viewOnce: true
                    }
                },
                {
                    quoted: m
                }
            )

        } catch (err) {
            console.error(
                "[ALLMENU ERROR]",
                err
            )

            await m.reply(
                "❌ Gagal memuat All Menu."
            )
        }
    }
}