import axios from 'axios'
import * as cheerio from 'cheerio'
import vm from 'node:vm'

const sleep = ms =>
    new Promise(resolve =>
        setTimeout(resolve, ms)
    )

const INSTAGRAM_REGEX =
    /^https?:\/\/(?:www\.)?instagram\.com\/(?:p|reel|reels|tv)\/[^\s/?]+/i

function normalizeUrl(url) {
    return String(url || '')
        .trim()
        .replace(/[<>"'`]/g, '')
}

function isInstagramUrl(url) {
    try {
        const parsed =
            new URL(url)

        return (
            /^https?:$/.test(
                parsed.protocol
            ) &&
            /^(?:www\.)?instagram\.com$/i.test(
                parsed.hostname
            ) &&
            /\/(?:p|reel|reels|tv)\//i.test(
                parsed.pathname
            )
        )
    } catch {
        return false
    }
}

async function updateProgress(
    sock,
    m,
    statusMessage,
    progress,
    statusText
) {
    if (!statusMessage?.key?.id) {
        return
    }

    const value =
        Math.max(
            0,
            Math.min(
                100,
                Math.round(
                    Number(progress) || 0
                )
            )
        )

    const totalBars = 10

    const filled =
        Math.round(
            (value / 100) *
            totalBars
        )

    const bar =
        '█'.repeat(filled) +
        '░'.repeat(
            totalBars - filled
        )

    const editKey = {
        remoteJid:
            m.chat,
        id:
            statusMessage.key.id,
        fromMe:
            true
    }

    if (
        statusMessage.key.participant
    ) {
        editKey.participant =
            statusMessage.key.participant
    }

    try {
        await sock.relayMessage(
            m.chat,
            {
                protocolMessage: {
                    key: editKey,
                    type: 14,
                    editedMessage: {
                        conversation:
`╭━━〔 📸 INSTAGRAM SYSTEM 〕━━╮

⏳ ${statusText}

[${bar}] ${value}%

╰━━━━━━━━━━━━━━━━━━━━╯`
                    }
                }
            },
            {}
        )
    } catch (error) {
        console.log(
            '[PROGRESS EDIT ERROR]',
            error.message
        )
    }
}

async function indown(url) {
    try {
        const {
            data: pageData,
            headers
        } = await axios.get(
            'https://indown.io/en1',
            {
                headers: {
                    'User-Agent':
                        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                },
                timeout: 15000
            }
        )

        const $ =
            cheerio.load(
                pageData
            )

        const token =
            $('input[name="_token"]')
                .val()

        if (!token) {
            throw new Error(
                'Token Indown tidak ditemukan.'
            )
        }

        const cookies =
            headers?.['set-cookie']
                ?.map(
                    value =>
                        value.split(';')[0]
                )
                .join('; ') ||
            ''

        const params =
            new URLSearchParams()

        params.append(
            'referer',
            'https://indown.io/en1'
        )

        params.append(
            'locale',
            'en'
        )

        params.append(
            '_token',
            token
        )

        params.append(
            'link',
            url
        )

        params.append(
            'p',
            'i'
        )

        const {
            data: resultData
        } = await axios.post(
            'https://indown.io/download',
            params,
            {
                headers: {
                    'Content-Type':
                        'application/x-www-form-urlencoded',
                    Cookie:
                        cookies,
                    Referer:
                        'https://indown.io/en1',
                    'User-Agent':
                        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                },
                timeout: 20000
            }
        )

        const $result =
            cheerio.load(
                resultData
            )

        const resultUrls = []

        $result(
            'video source[src], a[href].btn-outline-primary, a[href*="indown.io/fetch"]'
        ).each(
            (_, element) => {
                let link =
                    $result(element)
                        .attr('src') ||
                    $result(element)
                        .attr('href')

                if (!link) {
                    return
                }

                if (
                    link.includes(
                        'indown.io/fetch'
                    )
                ) {
                    try {
                        const parsed =
                            new URL(
                                link
                            )

                        const target =
                            parsed.searchParams.get(
                                'url'
                            )

                        if (target) {
                            link =
                                decodeURIComponent(
                                    target
                                )
                        }
                    } catch {}
                }

                if (
                    /cdninstagram\.com|fbcdn\.net/i.test(
                        link
                    )
                ) {
                    resultUrls.push(
                        link.replace(
                            /&dl=1$/,
                            ''
                        )
                    )
                }
            }
        )

        const uniqueUrls =
            [
                ...new Set(
                    resultUrls
                )
            ]

        if (
            uniqueUrls.length === 0
        ) {
            throw new Error(
                'Media tidak ditemukan dari Indown.'
            )
        }

        return {
            status: true,
            source: 'indown',
            result: {
                metadata: {
                    username: '-',
                    caption:
                        'Downloaded via Indown'
                },
                downloadUrl:
                    uniqueUrls
            }
        }
    } catch (error) {
        return {
            status: false,
            source: 'indown',
            message:
                error.message
        }
    }
}

async function snapsave(
    targetUrl
) {
    try {
        const form =
            new URLSearchParams()

        form.append(
            'url',
            targetUrl
        )

        const {
            data
        } = await axios.post(
            'https://snapsave.app/id/action.php?lang=id',
            form,
            {
                headers: {
                    Origin:
                        'https://snapsave.app',
                    Referer:
                        'https://snapsave.app/id/download-video-instagram',
                    'User-Agent':
                        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                },
                timeout: 20000
            }
        )

        if (
            typeof data !==
            'string'
        ) {
            throw new Error(
                'Response Snapsave tidak valid.'
            )
        }

        const context = {
            window: {},
            document: {
                getElementById:
                    () => ({
                        value: ''
                    })
            },
            console,
            eval: value =>
                value
        }

        vm.createContext(
            context
        )

        const decoded =
            vm.runInContext(
                data,
                context,
                {
                    timeout: 10000
                }
            )

        if (
            typeof decoded !==
            'string'
        ) {
            throw new Error(
                'Response Snapsave gagal diproses.'
            )
        }

        const matches =
            decoded.match(
                /https:\/\/d\.rapidcdn\.app\/v2\?[^"'\\]+/g
            )

        if (
            !matches?.length
        ) {
            throw new Error(
                'Media tidak ditemukan dari Snapsave.'
            )
        }

        const cleanUrls =
            [
                ...new Set(
                    matches.map(
                        value =>
                            value
                                .replace(
                                    /&amp;/g,
                                    '&'
                                )
                                .replace(
                                    /\\u0026/g,
                                    '&'
                                )
                    )
                )
            ]

        return {
            status: true,
            source: 'snapsave',
            result: {
                metadata: {
                    username: '-',
                    caption:
                        'Downloaded via Snapsave'
                },
                downloadUrl:
                    cleanUrls
            }
        }
    } catch (error) {
        return {
            status: false,
            source: 'snapsave',
            message:
                error.message
        }
    }
}

async function igdl(url) {
    let result =
        await indown(url)

    if (
        !result.status ||
        !result.result?.downloadUrl?.length
    ) {
        result =
            await snapsave(url)
    }

    return result
}

function getMediaType(url) {
    const value =
        String(url || '')

    if (
        /\.mp4(?:[?#]|$)/i.test(
            value
        ) ||
        /(?:video|\.mp4)/i.test(
            value
        )
    ) {
        return 'video'
    }

    return 'image'
}

function buildEditKey(
    m,
    statusMsg
) {
    const key = {
        remoteJid:
            m.chat,
        id:
            statusMsg?.key?.id,
        fromMe:
            true
    }

    if (
        statusMsg?.key?.participant
    ) {
        key.participant =
            statusMsg.key.participant
    }

    return key
}

async function editStatus(
    sock,
    m,
    statusMsg,
    text
) {
    if (!statusMsg?.key?.id) {
        return false
    }

    try {
        await sock.relayMessage(
            m.chat,
            {
                protocolMessage: {
                    key:
                        buildEditKey(
                            m,
                            statusMsg
                        ),
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
    } catch (error) {
        console.log(
            '[STATUS EDIT ERROR]',
            error.message
        )

        return false
    }
}

export default {
    name:
        'Instagram Downloader',

    command: [
        'ig',
        'igdl',
        'instagram',
        'igreel'
    ],

    category:
        'Downloader',

    description:
        'Mengunduh foto, video, reel, atau carousel Instagram.',

    isOwner: false,

    async run(
        sock,
        m,
        {
            args = [],
            prefix,
            command
        }
    ) {
        let statusMsg = null

        try {
            let url =
                normalizeUrl(
                    args[0]
                )

            if (
                !url &&
                m.quoted?.text
            ) {
                const match =
                    m.quoted.text.match(
                        /https?:\/\/(?:www\.)?instagram\.com\/(?:p|reel|reels|tv)\/[^\s]+/i
                    )

                if (match) {
                    url =
                        normalizeUrl(
                            match[0]
                        )
                }
            }

            if (
                !url ||
                !isInstagramUrl(
                    url
                )
            ) {
                return m.reply(
`╭━━〔 📸 INSTAGRAM DOWNLOADER 〕━━╮

❌ *Masukkan URL Instagram yang valid!*

📌 *Contoh:*
└ ${prefix + command} https://www.instagram.com/p/xxxx/
└ ${prefix + command} https://www.instagram.com/reel/xxxx/

╰━━━━━━━━━━━━━━━━━━━━╯`
                )
            }

            await sock.sendMessage(
                m.chat,
                {
                    react: {
                        text: '⏳',
                        key: m.key
                    }
                }
            )

            statusMsg =
                await sock.sendMessage(
                    m.chat,
                    {
                        text:
`╭━━〔 📸 INSTAGRAM SYSTEM 〕━━╮

⏳ Memproses URL Instagram...

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
                25,
                'Menghubungkan ke downloader...'
            )

            await sleep(500)

            await updateProgress(
                sock,
                m,
                statusMsg,
                50,
                'Mengambil media dari server...'
            )

            const data =
                await igdl(url)

            if (
                !data?.status ||
                !data.result?.downloadUrl?.length
            ) {
                throw new Error(
                    data?.message ||
                    'Media Instagram tidak ditemukan.'
                )
            }

            const mediaUrls =
                [
                    ...new Set(
                        data.result.downloadUrl
                    )
                ]

            await updateProgress(
                sock,
                m,
                statusMsg,
                75,
                `${mediaUrls.length} media ditemukan...`
            )

            await sleep(300)

            if (
                mediaUrls.length > 1
            ) {
                await editStatus(
                    sock,
                    m,
                    statusMsg,
`╭━━〔 📸 INSTAGRAM SLIDE 〕━━╮

📸 Ditemukan ${mediaUrls.length} media.
⏳ Mengirim satu per satu...

╰━━━━━━━━━━━━━━━━━━━━╯`
                )

                for (
                    let index = 0;
                    index <
                    mediaUrls.length;
                    index++
                ) {
                    const mediaUrl =
                        mediaUrls[index]

                    const type =
                        getMediaType(
                            mediaUrl
                        )

                    if (
                        type ===
                        'video'
                    ) {
                        await sock.sendMessage(
                            m.chat,
                            {
                                video: {
                                    url:
                                        mediaUrl
                                }
                            },
                            {
                                quoted:
                                    m
                            }
                        )
                    } else {
                        await sock.sendMessage(
                            m.chat,
                            {
                                image: {
                                    url:
                                        mediaUrl
                                }
                            },
                            {
                                quoted:
                                    m
                            }
                        )
                    }

                    await sleep(300)
                }

                await editStatus(
                    sock,
                    m,
                    statusMsg,
`╭━━〔 ✅ INSTAGRAM SELESAI 〕━━╮

📸 Total media: ${mediaUrls.length}
🟢 Status: SUCCESS
🔧 Source: ${data.source}

╰━━━━━━━━━━━━━━━━━━━━╯`
                )

                await sock.sendMessage(
                    m.chat,
                    {
                        react: {
                            text: '📥',
                            key: m.key
                        }
                    }
                )

                return
            }

            const mediaUrl =
                mediaUrls[0]

            const type =
                getMediaType(
                    mediaUrl
                )

            await updateProgress(
                sock,
                m,
                statusMsg,
                100,
                'Media berhasil didapatkan!'
            )

            await sleep(400)

            if (
                type ===
                'video'
            ) {
                await sock.sendMessage(
                    m.chat,
                    {
                        video: {
                            url:
                                mediaUrl
                        },
                        caption:
                            '📸 *Instagram Video Downloaded Success!*'
                    },
                    {
                        quoted: m
                    }
                )
            } else {
                await sock.sendMessage(
                    m.chat,
                    {
                        image: {
                            url:
                                mediaUrl
                        },
                        caption:
                            '📸 *Instagram Photo Downloaded Success!*'
                    },
                    {
                        quoted: m
                    }
                )
            }

            await editStatus(
                sock,
                m,
                statusMsg,
`╭━━〔 ✅ INSTAGRAM SELESAI 〕━━╮

📥 Media berhasil dikirim.
🟢 Status: SUCCESS
🔧 Source: ${data.source}

╰━━━━━━━━━━━━━━━━━━━━╯`
            )

            await sock.sendMessage(
                m.chat,
                {
                    react: {
                        text: '📥',
                        key: m.key
                    }
                }
            )
        } catch (error) {
            console.error(
                '[INSTAGRAM ERROR]',
                error.message
            )

            await sock.sendMessage(
                m.chat,
                {
                    react: {
                        text: '❌',
                        key: m.key
                    }
                }
            ).catch(() => {})

            const errorText =
                String(
                    error?.message ||
                    'Unknown error'
                ).slice(
                    0,
                    500
                )

            if (
                statusMsg?.key?.id
            ) {
                const edited =
                    await editStatus(
                        sock,
                        m,
                        statusMsg,
`╭━━〔 ❌ INSTAGRAM GAGAL 〕━━╮

⚠️ ${errorText}

╰━━━━━━━━━━━━━━━━━━━━╯`
                    )

                if (edited) {
                    return
                }
            }

            return m.reply(
`❌ *Instagram Download Gagal!*

⚠️ ${errorText}`
            )
        }
    }
}