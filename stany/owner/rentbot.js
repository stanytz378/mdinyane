/*****************************************************************************
 *                                                                           *
 *                     Developed By STANY TZ                                 *
 *                                                                           *
 *  🌐  GitHub   : https://github.com/Stanytz378                             *
 *  ▶️  YouTube  : https://youtube.com/@STANYTZ                              *
 *  💬  WhatsApp : https://whatsapp.com/channel/0029Vb7fzu4EwEjmsD4Tzs1p     *
 *                                                                           *
 *    © 2026 STANY TZ. All rights reserved.                                 *
 *                                                                           *
 *****************************************************************************/

const {
    default: makeWASocket,
    useMultiFileAuthState,
    DisconnectReason,
    fetchLatestBaileysVersion,
    makeCacheableSignalKeyStore,
    Browsers
} = require("@whiskeysockets/baileys");
const NodeCache = require("node-cache");
const pino = require("pino");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const moment = require("moment-timezone");

// Global connections array
if (!global.conns) global.conns = [];

// Owner file path
const OWNER_FILE = path.join(process.cwd(), 'owner.json');
const CLONES_DIR = path.join(process.cwd(), 'session', 'clones');

if (!fs.existsSync(CLONES_DIR)) {
    fs.mkdirSync(CLONES_DIR, { recursive: true });
}

// Store active clones waiting for code
const pendingClones = new Map();

// ============================================================
// OWNER CHECK
// ============================================================

function isUserOwner(senderId) {
    try {
        if (!senderId) return false;
        
        let senderNumber = senderId;
        if (senderNumber.includes('@')) senderNumber = senderNumber.split('@')[0];
        if (senderNumber.includes(':')) senderNumber = senderNumber.split(':')[0];
        senderNumber = senderNumber.replace(/[^0-9]/g, '');
        
        if (!senderNumber || senderNumber.length < 5) return false;
        
        if (fs.existsSync(OWNER_FILE)) {
            try {
                const ownerData = JSON.parse(fs.readFileSync(OWNER_FILE, 'utf8'));
                const ownerNumber = ownerData.OWNER_CLEAN_NUMBER || ownerData.OWNER_NUMBER;
                if (ownerNumber && senderNumber === ownerNumber) return true;
            } catch (e) {}
        }
        
        const envOwner = process.env.OWNER_NUMBER;
        if (envOwner) {
            const cleanEnv = envOwner.replace(/[^0-9]/g, '');
            if (senderNumber === cleanEnv) return true;
        }
        
        return false;
    } catch (error) {
        return false;
    }
}

// ============================================================
// SESSION FUNCTIONS
// ============================================================

async function saveCloneSession(authId, data) {
    try {
        const sessionPath = path.join(CLONES_DIR, authId);
        if (!fs.existsSync(sessionPath)) {
            fs.mkdirSync(sessionPath, { recursive: true });
        }
        fs.writeFileSync(path.join(sessionPath, 'info.json'), JSON.stringify(data, null, 2));
    } catch (e) {}
}

async function deleteCloneSession(authId) {
    try {
        const sessionPath = path.join(CLONES_DIR, authId);
        if (fs.existsSync(sessionPath)) {
            fs.rmSync(sessionPath, { recursive: true, force: true });
        }
        pendingClones.delete(authId);
    } catch (e) {}
}

async function getAllCloneSessions() {
    try {
        if (!fs.existsSync(CLONES_DIR)) return [];
        return fs.readdirSync(CLONES_DIR);
    } catch (e) {
        return [];
    }
}

// ============================================================
// SEND MESSAGE WITH ICONS
// ============================================================

async function sendMessage(sock, chatId, text, quoted = null) {
    try {
        await sock.sendMessage(chatId, { text: text }, { quoted: quoted });
    } catch (error) {}
}

// ============================================================
// GENERATE AND SEND CODE
// ============================================================

async function generateAndSendCode(authId, mainSock, chatId, message) {
    const pending = pendingClones.get(authId);
    
    if (!pending) {
        await sendMessage(mainSock, chatId, `❌ *Clone not found*\n📝 Use .rentbot <number> first`, message);
        return false;
    }
    
    try {
        const { conn, userNumber } = pending;
        
        // Request code from WhatsApp
        let code = await conn.requestPairingCode(userNumber);
        code = code?.match(/.{1,4}/g)?.join("-") || code;
        
        // Update pending with code and expiry (5 minutes)
        pending.code = code;
        pending.codeExpiresAt = Date.now() + 5 * 60 * 1000;
        pendingClones.set(authId, pending);
        
        const pairingText = `╭──❍「 *🤖 RENT BOT - PAIRING CODE* 」❍
├ 📞 *Number* : +${userNumber}
├ 🔑 *Code* : ${code}
├ ⏱️ *Expires* : 5 minutes
╰─┬────❍
╭─┴─❍「 *📋 INSTRUCTIONS* 」❍
│ 1️⃣ WhatsApp Settings
│ 2️⃣ Linked Devices
│ 3️⃣ Link with Phone Number
│ 4️⃣ Enter code: ${code}
╰──────❍
_If code expires, use .rentbot code ${authId} again_
▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`;
        
        await mainSock.sendMessage(chatId, { text: pairingText }, { quoted: message });
        
        // Auto delete after 5 minutes
        setTimeout(() => {
            const current = pendingClones.get(authId);
            if (current && current.codeExpiresAt && Date.now() > current.codeExpiresAt) {
                pendingClones.delete(authId);
                mainSock.sendMessage(chatId, `⏰ *Code expired* for clone ${authId}. Use .rentbot ${userNumber} again.`).catch(() => {});
            }
        }, 5 * 60 * 1000);
        
        return true;
    } catch (err) {
        await sendMessage(mainSock, chatId, "❌ *Failed to generate code*\n📝 Try again.", message);
        return false;
    }
}

// ============================================================
// START CLONE
// ============================================================

async function startClone(userNumber, authId, mainSock, chatId, message, date, time) {
    const sessionPath = path.join(CLONES_DIR, authId);
    
    try {
        const { state, saveCreds } = await useMultiFileAuthState(sessionPath);
        const { version } = await fetchLatestBaileysVersion();
        const msgRetryCounterCache = new NodeCache();
        
        const conn = makeWASocket({
            version,
            logger: pino({ level: 'silent' }),
            printQRInTerminal: false,
            browser: Browsers.macOS("Chrome"), 
            auth: {
                creds: state.creds,
                keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "fatal" })),
            },
            markOnlineOnConnect: true,
            msgRetryCounterCache,
            connectTimeoutMs: 120000,
            defaultQueryTimeoutMs: 0,
            keepAliveIntervalMs: 30000,
            mobile: false
        });
        
        // Add to pending (waiting for code request)
        pendingClones.set(authId, {
            userNumber: userNumber,
            conn: conn,
            createdAt: Date.now()
        });
        
        await sendMessage(mainSock, chatId, `╭──❍「 *🤖 RENT BOT* 」❍
├ ✅ *Clone Created!*
├ 🆔 *ID* : ${authId}
├ 📞 *Number* : +${userNumber}
├ 📅 *Date* : ${date}
├ ⏰ *Time* : ${time} EAT
╰─┬────❍
╭─┴─❍「 *📋 NEXT STEP* 」❍
│ 🔧 .rentbot code ${authId}
╰──────❍
▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`, message);
        
        // Save credentials when updated
        conn.ev.on('creds.update', async () => {
            await saveCreds();
            await saveCloneSession(authId, {
                userNumber,
                createdAt: Date.now(),
                status: 'active'
            });
            pendingClones.delete(authId);
        });
        
        // Handle connection updates
        conn.ev.on('connection.update', async (update) => {
            const { connection, lastDisconnect } = update;
            
            if (connection === 'open') {
                if (!global.conns) global.conns = [];
                global.conns.push(conn);
                
                await saveCloneSession(authId, {
                    userNumber,
                    createdAt: Date.now(),
                    status: 'online',
                    connectedAt: Date.now()
                });
                pendingClones.delete(authId);
                
                await mainSock.sendMessage(chatId, { 
                    text: `✅ *Clone ${authId} is ONLINE!*`
                }, { quoted: message });
            }
            
            if (connection === 'close') {
                const code = lastDisconnect?.error?.output?.statusCode;
                if (code !== DisconnectReason.loggedOut) {
                    setTimeout(() => startClone(userNumber, authId, mainSock, chatId, message, date, time), 5000);
                } else {
                    await deleteCloneSession(authId);
                    const index = global.conns.indexOf(conn);
                    if (index > -1) global.conns.splice(index, 1);
                }
            }
        });
        
        return conn;
    } catch (error) {
        pendingClones.delete(authId);
        await mainSock.sendMessage(chatId, { text: `❌ *Failed*: ${error.message}` }, { quoted: message });
        return null;
    }
}

// ============================================================
// MAIN COMMAND
// ============================================================

module.exports = {
    name: 'rentbot',
    description: 'Create WhatsApp bot clone',
    icon: '🤖',
    alias: ['clone', 'botclone', 'subbot'],
    category: 'owner',
    ownerOnly: true,

    async execute(sock, message, args, currentPrefix, options) {
        const chatId = message.key.remoteJid;
        const senderId = message.key.participant || chatId;
        
        const now = moment().tz('Africa/Dar_es_Salaam');
        const date = now.format('DD/MM/YYYY');
        const time = now.format('HH:mm:ss');
        
        // Owner check
        if (!isUserOwner(senderId)) {
            await sendMessage(sock, chatId, `❌ *Owner only command!*`, message);
            return;
        }
        
        // HELP
        if (!args[0] || args[0].toLowerCase() === 'help') {
            const helpMsg = `╭──❍「 *🤖 RENT BOT* 」❍
├ 📝 *Commands* :
│
│ 🔧 ${currentPrefix}rentbot <number> - Create clone
│ 🔧 ${currentPrefix}rentbot code <id> - Get pairing code
│ 🔧 ${currentPrefix}rentbot list - List clones
│ 🔧 ${currentPrefix}rentbot stop <id> - Stop clone
│ 🔧 ${currentPrefix}rentbot stopall - Stop all clones
│
├ 📝 *Example* :
│ 🔹 ${currentPrefix}rentbot 255712345678
│ 🔹 ${currentPrefix}rentbot code abc123
│
├ ⏱️ *Code expires in 5 minutes*
╰──────❍
▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`;
            await sendMessage(sock, chatId, helpMsg, message);
            return;
        }
        
        // GET CODE
        if (args[0].toLowerCase() === 'code') {
            const authId = args[1];
            if (!authId) {
                await sendMessage(sock, chatId, `❌ *Usage*: ${currentPrefix}rentbot code <clone_id>`, message);
                return;
            }
            await sendMessage(sock, chatId, `🔄 *Generating code...*`, message);
            await generateAndSendCode(authId, sock, chatId, message);
            return;
        }
        
        // LIST CLONES
        if (args[0].toLowerCase() === 'list') {
            const clones = await getAllCloneSessions();
            const pending = Array.from(pendingClones.keys());
            
            if (clones.length === 0 && pending.length === 0) {
                await sendMessage(sock, chatId, `📝 *No active clones*`, message);
                return;
            }
            
            let listMsg = `╭──❍「 *🤖 CLONES LIST* 」❍\n`;
            
            if (pending.length > 0) {
                listMsg += `\n╭─┴─❍「 *⏳ PENDING* 」❍\n`;
                for (let i = 0; i < pending.length; i++) {
                    const id = pending[i];
                    const p = pendingClones.get(id);
                    listMsg += `│ 🆔 ${id} | +${p.userNumber}\n`;
                }
            }
            
            if (clones.length > 0) {
                listMsg += `\n╭─┴─❍「 *📋 ACTIVE* 」❍\n`;
                for (let i = 0; i < clones.length; i++) {
                    const id = clones[i];
                    const info = JSON.parse(fs.readFileSync(path.join(CLONES_DIR, id, 'info.json'), 'utf8'));
                    const isOnline = global.conns?.some(c => c?.user?.id?.includes(id));
                    const status = isOnline ? '🟢 ONLINE' : '⚫ OFFLINE';
                    listMsg += `│ ${status} ${id} | +${info.userNumber}\n`;
                }
            }
            
            listMsg += `╰──────❍\n▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`;
            await sendMessage(sock, chatId, listMsg, message);
            return;
        }
        
        // STOP CLONE
        if (args[0].toLowerCase() === 'stop') {
            const cloneId = args[1];
            if (!cloneId) {
                await sendMessage(sock, chatId, `❌ *Usage*: ${currentPrefix}rentbot stop <clone_id>`, message);
                return;
            }
            
            // Check pending
            if (pendingClones.has(cloneId)) {
                const p = pendingClones.get(cloneId);
                try { if (p.conn) p.conn.ws.close(); } catch(e) {}
                pendingClones.delete(cloneId);
                await sendMessage(sock, chatId, `✅ *Clone ${cloneId} stopped*`, message);
                return;
            }
            
            // Check online clone
            const cloneConn = global.conns?.find(c => c?.user?.id?.includes(cloneId));
            if (cloneConn) {
                try { cloneConn.ws.close(); } catch(e) {}
                const index = global.conns.indexOf(cloneConn);
                if (index > -1) global.conns.splice(index, 1);
            }
            
            await deleteCloneSession(cloneId);
            await sendMessage(sock, chatId, `✅ *Clone ${cloneId} stopped*`, message);
            return;
        }
        
        // STOP ALL
        if (args[0].toLowerCase() === 'stopall') {
            const clones = await getAllCloneSessions();
            
            for (const [id, p] of pendingClones) {
                try { if (p.conn) p.conn.ws.close(); } catch(e) {}
            }
            pendingClones.clear();
            
            for (const conn of (global.conns || [])) {
                try { if (conn.ws) conn.ws.close(); } catch(e) {}
            }
            global.conns = [];
            
            for (const id of clones) {
                await deleteCloneSession(id);
            }
            
            await sendMessage(sock, chatId, `✅ *All clones stopped* (${clones.length + pendingClones.size} terminated)`, message);
            return;
        }
        
        // CREATE NEW CLONE
        let userNumber = args[0].replace(/[^0-9]/g, '');
        
        if (!userNumber || userNumber.length < 10) {
            await sendMessage(sock, chatId, `❌ *Invalid number*\n📝 Use: ${currentPrefix}rentbot 255712345678`, message);
            return;
        }
        
        const authId = crypto.randomBytes(4).toString('hex');
        await startClone(userNumber, authId, sock, chatId, message, date, time);
    }
};