// stany/owner/autotyping.js
// COMPLETE: Handler + Command for Auto Typing
// Developed By STANY TZ

import fs from 'fs';
import path from 'path';
import moment from 'moment-timezone';
import { channelInfo } from '../../stanytz/messageConfig.js';

const OWNER_FILE = path.join(process.cwd(), 'owner.json');
const AUTOTYPING_FILE = path.join(process.cwd(), 'stanydata', 'autotyping.json');
const DATA_DIR = path.join(process.cwd(), 'stanydata');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

// Load or create config
let autotypingConfig = {
    enabled: false,
    location: 'both',      // both, private, groups
    duration: 30000,       // 30 seconds default
    minSeconds: 15,
    maxSeconds: 30
};

try {
    if (fs.existsSync(AUTOTYPING_FILE)) {
        const saved = JSON.parse(fs.readFileSync(AUTOTYPING_FILE, 'utf8'));
        autotypingConfig = { ...autotypingConfig, ...saved };
    } else {
        fs.writeFileSync(AUTOTYPING_FILE, JSON.stringify(autotypingConfig, null, 2));
    }
} catch (e) {
    console.error('Error loading autotyping config:', e);
}

// ============================================
// TYPING MANAGEMENT
// ============================================

let typingIntervals = new Map();
let typingTimeouts = new Map();

/**
 * Get random duration between min and max seconds
 */
function getRandomDuration() {
    const min = autotypingConfig.minSeconds || 15;
    const max = autotypingConfig.maxSeconds || 30;
    const seconds = Math.floor(Math.random() * (max - min + 1) + min);
    return seconds * 1000;
}

/**
 * Start auto typing indicator for a chat
 */
export async function handleAutoTyping(sock, chatId, duration = null) {
    try {
        // If no duration specified, use random between 15-30 seconds
        if (duration === null) {
            duration = getRandomDuration();
        }
        
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
        
        const durationSeconds = duration / 1000;
        console.log(`[AutoTyping] Started typing for ${durationSeconds} seconds in ${chatId}`);
        
        return { interval, timeout, duration: durationSeconds };
    } catch (error) {
        console.error('[AutoTyping] Handler Error:', error.message);
        return null;
    }
}

/**
 * Stop typing indicator for a chat
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
 * Clean up all typing indicators
 */
export async function cleanupAllTyping(sock) {
    const allChats = new Set([...typingIntervals.keys(), ...typingTimeouts.keys()]);
    for (const chatId of allChats) {
        await stopTyping(sock, chatId);
    }
}

/**
 * Check if typing is active for a chat
 */
export function isTypingActive(chatId) {
    return typingIntervals.has(chatId) || typingTimeouts.has(chatId);
}

/**
 * Get all chats with active typing
 */
export function getActiveTypingChats() {
    return Array.from(typingIntervals.keys());
}

// ============================================
// SAVE CONFIG
// ============================================

async function saveConfig() {
    try {
        fs.writeFileSync(AUTOTYPING_FILE, JSON.stringify(autotypingConfig, null, 2));
        return true;
    } catch (error) {
        console.error('Error saving autotyping config:', error);
        return false;
    }
}

// ============================================
// ENHANCED OWNER CHECK
// ============================================

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

// ============================================
// CHECK IF SHOULD SHOW TYPING
// ============================================

function shouldShowTyping(chatId) {
    const isGroup = chatId?.endsWith('@g.us');
    const location = autotypingConfig.location;
    
    if (!autotypingConfig.enabled) return false;
    if (location === 'both') return true;
    if (location === 'private' && !isGroup) return true;
    if (location === 'groups' && isGroup) return true;
    return false;
}

// ============================================
// AUTO TYPING TRIGGER - For main index.js
// ============================================

export async function triggerAutoTyping(sock, chatId, senderId) {
    try {
        // Check if feature is enabled
        if (!shouldShowTyping(chatId)) return false;
        
        // Don't show typing for bot's own messages
        if (sock.user && senderId) {
            let botNumber = sock.user.id;
            if (botNumber.includes('@')) botNumber = botNumber.split('@')[0];
            if (senderId.includes(botNumber)) return false;
        }
        
        // Avoid duplicate typing indicators
        if (isTypingActive(chatId)) return false;
        
        // Start typing
        await handleAutoTyping(sock, chatId);
        return true;
    } catch (error) {
        return false;
    }
}

// ============================================
// SEND STYLED MESSAGE
// ============================================

async function sendStyledMessage(sock, chatId, text, mentions = [], quoted = null) {
    try {
        await sock.sendMessage(chatId, { 
            text: text, 
            contextInfo: channelInfo.contextInfo, 
            mentions: mentions 
        }, { quoted: quoted });
    } catch (error) {
        try {
            await sock.sendMessage(chatId, { text: text, mentions: mentions }, { quoted: quoted });
        } catch (e) {
            console.error('Failed to send message:', e);
        }
    }
}

// ============================================
// COMMAND EXPORT
// ============================================

export default {
    name: 'autotyping',
    description: 'Auto typing indicator (shows typing for 15-30 seconds on every message)',
    icon: '⌨️',
    alias: ['autotype', 'at', 'typing'],
    category: 'owner',
    ownerOnly: true,
    
    async execute(sock, msg, args, currentPrefix, options) {
        const chatId = msg.key.remoteJid;
        const senderId = msg.key.participant || chatId;
        
        // Check if sender is owner
        const isOwnerUser = isUserOwner(senderId, sock);
        
        if (!isOwnerUser) {
            const senderName = senderId.split('@')[0];
            await sendStyledMessage(sock, chatId, `╭──❍「 *⌨️ AUTO TYPING* 」❍
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
        const day = now.format('dddd');
        
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
        
        // Location display text
        const locationText = {
            both: '🌍 DM + Groups',
            private: '💬 DM only',
            groups: '👥 Groups only'
        }[autotypingConfig.location] || '🌍 DM + Groups';
        
        // STATUS COMMAND
        if (!action || action === 'status') {
            const statusIcon = autotypingConfig.enabled ? '✅' : '❌';
            const statusText = autotypingConfig.enabled ? 'ENABLED' : 'DISABLED';
            
            await sendStyledMessage(sock, chatId, `╭──❍「 *⌨️ AUTO TYPING* 」❍
├ 📝 *Status* : ${statusIcon} ${statusText}
├ 📍 *Location* : ${locationText}
├ ⏱️ *Duration* : ${autotypingConfig.minSeconds}-${autotypingConfig.maxSeconds} seconds
├ 👑 *Owner* : +${ownerNumber}
├ 📅 *Date* : ${date}
├ 📆 *Day* : ${day}
├ ⏰ *Time* : ${time} EAT
╰─┬────❍
╭─┴─❍「 *📋 COMMANDS* 」❍
│ 🔧 ${currentPrefix}autotyping on - Enable
│ 🔧 ${currentPrefix}autotyping off - Disable
│ 🔧 ${currentPrefix}autotyping both - DM + Groups
│ 🔧 ${currentPrefix}autotyping private - DM only
│ 🔧 ${currentPrefix}autotyping groups - Groups only
│ 🔧 ${currentPrefix}autotyping duration <min> <max> - Set duration
│ 🔧 ${currentPrefix}autotyping test - Test (random duration)
│ 🔧 ${currentPrefix}autotyping stop - Stop current typing
╰──────❍
▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`, [], msg);
            return;
        }
        
        // ENABLE
        if (action === 'on') {
            autotypingConfig.enabled = true;
            await saveConfig();
            await sendStyledMessage(sock, chatId, `╭──❍「 *⌨️ AUTO TYPING* 」❍
├ ✅ *ENABLED*
├ 📍 Location: ${locationText}
├ ⏱️ Duration: ${autotypingConfig.minSeconds}-${autotypingConfig.maxSeconds} seconds
├ 📝 Bot will show typing for every message
╰──────❍
▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`, [], msg);
            console.log(`[AUTOTYPING] Enabled by ${senderId.split('@')[0]}`);
            return;
        }
        
        // DISABLE
        if (action === 'off') {
            autotypingConfig.enabled = false;
            await saveConfig();
            await sendStyledMessage(sock, chatId, `╭──❍「 *⌨️ AUTO TYPING* 」❍
├ ❌ *DISABLED*
├ 📝 Bot will not show typing indicator
╰──────❍
▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`, [], msg);
            console.log(`[AUTOTYPING] Disabled by ${senderId.split('@')[0]}`);
            return;
        }
        
        // BOTH LOCATION
        if (action === 'both') {
            autotypingConfig.location = 'both';
            await saveConfig();
            await sendStyledMessage(sock, chatId, `╭──❍「 *⌨️ AUTO TYPING* 」❍
├ 🌍 *Location: BOTH (DM + Groups)*
╰──────❍
▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`, [], msg);
            return;
        }
        
        // PRIVATE ONLY
        if (action === 'private') {
            autotypingConfig.location = 'private';
            await saveConfig();
            await sendStyledMessage(sock, chatId, `╭──❍「 *⌨️ AUTO TYPING* 」❍
├ 💬 *Location: PRIVATE (DM ONLY)*
╰──────❍
▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`, [], msg);
            return;
        }
        
        // GROUPS ONLY
        if (action === 'groups') {
            autotypingConfig.location = 'groups';
            await saveConfig();
            await sendStyledMessage(sock, chatId, `╭──❍「 *⌨️ AUTO TYPING* 」❍
├ 👥 *Location: GROUPS ONLY*
╰──────❍
▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`, [], msg);
            return;
        }
        
        // SET DURATION
        if (action === 'duration') {
            const minVal = parseInt(args[1]);
            const maxVal = parseInt(args[2]);
            
            if (isNaN(minVal) || isNaN(maxVal) || minVal < 1 || maxVal < minVal) {
                await sendStyledMessage(sock, chatId, `╭──❍「 *⌨️ AUTO TYPING* 」❍
├ ❌ *Invalid duration*
├ 📝 *Use* : ${currentPrefix}autotyping duration 15 30
├ 📝 Min: 1-60 seconds, Max: > Min
╰──────❍
▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`, [], msg);
                return;
            }
            
            autotypingConfig.minSeconds = minVal;
            autotypingConfig.maxSeconds = maxVal;
            await saveConfig();
            
            await sendStyledMessage(sock, chatId, `╭──❍「 *⌨️ AUTO TYPING* 」❍
├ ⏱️ *Duration Updated*
├ 📝 Min: ${minVal} seconds
├ 📝 Max: ${maxVal} seconds
╰──────❍
▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`, [], msg);
            return;
        }
        
        // TEST COMMAND
        if (action === 'test') {
            const duration = getRandomDuration();
            const durationSeconds = duration / 1000;
            await handleAutoTyping(sock, chatId, duration);
            await sendStyledMessage(sock, chatId, `╭──❍「 *⌨️ AUTO TYPING* 」❍
├ 🧪 *TESTING TYPING INDICATOR*
├ ⏱️ Duration: ${durationSeconds} seconds
╰──────❍
▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`, [], msg);
            return;
        }
        
        // STOP COMMAND
        if (action === 'stop') {
            await stopTyping(sock, chatId);
            await sendStyledMessage(sock, chatId, `╭──❍「 *⌨️ AUTO TYPING* 」❍
├ ⏹️ *TYPING STOPPED*
╰──────❍
▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`, [], msg);
            return;
        }
        
        // RESET COMMAND
        if (action === 'reset') {
            autotypingConfig = {
                enabled: false,
                location: 'both',
                duration: 30000,
                minSeconds: 15,
                maxSeconds: 30
            };
            await saveConfig();
            await sendStyledMessage(sock, chatId, `╭──❍「 *⌨️ AUTO TYPING* 」❍
├ 🔄 *RESET TO DEFAULT*
├ 📝 Enabled: false, Location: both, Duration: 15-30 seconds
╰──────❍
▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`, [], msg);
            return;
        }
        
        // INVALID ACTION
        await sendStyledMessage(sock, chatId, `╭──❍「 *⌨️ AUTO TYPING* 」❍
├ ❌ *Invalid action* : "${action}"
├ 📝 *Valid* : on, off, status, both, private, groups, duration, test, stop, reset
╰──────❍
▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`, [], msg);
    }
};