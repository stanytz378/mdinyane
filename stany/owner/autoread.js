/*****************************************************************************
 *                     Developed By STANY TZ                                 *
 *****************************************************************************/

import fs from 'fs';
import path from 'path';
import moment from 'moment-timezone';
import { channelInfo } from '../../stanytz/messageConfig.js';
import isOwner from '../../stanymain/isOwner.js';

const DATA_DIR = path.join(process.cwd(), 'stanydata');
const AUTOREAD_FILE = path.join(DATA_DIR, 'autoread.json');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(AUTOREAD_FILE)) {
    fs.writeFileSync(AUTOREAD_FILE, JSON.stringify({ enabled: false, readGroups: true, readPrivate: true }, null, 2));
}

const readReceipts = new Set();

async function sendStyledMessage(sock, chatId, text, mentions = [], quoted = null) {
    try {
        await sock.sendMessage(chatId, { text: text, contextInfo: channelInfo.contextInfo, mentions: mentions }, { quoted: quoted });
    } catch (error) {
        await sock.sendMessage(chatId, { text: text, mentions: mentions }, { quoted: quoted });
    }
}

async function loadConfig() {
    try { return JSON.parse(fs.readFileSync(AUTOREAD_FILE, 'utf8')); } catch { return { enabled: false, readGroups: true, readPrivate: true }; }
}

async function saveConfig(config) { try { fs.writeFileSync(AUTOREAD_FILE, JSON.stringify(config, null, 2)); return true; } catch { return false; } }

export async function handleAutoRead(sock, message) {
    try {
        const config = await loadConfig();
        if (!config.enabled) return;
        const chatId = message.key.remoteJid;
        if (!chatId || chatId === 'status@broadcast') return;
        const isGroup = chatId.endsWith('@g.us');
        if (isGroup && !config.readGroups) return;
        if (!isGroup && !config.readPrivate) return;
        const receiptKey = `${chatId}_${message.key.id}`;
        if (readReceipts.has(receiptKey)) return;
        readReceipts.add(receiptKey);
        await sock.readMessages([message.key]);
        setTimeout(() => readReceipts.delete(receiptKey), 10000);
    } catch (error) {}
}

export default {
    name: 'autoread',
    description: 'Auto read messages',
    icon: '👁️',
    alias: ['aread', 'readmsg', 'autoseen'],
    category: 'automation',
    ownerOnly: true,
    
    async execute(sock, msg, args, currentPrefix, { isOwner, jidManager }) {
        const chatId = msg.key.remoteJid;
        const senderId = msg.key.participant || chatId;
        
        const ownerCheck = await isOwner(senderId, jidManager);
        if (!ownerCheck.isOwner) {
            await sendStyledMessage(sock, chatId, `╭──❍「 *👁️ AUTO READ* 」❍\n├ ❌ Owner only command!\n╰──────❍`, [senderId], msg);
            return;
        }
        
        const config = await loadConfig();
        const action = args[0]?.toLowerCase();
        const now = moment().tz('Africa/Dar_es_Salaam');
        
        if (!action || action === 'status') {
            await sendStyledMessage(sock, chatId, `╭──❍「 *👁️ AUTO READ* 」❍
├ 📝 *Status* : ${config.enabled ? '✅ ENABLED' : '❌ DISABLED'}
├ 👥 *Groups* : ${config.readGroups ? '✅' : '❌'}
├ 💬 *Private* : ${config.readPrivate ? '✅' : '❌'}
├ 📅 *Date* : ${now.format('DD/MM/YYYY')}
├ ⏰ *Time* : ${now.format('HH:mm:ss')} EAT
╰─┬────❍
╭─┴─❍「 *📋 COMMANDS* 」❍
│ 🔧 ${currentPrefix}autoread on - Enable
│ 🔧 ${currentPrefix}autoread off - Disable
│ 🔧 ${currentPrefix}autoread groups on/off
│ 🔧 ${currentPrefix}autoread private on/off
╰──────❍`, [], msg);
            return;
        }
        
        if (action === 'on') { config.enabled = true; await saveConfig(config); await sendStyledMessage(sock, chatId, `╭──❍「 *👁️ AUTO READ* 」❍\n├ ✅ ENABLED\n╰──────❍`, [], msg); }
        else if (action === 'off') { config.enabled = false; await saveConfig(config); await sendStyledMessage(sock, chatId, `╭──❍「 *👁️ AUTO READ* 」❍\n├ ❌ DISABLED\n╰──────❍`, [], msg); }
        else if (action === 'groups') {
            const sub = args[1]?.toLowerCase();
            if (sub === 'on') { config.readGroups = true; await saveConfig(config); await sendStyledMessage(sock, chatId, `╭──❍「 *👁️ AUTO READ* 」❍\n├ ✅ Groups ENABLED\n╰──────❍`, [], msg); }
            else if (sub === 'off') { config.readGroups = false; await saveConfig(config); await sendStyledMessage(sock, chatId, `╭──❍「 *👁️ AUTO READ* 」❍\n├ ❌ Groups DISABLED\n╰──────❍`, [], msg); }
        }
        else if (action === 'private') {
            const sub = args[1]?.toLowerCase();
            if (sub === 'on') { config.readPrivate = true; await saveConfig(config); await sendStyledMessage(sock, chatId, `╭──❍「 *👁️ AUTO READ* 」❍\n├ ✅ Private ENABLED\n╰──────❍`, [], msg); }
            else if (sub === 'off') { config.readPrivate = false; await saveConfig(config); await sendStyledMessage(sock, chatId, `╭──❍「 *👁️ AUTO READ* 」❍\n├ ❌ Private DISABLED\n╰──────❍`, [], msg); }
        }
    }
};