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

import { config, updateConfig } from '../../stanycore/config.js';
import { channelInfo } from '../../stanytz/messageConfig.js';
import isOwner from '../../stanymain/isOwner.js';
import { startAlwaysOnline, stopAlwaysOnline } from '../../stanycore/handlers/alwaysonline.js';

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
    name: 'alwaysonline',
    description: 'Keep bot online 24/7',
    icon: '🟢',
    alias: ['online', 'stayonline'],
    category: 'owner',
    ownerOnly: true,
    
    async execute(sock, msg, args, currentPrefix, { isOwner, jidManager }) {
        const chatId = msg.key.remoteJid;
        const senderId = msg.key.participant || chatId;
        
        const ownerCheck = await isOwner(senderId, jidManager);
        if (!ownerCheck.isOwner) {
            await sendStyledMessage(sock, chatId, `╭──❍「 *🟢 ALWAYS ONLINE* 」❍
├ 👤 *User* : @${senderId.split('@')[0]}
├ ❌ *Error* : Owner only command!
╰──────❍
▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`, [senderId], msg);
            return;
        }
        
        const action = args[0]?.toLowerCase();
        
        if (!action || action === 'status') {
            await sendStyledMessage(sock, chatId, `╭──❍「 *🟢 ALWAYS ONLINE* 」❍
├ 📝 *Status* : ${config.alwaysOnline ? '✅ ENABLED' : '❌ DISABLED'}
╰─┬────❍
╭─┴─❍「 *📋 COMMANDS* 」❍
│ 🔧 ${currentPrefix}alwaysonline on - Enable
│ 🔧 ${currentPrefix}alwaysonline off - Disable
╰──────❍
▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`, [], msg);
            return;
        }
        
        if (action === 'on') {
            updateConfig({ alwaysOnline: true });
            startAlwaysOnline(sock);
            await sendStyledMessage(sock, chatId, `╭──❍「 *🟢 ALWAYS ONLINE* 」❍
├ ✅ *Status* : ENABLED
├ 📝 *Bot will stay online 24/7*
╰──────❍
▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`, [], msg);
        } else if (action === 'off') {
            updateConfig({ alwaysOnline: false });
            stopAlwaysOnline();
            await sendStyledMessage(sock, chatId, `╭──❍「 *🟢 ALWAYS ONLINE* 」❍
├ ❌ *Status* : DISABLED
╰──────❍
▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`, [], msg);
        } else {
            await sendStyledMessage(sock, chatId, `╭──❍「 *🟢 ALWAYS ONLINE* 」❍
├ ❌ *Invalid* : ${action}
╰──────❍
▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`, [], msg);
        }
    }
};