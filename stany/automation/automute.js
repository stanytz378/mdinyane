/*****************************************************************************
 *                     Developed By STANY TZ                                 *
 *****************************************************************************/

import fs from 'fs';
import path from 'path';
import moment from 'moment-timezone';
import { channelInfo } from '../../stanytz/messageConfig.js';
import isOwner from '../../stanymain/isOwner.js';
import isAdmin from '../../stanymain/isAdmin.js';

const DATA_DIR = path.join(process.cwd(), 'stanydata');
const AUTO_MUTE_FILE = path.join(DATA_DIR, 'automute.json');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(AUTO_MUTE_FILE)) {
    fs.writeFileSync(AUTO_MUTE_FILE, JSON.stringify({ enabled: false, messageLimit: 10, timeWindow: 10, muteDuration: 5 }, null, 2));
}

const messageCounts = new Map();

async function sendForwardedMessage(sock, chatId, text, mentions = [], quoted = null) {
    try {
        await sock.sendMessage(chatId, { text: text, contextInfo: channelInfo.contextInfo, mentions: mentions }, { quoted: quoted });
    } catch (error) {
        await sock.sendMessage(chatId, { text: text, mentions: mentions }, { quoted: quoted });
    }
}

async function readConfig() {
    try { return JSON.parse(fs.readFileSync(AUTO_MUTE_FILE, 'utf8')); } catch { return { enabled: false, messageLimit: 10, timeWindow: 10, muteDuration: 5 }; }
}

async function writeConfig(config) { try { fs.writeFileSync(AUTO_MUTE_FILE, JSON.stringify(config, null, 2)); return true; } catch { return false; } }

export async function handleAutoMute(sock, chatId, senderId) {
    try {
        const config = await readConfig();
        if (!config.enabled) return;
        const adminCheck = await isAdmin(sock, chatId, senderId);
        if (adminCheck.isSenderAdmin) return;
        const now = Date.now();
        if (!messageCounts.has(senderId)) messageCounts.set(senderId, []);
        const timestamps = messageCounts.get(senderId).filter(t => now - t < config.timeWindow * 1000);
        timestamps.push(now);
        messageCounts.set(senderId, timestamps);
        if (timestamps.length >= config.messageLimit) {
            await sock.groupParticipantsUpdate(chatId, [senderId], 'remove');
            messageCounts.delete(senderId);
            await sock.sendMessage(chatId, { text: `🔇 @${senderId.split('@')[0]} has been auto-muted for spamming!`, contextInfo: channelInfo.contextInfo, mentions: [senderId] });
        }
    } catch (error) {}
}

export default {
    name: 'automute',
    description: 'Auto mute spammers',
    icon: '🔇',
    alias: ['amute'],
    category: 'automation',
    ownerOnly: true,
    
    async execute(sock, msg, args, currentPrefix, { isOwner, jidManager }) {
        const chatId = msg.key.remoteJid;
        const senderId = msg.key.participant || chatId;
        
        const ownerCheck = await isOwner(senderId, jidManager);
        if (!ownerCheck.isOwner) {
            await sendForwardedMessage(sock, chatId, `╭──❍「 *🔇 AUTO MUTE* 」❍\n├ ❌ Owner only command!\n╰──────❍`, [senderId], msg);
            return;
        }
        
        const config = await readConfig();
        const action = args[0]?.toLowerCase();
        const now = moment().tz('Africa/Dar_es_Salaam');
        
        if (!action || action === 'status') {
            await sendForwardedMessage(sock, chatId, `╭──❍「 *🔇 AUTO MUTE* 」❍
├ 📝 *Status* : ${config.enabled ? '✅ ENABLED' : '❌ DISABLED'}
├ 📊 *Limit* : ${config.messageLimit} msgs in ${config.timeWindow}s
├ ⏱️ *Mute* : ${config.muteDuration} minutes
├ 📅 *Date* : ${now.format('DD/MM/YYYY')}
├ ⏰ *Time* : ${now.format('HH:mm:ss')} EAT
╰─┬────❍
╭─┴─❍「 *📋 COMMANDS* 」❍
│ 🔧 ${currentPrefix}automute on - Enable
│ 🔧 ${currentPrefix}automute off - Disable
│ 🔧 ${currentPrefix}automute set <limit> <seconds> - Set threshold
╰──────❍`, [], msg);
            return;
        }
        
        if (action === 'on') { config.enabled = true; await writeConfig(config); await sendForwardedMessage(sock, chatId, `╭──❍「 *🔇 AUTO MUTE* 」❍\n├ ✅ ENABLED\n╰──────❍`, [], msg); }
        else if (action === 'off') { config.enabled = false; await writeConfig(config); await sendForwardedMessage(sock, chatId, `╭──❍「 *🔇 AUTO MUTE* 」❍\n├ ❌ DISABLED\n╰──────❍`, [], msg); }
        else if (action === 'set') {
            const limit = parseInt(args[1]);
            const seconds = parseInt(args[2]);
            if (isNaN(limit) || isNaN(seconds)) { await sendForwardedMessage(sock, chatId, `╭──❍「 *🔇 AUTO MUTE* 」❍\n├ ❌ Usage: ${currentPrefix}automute set 10 10\n╰──────❍`, [], msg); return; }
            config.messageLimit = limit;
            config.timeWindow = seconds;
            await writeConfig(config);
            await sendForwardedMessage(sock, chatId, `╭──❍「 *🔇 AUTO MUTE* 」❍\n├ ✅ Set: ${limit} msgs in ${seconds}s\n╰──────❍`, [], msg);
        }
    }
};