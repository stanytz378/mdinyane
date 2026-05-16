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
const ANTISPAM_FILE = path.join(DATA_DIR, 'antispam_settings.json');

if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

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
// SPAM TRACKER
// ============================================================
const spamTracker = new Map();
const metaCache = new Map();
const META_TTL_MS = 5 * 60 * 1000;

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
// CONFIG FUNCTIONS
// ============================================================

const DEFAULT_CONFIG = {
    enabled: false,
    maxMessages: 5,
    windowSeconds: 5,
    action: 'warn',
    warnCount: 3
};

async function loadConfig() {
    try {
        if (fs.existsSync(ANTISPAM_FILE)) {
            return JSON.parse(fs.readFileSync(ANTISPAM_FILE, 'utf8'));
        }
        return {};
    } catch {
        return {};
    }
}

async function saveConfig(config) {
    try {
        fs.writeFileSync(ANTISPAM_FILE, JSON.stringify(config, null, 2));
        return true;
    } catch (error) {
        console.error('Error saving antispam config:', error);
        return false;
    }
}

async function getGroupConfig(chatId) {
    const config = await loadConfig();
    return config[chatId] || { ...DEFAULT_CONFIG };
}

async function setGroupConfig(chatId, updates) {
    const config = await loadConfig();
    config[chatId] = { ...(config[chatId] || DEFAULT_CONFIG), ...updates };
    await saveConfig(config);
    return config[chatId];
}

// ============================================================
// CACHE HELPERS
// ============================================================

async function getCachedParticipants(sock, chatId) {
    const cached = metaCache.get(chatId);
    if (cached && (Date.now() - cached.fetchedAt) < META_TTL_MS) {
        return cached.participants;
    }
    try {
        const metadata = await sock.groupMetadata(chatId);
        const participants = metadata?.participants || [];
        metaCache.set(chatId, { participants, fetchedAt: Date.now() });
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
        
        // Check if bot is admin (needed for kick/mute)
        const botId = sock.user.id.split(':')[0] + '@s.whatsapp.net';
        const isBotAdmin = isParticipantAdmin(participants, botId);
        
        // Check if sender is admin (exempt)
        const isSenderAdmin = isParticipantAdmin(participants, senderId);
        if (isSenderAdmin) return false;
        
        const now = Date.now();
        const windowMs = groupConfig.windowSeconds * 1000;
        
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
        
        if (groupConfig.action === 'warn') {
            userData.warns++;
            const warnsLeft = groupConfig.warnCount - userData.warns;
            
            if (warnsLeft > 0) {
                const warnMsg = `╭──❍「 *🛡️ ANTISPAM PROTECTION* 」❍
├ 👤 *User* : @${senderId.split('@')[0]}
├ ⚠️ *Warning* : ${userData.warns}/${groupConfig.warnCount}
├ 📝 *Remaining* : ${warnsLeft} warning(s) left
╰──────❍

✨ *"${randomQuote}"* ✨

_📌 Please slow down! Sending too many messages too quickly_
▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`;
                await sendStyledMessage(sock, chatId, warnMsg, [senderId], message);
            } else {
                userData.warns = 0;
                if (!isBotAdmin) {
                    const noAdminMsg = `╭──❍「 *🛡️ ANTISPAM PROTECTION* 」❍
├ 👤 *User* : @${senderId.split('@')[0]}
├ ⚠️ *Status* : Max warnings reached
├ ❌ *Error* : Make me admin to kick!
╰──────❍

✨ *"${randomQuote}"* ✨

_📌 User has reached warning limit but bot is not admin_
▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`;
                    await sendStyledMessage(sock, chatId, noAdminMsg, [senderId], message);
                } else {
                    await sock.groupParticipantsUpdate(chatId, [senderId], 'remove');
                    const kickedMsg = `╭──❍「 *🛡️ ANTISPAM PROTECTION* 」❍
├ 👤 *User* : @${senderId.split('@')[0]}
├ 🚫 *Action* : KICKED
├ 📝 *Reason* : Repeated spamming (${groupConfig.warnCount} warnings)
╰──────❍

✨ *"${randomQuote}"* ✨

_📌 User has been removed for spamming_
▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`;
                    await sendStyledMessage(sock, chatId, kickedMsg, [senderId], message);
                }
            }
            return true;
        }
        
        if (groupConfig.action === 'kick') {
            if (!isBotAdmin) {
                const noAdminKickMsg = `╭──❍「 *🛡️ ANTISPAM PROTECTION* 」❍
├ 👤 *User* : @${senderId.split('@')[0]}
├ 🚫 *Action* : Spam detected
├ ❌ *Error* : Make me admin to kick!
╰──────❍

✨ *"${randomQuote}"* ✨

_📌 Please promote bot to admin for full protection_
▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`;
                await sendStyledMessage(sock, chatId, noAdminKickMsg, [senderId], message);
            } else {
                await sock.groupParticipantsUpdate(chatId, [senderId], 'remove');
                const kickedMsg = `╭──❍「 *🛡️ ANTISPAM PROTECTION* 」❍
├ 👤 *User* : @${senderId.split('@')[0]}
├ 🚫 *Action* : KICKED
├ 📝 *Reason* : Spamming (${groupConfig.maxMessages} msgs in ${groupConfig.windowSeconds}s)
╰──────❍

✨ *"${randomQuote}"* ✨

_📌 User has been removed for spamming_
▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`;
                await sendStyledMessage(sock, chatId, kickedMsg, [senderId], message);
            }
            return true;
        }
        
        return false;
    } catch (error) {
        console.error('Error in antispam handler:', error);
        return false;
    }
}

// ============================================================
// INVALIDATE CACHE
// ============================================================

export function invalidateGroupCache(chatId) {
    metaCache.delete(chatId);
    spamTracker.delete(chatId);
}

// ============================================================
// MAIN COMMAND
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
            const notAuthMsg = `╭──❍「 *🛡️ ANTISPAM* 」❍
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
        
        const groupConfig = await getGroupConfig(chatId);
        const randomQuote = getRandomQuote();
        const botName = 'MDINYANE';
        
        // Check if bot is admin
        const participants = await getCachedParticipants(sock, chatId);
        const botId = sock.user.id.split(':')[0] + '@s.whatsapp.net';
        const isBotAdmin = isParticipantAdmin(participants, botId);
        
        const action = args[0]?.toLowerCase();
        
        // ========== SHOW STATUS (default) ==========
        if (!action || action === 'status') {
            const statusIcon = groupConfig.enabled ? '✅' : '❌';
            const statusText = groupConfig.enabled ? 'ENABLED' : 'DISABLED';
            const actionText = groupConfig.action.toUpperCase();
            
            const statusMsg = `╭──❍「 *🛡️ ANTISPAM PROTECTION* 」❍
├ 📵 *Status* : ${statusIcon} ${statusText}
├ ⚡ *Limit* : ${groupConfig.maxMessages} messages in ${groupConfig.windowSeconds}s
├ 🚫 *Action* : ${actionText}
├ ⚠️ *Warn Limit* : ${groupConfig.warnCount} warns before kick
├ 🤖 *Bot Admin* : ${isBotAdmin ? '✅' : '❌'}
╰─┬────❍
╭─┴─❍「 *📋 COMMANDS* 」❍
│ 🔧 ${currentPrefix}antispam on - Enable protection
│ 🔧 ${currentPrefix}antispam off - Disable protection
│ 🔧 ${currentPrefix}antispam set <msgs> <secs> - Set limit
│ 🔧 ${currentPrefix}antispam action warn/kick - Set action
│ 🔧 ${currentPrefix}antispam warns <num> - Set warn limit
╰──────❍
╭─┴─❍「 *📊 INFO* 」❍
├ 📅 *Date* : ${date}
├ 📆 *Day* : ${day}
├ ⏰ *Time* : ${time} EAT
├ 👑 *Exempt* : Admins & Owner
╰──────❍

✨ *"${randomQuote}"* ✨

_📌 Admins and Owner are EXEMPT from antispam_
▰▰▰ *©️ ${botName.toUpperCase()} BY STANY TZ* ▰▰▰`;
            await sendStyledMessage(sock, chatId, statusMsg, [], msg);
            return;
        }
        
        // ========== ENABLE ==========
        if (action === 'on' || action === 'enable') {
            if (groupConfig.enabled) {
                const alreadyMsg = `╭──❍「 *🛡️ ANTISPAM* 」❍
├ ⚠️ *Status* : Already ENABLED
├ 📝 *Limit* : ${groupConfig.maxMessages} msgs in ${groupConfig.windowSeconds}s
╰──────❍

▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`;
                await sendStyledMessage(sock, chatId, alreadyMsg, [], msg);
                return;
            }
            
            if (groupConfig.action !== 'warn' && !isBotAdmin) {
                const warnNoAdminMsg = `╭──❍「 *🛡️ ANTISPAM* 」❍
├ ⚠️ *Warning* : Action is ${groupConfig.action.toUpperCase()}
├ ❌ *Note* : Bot needs admin rights to execute this action
╰──────❍

_📌 Please make bot admin for full protection_
▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`;
                await sendStyledMessage(sock, chatId, warnNoAdminMsg, [], msg);
            }
            
            await setGroupConfig(chatId, { enabled: true });
            
            const enableMsg = `╭──❍「 *🛡️ ANTISPAM* 」❍
├ ✅ *Status* : ENABLED
├ ⚡ *Limit* : ${groupConfig.maxMessages} msgs in ${groupConfig.windowSeconds}s
├ 🚫 *Action* : ${groupConfig.action.toUpperCase()}
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
├ ⚠️ *Status* : Already DISABLED
╰──────❍

▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`;
                await sendStyledMessage(sock, chatId, alreadyOffMsg, [], msg);
                return;
            }
            
            await setGroupConfig(chatId, { enabled: false });
            
            const disableMsg = `╭──❍「 *🛡️ ANTISPAM* 」❍
├ ❌ *Status* : DISABLED
├ 📝 *Note* : Spam protection is inactive
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
├ ❌ *Usage* : ${currentPrefix}antispam set <msgs> <seconds>
├ 📝 *Example* : ${currentPrefix}antispam set 5 10
╰──────❍

▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`;
                await sendStyledMessage(sock, chatId, usageMsg, [], msg);
                return;
            }
            
            await setGroupConfig(chatId, { maxMessages: maxMsgs, windowSeconds: windowSec });
            
            const setMsg = `╭──❍「 *🛡️ ANTISPAM* 」❍
├ ✅ *Limit Updated*
├ ⚡ *Max Messages* : ${maxMsgs}
├ ⏱️ *Time Window* : ${windowSec} seconds
╰──────❍

▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`;
            await sendStyledMessage(sock, chatId, setMsg, [], msg);
            return;
        }
        
        // ========== SET ACTION ==========
        if (action === 'action') {
            const newAction = args[1]?.toLowerCase();
            
            if (!['warn', 'kick'].includes(newAction)) {
                const invalidActionMsg = `╭──❍「 *🛡️ ANTISPAM* 」❍
├ ❌ *Invalid action* : ${newAction}
├ 📝 *Available* : warn, kick
╰──────❍

▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`;
                await sendStyledMessage(sock, chatId, invalidActionMsg, [], msg);
                return;
            }
            
            if (newAction !== 'warn' && !isBotAdmin) {
                const noAdminActionMsg = `╭──❍「 *🛡️ ANTISPAM* 」❍
├ ⚠️ *Warning* : Action set to ${newAction.toUpperCase()}
├ ❌ *Note* : Bot needs admin rights to execute this action
╰──────❍

_📌 Please make bot admin for full protection_
▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`;
                await sendStyledMessage(sock, chatId, noAdminActionMsg, [], msg);
            }
            
            await setGroupConfig(chatId, { action: newAction });
            
            const actionMsg = `╭──❍「 *🛡️ ANTISPAM* 」❍
├ ✅ *Action Updated*
├ 🚫 *Action* : ${newAction.toUpperCase()}
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
├ ❌ *Usage* : ${currentPrefix}antispam warns <number>
├ 📝 *Example* : ${currentPrefix}antispam warns 3
╰──────❍

▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`;
                await sendStyledMessage(sock, chatId, usageWarnMsg, [], msg);
                return;
            }
            
            await setGroupConfig(chatId, { warnCount: count });
            
            const warnLimitMsg = `╭──❍「 *🛡️ ANTISPAM* 」❍
├ ✅ *Warn Limit Updated*
├ ⚠️ *Warns before kick* : ${count}
╰──────❍

▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`;
            await sendStyledMessage(sock, chatId, warnLimitMsg, [], msg);
            return;
        }
        
        // ========== INVALID COMMAND ==========
        const invalidMsg = `╭──❍「 *🛡️ ANTISPAM* 」❍
├ ❌ *Invalid command* : ${action}
├ 📝 *Use* : ${currentPrefix}antispam for help
╰──────❍

▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`;
        await sendStyledMessage(sock, chatId, invalidMsg, [], msg);
    }
};

// Export for use in index.js
export { loadConfig, saveConfig, DEFAULT_CONFIG, getGroupConfig, setGroupConfig, invalidateGroupCache };