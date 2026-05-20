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
import { getAntiMedia, VALID_MEDIA_TYPES, DEFAULT_BLOCKED_TYPES, MEDIA_DESCRIPTIONS } from '../../stanymedia/antimedia.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Data directory
const DATA_DIR = path.join(process.cwd(), 'stanydata');
const ANTIMEDIA_FILE = path.join(DATA_DIR, 'antimedia_settings.json');
const SILENT_MODE_FILE = path.join(DATA_DIR, 'antimedia_silent.json');
const WARNINGS_FILE = path.join(DATA_DIR, 'antimedia_warnings.json');

if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
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
// DATABASE FUNCTIONS
// ============================================================

async function loadDatabase() {
    try {
        if (fs.existsSync(ANTIMEDIA_FILE)) {
            return JSON.parse(fs.readFileSync(ANTIMEDIA_FILE, 'utf8'));
        }
        return {};
    } catch {
        return {};
    }
}

async function saveDatabase(data) {
    try {
        fs.writeFileSync(ANTIMEDIA_FILE, JSON.stringify(data, null, 2));
        return true;
    } catch (error) {
        console.error('Error saving antimedia config:', error);
        return false;
    }
}

async function setAntiMedia(chatId, enabled, action = 'delete', blockedTypes = DEFAULT_BLOCKED_TYPES) {
    const data = await loadDatabase();
    const validTypes = Array.isArray(blockedTypes) 
        ? blockedTypes.filter(type => VALID_MEDIA_TYPES.includes(type))
        : DEFAULT_BLOCKED_TYPES;
    
    data[chatId] = { 
        enabled: Boolean(enabled), 
        action: ['delete', 'warn', 'kick'].includes(action) ? action : 'delete',
        blockedTypes: validTypes.length ? validTypes : DEFAULT_BLOCKED_TYPES,
        updatedAt: new Date().toISOString()
    };
    await saveDatabase(data);
    return data[chatId];
}

async function removeAntiMedia(chatId) {
    const data = await loadDatabase();
    delete data[chatId];
    await saveDatabase(data);
}

function getMediaDescription(type) {
    return MEDIA_DESCRIPTIONS[type] || type;
}

// ============================================================
// QUOTES
// ============================================================
const QUOTES = [
    "I'm not lazy, I'm just on my energy saving mode.",
    "Life is short, smile while you still have teeth.",
    "No media spam allowed! 🚫",
    "Keep the chat clean, no media flooding! 📱",
    "Respect the group rules!",
    "Media messages? Not today!",
    "Text only zone! ✉️",
    "This is a no-media zone! 🛡️"
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
// MAIN HANDLER - Media Detection
// ============================================================

export async function handleMediaDetection(sock, chatId, message, senderId, mediaType) {
    try {
        // Check if it's a group
        const groupCheck = isGroup(chatId);
        if (!groupCheck.isGroup) return false;
        
        // Get antimedia settings
        const config = await getAntiMedia(chatId);
        if (!config.enabled) return false;
        
        // Check if media type is blocked
        const blockedTypes = config.blockedTypes || DEFAULT_BLOCKED_TYPES;
        if (!blockedTypes.includes(mediaType)) return false;
        
        // Check if sender is owner (exempt)
        const ownerCheck = await isOwner(senderId);
        if (ownerCheck.isOwner) return false;
        
        // Check if sender is admin (exempt)
        const adminCheck = await isAdmin(sock, chatId, senderId);
        if (adminCheck.isSenderAdmin) return false;
        
        const action = config.action || 'delete';
        const randomQuote = getRandomQuote();
        const isSilent = await getSilentMode(chatId);
        const mediaDesc = getMediaDescription(mediaType);
        
        // Delete the media message
        try {
            await sock.sendMessage(chatId, { delete: message.key });
        } catch {}
        
        // ========== KICK ACTION ==========
        if (action === 'kick') {
            if (!adminCheck.isBotAdmin) {
                if (!isSilent) {
                    const kickErrorMsg = `╭──❍「 *🖼️ ANTI-MEDIA PROTECTION* 」❍
├ 👤 *User* : @${senderId.split('@')[0]}
├ 📎 *Media Type* : ${mediaDesc}
├ ❌ *Error* : Make me admin to kick!
╰──────❍

✨ *"${randomQuote}"* ✨

_📌 Please promote bot to admin for full protection_
▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`;
                    await sendStyledMessage(sock, chatId, kickErrorMsg, [senderId], message);
                }
                return false;
            }
            try {
                await sock.groupParticipantsUpdate(chatId, [senderId], "remove");
                if (!isSilent) {
                    const kickMsg = `╭──❍「 *🖼️ ANTI-MEDIA PROTECTION* 」❍
├ 👤 *User* : @${senderId.split('@')[0]}
├ 📎 *Media Type* : ${mediaDesc}
├ 🚫 *Action* : KICKED
╰──────❍

✨ *"${randomQuote}"* ✨

_📌 Media sharing is not allowed in this group_
▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`;
                    await sendStyledMessage(sock, chatId, kickMsg, [senderId], message);
                }
                return true;
            } catch (error) {
                if (!isSilent) {
                    const kickFailMsg = `╭──❍「 *🖼️ ANTI-MEDIA PROTECTION* 」❍
├ 👤 *User* : @${senderId.split('@')[0]}
├ 📎 *Media Type* : ${mediaDesc}
├ ❌ *Error* : Failed to kick user
╰──────❍

✨ *"${randomQuote}"* ✨

_📌 Check my permissions and try again_
▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`;
                    await sendStyledMessage(sock, chatId, kickFailMsg, [senderId], message);
                }
                return false;
            }
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
                        const kickAfterWarnMsg = `╭──❍「 *🖼️ ANTI-MEDIA PROTECTION* 」❍
├ 👤 *User* : @${senderId.split('@')[0]}
├ 📎 *Media Type* : ${mediaDesc}
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
                        const noKickMsg = `╭──❍「 *🖼️ ANTI-MEDIA PROTECTION* 」❍
├ 👤 *User* : @${senderId.split('@')[0]}
├ 📎 *Media Type* : ${mediaDesc}
├ ⚠️ *Warns* : ${warnCount}/3
├ ❌ *Note* : Make me admin to kick!
╰──────❍

✨ *"${randomQuote}"* ✨

_📌 User has reached warning limit_
▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`;
                        await sendStyledMessage(sock, chatId, noKickMsg, [senderId], message);
                    }
                }
                return true;
            }
            
            if (!isSilent) {
                const warnMsg = `╭──❍「 *🖼️ ANTI-MEDIA PROTECTION* 」❍
├ 👤 *User* : @${senderId.split('@')[0]}
├ 📎 *Media Type* : ${mediaDesc}
├ ⚠️ *Warning* : ${warnCount}/3
├ 📝 *Remaining* : ${remaining} warning(s) left
╰──────❍

✨ *"${randomQuote}"* ✨

_📌 Next violation may result in a kick_
▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`;
                await sendStyledMessage(sock, chatId, warnMsg, [senderId], message);
            }
            return true;
        }
        
        // ========== DELETE ACTION (default with silent support) ==========
        if (action === 'delete') {
            if (!isSilent) {
                const deleteMsg = `╭──❍「 *🖼️ ANTI-MEDIA PROTECTION* 」❍
├ 👤 *User* : @${senderId.split('@')[0]}
├ 📎 *Media Type* : ${mediaDesc}
├ 🗑️ *Action* : Message deleted
╰──────❍

✨ *"${randomQuote}"* ✨

_📌 Media sharing is not allowed in this group_
▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`;
                await sendStyledMessage(sock, chatId, deleteMsg, [senderId], message);
            }
            return true;
        }
        
        return false;
    } catch (error) {
        console.error('Media detection error:', error);
        return false;
    }
}

// ============================================================
// MAIN COMMAND
// ============================================================

export default {
    name: 'antimedia',
    description: 'Block media messages (images, videos, audio, documents, etc.)',
    icon: '🖼️',
    alias: ['blockmedia', 'nofiles', 'nomedia', 'mediaguard'],
    category: 'group',
    groupOnly: true,
    
    async execute(sock, msg, args, currentPrefix, { isOwner, jidManager }) {
        
        const chatId = msg.key.remoteJid;
        const senderId = msg.key.participant || chatId;
        
        // Check if it's a group
        const groupCheck = isGroup(chatId);
        if (!groupCheck.isGroup) {
            const notGroupMsg = `╭──❍「 *🖼️ ANTI-MEDIA* 」❍
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
            const notAuthMsg = `╭──❍「 *🖼️ ANTI-MEDIA* 」❍
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
        
        const config = await getAntiMedia(chatId);
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
            const blockedTypes = config.blockedTypes || [];
            const isSilent = await getSilentMode(chatId);
            const silentIcon = isSilent ? '🔇' : '🔊';
            const silentText = isSilent ? 'SILENT (no messages)' : 'NORMAL (with warnings)';
            
            const blockedList = blockedTypes.length 
                ? blockedTypes.map(t => `│  • ${getMediaDescription(t)}`).join('\n')
                : '│  • None';
            
            const statusMsg = `╭──❍「 *🖼️ ANTI-MEDIA PROTECTION* 」❍
├ 📵 *Status* : ${statusIcon} ${statusText}
├ 🎯 *Action* : ${actionText}
├ ${silentIcon} *Mode* : ${silentText}
├ 🤖 *Bot Admin* : ${isBotAdmin ? '✅' : '❌'}
╰─┬────❍
╭─┴─❍「 *🚫 BLOCKED MEDIA TYPES* 」❍
${blockedList}
╰─┬────❍
╭─┴─❍「 *📋 COMMANDS* 」❍
│ 🔧 ${currentPrefix}antimedia on - Enable protection
│ 🔧 ${currentPrefix}antimedia off - Disable protection
│ 🔧 ${currentPrefix}antimedia delete - Delete only
│ 🔧 ${currentPrefix}antimedia delete silent - Delete silently
│ 🔧 ${currentPrefix}antimedia warn - Warn then kick
│ 🔧 ${currentPrefix}antimedia kick - Kick immediately
│ 🔧 ${currentPrefix}antimedia silent - Toggle silent mode
│ 🔧 ${currentPrefix}antimedia types <types> - Set blocked types
╰──────❍
╭─┴─❍「 *📊 INFO* 」❍
├ 📅 *Date* : ${date}
├ 📆 *Day* : ${day}
├ ⏰ *Time* : ${time} EAT
├ 👑 *Exempt* : Admins & Owner
├ 📝 *Available Types* : ${VALID_MEDIA_TYPES.map(t => getMediaDescription(t)).join(', ')}
╰──────❍

✨ *"${randomQuote}"* ✨

_📌 Admins and Owner are EXEMPT from antimedia_
▰▰▰ *©️ ${botName.toUpperCase()} BY STANY TZ* ▰▰▰`;
            await sendStyledMessage(sock, chatId, statusMsg, [], msg);
            return;
        }
        
        // ========== ENABLE ==========
        if (action === 'on') {
            if (config.enabled) {
                const alreadyMsg = `╭──❍「 *🖼️ ANTI-MEDIA* 」❍
├ ⚠️ *Status* : Already ENABLED
├ 📝 *Action* : ${config.action.toUpperCase()}
╰──────❍

▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`;
                await sendStyledMessage(sock, chatId, alreadyMsg, [], msg);
                return;
            }
            
            await setAntiMedia(chatId, true, 'delete', DEFAULT_BLOCKED_TYPES);
            
            const enableMsg = `╭──❍「 *🖼️ ANTI-MEDIA* 」❍
├ ✅ *Status* : ENABLED
├ 🎯 *Action* : DELETE
├ 🚫 *Blocked Types* : ${DEFAULT_BLOCKED_TYPES.map(t => getMediaDescription(t)).join(', ')}
╰──────❍

✨ *"${randomQuote}"* ✨

_📌 Media messages will now be deleted automatically_
▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`;
            await sendStyledMessage(sock, chatId, enableMsg, [], msg);
            return;
        }
        
        // ========== DISABLE ==========
        if (action === 'off') {
            if (!config.enabled) {
                const alreadyOffMsg = `╭──❍「 *🖼️ ANTI-MEDIA* 」❍
├ ⚠️ *Status* : Already DISABLED
╰──────❍

▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`;
                await sendStyledMessage(sock, chatId, alreadyOffMsg, [], msg);
                return;
            }
            
            await removeAntiMedia(chatId);
            
            const disableMsg = `╭──❍「 *🖼️ ANTI-MEDIA* 」❍
├ ❌ *Status* : DISABLED
├ 📝 *Note* : Media messages will be allowed
╰──────❍

▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`;
            await sendStyledMessage(sock, chatId, disableMsg, [], msg);
            return;
        }
        
        // ========== DELETE ACTION WITH SILENT MODE ==========
        if (action === 'delete') {
            await setAntiMedia(chatId, config.enabled || true, 'delete', config.blockedTypes);
            
            const silentMode = args[1]?.toLowerCase() === 'silent';
            await setSilentMode(chatId, silentMode);
            
            const actionSetMsg = `╭──❍「 *🖼️ ANTI-MEDIA* 」❍
├ ✅ *Action* : Set to DELETE
├ 🔇 *Mode* : ${silentMode ? 'SILENT (no messages)' : 'NORMAL (with warnings)'}
╰──────❍

▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`;
            await sendStyledMessage(sock, chatId, actionSetMsg, [], msg);
            return;
        }
        
        // ========== SET WARN ==========
        if (action === 'warn') {
            if (!isBotAdmin) {
                const noAdminMsg = `╭──❍「 *🖼️ ANTI-MEDIA* 」❍
├ ⚠️ *Warning* : WARN action requires bot admin
├ ❌ *Note* : Bot needs admin rights for this action
╰──────❍

_📌 Please make bot admin for full protection_
▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`;
                await sendStyledMessage(sock, chatId, noAdminMsg, [], msg);
                return;
            }
            await setAntiMedia(chatId, config.enabled, 'warn', config.blockedTypes);
            await setSilentMode(chatId, false);
            
            const actionSetMsg = `╭──❍「 *🖼️ ANTI-MEDIA* 」❍
├ ✅ *Action* : Set to WARN
├ 📝 *Description* : Warn users (3 warnings then kick)
╰──────❍

▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`;
            await sendStyledMessage(sock, chatId, actionSetMsg, [], msg);
            return;
        }
        
        // ========== SET KICK ==========
        if (action === 'kick') {
            if (!isBotAdmin) {
                const noAdminMsg = `╭──❍「 *🖼️ ANTI-MEDIA* 」❍
├ ⚠️ *Warning* : KICK action requires bot admin
├ ❌ *Note* : Bot needs admin rights for this action
╰──────❍

_📌 Please make bot admin for full protection_
▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`;
                await sendStyledMessage(sock, chatId, noAdminMsg, [], msg);
                return;
            }
            await setAntiMedia(chatId, config.enabled, 'kick', config.blockedTypes);
            await setSilentMode(chatId, false);
            
            const actionSetMsg = `╭──❍「 *🖼️ ANTI-MEDIA* 」❍
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
                const notEnabledMsg = `╭──❍「 *🖼️ ANTI-MEDIA* 」❍
├ ❌ *Error* : Anti-media is not enabled!
├ 📝 *First enable with* : ${currentPrefix}antimedia on
╰──────❍

▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`;
                await sendStyledMessage(sock, chatId, notEnabledMsg, [], msg);
                return;
            }
            
            if (config.action !== 'delete') {
                const wrongActionMsg = `╭──❍「 *🖼️ ANTI-MEDIA* 」❍
├ ❌ *Error* : Silent mode only works with DELETE action!
├ 📝 *Current action* : ${config.action.toUpperCase()}
├ 🔧 *Use* : ${currentPrefix}antimedia delete
╰──────❍

▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`;
                await sendStyledMessage(sock, chatId, wrongActionMsg, [], msg);
                return;
            }
            
            const currentSilent = await getSilentMode(chatId);
            const newSilent = !currentSilent;
            await setSilentMode(chatId, newSilent);
            
            const silentMsg = `╭──❍「 *🖼️ ANTI-MEDIA* 」❍
├ 🔇 *Silent Mode* : ${newSilent ? 'ENABLED' : 'DISABLED'}
├ 📝 *Effect* : ${newSilent ? 'Media deleted silently - No messages sent' : 'Media deleted with warning messages'}
╰──────❍

▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`;
            await sendStyledMessage(sock, chatId, silentMsg, [], msg);
            return;
        }
        
        // ========== SET BLOCKED TYPES ==========
        if (action === 'types') {
            const typesArg = args[1];
            
            if (!typesArg) {
                const blocked = config.blockedTypes || [];
                const blockedList = blocked.length 
                    ? blocked.map(t => `│  • ${getMediaDescription(t)}`).join('\n')
                    : '│  • None';
                
                const typesMsg = `╭──❍「 *🖼️ ANTI-MEDIA* 」❍
├ 📋 *Currently Blocked Types*
${blockedList}
╰─┬────❍
╭─┴─❍「 *📝 USAGE* 」❍
│ 🔧 ${currentPrefix}antimedia types image,video,audio
╰──────❍
╭─┴─❍「 *📊 AVAILABLE TYPES* 」❍
│ ${VALID_MEDIA_TYPES.map(t => `• ${getMediaDescription(t)}`).join('\n│ ')}
╰──────❍

▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`;
                await sendStyledMessage(sock, chatId, typesMsg, [], msg);
                return;
            }
            
            const types = typesArg.split(',').map(t => t.trim().toLowerCase());
            const validTypes = types.filter(t => VALID_MEDIA_TYPES.includes(t));
            
            if (validTypes.length === 0) {
                const invalidTypesMsg = `╭──❍「 *🖼️ ANTI-MEDIA* 」❍
├ ❌ *Invalid media types*
├ 📝 *Available* : ${VALID_MEDIA_TYPES.join(', ')}
├ 📝 *Example* : ${currentPrefix}antimedia types image,video
╰──────❍

▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`;
                await sendStyledMessage(sock, chatId, invalidTypesMsg, [], msg);
                return;
            }
            
            await setAntiMedia(chatId, config.enabled, config.action, validTypes);
            
            const typesSetMsg = `╭──❍「 *🖼️ ANTI-MEDIA* 」❍
├ ✅ *Blocked Types Updated*
├ 🚫 *Now Blocking* : ${validTypes.map(t => getMediaDescription(t)).join(', ')}
╰──────❍

▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`;
            await sendStyledMessage(sock, chatId, typesSetMsg, [], msg);
            return;
        }
        
        // ========== INVALID COMMAND ==========
        const invalidMsg = `╭──❍「 *🖼️ ANTI-MEDIA* 」❍
├ ❌ *Invalid command* : ${action}
├ 📝 *Use* : ${currentPrefix}antimedia for help
╰──────❍

▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`;
        await sendStyledMessage(sock, chatId, invalidMsg, [], msg);
    }
};

// Export for use in index.js
export { setAntiMedia, removeAntiMedia, handleMediaDetection };