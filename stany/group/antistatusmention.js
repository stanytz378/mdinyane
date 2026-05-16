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
import { fileURLToPath } from 'url';
import moment from 'moment-timezone';
import { channelInfo, botImagePath } from '../../stanytz/messageConfig.js';
import isAdmin from '../../stanymain/isAdmin.js';
import isOwner from '../../stanymain/isOwner.js';
import isGroup from '../../stanymain/isGroup.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Data directory
const DATA_DIR = path.join(process.cwd(), 'stanydata');
const ANTI_STATUS_FILE = path.join(DATA_DIR, 'antistatus_settings.json');
const WARNS_FILE = path.join(DATA_DIR, 'antistatus_warns.json');

if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

// ============================================================
// QUOTES
// ============================================================
const QUOTES = [
    "I'm not lazy, I'm just on my energy saving mode.",
    "Life is short, smile while you still have teeth.",
    "Rules are rules, no status mentions here!",
    "Keep the group clean, no status mentions!",
    "Respect the group rules!",
    "Status mentions? Not today!",
    "This is a warning, next time action will be taken!",
    "Stay safe, stay clean!",
    "Following rules keeps the group healthy!",
    "No shortcuts, follow the guidelines!"
];

// ============================================================
// ADMIN INSULTS
// ============================================================
const adminInsults = [
    "Are you really an Admin? Status mentions are for amateurs... 🤡",
    "Look at this genius Admin! That status mention is mid. 🙄",
    "Is this an Admin or a lost bot? Stop status mentions! 💀",
    "Admin status: High. IQ: Not found. 🧠🚫",
    "Wow, such a 'pro' Admin move. Embarrassing! 🤏",
    "Oh look, another Admin who thinks status mentions are cool. They're not. 💅",
    "Admin? More like 'Ad-minimum effort'. 🎪",
    "You call yourself an Admin? This status mention says otherwise. 🗑️",
    "Breaking news: Local Admin discovers status mentions. 📰😴",
    "That status mention energy? Negative. Your Admin card? Revoked. 🃏"
];

const getRandomInsult = () => adminInsults[Math.floor(Math.random() * adminInsults.length)];
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

async function getSettings(chatId) {
    const settings = await loadDatabase(ANTI_STATUS_FILE, {});
    return settings[chatId] || { enabled: false, action: 'delete', warnLimit: 3 };
}

async function setSettings(chatId, action, warnLimit = 3) {
    const settings = await loadDatabase(ANTI_STATUS_FILE, {});
    settings[chatId] = {
        enabled: true,
        action: action,
        warnLimit: warnLimit,
        updatedAt: new Date().toISOString()
    };
    await saveDatabase(ANTI_STATUS_FILE, settings);
    return true;
}

async function disableSettings(chatId) {
    const settings = await loadDatabase(ANTI_STATUS_FILE, {});
    settings[chatId] = {
        enabled: false,
        action: null,
        warnLimit: 3,
        updatedAt: new Date().toISOString()
    };
    await saveDatabase(ANTI_STATUS_FILE, settings);
    return true;
}

async function getWarns(chatId, userId) {
    const warns = await loadDatabase(WARNS_FILE, {});
    return warns[chatId]?.[userId] || 0;
}

async function addWarn(chatId, userId) {
    const warns = await loadDatabase(WARNS_FILE, {});
    if (!warns[chatId]) warns[chatId] = {};
    warns[chatId][userId] = (warns[chatId][userId] || 0) + 1;
    await saveDatabase(WARNS_FILE, warns);
    return warns[chatId][userId];
}

async function resetWarns(chatId, userId) {
    const warns = await loadDatabase(WARNS_FILE, {});
    if (warns[chatId]) {
        delete warns[chatId][userId];
        await saveDatabase(WARNS_FILE, warns);
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
// MAIN HANDLER (using isAdmin, isOwner, isGroup from stanymain)
// ============================================================

export async function handleStatusMention(sock, message, chatId, isGroupChat, senderId) {
    try {
        // Check if it's a group using isGroup utility
        const groupCheck = isGroup(chatId);
        if (!groupCheck.isGroup) return;
        
        if (!message.message?.groupStatusMentionMessage) return;
        
        const settings = await getSettings(chatId);
        if (!settings.enabled) return;
        
        // Check if sender is owner using isOwner utility
        const ownerCheck = await isOwner(senderId);
        if (ownerCheck.isOwner) return;
        
        // Check admin status using isAdmin utility
        const adminCheck = await isAdmin(sock, chatId, senderId);
        const isSenderAdmin = adminCheck.isSenderAdmin;
        const isBotAdmin = adminCheck.isBotAdmin;
        
        const randomQuote = getRandomQuote();
        
        // ADMIN gets insult
        if (isSenderAdmin) {
            const insult = getRandomInsult();
            const adminMsg = `╭──❍「 *🛡️ ANTI STATUS MENTION* 」❍
├ 👑 *Admin* : @${senderId.split('@')[0]}
├ 💬 *Warning* : ${insult}
╰──────❍

✨ *"${randomQuote}"* ✨

_📌 Status mentions are not allowed even for Admins!_
▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`;
            await sendStyledMessage(sock, chatId, adminMsg, [senderId], message);
            return;
        }
        
        // Delete the status mention message
        try {
            await sock.sendMessage(chatId, { delete: message.key });
        } catch {}
        
        const action = settings.action || 'delete';
        
        // ========== KICK ACTION ==========
        if (action === 'kick') {
            if (!isBotAdmin) {
                const kickErrorMsg = `╭──❍「 *🛡️ ANTI STATUS MENTION* 」❍
├ 👤 *User* : @${senderId.split('@')[0]}
├ ⚠️ *Status* : Status mention detected
├ ❌ *Error* : Make me admin to kick!
╰──────❍

✨ *"${randomQuote}"* ✨

_📌 Please promote bot to admin for full protection_
▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`;
                await sendStyledMessage(sock, chatId, kickErrorMsg, [senderId], message);
                return;
            }
            try {
                await sock.groupParticipantsUpdate(chatId, [senderId], "remove");
                const kickMsg = `╭──❍「 *🛡️ ANTI STATUS MENTION* 」❍
├ 👤 *User* : @${senderId.split('@')[0]}
├ 🚫 *Action* : KICKED
├ 📝 *Reason* : Status mention spam
╰──────❍

✨ *"${randomQuote}"* ✨

_📌 Status mentions are not allowed in this group_
▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`;
                await sendStyledMessage(sock, chatId, kickMsg, [senderId], message);
            } catch (error) {
                const kickFailMsg = `╭──❍「 *🛡️ ANTI STATUS MENTION* 」❍
├ 👤 *User* : @${senderId.split('@')[0]}
├ ❌ *Error* : Failed to kick user
├ 📝 *Reason* : ${error.message}
╰──────❍

✨ *"${randomQuote}"* ✨

_📌 Check my permissions and try again_
▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`;
                await sendStyledMessage(sock, chatId, kickFailMsg, [senderId], message);
            }
            return;
        }
        
        // ========== WARN ACTION ==========
        if (action === 'warn') {
            const maxWarns = settings.warnLimit || 3;
            const warnCount = await addWarn(chatId, senderId);
            const remaining = maxWarns - warnCount;
            
            if (warnCount >= maxWarns) {
                await resetWarns(chatId, senderId);
                if (isBotAdmin) {
                    await sock.groupParticipantsUpdate(chatId, [senderId], "remove");
                    const kickAfterWarnMsg = `╭──❍「 *🛡️ ANTI STATUS MENTION* 」❍
├ 👤 *User* : @${senderId.split('@')[0]}
├ ⚠️ *Warns* : ${warnCount}/${maxWarns}
├ 🚫 *Action* : KICKED (max warns reached)
╰──────❍

✨ *"${randomQuote}"* ✨

_📌 User has been kicked after ${maxWarns} warnings_
▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`;
                    await sendStyledMessage(sock, chatId, kickAfterWarnMsg, [senderId], message);
                } else {
                    const noKickMsg = `╭──❍「 *🛡️ ANTI STATUS MENTION* 」❍
├ 👤 *User* : @${senderId.split('@')[0]}
├ ⚠️ *Warns* : ${warnCount}/${maxWarns}
├ ❌ *Note* : Make me admin to kick!
╰──────❍

✨ *"${randomQuote}"* ✨

_📌 User has reached warning limit but bot is not admin_
▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`;
                    await sendStyledMessage(sock, chatId, noKickMsg, [senderId], message);
                }
                return;
            }
            
            const warnMsg = `╭──❍「 *🛡️ ANTI STATUS MENTION* 」❍
├ 👤 *User* : @${senderId.split('@')[0]}
├ ⚠️ *Warning* : ${warnCount}/${maxWarns}
├ 📝 *Remaining* : ${remaining} warning(s) left
╰──────❍

✨ *"${randomQuote}"* ✨

_📌 Next violation may result in a kick_
▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`;
            await sendStyledMessage(sock, chatId, warnMsg, [senderId], message);
            return;
        }
        
        // ========== DELETE ACTION (default) ==========
        if (action === 'delete') {
            const deleteMsg = `╭──❍「 *🛡️ ANTI STATUS MENTION* 」❍
├ 👤 *User* : @${senderId.split('@')[0]}
├ 🗑️ *Action* : Message deleted
├ 📝 *Reason* : Status mentions not allowed
╰──────❍

✨ *"${randomQuote}"* ✨

_📌 Please avoid using status mentions in this group_
▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`;
            await sendStyledMessage(sock, chatId, deleteMsg, [senderId], message);
        }
        
    } catch (error) {
        console.error('Status mention error:', error);
    }
}

// ============================================================
// COMMAND (using isAdmin, isOwner, isGroup from stanymain)
// ============================================================

export default {
    name: 'antistatus',
    description: 'Anti status mention protection for groups',
    icon: '🛡️',
    alias: ['as', 'astatus', 'nostatus', 'antistatusmention'],
    category: 'group',
    groupOnly: true,
    
    async execute(sock, msg, args, currentPrefix, { isOwner, jidManager }) {
        
        const chatId = msg.key.remoteJid;
        const senderId = msg.key.participant || chatId;
        
        // Check if it's a group using isGroup utility
        const groupCheck = isGroup(chatId);
        if (!groupCheck.isGroup) {
            const notGroupMsg = `╭──❍「 *🛡️ ANTI STATUS MENTION* 」❍
├ ❌ *Error* : This command only works in groups!
╰──────❍

▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`;
            await sendStyledMessage(sock, chatId, notGroupMsg, [], msg);
            return;
        }
        
        // Check if sender is owner using isOwner utility
        const ownerCheck = await isOwner(senderId, jidManager);
        const isOwnerUser = ownerCheck.isOwner;
        
        // Check admin status using isAdmin utility
        const adminCheck = await isAdmin(sock, chatId, senderId);
        const isSenderAdmin = adminCheck.isSenderAdmin;
        const isBotGroupAdmin = adminCheck.isBotAdmin;
        
        const isAuthorized = isOwnerUser || isSenderAdmin;
        
        if (!isAuthorized) {
            const notAuthMsg = `╭──❍「 *🛡️ ANTI STATUS MENTION* 」❍
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
        
        const action = args[0]?.toLowerCase();
        const randomQuote = getRandomQuote();
        
        // ========== SHOW STATUS (default) ==========
        if (!action) {
            const settings = await getSettings(chatId);
            const statusIcon = settings.enabled ? '✅' : '❌';
            const actionText = (settings.action || 'delete').toUpperCase();
            
            const statusMsg = `╭──❍「 *🛡️ ANTI STATUS MENTION* 」❍
├ 📵 *Status* : ${statusIcon} ${settings.enabled ? 'ENABLED' : 'DISABLED'}
├ ⚡ *Action* : ${actionText}
├ ⚠️ *Warn Limit* : ${settings.warnLimit || 3}
├ 🤖 *Bot Admin* : ${isBotGroupAdmin ? '✅' : '❌'}
╰─┬────❍
╭─┴─❍「 *📋 COMMANDS* 」❍
│ 🔧 ${currentPrefix}antistatus on - Enable
│ 🔧 ${currentPrefix}antistatus off - Disable
│ 🔧 ${currentPrefix}antistatus set delete - Delete only
│ 🔧 ${currentPrefix}antistatus set warn - Warn then kick
│ 🔧 ${currentPrefix}antistatus set kick - Kick immediately
│ 🔧 ${currentPrefix}antistatus set warnlimit <num>
╰──────❍
╭─┴─❍「 *📊 INFO* 」❍
├ 📅 *Date* : ${date}
├ 📆 *Day* : ${day}
├ ⏰ *Time* : ${time} EAT
╰──────❍

✨ *"${randomQuote}"* ✨

_📌 Admins get insulted but not punished!_
▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`;
            await sendStyledMessage(sock, chatId, statusMsg, [], msg);
            return;
        }
        
        // ========== ENABLE ==========
        if (action === 'on') {
            const current = await getSettings(chatId);
            if (current.enabled) {
                const alreadyMsg = `╭──❍「 *🛡️ ANTI STATUS MENTION* 」❍
├ ⚠️ *Status* : Already ENABLED
├ 📝 *Action* : ${(current.action || 'delete').toUpperCase()}
╰──────❍

▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`;
                await sendStyledMessage(sock, chatId, alreadyMsg, [], msg);
                return;
            }
            await setSettings(chatId, 'delete', 3);
            const successMsg = `╭──❍「 *🛡️ ANTI STATUS MENTION* 」❍
├ ✅ *Status* : ENABLED
├ ⚡ *Action* : DELETE
├ ⚠️ *Warn Limit* : 3
╰──────❍

✨ *"${randomQuote}"* ✨

_📌 Status mentions will now be deleted_
▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`;
            await sendStyledMessage(sock, chatId, successMsg, [], msg);
            return;
        }
        
        // ========== DISABLE ==========
        if (action === 'off') {
            await disableSettings(chatId);
            const disableMsg = `╭──❍「 *🛡️ ANTI STATUS MENTION* 」❍
├ ❌ *Status* : DISABLED
├ 📝 *Note* : Status mentions will be ignored
╰──────❍

▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`;
            await sendStyledMessage(sock, chatId, disableMsg, [], msg);
            return;
        }
        
        // ========== SET ACTION ==========
        if (action === 'set') {
            if (args.length < 2) {
                const usageMsg = `╭──❍「 *🛡️ ANTI STATUS MENTION* 」❍
├ ❌ *Usage* : ${currentPrefix}antistatus set delete|warn|kick|warnlimit <num>
├ 📝 *Example* : ${currentPrefix}antistatus set warn
╰──────❍

_📌 Available actions: delete, warn, kick_
▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`;
                await sendStyledMessage(sock, chatId, usageMsg, [], msg);
                return;
            }
            
            const setAction = args[1].toLowerCase();
            
            if (setAction === 'warnlimit') {
                const limit = parseInt(args[2]);
                if (isNaN(limit) || limit < 1 || limit > 10) {
                    const limitErrorMsg = `╭──❍「 *🛡️ ANTI STATUS MENTION* 」❍
├ ❌ *Error* : Warn limit must be between 1 and 10!
╰──────❍

▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`;
                    await sendStyledMessage(sock, chatId, limitErrorMsg, [], msg);
                    return;
                }
                const current = await getSettings(chatId);
                await setSettings(chatId, current.action || 'delete', limit);
                const limitSetMsg = `╭──❍「 *🛡️ ANTI STATUS MENTION* 」❍
├ ✅ *Warn Limit* : Set to ${limit}
╰──────❍

▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`;
                await sendStyledMessage(sock, chatId, limitSetMsg, [], msg);
                return;
            }
            
            if (!['delete', 'warn', 'kick'].includes(setAction)) {
                const invalidMsg = `╭──❍「 *🛡️ ANTI STATUS MENTION* 」❍
├ ❌ *Invalid action* : ${setAction}
├ 📝 *Available* : delete, warn, kick
╰──────❍

▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`;
                await sendStyledMessage(sock, chatId, invalidMsg, [], msg);
                return;
            }
            
            const current = await getSettings(chatId);
            await setSettings(chatId, setAction, current.warnLimit || 3);
            
            const actionDesc = {
                delete: 'Delete only (no warnings)',
                warn: 'Warn then kick after limit',
                kick: 'Kick immediately'
            };
            
            const actionSetMsg = `╭──❍「 *🛡️ ANTI STATUS MENTION* 」❍
├ ✅ *Action* : Set to ${setAction.toUpperCase()}
├ 📝 *Description* : ${actionDesc[setAction]}
╰──────❍

▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`;
            await sendStyledMessage(sock, chatId, actionSetMsg, [], msg);
            return;
        }
        
        // Invalid command
        const invalidCmdMsg = `╭──❍「 *🛡️ ANTI STATUS MENTION* 」❍
├ ❌ *Invalid command* : ${action}
├ 📝 *Use* : ${currentPrefix}antistatus for help
╰──────❍

▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`;
        await sendStyledMessage(sock, chatId, invalidCmdMsg, [], msg);
    }
};
