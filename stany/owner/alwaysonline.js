/*****************************************************************************
 *                     ALWAYS ONLINE - PRESENCE SPOOFER                      *
 *                     Developed By STANY TZ                                 *
 *                                                                           *
 *  🌐  GitHub   : https://github.com/Stanytz378/iamlegendv2                 *
 *  ▶️  YouTube  : https://youtube.com/@STANYTZ                              *
 *  💬  WhatsApp : https://whatsapp.com/channel/0029Vb7fzu4EwEjmsD4Tzs1p     *
 *                                                                           *
 *    © 2026 STANY TZ. All rights reserved.                                 *
 *                                                                           *
 *****************************************************************************/

import { config, updateConfig } from '../../stanycore/config.js';
import { channelInfo } from '../../stanytz/messageConfig.js';
import isOwner from '../../stanymain/isOwner.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const OWNER_FILE = path.join(process.cwd(), 'owner.json');
const PRESENCE_CONFIG_FILE = path.join(process.cwd(), 'owner_presence.json');

// Global variables for presence spoofing
let presenceInterval = null;
let isPresenceActive = false;
let currentOwnerJid = null;

// Platform detection
const isHeroku = process.env.HEROKU === 'true' || process.env.DYNO !== undefined;
const isPanel = process.env.PANEL === 'true' || fs.existsSync('/home/container');

// Function to send styled messages
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

// Function to keep owner online (presence spoofing)
async function keepOwnerOnline(sock, ownerJid) {
    try {
        if (!ownerJid || !sock || !isPresenceActive) return;
        
        // Send presence as available (online)
        await sock.sendPresenceUpdate('available', ownerJid);
        
        // Random activity simulation to look more realistic
        const activities = ['available', 'composing', 'recording'];
        const randomActivity = activities[Math.floor(Math.random() * activities.length)];
        
        if (randomActivity !== 'available') {
            setTimeout(async () => {
                try {
                    await sock.sendPresenceUpdate(randomActivity, ownerJid);
                    setTimeout(async () => {
                        await sock.sendPresenceUpdate('available', ownerJid);
                    }, 3000);
                } catch (e) {}
            }, 5000);
        }
        
    } catch (error) {
        // Silent fail - don't spam logs
    }
}

// Function to start owner presence spoofing
export function startAlwaysOnline(sock, ownerJid, options = {}) {
    if (presenceInterval) {
        clearInterval(presenceInterval);
    }
    
    if (!ownerJid) {
        console.log('[ALWAYS ONLINE] Error: No owner JID provided');
        return false;
    }
    
    currentOwnerJid = ownerJid;
    isPresenceActive = true;
    
    // Platform-specific interval
    const interval = options.interval || (isHeroku ? 25000 : 15000);
    
    console.log(`[ALWAYS ONLINE] Starting presence spoofing for owner: ${ownerJid.split('@')[0]}`);
    console.log(`[ALWAYS ONLINE] Platform: ${isHeroku ? 'Heroku' : (isPanel ? 'Panel' : 'Local')}, Interval: ${interval}ms`);
    
    // Initial presence update
    keepOwnerOnline(sock, ownerJid);
    
    // Set interval for continuous presence updates
    presenceInterval = setInterval(() => {
        if (sock && isPresenceActive) {
            keepOwnerOnline(sock, ownerJid);
        }
    }, interval);
    
    // Save config
    const presenceConfig = {
        enabled: true,
        ownerJid: ownerJid,
        ownerNumber: ownerJid.split('@')[0],
        interval: interval,
        platform: isHeroku ? 'Heroku' : (isPanel ? 'Panel' : 'Local'),
        startedAt: new Date().toISOString(),
        lastUpdate: new Date().toISOString()
    };
    fs.writeFileSync(PRESENCE_CONFIG_FILE, JSON.stringify(presenceConfig, null, 2));
    
    return true;
}

// Function to stop owner presence spoofing
export function stopAlwaysOnline() {
    if (presenceInterval) {
        clearInterval(presenceInterval);
        presenceInterval = null;
    }
    
    isPresenceActive = false;
    currentOwnerJid = null;
    
    // Update config
    const presenceConfig = {
        enabled: false,
        stoppedAt: new Date().toISOString(),
        platform: isHeroku ? 'Heroku' : (isPanel ? 'Panel' : 'Local')
    };
    fs.writeFileSync(PRESENCE_CONFIG_FILE, JSON.stringify(presenceConfig, null, 2));
    
    console.log('[ALWAYS ONLINE] Presence spoofing stopped');
    return true;
}

// Function to get current status
export function getAlwaysOnlineStatus() {
    return {
        enabled: isPresenceActive,
        ownerJid: currentOwnerJid,
        ownerNumber: currentOwnerJid ? currentOwnerJid.split('@')[0] : null,
        interval: presenceInterval ? 'active' : 'inactive',
        platform: isHeroku ? 'Heroku' : (isPanel ? 'Panel' : 'Local')
    };
}

// Function to get owner JID from various sources
async function getOwnerJid(sock, jidManager) {
    // Try from jidManager
    if (jidManager && jidManager.getOwnerInfo) {
        const ownerInfo = jidManager.getOwnerInfo();
        if (ownerInfo && ownerInfo.ownerJid) {
            return ownerInfo.ownerJid;
        }
    }
    
    // Try from owner.json
    if (fs.existsSync(OWNER_FILE)) {
        try {
            const data = JSON.parse(fs.readFileSync(OWNER_FILE, 'utf8'));
            const ownerJid = data.OWNER_CLEAN_JID || data.OWNER_JID;
            if (ownerJid) return ownerJid;
        } catch (e) {}
    }
    
    // Try from sock user (current device)
    if (sock && sock.user && sock.user.id) {
        return sock.user.id;
    }
    
    return null;
}

// Function to check if sender is owner (enhanced)
async function isSenderOwner(senderId, jidManager, sock) {
    try {
        const cleanNumber = senderId.split('@')[0].replace(/[^0-9]/g, '');
        
        // Check jidManager
        if (jidManager && typeof jidManager.isOwner === 'function') {
            const mockMsg = {
                key: { participant: senderId, remoteJid: senderId, fromMe: false }
            };
            if (jidManager.isOwner(mockMsg)) return true;
        }
        
        // Check sock
        if (sock && sock.user && sock.user.id) {
            const botNumber = sock.user.id.split('@')[0].replace(/[^0-9]/g, '');
            if (cleanNumber === botNumber) return true;
        }
        
        // Check owner.json
        if (fs.existsSync(OWNER_FILE)) {
            const data = JSON.parse(fs.readFileSync(OWNER_FILE, 'utf8'));
            const ownerNumber = data.OWNER_CLEAN_NUMBER || data.OWNER_NUMBER;
            if (cleanNumber === ownerNumber) return true;
        }
        
        // Check environment
        const envOwner = process.env.OWNER_NUMBER;
        if (envOwner && cleanNumber === envOwner.replace(/[^0-9]/g, '')) return true;
        
        return false;
    } catch (error) {
        return false;
    }
}

// Load saved presence state on startup
export function loadPresenceState(sock) {
    try {
        if (fs.existsSync(PRESENCE_CONFIG_FILE)) {
            const config = JSON.parse(fs.readFileSync(PRESENCE_CONFIG_FILE, 'utf8'));
            if (config.enabled === true && config.ownerJid) {
                console.log('[ALWAYS ONLINE] Loading saved presence state...');
                startAlwaysOnline(sock, config.ownerJid);
                return true;
            }
        }
    } catch (error) {
        console.log('[ALWAYS ONLINE] Could not load saved state:', error.message);
    }
    return false;
}

// Main command export
export default {
    name: 'alwaysonline',
    description: 'Keep owner online 24/7 (Fake online status - people see you online even when offline)',
    icon: '🟢',
    alias: ['online', 'stayonline', 'aonline', 'fakeonline', 'presence'],
    category: 'owner',
    ownerOnly: true,
    
    async execute(sock, msg, args, currentPrefix, { isOwner: isOwnerFn, jidManager, OWNER_JID, OWNER_NUMBER }) {
        const chatId = msg.key.remoteJid;
        const senderId = msg.key.participant || chatId;
        
        // Verify owner
        const isOwnerUser = await isSenderOwner(senderId, jidManager, sock);
        
        if (!isOwnerUser) {
            await sendStyledMessage(sock, chatId, `╭──❍「 *🟢 ALWAYS ONLINE* 」❍
├ 👤 *User* : @${senderId.split('@')[0]}
├ ❌ *Error* : Owner only command!
╰──────❍
▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`, [senderId], msg);
            return;
        }
        
        // Get owner JID
        let ownerJid = OWNER_JID || await getOwnerJid(sock, jidManager);
        
        if (!ownerJid && sock.user) {
            ownerJid = sock.user.id;
        }
        
        const action = args[0]?.toLowerCase();
        const platform = isHeroku ? 'Heroku' : (isPanel ? 'Panel' : 'Local');
        
        // Status command
        if (!action || action === 'status') {
            const status = getAlwaysOnlineStatus();
            const statusIcon = status.enabled ? '✅' : '❌';
            const statusText = status.enabled ? 'ENABLED' : 'DISABLED';
            const statusColor = status.enabled ? '🟢' : '🔴';
            
            await sendStyledMessage(sock, chatId, `╭──❍「 *${statusColor} ALWAYS ONLINE* 」❍
├ 📝 *Status* : ${statusIcon} ${statusText}
├ 👑 *Owner* : +${status.ownerNumber || OWNER_NUMBER || 'Not set'}
├ 🖥️ *Platform* : ${platform}
├ ⏱️ *Interval* : ${status.enabled ? (isHeroku ? '25s' : '15s') : 'N/A'}
╰─┬────❍
╭─┴─❍「 *📋 EFFECT* 」❍
│ 📱 *People see you ONLINE 24/7*
│ 💤 *Even when you're actually OFFLINE*
╰─┬────❍
╭─┴─❍「 *📋 COMMANDS* 」❍
│ 🔧 ${currentPrefix}alwaysonline on - Enable fake online
│ 🔧 ${currentPrefix}alwaysonline off - Disable fake online
│ 🔧 ${currentPrefix}alwaysonline status - Check status
╰──────❍
▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`, [senderId], msg);
            return;
        }
        
        // Enable command
        if (action === 'on' || action === 'enable') {
            if (!ownerJid) {
                await sendStyledMessage(sock, chatId, `╭──❍「 *🔴 ALWAYS ONLINE* 」❍
├ ❌ *Error* : Owner JID not found!
├ 📝 *Please reconnect bot first*
╰──────❍
▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`, [senderId], msg);
                return;
            }
            
            const interval = isHeroku ? 25000 : 15000;
            startAlwaysOnline(sock, ownerJid, { interval });
            
            // Also update main config
            updateConfig({ alwaysOnline: true });
            
            await sendStyledMessage(sock, chatId, `╭──❍「 *🟢 ALWAYS ONLINE* 」❍
├ ✅ *Status* : ENABLED
├ 👑 *Owner* : +${OWNER_NUMBER || ownerJid.split('@')[0]}
├ 🖥️ *Platform* : ${platform}
├ ⏱️ *Interval* : ${interval/1000} seconds
├ 📝 *Effect* : You will appear ONLINE 24/7
├ ⚠️ *Note* : Even when you're offline!
╰──────❍
▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`, [senderId], msg);
            
            console.log(`[ALWAYS ONLINE] Enabled by ${senderId.split('@')[0]} on ${platform}`);
            
        } 
        // Disable command
        else if (action === 'off' || action === 'disable') {
            stopAlwaysOnline();
            updateConfig({ alwaysOnline: false });
            
            await sendStyledMessage(sock, chatId, `╭──❍「 *🔴 ALWAYS ONLINE* 」❍
├ ❌ *Status* : DISABLED
├ 🖥️ *Platform* : ${platform}
├ 📝 *Effect* : Your real status will be shown
╰──────❍
▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`, [senderId], msg);
            
            console.log(`[ALWAYS ONLINE] Disabled by ${senderId.split('@')[0]} on ${platform}`);
            
        } 
        // Reset command
        else if (action === 'reset') {
            stopAlwaysOnline();
            startAlwaysOnline(sock, ownerJid);
            
            await sendStyledMessage(sock, chatId, `╭──❍「 *🟢 ALWAYS ONLINE* 」❍
├ 🔄 *Status* : RESET
├ 👑 *Owner* : +${OWNER_NUMBER || ownerJid.split('@')[0]}
├ 📝 *Presence spoofing restarted*
╰──────❍
▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`, [senderId], msg);
            
        }
        // Invalid action
        else {
            await sendStyledMessage(sock, chatId, `╭──❍「 *🟡 ALWAYS ONLINE* 」❍
├ ❌ *Invalid action* : "${action}"
├ 📝 *Valid actions* : on, off, status, reset
╰──────❍
▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`, [senderId], msg);
        }
    }
};