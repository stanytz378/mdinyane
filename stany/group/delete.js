/*****************************************************************************
 *                     Developed By STANY TZ                                 *
 *****************************************************************************/

import moment from 'moment-timezone';
import { channelInfo } from '../../stanytz/messageConfig.js';
import isAdmin from '../../stanymain/isAdmin.js';
import isOwner from '../../stanymain/isOwner.js';
import isGroup from '../../stanymain/isGroup.js';

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
    name: 'delete',
    description: 'Delete bot\'s replied message',
    icon: '🗑️',
    alias: ['del', 'rmmsg'],
    category: 'group',
    groupOnly: true,
    
    async execute(sock, msg, args, currentPrefix, { isOwner, jidManager }) {
        const chatId = msg.key.remoteJid;
        const senderId = msg.key.participant || chatId;
        
        const quotedMsg = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        if (!quotedMsg) {
            await sendStyledMessage(sock, chatId, `╭──❍「 *🗑️ DELETE* 」❍
├ 📝 Reply to a message to delete it
├ 📝 Usage: Reply to message then ${currentPrefix}delete
╰──────❍`, [], msg);
            return;
        }
        
        const quotedKey = {
            remoteJid: chatId,
            id: msg.message.extendedTextMessage.contextInfo.stanzaId,
            participant: msg.message.extendedTextMessage.contextInfo.participant
        };
        
        try {
            await sock.sendMessage(chatId, { delete: quotedKey });
            const now = moment().tz('Africa/Dar_es_Salaam');
            await sendStyledMessage(sock, chatId, `╭──❍「 *🗑️ DELETED* 」❍
├ ✅ Message deleted successfully
├ 📅 Date: ${now.format('DD/MM/YYYY')}
├ ⏰ Time: ${now.format('HH:mm:ss')} EAT
╰──────❍`, [], msg);
        } catch (error) {
            await sendStyledMessage(sock, chatId, `╭──❍「 *🗑️ DELETE* 」❍\n├ ❌ Failed: ${error.message}\n╰──────❍`, [], msg);
        }
    }
};