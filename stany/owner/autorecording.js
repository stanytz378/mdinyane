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
import { channelInfo } from '../../stanytz/messageConfig.js';

const DATA_DIR = path.join(process.cwd(), 'stanydata');
const AUTORECORDING_FILE = path.join(DATA_DIR, 'autorecording.json');
const OWNER_FILE = path.join(process.cwd(), 'owner.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

// Load or create config
let autorecordingConfig = { enabled: false, location: 'both', minSeconds: 15, maxSeconds: 30 };
try {
    if (fs.existsSync(AUTORECORDING_FILE)) {
        const saved = JSON.parse(fs.readFileSync(AUTORECORDING_FILE, 'utf8'));
        autorecordingConfig = { ...autorecordingConfig, ...saved };
    } else {
        fs.writeFileSync(AUTORECORDING_FILE, JSON.stringify(autorecordingConfig, null, 2));
    }
} catch (e) {
    console.error('Error loading autorecording config:', e);
}

// Track active recording sessions
const recordingSessions = new Map();

// ============================================================
// ENHANCED OWNER CHECK - SIMPLE AND RELIABLE
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
        await sock.sendMessage(chatId, { 
            text: text, 
            contextInfo: channelInfo.contextInfo, 
            mentions: mentions 
        }, { quoted: quoted });
    } catch (error) {
        // Fallback without contextInfo
        try {
            await sock.sendMessage(chatId, { text: text, mentions: mentions }, { quoted: quoted });
        } catch (e) {
            console.error('Failed to send message:', e);
        }
    }
}

// ============================================================
// SAVE CONFIG
// ============================================================

async function saveConfig() {
    try {
        fs.writeFileSync(AUTORECORDING_FILE, JSON.stringify(autorecordingConfig, null, 2));
        return true;
    } catch (error) {
        console.error('Error saving autorecording config:', error);
        return false;
    }
}

// ============================================================
// CHECK IF SHOULD SHOW RECORDING
// ============================================================

function shouldShowRecording(chatId, location) {
    const isGroup = chatId?.endsWith('@g.us');
    if (location === 'both') return true;
    if (location === 'private' && !isGroup) return true;
    if (location === 'groups' && isGroup) return true;
    return false;
}

// ============================================================
// GET RANDOM RECORDING DURATION (15-30 seconds)
// ============================================================

function getRandomRecordingDuration() {
    const min = autorecordingConfig.minSeconds || 15;
    const max = autorecordingConfig.maxSeconds || 30;
    // Random between min and max seconds, converted to milliseconds
    const seconds = Math.floor(Math.random() * (max - min + 1) + min);
    return seconds * 1000;
}

// ============================================================
// HANDLE AUTO RECORDING - EXPORTED FOR MAIN INDEX.JS
// ============================================================

export async function handleAutoRecording(sock, chatId, senderId) {
    try {
        // Check if feature is enabled
        if (!autorecordingConfig.enabled) return false;
        
        // Check location filter
        if (!shouldShowRecording(chatId, autorecordingConfig.location)) return false;
        
        // Don't show recording for bot's own messages
        if (sock.user && senderId) {
            let botNumber = sock.user.id;
            if (botNumber.includes('@')) botNumber = botNumber.split('@')[0];
            if (senderId.includes(botNumber)) return false;
        }
        
        // Avoid duplicate recording indicators
        if (recordingSessions.has(chatId)) return false;
        
        // Start recording indicator
        recordingSessions.set(chatId, true);
        
        // Send recording presence
        await sock.sendPresenceUpdate('recording', chatId);
        
        // Get random duration between 15-30 seconds
        const duration = getRandomRecordingDuration();
        const durationSeconds = duration / 1000;
        
        console.log(`[AUTORECORDING] Recording for ${durationSeconds} seconds in ${chatId}`);
        
        // Wait for the duration
        await new Promise(r => setTimeout(r, duration));
        
        // Stop recording
        await sock.sendPresenceUpdate('paused', chatId);
        
        // Clean up after a short delay
        setTimeout(() => {
            recordingSessions.delete(chatId);
        }, 1000);
        
        return true;
    } catch (error) {
        recordingSessions.delete(chatId);
        return false;
    }
}

// ============================================================
// COMMAND EXPORT
// ============================================================

export default {
    name: 'autorecording',
    description: 'Auto recording indicator (15-30 seconds recording for every message)',
    icon: '🎙️',
    alias: ['recording', 'autorecord', 'record', 'voicerec'],
    category: 'owner',
    ownerOnly: true,
    
    async execute(sock, msg, args, currentPrefix, options) {
        const chatId = msg.key.remoteJid;
        const senderId = msg.key.participant || chatId;
        
        // Check if sender is owner
        const isOwnerUser = isUserOwner(senderId, sock);
        
        if (!isOwnerUser) {
            const senderName = senderId.split('@')[0];
            await sendStyledMessage(sock, chatId, `╭──❍「 *🎙️ AUTO RECORDING* 」❍
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
        
        // Get owner info for display
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
        }[autorecordingConfig.location] || '🌍 DM + Groups';
        
        // STATUS COMMAND
        if (!action || action === 'status') {
            const statusIcon = autorecordingConfig.enabled ? '✅' : '❌';
            const statusText = autorecordingConfig.enabled ? 'ENABLED' : 'DISABLED';
            
            const statusMsg = `╭──❍「 *🎙️ AUTO RECORDING* 」❍
├ 📝 *Status* : ${statusIcon} ${statusText}
├ 📍 *Location* : ${locationText}
├ ⏱️ *Duration* : ${autorecordingConfig.minSeconds}-${autorecordingConfig.maxSeconds} seconds
├ 👑 *Owner* : +${ownerNumber}
├ 📅 *Date* : ${date}
├ 📆 *Day* : ${day}
├ ⏰ *Time* : ${time} EAT
╰─┬────❍
╭─┴─❍「 *📋 COMMANDS* 」❍
│ 🔧 ${currentPrefix}autorecording on - Enable
│ 🔧 ${currentPrefix}autorecording off - Disable
│ 🔧 ${currentPrefix}autorecording both - DM + Groups
│ 🔧 ${currentPrefix}autorecording private - DM only
│ 🔧 ${currentPrefix}autorecording groups - Groups only
│ 🔧 ${currentPrefix}autorecording duration <min> <max> - Set duration
╰──────❍
▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`;
            
            await sendStyledMessage(sock, chatId, statusMsg, [], msg);
            return;
        }
        
        // ENABLE COMMAND
        if (action === 'on') { 
            autorecordingConfig.enabled = true; 
            await saveConfig(); 
            await sendStyledMessage(sock, chatId, `╭──❍「 *🎙️ AUTO RECORDING* 」❍
├ ✅ *ENABLED*
├ 📍 Location: ${locationText}
├ ⏱️ Duration: ${autorecordingConfig.minSeconds}-${autorecordingConfig.maxSeconds} seconds
├ 📝 Bot will show recording indicator for every message
╰──────❍
▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`, [], msg);
            console.log(`[AUTORECORDING] Enabled by ${senderId.split('@')[0]}`);
            return;
        }
        
        // DISABLE COMMAND
        if (action === 'off') { 
            autorecordingConfig.enabled = false; 
            await saveConfig(); 
            await sendStyledMessage(sock, chatId, `╭──❍「 *🎙️ AUTO RECORDING* 」❍
├ ❌ *DISABLED*
├ 📝 Bot will not show recording indicator
╰──────❍
▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`, [], msg);
            console.log(`[AUTORECORDING] Disabled by ${senderId.split('@')[0]}`);
            return;
        }
        
        // BOTH LOCATION (DM + Groups)
        if (action === 'both') { 
            autorecordingConfig.location = 'both'; 
            await saveConfig(); 
            await sendStyledMessage(sock, chatId, `╭──❍「 *🎙️ AUTO RECORDING* 」❍
├ 🌍 *Location: BOTH*
├ 📝 Recording in DMs AND Groups
╰──────❍
▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`, [], msg);
            return;
        }
        
        // PRIVATE ONLY LOCATION
        if (action === 'private') { 
            autorecordingConfig.location = 'private'; 
            await saveConfig(); 
            await sendStyledMessage(sock, chatId, `╭──❍「 *🎙️ AUTO RECORDING* 」❍
├ 💬 *Location: PRIVATE ONLY*
├ 📝 Recording in DMs only
╰──────❍
▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`, [], msg);
            return;
        }
        
        // GROUPS ONLY LOCATION
        if (action === 'groups') { 
            autorecordingConfig.location = 'groups'; 
            await saveConfig(); 
            await sendStyledMessage(sock, chatId, `╭──❍「 *🎙️ AUTO RECORDING* 」❍
├ 👥 *Location: GROUPS ONLY*
├ 📝 Recording in Groups only
╰──────❍
▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`, [], msg);
            return;
        }
        
        // SET DURATION COMMAND
        if (action === 'duration') {
            const minVal = parseInt(args[1]);
            const maxVal = parseInt(args[2]);
            
            if (isNaN(minVal) || isNaN(maxVal) || minVal < 1 || maxVal < minVal) {
                await sendStyledMessage(sock, chatId, `╭──❍「 *🎙️ AUTO RECORDING* 」❍
├ ❌ *Invalid duration*
├ 📝 *Use* : ${currentPrefix}autorecording duration 15 30
├ 📝 Min: 1-60 seconds, Max: > Min
╰──────❍
▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`, [], msg);
                return;
            }
            
            autorecordingConfig.minSeconds = minVal;
            autorecordingConfig.maxSeconds = maxVal;
            await saveConfig();
            
            await sendStyledMessage(sock, chatId, `╭──❍「 *🎙️ AUTO RECORDING* 」❍
├ ⏱️ *Duration Updated*
├ 📝 Min: ${minVal} seconds
├ 📝 Max: ${maxVal} seconds
╰──────❍
▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`, [], msg);
            console.log(`[AUTORECORDING] Duration set to ${minVal}-${maxVal} seconds`);
            return;
        }
        
        // RESET COMMAND
        if (action === 'reset') {
            autorecordingConfig = { enabled: false, location: 'both', minSeconds: 15, maxSeconds: 30 };
            await saveConfig();
            await sendStyledMessage(sock, chatId, `╭──❍「 *🎙️ AUTO RECORDING* 」❍
├ 🔄 *RESET TO DEFAULT*
├ 📝 Enabled: false, Location: both, Duration: 15-30 seconds
╰──────❍
▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`, [], msg);
            return;
        }
        
        // INVALID ACTION
        await sendStyledMessage(sock, chatId, `╭──❍「 *🎙️ AUTO RECORDING* 」❍
├ ❌ *Invalid action* : "${action}"
├ 📝 *Valid actions* : on, off, status, both, private, groups, duration, reset
╰──────❍
▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`, [], msg);
    }
};