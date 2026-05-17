/*****************************************************************************
 *                     Developed By STANY TZ                                 *
 *****************************************************************************/

import moment from 'moment-timezone';
import fs from 'fs';
import path from 'path';
import { channelInfo } from '../../stanytz/messageConfig.js';
import isAdmin from '../../stanymain/isAdmin.js';
import isOwner from '../../stanymain/isOwner.js';
import isGroup from '../../stanymain/isGroup.js';

const DATA_DIR = path.join(process.cwd(), 'stanydata');
const WARN_FILE = path.join(DATA_DIR, 'warnings.json');

async function getUserWarnings(chatId, userId) {
    try {
        const data = JSON.parse(fs.readFileSync(WARN_FILE, 'utf8'));
        return data[chatId]?.[userId] || { count: 0, warnings: [] };
    } catch {
        return { count: 0, warnings: [] };
    }
}

async function getAllWarnings(chatId) {
    try {
        const data = JSON.parse(fs.readFileSync(WARN_FILE, 'utf8'));
        return data[chatId] || {};
    } catch {
        return {};
    }
}

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
    name: 'warns',
    description: 'View warnings for a user or all users',
    icon: '📋',
    alias: ['warnings', 'viewwarns'],
    category: 'group',
    groupOnly: true,
    
    async execute(sock, msg, args, currentPrefix, { isOwner, jidManager }) {
        const chatId = msg.key.remoteJid;
        const senderId = msg.key.participant || chatId;
        
        const groupCheck = isGroup(chatId);
        if (!groupCheck.isGroup) {
            await sendForwardedMessage(sock, chatId, `╭──❍「 *📋 WARNS* 」❍\n├ ❌ This command only works in groups!\n╰──────❍`, [], msg);
            return;
        }
        
        const ownerCheck = await isOwner(senderId, jidManager);
        const adminCheck = await isAdmin(sock, chatId, senderId);
        const isAuthorized = ownerCheck.isOwner || adminCheck.isSenderAdmin;
        
        if (!isAuthorized) {
            await sendForwardedMessage(sock, chatId, `╭──❍「 *📋 WARNS* 」❍\n├ ❌ Only admins can use this command!\n╰──────❍`, [senderId], msg);
            return;
        }
        
        let targetId = args[0];
        if (msg.message?.extendedTextMessage?.contextInfo?.mentionedJid) {
            targetId = msg.message.extendedTextMessage.contextInfo.mentionedJid[0];
        }
        
        const now = moment().tz('Africa/Dar_es_Salaam');
        
        // Show all warnings
        if (!targetId) {
            const allWarnings = await getAllWarnings(chatId);
            const warningList = Object.entries(allWarnings);
            
            if (warningList.length === 0) {
                await sendForwardedMessage(sock, chatId, `╭──❍「 *📋 WARNS LIST* 」❍
├ 📝 No warnings in this group
├ 📅 Date: ${now.format('DD/MM/YYYY')}
├ ⏰ Time: ${now.format('HH:mm:ss')}
╰──────❍`, [], msg);
                return;
            }
            
            let listText = `╭──❍「 *📋 ALL WARNS* 」❍\n`;
            for (const [userId, data] of warningList) {
                listText += `├ 👤 +${userId.split('@')[0]} : ${data.count} warns\n`;
            }
            listText += `├ 📅 Date: ${now.format('DD/MM/YYYY')}\n├ ⏰ Time: ${now.format('HH:mm:ss')}\n╰──────❍`;
            
            await sendForwardedMessage(sock, chatId, listText, [], msg);
            return;
        }
        
        // Show specific user warnings
        const userWarns = await getUserWarnings(chatId, targetId);
        
        if (userWarns.count === 0) {
            await sendForwardedMessage(sock, chatId, `╭──❍「 *📋 USER WARNS* 」❍
├ 👤 @${targetId.split('@')[0]} has no warnings
├ 📅 Date: ${now.format('DD/MM/YYYY')}
├ ⏰ Time: ${now.format('HH:mm:ss')}
╰──────❍`, [targetId], msg);
            return;
        }
        
        let warnHistory = '';
        userWarns.warnings.forEach((w, i) => {
            const date = new Date(w.date).toLocaleDateString();
            warnHistory += `├ ${i + 1}. ${w.reason} (by ${w.warnedBy.split('@')[0]} on ${date})\n`;
        });
        
        await sendForwardedMessage(sock, chatId, `╭──❍「 *📋 USER WARNS* 」❍
├ 👤 *User* : @${targetId.split('@')[0]}
├ 📊 *Total Warnings* : ${userWarns.count}
├ 📝 *History* :
${warnHistory}├ 📅 *Date* : ${now.format('DD/MM/YYYY')}
├ ⏰ *Time* : ${now.format('HH:mm:ss')}
╰──────❍`, [targetId], msg);
    }
};