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
import { channelInfo } from '../../stanytz/messageConfig.js';
import isAdmin from '../../stanymain/isAdmin.js';
import isOwner from '../../stanymain/isOwner.js';
import isGroup from '../../stanymain/isGroup.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Data directory
const DATA_DIR = path.join(process.cwd(), 'stanydata');
const ANTITAG_FILE = path.join(DATA_DIR, 'antitag_settings.json');
const WARNINGS_FILE = path.join(DATA_DIR, 'antitag_warnings.json');
const SILENT_MODE_FILE = path.join(DATA_DIR, 'antitag_silent.json');

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
// SILENT MODE FUNCTIONS
// ============================================================

async function getSilentMode(groupId) {
    try {
        if (fs.existsSync(SILENT_MODE_FILE)) {
            const data = JSON.parse(fs.readFileSync(SILENT_MODE_FILE, 'utf8'));
            return data[groupId] || false;
        }
        return false;
    } catch {
        return false;
    }
}

async function setSilentMode(groupId, enabled) {
    try {
        let data = {};
        if (fs.existsSync(SILENT_MODE_FILE)) {
            data = JSON.parse(fs.readFileSync(SILENT_MODE_FILE, 'utf8'));
        }
        data[groupId] = enabled;
        fs.writeFileSync(SILENT_MODE_FILE, JSON.stringify(data, null, 2));
        return true;
    } catch {
        return false;
    }
}

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

async function setAntitag(chatId, action, warnLimit = 3) {
    const settings = await loadDatabase(ANTITAG_FILE, {});
    settings[chatId] = {
        enabled: true,
        action: action,
        warnLimit: warnLimit,
        updatedAt: new Date().toISOString()
    };
    await saveDatabase(ANTITAG_FILE, settings);
    return true;
}

async function getAntitag(chatId) {
    const settings = await loadDatabase(ANTITAG_FILE, {});
    return settings[chatId] || { enabled: false, action: 'delete', warnLimit: 3 };
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
// SEND MESSAGE (TEXT ONLY - NO IMAGE)
// ============================================================

async function sendStyledMessage(sock, chatId, text, mentions = [], quoted = null) {
    try {
        await sock.sendMessage(chatId, {
            text: text,
            contextInfo: channelInfo.contextInfo,
            mentions: mentions
        }, { quoted: quoted });
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
        
        // Check if sender is owner (exempt)
        const ownerCheck = await isOwner(senderId);
        if (ownerCheck.isOwner) return;
        
        // Check if sender is admin (exempt)
        const adminCheck = await isAdmin(sock, chatId, senderId);
        if (adminCheck.isSenderAdmin) return;
        
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
                const warnLimit = antitagSetting.warnLimit || 3;
                const randomQuote = getRandomQuote();
                const isSilent = await getSilentMode(chatId);
                const isBotAdmin = adminCheck.isBotAdmin;
                
                // Delete the message
                try {
                    await sock.sendMessage(chatId, { delete: message.key });
                } catch {}
                
                // ========== KICK ACTION ==========
                if (action === 'kick') {
                    if (!isBotAdmin) {
                        if (!isSilent) {
                            const noAdminMsg = `╭──❍「 *🏷️ ANTITAG PROTECTION* 」❍
├ 👤 *User* : @${senderId.split('@')[0]}
├ 🏷️ *Action* : Mass tag detected
├ ❌ *Error* : Make me admin to kick!
╰──────❍

✨ *"${randomQuote}"* ✨

_📌 Please promote bot to admin for full protection_
▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`;
                            await sendStyledMessage(sock, chatId, noAdminMsg, [senderId], message);
                        }
                        return;
                    }
                    
                    try {
                        await sock.groupParticipantsUpdate(chatId, [senderId], "remove");
                        if (!isSilent) {
                            const kickMsg = `╭──❍「 *🏷️ ANTITAG PROTECTION* 」❍
├ 👤 *User* : @${senderId.split('@')[0]}
├ 🏷️ *Action* : Mass tag detected
├ 🚫 *Result* : KICKED
╰──────❍

✨ *"${randomQuote}"* ✨

_📌 Mass tagging members is not allowed in this group_
▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`;
                            await sendStyledMessage(sock, chatId, kickMsg, [senderId], message);
                        }
                    } catch (error) {
                        if (!isSilent) {
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
                    }
                    return;
                }
                
                // ========== WARN ACTION ==========
                if (action === 'warn') {
                    const warnCount = await addWarning(chatId, senderId);
                    const remaining = warnLimit - warnCount;
                    
                    if (warnCount >= warnLimit) {
                        await resetWarnings(chatId, senderId);
                        if (isBotAdmin) {
                            await sock.groupParticipantsUpdate(chatId, [senderId], "remove");
                            if (!isSilent) {
                                const kickAfterWarnMsg = `╭──❍「 *🏷️ ANTITAG PROTECTION* 」❍
├ 👤 *User* : @${senderId.split('@')[0]}
├ 🏷️ *Action* : Mass tag detected
├ ⚠️ *Warns* : ${warnCount}/${warnLimit}
├ 🚫 *Result* : KICKED (max warns)
╰──────❍

✨ *"${randomQuote}"* ✨

_📌 User has been kicked after ${warnLimit} warnings_
▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`;
                                await sendStyledMessage(sock, chatId, kickAfterWarnMsg, [senderId], message);
                            }
                        } else {
                            if (!isSilent) {
                                const noKickMsg = `╭──❍「 *🏷️ ANTITAG PROTECTION* 」❍
├ 👤 *User* : @${senderId.split('@')[0]}
├ 🏷️ *Action* : Mass tag detected
├ ⚠️ *Warns* : ${warnCount}/${warnLimit}
├ ❌ *Note* : Make me admin to kick!
╰──────❍

✨ *"${randomQuote}"* ✨

_📌 User has reached warning limit_
▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`;
                                await sendStyledMessage(sock, chatId, noKickMsg, [senderId], message);
                            }
                        }
                        return;
                    }
                    
                    if (!isSilent) {
                        const warnMsg = `╭──❍「 *🏷️ ANTITAG PROTECTION* 」❍
├ 👤 *User* : @${senderId.split('@')[0]}
├ 🏷️ *Action* : Mass tag detected
├ ⚠️ *Warning* : ${warnCount}/${warnLimit}
├ 📝 *Remaining* : ${remaining} warning(s) left
╰──────❍

✨ *"${randomQuote}"* ✨

_📌 Next violation may result in a kick_
▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`;
                        await sendStyledMessage(sock, chatId, warnMsg, [senderId], message);
                    }
                    return;
                }
                
                // ========== DELETE ACTION (default) ==========
                if (action === 'delete') {
                    if (!isSilent) {
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
                    return;
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
        const isBotAdmin = adminCheck.isBotAdmin;
        
        const action = args[0]?.toLowerCase();
        
        // ========== SHOW STATUS (default) ==========
        if (!action) {
            const statusIcon = config.enabled ? '✅' : '❌';
            const actionText = (config.action || 'delete').toUpperCase();
            const isSilent = await getSilentMode(chatId);
            const silentIcon = isSilent ? '🔇' : '🔊';
            const silentText = isSilent ? 'SILENT (no messages)' : 'NORMAL (with warnings)';
            
            const statusMsg = `╭──❍「 *🏷️ ANTITAG PROTECTION* 」❍
├ 📵 *Status* : ${statusIcon} ${config.enabled ? 'ENABLED' : 'DISABLED'}
├ ${silentIcon} *Mode* : ${silentText}
├ ⚡ *Action* : ${actionText}
├ ⚠️ *Warn Limit* : ${config.warnLimit || 3}
├ 🤖 *Bot Admin* : ${isBotAdmin ? '✅' : '❌'}
╰─┬────❍
╭─┴─❍「 *📋 COMMANDS* 」❍
│ 🔧 ${currentPrefix}antitag on - Enable protection
│ 🔧 ${currentPrefix}antitag off - Disable protection
│ 🔧 ${currentPrefix}antitag delete - Delete only
│ 🔧 ${currentPrefix}antitag delete silent - Delete silently
│ 🔧 ${currentPrefix}antitag warn - Warn then kick
│ 🔧 ${currentPrefix}antitag kick - Kick immediately
│ 🔧 ${currentPrefix}antitag silent - Toggle silent mode
│ 🔧 ${currentPrefix}antitag set warnlimit <num>
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
            await setAntitag(chatId, 'delete', 3);
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
        
        // ========== DELETE ACTION WITH SILENT MODE ==========
        if (action === 'delete') {
            await setAntitag(chatId, 'delete', config.warnLimit || 3);
            
            const silentMode = args[1]?.toLowerCase() === 'silent';
            await setSilentMode(chatId, silentMode);
            
            const actionSetMsg = `╭──❍「 *🏷️ ANTITAG PROTECTION* 」❍
├ ✅ *Action* : Set to DELETE
├ 🔇 *Mode* : ${silentMode ? 'SILENT (no messages)' : 'NORMAL (with warnings)'}
╰──────❍

▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`;
            await sendStyledMessage(sock, chatId, actionSetMsg, [], msg);
            return;
        }
        
        // ========== SET WARN ACTION ==========
        if (action === 'warn') {
            if (!isBotAdmin) {
                const noAdminMsg = `╭──❍「 *🏷️ ANTITAG PROTECTION* 」❍
├ ⚠️ *Warning* : WARN action requires bot admin
├ ❌ *Note* : Bot needs admin rights for this action
╰──────❍

_📌 Please make bot admin for full protection_
▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`;
                await sendStyledMessage(sock, chatId, noAdminMsg, [], msg);
                return;
            }
            await setAntitag(chatId, 'warn', config.warnLimit || 3);
            await setSilentMode(chatId, false);
            
            const actionSetMsg = `╭──❍「 *🏷️ ANTITAG PROTECTION* 」❍
├ ✅ *Action* : Set to WARN
├ 📝 *Description* : Warn users (${config.warnLimit || 3} warnings then kick)
╰──────❍

▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`;
            await sendStyledMessage(sock, chatId, actionSetMsg, [], msg);
            return;
        }
        
        // ========== SET KICK ACTION ==========
        if (action === 'kick') {
            if (!isBotAdmin) {
                const noAdminMsg = `╭──❍「 *🏷️ ANTITAG PROTECTION* 」❍
├ ⚠️ *Warning* : KICK action requires bot admin
├ ❌ *Note* : Bot needs admin rights for this action
╰──────❍

_📌 Please make bot admin for full protection_
▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`;
                await sendStyledMessage(sock, chatId, noAdminMsg, [], msg);
                return;
            }
            await setAntitag(chatId, 'kick', config.warnLimit || 3);
            await setSilentMode(chatId, false);
            
            const actionSetMsg = `╭──❍「 *🏷️ ANTITAG PROTECTION* 」❍
├ ✅ *Action* : Set to KICK
├ 📝 *Description* : Kick users immediately
╰──────❍

▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`;
            await sendStyledMessage(sock, chatId, actionSetMsg, [], msg);
            return;
        }
        
        // ========== TOGGLE SILENT MODE ==========
        if (action === 'silent') {
            if (!config.enabled) {
                const notEnabledMsg = `╭──❍「 *🏷️ ANTITAG PROTECTION* 」❍
├ ❌ *Error* : Anti-tag is not enabled!
├ 📝 *First enable with* : ${currentPrefix}antitag on
╰──────❍

▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`;
                await sendStyledMessage(sock, chatId, notEnabledMsg, [], msg);
                return;
            }
            
            if (config.action !== 'delete') {
                const wrongActionMsg = `╭──❍「 *🏷️ ANTITAG PROTECTION* 」❍
├ ❌ *Error* : Silent mode only works with DELETE action!
├ 📝 *Current action* : ${config.action.toUpperCase()}
├ 🔧 *Use* : ${currentPrefix}antitag delete
╰──────❍

▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`;
                await sendStyledMessage(sock, chatId, wrongActionMsg, [], msg);
                return;
            }
            
            const currentSilent = await getSilentMode(chatId);
            const newSilent = !currentSilent;
            await setSilentMode(chatId, newSilent);
            
            const silentMsg = `╭──❍「 *🏷️ ANTITAG PROTECTION* 」❍
├ 🔇 *Silent Mode* : ${newSilent ? 'ENABLED' : 'DISABLED'}
├ 📝 *Effect* : ${newSilent ? 'Mass tags deleted silently - No messages sent' : 'Mass tags deleted with warning messages'}
╰──────❍

▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`;
            await sendStyledMessage(sock, chatId, silentMsg, [], msg);
            return;
        }
        
        // ========== SET WARN LIMIT ==========
        if (action === 'set') {
            if (args[1]?.toLowerCase() === 'warnlimit') {
                const limit = parseInt(args[2]);
                if (isNaN(limit) || limit < 1 || limit > 10) {
                    const limitErrorMsg = `╭──❍「 *🏷️ ANTITAG PROTECTION* 」❍
├ ❌ *Error* : Warn limit must be between 1 and 10!
╰──────❍

▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`;
                    await sendStyledMessage(sock, chatId, limitErrorMsg, [], msg);
                    return;
                }
                await setAntitag(chatId, config.action || 'delete', limit);
                const limitSetMsg = `╭──❍「 *🏷️ ANTITAG PROTECTION* 」❍
├ ✅ *Warn Limit* : Set to ${limit}
╰──────❍

▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`;
                await sendStyledMessage(sock, chatId, limitSetMsg, [], msg);
                return;
            }
            
            const invalidSetMsg = `╭──❍「 *🏷️ ANTITAG PROTECTION* 」❍
├ ❌ *Usage* : ${currentPrefix}antitag set warnlimit <num>
├ 📝 *Example* : ${currentPrefix}antitag set warnlimit 5
╰──────❍

▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`;
            await sendStyledMessage(sock, chatId, invalidSetMsg, [], msg);
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
export { setAntitag, getAntitag, removeAntitag, getSilentMode, setSilentMode };