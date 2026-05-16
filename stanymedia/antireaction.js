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
import { channelInfo, botImagePath } from '../stanytz/messageConfig.js';
import isAdmin from '../stanymain/isAdmin.js';
import isOwner from '../stanymain/isOwner.js';
import isGroup from '../stanymain/isGroup.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Data directory
const DATA_DIR = path.join(process.cwd(), 'stanydata');
const ANTIREACTION_FILE = path.join(DATA_DIR, 'antireaction_settings.json');

if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
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
    "This is a no-reaction zone! 🛡️",
    "Read-only mode: reactions disabled!"
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

async function getAntiReaction(chatId) {
    const data = await loadDatabase();
    const setting = data[chatId];
    if (setting && typeof setting === 'object') {
        return {
            enabled: setting.enabled || false,
            action: setting.action || 'warn'
        };
    }
    return { enabled: false, action: 'warn' };
}

// ============================================================
// MAIN HANDLER - REAL WORKING FUNCTION
// ============================================================

export async function handleAntiReaction(sock, reaction) {
    try {
        // Get chat ID from reaction
        const chatId = reaction.key?.remoteJid;
        if (!chatId || !chatId.endsWith('@g.us')) return;
        
        const config = await getAntiReaction(chatId);
        if (!config.enabled) return;
        
        const senderId = reaction.key?.participant || reaction.key?.remoteJid;
        if (!senderId) return;
        
        // Check if sender is owner (exempt)
        const ownerCheck = await isOwner(senderId);
        if (ownerCheck.isOwner) return;
        
        // Check if sender is admin (exempt)
        const adminCheck = await isAdmin(sock, chatId, senderId);
        if (adminCheck.isSenderAdmin) return;
        
        const action = config.action || 'warn';
        const randomQuote = getRandomQuote();
        
        // Note: WhatsApp API does not allow deleting reactions
        // So we can only warn or kick
        
        // ========== WARN ACTION ==========
        if (action === 'warn') {
            const warnMsg = `╭──❍「 *😀 ANTI-REACTION SYSTEM* 」❍
├ 👤 *User* : @${senderId.split('@')[0]}
├ 📵 *Action* : Reaction detected
├ ⚠️ *Warning* : Reactions are not allowed
╰──────❍

✨ *"${randomQuote}"* ✨

_📌 Please avoid using reactions in this group_
▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`;
            await sendStyledMessage(sock, chatId, warnMsg, [senderId]);
            return;
        }
        
        // ========== KICK ACTION ==========
        if (action === 'kick') {
            // Check if bot is admin before kicking
            const botAdminCheck = await isAdmin(sock, chatId, sock.user.id);
            if (!botAdminCheck.isBotAdmin) {
                const noAdminMsg = `╭──❍「 *😀 ANTI-REACTION SYSTEM* 」❍
├ 👤 *User* : @${senderId.split('@')[0]}
├ 📵 *Action* : Reaction detected
├ ❌ *Error* : Make me admin to kick!
╰──────❍

✨ *"${randomQuote}"* ✨

_📌 Please promote bot to admin for full protection_
▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`;
                await sendStyledMessage(sock, chatId, noAdminMsg, [senderId]);
                return;
            }
            
            try {
                await sock.groupParticipantsUpdate(chatId, [senderId], 'remove');
                const kickMsg = `╭──❍「 *😀 ANTI-REACTION SYSTEM* 」❍
├ 👤 *User* : @${senderId.split('@')[0]}
├ 📵 *Action* : Reaction detected
├ 👢 *Result* : KICKED
╰──────❍

✨ *"${randomQuote}"* ✨

_📌 User has been removed for using reactions_
▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`;
                await sendStyledMessage(sock, chatId, kickMsg, [senderId]);
            } catch (kickError) {
                const kickFailMsg = `╭──❍「 *😀 ANTI-REACTION SYSTEM* 」❍
├ 👤 *User* : @${senderId.split('@')[0]}
├ 📵 *Action* : Reaction detected
├ ❌ *Error* : Failed to kick user
╰──────❍

✨ *"${randomQuote}"* ✨

_📌 Check my permissions and try again_
▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`;
                await sendStyledMessage(sock, chatId, kickFailMsg, [senderId]);
            }
            return;
        }
        
    } catch (error) {
        console.error('Anti-Reaction handler error:', error);
    }
}

// Export for use in index.js
export { getAntiReaction };