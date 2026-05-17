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

// Function to check if typing should be shown in this chat
function shouldShowTyping(chatId, isOwner) {
    if (!config.autoTyping) return false;
    if (isOwner) return true;
    
    const isGroup = chatId?.endsWith('@g.us');
    
    switch(config.autoTypingLocation) {
        case 'both':
            return true;
        case 'private':
            return !isGroup;
        case 'groups':
            return isGroup;
        default:
            return true;
    }
}

async function handleAutoTyping(sock, chatId, isOwner, duration = 3000) {
    if (!shouldShowTyping(chatId, isOwner)) return;
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
    
    // Show status and settings
    if (!action || action === 'status') {
        const locationEmoji = config.autoTypingLocation === 'both' ? '🌍' : 
                             config.autoTypingLocation === 'private' ? '💬' : '👥';
        let locationText = '';
        switch(config.autoTypingLocation) {
            case 'both':
                locationText = 'Private chats & Groups';
                break;
            case 'private':
                locationText = 'Private chats only';
                break;
            case 'groups':
                locationText = 'Groups only';
                break;
        }
        
        const statusMsg = `╭──❍「 *⌨️ AUTO TYPING CONFIG* 」❍
├ 📝 *Status* : ${config.autoTyping ? '✅ ENABLED' : '❌ DISABLED'}
├ ${locationEmoji} *Location* : ${locationText}
╰─┬────❍
╭─┴─❍「 *📋 COMMANDS* 」❍
│ 🔧 ${prefix}autotyping on - Enable
│ 🔧 ${prefix}autotyping off - Disable
│ 🔧 ${prefix}autotyping both - DM & Groups
│ 🔧 ${prefix}autotyping private - DM only
│ 🔧 ${prefix}autotyping groups - Groups only
│ 🔧 ${prefix}autotyping status - Show status
╰──────❍

_📌 Bot will show typing indicator before responding_
▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`;
        await sendForwardedMessage(sock, chatId, statusMsg);
        return;
    }
    
    // Enable/Disable
    if (action === 'on') {
        if (config.autoTyping) {
            await sendForwardedMessage(sock, chatId, `╭──❍「 *⌨️ AUTO TYPING* 」❍\n├ ⚠️ *Status* : Already ENABLED\n╰──────❍`);
            return;
        }
        updateConfig({ autoTyping: true });
        await sendForwardedMessage(sock, chatId, `╭──❍「 *⌨️ AUTO TYPING* 」❍\n├ ✅ *Status* : ENABLED\n├ 📝 *Location* : ${config.autoTypingLocation === 'both' ? 'DM & Groups' : config.autoTypingLocation === 'private' ? 'DM only' : 'Groups only'}\n╰──────❍`);
        return;
    }
    
    if (action === 'off') {
        if (!config.autoTyping) {
            await sendForwardedMessage(sock, chatId, `╭──❍「 *⌨️ AUTO TYPING* 」❍\n├ ⚠️ *Status* : Already DISABLED\n╰──────❍`);
            return;
        }
        updateConfig({ autoTyping: false });
        await sendForwardedMessage(sock, chatId, `╭──❍「 *⌨️ AUTO TYPING* 」❍\n├ ❌ *Status* : DISABLED\n╰──────❍`);
        return;
    }
    
    // Set location
    if (action === 'both') {
        updateConfig({ autoTypingLocation: 'both' });
        await sendForwardedMessage(sock, chatId, `╭──❍「 *⌨️ AUTO TYPING* 」❍\n├ 🌍 *Location* : BOTH (DM & Groups)\n├ 📝 *Typing will show in all chats*\n╰──────❍`);
        return;
    }
    
    if (action === 'private') {
        updateConfig({ autoTypingLocation: 'private' });
        await sendForwardedMessage(sock, chatId, `╭──❍「 *⌨️ AUTO TYPING* 」❍\n├ 💬 *Location* : PRIVATE ONLY\n├ 📝 *Typing will show only in direct messages*\n╰──────❍`);
        return;
    }
    
    if (action === 'groups') {
        updateConfig({ autoTypingLocation: 'groups' });
        await sendForwardedMessage(sock, chatId, `╭──❍「 *⌨️ AUTO TYPING* 」❍\n├ 👥 *Location* : GROUPS ONLY\n├ 📝 *Typing will show only in groups*\n╰──────❍`);
        return;
    }
    
    await sendForwardedMessage(sock, chatId, `╭──❍「 *⌨️ AUTO TYPING* 」❍\n├ ❌ *Invalid command* : ${action}\n├ 📝 *Use* : ${prefix}autotyping for help\n╰──────❍`);
}

export { handleAutoTyping, autoTypingCommand, shouldShowTyping };