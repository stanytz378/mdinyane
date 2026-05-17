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
    name: 'revoke',
    description: 'Reset/Revoke group invite link',
    icon: '🔄',
    alias: ['resetlink', 'newlink'],
    category: 'group',
    groupOnly: true,
    
    async execute(sock, msg, args, currentPrefix, { isOwner, jidManager }) {
        const chatId = msg.key.remoteJid;
        const senderId = msg.key.participant || chatId;
        
        const groupCheck = isGroup(chatId);
        if (!groupCheck.isGroup) {
            await sendForwardedMessage(sock, chatId, `╭──❍「 *🔄 REVOKE* 」❍\n├ ❌ This command only works in groups!\n╰──────❍`, [], msg);
            return;
        }
        
        const ownerCheck = await isOwner(senderId, jidManager);
        const adminCheck = await isAdmin(sock, chatId, senderId);
        const isAuthorized = ownerCheck.isOwner || adminCheck.isSenderAdmin;
        
        if (!isAuthorized) {
            await sendForwardedMessage(sock, chatId, `╭──❍「 *🔄 REVOKE* 」❍\n├ ❌ Only admins can use this command!\n╰──────❍`, [senderId], msg);
            return;
        }
        
        try {
            await sock.groupRevokeInvite(chatId);
            const code = await sock.groupInviteCode(chatId);
            const link = `https://chat.whatsapp.com/${code}`;
            const now = moment().tz('Africa/Dar_es_Salaam');
            await sendForwardedMessage(sock, chatId, `╭──❍「 *🔄 LINK REVOKED* 」❍
├ ✅ New invite link generated
├ 🔗 *New Link* : ${link}
├ 📅 *Date* : ${now.format('DD/MM/YYYY')}
├ ⏰ *Time* : ${now.format('HH:mm:ss')}
╰──────❍`, [], msg);
        } catch (error) {
            await sendForwardedMessage(sock, chatId, `╭──❍「 *🔄 REVOKE* 」❍\n├ ❌ Failed: ${error.message}\n╰──────❍`, [], msg);
        }
    }
};