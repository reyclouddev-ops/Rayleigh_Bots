import axios from 'axios';
import crypto from 'crypto';
import fetch from 'node-fetch';

const key = process.env.AM_KEY;
const idt = process.env.IDT;
const vfy = process.env.VFY;

const DOMAIN = "akunlama.com";
const BASE_URL = "https://akunlama.com/api";

const frontName = [
    "haru", "yuki", "sora", "nana", "mika", "iroha", "akari", "hina", "yuna", "rin",
    "mio", "emi", "aya", "mei", "riko", "saki", "kana", "kira", "aoi", "rei",
    "yui", "mari", "nami", "runa", "shiro", "kuro", "hana", "suzu", "kaori", "sayu",
    "miku", "niko", "risa", "eri", "mina", "noa", "yume", "koko", "momo", "fuyu"
];

const endName = [
    "chan", "san", "kun", "nya", "neko", "mimi", "koko", "yume", "sora", "yuki",
    "hana", "hime", "kira", "luna", "star", "moon", "sky", "cloud", "rain", "snow",
    "code", "dev", "tech", "bot", "mail", "zone", "hub", "lab", "base", "core"
];

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

async function requestApi(url) {
    const res = await fetch(url);
    const textData = await res.text();
    try {
        return JSON.parse(textData);
    } catch {
        return textData;
    }
}

async function listInbox(username) {
    const recipient = username.replace(`@${DOMAIN}`, "").trim();
    const reqUrl = `${BASE_URL}/list?recipient=${encodeURIComponent(recipient)}`;
    const res = await requestApi(reqUrl);
    return Array.isArray(res) ? res : [];
}

async function getEmailDetail(region, keyParam) {
    const metaUrl = `${BASE_URL}/getKey?region=${encodeURIComponent(region)}&key=${encodeURIComponent(keyParam)}`;
    const htmlUrl = `${BASE_URL}/getHtml?region=${encodeURIComponent(region)}&key=${encodeURIComponent(keyParam)}`;
    const [, html] = await Promise.all([requestApi(metaUrl), requestApi(htmlUrl)]);
    const rawHtml = typeof html === 'string' ? html : JSON.stringify(html);
    
    const links = [];
    const regex = /href=["'](https?:\/\/[^"']+)["']/gi;
    let match;
    while ((match = regex.exec(rawHtml)) !== null) {
        const matchedUrl = match[1].replace(/&amp;/g, '&');
        if (!links.includes(matchedUrl)) links.push(matchedUrl);
    }
    return { html: rawHtml, links };
}

async function waitForVerificationLink(username, timeoutSec = 60) {
    const clean = username.replace(`@${DOMAIN}`, "").trim();
    const startTime = Date.now();
    while (Date.now() - startTime < timeoutSec * 1000) {
        try {
            const messages = await listInbox(clean);
            if (messages.length > 0) {
                const latest = messages[0];
                const region = latest.storage?.region || 'us';
                const keyStorage = latest.storage?.key;
                if (keyStorage) {
                    const detail = await getEmailDetail(region, keyStorage);
                    const targetLink = detail.links.find(l => l.includes('firebaseapp.com') || l.includes('google.com') || l.includes('oobCode'));
                    if (targetLink) return targetLink;
                }
            }
        } catch (_) {}
        await new Promise(resolve => setTimeout(resolve, 4000));
    }
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
`╭━━〔 🎬 ALIGHT MOTION AUTO V2 〕━━╮

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
  name: "Alight Motion Auto v2",
  command: ["ampremv2"],
  category: "Tools",
  description: "Auto Buat TempMail Akunlama, Kirim Magic Link, Tunggu OTP, & Aktifkan Premium Alight Motion Otomatis",

  async run(sock, m, { text, prefix, command }) {
    let customUser = text.trim().replace(`@${DOMAIN}`, "").trim();
    let username = customUser;

    if (!username) {
      const randomFront = frontName[Math.floor(Math.random() * frontName.length)];
      const randomEnd = endName[Math.floor(Math.random() * endName.length)];
      const randomNum = Math.floor(Math.random() * 900) + 100;
      username = `${randomFront}_${randomEnd}_${randomNum}`;
    }

    username = username.toLowerCase().replace(/\s+/g, "_");
    const email = `${username}@${DOMAIN}`;
    const weblogin = `https://${DOMAIN}/inbox/${username}/list`;

    let statusMsg = null;

    try {
      await sock.sendMessage(m.chat, { react: { text: '⏳', key: m.key } });

      statusMsg = await sock.sendMessage(
        m.chat,
        {
          text: 
`╭━━〔 🎬 ALIGHT MOTION AUTO V2 〕━━╮

⏳ Menginisialisasi TempMail...

[░░░░░░░░░░] 0%

╰━━━━━━━━━━━━━━━━━━━━╯`
        },
        { quoted: m }
      );

      await updateProgress(sock, m, statusMsg, 20, "Membuat akun TempMail di akunlama.com...", email);
      await listInbox(username);

      await updateProgress(sock, m, statusMsg, 40, "Mengirim Magic Link ke email otomatis...", email);
      const sendRes = await sendMagicLink(email);

      if (!sendRes.ok) {
        throw new Error(sendRes.why || "Gagal mengirim magic link.");
      }

      await updateProgress(sock, m, statusMsg, 60, "Menunggu pesan verifikasi masuk di inbox...", email);
      const magicLink = await waitForVerificationLink(username, 60);

      if (!magicLink) {
        throw new Error("Timeout: Magic link tidak tertangkap di inbox akunlama dalam 60 detik.");
      }

      await updateProgress(sock, m, statusMsg, 80, "Magic link tertangkap! Mengaktifkan Premium...", email);
      const verifyRes = await verifyAndActivate(email, magicLink);

      if (!verifyRes.ok) {
        throw new Error(verifyRes.why || "Gagal memproses verifikasi aktivasi akun.");
      }

      await updateProgress(sock, m, statusMsg, 100, "Alight Motion Premium Berhasil Aktif!", email);
      await sleep(400);

      const caption = 
`✅ *ALIGHT MOTION PREMIUM AUTO BERHASIL*\n\n` +
`📧 *Email:* \`${email}\`\n` +
`🌐 *Web Inbox:* ${weblogin}\n` +
`👑 *Status:* Premium 1 Tahun (Success)\n\n` +
`Powered by ReyCode`;

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
        },
        {
          name: "cta_copy",
          buttonParamsJson: JSON.stringify({
            display_text: "📋 Salin Web Inbox",
            copy_code: weblogin
          })
        }
      ];

      return sock.sendMessage(m.chat, {
        text: caption,
        footer: "",
        interactiveButtons: buttons
      }, { quoted: m });

    } catch (error) {
      console.error('[AM PREMIUM V2 ERROR]', error);

      if (statusMsg?.key) {
        try {
          await sock.sendMessage(m.chat, { delete: statusMsg.key });
        } catch {}
      }

      await sock.sendMessage(m.chat, { react: { text: '❌', key: m.key } });
      const errMsg = error.response?.data?.message || error.message;

      const failText = 
`╭━━〔 ❌ ALIGHT MOTION GAGAL 〕━━╮

❌ *Gagal memproses otomatisasi!*

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
