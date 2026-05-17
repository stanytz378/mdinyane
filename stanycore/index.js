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

import { config, updateConfig } from './config.js';
import { 
    handleAutoTyping, 
    handleAutoRecording, 
    handleAutoRead,
    handleAlwaysOnline,
    startAlwaysOnline,
    stopAlwaysOnline,
    isChatAllowed
} from './handlers/index.js';
import isOwner from '../stanymain/isOwner.js';

let isInitialized = false;

// ============================================================
// MAIN MESSAGE PROCESSOR - Detect commands for core features
// ============================================================

export async function processMessage(sock, msg) {
    try {
        const chatId = msg.key.remoteJid;
        const senderId = msg.key.participant || chatId;
        
        if (chatId === 'status@broadcast') return;
        
        const textMsg = msg.message?.conversation || 
                       msg.message?.extendedTextMessage?.text || '';
        
        if (!textMsg) return;
        
        // Auto Read messages
        await handleAutoRead(sock, msg);
        
        // Detect prefixes
        const prefixes = config.prefixes || ['.'];
        const isPrefixless = config.prefixless;
        
        let commandName = '';
        let args = [];
        
        // Check with prefixes
        for (const prefix of prefixes) {
            if (textMsg.startsWith(prefix)) {
                const spaceIndex = textMsg.indexOf(' ', prefix.length);
                commandName = spaceIndex === -1 ? 
                    textMsg.slice(prefix.length).toLowerCase().trim() : 
                    textMsg.slice(prefix.length, spaceIndex).toLowerCase().trim();
                args = spaceIndex === -1 ? [] : textMsg.slice(spaceIndex).trim().split(/\s+/);
                break;
            }
        }
        
        // Prefixless mode
        if (!commandName && isPrefixless) {
            const words = textMsg.trim().split(/\s+/);
            commandName = words[0].toLowerCase();
            args = words.slice(1);
        }
        
        if (!commandName) return;
        
        // Check owner permission (core features only work for owner)
        const ownerCheck = await isOwner(senderId);
        if (!ownerCheck.isOwner) return;
        
        // Process core feature commands (these update config)
        // Note: Commands are handled by stany/owner/ files, not here
        // This just updates config when commands are processed elsewhere
        
    } catch (error) {
        console.error('Core process error:', error);
    }
}

// ============================================================
// AFTER COMMAND - Show typing and recording
// ============================================================

export async function afterCommand(sock, chatId, senderId, isOwnerUser) {
    const isAllowed = isChatAllowed(chatId, senderId, isOwnerUser);
    if (!isAllowed) return;
    
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
    
    console.log('🚀 STANY CORE initialized!');
    console.log(`📱 Mode: ${config.mode.toUpperCase()}`);
    console.log(`🔧 Prefixes: ${(config.prefixes || ['.']).join(', ')}`);
    
    if (config.alwaysOnline) {
        startAlwaysOnline(sock);
    }
    
    isInitialized = true;
}

export { config, updateConfig };