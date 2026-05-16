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
import { getAntiEmail } from '../../stanymedia/antiemail.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Data directory
const DATA_DIR = path.join(process.cwd(), 'stanydata');
const ANTIEMAIL_FILE = path.join(DATA_DIR, 'antiemail_settings.json');

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
            
            const statusMsg = `╭──❍「 *📧 ANTI-EMAIL PROTECTION* 」❍
├ 📵 *Status* : ${statusIcon} ${statusText}
├ 🎯 *Action* : ${actionText}
├ 🤖 *Bot Admin* : ${isBotAdmin ? '✅' : '❌'}
╰─┬────❍
╭─┴─❍「 *📋 COMMANDS* 」❍
│ 🔧 ${currentPrefix}antiemail on - Enable protection
│ 🔧 ${currentPrefix}antiemail off - Disable protection
│ 🔧 ${currentPrefix}antiemail set delete - Delete only
│ 🔧 ${currentPrefix}antiemail set warn - Delete + Warn
│ 🔧 ${currentPrefix}antiemail set kick - Delete + Kick
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
        
        // ========== SET ACTION ==========
        if (action === 'set') {
            const newAction = args[1]?.toLowerCase();
            
            if (!newAction || !['delete', 'warn', 'kick'].includes(newAction)) {
                const usageMsg = `╭──❍「 *📧 ANTI-EMAIL* 」❍
├ ❌ *Usage* : ${currentPrefix}antiemail set delete|warn|kick
├ 📝 *Example* : ${currentPrefix}antiemail set warn
╰──────❍

_📌 Available actions: delete, warn, kick_
▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`;
                await sendStyledMessage(sock, chatId, usageMsg, [], msg);
                return;
            }
            
            if (newAction !== 'delete' && newAction !== 'warn' && !isBotAdmin) {
                const warnNoAdminMsg = `╭──❍「 *📧 ANTI-EMAIL* 」❍
├ ⚠️ *Warning* : Action set to ${newAction.toUpperCase()}
├ ❌ *Note* : Bot needs admin rights for this action
╰──────❍

_📌 Please make bot admin for full protection_
▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`;
                await sendStyledMessage(sock, chatId, warnNoAdminMsg, [], msg);
            }
            
            await setAntiEmail(chatId, config.enabled, newAction);
            
            const actionDesc = {
                delete: 'Delete email messages only',
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
export { setAntiEmail, removeAntiEmail };