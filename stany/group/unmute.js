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
const MUTE_FILE = path.join(DATA_DIR, 'muted_users.json');

// ============================================================
// GET TARGET USER ID (Reply, Tag, or Number)
// ============================================================

function getTargetId(msg, args) {
    // Method 1: Check if replying to a message
    const quotedMsg = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    if (quotedMsg) {
        const quotedParticipant = msg.message.extendedTextMessage.contextInfo.participant;
        if (quotedParticipant) return quotedParticipant;
        if (quotedMsg.key?.participant) return quotedMsg.key.participant;
        if (quotedMsg.key?.remoteJid) return quotedMsg.key.remoteJid;
    }
    
    // Method 2: Check if mentioned
    if (msg.message?.extendedTextMessage?.contextInfo?.mentionedJid) {
        const mentioned = msg.message.extendedTextMessage.contextInfo.mentionedJid[0];
        if (mentioned) return mentioned;
    }
    
    // Method 3: Check if number was provided
    const number = args[0]?.trim();
    if (number && number.match(/^[0-9]{10,15}$/)) {
        return `${number}@s.whatsapp.net`;
    }
    
    return null;
}

// ============================================================
// UNMUTE FUNCTIONS
// ============================================================

async function removeMutedUser(chatId, userId) {
    try {
        const data = JSON.parse(fs.readFileSync(MUTE_FILE, 'utf8'));
        if (data[chatId]) {
            const wasMuted = data[chatId].some(u => u.userId === userId);
            data[chatId] = data[chatId].filter(u => u.userId !== userId);
            fs.writeFileSync(MUTE_FILE, JSON.stringify(data, null, 2));
            return { success: true, wasMuted };
        }
        return { success: true, wasMuted: false };
    } catch {
        return { success: false, wasMuted: false };
    }
}

async function getMuteInfo(chatId, userId) {
    try {
        const data = JSON.parse(fs.readFileSync(MUTE_FILE, 'utf8'));
        const mutedUsers = data[chatId] || [];
        return mutedUsers.find(u => u.userId === userId);
    } catch {
        return null;
    }
}

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

// ============================================================
// MAIN COMMAND
// ============================================================

export default {
    name: 'unmute',
    description: 'Unmute a previously muted user',
    icon: '🔊',
    alias: ['unsilence', 'unshutup', 'umute'],
    category: 'group',
    groupOnly: true,
    
    async execute(sock, msg, args, currentPrefix, { isOwner, jidManager }) {
        const chatId = msg.key.remoteJid;
        const senderId = msg.key.participant || chatId;
        
        const groupCheck = isGroup(chatId);
        if (!groupCheck.isGroup) {
            await sendStyledMessage(sock, chatId, `╭──❍「 *🔊 UNMUTE* 」❍
├ ❌ This command only works in groups!
╰──────❍`, [], msg);
            return;
        }
        
        const ownerCheck = await isOwner(senderId, jidManager);
        const adminCheck = await isAdmin(sock, chatId, senderId);
        const isAuthorized = ownerCheck.isOwner || adminCheck.isSenderAdmin;
        
        if (!isAuthorized) {
            await sendStyledMessage(sock, chatId, `╭──❍「 *🔊 UNMUTE* 」❍
├ 👤 *User* : @${senderId.split('@')[0]}
├ ❌ *Error* : Only admins can use this command!
╰──────❍`, [senderId], msg);
            return;
        }
        
        // Get target using reply, tag, or number
        let targetId = getTargetId(msg, args);
        
        if (!targetId) {
            const helpMsg = `╭──❍「 *🔊 UNMUTE COMMAND* 」❍
├ 📝 *Ways to unmute* :
│
│ 1️⃣ *Reply to message*
│    ${currentPrefix}unmute
│
│ 2️⃣ *Tag user*
│    ${currentPrefix}unmute @user
│
│ 3️⃣ *Type number*
│    ${currentPrefix}unmute 255712345678
│
╰──────❍

▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`;
            await sendStyledMessage(sock, chatId, helpMsg, [], msg);
            return;
        }
        
        const now = moment().tz('Africa/Dar_es_Salaam');
        
        // Get mute info before removing
        const muteInfo = await getMuteInfo(chatId, targetId);
        
        if (!muteInfo) {
            await sendStyledMessage(sock, chatId, `╭──❍「 *🔊 UNMUTE* 」❍
├ ⚠️ @${targetId.split('@')[0]} is not muted
├ 📝 Nothing to unmute
╰──────❍`, [targetId], msg);
            return;
        }
        
        // Remove from muted list
        const result = await removeMutedUser(chatId, targetId);
        
        if (!result.success) {
            await sendStyledMessage(sock, chatId, `╭──❍「 *🔊 UNMUTE* 」❍
├ ❌ Failed to unmute user
╰──────❍`, [], msg);
            return;
        }
        
        // Send unmute confirmation
        await sendStyledMessage(sock, chatId, `╭──❍「 *🔊 USER UNMUTED* 」❍
├ 👤 *User* : @${targetId.split('@')[0]}
├ 📝 *Reason* : ${muteInfo.reason || 'No reason recorded'}
├ ⏱️ *Original Duration* : ${muteInfo.duration || 'Unknown'}
├ 👑 *Unmuted By* : @${senderId.split('@')[0]}
├ 📅 *Date* : ${now.format('DD/MM/YYYY')}
├ ⏰ *Time* : ${now.format('HH:mm:ss')} EAT
╰──────❍

_📌 User can now send messages again_
▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`, [targetId, senderId], msg);
        
        // Notify the unmuted user
        try {
            const notifyMsg = `╭──❍「 *🔊 MUTE LIFTED* 」❍
├ ✅ *You have been unmuted*
├ 📝 *Original Reason* : ${muteInfo.reason || 'No reason recorded'}
├ ⏱️ *Original Duration* : ${muteInfo.duration || 'Unknown'}
├ 👑 *Unmuted By* : Admin
╰──────❍

_📌 You can now send messages in the group again_
▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`;
            await sock.sendMessage(targetId, { text: notifyMsg });
        } catch (e) {
            console.log('Could not notify user:', e.message);
        }
    }
};

export { removeMutedUser };