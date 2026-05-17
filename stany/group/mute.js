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

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(MUTE_FILE)) fs.writeFileSync(MUTE_FILE, JSON.stringify({}, null, 2));

// ============================================================
// GET TARGET USER ID (Reply, Tag, or Number)
// ============================================================

function getTargetId(msg, args) {
    const quotedMsg = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    if (quotedMsg) {
        const quotedParticipant = msg.message.extendedTextMessage.contextInfo.participant;
        if (quotedParticipant) return quotedParticipant;
        if (quotedMsg.key?.participant) return quotedMsg.key.participant;
        if (quotedMsg.key?.remoteJid) return quotedMsg.key.remoteJid;
    }
    
    if (msg.message?.extendedTextMessage?.contextInfo?.mentionedJid) {
        const mentioned = msg.message.extendedTextMessage.contextInfo.mentionedJid[0];
        if (mentioned) return mentioned;
    }
    
    const number = args[0]?.trim();
    if (number && number.match(/^[0-9]{10,15}$/)) {
        return `${number}@s.whatsapp.net`;
    }
    
    return null;
}

// ============================================================
// MUTE FUNCTIONS
// ============================================================

async function getMutedUsers(chatId) {
    try {
        const data = JSON.parse(fs.readFileSync(MUTE_FILE, 'utf8'));
        return data[chatId] || [];
    } catch {
        return [];
    }
}

async function addMutedUser(chatId, userId, reason, duration, mutedBy, durationUnit = 'minutes') {
    try {
        const data = JSON.parse(fs.readFileSync(MUTE_FILE, 'utf8'));
        if (!data[chatId]) data[chatId] = [];
        
        let expiresAt = null;
        let durationText = '';
        
        if (duration && duration > 0) {
            const now = new Date();
            if (durationUnit === 'minutes') {
                expiresAt = new Date(now.getTime() + duration * 60000);
                durationText = `${duration} minute(s)`;
            } else if (durationUnit === 'hours') {
                expiresAt = new Date(now.getTime() + duration * 3600000);
                durationText = `${duration} hour(s)`;
            } else if (durationUnit === 'days') {
                expiresAt = new Date(now.getTime() + duration * 86400000);
                durationText = `${duration} day(s)`;
            }
        }
        
        data[chatId].push({
            userId: userId,
            reason: reason,
            mutedBy: mutedBy,
            mutedAt: new Date().toISOString(),
            expiresAt: expiresAt ? expiresAt.toISOString() : null,
            duration: durationText || 'Permanent'
        });
        fs.writeFileSync(MUTE_FILE, JSON.stringify(data, null, 2));
        return { success: true, expiresAt, durationText };
    } catch {
        return { success: false };
    }
}

async function removeMutedUser(chatId, userId) {
    try {
        const data = JSON.parse(fs.readFileSync(MUTE_FILE, 'utf8'));
        if (data[chatId]) {
            data[chatId] = data[chatId].filter(u => u.userId !== userId);
            fs.writeFileSync(MUTE_FILE, JSON.stringify(data, null, 2));
        }
        return true;
    } catch {
        return false;
    }
}

async function isUserMuted(chatId, userId) {
    try {
        const data = JSON.parse(fs.readFileSync(MUTE_FILE, 'utf8'));
        const mutedUsers = data[chatId] || [];
        const muted = mutedUsers.find(u => u.userId === userId);
        
        if (!muted) return false;
        
        if (muted.expiresAt) {
            const expiresAt = new Date(muted.expiresAt);
            if (expiresAt < new Date()) {
                await removeMutedUser(chatId, userId);
                return false;
            }
        }
        return true;
    } catch {
        return false;
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

// ============================================================
// MESSAGE HANDLER (Delete muted user messages)
// ============================================================

export async function handleMutedMessages(sock, chatId, senderId, message) {
    try {
        const isMuted = await isUserMuted(chatId, senderId);
        if (!isMuted) return false;
        
        const muteInfo = await getMuteInfo(chatId, senderId);
        
        try {
            await sock.sendMessage(chatId, { delete: message.key });
        } catch (e) {}
        
        let timeLeft = '';
        if (muteInfo?.expiresAt) {
            const expiresAt = new Date(muteInfo.expiresAt);
            const now = new Date();
            const diffMs = expiresAt - now;
            const diffMins = Math.ceil(diffMs / 60000);
            const diffHours = Math.ceil(diffMs / 3600000);
            const diffDays = Math.ceil(diffMs / 86400000);
            
            if (diffDays > 0) timeLeft = `${diffDays} day(s)`;
            else if (diffHours > 0) timeLeft = `${diffHours} hour(s)`;
            else timeLeft = `${diffMins} minute(s)`;
        }
        
        const nowTime = moment().tz('Africa/Dar_es_Salaam');
        
        const muteMsg = `╭──❍「 *🔇 USER MUTED* 」❍
├ 👤 *User* : @${senderId.split('@')[0]}
├ 📝 *Reason* : ${muteInfo?.reason || 'Violating group rules'}
├ ⏰ *Time Left* : ${muteInfo?.expiresAt ? timeLeft : 'Permanent'}
├ 📅 *Date* : ${nowTime.format('DD/MM/YYYY')}
├ ⏰ *Time* : ${nowTime.format('HH:mm:ss')} EAT
╰──────❍

_📌 You cannot send messages until your mute expires_
▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`;
        
        await sock.sendMessage(chatId, {
            text: muteMsg,
            contextInfo: channelInfo.contextInfo,
            mentions: [senderId]
        });
        
        return true;
    } catch (error) {
        return false;
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
    name: 'mute',
    description: 'Mute a user (delete their messages for specified time)',
    icon: '🔇',
    alias: ['silence', 'shutup'],
    category: 'group',
    groupOnly: true,
    
    async execute(sock, msg, args, currentPrefix, { isOwner, jidManager }) {
        const chatId = msg.key.remoteJid;
        const senderId = msg.key.participant || chatId;
        
        const groupCheck = isGroup(chatId);
        if (!groupCheck.isGroup) {
            await sendStyledMessage(sock, chatId, `╭──❍「 *🔇 MUTE* 」❍\n├ ❌ This command only works in groups!\n╰──────❍`, [], msg);
            return;
        }
        
        const ownerCheck = await isOwner(senderId, jidManager);
        const adminCheck = await isAdmin(sock, chatId, senderId);
        const isAuthorized = ownerCheck.isOwner || adminCheck.isSenderAdmin;
        
        if (!isAuthorized) {
            await sendStyledMessage(sock, chatId, `╭──❍「 *🔇 MUTE* 」❍
├ 👤 *User* : @${senderId.split('@')[0]}
├ ❌ *Error* : Only admins can use this command!
╰──────❍`, [senderId], msg);
            return;
        }
        
        // Get target using reply, tag, or number
        let targetId = getTargetId(msg, args);
        
        if (!targetId) {
            const helpMsg = `╭──❍「 *🔇 MUTE COMMAND* 」❍
├ 📝 *Ways to mute* :
│
│ 1️⃣ *Reply to message*
│    ${currentPrefix}mute 5m Spamming
│
│ 2️⃣ *Tag user*
│    ${currentPrefix}mute @user 5m reason
│
│ 3️⃣ *Type number*
│    ${currentPrefix}mute 255712345678 5m reason
│
├─┬────❍
╭─┴─❍「 *⏱️ DURATIONS* 」❍
│ 🔹 5m = 5 minutes
│ 🔹 2h = 2 hours
│ 🔹 1d = 1 day
│ 🔹 permanent = Forever
╰──────❍
╭─┴─❍「 *📝 EXAMPLES* 」❍
│ 🔧 ${currentPrefix}mute 5m Spamming
│ 🔧 ${currentPrefix}mute @user 2h Bad words
│ 🔧 ${currentPrefix}mute permanent Abuse
╰──────❍

▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`;
            await sendStyledMessage(sock, chatId, helpMsg, [], msg);
            return;
        }
        
        // Check if trying to mute owner
        const ownerNumber = jidManager?.owner?.cleanNumber;
        const targetNumber = targetId.split('@')[0];
        if (targetNumber === ownerNumber) {
            await sendStyledMessage(sock, chatId, `╭──❍「 *🔇 MUTE* 」❍
├ ❌ Cannot mute the bot owner!
╰──────❍`, [], msg);
            return;
        }
        
        // Check if trying to mute self
        if (targetId === senderId) {
            await sendStyledMessage(sock, chatId, `╭──❍「 *🔇 MUTE* 」❍
├ ❌ You cannot mute yourself!
╰──────❍`, [], msg);
            return;
        }
        
        // Parse duration and reason
        let duration = 0;
        let durationUnit = 'minutes';
        let durationText = '';
        let reasonStartIndex = 0;
        
        let durationArg = '';
        for (let i = 0; i < args.length; i++) {
            const arg = args[i].toLowerCase();
            if (arg.match(/^\d+[mhd]$/) || arg === 'permanent') {
                durationArg = arg;
                reasonStartIndex = i + 1;
                break;
            }
        }
        
        if (durationArg) {
            if (durationArg === 'permanent') {
                duration = 0;
                durationText = 'Permanent';
            } else {
                const match = durationArg.match(/(\d+)([mhd])/);
                if (match) {
                    const value = parseInt(match[1]);
                    const unit = match[2];
                    if (unit === 'm') {
                        duration = value;
                        durationUnit = 'minutes';
                        durationText = `${value} minute(s)`;
                    } else if (unit === 'h') {
                        duration = value;
                        durationUnit = 'hours';
                        durationText = `${value} hour(s)`;
                    } else if (unit === 'd') {
                        duration = value;
                        durationUnit = 'days';
                        durationText = `${value} day(s)`;
                    }
                }
            }
        } else {
            duration = 5;
            durationUnit = 'minutes';
            durationText = '5 minutes (default)';
        }
        
        const reason = args.slice(reasonStartIndex).join(' ') || 'Violating group rules';
        const now = moment().tz('Africa/Dar_es_Salaam');
        
        // Check if already muted
        const alreadyMuted = await isUserMuted(chatId, targetId);
        if (alreadyMuted) {
            await sendStyledMessage(sock, chatId, `╭──❍「 *🔇 MUTE* 」❍
├ ⚠️ @${targetId.split('@')[0]} is already muted
├ 📝 Use ${currentPrefix}unmute first
╰──────❍`, [targetId], msg);
            return;
        }
        
        const result = await addMutedUser(chatId, targetId, reason, duration, senderId, durationUnit);
        
        if (!result.success) {
            await sendStyledMessage(sock, chatId, `╭──❍「 *🔇 MUTE* 」❍
├ ❌ Failed to mute user
╰──────❍`, [], msg);
            return;
        }
        
        let expiryText = '';
        if (result.expiresAt) {
            const expiryTime = moment(result.expiresAt).tz('Africa/Dar_es_Salaam');
            expiryText = `├ ⏰ *Expires* : ${expiryTime.format('HH:mm:ss DD/MM/YYYY')}`;
        } else {
            expiryText = `├ ⏰ *Expires* : Never (Permanent)`;
        }
        
        await sendStyledMessage(sock, chatId, `╭──❍「 *🔇 USER MUTED* 」❍
├ 👤 *User* : @${targetId.split('@')[0]}
├ 📝 *Reason* : ${reason}
├ ⏱️ *Duration* : ${durationText}
${expiryText}
├ 👑 *Muted By* : @${senderId.split('@')[0]}
├ 📅 *Date* : ${now.format('DD/MM/YYYY')}
├ ⏰ *Time* : ${now.format('HH:mm:ss')} EAT
╰──────❍

_📌 Muted user cannot send messages until mute expires_
▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`, [targetId, senderId], msg);
        
        // Notify the muted user (menu.js style)
        try {
            let timeInfo = '';
            if (result.expiresAt) {
                const expiryTime = moment(result.expiresAt).tz('Africa/Dar_es_Salaam');
                timeInfo = `├ ⏰ *Expires* : ${expiryTime.format('HH:mm:ss DD/MM/YYYY')}`;
            } else {
                timeInfo = `├ ⏰ *Expires* : Never (Permanent)`;
            }
            
            const notifyMsg = `╭──❍「 *🔇 MUTED NOTIFICATION* 」❍
├ 👤 *You have been muted*
├ 📝 *Reason* : ${reason}
├ ⏱️ *Duration* : ${durationText}
${timeInfo}
├ 👑 *Muted By* : Admin
╰──────❍

_📌 You cannot send messages in the group until mute expires_
▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`;
            await sock.sendMessage(targetId, { text: notifyMsg });
        } catch (e) {}
        
        // Schedule unmute notification
        if (result.expiresAt) {
            const expiresAt = new Date(result.expiresAt);
            const timeUntilExpiry = expiresAt - new Date();
            if (timeUntilExpiry > 0) {
                setTimeout(async () => {
                    const stillMuted = await isUserMuted(chatId, targetId);
                    if (!stillMuted) {
                        const nowTime = moment().tz('Africa/Dar_es_Salaam');
                        await sendStyledMessage(sock, chatId, `╭──❍「 *🔊 MUTE EXPIRED* 」❍
├ 👤 @${targetId.split('@')[0]}
├ ✅ Your mute period has ended
├ 📅 *Date* : ${nowTime.format('DD/MM/YYYY')}
├ ⏰ *Time* : ${nowTime.format('HH:mm:ss')} EAT
╰──────❍

_📌 User can now send messages again_
▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`, [targetId]);
                        
                        try {
                            const notifyMsg = `╭──❍「 *🔊 MUTE EXPIRED* 」❍
├ ✅ Your mute period has ended
├ 📝 You can now send messages again
╰──────❍

_📌 Welcome back!_
▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`;
                            await sock.sendMessage(targetId, { text: notifyMsg });
                        } catch (e) {}
                    }
                }, timeUntilExpiry);
            }
        }
    }
};

export { handleMutedMessages, isUserMuted, removeMutedUser };