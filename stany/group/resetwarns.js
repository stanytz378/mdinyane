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

async function resetWarnings(chatId, userId) {
    try {
        const data = JSON.parse(fs.readFileSync(WARN_FILE, 'utf8'));
        if (data[chatId] && data[chatId][userId]) {
            delete data[chatId][userId];
            fs.writeFileSync(WARN_FILE, JSON.stringify(data, null, 2));
        }
        return true;
    } catch {
        return false;
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
    name: 'resetwarns',
    description: 'Reset warnings for a user',
    icon: '🔄',
    alias: ['clearwarns', 'delwarns'],
    category: 'group',
    groupOnly: true,
    
    async execute(sock, msg, args, currentPrefix, { isOwner, jidManager }) {
        const chatId = msg.key.remoteJid;
        const senderId = msg.key.participant || chatId;
        
        const groupCheck = isGroup(chatId);
        if (!groupCheck.isGroup) {
            await sendForwardedMessage(sock, chatId, `╭──❍「 *🔄 RESETWARNS* 」❍\n├ ❌ This command only works in groups!\n╰──────❍`, [], msg);
            return;
        }
        
        const ownerCheck = await isOwner(senderId, jidManager);
        const adminCheck = await isAdmin(sock, chatId, senderId);
        const isAuthorized = ownerCheck.isOwner || adminCheck.isSenderAdmin;
        
        if (!isAuthorized) {
            await sendForwardedMessage(sock, chatId, `╭──❍「 *🔄 RESETWARNS* 」❍\n├ ❌ Only admins can use this command!\n╰──────❍`, [senderId], msg);
            return;
        }
        
        let targetId = args[0];
        if (msg.message?.extendedTextMessage?.contextInfo?.mentionedJid) {
            targetId = msg.message.extendedTextMessage.contextInfo.mentionedJid[0];
        }
        
        if (!targetId) {
            await sendForwardedMessage(sock, chatId, `╭──❍「 *🔄 RESETWARNS* 」❍\n├ 📝 Usage: ${currentPrefix}resetwarns @user\n╰──────❍`, [], msg);
            return;
        }
        
        await resetWarnings(chatId, targetId);
        const now = moment().tz('Africa/Dar_es_Salaam');
        
        await sendForwardedMessage(sock, chatId, `╭──❍「 *🔄 WARNS RESET* 」❍
├ 👤 *User* : @${targetId.split('@')[0]}
├ 👑 *Reset By* : @${senderId.split('@')[0]}
├ 📅 *Date* : ${now.format('DD/MM/YYYY')}
├ ⏰ *Time* : ${now.format('HH:mm:ss')}
╰──────❍`, [targetId, senderId], msg);
    }
};