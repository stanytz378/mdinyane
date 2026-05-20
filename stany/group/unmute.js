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
const UNMUTE_LOG_FILE = path.join(DATA_DIR, 'unmute_log.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

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
// DATABASE FUNCTIONS
// ============================================================

async function removeMutedUser(chatId, userId) {
    try {
        if (!fs.existsSync(MUTE_FILE)) {
            fs.writeFileSync(MUTE_FILE, JSON.stringify({}, null, 2));
            return { success: true, wasMuted: false };
        }
        
        const data = JSON.parse(fs.readFileSync(MUTE_FILE, 'utf8'));
        let wasMuted = false;
        
        if (data[chatId]) {
            wasMuted = data[chatId].some(u => u.userId === userId);
            data[chatId] = data[chatId].filter(u => u.userId !== userId);
            fs.writeFileSync(MUTE_FILE, JSON.stringify(data, null, 2));
        }
        return { success: true, wasMuted };
    } catch (error) {
        console.error('Error removing muted user:', error);
        return { success: false, wasMuted: false };
    }
}

async function getMuteInfo(chatId, userId) {
    try {
        if (!fs.existsSync(MUTE_FILE)) return null;
        const data = JSON.parse(fs.readFileSync(MUTE_FILE, 'utf8'));
        const mutedUsers = data[chatId] || [];
        return mutedUsers.find(u => u.userId === userId);
    } catch {
        return null;
    }
}

async function getAllMutedUsers(chatId) {
    try {
        if (!fs.existsSync(MUTE_FILE)) return [];
        const data = JSON.parse(fs.readFileSync(MUTE_FILE, 'utf8'));
        const mutedUsers = data[chatId] || [];
        const validUsers = [];
        
        for (const user of mutedUsers) {
            if (user.expiresAt) {
                const expiresAt = new Date(user.expiresAt);
                if (expiresAt > new Date()) {
                    validUsers.push(user);
                } else {
                    // Clean up expired mutes
                    await removeMutedUser(chatId, user.userId);
                }
            } else {
                validUsers.push(user);
            }
        }
        return validUsers;
    } catch {
        return [];
    }
}

async function logUnmute(chatId, userId, mutedBy, unmutedBy, reason, originalDuration) {
    try {
        let logs = {};
        if (fs.existsSync(UNMUTE_LOG_FILE)) {
            logs = JSON.parse(fs.readFileSync(UNMUTE_LOG_FILE, 'utf8'));
        }
        
        if (!logs[chatId]) logs[chatId] = [];
        
        logs[chatId].push({
            userId: userId,
            mutedBy: mutedBy,
            unmutedBy: unmutedBy,
            reason: reason,
            originalDuration: originalDuration,
            unmutedAt: new Date().toISOString()
        });
        
        // Keep only last 100 logs per group
        if (logs[chatId].length > 100) {
            logs[chatId] = logs[chatId].slice(-100);
        }
        
        fs.writeFileSync(UNMUTE_LOG_FILE, JSON.stringify(logs, null, 2));
    } catch (error) {
        console.error('Error logging unmute:', error);
    }
}

// ============================================================
// SEND MESSAGE FUNCTION
// ============================================================

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
    alias: ['unsilence', 'unshutup', 'umute', 'unmuted'],
    category: 'group',
    groupOnly: true,
    
    async execute(sock, msg, args, currentPrefix, { isOwner, jidManager }) {
        const chatId = msg.key.remoteJid;
        const senderId = msg.key.participant || chatId;
        
        // Check if it's a group
        const groupCheck = isGroup(chatId);
        if (!groupCheck.isGroup) {
            await sendStyledMessage(sock, chatId, `╭──❍「 *🔊 UNMUTE* 」❍
├ ❌ This command only works in groups!
╰──────❍`, [], msg);
            return;
        }
        
        // Check authorization
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
        
        const subCommand = args[0]?.toLowerCase();
        
        // ========== LIST MUTED USERS ==========
        if (subCommand === 'list' || subCommand === 'muted' || subCommand === 'all') {
            const mutedUsers = await getAllMutedUsers(chatId);
            
            if (mutedUsers.length === 0) {
                await sendStyledMessage(sock, chatId, `╭──❍「 *🔊 MUTED USERS* 」❍
├ 📝 No muted users in this group
╰──────❍

▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`, [], msg);
                return;
            }
            
            let mutedList = '';
            for (let i = 0; i < mutedUsers.length; i++) {
                const user = mutedUsers[i];
                const userNum = user.userId.split('@')[0];
                mutedList += `├ ${i + 1}. @${userNum} - ${user.duration}\n`;
                mutedList += `│    └─ ${user.reason.substring(0, 50)}\n`;
            }
            
            await sendStyledMessage(sock, chatId, `╭──❍「 *🔊 MUTED USERS* 」❍
${mutedList}╰──────❍

_📌 Use ${currentPrefix}unmute @user to unmute_
▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`, mutedUsers.map(u => u.userId), msg);
            return;
        }
        
        // ========== HELP COMMAND ==========
        if (subCommand === 'help') {
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
├─┬────❍
╭─┴─❍「 *📋 OTHER COMMANDS* 」❍
│ 🔧 ${currentPrefix}unmute list - Show muted users
│ 🔧 ${currentPrefix}unmute all - Unmute all users
│ 🔧 ${currentPrefix}unmute help - Show this help
╰──────❍

▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`;
            await sendStyledMessage(sock, chatId, helpMsg, [], msg);
            return;
        }
        
        // ========== UNMUTE ALL USERS ==========
        if (subCommand === 'all') {
            const mutedUsers = await getAllMutedUsers(chatId);
            
            if (mutedUsers.length === 0) {
                await sendStyledMessage(sock, chatId, `╭──❍「 *🔊 UNMUTE ALL* 」❍
├ 📝 No muted users to unmute
╰──────❍`, [], msg);
                return;
            }
            
            let unmutedCount = 0;
            for (const user of mutedUsers) {
                await removeMutedUser(chatId, user.userId);
                unmutedCount++;
                
                // Notify each user
                try {
                    const notifyMsg = `╭──❍「 *🔊 MUTE LIFTED* 」❍
├ ✅ *You have been unmuted*
├ 📝 *Original Reason* : ${user.reason || 'No reason recorded'}
├ 👑 *Unmuted By* : Admin (Bulk unmute)
╰──────❍

_📌 You can now send messages in the group again_
▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`;
                    await sock.sendMessage(user.userId, { text: notifyMsg });
                } catch (e) {}
            }
            
            const now = moment().tz('Africa/Dar_es_Salaam');
            await sendStyledMessage(sock, chatId, `╭──❍「 *🔊 BULK UNMUTE* 」❍
├ ✅ ${unmutedCount} user(s) unmuted
├ 👑 *Unmuted By* : @${senderId.split('@')[0]}
├ 📅 *Date* : ${now.format('DD/MM/YYYY')}
├ ⏰ *Time* : ${now.format('HH:mm:ss')} EAT
╰──────❍

_📌 All users can now send messages again_
▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`, [senderId], msg);
            return;
        }
        
        // ========== NORMAL UNMUTE ==========
        let targetId = getTargetId(msg, args);
        
        if (!targetId) {
            const helpMsg = `╭──❍「 *🔊 UNMUTE COMMAND* 」❍
├ 📝 *Usage* : ${currentPrefix}unmute @user
├ 📝 *Or reply to their message* : ${currentPrefix}unmute
│
├─┬────❍
╭─┴─❍「 *📋 OTHER COMMANDS* 」❍
│ 🔧 ${currentPrefix}unmute list - Show muted users
│ 🔧 ${currentPrefix}unmute all - Unmute all users
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
        
        // Log the unmute action
        await logUnmute(chatId, targetId, muteInfo.mutedBy, senderId, muteInfo.reason, muteInfo.duration);
        
        // Format duration for display
        let durationDisplay = muteInfo.duration || 'Unknown';
        if (muteInfo.expiresAt && !muteInfo.duration) {
            const expiresAt = new Date(muteInfo.expiresAt);
            const now = new Date();
            const diffMs = expiresAt - now;
            const diffMins = Math.ceil(diffMs / 60000);
            if (diffMins > 0) {
                durationDisplay = `${diffMins} minutes remaining`;
            } else {
                durationDisplay = 'Expired';
            }
        }
        
        // Send unmute confirmation to group
        await sendStyledMessage(sock, chatId, `╭──❍「 *🔊 USER UNMUTED* 」❍
├ 👤 *User* : @${targetId.split('@')[0]}
├ 📝 *Original Reason* : ${muteInfo.reason || 'No reason recorded'}
├ ⏱️ *Duration* : ${durationDisplay}
├ 👑 *Muted By* : @${muteInfo.mutedBy?.split('@')[0] || 'Unknown'}
├ 👑 *Unmuted By* : @${senderId.split('@')[0]}
├ 📅 *Date* : ${now.format('DD/MM/YYYY')}
├ ⏰ *Time* : ${now.format('HH:mm:ss')} EAT
╰──────❍

_📌 User can now send messages again_
▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`, [targetId, senderId, muteInfo.mutedBy], msg);
        
        // Notify the unmuted user privately
        try {
            let durationText = muteInfo.duration || 'Unknown';
            if (muteInfo.expiresAt && !muteInfo.duration) {
                const expiresAt = new Date(muteInfo.expiresAt);
                const now = new Date();
                const diffMs = expiresAt - now;
                const diffMins = Math.ceil(diffMs / 60000);
                if (diffMins > 0) {
                    durationText = `${diffMins} minutes (early unmute)`;
                }
            }
            
            const notifyMsg = `╭──❍「 *🔊 MUTE LIFTED* 」❍
├ ✅ *You have been unmuted*
├ 📝 *Original Reason* : ${muteInfo.reason || 'No reason recorded'}
├ ⏱️ *Original Duration* : ${durationText}
├ 👑 *Unmuted By* : Admin
├ 📅 *Date* : ${now.format('DD/MM/YYYY')}
├ ⏰ *Time* : ${now.format('HH:mm:ss')} EAT
╰──────❍

_📌 You can now send messages in the group again_
▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`;
            await sock.sendMessage(targetId, { text: notifyMsg });
        } catch (e) {
            console.log('Could not notify user:', e.message);
        }
    }
};

// ============================================================
// EXPORTS
// ============================================================

export { removeMutedUser, getMuteInfo, getAllMutedUsers };