import { config, updateConfig } from '../../stanycore/config.js';
import { channelInfo } from '../../stanytz/messageConfig.js';
import isOwner from '../../stanymain/isOwner.js';

async function sendStyledMessage(sock, chatId, text, mentions = [], quoted = null) {
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

export default {
    name: 'autorecording',
    description: 'Enable/disable auto recording indicator',
    icon: '🎙️',
    alias: ['autorecord'],
    category: 'owner',
    ownerOnly: true,
    
    async execute(sock, msg, args, currentPrefix, { isOwner, jidManager }) {
        const chatId = msg.key.remoteJid;
        const senderId = msg.key.participant || chatId;
        
        const ownerCheck = await isOwner(senderId, jidManager);
        if (!ownerCheck.isOwner) {
            await sendStyledMessage(sock, chatId, `╭──❍「 *🎙️ AUTO RECORDING* 」❍\n├ ❌ Owner only command!\n╰──────❍`, [senderId], msg);
            return;
        }
        
        const action = args[0]?.toLowerCase();
        
        if (!action || action === 'status') {
            const locationText = config.autoRecordingLocation === 'both' ? 'DM + Groups' : 
                               config.autoRecordingLocation === 'private' ? 'DM only' : 'Groups only';
            await sendStyledMessage(sock, chatId, `╭──❍「 *🎙️ AUTO RECORDING* 」❍
├ 📝 *Status* : ${config.autoRecording ? '✅ ENABLED' : '❌ DISABLED'}
├ 📍 *Location* : ${locationText}
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
        
        if (action === 'on') {
            updateConfig({ autoRecording: true });
            await sendStyledMessage(sock, chatId, `╭──❍「 *🎙️ AUTO RECORDING* 」❍\n├ ✅ ENABLED\n╰──────❍`, [], msg);
        } else if (action === 'off') {
            updateConfig({ autoRecording: false });
            await sendStyledMessage(sock, chatId, `╭──❍「 *🎙️ AUTO RECORDING* 」❍\n├ ❌ DISABLED\n╰──────❍`, [], msg);
        } else if (action === 'both') {
            updateConfig({ autoRecordingLocation: 'both' });
            await sendStyledMessage(sock, chatId, `╭──❍「 *🎙️ AUTO RECORDING* 」❍\n├ 🌍 Location: BOTH (DM + Groups)\n╰──────❍`, [], msg);
        } else if (action === 'private') {
            updateConfig({ autoRecordingLocation: 'private' });
            await sendStyledMessage(sock, chatId, `╭──❍「 *🎙️ AUTO RECORDING* 」❍\n├ 💬 Location: PRIVATE ONLY\n╰──────❍`, [], msg);
        } else if (action === 'groups') {
            updateConfig({ autoRecordingLocation: 'groups' });
            await sendStyledMessage(sock, chatId, `╭──❍「 *🎙️ AUTO RECORDING* 」❍\n├ 👥 Location: GROUPS ONLY\n╰──────❍`, [], msg);
        } else {
            await sendStyledMessage(sock, chatId, `╭──❍「 *🎙️ AUTO RECORDING* 」❍\n├ ❌ Invalid: ${action}\n╰──────❍`, [], msg);
        }
    }
};