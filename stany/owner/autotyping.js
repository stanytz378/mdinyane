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
    name: 'autotyping',
    description: 'Enable/disable auto typing indicator',
    icon: '⌨️',
    alias: ['autotype'],
    category: 'owner',
    ownerOnly: true,
    
    async execute(sock, msg, args, currentPrefix, { isOwner, jidManager }) {
        const chatId = msg.key.remoteJid;
        const senderId = msg.key.participant || chatId;
        
        const ownerCheck = await isOwner(senderId, jidManager);
        if (!ownerCheck.isOwner) {
            await sendStyledMessage(sock, chatId, `╭──❍「 *⌨️ AUTO TYPING* 」❍\n├ ❌ Owner only command!\n╰──────❍`, [senderId], msg);
            return;
        }
        
        const action = args[0]?.toLowerCase();
        
        if (!action || action === 'status') {
            const locationText = config.autoTypingLocation === 'both' ? 'DM + Groups' : 
                               config.autoTypingLocation === 'private' ? 'DM only' : 'Groups only';
            await sendStyledMessage(sock, chatId, `╭──❍「 *⌨️ AUTO TYPING* 」❍
├ 📝 *Status* : ${config.autoTyping ? '✅ ENABLED' : '❌ DISABLED'}
├ 📍 *Location* : ${locationText}
╰─┬────❍
╭─┴─❍「 *📋 COMMANDS* 」❍
│ 🔧 ${currentPrefix}autotyping on - Enable
│ 🔧 ${currentPrefix}autotyping off - Disable
│ 🔧 ${currentPrefix}autotyping both - DM + Groups
│ 🔧 ${currentPrefix}autotyping private - DM only
│ 🔧 ${currentPrefix}autotyping groups - Groups only
╰──────❍`, [], msg);
            return;
        }
        
        if (action === 'on') {
            updateConfig({ autoTyping: true });
            await sendStyledMessage(sock, chatId, `╭──❍「 *⌨️ AUTO TYPING* 」❍\n├ ✅ ENABLED\n╰──────❍`, [], msg);
        } else if (action === 'off') {
            updateConfig({ autoTyping: false });
            await sendStyledMessage(sock, chatId, `╭──❍「 *⌨️ AUTO TYPING* 」❍\n├ ❌ DISABLED\n╰──────❍`, [], msg);
        } else if (action === 'both') {
            updateConfig({ autoTypingLocation: 'both' });
            await sendStyledMessage(sock, chatId, `╭──❍「 *⌨️ AUTO TYPING* 」❍\n├ 🌍 Location: BOTH (DM + Groups)\n╰──────❍`, [], msg);
        } else if (action === 'private') {
            updateConfig({ autoTypingLocation: 'private' });
            await sendStyledMessage(sock, chatId, `╭──❍「 *⌨️ AUTO TYPING* 」❍\n├ 💬 Location: PRIVATE ONLY\n╰──────❍`, [], msg);
        } else if (action === 'groups') {
            updateConfig({ autoTypingLocation: 'groups' });
            await sendStyledMessage(sock, chatId, `╭──❍「 *⌨️ AUTO TYPING* 」❍\n├ 👥 Location: GROUPS ONLY\n╰──────❍`, [], msg);
        } else {
            await sendStyledMessage(sock, chatId, `╭──❍「 *⌨️ AUTO TYPING* 」❍\n├ ❌ Invalid: ${action}\n╰──────❍`, [], msg);
        }
    }
};