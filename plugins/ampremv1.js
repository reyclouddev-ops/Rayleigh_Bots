import axios from 'axios';
import crypto from 'crypto';

const key = process.env.AM_KEY || '';
const idt = process.env.IDT || '';
const vfy = process.env.VFY || '';

const dip = () => `${crypto.randomInt(1, 255)}.${crypto.randomInt(0, 255)}.${crypto.randomInt(0, 255)}.${crypto.randomInt(1, 255)}`;

const sp = h => ({
  ...h,
  'x-forwarded-for': dip(),
  'x-real-ip': dip(),
  'client-ip': dip(),
  'x-client-ip': dip(),
  'x-originating-ip': dip(),
  'x-cluster-client-ip': dip()
});

const h1 = {
  'content-type': 'application/json',
  'x-android-package': 'com.alightcreative.motion',
  'x-android-cert': 'ECA6BF91B8715A6F810ED0BBFC65B6CD578F52A8',
  'user-agent': 'dalvik/2.1.0 (linux; u; android 15; 23127pn0cc build/bp1a.250505.005)'
};

const h2 = {
  'content-type': 'application/json; charset=utf-8',
  'user-agent': 'okhttp/3.12.1',
  'accept-encoding': 'gzip'
};

const bad = e => {
  const d = e.response?.data;
  return d ? (typeof d === 'object' ? JSON.stringify(d) : String(d)) : e.message;
};

class SimpleQueue {
  constructor(concurrency = 1) {
    this.concurrency = concurrency;
    this.running = 0;
    this.queue = [];
  }

  add(fn) {
    return new Promise((resolve, reject) => {
      this.queue.push({ fn, resolve, reject });
      this.next();
    });
  }

  next() {
    if (this.running >= this.concurrency || this.queue.length === 0) return;
    const { fn, resolve, reject } = this.queue.shift();
    this.running++;
    
    fn().then(res => {
      this.running--;
      resolve(res);
      this.next();
    }).catch(err => {
      this.running--;
      reject(err);
      this.next();
    });
  }
}

const apiQueue = new SimpleQueue(1);

function code(raw) {
  if (!raw) return null;
  let s = String(raw).replace(/&amp;/g, '&');
  try { s = decodeURIComponent(s); } catch {}
  try {
    const u = new URL(s);
    let c = u.searchParams.get('oobCode');
    if (!c) {
      const n = u.searchParams.get('link') || u.searchParams.get('q') || u.searchParams.get('url');
      if (n) { try { c = new URL(n).searchParams.get('oobCode'); } catch {} }
    }
    if (c) return c.replace(/[^a-zA-Z0-9_-]/g, '');
  } catch {}
  const m = s.match(/oobCode=([a-zA-Z0-9_-]+)/i);
  if (m) return m[1];
  const t = raw.trim();
  if (/^[a-zA-Z0-9_-]{10,}$/.test(t) && !t.includes('://')) return t;
  return null;
}

async function sendMagicLink(email) {
  return apiQueue.add(async () => {
    try {
      await axios.post(`${idt}/getOobConfirmationCode?key=${key}`, {
        requestType: 6,
        email: email,
        androidInstallApp: true,
        canHandleCodeInApp: true,
        continueUrl: 'https://alightcreative.com?ui_sid=0366624874&ui_sd=0',
        iosBundleId: 'com.alightcreative.motion',
        androidPackageName: 'com.alightcreative.motion',
        androidMinimumVersion: '585',
        clientType: 'CLIENT_TYPE_ANDROID'
      }, { headers: sp(h1) });
      return { ok: true };
    } catch (e) { return { ok: false, why: bad(e) }; }
  });
}

async function verifyAndActivate(email, rawLink) {
  return apiQueue.add(async () => {
    const c = code(rawLink);
    if (!c) return { ok: false, why: 'OobCode / Magic Link tidak valid!' };
    try {
      const a = await axios.post(`${idt}/emailLinkSignin?key=${key}`, {
        email: email, oobCode: c, clientType: 'CLIENT_TYPE_ANDROID'
      }, { headers: sp(h1) });
      
      const idToken = a.data?.idToken;
      if (!idToken) throw new Error('Gagal mendapatkan idToken dari Firebase.');

      const o = 'reycloudshp-' + crypto.randomBytes(6).toString('hex');
      const b = {
        data: {
          productId: 'am.full.sub.annual.19q4',
          token: 'mmgaobamlahbbeccfplmbkbb.AO-J1OzqG0or_GJJIx-ms8GrTm-jaglCRfhQSRPUZKpl2YspYS-oN7_94uv8RC5vQbvd_Ios2pPDStZ2n7F0hLE3FiOU7HS3R6Fquulv5xLXFECSv4ctElw',
          skuType: 'subs',
          orderId: o
        }
      };
      const headersReq = {
        ...h2,
        authorization: 'Bearer ' + idToken,
        'firebase-instance-id-token': 'cSDnCyp3T-uwp07z3tL86T:APA91bFkmvvsHw5nnqa1SBFci-99DRsKClLiETdRrVcJjS5yBx1v_FbCb1d8WhBuea_zmwnYBktyTIzcRhN4b6uNOUur9wPc0gKXmJDoZic0LhNq5V2s0xI'
      };

      const r = await axios.post(vfy, b, { headers: sp(headersReq) });
      return { ok: true, data: r.data };
    } catch (e) { return { ok: false, why: bad(e) }; }
  });
}

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

async function updateProgress(sock, m, statusMessage, progress, statusText, details = "") {
  progress = Math.max(0, Math.min(100, Math.round(progress)));
  const totalBars = 10;
  const filled = Math.round((progress / 100) * totalBars);
  const bar = "█".repeat(filled) + "░".repeat(totalBars - filled);

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
`╭━━〔 🎬 ALIGHT MOTION SYSTEM 〕━━╮

⏳ ${statusText}

[${bar}] ${progress}%

${details ? `📄 ${details}` : ""}

╰━━━━━━━━━━━━━━━━━━━━╯`
          }
        }
      },
      {}
    );
  } catch (err) {
    console.log("[PROGRESS EDIT ERROR]", err.message);
  }
}

export default {
  name: "Alight Motion API v1",
  command: ["ampremv1"],
  category: "Tools",
  description: "Kirim Magic Link & Verifikasi Auto Premium Alight Motion 1 Tahun langsung ke Firebase & Alight Creative",

  async run(sock, m, { text, prefix, command }) {
    let [email, ...linkParts] = text.trim().split('|').map(v => v.trim());
    let rawLink = linkParts.join('|') || null;

    if (!email) {
      return m.reply(
        `📌 *CARA PENGGUNAAN FITUR ALIGHT MOTION*\n\n` +
        `1️⃣ *Kirim Magic Link:*\n` +
        `└ \`${prefix + command} emailkamu@gmail.com\`\n\n` +
        `2️⃣ *Verifikasi & Activate Premium:*\n` +
        `└ \`${prefix + command} emailkamu@gmail.com | https://alightcreative.com/auth/...\``
      );
    }

    let statusMsg = null;

    try {
      await sock.sendMessage(m.chat, { react: { text: '⏳', key: m.key } });

      statusMsg = await sock.sendMessage(
        m.chat,
        {
          text: 
`╭━━〔 🎬 ALIGHT MOTION SYSTEM 〕━━╮

⏳ Memulai koneksi API Alight Motion...

[░░░░░░░░░░] 0%

╰━━━━━━━━━━━━━━━━━━━━╯`
        },
        { quoted: m }
      );

      if (rawLink) {
        await updateProgress(sock, m, statusMsg, 40, "Verifikasi token & Menerapkan status Premium...", email);
        const res = await verifyAndActivate(email, rawLink);

        if (!res.ok) {
          throw new Error(res.why || "Gagal memproses verifikasi akun.");
        }

        await updateProgress(sock, m, statusMsg, 100, "Alight Motion Premium Aktif!", email);
        await sleep(400);

        const caption = 
`✅ *ALIGHT MOTION PREMIUM AKTIF*\n\n` +
`📧 *Email:* ${email}\n` +
`👑 *Status:* Premium 1 Tahun (Success)\n\n` +
`Powered by ReyCloudSHP`;

        await sock.sendMessage(m.chat, { react: { text: '✅', key: m.key } });

        try {
          if (statusMsg?.key) {
            await sock.sendMessage(m.chat, { delete: statusMsg.key });
          }
        } catch {}

        const buttons = [
          {
            name: "cta_copy",
            buttonParamsJson: JSON.stringify({
              display_text: "📋 Salin Email",
              copy_code: email
            })
          }
        ];

        return sock.sendMessage(m.chat, {
          text: caption,
          footer: "Powered by ReyCloudSHP",
          interactiveButtons: buttons
        }, { quoted: m });
      }

      await updateProgress(sock, m, statusMsg, 50, "Mengirim magic link ke email target...", email);
      const sendRes = await sendMagicLink(email);

      if (!sendRes.ok) {
        throw new Error(sendRes.why || "Gagal mengirim magic link.");
      }

      await updateProgress(sock, m, statusMsg, 100, "Magic link berhasil dikirim!", email);
      await sleep(400);

      const commandVerify = `${prefix + command} ${email} | link_yang_dicopy`;
      const instructions = 
`📧 *MAGIC LINK BERHASIL DIKIRIM*\n\n` +
`📌 *Target:* ${email}\n\n` +
`📋 *Langkah Selanjutnya:*\n` +
`1. Cek inbox/spam email kamu.\n` +
`2. Cari email dari Alight Motion.\n` +
`3. Tekan-tahan tombol login & pilih *Salin URL* (Jangan diklik langsung).\n` +
`4. Verifikasi ke bot dengan tombol salin format perintah di bawah:\n\n` +
`Powered by ReyCloudSHP`;

      await sock.sendMessage(m.chat, { react: { text: '📩', key: m.key } });

      try {
        if (statusMsg?.key) {
          await sock.sendMessage(m.chat, { delete: statusMsg.key });
        }
      } catch {}

      const buttons = [
        {
          name: "cta_copy",
          buttonParamsJson: JSON.stringify({
            display_text: "📋 Salin Format Verifikasi",
            copy_code: commandVerify
          })
        },
        {
          name: "cta_copy",
          buttonParamsJson: JSON.stringify({
            display_text: "📋 Salin Email Target",
            copy_code: email
          })
        }
      ];

      return sock.sendMessage(m.chat, {
        text: instructions,
        footer: "Powered by ReyCloudSHP",
        interactiveButtons: buttons
      }, { quoted: m });

    } catch (error) {
      console.error('[ALIGHT API v1 ERROR]', error);

      if (statusMsg?.key) {
        try {
          await sock.sendMessage(m.chat, { delete: statusMsg.key });
        } catch {}
      }

      await sock.sendMessage(m.chat, { react: { text: '❌', key: m.key } });
      const errMsg = error.response?.data?.message || error.message;

      const failText = 
`╭━━〔 ❌ ALIGHT MOTION GAGAL 〕━━╮

❌ *Gagal memproses permintaan!*

⚠️ ${String(errMsg).slice(0, 150)}

╰━━━━━━━━━━━━━━━━━━━━╯`;

      return sock.sendMessage(m.chat, {
        text: failText,
        footer: "Powered by ReyCloudSHP",
        interactiveButtons: [
          {
            name: "cta_copy",
            buttonParamsJson: JSON.stringify({
              display_text: "📋 Salin Pesan Error",
              copy_code: String(errMsg)
            })
          }
        ]
      }, { quoted: m });
    }
  }
};
