const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

module.exports = {
 name: "Test Edit",
 command: ["tes"],
 category: "Owner",
 description: "Test edit pesan anti rate-limit",
 isOwner: true,

 async run(sock, m) {
 const frames = [
 "🌑",
 "🌘",
 "🌗",
 "🌖",
 "🌕",
 "🌖",
 "🌗",
 "🌘",
 "🐣"
 ];

 let msg;

 try {
 msg = await sock.sendMessage(
 m.chat,
 {
 text: "🐣 Memulai test edit..."
 },
 {
 quoted: m
 }
 );

 for (let i = 0; i < frames.length; i++) {
 await sleep(1500);

 let success = false;
 let attempt = 0;

 while (!success && attempt < 3) {
 try {
 attempt++;

 await sock.sendMessage(
 m.chat,
 {
 text: `${frames[i]} Loading... ${i + 1}/${frames.length}`,
 edit: msg.key
 }
 );

 success = true;
 } catch (err) {
 console.log(
 `[TESTEDIT] Edit gagal percobaan ${attempt}:`,
 err.message
 );

 if (attempt < 3) {
 await sleep(3000);
 }
 }
 }

 if (!success) {
 console.log(
 "[TESTEDIT] Melewati frame karena gagal edit."
 );
 }
 }

 await sleep(1500);

 await sock.sendMessage(
 m.chat,
 {
 text: "✅ Test selesai!\n\n1 pesan digunakan dan diedit tanpa spam chat."
 },
 {
 edit: msg.key
 }
 );

 } catch (err) {
 console.error(
 "[TESTEDIT ERROR]",
 err
 );

 if (msg?.key) {
 try {
 await sock.sendMessage(
 m.chat,
 {
 text: "❌ Test edit gagal."
 },
 {
 edit: msg.key
 }
 );
 } catch {}
 }
 }
 }
};