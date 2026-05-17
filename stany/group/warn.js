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

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(WARN_FILE)) fs.writeFileSync(WARN_FILE, JSON.stringify({}, null, 2));

async function getWarnings(chatId, userId) {
    try {
        const data = JSON.parse(fs.readFileSync(WARN_FILE, 'utf8'));
        return data[chatId]?.[userId]?.count || 0;
    } catch {
        return 0;
    }
}

async function addWarning(chatId, userId, reason, warnedBy) {
    try {
        const data = JSON.parse(fs.readFileSync(WARN_FILE, 'utf8'));
        if (!data[chatId]) data[chatId] = {};
        if (!data[chatId][userId]) {
            data[chatId][userId] = { count: 0, warnings: [] };
        }
        data[chatId][userId].count++;
        data[chatId][userId].warnings.push({
            reason: reason,
            warnedBy: warnedBy,
            date: new Date().toISOString()
        });
        fs.writeFileSync(WARN_FILE, JSON.stringify(data, null, 2));
        return data[chatId][userId].count;
    } catch {
        return 0;
    }
}

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
    name: 'warn',
    description: 'Warn a user for violating rules',
    icon: '⚠️',
    alias: ['warning'],
    category: 'group',
    groupOnly: true,
    
    async execute(sock, msg, args, currentPrefix, { isOwner, jidManager }) {
        const chatId = msg.key.remoteJid;
        const senderId = msg.key.participant || chatId;
        
        const groupCheck = isGroup(chatId);
        if (!groupCheck.isGroup) {
            await sendForwardedMessage(sock, chatId, `╭──❍「 *⚠️ WARN* 」❍\n├ ❌ This command only works in groups!\n╰──────❍`, [], msg);
            return;
        }
        
        const ownerCheck = await isOwner(senderId, jidManager);
        const adminCheck = await isAdmin(sock, chatId, senderId);
        const isAuthorized = ownerCheck.isOwner || adminCheck.isSenderAdmin;
        
        if (!isAuthorized) {
            await sendForwardedMessage(sock, chatId, `╭──❍「 *⚠️ WARN* 」❍\n├ ❌ Only admins can use this command!\n╰──────❍`, [senderId], msg);
            return;
        }
        
        let targetId = args[0];
        if (msg.message?.extendedTextMessage?.contextInfo?.mentionedJid) {
            targetId = msg.message.extendedTextMessage.contextInfo.mentionedJid[0];
        }
        
        if (!targetId) {
            await sendForwardedMessage(sock, chatId, `╭──❍「 *⚠️ WARN* 」❍\n├ 📝 Usage: ${currentPrefix}warn @user <reason>\n├ 📝 Example: ${currentPrefix}warn @user Spamming\n╰──────❍`, [], msg);
            return;
        }
        
        const reason = args.slice(1).join(' ') || 'No reason';
        const now = moment().tz('Africa/Dar_es_Salaam');
        
        const warningCount = await addWarning(chatId, targetId, reason, senderId);
        
        await sendForwardedMessage(sock, chatId, `╭──❍「 *⚠️ USER WARNED* 」❍
├ 👤 *User* : @${targetId.split('@')[0]}
├ 📝 *Reason* : ${reason}
├ 👑 *Warned By* : @${senderId.split('@')[0]}
├ 📊 *Warning Count* : ${warningCount}
├ 📅 *Date* : ${now.format('DD/MM/YYYY')}
├ ⏰ *Time* : ${now.format('HH:mm:ss')}
╰──────❍`, [targetId, senderId], msg);
        
        if (warningCount >= 3) {
            await sendForwardedMessage(sock, chatId, `╭──❍「 *⚠️ AUTO-KICK* 」❍
├ 👤 *User* : @${targetId.split('@')[0]}
├ 📝 *Reason* : Reached 3 warnings
├ 🚫 *Action* : Kicked from group
╰──────❍`, [targetId], msg);
            await sock.groupParticipantsUpdate(chatId, [targetId], 'remove');
            await resetWarnings(chatId, targetId);
        }
    }
};