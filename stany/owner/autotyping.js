/*****************************************************************************
 *                     Developed By STANY TZ                                 *
 *****************************************************************************/

import { channelInfo, botImagePath } from '../../stanytz/messageConfig.js';
import isOwner from '../../stanymain/isOwner.js';
import { config, updateConfig } from '../../stanycore/config.js';

async function sendStyledMessage(sock, chatId, text, mentions = [], quoted = null) {
    try {
        const imageFullPath = path.join(process.cwd(), botImagePath);
        const imageExists = fs.existsSync(imageFullPath);
        
        const forwardContext = {
            forwardingScore: 999,
            isForwarded: true,
            forwardedNewsletterMessageInfo: {
                newsletterJid: '120363404317544295@newsletter',
                newsletterName: '✨ᴍᴅɪɴʏᴀɴᴇ ʙᴏᴛ💫',
                serverMessageId: Date.now().toString()
            }
        };
        
        if (imageExists) {
            await sock.sendMessage(chatId, {
                image: fs.readFileSync(imageFullPath),
                caption: text,
                contextInfo: forwardContext,
                mentions: mentions
            }, { quoted: quoted });
        } else {
            await sock.sendMessage(chatId, {
                text: text,
                contextInfo: forwardContext,
                mentions: mentions
            }, { quoted: quoted });
        }
    } catch (error) {
        await sock.sendMessage(chatId, {
            text: text,
            mentions: mentions
        }, { quoted: quoted });
    }
}

export default {
    name: 'autotyping',
    description: 'Configure auto typing feature',
    icon: '⌨️',
    alias: ['autotype', 'type'],
    category: 'owner',
    ownerOnly: true,
    
    async execute(sock, msg, args, currentPrefix, { isOwner, jidManager }) {
        
        const chatId = msg.key.remoteJid;
        const senderId = msg.key.participant || chatId;
        
        // Owner check
        const ownerCheck = await isOwner(senderId, jidManager);
        if (!ownerCheck.isOwner) return;
        
        const action = args[0]?.toLowerCase();
        
        // Show status
        if (!action || action === 'status') {
            const locationEmoji = config.autoTypingLocation === 'both' ? '🌍' : 
                                 config.autoTypingLocation === 'private' ? '💬' : '👥';
            let locationText = '';
            switch(config.autoTypingLocation) {
                case 'both': locationText = 'Private chats & Groups'; break;
                case 'private': locationText = 'Private chats only'; break;
                case 'groups': locationText = 'Groups only'; break;
            }
            
            const statusMsg = `╭──❍「 *⌨️ AUTO TYPING CONFIG* 」❍
├ 📝 *Status* : ${config.autoTyping ? '✅ ENABLED' : '❌ DISABLED'}
├ ${locationEmoji} *Location* : ${locationText}
╰─┬────❍
╭─┴─❍「 *📋 COMMANDS* 」❍
│ 🔧 ${currentPrefix}autotyping on - Enable
│ 🔧 ${currentPrefix}autotyping off - Disable
│ 🔧 ${currentPrefix}autotyping both - DM & Groups
│ 🔧 ${currentPrefix}autotyping private - DM only
│ 🔧 ${currentPrefix}autotyping groups - Groups only
╰──────❍

_📌 Bot will show typing indicator before responding_
▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`;
            await sendStyledMessage(sock, chatId, statusMsg, [], msg);
            return;
        }
        
        // Enable
        if (action === 'on') {
            if (config.autoTyping) {
                await sendStyledMessage(sock, chatId, `╭──❍「 *⌨️ AUTO TYPING* 」❍\n├ ⚠️ *Status* : Already ENABLED\n╰──────❍`, [], msg);
                return;
            }
            updateConfig({ autoTyping: true });
            await sendStyledMessage(sock, chatId, `╭──❍「 *⌨️ AUTO TYPING* 」❍\n├ ✅ *Status* : ENABLED\n├ 📝 *Location* : ${config.autoTypingLocation === 'both' ? 'DM & Groups' : config.autoTypingLocation === 'private' ? 'DM only' : 'Groups only'}\n╰──────❍`, [], msg);
            return;
        }
        
        // Disable
        if (action === 'off') {
            if (!config.autoTyping) {
                await sendStyledMessage(sock, chatId, `╭──❍「 *⌨️ AUTO TYPING* 」❍\n├ ⚠️ *Status* : Already DISABLED\n╰──────❍`, [], msg);
                return;
            }
            updateConfig({ autoTyping: false });
            await sendStyledMessage(sock, chatId, `╭──❍「 *⌨️ AUTO TYPING* 」❍\n├ ❌ *Status* : DISABLED\n╰──────❍`, [], msg);
            return;
        }
        
        // Set location
        if (action === 'both') {
            updateConfig({ autoTypingLocation: 'both' });
            await sendStyledMessage(sock, chatId, `╭──❍「 *⌨️ AUTO TYPING* 」❍\n├ 🌍 *Location* : BOTH (DM & Groups)\n├ 📝 *Typing will show in all chats*\n╰──────❍`, [], msg);
            return;
        }
        
        if (action === 'private') {
            updateConfig({ autoTypingLocation: 'private' });
            await sendStyledMessage(sock, chatId, `╭──❍「 *⌨️ AUTO TYPING* 」❍\n├ 💬 *Location* : PRIVATE ONLY\n├ 📝 *Typing will show only in direct messages*\n╰──────❍`, [], msg);
            return;
        }
        
        if (action === 'groups') {
            updateConfig({ autoTypingLocation: 'groups' });
            await sendStyledMessage(sock, chatId, `╭──❍「 *⌨️ AUTO TYPING* 」❍\n├ 👥 *Location* : GROUPS ONLY\n├ 📝 *Typing will show only in groups*\n╰──────❍`, [], msg);
            return;
        }
        
        await sendStyledMessage(sock, chatId, `╭──❍「 *⌨️ AUTO TYPING* 」❍\n├ ❌ *Invalid command* : ${action}\n├ 📝 *Use* : ${currentPrefix}autotyping for help\n╰──────❍`, [], msg);
    }
};