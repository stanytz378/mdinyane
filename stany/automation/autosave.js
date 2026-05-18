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
const AUTO_SAVE_FILE = path.join(DATA_DIR, 'autosave.json');
const SAVE_DIR = path.join(process.cwd(), 'saved_media');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(SAVE_DIR)) fs.mkdirSync(SAVE_DIR, { recursive: true });
if (!fs.existsSync(AUTO_SAVE_FILE)) {
    fs.writeFileSync(AUTO_SAVE_FILE, JSON.stringify({ enabled: false, types: ['image', 'video'] }, null, 2));
}

async function sendForwardedMessage(sock, chatId, text, mentions = [], quoted = null) {
    try {
        await sock.sendMessage(chatId, { text: text, contextInfo: channelInfo.contextInfo, mentions: mentions }, { quoted: quoted });
    } catch (error) {
        await sock.sendMessage(chatId, { text: text, mentions: mentions }, { quoted: quoted });
    }
}

async function readConfig() {
    try { return JSON.parse(fs.readFileSync(AUTO_SAVE_FILE, 'utf8')); } catch { return { enabled: false, types: ['image', 'video'] }; }
}

async function writeConfig(config) { try { fs.writeFileSync(AUTO_SAVE_FILE, JSON.stringify(config, null, 2)); return true; } catch { return false; } }

export async function handleAutoSave(sock, message) {
    try {
        const config = await readConfig();
        if (!config.enabled) return;
        let mediaType = null, mediaMsg = null;
        if (message.message?.imageMessage) { mediaType = 'image'; mediaMsg = message.message.imageMessage; }
        else if (message.message?.videoMessage) { mediaType = 'video'; mediaMsg = message.message.videoMessage; }
        else if (message.message?.audioMessage) { mediaType = 'audio'; mediaMsg = message.message.audioMessage; }
        else if (message.message?.documentMessage) { mediaType = 'document'; mediaMsg = message.message.documentMessage; }
        if (!mediaType || !config.types.includes(mediaType)) return;
        const stream = await downloadContentFromMessage(mediaMsg, mediaType);
        let buffer = Buffer.from([]);
        for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk]);
        const ext = mediaType === 'image' ? 'jpg' : mediaType === 'video' ? 'mp4' : mediaType === 'audio' ? 'mp3' : 'bin';
        const fileName = `${Date.now()}_${message.key.id}.${ext}`;
        fs.writeFileSync(path.join(SAVE_DIR, fileName), buffer);
    } catch (error) {}
}

export default {
    name: 'autosave',
    description: 'Auto save media to server',
    icon: '💾',
    alias: ['asave'],
    category: 'automation',
    ownerOnly: true,
    
    async execute(sock, msg, args, currentPrefix, { isOwner, jidManager }) {
        const chatId = msg.key.remoteJid;
        const senderId = msg.key.participant || chatId;
        
        const ownerCheck = await isOwner(senderId, jidManager);
        if (!ownerCheck.isOwner) {
            await sendForwardedMessage(sock, chatId, `╭──❍「 *💾 AUTO SAVE* 」❍\n├ ❌ Owner only command!\n╰──────❍`, [senderId], msg);
            return;
        }
        
        const config = await readConfig();
        const action = args[0]?.toLowerCase();
        const now = moment().tz('Africa/Dar_es_Salaam');
        
        if (!action || action === 'status') {
            await sendForwardedMessage(sock, chatId, `╭──❍「 *💾 AUTO SAVE* 」❍
├ 📝 *Status* : ${config.enabled ? '✅ ENABLED' : '❌ DISABLED'}
├ 📁 *Types* : ${config.types.join(', ')}
├ 📅 *Date* : ${now.format('DD/MM/YYYY')}
├ ⏰ *Time* : ${now.format('HH:mm:ss')} EAT
╰─┬────❍
╭─┴─❍「 *📋 COMMANDS* 」❍
│ 🔧 ${currentPrefix}autosave on - Enable
│ 🔧 ${currentPrefix}autosave off - Disable
│ 🔧 ${currentPrefix}autosave types image,video - Set types
╰──────❍`, [], msg);
            return;
        }
        
        if (action === 'on') { config.enabled = true; await writeConfig(config); await sendForwardedMessage(sock, chatId, `╭──❍「 *💾 AUTO SAVE* 」❍\n├ ✅ ENABLED\n╰──────❍`, [], msg); }
        else if (action === 'off') { config.enabled = false; await writeConfig(config); await sendForwardedMessage(sock, chatId, `╭──❍「 *💾 AUTO SAVE* 」❍\n├ ❌ DISABLED\n╰──────❍`, [], msg); }
        else if (action === 'types') {
            const types = args[1]?.split(',');
            if (!types) { await sendForwardedMessage(sock, chatId, `╭──❍「 *💾 AUTO SAVE* 」❍\n├ ❌ Usage: ${currentPrefix}autosave types image,video\n╰──────❍`, [], msg); return; }
            config.types = types;
            await writeConfig(config);
            await sendForwardedMessage(sock, chatId, `╭──❍「 *💾 AUTO SAVE* 」❍\n├ ✅ Types set to: ${types.join(', ')}\n╰──────❍`, [], msg);
        }
    }
};