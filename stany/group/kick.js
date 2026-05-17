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
    name: 'kick',
    description: 'Remove a member from group',
    icon: '👢',
    alias: ['remove', 'rm'],
    category: 'group',
    groupOnly: true,
    
    async execute(sock, msg, args, currentPrefix, { isOwner, jidManager }) {
        const chatId = msg.key.remoteJid;
        const senderId = msg.key.participant || chatId;
        
        const groupCheck = isGroup(chatId);
        if (!groupCheck.isGroup) {
            await sendForwardedMessage(sock, chatId, `╭──❍「 *👢 KICK* 」❍\n├ ❌ This command only works in groups!\n╰──────❍`, [], msg);
            return;
        }
        
        const ownerCheck = await isOwner(senderId, jidManager);
        const adminCheck = await isAdmin(sock, chatId, senderId);
        const isAuthorized = ownerCheck.isOwner || adminCheck.isSenderAdmin;
        
        if (!isAuthorized) {
            await sendForwardedMessage(sock, chatId, `╭──❍「 *👢 KICK* 」❍\n├ ❌ Only admins can use this command!\n╰──────❍`, [senderId], msg);
            return;
        }
        
        const botAdminCheck = await isAdmin(sock, chatId, sock.user.id);
        if (!botAdminCheck.isBotAdmin) {
            await sendForwardedMessage(sock, chatId, `╭──❍「 *👢 KICK* 」❍\n├ ❌ Bot needs to be admin first!\n╰──────❍`, [], msg);
            return;
        }
        
        let targetId = args[0];
        if (msg.message?.extendedTextMessage?.contextInfo?.mentionedJid) {
            targetId = msg.message.extendedTextMessage.contextInfo.mentionedJid[0];
        }
        
        if (!targetId) {
            await sendForwardedMessage(sock, chatId, `╭──❍「 *👢 KICK* 」❍\n├ 📝 Usage: ${currentPrefix}kick @user\n╰──────❍`, [], msg);
            return;
        }
        
        const ownerNumber = jidManager?.owner?.cleanNumber;
        const targetNumber = targetId.split('@')[0];
        if (targetNumber === ownerNumber) {
            await sendForwardedMessage(sock, chatId, `╭──❍「 *👢 KICK* 」❍\n├ ❌ Cannot kick the bot owner!\n╰──────❍`, [], msg);
            return;
        }
        
        try {
            await sock.groupParticipantsUpdate(chatId, [targetId], 'remove');
            const now = moment().tz('Africa/Dar_es_Salaam');
            await sendForwardedMessage(sock, chatId, `╭──❍「 *👢 KICKED* 」❍\n├ ✅ @${targetId.split('@')[0]} has been removed\n├ 📅 Date: ${now.format('DD/MM/YYYY')}\n├ ⏰ Time: ${now.format('HH:mm:ss')}\n╰──────❍`, [targetId], msg);
        } catch (error) {
            await sendForwardedMessage(sock, chatId, `╭──❍「 *👢 KICK* 」❍\n├ ❌ Failed: ${error.message}\n╰──────❍`, [], msg);
        }
    }
};