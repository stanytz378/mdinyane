/*****************************************************************************
 *                     Developed By STANY TZ                                 *
 *                                                                           *
 *  🌐  GitHub   : https://github.com/Stanytz378/iamlegendv2                 *
 *  ▶️  YouTube  : https://youtube.com/@STANYTZ                              *
 *  💬  WhatsApp : https://whatsapp.com/channel/0029Vb7fzu4EwEjmsD4Tzs1p     *
 *                                                                           *
 *    © 2026 STANY TZ. All rights reserved.                                 *
 *                                                                           *
 *****************************************************************************/

import { config, loadConfig, saveConfig, updateConfig } from './config.js';
import { 
    handleAutoTyping, 
    handleAutoRecording, 
    handleAutoRead,
    handleAlwaysOnline,
    startAlwaysOnline,
    stopAlwaysOnline,
    isChatAllowed
} from './handlers/index.js';
import { processCoreCommands } from './commands/index.js';
import isOwner from '../stanymain/isOwner.js';

let isInitialized = false;
let currentSock = null;

// ============================================================
// MAIN MESSAGE PROCESSOR
// ============================================================

export async function processMessage(sock, msg) {
    try {
        const chatId = msg.key.remoteJid;
        const senderId = msg.key.participant || chatId;
        
        if (chatId === 'status@broadcast') return;
        
        const textMsg = msg.message?.conversation || 
                       msg.message?.extendedTextMessage?.text || '';
        
        if (!textMsg) return;
        
        // Auto Read
        await handleAutoRead(sock, msg);
        
        // Check if it's a command
        const prefix = config.prefix;
        if (!textMsg.startsWith(prefix)) return;
        
        const spaceIndex = textMsg.indexOf(' ', prefix.length);
        const commandName = spaceIndex === -1 ? 
            textMsg.slice(prefix.length).toLowerCase().trim() : 
            textMsg.slice(prefix.length, spaceIndex).toLowerCase().trim();
        const args = spaceIndex === -1 ? [] : textMsg.slice(spaceIndex).trim().split(/\s+/);
        
        // Owner check for core commands
        const ownerCheck = await isOwner(senderId);
        
        // Check if chat is allowed based on mode
        const isAllowed = isChatAllowed(chatId, senderId, ownerCheck.isOwner);
        
        if (!isAllowed) {
            return;
        }
        
        // Process core commands (only for owner)
        if (ownerCheck.isOwner) {
            await processCoreCommands(sock, msg, commandName, args, prefix);
        }
        
    } catch (error) {
        console.error('Core process error:', error);
    }
}

// ============================================================
// AFTER COMMAND (Show typing and recording)
// ============================================================

export async function afterCommand(sock, chatId, senderId, isOwnerUser) {
    // Check if chat is allowed for auto features
    const isAllowed = isChatAllowed(chatId, senderId, isOwnerUser);
    if (!isAllowed) return;
    
    // Show typing and recording based on location settings
    await handleAutoTyping(sock, chatId, isOwnerUser, 2000);
    await handleAutoRecording(sock, chatId, isOwnerUser, 2000);
}

// ============================================================
// CHECK IF RESPONSE IS ALLOWED
// ============================================================

export function isResponseAllowed(chatId, senderId, isOwner) {
    return isChatAllowed(chatId, senderId, isOwner);
}

// ============================================================
// INITIALIZE CORE
// ============================================================

export async function initializeCore(sock) {
    if (isInitialized) return;
    
    currentSock = sock;
    console.log('🚀 STANY CORE initialized!');
    console.log(`📱 Bot Mode: ${config.mode.toUpperCase()}`);
    console.log(`⌨️ Auto Typing: ${config.autoTyping ? 'ON' : 'OFF'} (${config.autoTypingLocation})`);
    console.log(`🎙️ Auto Recording: ${config.autoRecording ? 'ON' : 'OFF'} (${config.autoRecordingLocation})`);
    
    if (config.alwaysOnline) {
        startAlwaysOnline(sock);
    }
    
    isInitialized = true;
}

export { config, updateConfig, loadConfig, saveConfig };