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
const ANTISPAM_FILE = path.join(DATA_DIR, 'antispam_settings.json');
const SILENT_MODE_FILE = path.join(DATA_DIR, 'antispam_silent.json');

if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

// ============================================================
// SPAM TRACKERS
// ============================================================
const spamTracker = new Map();
const groupMetadataCache = new Map();
const META_TTL_MS = 5 * 60 * 1000;

// ============================================================
// QUOTES
// ============================================================
const QUOTES = [
    "I'm not lazy, I'm just on my energy saving mode.",
    "Life is short, smile while you still have teeth.",
    "Stop spamming! 🛑",
    "Flooding the chat? Not on my watch! 🌊❌",
    "Spam is not welcome here! 🚫",
    "Quality over quantity! 💬",
    "Slow down, take a breath! 😮‍💨",
    "Respect the chat, don't spam! ✨"
];

const getRandomQuote = () => QUOTES[Math.floor(Math.random() * QUOTES.length)];

// ============================================================
// DEFAULT CONFIG
// ============================================================
const DEFAULT_CONFIG = {
    enabled: false,
    maxMessages: 5,
    windowSeconds: 5,
    action: 'warn',
    warnCount: 3
};

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
        if (fs.existsSync(ANTISPAM_FILE)) {
            return JSON.parse(fs.readFileSync(ANTISPAM_FILE, 'utf8'));
        }
        return {};
    } catch {
        return {};
    }
}

async function saveDatabase(data) {
    try {
        fs.writeFileSync(ANTISPAM_FILE, JSON.stringify(data, null, 2));
        return true;
    } catch (error) {
        console.error('Error saving antispam config:', error);
        return false;
    }
}

async function getGroupConfig(chatId) {
    const data = await loadDatabase();
    return data[chatId] || { ...DEFAULT_CONFIG };
}

async function setGroupConfig(chatId, updates) {
    const data = await loadDatabase();
    data[chatId] = { ...(data[chatId] || DEFAULT_CONFIG), ...updates, updatedAt: new Date().toISOString() };
    await saveDatabase(data);
    return data[chatId];
}

async function removeGroupConfig(chatId) {
    const data = await loadDatabase();
    delete data[chatId];
    await saveDatabase(data);
}

// ============================================================
// CACHE HELPERS
// ============================================================

async function getCachedParticipants(sock, chatId) {
    const cached = groupMetadataCache.get(chatId);
    if (cached && (Date.now() - cached.fetchedAt) < META_TTL_MS) {
        return cached.participants;
    }
    try {
        const metadata = await sock.groupMetadata(chatId);
        const participants = metadata?.participants || [];
        groupMetadataCache.set(chatId, { participants, fetchedAt: Date.now() });
        return participants;
    } catch {
        return cached?.participants || [];
    }
}

function isParticipantAdmin(participants, jid) {
    if (!jid) return false;
    const num = jid.split('@')[0].split(':')[0];
    return participants.some((p) => {
        if (p.admin !== 'admin' && p.admin !== 'superadmin') return false;
        const pId = (p.id || '');
        const pNum = pId.split('@')[0].split(':')[0];
        const pPhone = p.phoneNumber ? p.phoneNumber.split('@')[0] : '';
        return (pId === jid || pNum === num || pPhone === num);
    });
}

// ============================================================
// INVALIDATE CACHE
// ============================================================

export function invalidateGroupCache(chatId) {
    groupMetadataCache.delete(chatId);
    spamTracker.delete(chatId);
}

// ============================================================
// MAIN SPAM HANDLER
// ============================================================

export async function handleAntiSpam(sock, chatId, message, senderId, senderIsOwnerOrSudo) {
    try {
        // Check if it's a group
        const groupCheck = isGroup(chatId);
        if (!groupCheck.isGroup) return false;
        
        if (message.key.fromMe || senderIsOwnerOrSudo) return false;
        
        const groupConfig = await getGroupConfig(chatId);
        if (!groupConfig.enabled) return false;
        
        // Get cached participants
        const participants = await getCachedParticipants(sock, chatId);
        
        // Check if bot is admin (needed for kick)
        const botId = sock.user.id.split(':')[0] + '@s.whatsapp.net';
        const isBotAdmin = isParticipantAdmin(participants, botId);
        
        // Check if sender is admin (exempt)
        const isSenderAdmin = isParticipantAdmin(participants, senderId);
        if (isSenderAdmin) return false;
        
        const now = Date.now();
        const windowMs = groupConfig.windowSeconds * 1000;
        const isSilent = await getSilentMode(chatId);
        
        if (!spamTracker.has(chatId)) spamTracker.set(chatId, new Map());
        const groupTracker = spamTracker.get(chatId);
        
        if (!groupTracker.has(senderId)) {
            groupTracker.set(senderId, { count: 1, firstMessageTime: now, warns: 0 });
            return false;
        }
        
        const userData = groupTracker.get(senderId);
        
        // Reset window if expired
        if (now - userData.firstMessageTime > windowMs) {
            userData.count = 1;
            userData.firstMessageTime = now;
            return false;
        }
        
        userData.count++;
        
        if (userData.count <= groupConfig.maxMessages) return false;
        
        // SPAM DETECTED
        userData.count = 0;
        userData.firstMessageTime = now;
        
        const randomQuote = getRandomQuote();
        
        // ========== WARN ACTION ==========
        if (groupConfig.action === 'warn') {
            userData.warns++;
            const warnsLeft = groupConfig.warnCount - userData.warns;
            
            if (warnsLeft > 0) {
                if (!isSilent) {
                    const warnMsg = `╭──❍「 *🛡️ ANTISPAM* 」❍
├ 👤 @${senderId.split('@')[0]}
├ ⚠️ Warning ${userData.warns}/${groupConfig.warnCount}
├ 📝 ${warnsLeft} more warning(s) left
├ 📊 ${groupConfig.maxMessages} msgs in ${groupConfig.windowSeconds}s
╰──────❍

✨ *"${randomQuote}"* ✨

▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`;
                    await sendStyledMessage(sock, chatId, warnMsg, [senderId], message);
                }
            } else {
                userData.warns = 0;
                if (!isBotAdmin) {
                    if (!isSilent) {
                        const noAdminMsg = `╭──❍「 *🛡️ ANTISPAM* 」❍
├ 👤 @${senderId.split('@')[0]}
├ ⚠️ Max warnings reached
├ ❌ Make me admin to kick!
╰──────❍

✨ *"${randomQuote}"* ✨

▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`;
                        await sendStyledMessage(sock, chatId, noAdminMsg, [senderId], message);
                    }
                } else {
                    await sock.groupParticipantsUpdate(chatId, [senderId], 'remove');
                    if (!isSilent) {
                        const kickedMsg = `╭──❍「 *🛡️ ANTISPAM* 」❍
├ 👤 @${senderId.split('@')[0]}
├ 🚫 KICKED
├ 📝 Repeated spamming (${groupConfig.warnCount} warnings)
╰──────❍

✨ *"${randomQuote}"* ✨

▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`;
                        await sendStyledMessage(sock, chatId, kickedMsg, [senderId], message);
                    }
                }
            }
            return true;
        }
        
        // ========== KICK ACTION ==========
        if (groupConfig.action === 'kick') {
            if (!isBotAdmin) {
                if (!isSilent) {
                    const noAdminKickMsg = `╭──❍「 *🛡️ ANTISPAM* 」❍
├ 👤 @${senderId.split('@')[0]}
├ 🚫 Spam detected
├ ❌ Make me admin to kick!
╰──────❍

✨ *"${randomQuote}"* ✨

▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`;
                    await sendStyledMessage(sock, chatId, noAdminKickMsg, [senderId], message);
                }
            } else {
                await sock.groupParticipantsUpdate(chatId, [senderId], 'remove');
                if (!isSilent) {
                    const kickedMsg = `╭──❍「 *🛡️ ANTISPAM* 」❍
├ 👤 @${senderId.split('@')[0]}
├ 🚫 KICKED
├ 📝 Spamming (${groupConfig.maxMessages} msgs in ${groupConfig.windowSeconds}s)
╰──────❍

✨ *"${randomQuote}"* ✨

▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`;
                    await sendStyledMessage(sock, chatId, kickedMsg, [senderId], message);
                }
            }
            return true;
        }
        
        return false;
    } catch (error) {
        console.error('AntiSpam handler error:', error);
        return false;
    }
}

// ============================================================
// COMMAND HANDLER
// ============================================================

export default {
    name: 'antispam',
    description: 'Configure anti-spam flood protection for groups',
    icon: '🛡️',
    alias: ['floodprotect', 'antiflood', 'spamguard'],
    category: 'group',
    groupOnly: true,
    
    async execute(sock, msg, args, currentPrefix, { isOwner, jidManager }) {
        
        const chatId = msg.key.remoteJid;
        const senderId = msg.key.participant || chatId;
        
        // Check if it's a group
        const groupCheck = isGroup(chatId);
        if (!groupCheck.isGroup) {
            const notGroupMsg = `╭──❍「 *🛡️ ANTISPAM* 」❍
├ ❌ This command only works in groups!
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
            const notAuthMsg = `╭──❍「 *🛡️ ANTISPAM* 」❍
├ 👤 @${senderId.split('@')[0]}
├ ❌ Only admins can use this command!
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
        
        const groupConfig = await getGroupConfig(chatId);
        const randomQuote = getRandomQuote();
        const botName = 'MDINYANE';
        
        // Check if bot is admin
        const participants = await getCachedParticipants(sock, chatId);
        const botId = sock.user.id.split(':')[0] + '@s.whatsapp.net';
        const isBotAdmin = isParticipantAdmin(participants, botId);
        
        const action = args[0]?.toLowerCase();
        const isSilent = await getSilentMode(chatId);
        const silentIcon = isSilent ? '🔇' : '🔊';
        const silentText = isSilent ? 'SILENT (no messages)' : 'NORMAL (with warnings)';
        
        // ========== SHOW STATUS (default) ==========
        if (!action || action === 'status') {
            const statusIcon = groupConfig.enabled ? '✅' : '❌';
            const statusText = groupConfig.enabled ? 'ENABLED' : 'DISABLED';
            const actionText = groupConfig.action.toUpperCase();
            
            const statusMsg = `╭──❍「 *🛡️ ANTISPAM* 」❍
├ 📵 *Status* : ${statusIcon} ${statusText}
├ ${silentIcon} *Mode* : ${silentText}
├ ⚡ *Limit* : ${groupConfig.maxMessages} msgs in ${groupConfig.windowSeconds}s
├ 🚫 *Action* : ${actionText}
├ ⚠️ *Warn Limit* : ${groupConfig.warnCount} warns
├ 🤖 *Bot Admin* : ${isBotAdmin ? '✅' : '❌'}
╰─┬────❍
╭─┴─❍「 *📋 COMMANDS* 」❍
│ 🔧 ${currentPrefix}antispam on - Enable
│ 🔧 ${currentPrefix}antispam off - Disable
│ 🔧 ${currentPrefix}antispam set <msgs> <secs> - Set limit
│ 🔧 ${currentPrefix}antispam action warn/kick - Set action
│ 🔧 ${currentPrefix}antispam warns <num> - Set warn limit
│ 🔧 ${currentPrefix}antispam silent - Toggle silent mode
╰──────❍
╭─┴─❍「 *📊 INFO* 」❍
├ 📅 ${date}
├ 📆 ${day}
├ ⏰ ${time} EAT
├ 👑 *Exempt* : Admins & Owner
╰──────❍

✨ *"${randomQuote}"* ✨

_📌 Admins and Owner are EXEMPT from antispam_
▰▰▰ *©️ ${botName.toUpperCase()} BY STANY TZ* ▰▰▰`;
            await sendStyledMessage(sock, chatId, statusMsg, [], msg);
            return;
        }
        
        // ========== TOGGLE SILENT MODE ==========
        if (action === 'silent') {
            if (!groupConfig.enabled) {
                const notEnabledMsg = `╭──❍「 *🛡️ ANTISPAM* 」❍
├ ❌ *Error* : Antispam is not enabled!
├ 📝 *First enable with* : ${currentPrefix}antispam on
╰──────❍

▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`;
                await sendStyledMessage(sock, chatId, notEnabledMsg, [], msg);
                return;
            }
            
            const currentSilent = await getSilentMode(chatId);
            const newSilent = !currentSilent;
            await setSilentMode(chatId, newSilent);
            
            const silentMsg = `╭──❍「 *🛡️ ANTISPAM* 」❍
├ 🔇 *Silent Mode* : ${newSilent ? 'ENABLED' : 'DISABLED'}
├ 📝 *Effect* : ${newSilent ? 'Spam actions silent - No messages sent' : 'Spam actions with warning messages'}
╰──────❍

▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`;
            await sendStyledMessage(sock, chatId, silentMsg, [], msg);
            return;
        }
        
        // ========== ENABLE ==========
        if (action === 'on' || action === 'enable') {
            if (groupConfig.enabled) {
                const alreadyMsg = `╭──❍「 *🛡️ ANTISPAM* 」❍
├ ⚠️ Already ENABLED
├ 📝 ${groupConfig.maxMessages} msgs in ${groupConfig.windowSeconds}s
╰──────❍

▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`;
                await sendStyledMessage(sock, chatId, alreadyMsg, [], msg);
                return;
            }
            
            if (groupConfig.action !== 'warn' && !isBotAdmin) {
                const warnNoAdminMsg = `╭──❍「 *🛡️ ANTISPAM* 」❍
├ ⚠️ Action: ${groupConfig.action.toUpperCase()}
├ ❌ Bot needs admin rights
╰──────❍

_📌 Make bot admin for full protection_
▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`;
                await sendStyledMessage(sock, chatId, warnNoAdminMsg, [], msg);
            }
            
            await setGroupConfig(chatId, { enabled: true });
            
            const enableMsg = `╭──❍「 *🛡️ ANTISPAM* 」❍
├ ✅ ENABLED
├ ⚡ ${groupConfig.maxMessages} msgs in ${groupConfig.windowSeconds}s
├ 🚫 Action: ${groupConfig.action.toUpperCase()}
╰──────❍

✨ *"${randomQuote}"* ✨

_📌 Spam protection is now active_
▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`;
            await sendStyledMessage(sock, chatId, enableMsg, [], msg);
            return;
        }
        
        // ========== DISABLE ==========
        if (action === 'off' || action === 'disable') {
            if (!groupConfig.enabled) {
                const alreadyOffMsg = `╭──❍「 *🛡️ ANTISPAM* 」❍
├ ⚠️ Already DISABLED
╰──────❍

▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`;
                await sendStyledMessage(sock, chatId, alreadyOffMsg, [], msg);
                return;
            }
            
            await setGroupConfig(chatId, { enabled: false });
            
            const disableMsg = `╭──❍「 *🛡️ ANTISPAM* 」❍
├ ❌ DISABLED
├ 📝 Spam protection inactive
╰──────❍

▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`;
            await sendStyledMessage(sock, chatId, disableMsg, [], msg);
            return;
        }
        
        // ========== SET LIMIT ==========
        if (action === 'set') {
            const maxMsgs = parseInt(args[1], 10);
            const windowSec = parseInt(args[2], 10);
            
            if (isNaN(maxMsgs) || isNaN(windowSec) || maxMsgs < 2 || windowSec < 1) {
                const usageMsg = `╭──❍「 *🛡️ ANTISPAM* 」❍
├ ❌ Usage: ${currentPrefix}antispam set <msgs> <secs>
├ 📝 Example: ${currentPrefix}antispam set 5 10
╰──────❍

▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`;
                await sendStyledMessage(sock, chatId, usageMsg, [], msg);
                return;
            }
            
            await setGroupConfig(chatId, { maxMessages: maxMsgs, windowSeconds: windowSec });
            
            const setMsg = `╭──❍「 *🛡️ ANTISPAM* 」❍
├ ✅ Limit Updated
├ ⚡ Max: ${maxMsgs} msgs
├ ⏱️ Window: ${windowSec} seconds
╰──────❍

▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`;
            await sendStyledMessage(sock, chatId, setMsg, [], msg);
            return;
        }
        
        // ========== SET ACTION ==========
        if (action === 'action') {
            const newAction = args[1]?.toLowerCase();
            
            if (!newAction || !['warn', 'kick'].includes(newAction)) {
                const invalidActionMsg = `╭──❍「 *🛡️ ANTISPAM* 」❍
├ ❌ Invalid: ${newAction}
├ 📝 Available: warn, kick
╰──────❍

▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`;
                await sendStyledMessage(sock, chatId, invalidActionMsg, [], msg);
                return;
            }
            
            if (newAction === 'kick' && !isBotAdmin) {
                const noAdminActionMsg = `╭──❍「 *🛡️ ANTISPAM* 」❍
├ ⚠️ Action: ${newAction.toUpperCase()}
├ ❌ Bot needs admin rights
╰──────❍

_📌 Make bot admin for full protection_
▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`;
                await sendStyledMessage(sock, chatId, noAdminActionMsg, [], msg);
            }
            
            await setGroupConfig(chatId, { action: newAction });
            
            const actionMsg = `╭──❍「 *🛡️ ANTISPAM* 」❍
├ ✅ Action Updated
├ 🚫 ${newAction.toUpperCase()}
╰──────❍

▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`;
            await sendStyledMessage(sock, chatId, actionMsg, [], msg);
            return;
        }
        
        // ========== SET WARN LIMIT ==========
        if (action === 'warns') {
            const count = parseInt(args[1], 10);
            
            if (isNaN(count) || count < 1) {
                const usageWarnMsg = `╭──❍「 *🛡️ ANTISPAM* 」❍
├ ❌ Usage: ${currentPrefix}antispam warns <num>
├ 📝 Example: ${currentPrefix}antispam warns 3
╰──────❍

▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`;
                await sendStyledMessage(sock, chatId, usageWarnMsg, [], msg);
                return;
            }
            
            await setGroupConfig(chatId, { warnCount: count });
            
            const warnLimitMsg = `╭──❍「 *🛡️ ANTISPAM* 」❍
├ ✅ Warn Limit Updated
├ ⚠️ ${count} warns before kick
╰──────❍

▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`;
            await sendStyledMessage(sock, chatId, warnLimitMsg, [], msg);
            return;
        }
        
        // ========== INVALID COMMAND ==========
        const invalidMsg = `╭──❍「 *🛡️ ANTISPAM* 」❍
├ ❌ Invalid: ${action}
├ 📝 Use: ${currentPrefix}antispam for help
╰──────❍

▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`;
        await sendStyledMessage(sock, chatId, invalidMsg, [], msg);
    }
};

// ============================================================
// EXPORTS
// ============================================================
export { getGroupConfig, setGroupConfig, removeGroupConfig, getSilentMode, setSilentMode };