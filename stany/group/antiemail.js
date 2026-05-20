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
import { getAntiEmail } from '../../stanymedia/antiemail.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Data directory
const DATA_DIR = path.join(process.cwd(), 'stanydata');
const ANTIEMAIL_FILE = path.join(DATA_DIR, 'antiemail_settings.json');

// Silent mode storage
const SILENT_MODE_FILE = path.join(DATA_DIR, 'antiemail_silent.json');

// Warning counts storage
const WARNINGS_FILE = path.join(DATA_DIR, 'antiemail_warnings.json');

// ============================================================
// DATABASE FUNCTIONS
// ============================================================

async function loadDatabase() {
    try {
        if (fs.existsSync(ANTIEMAIL_FILE)) {
            return JSON.parse(fs.readFileSync(ANTIEMAIL_FILE, 'utf8'));
        }
        return {};
    } catch {
        return {};
    }
}

async function saveDatabase(data) {
    try {
        if (!fs.existsSync(DATA_DIR)) {
            fs.mkdirSync(DATA_DIR, { recursive: true });
        }
        fs.writeFileSync(ANTIEMAIL_FILE, JSON.stringify(data, null, 2));
        return true;
    } catch (error) {
        console.error('Error saving antiemail config:', error);
        return false;
    }
}

async function setAntiEmail(chatId, enabled, action = 'delete') {
    const data = await loadDatabase();
    data[chatId] = { 
        enabled: Boolean(enabled), 
        action: ['delete', 'warn', 'kick'].includes(action) ? action : 'delete',
        updatedAt: new Date().toISOString()
    };
    await saveDatabase(data);
    return data[chatId];
}

async function removeAntiEmail(chatId) {
    const data = await loadDatabase();
    delete data[chatId];
    await saveDatabase(data);
}

// ============================================================
// WARNING FUNCTIONS
// ============================================================

async function getWarnings(groupId, userId) {
    try {
        if (fs.existsSync(WARNINGS_FILE)) {
            const data = JSON.parse(fs.readFileSync(WARNINGS_FILE, 'utf8'));
            return data[groupId]?.[userId] || 0;
        }
        return 0;
    } catch {
        return 0;
    }
}

async function addWarning(groupId, userId) {
    try {
        let data = {};
        if (fs.existsSync(WARNINGS_FILE)) {
            data = JSON.parse(fs.readFileSync(WARNINGS_FILE, 'utf8'));
        }
        if (!data[groupId]) data[groupId] = {};
        data[groupId][userId] = (data[groupId][userId] || 0) + 1;
        fs.writeFileSync(WARNINGS_FILE, JSON.stringify(data, null, 2));
        return data[groupId][userId];
    } catch {
        return 1;
    }
}

async function resetWarnings(groupId, userId) {
    try {
        if (fs.existsSync(WARNINGS_FILE)) {
            const data = JSON.parse(fs.readFileSync(WARNINGS_FILE, 'utf8'));
            if (data[groupId]) {
                delete data[groupId][userId];
                fs.writeFileSync(WARNINGS_FILE, JSON.stringify(data, null, 2));
            }
        }
    } catch {}
}

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
// QUOTES
// ============================================================
const QUOTES = [
    "I'm not lazy, I'm just on my energy saving mode.",
    "Life is short, smile while you still have teeth.",
    "No email sharing allowed! 📧🚫",
    "Keep your emails private! 🔒",
    "Respect privacy, no emails in chat!",
    "Email addresses? Not today!",
    "This is a no-email zone! 🛡️"
];

const getRandomQuote = () => QUOTES[Math.floor(Math.random() * QUOTES.length)];

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
// MAIN HANDLER - Email Detection
// ============================================================

export async function handleEmailDetection(sock, chatId, message, userMessage, senderId) {
    try {
        // Check if it's a group
        const groupCheck = isGroup(chatId);
        if (!groupCheck.isGroup) return;
        
        // Get antiemail settings
        const config = await getAntiEmail(chatId);
        if (!config.enabled) return;
        
        // Check for email in message
        const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
        const hasEmail = emailRegex.test(userMessage);
        if (!hasEmail) return;
        
        // Check if sender is owner (exempt)
        const ownerCheck = await isOwner(senderId);
        if (ownerCheck.isOwner) return;
        
        // Check if sender is admin (exempt)
        const adminCheck = await isAdmin(sock, chatId, senderId);
        if (adminCheck.isSenderAdmin) return;
        
        const action = config.action || 'delete';
        const randomQuote = getRandomQuote();
        const isSilent = await getSilentMode(chatId);
        
        // Delete the email message
        try {
            await sock.sendMessage(chatId, { delete: message.key });
        } catch {}
        
        // ========== KICK ACTION ==========
        if (action === 'kick') {
            if (!adminCheck.isBotAdmin) {
                if (!isSilent) {
                    const kickErrorMsg = `╭──❍「 *📧 ANTI-EMAIL PROTECTION* 」❍
├ 👤 *User* : @${senderId.split('@')[0]}
├ 📧 *Violation* : Email detected
├ ❌ *Error* : Make me admin to kick!
╰──────❍

✨ *"${randomQuote}"* ✨

_📌 Please promote bot to admin for full protection_
▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`;
                    await sendStyledMessage(sock, chatId, kickErrorMsg, [senderId], message);
                }
                return;
            }
            try {
                await sock.groupParticipantsUpdate(chatId, [senderId], "remove");
                if (!isSilent) {
                    const kickMsg = `╭──❍「 *📧 ANTI-EMAIL PROTECTION* 」❍
├ 👤 *User* : @${senderId.split('@')[0]}
├ 📧 *Violation* : Email detected
├ 🚫 *Action* : KICKED
╰──────❍

✨ *"${randomQuote}"* ✨

_📌 Email sharing is not allowed in this group_
▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`;
                    await sendStyledMessage(sock, chatId, kickMsg, [senderId], message);
                }
            } catch (error) {
                if (!isSilent) {
                    const kickFailMsg = `╭──❍「 *📧 ANTI-EMAIL PROTECTION* 」❍
├ 👤 *User* : @${senderId.split('@')[0]}
├ 📧 *Violation* : Email detected
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
            const remaining = 3 - warnCount;
            
            if (warnCount >= 3) {
                await resetWarnings(chatId, senderId);
                if (adminCheck.isBotAdmin) {
                    await sock.groupParticipantsUpdate(chatId, [senderId], "remove");
                    if (!isSilent) {
                        const kickAfterWarnMsg = `╭──❍「 *📧 ANTI-EMAIL PROTECTION* 」❍
├ 👤 *User* : @${senderId.split('@')[0]}
├ 📧 *Violation* : Email detected
├ ⚠️ *Warns* : ${warnCount}/3
├ 🚫 *Action* : KICKED (max warns)
╰──────❍

✨ *"${randomQuote}"* ✨

_📌 User has been kicked after 3 warnings_
▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`;
                        await sendStyledMessage(sock, chatId, kickAfterWarnMsg, [senderId], message);
                    }
                } else {
                    if (!isSilent) {
                        const noKickMsg = `╭──❍「 *📧 ANTI-EMAIL PROTECTION* 」❍
├ 👤 *User* : @${senderId.split('@')[0]}
├ 📧 *Violation* : Email detected
├ ⚠️ *Warns* : ${warnCount}/3
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
                const warnMsg = `╭──❍「 *📧 ANTI-EMAIL PROTECTION* 」❍
├ 👤 *User* : @${senderId.split('@')[0]}
├ 📧 *Violation* : Email detected
├ ⚠️ *Warning* : ${warnCount}/3
├ 📝 *Remaining* : ${remaining} warning(s) left
╰──────❍

✨ *"${randomQuote}"* ✨

_📌 Next violation may result in a kick_
▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`;
                await sendStyledMessage(sock, chatId, warnMsg, [senderId], message);
            }
            return;
        }
        
        // ========== DELETE ACTION (default with silent support) ==========
        if (action === 'delete') {
            if (!isSilent) {
                const deleteMsg = `╭──❍「 *📧 ANTI-EMAIL PROTECTION* 」❍
├ 👤 *User* : @${senderId.split('@')[0]}
├ 📧 *Violation* : Email detected
├ 🗑️ *Action* : Message deleted
╰──────❍

✨ *"${randomQuote}"* ✨

_📌 Email addresses are not allowed in this group_
▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`;
                await sendStyledMessage(sock, chatId, deleteMsg, [senderId], message);
            }
            return;
        }
        
    } catch (error) {
        console.error('Email detection error:', error);
    }
}

// ============================================================
// MAIN COMMAND
// ============================================================

export default {
    name: 'antiemail',
    description: 'Block messages containing email addresses',
    icon: '📧',
    alias: ['blockemail', 'noemail', 'emailfilter'],
    category: 'group',
    groupOnly: true,
    
    async execute(sock, msg, args, currentPrefix, { isOwner, jidManager }) {
        
        const chatId = msg.key.remoteJid;
        const senderId = msg.key.participant || chatId;
        
        // Check if it's a group
        const groupCheck = isGroup(chatId);
        if (!groupCheck.isGroup) {
            const notGroupMsg = `╭──❍「 *📧 ANTI-EMAIL* 」❍
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
            const notAuthMsg = `╭──❍「 *📧 ANTI-EMAIL* 」❍
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
        
        const config = await getAntiEmail(chatId);
        const randomQuote = getRandomQuote();
        const botName = 'MDINYANE';
        
        // Check if bot is admin
        const botAdminCheck = await isAdmin(sock, chatId, sock.user.id);
        const isBotAdmin = botAdminCheck.isBotAdmin;
        
        const action = args[0]?.toLowerCase();
        
        // ========== SHOW STATUS (default) ==========
        if (!action) {
            const statusIcon = config.enabled ? '✅' : '❌';
            const statusText = config.enabled ? 'ENABLED' : 'DISABLED';
            const actionText = config.action.toUpperCase();
            const isSilent = await getSilentMode(chatId);
            const silentIcon = isSilent ? '🔇' : '🔊';
            const silentText = isSilent ? 'SILENT (no messages)' : 'NORMAL (with warnings)';
            
            const statusMsg = `╭──❍「 *📧 ANTI-EMAIL PROTECTION* 」❍
├ 📵 *Status* : ${statusIcon} ${statusText}
├ 🎯 *Action* : ${actionText}
├ ${silentIcon} *Mode* : ${silentText}
├ 🤖 *Bot Admin* : ${isBotAdmin ? '✅' : '❌'}
╰─┬────❍
╭─┴─❍「 *📋 COMMANDS* 」❍
│ 🔧 ${currentPrefix}antiemail on - Enable protection
│ 🔧 ${currentPrefix}antiemail off - Disable protection
│ 🔧 ${currentPrefix}antiemail delete - Delete + warnings
│ 🔧 ${currentPrefix}antiemail delete silent - Delete silently (no messages)
│ 🔧 ${currentPrefix}antiemail set warn - Warn then kick
│ 🔧 ${currentPrefix}antiemail set kick - Kick immediately
│ 🔧 ${currentPrefix}antiemail silent - Toggle silent mode
╰──────❍
╭─┴─❍「 *📊 INFO* 」❍
├ 📅 *Date* : ${date}
├ 📆 *Day* : ${day}
├ ⏰ *Time* : ${time} EAT
├ 👑 *Exempt* : Admins & Owner
├ 📧 *Detects* : Email addresses (name@domain.com)
╰──────❍

✨ *"${randomQuote}"* ✨

_📌 Admins and Owner are EXEMPT from antiemail_
▰▰▰ *©️ ${botName.toUpperCase()} BY STANY TZ* ▰▰▰`;
            await sendStyledMessage(sock, chatId, statusMsg, [], msg);
            return;
        }
        
        // ========== ENABLE ==========
        if (action === 'on') {
            if (config.enabled) {
                const alreadyMsg = `╭──❍「 *📧 ANTI-EMAIL* 」❍
├ ⚠️ *Status* : Already ENABLED
├ 📝 *Action* : ${config.action.toUpperCase()}
╰──────❍

▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`;
                await sendStyledMessage(sock, chatId, alreadyMsg, [], msg);
                return;
            }
            
            await setAntiEmail(chatId, true, 'delete');
            
            const enableMsg = `╭──❍「 *📧 ANTI-EMAIL* 」❍
├ ✅ *Status* : ENABLED
├ 🎯 *Action* : DELETE
╰──────❍

✨ *"${randomQuote}"* ✨

_📌 Email addresses will now be deleted automatically_
▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`;
            await sendStyledMessage(sock, chatId, enableMsg, [], msg);
            return;
        }
        
        // ========== DISABLE ==========
        if (action === 'off') {
            if (!config.enabled) {
                const alreadyOffMsg = `╭──❍「 *📧 ANTI-EMAIL* 」❍
├ ⚠️ *Status* : Already DISABLED
╰──────❍

▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`;
                await sendStyledMessage(sock, chatId, alreadyOffMsg, [], msg);
                return;
            }
            
            await removeAntiEmail(chatId);
            
            const disableMsg = `╭──❍「 *📧 ANTI-EMAIL* 」❍
├ ❌ *Status* : DISABLED
├ 📝 *Note* : Email addresses will be allowed
╰──────❍

▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`;
            await sendStyledMessage(sock, chatId, disableMsg, [], msg);
            return;
        }
        
        // ========== DELETE ACTION WITH SILENT MODE ==========
        if (action === 'delete') {
            await setAntiEmail(chatId, true, 'delete');
            
            const silentMode = args[1]?.toLowerCase() === 'silent';
            await setSilentMode(chatId, silentMode);
            
            const actionSetMsg = `╭──❍「 *📧 ANTI-EMAIL* 」❍
├ ✅ *Action* : Set to DELETE
├ 🔇 *Mode* : ${silentMode ? 'SILENT (no messages)' : 'NORMAL (with warnings)'}
╰──────❍

▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`;
            await sendStyledMessage(sock, chatId, actionSetMsg, [], msg);
            return;
        }
        
        // ========== SET WARN OR KICK ==========
        if (action === 'set') {
            const newAction = args[1]?.toLowerCase();
            
            if (!newAction || !['warn', 'kick'].includes(newAction)) {
                const usageMsg = `╭──❍「 *📧 ANTI-EMAIL* 」❍
├ ❌ *Usage* : ${currentPrefix}antiemail set warn|kick
├ 📝 *Example* : ${currentPrefix}antiemail set warn
╰──────❍

_📌 Available actions: warn, kick_
▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`;
                await sendStyledMessage(sock, chatId, usageMsg, [], msg);
                return;
            }
            
            if (newAction !== 'delete' && !isBotAdmin) {
                const warnNoAdminMsg = `╭──❍「 *📧 ANTI-EMAIL* 」❍
├ ⚠️ *Warning* : Action set to ${newAction.toUpperCase()}
├ ❌ *Note* : Bot needs admin rights for this action
╰──────❍

_📌 Please make bot admin for full protection_
▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`;
                await sendStyledMessage(sock, chatId, warnNoAdminMsg, [], msg);
            }
            
            await setAntiEmail(chatId, true, newAction);
            // Reset silent mode when switching from delete
            await setSilentMode(chatId, false);
            
            const actionDesc = {
                warn: 'Delete + Send warning',
                kick: 'Delete + Warning + Kick user'
            };
            
            const actionSetMsg = `╭──❍「 *📧 ANTI-EMAIL* 」❍
├ ✅ *Action Updated*
├ 🎯 *Action* : ${newAction.toUpperCase()}
├ 📝 *Description* : ${actionDesc[newAction]}
╰──────❍

▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`;
            await sendStyledMessage(sock, chatId, actionSetMsg, [], msg);
            return;
        }
        
        // ========== TOGGLE SILENT MODE ==========
        if (action === 'silent') {
            const currentSettings = await getAntiEmail(chatId);
            if (!currentSettings.enabled) {
                const notEnabledMsg = `╭──❍「 *📧 ANTI-EMAIL* 」❍
├ ❌ *Error* : Anti-email is not enabled!
├ 📝 *First enable with* : ${currentPrefix}antiemail on
╰──────❍

▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`;
                await sendStyledMessage(sock, chatId, notEnabledMsg, [], msg);
                return;
            }
            
            if (currentSettings.action !== 'delete') {
                const wrongActionMsg = `╭──❍「 *📧 ANTI-EMAIL* 」❍
├ ❌ *Error* : Silent mode only works with DELETE action!
├ 📝 *Current action* : ${currentSettings.action.toUpperCase()}
├ 🔧 *Use* : ${currentPrefix}antiemail delete
╰──────❍

▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`;
                await sendStyledMessage(sock, chatId, wrongActionMsg, [], msg);
                return;
            }
            
            const currentSilent = await getSilentMode(chatId);
            const newSilent = !currentSilent;
            await setSilentMode(chatId, newSilent);
            
            const silentMsg = `╭──❍「 *📧 ANTI-EMAIL* 」❍
├ 🔇 *Silent Mode* : ${newSilent ? 'ENABLED' : 'DISABLED'}
├ 📝 *Effect* : ${newSilent ? 'Emails deleted silently - No messages sent' : 'Emails deleted with warning messages'}
╰──────❍

▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`;
            await sendStyledMessage(sock, chatId, silentMsg, [], msg);
            return;
        }
        
        // ========== INVALID COMMAND ==========
        const invalidMsg = `╭──❍「 *📧 ANTI-EMAIL* 」❍
├ ❌ *Invalid command* : ${action}
├ 📝 *Use* : ${currentPrefix}antiemail for help
╰──────❍

▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`;
        await sendStyledMessage(sock, chatId, invalidMsg, [], msg);
    }
};

// Export for use in index.js
export { setAntiEmail, removeAntiEmail, handleEmailDetection };