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
    name: 'autoread',
    description: 'Configure auto read messages',
    icon: '👁️',
    alias: ['autoreadmsg', 'readmsg', 'autoseen'],
    category: 'owner',
    ownerOnly: true,
    
    async execute(sock, msg, args, currentPrefix, { isOwner, jidManager }) {
        const chatId = msg.key.remoteJid;
        const senderId = msg.key.participant || chatId;
        
        const ownerCheck = await isOwner(senderId, jidManager);
        if (!ownerCheck.isOwner) {
            await sendStyledMessage(sock, chatId, `╭──❍「 *👁️ AUTO READ* 」❍
├ 👤 *User* : @${senderId.split('@')[0]}
├ ❌ *Error* : Owner only command!
╰──────❍
▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`, [senderId], msg);
            return;
        }
        
        const action = args[0]?.toLowerCase();
        
        if (!action || action === 'status') {
            await sendStyledMessage(sock, chatId, `╭──❍「 *👁️ AUTO READ* 」❍
├ 📝 *Status* : ${config.autoRead ? '✅ ENABLED' : '❌ DISABLED'}
├ 👥 *Groups* : ${config.autoReadGroups ? '✅' : '❌'}
├ 💬 *Private* : ${config.autoReadPrivate ? '✅' : '❌'}
╰─┬────❍
╭─┴─❍「 *📋 COMMANDS* 」❍
│ 🔧 ${currentPrefix}autoread on - Enable
│ 🔧 ${currentPrefix}autoread off - Disable
│ 🔧 ${currentPrefix}autoread groups on/off
│ 🔧 ${currentPrefix}autoread private on/off
╰──────❍
▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`, [], msg);
            return;
        }
        
        if (action === 'on') {
            updateConfig({ autoRead: true });
            await sendStyledMessage(sock, chatId, `╭──❍「 *👁️ AUTO READ* 」❍
├ ✅ *Status* : ENABLED
╰──────❍
▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`, [], msg);
        } else if (action === 'off') {
            updateConfig({ autoRead: false });
            await sendStyledMessage(sock, chatId, `╭──❍「 *👁️ AUTO READ* 」❍
├ ❌ *Status* : DISABLED
╰──────❍
▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`, [], msg);
        } else if (action === 'groups') {
            const subAction = args[1]?.toLowerCase();
            if (subAction === 'on') {
                updateConfig({ autoReadGroups: true });
                await sendStyledMessage(sock, chatId, `╭──❍「 *👁️ AUTO READ* 」❍
├ ✅ *Groups* : ENABLED
╰──────❍
▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`, [], msg);
            } else if (subAction === 'off') {
                updateConfig({ autoReadGroups: false });
                await sendStyledMessage(sock, chatId, `╭──❍「 *👁️ AUTO READ* 」❍
├ ❌ *Groups* : DISABLED
╰──────❍
▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`, [], msg);
            } else {
                await sendStyledMessage(sock, chatId, `╭──❍「 *👁️ AUTO READ* 」❍
├ ❌ *Usage* : ${currentPrefix}autoread groups on/off
╰──────❍
▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`, [], msg);
            }
        } else if (action === 'private') {
            const subAction = args[1]?.toLowerCase();
            if (subAction === 'on') {
                updateConfig({ autoReadPrivate: true });
                await sendStyledMessage(sock, chatId, `╭──❍「 *👁️ AUTO READ* 」❍
├ ✅ *Private* : ENABLED
╰──────❍
▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`, [], msg);
            } else if (subAction === 'off') {
                updateConfig({ autoReadPrivate: false });
                await sendStyledMessage(sock, chatId, `╭──❍「 *👁️ AUTO READ* 」❍
├ ❌ *Private* : DISABLED
╰──────❍
▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`, [], msg);
            } else {
                await sendStyledMessage(sock, chatId, `╭──❍「 *👁️ AUTO READ* 」❍
├ ❌ *Usage* : ${currentPrefix}autoread private on/off
╰──────❍
▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`, [], msg);
            }
        } else {
            await sendStyledMessage(sock, chatId, `╭──❍「 *👁️ AUTO READ* 」❍
├ ❌ *Invalid* : ${action}
╰──────❍
▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`, [], msg);
        }
    }
};