/*****************************************************************************
 *                     Developed By STANY TZ                                 *
 *                                                                           *
 *  🌐  GitHub   : https://github.com/Stanytz378/iamlegendv2                 *
 *  ▶️  YouTube  : https://youtube.com/@STANYTZ                              *
 *  💬  WhatsApp : https://whatsapp.com/channel/0029Vb7fzu4EwEjmsD4Tzs1p     *
 *                                                                           *
 *    © 2026 STANY TZ. All rights reserved.                                 *
 *                                                                           *
 *****************************************************************************/

import { config, updateConfig } from './config.js';
import { 
    handleAutoTyping, 
    handleAutoRecording, 
    handleAutoRead,
    handleAlwaysOnline,
    startAlwaysOnline,
    stopAlwaysOnline,
    isChatAllowed
} from './handlers/index.js';
import isOwner from '../stanymain/isOwner.js';

let isInitialized = false;
let currentSock = null;

// ============================================================
// PROCESS MESSAGES (Detect commands for core features)
// ============================================================

export async function processMessage(sock, msg) {
    try {
        const chatId = msg.key.remoteJid;
        const senderId = msg.key.participant || chatId;
        
        if (chatId === 'status@broadcast') return;
        
        const textMsg = msg.message?.conversation || 
                       msg.message?.extendedTextMessage?.text || '';
        
        if (!textMsg) return;
        
        await handleAutoRead(sock, msg);
        
        const prefixes = config.prefixes || ['.'];
        const isPrefixless = config.prefixless || false;
        
        let commandName = '';
        let args = [];
        
        for (const prefix of prefixes) {
            if (textMsg.startsWith(prefix)) {
                const spaceIndex = textMsg.indexOf(' ', prefix.length);
                commandName = spaceIndex === -1 ? 
                    textMsg.slice(prefix.length).toLowerCase().trim() : 
                    textMsg.slice(prefix.length, spaceIndex).toLowerCase().trim();
                args = spaceIndex === -1 ? [] : textMsg.slice(spaceIndex).trim().split(/\s+/);
                break;
            }
        }
        
        if (!commandName && isPrefixless) {
            const words = textMsg.trim().split(/\s+/);
            commandName = words[0].toLowerCase();
            args = words.slice(1);
        }
        
        if (!commandName) return;
        
        const ownerCheck = await isOwner(senderId);
        if (!ownerCheck.isOwner) return;
        
        await processCoreCommands(sock, msg, commandName, args, prefixes[0]);
        
    } catch (error) {
        console.error('Core process error:', error);
    }
}

// ============================================================
// PROCESS CORE COMMANDS (Owner only)
// ============================================================

async function processCoreCommands(sock, msg, commandName, args, prefix) {
    const chatId = msg.key.remoteJid;
    
    if (commandName === 'autotyping') {
        const action = args[0]?.toLowerCase();
        
        if (!action || action === 'status') {
            const locationText = config.autoTypingLocation === 'both' ? 'DM + Groups' : 
                               config.autoTypingLocation === 'private' ? 'DM only' : 'Groups only';
            await sendCoreMessage(sock, chatId, `╭──❍「 *⌨️ AUTO TYPING* 」❍
├ 📝 *Status* : ${config.autoTyping ? '✅ ENABLED' : '❌ DISABLED'}
├ 📍 *Location* : ${locationText}
╰─┬────❍
╭─┴─❍「 *📋 COMMANDS* 」❍
│ 🔧 ${prefix}autotyping on - Enable
│ 🔧 ${prefix}autotyping off - Disable
│ 🔧 ${prefix}autotyping both - DM + Groups
│ 🔧 ${prefix}autotyping private - DM only
│ 🔧 ${prefix}autotyping groups - Groups only
╰──────❍
▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`, [], msg);
            return;
        }
        
        if (action === 'on') {
            updateConfig({ autoTyping: true });
            await sendCoreMessage(sock, chatId, `╭──❍「 *⌨️ AUTO TYPING* 」❍\n├ ✅ ENABLED\n╰──────❍\n▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`, [], msg);
        } else if (action === 'off') {
            updateConfig({ autoTyping: false });
            await sendCoreMessage(sock, chatId, `╭──❍「 *⌨️ AUTO TYPING* 」❍\n├ ❌ DISABLED\n╰──────❍\n▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`, [], msg);
        } else if (action === 'both') {
            updateConfig({ autoTypingLocation: 'both' });
            await sendCoreMessage(sock, chatId, `╭──❍「 *⌨️ AUTO TYPING* 」❍\n├ 🌍 Location: BOTH (DM + Groups)\n╰──────❍\n▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`, [], msg);
        } else if (action === 'private') {
            updateConfig({ autoTypingLocation: 'private' });
            await sendCoreMessage(sock, chatId, `╭──❍「 *⌨️ AUTO TYPING* 」❍\n├ 💬 Location: PRIVATE ONLY\n╰──────❍\n▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`, [], msg);
        } else if (action === 'groups') {
            updateConfig({ autoTypingLocation: 'groups' });
            await sendCoreMessage(sock, chatId, `╭──❍「 *⌨️ AUTO TYPING* 」❍\n├ 👥 Location: GROUPS ONLY\n╰──────❍\n▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`, [], msg);
        } else {
            await sendCoreMessage(sock, chatId, `╭──❍「 *⌨️ AUTO TYPING* 」❍\n├ ❌ Invalid: ${action}\n╰──────❍\n▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`, [], msg);
        }
        return;
    }
    
    if (commandName === 'autorecording') {
        const action = args[0]?.toLowerCase();
        
        if (!action || action === 'status') {
            const locationText = config.autoRecordingLocation === 'both' ? 'DM + Groups' : 
                               config.autoRecordingLocation === 'private' ? 'DM only' : 'Groups only';
            await sendCoreMessage(sock, chatId, `╭──❍「 *🎙️ AUTO RECORDING* 」❍
├ 📝 *Status* : ${config.autoRecording ? '✅ ENABLED' : '❌ DISABLED'}
├ 📍 *Location* : ${locationText}
╰─┬────❍
╭─┴─❍「 *📋 COMMANDS* 」❍
│ 🔧 ${prefix}autorecording on - Enable
│ 🔧 ${prefix}autorecording off - Disable
│ 🔧 ${prefix}autorecording both - DM + Groups
│ 🔧 ${prefix}autorecording private - DM only
│ 🔧 ${prefix}autorecording groups - Groups only
╰──────❍
▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`, [], msg);
            return;
        }
        
        if (action === 'on') {
            updateConfig({ autoRecording: true });
            await sendCoreMessage(sock, chatId, `╭──❍「 *🎙️ AUTO RECORDING* 」❍\n├ ✅ ENABLED\n╰──────❍\n▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`, [], msg);
        } else if (action === 'off') {
            updateConfig({ autoRecording: false });
            await sendCoreMessage(sock, chatId, `╭──❍「 *🎙️ AUTO RECORDING* 」❍\n├ ❌ DISABLED\n╰──────❍\n▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`, [], msg);
        } else if (action === 'both') {
            updateConfig({ autoRecordingLocation: 'both' });
            await sendCoreMessage(sock, chatId, `╭──❍「 *🎙️ AUTO RECORDING* 」❍\n├ 🌍 Location: BOTH (DM + Groups)\n╰──────❍\n▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`, [], msg);
        } else if (action === 'private') {
            updateConfig({ autoRecordingLocation: 'private' });
            await sendCoreMessage(sock, chatId, `╭──❍「 *🎙️ AUTO RECORDING* 」❍\n├ 💬 Location: PRIVATE ONLY\n╰──────❍\n▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`, [], msg);
        } else if (action === 'groups') {
            updateConfig({ autoRecordingLocation: 'groups' });
            await sendCoreMessage(sock, chatId, `╭──❍「 *🎙️ AUTO RECORDING* 」❍\n├ 👥 Location: GROUPS ONLY\n╰──────❍\n▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`, [], msg);
        } else {
            await sendCoreMessage(sock, chatId, `╭──❍「 *🎙️ AUTO RECORDING* 」❍\n├ ❌ Invalid: ${action}\n╰──────❍\n▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`, [], msg);
        }
        return;
    }
    
    if (commandName === 'autoread') {
        const action = args[0]?.toLowerCase();
        
        if (!action || action === 'status') {
            await sendCoreMessage(sock, chatId, `╭──❍「 *👁️ AUTO READ* 」❍
├ 📝 *Status* : ${config.autoRead ? '✅ ENABLED' : '❌ DISABLED'}
├ 👥 *Groups* : ${config.autoReadGroups ? '✅' : '❌'}
├ 💬 *Private* : ${config.autoReadPrivate ? '✅' : '❌'}
╰─┬────❍
╭─┴─❍「 *📋 COMMANDS* 」❍
│ 🔧 ${prefix}autoread on - Enable
│ 🔧 ${prefix}autoread off - Disable
│ 🔧 ${prefix}autoread groups on/off
│ 🔧 ${prefix}autoread private on/off
╰──────❍
▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`, [], msg);
            return;
        }
        
        if (action === 'on') {
            updateConfig({ autoRead: true });
            await sendCoreMessage(sock, chatId, `╭──❍「 *👁️ AUTO READ* 」❍\n├ ✅ ENABLED\n╰──────❍\n▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`, [], msg);
        } else if (action === 'off') {
            updateConfig({ autoRead: false });
            await sendCoreMessage(sock, chatId, `╭──❍「 *👁️ AUTO READ* 」❍\n├ ❌ DISABLED\n╰──────❍\n▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`, [], msg);
        } else if (action === 'groups') {
            const subAction = args[1]?.toLowerCase();
            if (subAction === 'on') {
                updateConfig({ autoReadGroups: true });
                await sendCoreMessage(sock, chatId, `╭──❍「 *👁️ AUTO READ* 」❍\n├ ✅ Groups ENABLED\n╰──────❍\n▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`, [], msg);
            } else if (subAction === 'off') {
                updateConfig({ autoReadGroups: false });
                await sendCoreMessage(sock, chatId, `╭──❍「 *👁️ AUTO READ* 」❍\n├ ❌ Groups DISABLED\n╰──────❍\n▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`, [], msg);
            }
        } else if (action === 'private') {
            const subAction = args[1]?.toLowerCase();
            if (subAction === 'on') {
                updateConfig({ autoReadPrivate: true });
                await sendCoreMessage(sock, chatId, `╭──❍「 *👁️ AUTO READ* 」❍\n├ ✅ Private ENABLED\n╰──────❍\n▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`, [], msg);
            } else if (subAction === 'off') {
                updateConfig({ autoReadPrivate: false });
                await sendCoreMessage(sock, chatId, `╭──❍「 *👁️ AUTO READ* 」❍\n├ ❌ Private DISABLED\n╰──────❍\n▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`, [], msg);
            }
        }
        return;
    }
    
    if (commandName === 'alwaysonline') {
        const action = args[0]?.toLowerCase();
        
        if (!action || action === 'status') {
            await sendCoreMessage(sock, chatId, `╭──❍「 *🟢 ALWAYS ONLINE* 」❍
├ 📝 *Status* : ${config.alwaysOnline ? '✅ ENABLED' : '❌ DISABLED'}
╰─┬────❍
╭─┴─❍「 *📋 COMMANDS* 」❍
│ 🔧 ${prefix}alwaysonline on - Enable
│ 🔧 ${prefix}alwaysonline off - Disable
╰──────❍
▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`, [], msg);
            return;
        }
        
        if (action === 'on') {
            updateConfig({ alwaysOnline: true });
            startAlwaysOnline(sock);
            await sendCoreMessage(sock, chatId, `╭──❍「 *🟢 ALWAYS ONLINE* 」❍\n├ ✅ ENABLED\n╰──────❍\n▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`, [], msg);
        } else if (action === 'off') {
            updateConfig({ alwaysOnline: false });
            stopAlwaysOnline();
            await sendCoreMessage(sock, chatId, `╭──❍「 *🟢 ALWAYS ONLINE* 」❍\n├ ❌ DISABLED\n╰──────❍\n▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`, [], msg);
        }
        return;
    }
}

async function sendCoreMessage(sock, chatId, text, mentions = [], quoted = null) {
    try {
        await sock.sendMessage(chatId, {
            text: text,
            contextInfo: { forwardingScore: 999, isForwarded: true },
            mentions: mentions
        }, { quoted: quoted });
    } catch (error) {
        await sock.sendMessage(chatId, { text: text, mentions: mentions }, { quoted: quoted });
    }
}

export async function afterCommand(sock, chatId, senderId, isOwnerUser) {
    const isAllowed = isChatAllowed(chatId, senderId, isOwnerUser);
    if (!isAllowed) return;
    
    await handleAutoTyping(sock, chatId, isOwnerUser, 2000);
    await handleAutoRecording(sock, chatId, isOwnerUser, 2000);
}

export function isResponseAllowed(chatId, senderId, isOwner) {
    return isChatAllowed(chatId, senderId, isOwner);
}

export async function initializeCore(sock) {
    if (isInitialized) return;
    
    currentSock = sock;
    console.log('🚀 STANY CORE initialized!');
    console.log(`📱 Mode: ${config.mode.toUpperCase()}`);
    console.log(`🔧 Prefixes: ${(config.prefixes || ['.']).join(', ')}`);
    console.log(`⌨️ Auto Typing: ${config.autoTyping ? 'ON' : 'OFF'} (${config.autoTypingLocation})`);
    console.log(`🎙️ Auto Recording: ${config.autoRecording ? 'ON' : 'OFF'} (${config.autoRecordingLocation})`);
    console.log(`👁️ Auto Read: ${config.autoRead ? 'ON' : 'OFF'}`);
    console.log(`🟢 Always Online: ${config.alwaysOnline ? 'ON' : 'OFF'}`);
    
    if (config.alwaysOnline) {
        startAlwaysOnline(sock);
    }
    
    isInitialized = true;
}

export { config, updateConfig };