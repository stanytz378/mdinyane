/*****************************************************************************
 *                     Developed By STANY TZ                                 *
 *****************************************************************************/

import fs from 'fs';
import path from 'path';
import moment from 'moment-timezone';
import { channelInfo } from '../../stanytz/messageConfig.js';
import isOwner from '../../stanymain/isOwner.js';

const DATA_DIR = path.join(process.cwd(), 'stanydata');
const AUTORECORDING_FILE = path.join(DATA_DIR, 'autorecording.json');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(AUTORECORDING_FILE)) {
    fs.writeFileSync(AUTORECORDING_FILE, JSON.stringify({ enabled: false, location: 'both' }, null, 2));
}

const recordingSessions = new Map();

async function sendStyledMessage(sock, chatId, text, mentions = [], quoted = null) {
    try {
        await sock.sendMessage(chatId, { text: text, contextInfo: channelInfo.contextInfo, mentions: mentions }, { quoted: quoted });
    } catch (error) {
        await sock.sendMessage(chatId, { text: text, mentions: mentions }, { quoted: quoted });
    }
}

async function loadConfig() {
    try { return JSON.parse(fs.readFileSync(AUTORECORDING_FILE, 'utf8')); } catch { return { enabled: false, location: 'both' }; }
}

async function saveConfig(config) { try { fs.writeFileSync(AUTORECORDING_FILE, JSON.stringify(config, null, 2)); return true; } catch { return false; } }

function shouldShowRecording(chatId, location) {
    const isGroup = chatId?.endsWith('@g.us');
    if (location === 'both') return true;
    if (location === 'private' && !isGroup) return true;
    if (location === 'groups' && isGroup) return true;
    return false;
}

export async function handleAutoRecording(sock, chatId, senderId) {
    try {
        const config = await loadConfig();
        if (!config.enabled) return false;
        if (!shouldShowRecording(chatId, config.location)) return false;
        const botNumber = sock.user.id.split(':')[0];
        if (senderId.includes(botNumber)) return false;
        if (recordingSessions.has(chatId)) return false;
        recordingSessions.set(chatId, true);
        await sock.sendPresenceUpdate('recording', chatId);
        await new Promise(r => setTimeout(r, Math.random() * 1500 + 500));
        await sock.sendPresenceUpdate('paused', chatId);
        setTimeout(() => recordingSessions.delete(chatId), 1000);
        return true;
    } catch (error) { recordingSessions.delete(chatId); return false; }
}

export default {
    name: 'autorecording',
    description: 'Auto recording indicator',
    icon: '🎙️',
    alias: ['recording', 'autorecord'],
    category: 'automation',
    ownerOnly: true,
    
    async execute(sock, msg, args, currentPrefix, { isOwner, jidManager }) {
        const chatId = msg.key.remoteJid;
        const senderId = msg.key.participant || chatId;
        
        const ownerCheck = await isOwner(senderId, jidManager);
        if (!ownerCheck.isOwner) {
            await sendStyledMessage(sock, chatId, `╭──❍「 *🎙️ AUTO RECORDING* 」❍\n├ ❌ Owner only command!\n╰──────❍`, [senderId], msg);
            return;
        }
        
        const config = await loadConfig();
        const action = args[0]?.toLowerCase();
        const now = moment().tz('Africa/Dar_es_Salaam');
        
        if (!action || action === 'status') {
            const locationText = config.location === 'both' ? '🌍 DM + Groups' : config.location === 'private' ? '💬 DM only' : '👥 Groups only';
            await sendStyledMessage(sock, chatId, `╭──❍「 *🎙️ AUTO RECORDING* 」❍
├ 📝 *Status* : ${config.enabled ? '✅ ENABLED' : '❌ DISABLED'}
├ 📍 *Location* : ${locationText}
├ 📅 *Date* : ${now.format('DD/MM/YYYY')}
├ ⏰ *Time* : ${now.format('HH:mm:ss')} EAT
╰─┬────❍
╭─┴─❍「 *📋 COMMANDS* 」❍
│ 🔧 ${currentPrefix}autorecording on - Enable
│ 🔧 ${currentPrefix}autorecording off - Disable
│ 🔧 ${currentPrefix}autorecording both - DM + Groups
│ 🔧 ${currentPrefix}autorecording private - DM only
│ 🔧 ${currentPrefix}autorecording groups - Groups only
╰──────❍`, [], msg);
            return;
        }
        
        if (action === 'on') { config.enabled = true; await saveConfig(config); await sendStyledMessage(sock, chatId, `╭──❍「 *🎙️ AUTO RECORDING* 」❍\n├ ✅ ENABLED\n╰──────❍`, [], msg); }
        else if (action === 'off') { config.enabled = false; await saveConfig(config); await sendStyledMessage(sock, chatId, `╭──❍「 *🎙️ AUTO RECORDING* 」❍\n├ ❌ DISABLED\n╰──────❍`, [], msg); }
        else if (action === 'both') { config.location = 'both'; await saveConfig(config); await sendStyledMessage(sock, chatId, `╭──❍「 *🎙️ AUTO RECORDING* 」❍\n├ 🌍 Location: BOTH\n╰──────❍`, [], msg); }
        else if (action === 'private') { config.location = 'private'; await saveConfig(config); await sendStyledMessage(sock, chatId, `╭──❍「 *🎙️ AUTO RECORDING* 」❍\n├ 💬 Location: PRIVATE ONLY\n╰──────❍`, [], msg); }
        else if (action === 'groups') { config.location = 'groups'; await saveConfig(config); await sendStyledMessage(sock, chatId, `╭──❍「 *🎙️ AUTO RECORDING* 」❍\n├ 👥 Location: GROUPS ONLY\n╰──────❍`, [], msg); }
    }
};