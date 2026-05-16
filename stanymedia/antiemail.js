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
const ANTIEMAIL_FILE = path.join(DATA_DIR, 'antiemail_settings.json');

if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

// ============================================================
// EMAIL REGEX - Comprehensive
// ============================================================
const EMAIL_REGEX = /\b[A-Za-z0-9][A-Za-z0-9._%+-]{0,62}@(?:[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?\.)+[A-Za-z]{2,}\b/;

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
    "This is a no-email zone! 🛡️",
    "Protecting privacy one email at a time!"
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

async function getAntiEmail(chatId) {
    const data = await loadDatabase();
    const setting = data[chatId];
    if (setting && typeof setting === 'object') {
        return {
            enabled: setting.enabled || false,
            action: setting.action || 'delete'
        };
    }
    return { enabled: false, action: 'delete' };
}

// ============================================================
// EMAIL HELPER FUNCTIONS
// ============================================================

function extractEmails(text) {
    if (!text || typeof text !== 'string') return [];
    const matches = [...text.matchAll(EMAIL_REGEX)];
    return matches.map(match => match[0]);
}

function isValidEmail(email) {
    if (email.length > 254) return false;
    const [localPart, domain] = email.split('@');
    if (!localPart || !domain) return false;
    if (localPart.length > 64) return false;
    if (domain.length > 255) return false;
    if (localPart.includes('..')) return false;
    if (domain.includes('..')) return false;
    
    const validLocalChars = /^[A-Za-z0-9][A-Za-z0-9._%+-]*$/;
    if (!validLocalChars.test(localPart)) return false;
    
    return true;
}

// ============================================================
// MAIN HANDLER - REAL WORKING FUNCTION
// ============================================================

export async function handleAntiEmail(sock, chatId, message, userMessage, senderId) {
    try {
        // Check if it's a group
        const groupCheck = isGroup(chatId);
        if (!groupCheck.isGroup) return;
        
        const config = await getAntiEmail(chatId);
        if (!config.enabled) return;
        
        // Check if sender is owner (exempt)
        const ownerCheck = await isOwner(senderId);
        if (ownerCheck.isOwner) return;
        
        // Check if sender is admin (exempt)
        const adminCheck = await isAdmin(sock, chatId, senderId);
        if (adminCheck.isSenderAdmin) return;
        
        // Extract and validate emails
        const foundEmails = extractEmails(userMessage);
        if (foundEmails.length === 0) return;
        
        const validEmails = foundEmails.filter(isValidEmail);
        if (validEmails.length === 0) return;
        
        const action = config.action || 'delete';
        const randomQuote = getRandomQuote();
        const emailCount = validEmails.length;
        const emailText = emailCount === 1 ? 'an email address' : `${emailCount} email addresses`;
        
        // DELETE the message (REAL deletion)
        try {
            await sock.sendMessage(chatId, { delete: message.key });
        } catch (deleteError) {
            console.error('Failed to delete email message:', deleteError);
        }
        
        // ========== WARN ACTION ==========
        if (action === 'warn') {
            const warnMsg = `╭──❍「 *📧 ANTI-EMAIL SYSTEM* 」❍
├ 👤 *User* : @${senderId.split('@')[0]}
├ 📧 *Found* : ${emailText}
├ 🗑️ *Action* : Message deleted
├ ⚠️ *Warning* : Sharing emails is not allowed
╰──────❍

✨ *"${randomQuote}"* ✨

_📌 Please avoid sharing email addresses in this group_
▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`;
            await sendStyledMessage(sock, chatId, warnMsg, [senderId], message);
            return;
        }
        
        // ========== KICK ACTION ==========
        if (action === 'kick') {
            // Check if bot is admin before kicking
            const botAdminCheck = await isAdmin(sock, chatId, sock.user.id);
            if (!botAdminCheck.isBotAdmin) {
                const noAdminMsg = `╭──❍「 *📧 ANTI-EMAIL SYSTEM* 」❍
├ 👤 *User* : @${senderId.split('@')[0]}
├ 📧 *Found* : ${emailText}
├ ❌ *Error* : Make me admin to kick!
╰──────❍

✨ *"${randomQuote}"* ✨

_📌 Please promote bot to admin for full protection_
▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`;
                await sendStyledMessage(sock, chatId, noAdminMsg, [senderId], message);
                return;
            }
            
            try {
                await sock.groupParticipantsUpdate(chatId, [senderId], 'remove');
                const kickMsg = `╭──❍「 *📧 ANTI-EMAIL SYSTEM* 」❍
├ 👤 *User* : @${senderId.split('@')[0]}
├ 📧 *Found* : ${emailText}
├ 👢 *Action* : KICKED
╰──────❍

✨ *"${randomQuote}"* ✨

_📌 User has been removed for sharing email addresses_
▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`;
                await sendStyledMessage(sock, chatId, kickMsg, [senderId], message);
            } catch (kickError) {
                const kickFailMsg = `╭──❍「 *📧 ANTI-EMAIL SYSTEM* 」❍
├ 👤 *User* : @${senderId.split('@')[0]}
├ 📧 *Found* : ${emailText}
├ ❌ *Error* : Failed to kick user
╰──────❍

✨ *"${randomQuote}"* ✨

_📌 Check my permissions and try again_
▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`;
                await sendStyledMessage(sock, chatId, kickFailMsg, [senderId], message);
            }
            return;
        }
        
        // ========== DELETE ACTION (default) ==========
        if (action === 'delete') {
            const deleteMsg = `╭──❍「 *📧 ANTI-EMAIL SYSTEM* 」❍
├ 👤 *User* : @${senderId.split('@')[0]}
├ 📧 *Found* : ${emailText}
├ 🗑️ *Action* : Message deleted
╰──────❍

✨ *"${randomQuote}"* ✨

_📌 Sharing email addresses is not allowed in this group_
▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`;
            await sendStyledMessage(sock, chatId, deleteMsg, [senderId], message);
        }
        
    } catch (error) {
        console.error('Anti-Email handler error:', error);
    }
}

// Export for use in index.js
export { getAntiEmail };