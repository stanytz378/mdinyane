/*****************************************************************************
 *                     Developed By STANY TZ                                 *
 *****************************************************************************/

import moment from 'moment-timezone';
import { channelInfo } from '../../stanytz/messageConfig.js';
import isAdmin from '../../stanymain/isAdmin.js';
import isOwner from '../../stanymain/isOwner.js';
import isGroup from '../../stanymain/isGroup.js';

async function sendForwardedMessage(sock, chatId, text, mentions = [], quoted = null) {
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
    name: 'open',
    description: 'Open/Unlock group (everyone can send messages)',
    icon: '🔓',
    alias: ['unlock', 'opengroup'],
    category: 'group',
    groupOnly: true,
    
    async execute(sock, msg, args, currentPrefix, { isOwner, jidManager }) {
        const chatId = msg.key.remoteJid;
        const senderId = msg.key.participant || chatId;
        
        const groupCheck = isGroup(chatId);
        if (!groupCheck.isGroup) {
            await sendForwardedMessage(sock, chatId, `╭──❍「 *🔓 OPEN* 」❍\n├ ❌ This command only works in groups!\n╰──────❍`, [], msg);
            return;
        }
        
        const ownerCheck = await isOwner(senderId, jidManager);
        const adminCheck = await isAdmin(sock, chatId, senderId);
        const isAuthorized = ownerCheck.isOwner || adminCheck.isSenderAdmin;
        
        if (!isAuthorized) {
            await sendForwardedMessage(sock, chatId, `╭──❍「 *🔓 OPEN* 」❍\n├ ❌ Only admins can use this command!\n╰──────❍`, [senderId], msg);
            return;
        }
        
        const botAdminCheck = await isAdmin(sock, chatId, sock.user.id);
        if (!botAdminCheck.isBotAdmin) {
            await sendForwardedMessage(sock, chatId, `╭──❍「 *🔓 OPEN* 」❍\n├ ❌ Bot needs to be admin first!\n╰──────❍`, [], msg);
            return;
        }
        
        try {
            await sock.groupSettingUpdate(chatId, 'not_announcement');
            const now = moment().tz('Africa/Dar_es_Salaam');
            await sendForwardedMessage(sock, chatId, `╭──❍「 *🔓 GROUP OPENED* 」❍\n├ ✅ Group is now OPEN\n├ 📝 All members can send messages\n├ 📅 Date: ${now.format('DD/MM/YYYY')}\n├ ⏰ Time: ${now.format('HH:mm:ss')}\n╰──────❍`, [], msg);
        } catch (error) {
            await sendForwardedMessage(sock, chatId, `╭──❍「 *🔓 OPEN* 」❍\n├ ❌ Failed: ${error.message}\n╰──────❍`, [], msg);
        }
    }
};