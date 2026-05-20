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
import { channelInfo, } from '../../stanytz/messageConfig.js';
import isAdmin from '../../stanymain/isAdmin.js';
import isOwner from '../../stanymain/isOwner.js';
import isGroup from '../../stanymain/isGroup.js';
import { 
    setAntilinkSetting, 
    getAntilinkSetting, 
    removeAntilinkSetting,
    containsLink 
} from '../../katombwe/antilinkhelper.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ============================================================
// QUOTES
// ============================================================
const QUOTES = [
    "I'm not lazy, I'm just on my energy saving mode.",
    "Life is short, smile while you still have teeth.",
    "Rules are rules, no links allowed here!",
    "Keep the group clean, no promotional links!",
    "Respect the group rules!",
    "Links? Not today!",
    "This is a warning, next time action will be taken!",
    "Stay safe, stay clean!",
    "Following rules keeps the group healthy!",
    "No shortcuts, follow the guidelines!"
];

const getRandomQuote = () => QUOTES[Math.floor(Math.random() * QUOTES.length)];

// Warning counts storage
const WARNINGS_FILE = path.join(process.cwd(), 'stanydata', 'antilink_warnings.json');

// Silent mode storage
const SILENT_MODE_FILE = path.join(process.cwd(), 'stanydata', 'antilink_silent.json');

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

// Silent mode functions
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
// MAIN HANDLER - Link Detection
// ============================================================

export async function handleLinkDetection(sock, chatId, message, userMessage, senderId) {
    try {
        // Check if it's a group
        const groupCheck = isGroup(chatId);
        if (!groupCheck.isGroup) return;
        
        // Get antilink settings
        const settings = await getAntilinkSetting(chatId);
        if (!settings.enabled) return;
        
        // Check if message contains link
        const { hasLink, linkType } = containsLink(userMessage);
        if (!hasLink) return;
        
        // Check if sender is owner (exempt)
        const ownerCheck = await isOwner(senderId);
        if (ownerCheck.isOwner) return;
        
        // Check if sender is admin (exempt - bot stays quiet)
        const adminCheck = await isAdmin(sock, chatId, senderId);
        if (adminCheck.isSenderAdmin) return;
        
        const action = settings.action || 'delete';
        const randomQuote = getRandomQuote();
        const isSilent = await getSilentMode(chatId);
        
        // Delete the link message
        try {
            await sock.sendMessage(chatId, { delete: message.key });
        } catch {}
        
        // ========== KICK ACTION ==========
        if (action === 'kick') {
            if (!adminCheck.isBotAdmin) {
                if (!isSilent) {
                    const kickErrorMsg = `╭──❍「 *🔗 ANTILINK PROTECTION* 」❍
├ 👤 *User* : @${senderId.split('@')[0]}
├ 🔗 *Link* : ${linkType}
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
                    const kickMsg = `╭──❍「 *🔗 ANTILINK PROTECTION* 」❍
├ 👤 *User* : @${senderId.split('@')[0]}
├ 🔗 *Link* : ${linkType}
├ 🚫 *Action* : KICKED
╰──────❍

✨ *"${randomQuote}"* ✨

_📌 Links are not allowed in this group_
▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`;
                    await sendStyledMessage(sock, chatId, kickMsg, [senderId], message);
                }
            } catch (error) {
                if (!isSilent) {
                    const kickFailMsg = `╭──❍「 *🔗 ANTILINK PROTECTION* 」❍
├ 👤 *User* : @${senderId.split('@')[0]}
├ 🔗 *Link* : ${linkType}
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
                        const kickAfterWarnMsg = `╭──❍「 *🔗 ANTILINK PROTECTION* 」❍
├ 👤 *User* : @${senderId.split('@')[0]}
├ 🔗 *Link* : ${linkType}
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
                        const noKickMsg = `╭──❍「 *🔗 ANTILINK PROTECTION* 」❍
├ 👤 *User* : @${senderId.split('@')[0]}
├ 🔗 *Link* : ${linkType}
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
                const warnMsg = `╭──❍「 *🔗 ANTILINK PROTECTION* 」❍
├ 👤 *User* : @${senderId.split('@')[0]}
├ 🔗 *Link* : ${linkType}
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
        
        // ========== DELETE ACTION (default) ==========
        if (action === 'delete') {
            // Only send message if silent mode is OFF
            if (!isSilent) {
                const deleteMsg = `╭──❍「 *🔗 ANTILINK PROTECTION* 」❍
├ 👤 *User* : @${senderId.split('@')[0]}
├ 🔗 *Link* : ${linkType}
├ 🗑️ *Action* : Message deleted
╰──────❍

✨ *"${randomQuote}"* ✨

_📌 Links are not allowed in this group_
▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`;
                await sendStyledMessage(sock, chatId, deleteMsg, [senderId], message);
            }
            // If silent mode is ON, do absolutely nothing - just delete and exit
            return;
        }
        
    } catch (error) {
        console.error('Link detection error:', error);
    }
}

// ============================================================
// COMMAND
// ============================================================

export default {
    name: 'antilink',
    description: 'Prevent users from sending links in the group',
    icon: '🔗',
    alias: ['alink', 'linkblock', 'antilinkv2'],
    category: 'group',
    groupOnly: true,
    
    async execute(sock, msg, args, currentPrefix, { isOwner, jidManager }) {
        
        const chatId = msg.key.remoteJid;
        const senderId = msg.key.participant || chatId;
        
        // Check if it's a group
        const groupCheck = isGroup(chatId);
        if (!groupCheck.isGroup) {
            const notGroupMsg = `╭──❍「 *🔗 ANTILINK PROTECTION* 」❍
├ ❌ *Error* : This command only works in groups!
╰──────❍

▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`;
            await sendStyledMessage(sock, chatId, notGroupMsg, [], msg);
            return;
        }
        
        // Check if sender is owner
        const ownerCheck = await isOwner(senderId, jidManager);
        const isOwnerUser = ownerCheck.isOwner;
        
        // Check admin status
        const adminCheck = await isAdmin(sock, chatId, senderId);
        const isSenderAdmin = adminCheck.isSenderAdmin;
        const isBotAdmin = adminCheck.isBotAdmin;
        
        const isAuthorized = isOwnerUser || isSenderAdmin;
        
        if (!isAuthorized) {
            const notAuthMsg = `╭──❍「 *🔗 ANTILINK PROTECTION* 」❍
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
            const settings = await getAntilinkSetting(chatId);
            const isSilent = await getSilentMode(chatId);
            const statusIcon = settings.enabled ? '✅' : '❌';
            const actionText = (settings.action || 'delete').toUpperCase();
            const silentIcon = isSilent ? '🔇' : '🔊';
            const silentText = isSilent ? 'SILENT (no messages)' : 'NORMAL (with warnings)';
            
            const statusMsg = `╭──❍「 *🔗 ANTILINK PROTECTION* 」❍
├ 📵 *Status* : ${statusIcon} ${settings.enabled ? 'ENABLED' : 'DISABLED'}
├ ⚡ *Action* : ${actionText}
├ ${silentIcon} *Mode* : ${silentText}
├ 🤖 *Bot Admin* : ${isBotAdmin ? '✅' : '❌'}
╰─┬────❍
╭─┴─❍「 *📋 COMMANDS* 」❍
│ 🔧 ${currentPrefix}antilink on - Enable protection
│ 🔧 ${currentPrefix}antilink off - Disable protection
│ 🔧 ${currentPrefix}antilink delete - Delete + warnings
│ 🔧 ${currentPrefix}antilink delete silent - Delete silently (no messages)
│ 🔧 ${currentPrefix}antilink warn - Warn then kick
│ 🔧 ${currentPrefix}antilink kick - Kick immediately
│ 🔧 ${currentPrefix}antilink silent - Toggle silent mode
╰──────❍
╭─┴─❍「 *📊 INFO* 」❍
├ 📅 *Date* : ${date}
├ 📆 *Day* : ${day}
├ ⏰ *Time* : ${time} EAT
├ 🔗 *Protected* : WhatsApp, Telegram, All links
├ 👑 *Exempt* : Admins, Owner
╰──────❍

✨ *"${randomQuote}"* ✨

_📌 Admins and Owner are EXEMPT from antilink_
▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`;
            await sendStyledMessage(sock, chatId, statusMsg, [], msg);
            return;
        }
        
        // ========== ENABLE ==========
        if (action === 'on') {
            const current = await getAntilinkSetting(chatId);
            if (current.enabled) {
                const alreadyMsg = `╭──❍「 *🔗 ANTILINK PROTECTION* 」❍
├ ⚠️ *Status* : Already ENABLED
├ 📝 *Action* : ${(current.action || 'delete').toUpperCase()}
╰──────❍

▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`;
                await sendStyledMessage(sock, chatId, alreadyMsg, [], msg);
                return;
            }
            await setAntilinkSetting(chatId, 'delete');
            const successMsg = `╭──❍「 *🔗 ANTILINK PROTECTION* 」❍
├ ✅ *Status* : ENABLED
├ ⚡ *Action* : DELETE
├ 👑 *Exempt* : Admins & Owner
╰──────❍

✨ *"${randomQuote}"* ✨

_📌 Links will now be deleted automatically_
▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`;
            await sendStyledMessage(sock, chatId, successMsg, [], msg);
            return;
        }
        
        // ========== DISABLE ==========
        if (action === 'off') {
            await removeAntilinkSetting(chatId);
            const disableMsg = `╭──❍「 *🔗 ANTILINK PROTECTION* 」❍
├ ❌ *Status* : DISABLED
├ 📝 *Note* : Links will be allowed
╰──────❍

▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`;
            await sendStyledMessage(sock, chatId, disableMsg, [], msg);
            return;
        }
        
        // ========== SET ACTION ==========
        if (action === 'delete') {
            await setAntilinkSetting(chatId, 'delete');
            
            // Check if user wants silent mode
            const silentMode = args[1]?.toLowerCase() === 'silent';
            await setSilentMode(chatId, silentMode);
            
            const actionSetMsg = `╭──❍「 *🔗 ANTILINK PROTECTION* 」❍
├ ✅ *Action* : Set to DELETE
├ 🔇 *Mode* : ${silentMode ? 'SILENT (no messages)' : 'NORMAL (with warnings)'}
╰──────❍

▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`;
            await sendStyledMessage(sock, chatId, actionSetMsg, [], msg);
            return;
        }
        
        if (action === 'warn') {
            await setAntilinkSetting(chatId, 'warn');
            // Reset silent mode when switching to warn
            await setSilentMode(chatId, false);
            
            const actionSetMsg = `╭──❍「 *🔗 ANTILINK PROTECTION* 」❍
├ ✅ *Action* : Set to WARN
├ 📝 *Description* : Warn users (3 warnings then kick)
╰──────❍

▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`;
            await sendStyledMessage(sock, chatId, actionSetMsg, [], msg);
            return;
        }
        
        if (action === 'kick') {
            await setAntilinkSetting(chatId, 'kick');
            // Reset silent mode when switching to kick
            await setSilentMode(chatId, false);
            
            const actionSetMsg = `╭──❍「 *🔗 ANTILINK PROTECTION* 」❍
├ ✅ *Action* : Set to KICK
├ 📝 *Description* : Kick users immediately
╰──────❍

▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`;
            await sendStyledMessage(sock, chatId, actionSetMsg, [], msg);
            return;
        }
        
        // ========== TOGGLE SILENT MODE ==========
        if (action === 'silent') {
            const currentSettings = await getAntilinkSetting(chatId);
            if (!currentSettings.enabled) {
                const notEnabledMsg = `╭──❍「 *🔗 ANTILINK PROTECTION* 」❍
├ ❌ *Error* : Antilink is not enabled!
├ 📝 *First enable with* : ${currentPrefix}antilink on
╰──────❍

▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`;
                await sendStyledMessage(sock, chatId, notEnabledMsg, [], msg);
                return;
            }
            
            if (currentSettings.action !== 'delete') {
                const wrongActionMsg = `╭──❍「 *🔗 ANTILINK PROTECTION* 」❍
├ ❌ *Error* : Silent mode only works with DELETE action!
├ 📝 *Current action* : ${currentSettings.action.toUpperCase()}
├ 🔧 *Use* : ${currentPrefix}antilink delete
╰──────❍

▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`;
                await sendStyledMessage(sock, chatId, wrongActionMsg, [], msg);
                return;
            }
            
            const currentSilent = await getSilentMode(chatId);
            const newSilent = !currentSilent;
            await setSilentMode(chatId, newSilent);
            
            const silentMsg = `╭──❍「 *🔗 ANTILINK PROTECTION* 」❍
├ 🔇 *Silent Mode* : ${newSilent ? 'ENABLED' : 'DISABLED'}
├ 📝 *Effect* : ${newSilent ? 'Links deleted silently - No messages sent' : 'Links deleted with warning messages'}
╰──────❍

▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`;
            await sendStyledMessage(sock, chatId, silentMsg, [], msg);
            return;
        }
        
        // Invalid command
        const invalidCmdMsg = `╭──❍「 *🔗 ANTILINK PROTECTION* 」❍
├ ❌ *Invalid command* : ${action}
├ 📝 *Use* : ${currentPrefix}antilink for help
╰──────❍

▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`;
        await sendStyledMessage(sock, chatId, invalidCmdMsg, [], msg);
    }
};

// Export handlers for use in index.js
export { setAntilinkSetting, getAntilinkSetting, removeAntilinkSetting };