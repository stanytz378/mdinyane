/*****************************************************************************
 *                     Developed By STANY TZ                                 *
 *****************************************************************************/

import fs from 'fs';
import path from 'path';
import moment from 'moment-timezone';
import { channelInfo } from '../../stanytz/messageConfig.js';
import isOwner from '../../stanymain/isOwner.js';

const DATA_DIR = path.join(process.cwd(), 'stanydata');
const AUTO_STATUS_FILE = path.join(DATA_DIR, 'autostatus.json');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(AUTO_STATUS_FILE)) {
    fs.writeFileSync(AUTO_STATUS_FILE, JSON.stringify({ enabled: false, likeOn: true }, null, 2));
}

const LIKE_EMOJIS = ['❤️', '🔥', '👍', '💯', '✨', '🌟', '⭐', '💖', '💗', '💓', '💕', '💞', '💝', '💟', '❣️', '💋', '😍', '🥰', '😘', '🤩', '🎉', '🏆', '👏', '🙌', '🤗', '😊', '😎', '👌', '💪', '🎯', '🔱', '⚡', '💎', '👑', '🌹', '🌸', '💐'];

const getRandomLikeEmoji = () => LIKE_EMOJIS[Math.floor(Math.random() * LIKE_EMOJIS.length)];
const QUOTES = ["Auto status is watching! 👀", "Status viewer mode: ACTIVE", "Liking statuses like a boss! 👑"];

async function sendForwardedMessage(sock, chatId, text, mentions = [], quoted = null) {
    try {
        await sock.sendMessage(chatId, {
            text: text,
            contextInfo: channelInfo.contextInfo,
            mentions: mentions
        }, { quoted: quoted });
    } catch (error) {
        await sock.sendMessage(chatId, { text: text, mentions: mentions }, { quoted: quoted });
    }
}

async function readConfig() {
    try {
        return JSON.parse(fs.readFileSync(AUTO_STATUS_FILE, 'utf8'));
    } catch {
        return { enabled: false, likeOn: true };
    }
}

async function writeConfig(config) {
    try {
        fs.writeFileSync(AUTO_STATUS_FILE, JSON.stringify(config, null, 2));
        return true;
    } catch {
        return false;
    }
}

export async function handleStatusUpdate(sock, status) {
    try {
        const config = await readConfig();
        if (!config.enabled) return;
        await new Promise(r => setTimeout(r, 2000));
        
        let statusKey = null;
        if (status.messages?.[0]?.key?.remoteJid === 'status@broadcast') statusKey = status.messages[0].key;
        else if (status.key?.remoteJid === 'status@broadcast') statusKey = status.key;
        else if (status.reaction?.key?.remoteJid === 'status@broadcast') statusKey = status.reaction.key;
        if (!statusKey) return;
        
        try {
            await sock.readMessages([statusKey]);
            if (config.likeOn) {
                await sock.relayMessage('status@broadcast', {
                    reactionMessage: { key: statusKey, text: getRandomLikeEmoji() }
                }, { messageId: statusKey.id });
            }
        } catch (err) { console.log(err.message); }
    } catch (error) {}
}

export default {
    name: 'autostatus',
    description: 'Auto view and like statuses',
    icon: '👁️',
    alias: ['astatus', 'autolike'],
    category: 'automation',
    ownerOnly: true,
    
    async execute(sock, msg, args, currentPrefix, { isOwner, jidManager }) {
        const chatId = msg.key.remoteJid;
        const senderId = msg.key.participant || chatId;
        
        const ownerCheck = await isOwner(senderId, jidManager);
        if (!ownerCheck.isOwner) {
            await sendForwardedMessage(sock, chatId, `╭──❍「 *👁️ AUTO STATUS* 」❍\n├ ❌ Owner only command!\n╰──────❍`, [senderId], msg);
            return;
        }
        
        const config = await readConfig();
        const action = args[0]?.toLowerCase();
        const now = moment().tz('Africa/Dar_es_Salaam');
        
        if (!action || action === 'status') {
            await sendForwardedMessage(sock, chatId, `╭──❍「 *👁️ AUTO STATUS* 」❍
├ 📝 *Status* : ${config.enabled ? '✅ ENABLED' : '❌ DISABLED'}
├ 💖 *Auto Like* : ${config.likeOn ? '✅' : '❌'}
├ 📅 *Date* : ${now.format('DD/MM/YYYY')}
├ ⏰ *Time* : ${now.format('HH:mm:ss')} EAT
╰─┬────❍
╭─┴─❍「 *📋 COMMANDS* 」❍
│ 🔧 ${currentPrefix}autostatus on - Enable
│ 🔧 ${currentPrefix}autostatus off - Disable
│ 🔧 ${currentPrefix}autostatus like on/off - Toggle like
╰──────❍`, [], msg);
            return;
        }
        
        if (action === 'on') { config.enabled = true; await writeConfig(config); await sendForwardedMessage(sock, chatId, `╭──❍「 *👁️ AUTO STATUS* 」❍\n├ ✅ ENABLED\n╰──────❍`, [], msg); }
        else if (action === 'off') { config.enabled = false; await writeConfig(config); await sendForwardedMessage(sock, chatId, `╭──❍「 *👁️ AUTO STATUS* 」❍\n├ ❌ DISABLED\n╰──────❍`, [], msg); }
        else if (action === 'like') {
            const sub = args[1]?.toLowerCase();
            if (sub === 'on') { config.likeOn = true; await writeConfig(config); await sendForwardedMessage(sock, chatId, `╭──❍「 *👁️ AUTO STATUS* 」❍\n├ 💖 Auto Like ENABLED\n╰──────❍`, [], msg); }
            else if (sub === 'off') { config.likeOn = false; await writeConfig(config); await sendForwardedMessage(sock, chatId, `╭──❍「 *👁️ AUTO STATUS* 」❍\n├ 💖 Auto Like DISABLED\n╰──────❍`, [], msg); }
        }
    }
};