// ============================================================
// 🚀 REYCLOUD WHATSAPP BOT (ESM VERSION)
// PAIRING CODE ONLY + NO DATABASE CHECK
// AUTO RECONNECT
// PTERODACTYL / TERMUX FRIENDLY
// ============================================================

import "./config.js";

import pkg from "@whiskeysockets/baileys";
const {
    default: makeWASocket,
    useMultiFileAuthState,
    DisconnectReason,
    makeCacheableSignalKeyStore,
    jidDecode,
    fetchLatestBaileysVersion
} = pkg;

import pino from "pino";
import chalk from "chalk";
import readline from "readline";
import NodeCache from "node-cache";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

import handler from "./system/handler.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ============================================================
// CONFIG
// ============================================================

const SESSION_PATH = "./session";

const msgRetryCounterCache = new NodeCache();

const configPath = path.join(__dirname, "config.json");

// ============================================================
// PUBLIC STATUS
// ============================================================

function getPublicStatus() {
    try {
        if (fs.existsSync(configPath)) {
            const cfg = JSON.parse(
                fs.readFileSync(configPath, "utf8")
            );

            if (typeof cfg.public === "boolean") {
                return cfg.public;
            }
        }
    } catch (err) {
        console.log(
            chalk.yellowBright(
                "⚠️ Gagal membaca config.json, menggunakan public=true"
            )
        );
    }

    return true;
}

// ============================================================
// READLINE
// ============================================================

function question(text) {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    return new Promise(resolve => {
        rl.question(text, answer => {
            rl.close();
            resolve(answer);
        });
    });
}

// ============================================================
// INPUT NOMOR UNTUK PAIRING CODE
// ============================================================

async function inputNomor() {
    let nomor = await question(
        chalk.yellowBright(
            "\nMasukkan Nomor WhatsApp\n" +
            "Format: 62xxxxxx\n" +
            "> "
        )
    );

    nomor = nomor.replace(/\D/g, "");

    if (!nomor) {
        console.log(
            chalk.redBright(
                "\n❌ Nomor tidak valid!"
            )
        );

        process.exit(1);
    }

    return nomor;
}

// ============================================================
// FORMAT JID
// ============================================================

function decodeJid(jid) {
    if (!jid) return jid;

    if (/:\d+@/.test(jid)) {
        const decoded = jidDecode(jid);

        if (decoded?.user && decoded?.server) {
            return `${decoded.user}@${decoded.server}`;
        }
    }

    return jid;
}

// ============================================================
// START BOT
// ============================================================

async function startBot() {
    try {
        // --------------------------------------------------------
        // AUTH STATE
        // --------------------------------------------------------

        const {
            state,
            saveCreds
        } = await useMultiFileAuthState(
            SESSION_PATH
        );

        // --------------------------------------------------------
        // SIGNAL CACHE
        // --------------------------------------------------------

        const signalRepositoryCache = new NodeCache({
            stdTTL: 2 * 60,
            useClones: false
        });

        // --------------------------------------------------------
        // BAILEYS VERSION
        // --------------------------------------------------------

        let version;

        try {
            const result =
                await fetchLatestBaileysVersion();

            version = result.version;

            console.log(
                chalk.gray(
                    `WA Version: ${version.join(".")}`
                )
            );

        } catch (err) {
            console.log(
                chalk.yellowBright(
                    "⚠️ Gagal mengambil versi terbaru WhatsApp."
                )
            );

            console.log(
                chalk.gray(
                    err.message
                )
            );
        }

        // --------------------------------------------------------
        // LOGIN METHOD (DIRECT PAIRING)
        // --------------------------------------------------------

        let nomor = null;

        if (!state.creds.registered) {
            nomor = await inputNomor();
        }

        // --------------------------------------------------------
        // SOCKET OPTIONS
        // --------------------------------------------------------

        const socketOptions = {
            printQRInTerminal: false,

            logger: pino({
                level: "silent"
            }),

            auth: {
                creds: state.creds,

                keys: makeCacheableSignalKeyStore(
                    state.keys,
                    pino({
                        level: "silent"
                    }),
                    signalRepositoryCache
                )
            },

            browser: [
                "Mac OS",
                "Chrome",
                "124.0.0.0"
            ],

            msgRetryCounterCache,

            defaultQueryTimeoutMs: undefined,

            connectTimeoutMs: 60000,

            keepAliveIntervalMs: 10000
        };

        if (version) {
            socketOptions.version = version;
        }

        // --------------------------------------------------------
        // CREATE SOCKET
        // --------------------------------------------------------

        const sock = makeWASocket(
            socketOptions
        );

        // --------------------------------------------------------
        // FLAG PAIRING
        // --------------------------------------------------------

        let pairingRequested = false;

        // --------------------------------------------------------
        // DECODE JID
        // --------------------------------------------------------

        sock.decodeJid = decodeJid;

        // --------------------------------------------------------
        // PUBLIC MODE
        // --------------------------------------------------------

        sock.public = getPublicStatus();

        // ========================================================
        // CREDENTIAL UPDATE
        // ========================================================

        sock.ev.on(
            "creds.update",
            saveCreds
        );

        // ========================================================
        // MESSAGE HANDLER
        // ========================================================

        sock.ev.on("messages.upsert", async chatUpdate => {
            try {
                if (!chatUpdate?.messages?.length) return;

                for (const msg of chatUpdate.messages) {
                    if (!msg?.message) continue;

                    if (msg.key?.remoteJid === "status@broadcast") {
                        continue;
                    }

                    await handler(sock, msg);
                }
            } catch (err) {
                console.error(
                    chalk.redBright("[ ERROR messages.upsert ]"),
                    err
                );
            }
        });

        // ========================================================
        // CONNECTION UPDATE
        // ========================================================

        sock.ev.on(
            "connection.update",
            async update => {
                try {
                    const {
                        connection,
                        lastDisconnect
                    } = update;

                    if (
                        connection === "connecting"
                    ) {
                        console.log(
                            chalk.cyanBright(
                                "\n🔄 Menghubungkan ke WhatsApp..."
                            )
                        );

                        if (
                            !state.creds.registered &&
                            nomor &&
                            !pairingRequested
                        ) {
                            pairingRequested = true;

                            try {
                                await new Promise(
                                    resolve =>
                                        setTimeout(
                                            resolve,
                                            1500
                                        )
                                );

                                console.log(
                                    chalk.cyanBright(
                                        "\n⏳ Meminta kode pairing..."
                                    )
                                );

                                let code;

                                try {
                                    code =
                                        await sock.requestPairingCode(
                                            nomor,
                                            "REYCLOUD"
                                        );

                                } catch (customCodeError) {
                                    console.log(
                                        chalk.yellowBright(
                                            "⚠️ Custom pairing code gagal."
                                        )
                                    );

                                    console.log(
                                        chalk.gray(
                                            "Mencoba kode otomatis..."
                                        )
                                    );

                                    code =
                                        await sock.requestPairingCode(
                                            nomor
                                        );
                                }

                                console.log("");

                                console.log(
                                    chalk.cyanBright(
                                        "╭────────────────────────────────╮"
                                    )
                                );

                                console.log(
                                    chalk.cyanBright(
                                        "│       REYCLOUD PAIRING          │"
                                    )
                                );

                                console.log(
                                    chalk.cyanBright(
                                        "├────────────────────────────────┤"
                                    )
                                );

                                console.log(
                                    chalk.white(
                                        `│ Nomor : ${nomor}`
                                    )
                                );

                                console.log(
                                    chalk.cyanBright(
                                        "├────────────────────────────────┤"
                                    )
                                );

                                console.log(
                                    chalk.greenBright(
                                        `│ Kode  : ${code}`
                                    )
                                );

                                console.log(
                                    chalk.cyanBright(
                                        "╰────────────────────────────────╯"
                                    )
                                );

                                console.log("");

                                console.log(
                                    chalk.yellowBright(
                                        "📱 Buka WhatsApp di HP"
                                    )
                                );

                                console.log(
                                    chalk.yellowBright(
                                        "   → Perangkat Tertaut"
                                    )
                                );

                                console.log(
                                    chalk.yellowBright(
                                        "   → Tautkan Perangkat"
                                    )
                                );

                                console.log(
                                    chalk.yellowBright(
                                        "   → Tautkan dengan nomor telepon"
                                    )
                                );

                                console.log("");

                                console.log(
                                    chalk.gray(
                                        "⏳ Menunggu proses pairing..."
                                    )
                                );

                            } catch (err) {
                                pairingRequested = false;

                                console.error(
                                    chalk.redBright(
                                        "\n❌ Gagal mendapatkan kode pairing:"
                                    ),
                                    err.message
                                );
                            }
                        }
                    }

                    if (
                        connection === "open"
                    ) {
                        console.clear();

                        console.log(
                            chalk.greenBright(
                                "╭────────────────────────────────╮"
                            )
                        );

                        console.log(
                            chalk.greenBright(
                                "│       REYCLOUD WHATSAPP        │"
                            )
                        );

                        console.log(
                            chalk.greenBright(
                                "├────────────────────────────────┤"
                            )
                        );

                        console.log(
                            chalk.greenBright(
                                "│        ✅ CONNECTED            │"
                            )
                        );

                        console.log(
                            chalk.greenBright(
                                "╰────────────────────────────────╯"
                            )
                        );

                        console.log("");

                        console.log(
                            chalk.cyanBright(
                                "🤖 Bot berhasil terhubung!"
                            )
                        );

                        console.log(
                            chalk.gray(
                                `📱 ${sock.user?.id || "WhatsApp"}`
                            )
                        );

                        console.log(
                            chalk.gray(
                                `🌐 Public Mode: ${sock.public}`
                            )
                        );

                        console.log("");
                    }

                    if (
                        connection === "close"
                    ) {
                        const statusCode =
                            lastDisconnect
                                ?.error
                                ?.output
                                ?.statusCode;

                        console.log("");

                        console.log(
                            chalk.redBright(
                                "╭────────────────────────────────╮"
                            )
                        );

                        console.log(
                            chalk.redBright(
                                "│      CONNECTION CLOSED         │"
                            )
                        );

                        console.log(
                            chalk.redBright(
                                "╰────────────────────────────────╯"
                            )
                        );

                        console.log(
                            chalk.gray(
                                `Disconnect Code: ${
                                    statusCode || "unknown"
                                }`
                            )
                        );

                        if (
                            statusCode ===
                            DisconnectReason.loggedOut
                        ) {
                            console.log(
                                chalk.redBright(
                                    "\n❌ WhatsApp logout."
                                )
                            );

                            console.log(
                                chalk.yellowBright(
                                    "Hapus folder session lalu login ulang."
                                )
                            );

                            return;
                        }

                        if (
                            statusCode ===
                            DisconnectReason.badSession
                        ) {
                            console.log(
                                chalk.redBright(
                                    "\n❌ Session rusak."
                                )
                            );

                            console.log(
                                chalk.yellowBright(
                                    "Hapus folder session lalu login ulang."
                                )
                            );

                            return;
                        }

                        console.log(
                            chalk.yellowBright(
                                "\n🔄 Mencoba reconnect..."
                            )
                        );

                        setTimeout(
                            () => {
                                startBot();
                            },
                            3000
                        );
                    }

                } catch (err) {
                    console.error(
                        chalk.redBright(
                            "❌ Error connection.update:"
                        ),
                        err
                    );
                }
            }
        );

        sock.ev.on(
            "connection.update",
            update => {
                if (
                    update.connection ===
                    "open"
                ) {
                    console.log(
                        chalk.greenBright(
                            "✓ Socket WhatsApp aktif."
                        )
                    );
                }
            }
        );

        return sock;

    } catch (err) {
        console.error("");

        console.error(
            chalk.redBright(
                "╭────────────────────────────────╮"
            )
        );

        console.error(
            chalk.redBright(
                "│          BOT ERROR             │"
            )
        );

        console.error(
            chalk.redBright(
                "╰────────────────────────────────╯"
            )
        );

        console.error("");

        console.error(
            chalk.redBright(
                err
            )
        );

        console.error("");

        console.log(
            chalk.yellowBright(
                "🔄 Bot akan mencoba restart..."
            )
        );

        setTimeout(
            () => {
                startBot();
            },
            5000
        );
    }
}

// ============================================================
// START
// ============================================================

console.clear();

console.log(
    chalk.cyanBright(
        "╔════════════════════════════════╗"
    )
);

console.log(
    chalk.cyanBright(
        "║      REYCLOUD WHATSAPP BOT     ║"
    )
);

console.log(
    chalk.cyanBright(
        "╚════════════════════════════════╝"
    )
);

console.log("");

startBot();
