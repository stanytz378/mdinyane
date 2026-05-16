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
import { getAntiReaction } from '../../stanymedia/antireaction.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Data directory
const DATA_DIR = path.join(process.cwd(), 'stanydata');
const ANTIREACTION_FILE = path.join(DATA_DIR, 'antireaction_settings.json');

// ============================================================
// DATABASE FUNCTIONS
// ============================================================

async function loadDatabase() {
    try {
        if (fs.existsSync(ANTIREACTION_FILE)) {
            return JSON.parse(fs.readFileSync(ANTIREACTION_FILE, 'utf8'));
        }
        return {};
    } catch {
        return {};
    }
}

async function saveDatabase(data) {
    try {
        fs.writeFileSync(ANTIREACTION_FILE, JSON.stringify(data, null, 2));
        return true;
    } catch (error) {
        console.error('Error saving antireaction config:', error);
        return false;
    }
}

async function setAntiReaction(chatId, enabled, action = 'warn') {
    const data = await loadDatabase();
    data[chatId] = { 
        enabled: Boolean(enabled), 
        action: ['warn', 'kick'].includes(action) ? action : 'warn',
        updatedAt: new Date().toISOString()
    };
    await saveDatabase(data);
    return data[chatId];
}

async function removeAntiReaction(chatId) {
    const data = await loadDatabase();
    delete data[chatId];
    await saveDatabase(data);
}

// ============================================================
// QUOTES
// ============================================================
const QUOTES = [
    "I'm not lazy, I'm just on my energy saving mode.",
    "Life is short, smile while you still have teeth.",
    "No reactions allowed! 📵",
    "Keep your reactions to yourself! 😤",
    "Reacting is not welcome here! 🚫",
    "Reactions? Not today!",
    "This is a no-reaction zone! 🛡️"
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
    name: 'antireaction',
    description: 'Block reactions on messages',
    icon: '😀',
    alias: ['blockreaction', 'noreaction', 'reactblock'],
    category: 'group',
    groupOnly: true,
    
    async execute(sock, msg, args, currentPrefix, { isOwner, jidManager }) {
        
        const chatId = msg.key.remoteJid;
        const senderId = msg.key.participant || chatId;
        
        // Check if it's a group
        const groupCheck = isGroup(chatId);
        if (!groupCheck.isGroup) {
            const notGroupMsg = `╭──❍「 *😀 ANTI-REACTION* 」❍
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
            const notAuthMsg = `╭──❍「 *😀 ANTI-REACTION* 」❍
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
        
        const config = await getAntiReaction(chatId);
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
            
            const statusMsg = `╭──❍「 *😀 ANTI-REACTION PROTECTION* 」❍
├ 📵 *Status* : ${statusIcon} ${statusText}
├ 🎯 *Action* : ${actionText}
├ 🤖 *Bot Admin* : ${isBotAdmin ? '✅' : '❌'}
╰─┬────❍
╭─┴─❍「 *📋 COMMANDS* 」❍
│ 🔧 ${currentPrefix}antireaction on - Enable protection
│ 🔧 ${currentPrefix}antireaction off - Disable protection
│ 🔧 ${currentPrefix}antireaction set warn - Warn only
│ 🔧 ${currentPrefix}antireaction set kick - Kick on reaction
╰──────❍
╭─┴─❍「 *📊 INFO* 」❍
├ 📅 *Date* : ${date}
├ 📆 *Day* : ${day}
├ ⏰ *Time* : ${time} EAT
├ 👑 *Exempt* : Admins & Owner
├ 📝 *Note* : Reactions cannot be deleted, only warned/kicked
╰──────❍

✨ *"${randomQuote}"* ✨

_📌 Admins and Owner are EXEMPT from antireaction_
▰▰▰ *©️ ${botName.toUpperCase()} BY STANY TZ* ▰▰▰`;
            await sendStyledMessage(sock, chatId, statusMsg, [], msg);
            return;
        }
        
        // ========== ENABLE ==========
        if (action === 'on') {
            if (config.enabled) {
                const alreadyMsg = `╭──❍「 *😀 ANTI-REACTION* 」❍
├ ⚠️ *Status* : Already ENABLED
├ 📝 *Action* : ${config.action.toUpperCase()}
╰──────❍

▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`;
                await sendStyledMessage(sock, chatId, alreadyMsg, [], msg);
                return;
            }
            
            await setAntiReaction(chatId, true, 'warn');
            
            const enableMsg = `╭──❍「 *😀 ANTI-REACTION* 」❍
├ ✅ *Status* : ENABLED
├ 🎯 *Action* : WARN
╰──────❍

✨ *"${randomQuote}"* ✨

_📌 Reactions will now trigger warnings_
▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`;
            await sendStyledMessage(sock, chatId, enableMsg, [], msg);
            return;
        }
        
        // ========== DISABLE ==========
        if (action === 'off') {
            if (!config.enabled) {
                const alreadyOffMsg = `╭──❍「 *😀 ANTI-REACTION* 」❍
├ ⚠️ *Status* : Already DISABLED
╰──────❍

▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`;
                await sendStyledMessage(sock, chatId, alreadyOffMsg, [], msg);
                return;
            }
            
            await removeAntiReaction(chatId);
            
            const disableMsg = `╭──❍「 *😀 ANTI-REACTION* 」❍
├ ❌ *Status* : DISABLED
├ 📝 *Note* : Reactions will be allowed
╰──────❍

▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`;
            await sendStyledMessage(sock, chatId, disableMsg, [], msg);
            return;
        }
        
        // ========== SET ACTION ==========
        if (action === 'set') {
            const newAction = args[1]?.toLowerCase();
            
            if (!newAction || !['warn', 'kick'].includes(newAction)) {
                const usageMsg = `╭──❍「 *😀 ANTI-REACTION* 」❍
├ ❌ *Usage* : ${currentPrefix}antireaction set warn|kick
├ 📝 *Example* : ${currentPrefix}antireaction set kick
╰──────❍

_📌 Available actions: warn, kick_
▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`;
                await sendStyledMessage(sock, chatId, usageMsg, [], msg);
                return;
            }
            
            if (newAction === 'kick' && !isBotAdmin) {
                const warnNoAdminMsg = `╭──❍「 *😀 ANTI-REACTION* 」❍
├ ⚠️ *Warning* : Action set to ${newAction.toUpperCase()}
├ ❌ *Note* : Bot needs admin rights to kick
╰──────❍

_📌 Please make bot admin for full protection_
▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`;
                await sendStyledMessage(sock, chatId, warnNoAdminMsg, [], msg);
            }
            
            await setAntiReaction(chatId, config.enabled, newAction);
            
            const actionDesc = {
                warn: 'Send warning message',
                kick: 'Warning + Kick user'
            };
            
            const actionSetMsg = `╭──❍「 *😀 ANTI-REACTION* 」❍
├ ✅ *Action Updated*
├ 🎯 *Action* : ${newAction.toUpperCase()}
├ 📝 *Description* : ${actionDesc[newAction]}
╰──────❍

▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`;
            await sendStyledMessage(sock, chatId, actionSetMsg, [], msg);
            return;
        }
        
        // ========== INVALID COMMAND ==========
        const invalidMsg = `╭──❍「 *😀 ANTI-REACTION* 」❍
├ ❌ *Invalid command* : ${action}
├ 📝 *Use* : ${currentPrefix}antireaction for help
╰──────❍

▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`;
        await sendStyledMessage(sock, chatId, invalidMsg, [], msg);
    }
};

// Export for use in index.js
export { setAntiReaction, removeAntiReaction };