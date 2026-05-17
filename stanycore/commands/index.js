/*****************************************************************************
 *                     Developed By STANY TZ                                 *
 *****************************************************************************/

import { config, updateConfig } from '../config.js';
import { startAlwaysOnline, stopAlwaysOnline } from '../handlers/alwaysonline.js';

async function sendForwardedMessage(sock, chatId, text) {
    const forwardContext = {
        forwardingScore: 999,
        isForwarded: true,
        forwardedNewsletterMessageInfo: {
            newsletterJid: '120363404317544295@newsletter',
            newsletterName: '✨ᴍᴅɪɴʏᴀɴᴇ ʙᴏᴛ💫',
            serverMessageId: Date.now().toString()
        }
    };
    
    await sock.sendMessage(chatId, { text, contextInfo: forwardContext });
}

async function handleAutoTypingCommand(sock, msg, args, prefix) {
    const chatId = msg.key.remoteJid;
    const action = args[0]?.toLowerCase();
    
    if (!action || action === 'status') {
        const locationText = config.autoTypingLocation === 'both' ? 'DM & Groups' : 
                            config.autoTypingLocation === 'private' ? 'DM only' : 'Groups only';
        const msg = `╭──❍「 ⌨️ AUTO TYPING 」❍
├ 📝 Status : ${config.autoTyping ? '✅ ENABLED' : '❌ DISABLED'}
├ 📍 Location : ${locationText}
╰─┬────❍
╭─┴─❍「 📋 COMMANDS 」❍
│ 🔧 ${prefix}autotyping on - Enable
│ 🔧 ${prefix}autotyping off - Disable
│ 🔧 ${prefix}autotyping both - DM & Groups
│ 🔧 ${prefix}autotyping private - DM only
│ 🔧 ${prefix}autotyping groups - Groups only
╰──────❍
▰▰▰ © MDINYANE BY STANY TZ ▰▰▰`;
        await sendForwardedMessage(sock, chatId, msg);
        return;
    }
    
    if (action === 'on') {
        if (config.autoTyping) {
            await sendForwardedMessage(sock, chatId, `╭──❍「 ⌨️ AUTO TYPING 」❍\n├ ⚠️ Already ENABLED\n╰──────❍`);
            return;
        }
        updateConfig({ autoTyping: true });
        await sendForwardedMessage(sock, chatId, `╭──❍「 ⌨️ AUTO TYPING 」❍\n├ ✅ ENABLED\n╰──────❍`);
        return;
    }
    
    if (action === 'off') {
        if (!config.autoTyping) {
            await sendForwardedMessage(sock, chatId, `╭──❍「 ⌨️ AUTO TYPING 」❍\n├ ⚠️ Already DISABLED\n╰──────❍`);
            return;
        }
        updateConfig({ autoTyping: false });
        await sendForwardedMessage(sock, chatId, `╭──❍「 ⌨️ AUTO TYPING 」❍\n├ ❌ DISABLED\n╰──────❍`);
        return;
    }
    
    if (action === 'both') {
        updateConfig({ autoTypingLocation: 'both' });
        await sendForwardedMessage(sock, chatId, `╭──❍「 ⌨️ AUTO TYPING 」❍\n├ 🌍 Location : BOTH (DM & Groups)\n╰──────❍`);
        return;
    }
    
    if (action === 'private') {
        updateConfig({ autoTypingLocation: 'private' });
        await sendForwardedMessage(sock, chatId, `╭──❍「 ⌨️ AUTO TYPING 」❍\n├ 💬 Location : PRIVATE ONLY\n╰──────❍`);
        return;
    }
    
    if (action === 'groups') {
        updateConfig({ autoTypingLocation: 'groups' });
        await sendForwardedMessage(sock, chatId, `╭──❍「 ⌨️ AUTO TYPING 」❍\n├ 👥 Location : GROUPS ONLY\n╰──────❍`);
        return;
    }
    
    await sendForwardedMessage(sock, chatId, `╭──❍「 ⌨️ AUTO TYPING 」❍\n├ ❌ Invalid: ${action}\n├ 📝 Use ${prefix}autotyping for help\n╰──────❍`);
}

async function handleAutoRecordingCommand(sock, msg, args, prefix) {
    const chatId = msg.key.remoteJid;
    const action = args[0]?.toLowerCase();
    
    if (!action || action === 'status') {
        const locationText = config.autoRecordingLocation === 'both' ? 'DM & Groups' : 
                            config.autoRecordingLocation === 'private' ? 'DM only' : 'Groups only';
        const msg = `╭──❍「 🎙️ AUTO RECORDING 」❍
├ 📝 Status : ${config.autoRecording ? '✅ ENABLED' : '❌ DISABLED'}
├ 📍 Location : ${locationText}
╰─┬────❍
╭─┴─❍「 📋 COMMANDS 」❍
│ 🔧 ${prefix}autorecording on - Enable
│ 🔧 ${prefix}autorecording off - Disable
│ 🔧 ${prefix}autorecording both - DM & Groups
│ 🔧 ${prefix}autorecording private - DM only
│ 🔧 ${prefix}autorecording groups - Groups only
╰──────❍
▰▰▰ © MDINYANE BY STANY TZ ▰▰▰`;
        await sendForwardedMessage(sock, chatId, msg);
        return;
    }
    
    if (action === 'on') {
        if (config.autoRecording) {
            await sendForwardedMessage(sock, chatId, `╭──❍「 🎙️ AUTO RECORDING 」❍\n├ ⚠️ Already ENABLED\n╰──────❍`);
            return;
        }
        updateConfig({ autoRecording: true });
        await sendForwardedMessage(sock, chatId, `╭──❍「 🎙️ AUTO RECORDING 」❍\n├ ✅ ENABLED\n╰──────❍`);
        return;
    }
    
    if (action === 'off') {
        if (!config.autoRecording) {
            await sendForwardedMessage(sock, chatId, `╭──❍「 🎙️ AUTO RECORDING 」❍\n├ ⚠️ Already DISABLED\n╰──────❍`);
            return;
        }
        updateConfig({ autoRecording: false });
        await sendForwardedMessage(sock, chatId, `╭──❍「 🎙️ AUTO RECORDING 」❍\n├ ❌ DISABLED\n╰──────❍`);
        return;
    }
    
    if (action === 'both') {
        updateConfig({ autoRecordingLocation: 'both' });
        await sendForwardedMessage(sock, chatId, `╭──❍「 🎙️ AUTO RECORDING 」❍\n├ 🌍 Location : BOTH (DM & Groups)\n╰──────❍`);
        return;
    }
    
    if (action === 'private') {
        updateConfig({ autoRecordingLocation: 'private' });
        await sendForwardedMessage(sock, chatId, `╭──❍「 🎙️ AUTO RECORDING 」❍\n├ 💬 Location : PRIVATE ONLY\n╰──────❍`);
        return;
    }
    
    if (action === 'groups') {
        updateConfig({ autoRecordingLocation: 'groups' });
        await sendForwardedMessage(sock, chatId, `╭──❍「 🎙️ AUTO RECORDING 」❍\n├ 👥 Location : GROUPS ONLY\n╰──────❍`);
        return;
    }
    
    await sendForwardedMessage(sock, chatId, `╭──❍「 🎙️ AUTO RECORDING 」❍\n├ ❌ Invalid: ${action}\n├ 📝 Use ${prefix}autorecording for help\n╰──────❍`);
}

async function handleAutoReadCommand(sock, msg, args, prefix) {
    const chatId = msg.key.remoteJid;
    const action = args[0]?.toLowerCase();
    
    if (!action || action === 'status') {
        const msg = `╭──❍「 👁️ AUTO READ 」❍
├ 📝 Status : ${config.autoRead ? '✅ ENABLED' : '❌ DISABLED'}
├ 👥 Groups : ${config.autoReadGroups ? '✅' : '❌'}
├ 💬 Private : ${config.autoReadPrivate ? '✅' : '❌'}
╰─┬────❍
╭─┴─❍「 📋 COMMANDS 」❍
│ 🔧 ${prefix}autoread on - Enable
│ 🔧 ${prefix}autoread off - Disable
│ 🔧 ${prefix}autoread groups on/off
│ 🔧 ${prefix}autoread private on/off
╰──────❍
▰▰▰ © MDINYANE BY STANY TZ ▰▰▰`;
        await sendForwardedMessage(sock, chatId, msg);
        return;
    }
    
    if (action === 'on') {
        if (config.autoRead) {
            await sendForwardedMessage(sock, chatId, `╭──❍「 👁️ AUTO READ 」❍\n├ ⚠️ Already ENABLED\n╰──────❍`);
            return;
        }
        updateConfig({ autoRead: true });
        await sendForwardedMessage(sock, chatId, `╭──❍「 👁️ AUTO READ 」❍\n├ ✅ ENABLED\n╰──────❍`);
        return;
    }
    
    if (action === 'off') {
        if (!config.autoRead) {
            await sendForwardedMessage(sock, chatId, `╭──❍「 👁️ AUTO READ 」❍\n├ ⚠️ Already DISABLED\n╰──────❍`);
            return;
        }
        updateConfig({ autoRead: false });
        await sendForwardedMessage(sock, chatId, `╭──❍「 👁️ AUTO READ 」❍\n├ ❌ DISABLED\n╰──────❍`);
        return;
    }
    
    if (action === 'groups') {
        const sub = args[1]?.toLowerCase();
        if (sub === 'on') {
            updateConfig({ autoReadGroups: true });
            await sendForwardedMessage(sock, chatId, `╭──❍「 👁️ AUTO READ 」❍\n├ ✅ Groups ENABLED\n╰──────❍`);
        } else if (sub === 'off') {
            updateConfig({ autoReadGroups: false });
            await sendForwardedMessage(sock, chatId, `╭──❍「 👁️ AUTO READ 」❍\n├ ❌ Groups DISABLED\n╰──────❍`);
        } else {
            await sendForwardedMessage(sock, chatId, `╭──❍「 👁️ AUTO READ 」❍\n├ ❌ Usage: ${prefix}autoread groups on/off\n╰──────❍`);
        }
        return;
    }
    
    if (action === 'private') {
        const sub = args[1]?.toLowerCase();
        if (sub === 'on') {
            updateConfig({ autoReadPrivate: true });
            await sendForwardedMessage(sock, chatId, `╭──❍「 👁️ AUTO READ 」❍\n├ ✅ Private ENABLED\n╰──────❍`);
        } else if (sub === 'off') {
            updateConfig({ autoReadPrivate: false });
            await sendForwardedMessage(sock, chatId, `╭──❍「 👁️ AUTO READ 」❍\n├ ❌ Private DISABLED\n╰──────❍`);
        } else {
            await sendForwardedMessage(sock, chatId, `╭──❍「 👁️ AUTO READ 」❍\n├ ❌ Usage: ${prefix}autoread private on/off\n╰──────❍`);
        }
        return;
    }
    
    await sendForwardedMessage(sock, chatId, `╭──❍「 👁️ AUTO READ 」❍\n├ ❌ Invalid: ${action}\n├ 📝 Use ${prefix}autoread for help\n╰──────❍`);
}

async function handleAlwaysOnlineCommand(sock, msg, args, prefix) {
    const chatId = msg.key.remoteJid;
    const action = args[0]?.toLowerCase();
    
    if (!action || action === 'status') {
        const msg = `╭──❍「 🟢 ALWAYS ONLINE 」❍
├ 📝 Status : ${config.alwaysOnline ? '✅ ENABLED' : '❌ DISABLED'}
╰─┬────❍
╭─┴─❍「 📋 COMMANDS 」❍
│ 🔧 ${prefix}alwaysonline on - Enable
│ 🔧 ${prefix}alwaysonline off - Disable
╰──────❍
▰▰▰ © MDINYANE BY STANY TZ ▰▰▰`;
        await sendForwardedMessage(sock, chatId, msg);
        return;
    }
    
    if (action === 'on') {
        if (config.alwaysOnline) {
            await sendForwardedMessage(sock, chatId, `╭──❍「 🟢 ALWAYS ONLINE 」❍\n├ ⚠️ Already ENABLED\n╰──────❍`);
            return;
        }
        updateConfig({ alwaysOnline: true });
        startAlwaysOnline(sock);
        await sendForwardedMessage(sock, chatId, `╭──❍「 🟢 ALWAYS ONLINE 」❍\n├ ✅ ENABLED\n╰──────❍`);
        return;
    }
    
    if (action === 'off') {
        if (!config.alwaysOnline) {
            await sendForwardedMessage(sock, chatId, `╭──❍「 🟢 ALWAYS ONLINE 」❍\n├ ⚠️ Already DISABLED\n╰──────❍`);
            return;
        }
        updateConfig({ alwaysOnline: false });
        stopAlwaysOnline();
        await sendForwardedMessage(sock, chatId, `╭──❍「 🟢 ALWAYS ONLINE 」❍\n├ ❌ DISABLED\n╰──────❍`);
        return;
    }
    
    await sendForwardedMessage(sock, chatId, `╭──❍「 🟢 ALWAYS ONLINE 」❍\n├ ❌ Invalid: ${action}\n├ 📝 Use ${prefix}alwaysonline for help\n╰──────❍`);
}

async function handleModeCommand(sock, msg, args, prefix) {
    const chatId = msg.key.remoteJid;
    const action = args[0]?.toLowerCase();
    
    if (!action || action === 'status') {
        const modeEmoji = config.mode === 'public' ? '🌍' : config.mode === 'private' ? '💬' : config.mode === 'groups' ? '👥' : '🔒';
        let modeDesc = config.mode === 'public' ? 'DM + Groups' : config.mode === 'private' ? 'DM only' : config.mode === 'groups' ? 'Groups only' : 'Owner only';
        const msg = `╭──❍「 🤖 BOT MODE 」❍
├ ${modeEmoji} Mode : ${config.mode.toUpperCase()}
├ 📝 Description : ${modeDesc}
╰─┬────❍
╭─┴─❍「 📋 COMMANDS 」❍
│ 🔧 ${prefix}mode public - DM + Groups
│ 🔧 ${prefix}mode private - DM only
│ 🔧 ${prefix}mode groups - Groups only
│ 🔧 ${prefix}mode self - Owner only
╰──────❍
▰▰▰ © MDINYANE BY STANY TZ ▰▰▰`;
        await sendForwardedMessage(sock, chatId, msg);
        return;
    }
    
    if (action === 'public') {
        updateConfig({ mode: 'public' });
        await sendForwardedMessage(sock, chatId, `╭──❍「 🤖 BOT MODE 」❍\n├ 🌍 Mode : PUBLIC\n├ 📝 DM + Groups\n╰──────❍`);
        return;
    }
    
    if (action === 'private') {
        updateConfig({ mode: 'private' });
        await sendForwardedMessage(sock, chatId, `╭──❍「 🤖 BOT MODE 」❍\n├ 💬 Mode : PRIVATE\n├ 📝 DM only\n╰──────❍`);
        return;
    }
    
    if (action === 'groups') {
        updateConfig({ mode: 'groups' });
        await sendForwardedMessage(sock, chatId, `╭──❍「 🤖 BOT MODE 」❍\n├ 👥 Mode : GROUPS\n├ 📝 Groups only\n╰──────❍`);
        return;
    }
    
    if (action === 'self') {
        updateConfig({ mode: 'self' });
        await sendForwardedMessage(sock, chatId, `╭──❍「 🤖 BOT MODE 」❍\n├ 🔒 Mode : SELF\n├ 📝 Owner only\n╰──────❍`);
        return;
    }
    
    await sendForwardedMessage(sock, chatId, `╭──❍「 🤖 BOT MODE 」❍\n├ ❌ Invalid: ${action}\n├ 📝 Use ${prefix}mode public|private|groups|self\n╰──────❍`);
}

async function handlePrefixCommand(sock, msg, args, prefix) {
    const chatId = msg.key.remoteJid;
    const action = args[0]?.toLowerCase();
    const currentPrefixes = config.prefixes || ['.'];
    
    if (!action || action === 'status') {
        const prefixList = currentPrefixes.map(p => p === ' ' ? '[SPACE]' : p).join(', ');
        const msg = `╭──❍「 🔧 MULTI-PREFIX 」❍
├ 📝 Prefixes : ${currentPrefixes.length}
├ 🔧 Active : ${prefixList}
├ 🔓 Prefixless : ${config.prefixless ? '✅' : '❌'}
╰─┬────❍
╭─┴─❍「 📋 COMMANDS 」❍
│ 🔧 ${prefix}prefix add <symbol>
│ 🔧 ${prefix}prefix remove <symbol>
│ 🔧 ${prefix}prefix list
│ 🔧 ${prefix}prefix none - Prefixless mode
│ 🔧 ${prefix}prefix reset - Default (.)
╰──────❍
▰▰▰ © MDINYANE BY STANY TZ ▰▰▰`;
        await sendForwardedMessage(sock, chatId, msg);
        return;
    }
    
    if (action === 'add') {
        let newPrefix = args[1];
        if (!newPrefix) {
            await sendForwardedMessage(sock, chatId, `╭──❍「 🔧 PREFIX 」❍\n├ ❌ Provide a prefix to add\n╰──────❍`);
            return;
        }
        if (currentPrefixes.includes(newPrefix)) {
            await sendForwardedMessage(sock, chatId, `╭──❍「 🔧 PREFIX 」❍\n├ ⚠️ "${newPrefix}" already exists\n╰──────❍`);
            return;
        }
        const prefixes = [...currentPrefixes, newPrefix];
        updateConfig({ prefixes, prefixless: false });
        await sendForwardedMessage(sock, chatId, `╭──❍「 🔧 PREFIX 」❍\n├ ✅ Added "${newPrefix}"\n├ 📊 Total: ${prefixes.length}\n╰──────❍`);
        return;
    }
    
    if (action === 'remove') {
        let removePrefix = args[1];
        if (!removePrefix) {
            await sendForwardedMessage(sock, chatId, `╭──❍「 🔧 PREFIX 」❍\n├ ❌ Provide a prefix to remove\n╰──────❍`);
            return;
        }
        if (!currentPrefixes.includes(removePrefix)) {
            await sendForwardedMessage(sock, chatId, `╭──❍「 🔧 PREFIX 」❍\n├ ❌ "${removePrefix}" not found\n╰──────❍`);
            return;
        }
        if (currentPrefixes.length === 1) {
            await sendForwardedMessage(sock, chatId, `╭──❍「 🔧 PREFIX 」❍\n├ ⚠️ Cannot remove last prefix\n├ 💡 Use "${prefix}prefix none" for prefixless\n╰──────❍`);
            return;
        }
        const prefixes = currentPrefixes.filter(p => p !== removePrefix);
        updateConfig({ prefixes });
        await sendForwardedMessage(sock, chatId, `╭──❍「 🔧 PREFIX 」❍\n├ ✅ Removed "${removePrefix}"\n├ 📊 Remaining: ${prefixes.length}\n╰──────❍`);
        return;
    }
    
    if (action === 'list') {
        const prefixList = currentPrefixes.map((p, i) => {
            if (p === ' ') return `${i + 1}. [SPACE]`;
            return `${i + 1}. ${p}`;
        }).join('\n│ ');
        await sendForwardedMessage(sock, chatId, `╭──❍「 🔧 ACTIVE PREFIXES 」❍\n│ ${prefixList}\n╰──────❍`);
        return;
    }
    
    if (action === 'none' || action === 'prefixless') {
        if (config.prefixless) {
            await sendForwardedMessage(sock, chatId, `╭──❍「 🔧 PREFIX 」❍\n├ ⚠️ Prefixless already enabled\n╰──────❍`);
            return;
        }
        updateConfig({ prefixless: true });
        await sendForwardedMessage(sock, chatId, `╭──❍「 🔧 PREFIX 」❍\n├ ✅ Prefixless Mode ENABLED\n├ 📝 Commands work without prefix\n╰──────❍`);
        return;
    }
    
    if (action === 'reset') {
        updateConfig({ prefixes: ['.'], prefixless: false });
        await sendForwardedMessage(sock, chatId, `╭──❍「 🔧 PREFIX 」❍\n├ ✅ Reset to default\n├ 🔧 Prefix : .\n╰──────❍`);
        return;
    }
    
    await sendForwardedMessage(sock, chatId, `╭──❍「 🔧 PREFIX 」❍\n├ ❌ Invalid: ${action}\n├ 📝 Use ${prefix}prefix for help\n╰──────❍`);
}

async function handleConfigCommand(sock, msg, args, prefix) {
    const chatId = msg.key.remoteJid;
    const action = args[0]?.toLowerCase();
    
    if (!action || action === 'status') {
        const modeEmoji = config.mode === 'public' ? '🌍' : config.mode === 'private' ? '💬' : config.mode === 'groups' ? '👥' : '🔒';
        const msg = `╭──❍「 ⚙️ BOT CONFIGURATION 」❍
├ 👤 Owner : ${config.ownerName}
├ 📱 Owner Number : ${config.ownerNumber || 'Not set'}
├ 🔧 Prefixes : ${(config.prefixes || ['.']).length}
├ ${modeEmoji} Mode : ${config.mode.toUpperCase()}
├ ⌨️ Auto Typing : ${config.autoTyping ? '✅' : '❌'}
├ 🎙️ Auto Recording : ${config.autoRecording ? '✅' : '❌'}
├ 👁️ Auto Read : ${config.autoRead ? '✅' : '❌'}
├ 🟢 Always Online : ${config.alwaysOnline ? '✅' : '❌'}
╰─┬────❍
╭─┴─❍「 📋 COMMANDS 」❍
│ 🔧 ${prefix}mode <mode> - Change mode
│ 🔧 ${prefix}prefix - Manage prefixes
│ 🔧 ${prefix}autotyping - Typing settings
│ 🔧 ${prefix}autorecording - Recording settings
│ 🔧 ${prefix}autoread - Auto read settings
│ 🔧 ${prefix}alwaysonline - 24/7 online
╰──────❍
▰▰▰ © MDINYANE BY STANY TZ ▰▰▰`;
        await sendForwardedMessage(sock, chatId, msg);
        return;
    }
    
    await sendForwardedMessage(sock, chatId, `╭──❍「 ⚙️ CONFIG 」❍\n├ ❌ Invalid: ${action}\n├ 📝 Use ${prefix}config for help\n╰──────❍`);
}

async function processCoreCommands(sock, msg, commandName, args, prefix) {
    const cmd = commandName.toLowerCase();
    
    switch(cmd) {
        case 'autotyping':
            await handleAutoTypingCommand(sock, msg, args, prefix);
            return true;
        case 'autorecording':
            await handleAutoRecordingCommand(sock, msg, args, prefix);
            return true;
        case 'autoread':
            await handleAutoReadCommand(sock, msg, args, prefix);
            return true;
        case 'alwaysonline':
            await handleAlwaysOnlineCommand(sock, msg, args, prefix);
            return true;
        case 'mode':
            await handleModeCommand(sock, msg, args, prefix);
            return true;
        case 'prefix':
            await handlePrefixCommand(sock, msg, args, prefix);
            return true;
        case 'config':
        case 'setting':
        case 'settings':
            await handleConfigCommand(sock, msg, args, prefix);
            return true;
        default:
            return false;
    }
}

export { processCoreCommands };