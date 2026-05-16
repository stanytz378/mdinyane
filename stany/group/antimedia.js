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
import { getAntiMedia, VALID_MEDIA_TYPES, DEFAULT_BLOCKED_TYPES, MEDIA_DESCRIPTIONS } from '../../stanymedia/antimedia.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Data directory
const DATA_DIR = path.join(process.cwd(), 'stanydata');
const ANTIMEDIA_FILE = path.join(DATA_DIR, 'antimedia_settings.json');

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
            const blockedList = blockedTypes.length 
                ? blockedTypes.map(t => `│  • ${getMediaDescription(t)}`).join('\n')
                : '│  • None';
            
            const statusMsg = `╭──❍「 *🖼️ ANTI-MEDIA PROTECTION* 」❍
├ 📵 *Status* : ${statusIcon} ${statusText}
├ 🎯 *Action* : ${actionText}
├ 🤖 *Bot Admin* : ${isBotAdmin ? '✅' : '❌'}
╰─┬────❍
╭─┴─❍「 *🚫 BLOCKED MEDIA TYPES* 」❍
${blockedList}
╰─┬────❍
╭─┴─❍「 *📋 COMMANDS* 」❍
│ 🔧 ${currentPrefix}antimedia on - Enable protection
│ 🔧 ${currentPrefix}antimedia off - Disable protection
│ 🔧 ${currentPrefix}antimedia set delete - Delete only
│ 🔧 ${currentPrefix}antimedia set warn - Delete + Warn
│ 🔧 ${currentPrefix}antimedia set kick - Delete + Kick
│ 🔧 ${currentPrefix}antimedia types <types> - Set blocked types
╰──────❍
╭─┴─❍「 *📊 INFO* 」❍
├ 📅 *Date* : ${date}
├ 📆 *Day* : ${day}
├ ⏰ *Time* : ${time} EAT
├ 👑 *Exempt* : Admins & Owner
├ 📝 *Available Types* : ${VALID_MEDIA_TYPES.join(', ')}
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
        
        // ========== SET ACTION ==========
        if (action === 'set') {
            const newAction = args[1]?.toLowerCase();
            
            if (!newAction || !['delete', 'warn', 'kick'].includes(newAction)) {
                const usageMsg = `╭──❍「 *🖼️ ANTI-MEDIA* 」❍
├ ❌ *Usage* : ${currentPrefix}antimedia set delete|warn|kick
├ 📝 *Example* : ${currentPrefix}antimedia set warn
╰──────❍

_📌 Available actions: delete, warn, kick_
▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`;
                await sendStyledMessage(sock, chatId, usageMsg, [], msg);
                return;
            }
            
            if (newAction !== 'delete' && newAction !== 'warn' && !isBotAdmin) {
                const warnNoAdminMsg = `╭──❍「 *🖼️ ANTI-MEDIA* 」❍
├ ⚠️ *Warning* : Action set to ${newAction.toUpperCase()}
├ ❌ *Note* : Bot needs admin rights for this action
╰──────❍

_📌 Please make bot admin for full protection_
▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`;
                await sendStyledMessage(sock, chatId, warnNoAdminMsg, [], msg);
            }
            
            await setAntiMedia(chatId, config.enabled, newAction, config.blockedTypes);
            
            const actionDesc = {
                delete: 'Delete media messages only',
                warn: 'Delete + Send warning',
                kick: 'Delete + Warning + Kick user'
            };
            
            const actionSetMsg = `╭──❍「 *🖼️ ANTI-MEDIA* 」❍
├ ✅ *Action Updated*
├ 🎯 *Action* : ${newAction.toUpperCase()}
├ 📝 *Description* : ${actionDesc[newAction]}
╰──────❍

▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`;
            await sendStyledMessage(sock, chatId, actionSetMsg, [], msg);
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
export { setAntiMedia, removeAntiMedia };
