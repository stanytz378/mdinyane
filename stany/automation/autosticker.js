/*****************************************************************************
 *                     Developed By STANY TZ                                 *
 *****************************************************************************/

import fs from 'fs';
import path from 'path';
import moment from 'moment-timezone';
import { downloadContentFromMessage } from '@whiskeysockets/baileys';
import { channelInfo } from '../../stanytz/messageConfig.js';
import isOwner from '../../stanymain/isOwner.js';

const DATA_DIR = path.join(process.cwd(), 'stanydata');
const AUTO_STICKER_FILE = path.join(DATA_DIR, 'autosticker.json');
const STICKER_DIR = path.join(process.cwd(), 'sticker_cache');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(STICKER_DIR)) fs.mkdirSync(STICKER_DIR, { recursive: true });
if (!fs.existsSync(AUTO_STICKER_FILE)) {
    fs.writeFileSync(AUTO_STICKER_FILE, JSON.stringify({ enabled: false, forwardToOwner: true }, null, 2));
}

async function sendForwardedMessage(sock, chatId, text, mentions = [], quoted = null) {
    try {
        await sock.sendMessage(chatId, { text: text, contextInfo: channelInfo.contextInfo, mentions: mentions }, { quoted: quoted });
    } catch (error) {
        await sock.sendMessage(chatId, { text: text, mentions: mentions }, { quoted: quoted });
    }
}

async function readConfig() {
    try { return JSON.parse(fs.readFileSync(AUTO_STICKER_FILE, 'utf8')); } catch { return { enabled: false, forwardToOwner: true }; }
}

async function writeConfig(config) { try { fs.writeFileSync(AUTO_STICKER_FILE, JSON.stringify(config, null, 2)); return true; } catch { return false; } }

export async function handleAutoSticker(sock, message, ownerJid) {
    try {
        const config = await readConfig();
        if (!config.enabled) return;
        const stickerMsg = message.message?.stickerMessage;
        if (!stickerMsg) return;
        const stream = await downloadContentFromMessage(stickerMsg, 'sticker');
        let buffer = Buffer.from([]);
        for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk]);
        const fileName = `${Date.now()}.webp`;
        fs.writeFileSync(path.join(STICKER_DIR, fileName), buffer);
        if (config.forwardToOwner && ownerJid) {
            await sock.sendMessage(ownerJid, { sticker: buffer, contextInfo: channelInfo.contextInfo });
        }
    } catch (error) {}
}

export default {
    name: 'autosticker',
    description: 'Auto save stickers',
    icon: '🏷️',
    alias: ['asticker'],
    category: 'automation',
    ownerOnly: true,
    
    async execute(sock, msg, args, currentPrefix, { isOwner, jidManager }) {
        const chatId = msg.key.remoteJid;
        const senderId = msg.key.participant || chatId;
        
        const ownerCheck = await isOwner(senderId, jidManager);
        if (!ownerCheck.isOwner) {
            await sendForwardedMessage(sock, chatId, `╭──❍「 *🏷️ AUTO STICKER* 」❍\n├ ❌ Owner only command!\n╰──────❍`, [senderId], msg);
            return;
        }
        
        const config = await readConfig();
        const action = args[0]?.toLowerCase();
        const now = moment().tz('Africa/Dar_es_Salaam');
        
        if (!action || action === 'status') {
            await sendForwardedMessage(sock, chatId, `╭──❍「 *🏷️ AUTO STICKER* 」❍
├ 📝 *Status* : ${config.enabled ? '✅ ENABLED' : '❌ DISABLED'}
├ 📤 *Forward to Owner* : ${config.forwardToOwner ? '✅' : '❌'}
├ 📅 *Date* : ${now.format('DD/MM/YYYY')}
├ ⏰ *Time* : ${now.format('HH:mm:ss')} EAT
╰─┬────❍
╭─┴─❍「 *📋 COMMANDS* 」❍
│ 🔧 ${currentPrefix}autosticker on - Enable
│ 🔧 ${currentPrefix}autosticker off - Disable
│ 🔧 ${currentPrefix}autosticker forward on/off - Toggle forward
╰──────❍`, [], msg);
            return;
        }
        
        if (action === 'on') { config.enabled = true; await writeConfig(config); await sendForwardedMessage(sock, chatId, `╭──❍「 *🏷️ AUTO STICKER* 」❍\n├ ✅ ENABLED\n╰──────❍`, [], msg); }
        else if (action === 'off') { config.enabled = false; await writeConfig(config); await sendForwardedMessage(sock, chatId, `╭──❍「 *🏷️ AUTO STICKER* 」❍\n├ ❌ DISABLED\n╰──────❍`, [], msg); }
        else if (action === 'forward') {
            const sub = args[1]?.toLowerCase();
            if (sub === 'on') { config.forwardToOwner = true; await writeConfig(config); await sendForwardedMessage(sock, chatId, `╭──❍「 *🏷️ AUTO STICKER* 」❍\n├ ✅ Forward to owner ENABLED\n╰──────❍`, [], msg); }
            else if (sub === 'off') { config.forwardToOwner = false; await writeConfig(config); await sendForwardedMessage(sock, chatId, `╭──❍「 *🏷️ AUTO STICKER* 」❍\n├ ❌ Forward to owner DISABLED\n╰──────❍`, [], msg); }
        }
    }
};