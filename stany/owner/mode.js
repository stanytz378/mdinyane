/*****************************************************************************
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
import { channelInfo, botImagePath } from '../../stanytz/messageConfig.js';

const OWNER_FILE = path.join(process.cwd(), 'owner.json');
const MODE_FILE = path.join(process.cwd(), 'stanydata', 'botmode.json');
const DATA_DIR = path.join(process.cwd(), 'stanydata');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

// Load or create mode config
let botModeConfig = { mode: 'public' };
try {
    if (fs.existsSync(MODE_FILE)) {
        const saved = JSON.parse(fs.readFileSync(MODE_FILE, 'utf8'));
        botModeConfig = { ...botModeConfig, ...saved };
    } else {
        fs.writeFileSync(MODE_FILE, JSON.stringify(botModeConfig, null, 2));
    }
} catch (e) {
    console.error('Error loading mode config:', e);
}

// Export config for other modules
export const botMode = botModeConfig;

// Function to save mode config
async function saveModeConfig() {
    try {
        fs.writeFileSync(MODE_FILE, JSON.stringify(botModeConfig, null, 2));
        return true;
    } catch (error) {
        console.error('Error saving mode config:', error);
        return false;
    }
}

// Function to update mode
export function updateBotMode(mode) {
    const validModes = ['public', 'private', 'groups', 'self'];
    if (!validModes.includes(mode)) return false;
    botModeConfig.mode = mode;
    saveModeConfig();
    return true;
}

// Function to get current mode
export function getBotMode() {
    return botModeConfig.mode;
}

// Function to check if bot should respond in a chat
export function shouldBotRespond(chatId, isOwner = false) {
    const mode = botModeConfig.mode;
    const isGroup = chatId?.endsWith('@g.us');
    
    // Owner always gets response regardless of mode
    if (isOwner) return true;
    
    switch (mode) {
        case 'public':
            return true;  // Respond everywhere
        case 'private':
            return !isGroup;  // Only private chats
        case 'groups':
            return isGroup;  // Only groups
        case 'self':
            return false;  // Only owner (already handled above)
        default:
            return true;
    }
}

// ============================================================
// ENHANCED OWNER CHECK
// ============================================================

function isUserOwner(senderId, sock) {
    try {
        if (!senderId) return false;
        
        // Clean the sender number
        let senderNumber = senderId;
        if (senderNumber.includes('@')) senderNumber = senderNumber.split('@')[0];
        if (senderNumber.includes(':')) senderNumber = senderNumber.split(':')[0];
        senderNumber = senderNumber.replace(/[^0-9]/g, '');
        
        if (!senderNumber || senderNumber.length < 5) return false;
        
        // Method 1: Check owner.json file
        if (fs.existsSync(OWNER_FILE)) {
            try {
                const ownerData = JSON.parse(fs.readFileSync(OWNER_FILE, 'utf8'));
                const ownerNumber = ownerData.OWNER_CLEAN_NUMBER || ownerData.OWNER_NUMBER;
                if (ownerNumber && senderNumber === ownerNumber) {
                    return true;
                }
            } catch (e) {}
        }
        
        // Method 2: Check from connected device (sock)
        if (sock && sock.user && sock.user.id) {
            let botNumber = sock.user.id;
            if (botNumber.includes('@')) botNumber = botNumber.split('@')[0];
            if (botNumber.includes(':')) botNumber = botNumber.split(':')[0];
            botNumber = botNumber.replace(/[^0-9]/g, '');
            
            if (senderNumber === botNumber) {
                // Auto-save owner.json if not exists
                if (!fs.existsSync(OWNER_FILE)) {
                    const ownerData = {
                        OWNER_JID: sock.user.id,
                        OWNER_NUMBER: botNumber,
                        OWNER_CLEAN_JID: sock.user.id,
                        OWNER_CLEAN_NUMBER: botNumber,
                        linkedAt: new Date().toISOString()
                    };
                    fs.writeFileSync(OWNER_FILE, JSON.stringify(ownerData, null, 2));
                    console.log(`[OWNER] Auto-saved owner: ${botNumber}`);
                }
                return true;
            }
        }
        
        // Method 3: Check environment variable
        const envOwner = process.env.OWNER_NUMBER;
        if (envOwner) {
            const cleanEnv = envOwner.replace(/[^0-9]/g, '');
            if (senderNumber === cleanEnv) {
                return true;
            }
        }
        
        return false;
    } catch (error) {
        console.error('Owner check error:', error);
        return false;
    }
}

// ============================================================
// SEND STYLED MESSAGE
// ============================================================

async function sendStyledMessage(sock, chatId, text, mentions = [], quoted = null) {
    try {
        const imageFullPath = path.join(process.cwd(), botImagePath);
        const imageExists = fs.existsSync(imageFullPath);
        
        const forwardContext = {
            forwardingScore: 999,
            isForwarded: true,
            forwardedNewsletterMessageInfo: {
                newsletterJid: '120363404317544295@newsletter',
                newsletterName: '✨ᴍᴅɪɴʏᴀɴᴇ ʙᴏᴛ💫',
                serverMessageId: Date.now().toString()
            }
        };
        
        if (imageExists) {
            await sock.sendMessage(chatId, {
                image: fs.readFileSync(imageFullPath),
                caption: text,
                contextInfo: forwardContext,
                mentions: mentions
            }, { quoted: quoted });
        } else {
            await sock.sendMessage(chatId, {
                text: text,
                contextInfo: forwardContext,
                mentions: mentions
            }, { quoted: quoted });
        }
    } catch (error) {
        try {
            await sock.sendMessage(chatId, {
                text: text,
                mentions: mentions
            }, { quoted: quoted });
        } catch (e) {
            console.error('Failed to send message:', e);
        }
    }
}

// ============================================================
// COMMAND EXPORT
// ============================================================

export default {
    name: 'mode',
    description: 'Change bot mode (public, private, groups, self)',
    icon: '🤖',
    alias: ['botmode', 'setmode', 'modebot'],
    category: 'owner',
    ownerOnly: true,
    
    async execute(sock, msg, args, currentPrefix, options) {
        const chatId = msg.key.remoteJid;
        const senderId = msg.key.participant || chatId;
        
        // Check if sender is owner
        const isOwnerUser = isUserOwner(senderId, sock);
        
        if (!isOwnerUser) {
            const senderName = senderId.split('@')[0];
            await sendStyledMessage(sock, chatId, `╭──❍「 *🤖 BOT MODE* 」❍
├ 👤 @${senderName}
├ ❌ *Owner only command!*
╰──────❍
▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`, [senderId], msg);
            return;
        }
        
        const action = args[0]?.toLowerCase();
        const now = moment().tz('Africa/Dar_es_Salaam');
        const date = now.format('DD/MM/YYYY');
        const time = now.format('HH:mm:ss');
        
        // Get owner info
        let ownerNumber = 'Not set';
        try {
            if (fs.existsSync(OWNER_FILE)) {
                const ownerData = JSON.parse(fs.readFileSync(OWNER_FILE, 'utf8'));
                ownerNumber = ownerData.OWNER_CLEAN_NUMBER || ownerData.OWNER_NUMBER || 'Not set';
            } else if (sock.user) {
                ownerNumber = sock.user.id.split('@')[0];
            }
        } catch (e) {}
        
        // Mode display info
        const modeEmoji = {
            public: '🌍',
            private: '💬',
            groups: '👥',
            self: '🔒'
        }[botModeConfig.mode] || '🤖';
        
        const modeDesc = {
            public: 'Bot works in BOTH private chats AND groups',
            private: 'Bot works ONLY in private chats (one-on-one)',
            groups: 'Bot works ONLY in groups',
            self: 'Bot works ONLY for owner'
        }[botModeConfig.mode] || 'Bot works everywhere';
        
        // STATUS COMMAND
        if (!action || action === 'status') {
            const statusMsg = `╭──❍「 *🤖 BOT MODE* 」❍
├ ${modeEmoji} *Current Mode* : ${botModeConfig.mode.toUpperCase()}
├ 📝 *Description* : ${modeDesc}
├ 👑 *Owner* : +${ownerNumber}
├ 📅 *Date* : ${date}
├ ⏰ *Time* : ${time} EAT
╰─┬────❍
╭─┴─❍「 *📋 AVAILABLE MODES* 」❍
│ 🌍 *public* - Private chats & Groups (default)
│ 💬 *private* - Private chats only
│ 👥 *groups* - Groups only
│ 🔒 *self* - Owner only
╰─┬────❍
╭─┴─❍「 *📋 COMMANDS* 」❍
│ 🔧 ${currentPrefix}mode public
│ 🔧 ${currentPrefix}mode private
│ 🔧 ${currentPrefix}mode groups
│ 🔧 ${currentPrefix}mode self
│ 🔧 ${currentPrefix}mode status - Show status
╰──────❍

▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`;
            await sendStyledMessage(sock, chatId, statusMsg, [], msg);
            return;
        }
        
        // CHANGE TO PUBLIC MODE
        if (action === 'public') {
            botModeConfig.mode = 'public';
            await saveModeConfig();
            await sendStyledMessage(sock, chatId, `╭──❍「 *🤖 BOT MODE* 」❍
├ 🌍 *Mode Changed* : PUBLIC
├ 📝 Bot works in private chats AND groups
╰──────❍
▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`, [], msg);
            console.log(`[MODE] Changed to PUBLIC by ${senderId.split('@')[0]}`);
            return;
        }
        
        // CHANGE TO PRIVATE MODE
        if (action === 'private') {
            botModeConfig.mode = 'private';
            await saveModeConfig();
            await sendStyledMessage(sock, chatId, `╭──❍「 *🤖 BOT MODE* 」❍
├ 💬 *Mode Changed* : PRIVATE
├ 📝 Bot works ONLY in private chats
╰──────❍
▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`, [], msg);
            console.log(`[MODE] Changed to PRIVATE by ${senderId.split('@')[0]}`);
            return;
        }
        
        // CHANGE TO GROUPS MODE
        if (action === 'groups') {
            botModeConfig.mode = 'groups';
            await saveModeConfig();
            await sendStyledMessage(sock, chatId, `╭──❍「 *🤖 BOT MODE* 」❍
├ 👥 *Mode Changed* : GROUPS
├ 📝 Bot works ONLY in groups
╰──────❍
▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`, [], msg);
            console.log(`[MODE] Changed to GROUPS by ${senderId.split('@')[0]}`);
            return;
        }
        
        // CHANGE TO SELF MODE
        if (action === 'self') {
            botModeConfig.mode = 'self';
            await saveModeConfig();
            await sendStyledMessage(sock, chatId, `╭──❍「 *🤖 BOT MODE* 」❍
├ 🔒 *Mode Changed* : SELF
├ 📝 Bot works ONLY for owner
╰──────❍
▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`, [], msg);
            console.log(`[MODE] Changed to SELF by ${senderId.split('@')[0]}`);
            return;
        }
        
        // INVALID MODE
        await sendStyledMessage(sock, chatId, `╭──❍「 *🤖 BOT MODE* 」❍
├ ❌ *Invalid mode* : "${action}"
├ 📝 *Valid modes* : public, private, groups, self
├ 📝 *Example* : ${currentPrefix}mode public
╰──────❍
▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`, [], msg);
    }
};