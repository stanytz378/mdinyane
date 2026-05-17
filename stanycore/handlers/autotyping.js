/*****************************************************************************
 *                     Developed By STANY TZ                                 *
 *****************************************************************************/

import { channelInfo } from '../../stanytz/messageConfig.js';
import { config, updateConfig } from '../config.js';

const typingSessions = new Map();

async function sendForwardedMessage(sock, chatId, text, mentions = []) {
    const forwardContext = {
        forwardingScore: 999,
        isForwarded: true,
        forwardedNewsletterMessageInfo: {
            newsletterJid: '120363404317544295@newsletter',
            newsletterName: '✨ᴍᴅɪɴʏᴀɴᴇ ʙᴏᴛ💫',
            serverMessageId: Date.now().toString()
        }
    };
    
    await sock.sendMessage(chatId, {
        text: text,
        contextInfo: forwardContext,
        mentions: mentions
    });
}

async function handleAutoTyping(sock, chatId, duration = 3000) {
    if (!config.autoTyping) return;
    if (typingSessions.has(chatId)) return;
    
    typingSessions.set(chatId, true);
    await sock.sendPresenceUpdate('composing', chatId);
    
    setTimeout(async () => {
        try {
            await sock.sendPresenceUpdate('paused', chatId);
            typingSessions.delete(chatId);
        } catch (e) {}
    }, duration);
}

async function autoTypingCommand(sock, msg, args, prefix) {
    const chatId = msg.key.remoteJid;
    const action = args[0]?.toLowerCase();
    
    if (!action) {
        const statusMsg = `╭──❍「 *⌨️ AUTO TYPING* 」❍
├ 📝 *Status* : ${config.autoTyping ? '✅ ENABLED' : '❌ DISABLED'}
╰─┬────❍
╭─┴─❍「 *📋 COMMANDS* 」❍
│ 🔧 ${prefix}autotyping on - Enable
│ 🔧 ${prefix}autotyping off - Disable
╰──────❍

_📌 Bot will show typing indicator when responding_
▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`;
        await sendForwardedMessage(sock, chatId, statusMsg);
        return;
    }
    
    if (action === 'on') {
        if (config.autoTyping) {
            await sendForwardedMessage(sock, chatId, `╭──❍「 *⌨️ AUTO TYPING* 」❍\n├ ⚠️ *Status* : Already ENABLED\n╰──────❍`);
            return;
        }
        updateConfig({ autoTyping: true });
        await sendForwardedMessage(sock, chatId, `╭──❍「 *⌨️ AUTO TYPING* 」❍\n├ ✅ *Status* : ENABLED\n├ 📝 *Bot will show typing indicator*\n╰──────❍`);
    } else if (action === 'off') {
        if (!config.autoTyping) {
            await sendForwardedMessage(sock, chatId, `╭──❍「 *⌨️ AUTO TYPING* 」❍\n├ ⚠️ *Status* : Already DISABLED\n╰──────❍`);
            return;
        }
        updateConfig({ autoTyping: false });
        await sendForwardedMessage(sock, chatId, `╭──❍「 *⌨️ AUTO TYPING* 」❍\n├ ❌ *Status* : DISABLED\n╰──────❍`);
    }
}

export { handleAutoTyping, autoTypingCommand };