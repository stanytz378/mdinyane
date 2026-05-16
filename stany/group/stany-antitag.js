/*****************************************************************************
 *                                                                           *
 *                     Developed By STANY TZ                                 *
 *                                                                           *
 *  🌐  GitHub   : https://github.com/Stanytz378                             *
 *  ▶️  YouTube  : https://youtube.com/@STANYTZ                              *
 *  💬  WhatsApp : https://whatsapp.com/channel/0029Vb7fzu4EwEjmsD4Tzs1p     *
 *                                                                           *
 *    © 2026 STANY TZ. All rights reserved.                                 *
 *                                                                           *
 *****************************************************************************/

import fs from 'fs';
import path from 'path';
import moment from 'moment-timezone';
import { fileURLToPath } from 'url';
import { channelInfo, botImagePath } from '../../stanytz/messageConfig.js';
import isAdmin from '../../stanymain/isAdmin.js';
import isOwner from '../../stanymain/isOwner.js';
import isGroup from '../../stanymain/isGroup.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Data directory
const DATA_DIR = path.join(process.cwd(), 'stanydata');
const ANTITAG_FILE = path.join(DATA_DIR, 'antitag_settings.json');
const WARNINGS_FILE = path.join(DATA_DIR, 'antitag_warnings.json');

if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

// ============================================================
// QUOTES
// ============================================================
const QUOTES = [
    "I'm not lazy, I'm just on my energy saving mode.",
    "Life is short, smile while you still have teeth.",
    "Tagging everyone? Not on my watch! 👀",
    "Anti-tag is active! 🛡️",
    "Mass tagging is not allowed here!",
    "Respect the group, don't spam tags!",
    "Tagging all members? That's a warning!",
    "Keep the group clean, no mass tagging!"
];

const getRandomQuote = () => QUOTES[Math.floor(Math.random() * QUOTES.length)];

// ============================================================
// DATABASE FUNCTIONS
// ============================================================

async function loadDatabase(filePath, defaultData = {}) {
    try {
        if (fs.existsSync(filePath)) {
            return JSON.parse(fs.readFileSync(filePath, 'utf8'));
        }
        return defaultData;
    } catch {
        return defaultData;
    }
}

async function saveDatabase(filePath, data) {
    try {
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
        return true;
    } catch {
        return false;
    }
}

async function setAntitag(chatId, action) {
    const settings = await loadDatabase(ANTITAG_FILE, {});
    settings[chatId] = {
        enabled: true,
        action: action,
        updatedAt: new Date().toISOString()
    };
    await saveDatabase(ANTITAG_FILE, settings);
    return true;
}

async function getAntitag(chatId) {
    const settings = await loadDatabase(ANTITAG_FILE, {});
    return settings[chatId] || { enabled: false, action: null };
}

async function removeAntitag(chatId) {
    const settings = await loadDatabase(ANTITAG_FILE, {});
    delete settings[chatId];
    await saveDatabase(ANTITAG_FILE, settings);
    return true;
}

async function getWarnings(chatId, userId) {
    const warns = await loadDatabase(WARNINGS_FILE, {});
    return warns[chatId]?.[userId] || 0;
}

async function addWarning(chatId, userId) {
    const warns = await loadDatabase(WARNINGS_FILE, {});
    if (!warns[chatId]) warns[chatId] = {};
    warns[chatId][userId] = (warns[chatId][userId] || 0) + 1;
    await saveDatabase(WARNINGS_FILE, warns);
    return warns[chatId][userId];
}

async function resetWarnings(chatId, userId) {
    const warns = await loadDatabase(WARNINGS_FILE, {});
    if (warns[chatId]) {
        delete warns[chatId][userId];
        await saveDatabase(WARNINGS_FILE, warns);
    }
}

// ============================================================
// SEND WITH IMAGE AND FORWARDED MARK
// ============================================================

async function sendStyledMessage(sock, chatId, text, mentions = [], quoted = null) {
    try {
        const imageFullPath = path.join(process.cwd(), botImagePath);
        const imageExists = fs.existsSync(imageFullPath);
        
        if (imageExists) {
            await sock.sendMessage(chatId, {
                image: fs.readFileSync(imageFullPath),
                caption: text,
                contextInfo: channelInfo.contextInfo,
                mentions: mentions
            }, { quoted: quoted });
        } else {
            await sock.sendMessage(chatId, {
                text: text,
                contextInfo: channelInfo.contextInfo,
                mentions: mentions
            }, { quoted: quoted });
        }
    } catch (error) {
        await sock.sendMessage(chatId, {
            text: text,
            mentions: mentions
        }, { quoted: quoted });
    }
}

// ============================================================
// TAG DETECTION HANDLER
// ============================================================

export async function handleTagDetection(sock, chatId, message, senderId) {
    try {
        // Check if it's a group
        const groupCheck = isGroup(chatId);
        if (!groupCheck.isGroup) return;
        
        // Get antitag settings
        const antitagSetting = await getAntitag(chatId);
        if (!antitagSetting || !antitagSetting.enabled) return;
        
        // Get mentioned JIDs
        const mentionedJids = message.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
        const messageText = (message.message?.conversation ||
            message.message?.extendedTextMessage?.text ||
            message.message?.imageMessage?.caption ||
            message.message?.videoMessage?.caption ||
            '');
        
        const textMentions = messageText.match(/@[\d+\s\-()~.]+/g) || [];
        const numericMentions = messageText.match(/@\d{10,}/g) || [];
        
        // Process numeric mentions
        const uniqueNumericMentions = new Set();
        numericMentions.forEach((mention) => {
            const numMatch = mention.match(/@(\d+)/);
            if (numMatch) uniqueNumericMentions.add(numMatch[1]);
        });
        
        const mentionedJidCount = mentionedJids.length;
        const numericMentionCount = uniqueNumericMentions.size;
        const totalMentions = Math.max(mentionedJidCount, numericMentionCount);
        
        // Check if mass tagging detected
        if (totalMentions >= 3) {
            const groupMetadata = await sock.groupMetadata(chatId);
            const participants = groupMetadata.participants || [];
            const mentionThreshold = Math.ceil(participants.length * 0.5);
            const hasManyNumericMentions = numericMentionCount >= 10 ||
                (numericMentionCount >= 5 && numericMentionCount >= mentionThreshold);
            
            if (totalMentions >= mentionThreshold || hasManyNumericMentions) {
                const action = antitagSetting.action || 'delete';
                const randomQuote = getRandomQuote();
                
                // Delete the message
                try {
                    await sock.sendMessage(chatId, { delete: message.key });
                } catch {}
                
                // KICK ACTION
                if (action === 'kick') {
                    // Check if bot is admin
                    const adminCheck = await isAdmin(sock, chatId, sock.user.id);
                    if (!adminCheck.isBotAdmin) {
                        const noAdminMsg = `╭──❍「 *🏷️ ANTITAG PROTECTION* 」❍
├ 👤 *User* : @${senderId.split('@')[0]}
├ 🏷️ *Action* : Mass tag detected
├ ❌ *Error* : Make me admin to kick!
╰──────❍

✨ *"${randomQuote}"* ✨

_📌 Please promote bot to admin for full protection_
▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`;
                        await sendStyledMessage(sock, chatId, noAdminMsg, [senderId], message);
                        return;
                    }
                    
                    try {
                        await sock.groupParticipantsUpdate(chatId, [senderId], "remove");
                        const kickMsg = `╭──❍「 *🏷️ ANTITAG PROTECTION* 」❍
├ 👤 *User* : @${senderId.split('@')[0]}
├ 🏷️ *Action* : Mass tag detected
├ 🚫 *Result* : KICKED
╰──────❍

✨ *"${randomQuote}"* ✨

_📌 Mass tagging members is not allowed in this group_
▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`;
                        await sendStyledMessage(sock, chatId, kickMsg, [senderId], message);
                    } catch (error) {
                        const kickFailMsg = `╭──❍「 *🏷️ ANTITAG PROTECTION* 」❍
├ 👤 *User* : @${senderId.split('@')[0]}
├ 🏷️ *Action* : Mass tag detected
├ ❌ *Error* : Failed to kick user
╰──────❍

✨ *"${randomQuote}"* ✨

_📌 Check my permissions and try again_
▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`;
                        await sendStyledMessage(sock, chatId, kickFailMsg, [senderId], message);
                    }
                    return;
                }
                
                // DELETE ACTION (default)
                if (action === 'delete') {
                    const deleteMsg = `╭──❍「 *🏷️ ANTITAG PROTECTION* 」❍
├ 👤 *User* : @${senderId.split('@')[0]}
├ 🏷️ *Action* : Mass tag detected
├ 🗑️ *Result* : Message deleted
╰──────❍

✨ *"${randomQuote}"* ✨

_📌 Mass tagging members is not allowed in this group_
▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`;
                    await sendStyledMessage(sock, chatId, deleteMsg, [senderId], message);
                }
            }
        }
    } catch (error) {
        console.error('Error in tag detection:', error);
    }
}

// ============================================================
// MAIN COMMAND
// ============================================================

export default {
    name: 'antitag',
    description: 'Prevent users from tagging all members',
    icon: '🏷️',
    alias: ['at', 'tagblock', 'antitagall'],
    category: 'group',
    groupOnly: true,
    
    async execute(sock, msg, args, currentPrefix, { isOwner, jidManager }) {
        
        const chatId = msg.key.remoteJid;
        const senderId = msg.key.participant || chatId;
        
        // Check if it's a group
        const groupCheck = isGroup(chatId);
        if (!groupCheck.isGroup) {
            const notGroupMsg = `╭──❍「 *🏷️ ANTITAG PROTECTION* 」❍
├ ❌ *Error* : This command only works in groups!
╰──────❍

▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`;
            await sendStyledMessage(sock, chatId, notGroupMsg, [], msg);
            return;
        }
        
        // Check if sender is owner or admin
        const ownerCheck = await isOwner(senderId, jidManager);
        const adminCheck = await isAdmin(sock, chatId, senderId);
        const isAuthorized = ownerCheck.isOwner || adminCheck.isSenderAdmin;
        
        if (!isAuthorized) {
            const notAuthMsg = `╭──❍「 *🏷️ ANTITAG PROTECTION* 」❍
├ 👤 *User* : @${senderId.split('@')[0]}
├ ❌ *Error* : Only admins can use this command!
╰──────❍

_📌 Contact group admin for assistance_
▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`;
            await sendStyledMessage(sock, chatId, notAuthMsg, [senderId], msg);
            return;
        }
        
        // Get current time
        const now = moment().tz('Africa/Dar_es_Salaam');
        const date = now.format('DD/MM/YYYY');
        const day = now.format('dddd');
        const time = now.format('HH:mm:ss');
        
        const config = await getAntitag(chatId);
        const randomQuote = getRandomQuote();
        const botName = 'MDINYANE';
        
        const action = args[0]?.toLowerCase();
        
        // ========== SHOW STATUS (default) ==========
        if (!action) {
            const statusIcon = config.enabled ? '✅' : '❌';
            const actionText = (config.action || 'delete').toUpperCase();
            
            const statusMsg = `╭──❍「 *🏷️ ANTITAG PROTECTION* 」❍
├ 📵 *Status* : ${statusIcon} ${config.enabled ? 'ENABLED' : 'DISABLED'}
├ ⚡ *Action* : ${actionText}
╰─┬────❍
╭─┴─❍「 *📋 COMMANDS* 」❍
│ 🔧 ${currentPrefix}antitag on - Enable protection
│ 🔧 ${currentPrefix}antitag off - Disable protection
│ 🔧 ${currentPrefix}antitag delete - Delete mass tags
│ 🔧 ${currentPrefix}antitag kick - Kick on mass tag
╰──────❍
╭─┴─❍「 *📊 INFO* 」❍
├ 📅 *Date* : ${date}
├ 📆 *Day* : ${day}
├ ⏰ *Time* : ${time} EAT
├ 🏷️ *Threshold* : 50% of members or 10+ mentions
├ 👑 *Exempt* : Admins & Owner
╰──────❍

✨ *"${randomQuote}"* ✨

_📌 Admins and Owner are EXEMPT from antitag_
▰▰▰ *©️ ${botName.toUpperCase()} BY STANY TZ* ▰▰▰`;
            await sendStyledMessage(sock, chatId, statusMsg, [], msg);
            return;
        }
        
        // ========== ENABLE ==========
        if (action === 'on') {
            if (config.enabled) {
                const alreadyMsg = `╭──❍「 *🏷️ ANTITAG PROTECTION* 」❍
├ ⚠️ *Status* : Already ENABLED
├ 📝 *Action* : ${(config.action || 'delete').toUpperCase()}
╰──────❍

▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`;
                await sendStyledMessage(sock, chatId, alreadyMsg, [], msg);
                return;
            }
            await setAntitag(chatId, 'delete');
            const successMsg = `╭──❍「 *🏷️ ANTITAG PROTECTION* 」❍
├ ✅ *Status* : ENABLED
├ ⚡ *Action* : DELETE
├ 👑 *Exempt* : Admins & Owner
╰──────❍

✨ *"${randomQuote}"* ✨

_📌 Mass tagging will now be detected and deleted_
▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`;
            await sendStyledMessage(sock, chatId, successMsg, [], msg);
            return;
        }
        
        // ========== DISABLE ==========
        if (action === 'off') {
            await removeAntitag(chatId);
            const disableMsg = `╭──❍「 *🏷️ ANTITAG PROTECTION* 」❍
├ ❌ *Status* : DISABLED
├ 📝 *Note* : Mass tagging will be allowed
╰──────❍

▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`;
            await sendStyledMessage(sock, chatId, disableMsg, [], msg);
            return;
        }
        
        // ========== SET ACTION ==========
        if (action === 'delete') {
            await setAntitag(chatId, 'delete');
            const deleteSetMsg = `╭──❍「 *🏷️ ANTITAG PROTECTION* 」❍
├ ✅ *Action* : Set to DELETE
├ 📝 *Description* : Delete mass tag messages
╰──────❍

▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`;
            await sendStyledMessage(sock, chatId, deleteSetMsg, [], msg);
            return;
        }
        
        if (action === 'kick') {
            await setAntitag(chatId, 'kick');
            const kickSetMsg = `╭──❍「 *🏷️ ANTITAG PROTECTION* 」❍
├ ✅ *Action* : Set to KICK
├ 📝 *Description* : Kick users who mass tag
╰──────❍

▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`;
            await sendStyledMessage(sock, chatId, kickSetMsg, [], msg);
            return;
        }
        
        // ========== INVALID COMMAND ==========
        const invalidMsg = `╭──❍「 *🏷️ ANTITAG PROTECTION* 」❍
├ ❌ *Invalid command* : ${action}
├ 📝 *Use* : ${currentPrefix}antitag for help
╰──────❍

▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`;
        await sendStyledMessage(sock, chatId, invalidMsg, [], msg);
    }
};

// Export for use in index.js
export { setAntitag, getAntitag, removeAntitag };