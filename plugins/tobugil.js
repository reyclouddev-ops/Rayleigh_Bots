import axios from "axios";
import FormData from "form-data";

const sleep = ms =>
    new Promise(resolve => setTimeout(resolve, ms));

export default {
    name: "Remove Clothes",
    command: ["removeclothes", "rc", "tobugil"],
    category: "AI",
    isOwner: false,

    async run(sock, m, { text, args, prefix, command }) {

        let statusMessage = null;

        try {
            const q = m.quoted ? m.quoted : m;
            const mime = (q.msg || q).mimetype || '';

            // Cek apakah user mereply gambar atau mengirim URL langsung via teks
            let imageUrl = text && text.trim().startsWith('http') ? text.trim() : null;

            if (!imageUrl && (!mime || !mime.startsWith('image/'))) {
                const guideText = 
`❌ *Gagal memproses!*

Kirim atau balas foto/gambar target, atau sertakan URL gambar dengan format:
• \`${prefix + command} <url_gambar>\`
• Balas foto dengan \`${prefix + command}\``;

                const buttons = [
                    {
                        name: "cta_copy",
                        buttonParamsJson: JSON.stringify({
                            display_text: "📋 Salin Contoh Perintah",
                            copy_code: `${prefix + command} https://example.com/image.jpg`
                        })
                    }
                ];

                return sock.sendMessage(m.chat, {
                    text: guideText,
                    footer: "Powered by ReyCloudSHP",
                    interactiveButtons: buttons
                }, { quoted: m });
            }

            statusMessage =
                await sock.sendMessage(
                    m.chat,
                    {
                        text:
`╭━━〔 🤖 AI REMOVE CLOTHES 〕━━╮

⏳ Status: Menyiapkan URL media...

[░░░░░░░░░░░░] 0%

🔗 Mendapatkan tautan gambar...

╰━━━━━━━━━━━━━━━━━━━━╯`
                    },
                    {
                        quoted: m
                    }
                );

            // Jika media berupa buffer dari WA, upload instan ke telegra.ph/reycode agar jadi URL publik
            if (!imageUrl || !imageUrl.startsWith('http')) {
                try {
                    const editKey = {
                        remoteJid: m.chat,
                        id: statusMessage.key.id,
                        fromMe: true
                    };
                    if (statusMessage.key.participant) {
                        editKey.participant = statusMessage.key.participant;
                    }

                    await sock.relayMessage(
                        m.chat,
                        {
                            protocolMessage: {
                                key: editKey,
                                type: 14,
                                editedMessage: {
                                    conversation:
`╭━━〔 🤖 AI REMOVE CLOTHES 〕━━╮

⏳ Status: Converting media to public URL...

[████░░░░░░░░] 40%

☁️ Mengubah media WhatsApp menjadi URL...

╰━━━━━━━━━━━━━━━━━━━━╯`
                                }
                            }
                        },
                        {}
                    );
                } catch {}

                const mediaBuffer = await q.download();
                const form = new FormData();
                form.append('file', mediaBuffer, 'image.jpeg');

                const uploadRes = await axios.post('https://api.reycode.my.id/upload', form, {
                    headers: form.getHeaders()
                });

                imageUrl = uploadRes.data?.result?.url;
            }

            if (!imageUrl) {
                throw new Error("Gagal mendapatkan URL publik dari media WhatsApp.");
            }

            try {
                const editKey = {
                    remoteJid: m.chat,
                    id: statusMessage.key.id,
                    fromMe: true
                };
                if (statusMessage.key.participant) {
                    editKey.participant = statusMessage.key.participant;
                }

                await sock.relayMessage(
                    m.chat,
                    {
                        protocolMessage: {
                            key: editKey,
                            type: 14,
                            editedMessage: {
                                conversation:
`╭━━〔 🤖 AI REMOVE CLOTHES 〕━━╮

⏳ Status: Processing AI...

[████████░░░░] 75%

✨ Menerapkan efek remove clothes...

╰━━━━━━━━━━━━━━━━━━━━╯`
                            }
                        }
                    },
                    {}
                );
            } catch {}

            // ====================================================
            // REQUEST API REMOVE CLOTHES
            // ====================================================

            const apiKey = 'rey_backup-d3789817-7b32-4c8b-816d-5b673b68e9eb-IkyyApis';
            const apiUrl = `https://api.ikyyxd.my.id/edit/remove-clothesv2?url=${encodeURIComponent(imageUrl)}&key=${apiKey}`;

            const apiRes = await axios.get(apiUrl);
            
            if (!apiRes.data || !apiRes.data.status || !apiRes.data.result || !apiRes.data.result.result_url) {
                throw new Error("Gagal memproses AI, result_url tidak ditemukan.");
            }

            const finalImageUrl = apiRes.data.result.result_url;

            try {
                const editKey = {
                    remoteJid: m.chat,
                    id: statusMessage.key.id,
                    fromMe: true
                };
                if (statusMessage.key.participant) {
                    editKey.participant = statusMessage.key.participant;
                }

                await sock.relayMessage(
                    m.chat,
                    {
                        protocolMessage: {
                            key: editKey,
                            type: 14,
                            editedMessage: {
                                conversation:
`╭━━〔 ✅ AI REMOVE CLOTHES 〕━━╮

[████████████] 100%

✅ Proses AI berhasil!

📤 Mengirim hasil gambar...

╰━━━━━━━━━━━━━━━━━━━━╯`
                            }
                        }
                    },
                    {}
                );
            } catch {}

            await sleep(1000);

            // ====================================================
            // KIRIM HASIL GAMBAR DENGAN BUTTONS
            // ====================================================

            try {
                if (statusMessage?.key) {
                    await sock.sendMessage(m.chat, { delete: statusMessage.key });
                }
            } catch {}

            const caption = 
`✅ *AI REMOVE CLOTHES BERHASIL*\n\n` +
`👑 *Status:* Success\n\n` +
``;

            const buttons = [
                {
                    name: "cta_copy",
                    buttonParamsJson: JSON.stringify({
                        display_text: "📋 Salin URL Hasil",
                        copy_code: finalImageUrl
                    })
                }
            ];

            return sock.sendMessage(
                m.chat,
                {
                    image: { url: finalImageUrl },
                    caption: caption,
                    footer: "Powered by ReyCode",
                    interactiveButtons: buttons
                },
                {
                    quoted: m
                }
            );

        } catch (error) {

            console.error(
                "[ REMOVE CLOTHES ERROR ]",
                error
            );

            if (
                statusMessage?.key
            ) {

                try {
                    await sock.sendMessage(m.chat, { delete: statusMessage.key });
                } catch {}
            }

            const errText = 
`╭━━〔 ❌ REMOVE CLOTHES GAGAL 〕━━╮

❌ *Gagal memproses AI!*

⚠️ ${String(error.message).slice(0, 150)}

╰━━━━━━━━━━━━━━━━━━━━╯`;

            return sock.sendMessage(m.chat, {
                text: errText,
                footer: "Powered by ReyCode",
                interactiveButtons: [
                    {
                        name: "cta_copy",
                        buttonParamsJson: JSON.stringify({
                            display_text: "📋 Salin Pesan Error",
                            copy_code: String(error.message)
                        })
                    }
                ]
            }, { quoted: m });
        }
    }
};
