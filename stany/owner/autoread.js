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
const AUTOREAD_FILE = path.join(DATA_DIR, 'autoread.json');
const OWNER_FILE = path.join(process.cwd(), 'owner.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

// Load or create config
let autoreadConfig = { enabled: false, readGroups: true, readPrivate: true };
try {
    if (fs.existsSync(AUTOREAD_FILE)) {
        const saved = JSON.parse(fs.readFileSync(AUTOREAD_FILE, 'utf8'));
        autoreadConfig = { ...autoreadConfig, ...saved };
    } else {
        fs.writeFileSync(AUTOREAD_FILE, JSON.stringify(autoreadConfig, null, 2));
    }
} catch (e) {
    console.error('Error loading autoread config:', e);
}

// Track processed messages to avoid duplicate reads
const processedMessages = new Set();

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
        fs.writeFileSync(AUTOREAD_FILE, JSON.stringify(autoreadConfig, null, 2));
        return true;
    } catch (error) {
        console.error('Error saving autoread config:', error);
        return false;
    }
}

// ============================================================
// HANDLE AUTO READ - EXPORTED FOR MAIN INDEX.JS
// ============================================================

export async function handleAutoRead(sock, message) {
    try {
        // Check if feature is enabled
        if (!autoreadConfig.enabled) return;
        
        const chatId = message.key?.remoteJid;
        if (!chatId || chatId === 'status@broadcast') return;
        
        // Check if it's a group
        const isGroup = chatId.endsWith('@g.us');
        
        // Apply group/private filters
        if (isGroup && !autoreadConfig.readGroups) return;
        if (!isGroup && !autoreadConfig.readPrivate) return;
        
        // Avoid duplicate processing
        const msgId = message.key?.id;
        if (!msgId) return;
        
        const receiptKey = `${chatId}_${msgId}`;
        if (processedMessages.has(receiptKey)) return;
        
        // Mark as read
        await sock.readMessages([message.key]);
        processedMessages.add(receiptKey);
        
        // Clean up after 10 seconds
        setTimeout(() => {
            processedMessages.delete(receiptKey);
        }, 10000);
        
    } catch (error) {
        // Silent fail - don't spam logs
    }
}

// ============================================================
// COMMAND EXPORT
// ============================================================

export default {
    name: 'autoread',
    description: 'Auto read messages (automatically mark messages as read)',
    icon: '👁️',
    alias: ['aread', 'readmsg', 'autoseen', 'autoreadmsg', 'autoview'],
    category: 'owner',
    ownerOnly: true,
    
    async execute(sock, msg, args, currentPrefix, options) {
        const chatId = msg.key.remoteJid;
        const senderId = msg.key.participant || chatId;
        
        // Check if sender is owner
        const isOwnerUser = isUserOwner(senderId, sock);
        
        if (!isOwnerUser) {
            const senderName = senderId.split('@')[0];
            await sendStyledMessage(sock, chatId, `╭──❍「 *👁️ AUTO READ* 」❍
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
        
        // STATUS COMMAND
        if (!action || action === 'status') {
            const statusIcon = autoreadConfig.enabled ? '✅' : '❌';
            const statusText = autoreadConfig.enabled ? 'ENABLED' : 'DISABLED';
            const groupsIcon = autoreadConfig.readGroups ? '✅' : '❌';
            const privateIcon = autoreadConfig.readPrivate ? '✅' : '❌';
            
            const statusMsg = `╭──❍「 *👁️ AUTO READ* 」❍
├ 📝 *Status* : ${statusIcon} ${statusText}
├ 👥 *Groups* : ${groupsIcon}
├ 💬 *Private* : ${privateIcon}
├ 👑 *Owner* : +${ownerNumber}
├ 📅 *Date* : ${date}
├ 📆 *Day* : ${day}
├ ⏰ *Time* : ${time} EAT
╰─┬────❍
╭─┴─❍「 *📋 COMMANDS* 」❍
│ 🔧 ${currentPrefix}autoread on - Enable
│ 🔧 ${currentPrefix}autoread off - Disable
│ 🔧 ${currentPrefix}autoread groups on/off
│ 🔧 ${currentPrefix}autoread private on/off
╰──────❍
▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`;
            
            await sendStyledMessage(sock, chatId, statusMsg, [], msg);
            return;
        }
        
        // ENABLE COMMAND
        if (action === 'on') { 
            autoreadConfig.enabled = true; 
            await saveConfig(); 
            await sendStyledMessage(sock, chatId, `╭──❍「 *👁️ AUTO READ* 」❍
├ ✅ *ENABLED*
├ 📝 All incoming messages will be auto-read
╰──────❍
▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`, [], msg);
            console.log(`[AUTOREAD] Enabled by ${senderId.split('@')[0]}`);
            return;
        }
        
        // DISABLE COMMAND
        if (action === 'off') { 
            autoreadConfig.enabled = false; 
            await saveConfig(); 
            await sendStyledMessage(sock, chatId, `╭──❍「 *👁️ AUTO READ* 」❍
├ ❌ *DISABLED*
├ 📝 Messages will not be auto-read
╰──────❍
▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`, [], msg);
            console.log(`[AUTOREAD] Disabled by ${senderId.split('@')[0]}`);
            return;
        }
        
        // GROUPS COMMAND
        if (action === 'groups') {
            const sub = args[1]?.toLowerCase();
            if (sub === 'on') { 
                autoreadConfig.readGroups = true; 
                await saveConfig(); 
                await sendStyledMessage(sock, chatId, `╭──❍「 *👁️ AUTO READ* 」❍
├ ✅ *Groups ENABLED*
├ 📝 Messages in groups will be auto-read
╰──────❍
▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`, [], msg);
            } 
            else if (sub === 'off') { 
                autoreadConfig.readGroups = false; 
                await saveConfig(); 
                await sendStyledMessage(sock, chatId, `╭──❍「 *👁️ AUTO READ* 」❍
├ ❌ *Groups DISABLED*
├ 📝 Messages in groups will NOT be auto-read
╰──────❍
▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`, [], msg);
            } 
            else {
                await sendStyledMessage(sock, chatId, `╭──❍「 *👁️ AUTO READ* 」❍
├ ❌ *Invalid option* : ${sub || 'empty'}
├ 📝 *Use* : ${currentPrefix}autoread groups on/off
╰──────❍
▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`, [], msg);
            }
            return;
        }
        
        // PRIVATE COMMAND
        if (action === 'private') {
            const sub = args[1]?.toLowerCase();
            if (sub === 'on') { 
                autoreadConfig.readPrivate = true; 
                await saveConfig(); 
                await sendStyledMessage(sock, chatId, `╭──❍「 *👁️ AUTO READ* 」❍
├ ✅ *Private ENABLED*
├ 📝 Private messages will be auto-read
╰──────❍
▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`, [], msg);
            } 
            else if (sub === 'off') { 
                autoreadConfig.readPrivate = false; 
                await saveConfig(); 
                await sendStyledMessage(sock, chatId, `╭──❍「 *👁️ AUTO READ* 」❍
├ ❌ *Private DISABLED*
├ 📝 Private messages will NOT be auto-read
╰──────❍
▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`, [], msg);
            } 
            else {
                await sendStyledMessage(sock, chatId, `╭──❍「 *👁️ AUTO READ* 」❍
├ ❌ *Invalid option* : ${sub || 'empty'}
├ 📝 *Use* : ${currentPrefix}autoread private on/off
╰──────❍
▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`, [], msg);
            }
            return;
        }
        
        // RESET COMMAND
        if (action === 'reset') {
            autoreadConfig = { enabled: false, readGroups: true, readPrivate: true };
            await saveConfig();
            await sendStyledMessage(sock, chatId, `╭──❍「 *👁️ AUTO READ* 」❍
├ 🔄 *RESET TO DEFAULT*
├ 📝 Enabled: false, Groups: true, Private: true
╰──────❍
▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`, [], msg);
            return;
        }
        
        // INVALID ACTION
        await sendStyledMessage(sock, chatId, `╭──❍「 *👁️ AUTO READ* 」❍
├ ❌ *Invalid action* : "${action}"
├ 📝 *Valid actions* : on, off, status, groups, private, reset
╰──────❍
▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`, [], msg);
    }
};