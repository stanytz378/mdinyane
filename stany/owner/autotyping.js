// stany/owner/autotyping.js
// COMPLETE: Handler + Command for Auto Typing

import { config, updateConfig } from '../../stanycore/config.js';
import { channelInfo } from '../../stanytz/messageConfig.js';
import isOwner from '../../stanymain/isOwner.js';

// ============================================
// HANDLER SECTION - Manages typing indicator
// ============================================

let typingIntervals = new Map();
let typingTimeouts = new Map();

/**
 * Start auto typing indicator for a chat
 * @param {Object} sock - WhatsApp socket connection
 * @param {string} chatId - Chat ID
 * @param {number} duration - Duration in milliseconds (default: 30000)
 * @returns {Promise<Object|null>}
 */
export async function handleAutoTyping(sock, chatId, duration = 30000) {
    try {
        // Stop any existing typing first
        await stopTyping(sock, chatId);
        
        // Start typing indicator
        await sock.sendPresenceUpdate('composing', chatId);
        
        // Keep typing alive every 5 seconds
        const interval = setInterval(async () => {
            try {
                await sock.sendPresenceUpdate('composing', chatId);
            } catch (error) {
                clearInterval(interval);
            }
        }, 5000);
        
        // Auto-stop after duration
        const timeout = setTimeout(async () => {
            await stopTyping(sock, chatId);
        }, duration);
        
        // Store for cleanup
        if (!typingIntervals.has(chatId)) {
            typingIntervals.set(chatId, new Set());
        }
        typingIntervals.get(chatId).add(interval);
        
        if (!typingTimeouts.has(chatId)) {
            typingTimeouts.set(chatId, new Set());
        }
        typingTimeouts.get(chatId).add(timeout);
        
        return { interval, timeout };
    } catch (error) {
        console.error('[AutoTyping] Handler Error:', error.message);
        return null;
    }
}

/**
 * Stop typing indicator for a chat
 * @param {Object} sock - WhatsApp socket connection
 * @param {string} chatId - Chat ID
 * @returns {Promise<void>}
 */
export async function stopTyping(sock, chatId) {
    try {
        // Clear all intervals
        const intervals = typingIntervals.get(chatId);
        if (intervals) {
            for (const interval of intervals) {
                clearInterval(interval);
            }
            typingIntervals.delete(chatId);
        }
        
        // Clear all timeouts
        const timeouts = typingTimeouts.get(chatId);
        if (timeouts) {
            for (const timeout of timeouts) {
                clearTimeout(timeout);
            }
            typingTimeouts.delete(chatId);
        }
        
        // Send paused status
        await sock.sendPresenceUpdate('paused', chatId);
    } catch (error) {
        // Ignore errors when stopping
    }
}

/**
 * Clean up all typing indicators (call on bot shutdown)
 * @param {Object} sock - WhatsApp socket connection
 */
export async function cleanupAllTyping(sock) {
    const allChats = new Set([...typingIntervals.keys(), ...typingTimeouts.keys()]);
    for (const chatId of allChats) {
        await stopTyping(sock, chatId);
    }
}

/**
 * Check if typing is active for a chat
 * @param {string} chatId - Chat ID
 * @returns {boolean}
 */
export function isTypingActive(chatId) {
    return typingIntervals.has(chatId) || typingTimeouts.has(chatId);
}

/**
 * Get all chats with active typing
 * @returns {Array}
 */
export function getActiveTypingChats() {
    return Array.from(typingIntervals.keys());
}

// ============================================
// COMMAND SECTION - User commands to control auto typing
// ============================================

/**
 * Send styled message with channel info
 */
async function sendStyledMessage(sock, chatId, text, mentions = [], quoted = null) {
    try {
        await sock.sendMessage(chatId, {
            text: text,
            contextInfo: channelInfo.contextInfo,
            mentions: mentions
        }, { quoted: quoted });
    } catch (error) {
        await sock.sendMessage(chatId, { text: text, mentions: mentions }, { quoted: quoted });
    }
}

// Command export
export default {
    name: 'autotyping',
    description: 'Enable/disable auto typing indicator',
    icon: '⌨️',
    alias: ['autotype', 'at'],
    category: 'owner',
    ownerOnly: true,
    
    async execute(sock, msg, args, currentPrefix, { isOwner, jidManager }) {
        const chatId = msg.key.remoteJid;
        const senderId = msg.key.participant || chatId;
        
        // Check if user is owner
        const ownerCheck = await isOwner(senderId, jidManager);
        if (!ownerCheck.isOwner) {
            await sendStyledMessage(sock, chatId, `╭──❍「 *⌨️ AUTO TYPING* 」❍\n├ ❌ Owner only command!\n╰──────❍`, [senderId], msg);
            return;
        }
        
        const action = args[0]?.toLowerCase();
        
        // STATUS - Show current settings
        if (!action || action === 'status') {
            const locationText = config.autoTypingLocation === 'both' ? 'DM + Groups' : 
                               config.autoTypingLocation === 'private' ? 'DM only' : 'Groups only';
            await sendStyledMessage(sock, chatId, `╭──❍「 *⌨️ AUTO TYPING* 」❍
├ 📝 *Status* : ${config.autoTyping ? '✅ ENABLED' : '❌ DISABLED'}
├ 📍 *Location* : ${locationText}
╰─┬────❍
╭─┴─❍「 *📋 COMMANDS* 」❍
│ 🔧 ${currentPrefix}autotyping on - Enable auto typing
│ 🔧 ${currentPrefix}autotyping off - Disable auto typing
│ 🔧 ${currentPrefix}autotyping both - DM + Groups
│ 🔧 ${currentPrefix}autotyping private - DM only
│ 🔧 ${currentPrefix}autotyping groups - Groups only
│ 🔧 ${currentPrefix}autotyping test - Test typing (10 sec)
╰──────❍`, [], msg);
            return;
        }
        
        // TEST - Test the typing indicator
        if (action === 'test') {
            await handleAutoTyping(sock, chatId, 10000);
            await sendStyledMessage(sock, chatId, `╭──❍「 *⌨️ AUTO TYPING* 」❍
├ 🧪 *TESTING TYPING INDICATOR*
├ ⏱️ Duration: 10 seconds
╰──────❍`, [], msg);
            return;
        }
        
        // ON - Enable auto typing
        if (action === 'on') {
            updateConfig({ autoTyping: true });
            await sendStyledMessage(sock, chatId, `╭──❍「 *⌨️ AUTO TYPING* 」❍
├ ✅ *AUTO TYPING ENABLED*
├ 📍 Location: ${config.autoTypingLocation === 'both' ? 'DM + Groups' : config.autoTypingLocation === 'private' ? 'DM only' : 'Groups only'}
╰──────❍`, [], msg);
        } 
        
        // OFF - Disable auto typing
        else if (action === 'off') {
            updateConfig({ autoTyping: false });
            await stopTyping(sock, chatId);
            await sendStyledMessage(sock, chatId, `╭──❍「 *⌨️ AUTO TYPING* 」❍
├ ❌ *AUTO TYPING DISABLED*
╰──────❍`, [], msg);
        } 
        
        // BOTH - DM and Groups
        else if (action === 'both') {
            updateConfig({ autoTypingLocation: 'both' });
            await sendStyledMessage(sock, chatId, `╭──❍「 *⌨️ AUTO TYPING* 」❍
├ 🌍 *Location: BOTH (DM + Groups)*
├ ${config.autoTyping ? '✅ Auto typing is enabled' : '⚠️ Auto typing is disabled, use .autotyping on to enable'}
╰──────❍`, [], msg);
        } 
        
        // PRIVATE - DM only
        else if (action === 'private') {
            updateConfig({ autoTypingLocation: 'private' });
            await sendStyledMessage(sock, chatId, `╭──❍「 *⌨️ AUTO TYPING* 」❍
├ 💬 *Location: PRIVATE (DM ONLY)*
├ ${config.autoTyping ? '✅ Auto typing is enabled' : '⚠️ Auto typing is disabled, use .autotyping on to enable'}
╰──────❍`, [], msg);
        } 
        
        // GROUPS - Groups only
        else if (action === 'groups') {
            updateConfig({ autoTypingLocation: 'groups' });
            await sendStyledMessage(sock, chatId, `╭──❍「 *⌨️ AUTO TYPING* 」❍
├ 👥 *Location: GROUPS ONLY*
├ ${config.autoTyping ? '✅ Auto typing is enabled' : '⚠️ Auto typing is disabled, use .autotyping on to enable'}
╰──────❍`, [], msg);
        } 
        
        // Invalid command
        else {
            await sendStyledMessage(sock, chatId, `╭──❍「 *⌨️ AUTO TYPING* 」❍
├ ❌ *Invalid command: "${action}"*
├ 📋 Use: ${currentPrefix}autotyping status
╰──────❍`, [], msg);
        }
    }
};