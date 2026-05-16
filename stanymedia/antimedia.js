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
const ANTIMEDIA_FILE = path.join(DATA_DIR, 'antimedia_settings.json');

if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

// ============================================================
// CONSTANTS
// ============================================================

const VALID_MEDIA_TYPES = ['image', 'video', 'audio', 'document', 'sticker', 'contact', 'location', 'poll'];
const DEFAULT_BLOCKED_TYPES = ['image', 'video', 'audio', 'document'];

const MEDIA_DESCRIPTIONS = {
    'image': '📷 Image/Photo',
    'video': '🎥 Video',
    'audio': '🎵 Audio/Voice Note',
    'document': '📄 Document/File',
    'sticker': '🏷️ Sticker',
    'contact': '👤 Contact Card',
    'location': '📍 Location',
    'poll': '📊 Poll'
};

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

async function getAntiMedia(chatId) {
    const data = await loadDatabase();
    const setting = data[chatId];
    if (setting && typeof setting === 'object') {
        return {
            enabled: setting.enabled || false,
            action: setting.action || 'delete',
            blockedTypes: Array.isArray(setting.blockedTypes) ? setting.blockedTypes : []
        };
    }
    return { enabled: false, action: 'delete', blockedTypes: [] };
}

// ============================================================
// HELPER FUNCTIONS
// ============================================================

function getMediaType(message) {
    if (!message || !message.message) return null;
    const msg = message.message;
    
    if (msg.imageMessage) return 'image';
    if (msg.videoMessage) return 'video';
    if (msg.audioMessage) return 'audio';
    if (msg.documentMessage) return 'document';
    if (msg.stickerMessage) return 'sticker';
    if (msg.contactMessage) return 'contact';
    if (msg.locationMessage) return 'location';
    if (msg.pollCreationMessage) return 'poll';
    
    return null;
}

function getMediaDescription(type) {
    return MEDIA_DESCRIPTIONS[type] || type;
}

// ============================================================
// MAIN HANDLER - REAL WORKING FUNCTION
// ============================================================

export async function handleAntiMedia(sock, chatId, message, senderId) {
    try {
        // Check if it's a group
        const groupCheck = isGroup(chatId);
        if (!groupCheck.isGroup) return;
        
        const config = await getAntiMedia(chatId);
        if (!config.enabled) return;
        
        // Check if sender is owner (exempt)
        const ownerCheck = await isOwner(senderId);
        if (ownerCheck.isOwner) return;
        
        // Check if sender is admin (exempt)
        const adminCheck = await isAdmin(sock, chatId, senderId);
        if (adminCheck.isSenderAdmin) return;
        
        // Detect media type
        const mediaType = getMediaType(message);
        if (!mediaType) return;
        
        // Check if this media type is blocked
        const blockedTypes = config.blockedTypes || [];
        if (!blockedTypes.includes(mediaType)) return;
        
        const action = config.action || 'delete';
        const mediaDescription = getMediaDescription(mediaType);
        const randomQuote = getRandomQuote();
        
        // DELETE the message (REAL deletion)
        try {
            await sock.sendMessage(chatId, { delete: message.key });
        } catch (deleteError) {
            console.error('Failed to delete media message:', deleteError);
        }
        
        // ========== WARN ACTION ==========
        if (action === 'warn') {
            const warnMsg = `╭──❍「 *🖼️ ANTI-MEDIA SYSTEM* 」❍
├ 👤 *User* : @${senderId.split('@')[0]}
├ 🚫 *Type* : ${mediaDescription}
├ 🗑️ *Action* : Message deleted
├ ⚠️ *Warning* : Media messages are not allowed
╰──────❍

✨ *"${randomQuote}"* ✨

_📌 Please avoid sending media in this group_
▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`;
            await sendStyledMessage(sock, chatId, warnMsg, [senderId], message);
            return;
        }
        
        // ========== KICK ACTION ==========
        if (action === 'kick') {
            // Check if bot is admin before kicking
            const botAdminCheck = await isAdmin(sock, chatId, sock.user.id);
            if (!botAdminCheck.isBotAdmin) {
                const noAdminMsg = `╭──❍「 *🖼️ ANTI-MEDIA SYSTEM* 」❍
├ 👤 *User* : @${senderId.split('@')[0]}
├ 🚫 *Type* : ${mediaDescription}
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
                const kickMsg = `╭──❍「 *🖼️ ANTI-MEDIA SYSTEM* 」❍
├ 👤 *User* : @${senderId.split('@')[0]}
├ 🚫 *Type* : ${mediaDescription}
├ 👢 *Action* : KICKED
╰──────❍

✨ *"${randomQuote}"* ✨

_📌 User has been removed for sending media_
▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`;
                await sendStyledMessage(sock, chatId, kickMsg, [senderId], message);
            } catch (kickError) {
                const kickFailMsg = `╭──❍「 *🖼️ ANTI-MEDIA SYSTEM* 」❍
├ 👤 *User* : @${senderId.split('@')[0]}
├ 🚫 *Type* : ${mediaDescription}
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
            const deleteMsg = `╭──❍「 *🖼️ ANTI-MEDIA SYSTEM* 」❍
├ 👤 *User* : @${senderId.split('@')[0]}
├ 🚫 *Type* : ${mediaDescription}
├ 🗑️ *Action* : Message deleted
╰──────❍

✨ *"${randomQuote}"* ✨

_📌 Media messages are not allowed in this group_
▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`;
            await sendStyledMessage(sock, chatId, deleteMsg, [senderId], message);
        }
        
    } catch (error) {
        console.error('Anti-Media handler error:', error);
    }
}

// Export for use in index.js
export { getAntiMedia, VALID_MEDIA_TYPES, DEFAULT_BLOCKED_TYPES, MEDIA_DESCRIPTIONS };