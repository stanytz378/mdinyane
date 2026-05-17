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
    name: 'tagadmins',
    description: 'Tag all admins in the group',
    icon: '👑',
    alias: ['admins', 'tagadmin'],
    category: 'group',
    groupOnly: true,
    
    async execute(sock, msg, args, currentPrefix, { isOwner, jidManager }) {
        const chatId = msg.key.remoteJid;
        const senderId = msg.key.participant || chatId;
        
        const groupCheck = isGroup(chatId);
        if (!groupCheck.isGroup) {
            await sendStyledMessage(sock, chatId, `╭──❍「 *👑 TAGADMINS* 」❍\n├ ❌ This command only works in groups!\n╰──────❍`, [], msg);
            return;
        }
        
        const message = args.join(' ') || 'Admins needed!';
        
        try {
            const metadata = await sock.groupMetadata(chatId);
            const admins = metadata.participants.filter(p => p.admin === 'admin' || p.admin === 'superadmin');
            const adminMentions = admins.map(a => a.id);
            const now = moment().tz('Africa/Dar_es_Salaam');
            
            if (admins.length === 0) {
                await sendStyledMessage(sock, chatId, `╭──❍「 *👑 TAGADMINS* 」❍
├ 📝 No admins found in this group
╰──────❍`, [], msg);
                return;
            }
            
            await sock.sendMessage(chatId, {
                text: `╭──❍「 *👑 TAGADMINS* 」❍
├ 📝 *Message* : ${message}
├ 👥 *Admins* : ${admins.length}
├ 📅 *Date* : ${now.format('DD/MM/YYYY')}
├ ⏰ *Time* : ${now.format('HH:mm:ss')} EAT
╰──────❍\n\n${admins.map(a => `@${a.id.split('@')[0]}`).join(' ')}`,
                mentions: adminMentions,
                contextInfo: channelInfo.contextInfo
            }, { quoted: msg });
        } catch (error) {
            await sendStyledMessage(sock, chatId, `╭──❍「 *👑 TAGADMINS* 」❍\n├ ❌ Failed: ${error.message}\n╰──────❍`, [], msg);
        }
    }
};