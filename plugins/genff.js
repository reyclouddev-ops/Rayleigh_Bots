import axios from 'axios';
import crypto from 'crypto';

export default {
  name: "Free Fire Guest Generator",
  command: ["ffguest", "genff"],
  category: "Tools",
  description: "Membuat akun Guest Free Fire secara otomatis dan mengambil token serta UID akun baru.",

  async run(sock, m, { text, prefix, command }) {
    let countInput = parseInt(text.trim()) || 1;
    let maxCount = Math.min(Math.max(countInput, 1), 5); // Batasi maksimal 5 akun per eksekusi agar tidak timeout

    let statusMsg = null;

    try {
      await sock.sendMessage(m.chat, { react: { text: '⏳', key: m.key } });

      statusMsg = await sock.sendMessage(
        m.chat,
        {
          text: 
`╭━━〔 🎮 FREE FIRE GUEST SYSTEM 〕━━╮

⏳ Sedang membuat ${maxCount} akun Guest FF...

╰━━━━━━━━━━━━━━━━━━━━╯`
        },
        { quoted: m }
      );

      const app_id = 100067;
      const secret = '2ee44819e9b4598845141067b281621874d0d5d7af9d8f7e00c1e54715b7d1e3';
      const host = 'https://100067.connect.garena.com';
      const ua = 'GarenaMSDK/4.0.42(NEO G12 ;Android 17;in;ID;app 1.130.1 2019121040;)';

      let resultsText = "";
      let accountsData = [];

      for (let i = 0; i < maxCount; i++) {
        const password = crypto.randomBytes(32).toString('hex').toUpperCase();
        const regBody = { app_id, client_type: 2, password, source: 2 };
        const sig = crypto.createHmac('sha256', secret).update(JSON.stringify(regBody)).digest('hex');

        const regRes = await axios.post(`${host}/api/v2/oauth/guest:register`, regBody, {
          headers: { 'User-Agent': ua, 'Content-Type': 'application/json; charset=utf-8', 'Authorization': `Signature ${sig}` },
          validateStatus: () => true
        });

        if (regRes.data.code !== 0 || !regRes.data.data?.uid) {
          throw new Error(regRes.data.error || 'Gagal register akun guest Free Fire.');
        }

        const uid = regRes.data.data.uid;
        const grantRes = await axios.post(`${host}/api/v2/oauth/guest/token:grant`, {
          client_id: app_id,
          client_secret: secret,
          client_type: 2,
          password,
          response_type: 'token',
          uid
        }, {
          headers: { 'User-Agent': ua, 'Content-Type': 'application/json; charset=utf-8' },
          validateStatus: () => true
        });

        if (grantRes.data.code !== 0 || !grantRes.data.data?.access_token) {
          throw new Error(grantRes.data.error || 'Gagal mengambil token guest Free Fire.');
        }

        const accInfo = {
          uid,
          password,
          open_id: grantRes.data.data.open_id,
          access_token: grantRes.data.data.access_token
        };

        accountsData.push(accInfo);
        resultsText += `\n📌 *Akun ke-${i + 1}*\n🆔 *UID:* ${uid}\n🔑 *Password:* ${password}\n`;
      }

      await sock.sendMessage(m.chat, { react: { text: '✅', key: m.key } });

      try {
        if (statusMsg?.key) {
          await sock.sendMessage(m.chat, { delete: statusMsg.key });
        }
      } catch {}

      const finalCaption = 
`╭━━〔 ✅ FREE FIRE GUEST BERHASIL 〕━━╮
${resultsText}
╰━━━━━━━━━━━━━━━━━━━━╯
Powered by ReyCloudSHP`;

      const buttons = [
        {
          name: "cta_copy",
          buttonParamsJson: JSON.stringify({
            display_text: "📋 Salin Semua Akun",
            copy_code: JSON.stringify(accountsData, null, 2)
          })
        }
      ];

      return sock.sendMessage(m.chat, {
        text: finalCaption,
        footer: "Powered by ReyCloudSHP",
        interactiveButtons: buttons
      }, { quoted: m });

    } catch (error) {
      console.error('[FF GUEST BOT ERROR]', error);

      if (statusMsg?.key) {
        try {
          await sock.sendMessage(m.chat, { delete: statusMsg.key });
        } catch {}
      }

      await sock.sendMessage(m.chat, { react: { text: '❌', key: m.key } });
      const errMsg = error.response?.data?.message || error.message;

      return sock.sendMessage(m.chat, {
        text: `❌ *Gagal membuat akun Guest FF!*\n\n⚠️ ${errMsg}`,
        footer: "Powered by ReyCloudSHP"
      }, { quoted: m });
    }
  }
};