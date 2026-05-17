/*****************************************************************************
 *                     Developed By STANY TZ                                 *
 *****************************************************************************/

import { channelInfo } from '../../stanytz/messageConfig.js';
import { config, updateConfig } from '../config.js';

const recordingSessions = new Map();

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

// Function to check if recording should be shown in this chat
function shouldShowRecording(chatId, isOwner) {
    if (!config.autoRecording) return false;
    if (isOwner) return true;
    
    const isGroup = chatId?.endsWith('@g.us');
    
    switch(config.autoRecordingLocation) {
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

async function handleAutoRecording(sock, chatId, isOwner, duration = 3000) {
    if (!shouldShowRecording(chatId, isOwner)) return;
    if (recordingSessions.has(chatId)) return;
    
    recordingSessions.set(chatId, true);
    await sock.sendPresenceUpdate('recording', chatId);
    
    setTimeout(async () => {
        try {
            await sock.sendPresenceUpdate('paused', chatId);
            recordingSessions.delete(chatId);
        } catch (e) {}
    }, duration);
}

async function autoRecordingCommand(sock, msg, args, prefix) {
    const chatId = msg.key.remoteJid;
    const action = args[0]?.toLowerCase();
    
    // Show status and settings
    if (!action || action === 'status') {
        const locationEmoji = config.autoRecordingLocation === 'both' ? '🌍' : 
                             config.autoRecordingLocation === 'private' ? '💬' : '👥';
        let locationText = '';
        switch(config.autoRecordingLocation) {
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
        
        const statusMsg = `╭──❍「 *🎙️ AUTO RECORDING CONFIG* 」❍
├ 📝 *Status* : ${config.autoRecording ? '✅ ENABLED' : '❌ DISABLED'}
├ ${locationEmoji} *Location* : ${locationText}
╰─┬────❍
╭─┴─❍「 *📋 COMMANDS* 」❍
│ 🔧 ${prefix}autorecording on - Enable
│ 🔧 ${prefix}autorecording off - Disable
│ 🔧 ${prefix}autorecording both - DM & Groups
│ 🔧 ${prefix}autorecording private - DM only
│ 🔧 ${prefix}autorecording groups - Groups only
│ 🔧 ${prefix}autorecording status - Show status
╰──────❍

_📌 Bot will show recording indicator before responding_
▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`;
        await sendForwardedMessage(sock, chatId, statusMsg);
        return;
    }
    
    // Enable/Disable
    if (action === 'on') {
        if (config.autoRecording) {
            await sendForwardedMessage(sock, chatId, `╭──❍「 *🎙️ AUTO RECORDING* 」❍\n├ ⚠️ *Status* : Already ENABLED\n╰──────❍`);
            return;
        }
        updateConfig({ autoRecording: true });
        await sendForwardedMessage(sock, chatId, `╭──❍「 *🎙️ AUTO RECORDING* 」❍\n├ ✅ *Status* : ENABLED\n├ 📝 *Location* : ${config.autoRecordingLocation === 'both' ? 'DM & Groups' : config.autoRecordingLocation === 'private' ? 'DM only' : 'Groups only'}\n╰──────❍`);
        return;
    }
    
    if (action === 'off') {
        if (!config.autoRecording) {
            await sendForwardedMessage(sock, chatId, `╭──❍「 *🎙️ AUTO RECORDING* 」❍\n├ ⚠️ *Status* : Already DISABLED\n╰──────❍`);
            return;
        }
        updateConfig({ autoRecording: false });
        await sendForwardedMessage(sock, chatId, `╭──❍「 *🎙️ AUTO RECORDING* 」❍\n├ ❌ *Status* : DISABLED\n╰──────❍`);
        return;
    }
    
    // Set location
    if (action === 'both') {
        updateConfig({ autoRecordingLocation: 'both' });
        await sendForwardedMessage(sock, chatId, `╭──❍「 *🎙️ AUTO RECORDING* 」❍\n├ 🌍 *Location* : BOTH (DM & Groups)\n├ 📝 *Recording will show in all chats*\n╰──────❍`);
        return;
    }
    
    if (action === 'private') {
        updateConfig({ autoRecordingLocation: 'private' });
        await sendForwardedMessage(sock, chatId, `╭──❍「 *🎙️ AUTO RECORDING* 」❍\n├ 💬 *Location* : PRIVATE ONLY\n├ 📝 *Recording will show only in direct messages*\n╰──────❍`);
        return;
    }
    
    if (action === 'groups') {
        updateConfig({ autoRecordingLocation: 'groups' });
        await sendForwardedMessage(sock, chatId, `╭──❍「 *🎙️ AUTO RECORDING* 」❍\n├ 👥 *Location* : GROUPS ONLY\n├ 📝 *Recording will show only in groups*\n╰──────❍`);
        return;
    }
    
    await sendForwardedMessage(sock, chatId, `╭──❍「 *🎙️ AUTO RECORDING* 」❍\n├ ❌ *Invalid command* : ${action}\n├ 📝 *Use* : ${prefix}autorecording for help\n╰──────❍`);
}

export { handleAutoRecording, autoRecordingCommand, shouldShowRecording };