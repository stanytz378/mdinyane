/*****************************************************************************
 *                                                                           *
 *                     Developed By STANY TZ                                 *
 *                                                                           *
 *  🌐  GitHub   : https://github.com/Stanytz378/iamlegendv2                 *
 *  ▶️  YouTube  : https://youtube.com/@STANYTZ                              *
 *  💬  WhatsApp : https://whatsapp.com/channel/0029Vb7fzu4EwEjmsD4Tzs1p     *
 *                                                                           *
 *    © 2026 STANY TZ. All rights reserved.                                 *
 *                                                                           *
 *    Description: MDINYANE Message Handler - Processes all messages        *
 *                                                                           *
 *****************************************************************************/

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';
import moment from 'moment-timezone';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Import configurations
import { channelInfo } from '../stanytz/messageConfig.js';
import { settingsDB, usageDB } from '../mdinyane/database.js';

// Import utilities
import { getAntilinkSetting } from '../katombwe/antilinkhelper.js';
import { getAntiBadword, containsBadWord, incrementWarningCount, resetWarningCount } from '../katombwe/antibadword.js';

// Data directory
const DATA_DIR = join(process.cwd(), 'stanydata');
const WELCOME_FILE = join(DATA_DIR, 'welcome_messages.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

// ============================================================
//  UTILITY FUNCTIONS
// ============================================================

/**
 * Print message to console with formatting
 */
async function printMessage(message, sock) {
    try {
        const chatId = message.key.remoteJid;
        const sender = message.key.participant || chatId;
        const pushName = message.pushName || 'Unknown';
        const timestamp = moment().tz('Africa/Dar_es_Salaam').format('HH:mm:ss');
        
        const text = message.message?.conversation ||
                    message.message?.extendedTextMessage?.text ||
                    message.message?.imageMessage?.caption ||
                    message.message?.videoMessage?.caption || '';
        
        const type = chatId.endsWith('@g.us') ? '👥 GROUP' : '💬 PRIVATE';
        
        console.log(`[${timestamp}] ${type} | ${pushName} (${sender.split('@')[0]}): ${text.substring(0, 50)}`);
    } catch (error) {
        // Silent fail
    }
}

/**
 * Print log message
 */
function printLog(level, message) {
    const timestamp = moment().tz('Africa/Dar_es_Salaam').format('HH:mm:ss');
    const levels = {
        info: 'ℹ️',
        success: '✅',
        warning: '⚠️',
        error: '❌',
        debug: '🔧'
    };
    console.log(`[${timestamp}] ${levels[level] || '📝'} ${message}`);
}

/**
 * Check if user is admin in group
 */
async function isAdmin(sock, chatId, senderId) {
    try {
        if (!chatId.endsWith('@g.us')) return { isSenderAdmin: false, isBotAdmin: false };
        
        const metadata = await sock.groupMetadata(chatId);
        const participants = metadata.participants || [];
        const botId = sock.user.id.split(':')[0] + '@s.whatsapp.net';
        
        const isBotAdmin = participants.some(p => p.id === botId && (p.admin === 'admin' || p.admin === 'superadmin'));
        const isSenderAdmin = participants.some(p => p.id === senderId && (p.admin === 'admin' || p.admin === 'superadmin'));
        
        return { isSenderAdmin, isBotAdmin };
    } catch (error) {
        return { isSenderAdmin: false, isBotAdmin: false };
    }
}

/**
 * Check if user is owner or sudo
 */
async function isOwnerOrSudo(senderId, sock, chatId) {
    try {
        const ownerFile = join(process.cwd(), 'owner.json');
        if (fs.existsSync(ownerFile)) {
            const data = JSON.parse(fs.readFileSync(ownerFile, 'utf8'));
            const ownerNumber = data.OWNER_CLEAN_NUMBER || data.OWNER_NUMBER;
            const senderNumber = senderId.split('@')[0].replace(/[^0-9]/g, '');
            if (senderNumber === ownerNumber) return true;
        }
        return false;
    } catch {
        return false;
    }
}

/**
 * Check if user is banned
 */
async function isBanned(userId) {
    try {
        const bannedFile = join(DATA_DIR, 'banned.json');
        if (fs.existsSync(bannedFile)) {
            const data = JSON.parse(fs.readFileSync(bannedFile, 'utf8'));
            const cleanId = userId.split('@')[0].replace(/[^0-9]/g, '');
            return data.users?.some(u => u.cleanId === cleanId || u.id === userId) || false;
        }
        return false;
    } catch {
        return false;
    }
}

/**
 * Check if message contains URL
 */
function containsURL(str) {
    const urlRegex = /(https?:\/\/)?([a-z0-9-]+\.)+[a-z]{2,}(\/[^\s]*)?/i;
    return urlRegex.test(str);
}

/**
 * Load welcome messages
 */
async function loadWelcomeMessages() {
    try {
        if (fs.existsSync(WELCOME_FILE)) {
            const data = fs.readFileSync(WELCOME_FILE, 'utf8');
            return JSON.parse(data);
        }
        return {};
    } catch {
        return {};
    }
}

/**
 * Save welcome message
 */
async function saveWelcomeMessage(groupId, message) {
    try {
        const welcomes = await loadWelcomeMessages();
        welcomes[groupId] = {
            message: message,
            updatedAt: new Date().toISOString()
        };
        fs.writeFileSync(WELCOME_FILE, JSON.stringify(welcomes, null, 2));
        return true;
    } catch {
        return false;
    }
}

/**
 * Get welcome message
 */
async function getWelcomeMessage(groupId) {
    try {
        const welcomes = await loadWelcomeMessages();
        return welcomes[groupId]?.message || null;
    } catch {
        return null;
    }
}

// ============================================================
//  GROUP PROTECTION HANDLERS
// ============================================================

/**
 * Handle Antilink detection
 */
async function handleLinkDetection(sock, chatId, message, userMessage, senderId) {
    try {
        const setting = await getAntilinkSetting(chatId);
        if (!setting.enabled) return;
        
        if (!containsURL(userMessage)) return;
        
        // Delete the message
        await sock.sendMessage(chatId, { delete: message.key });
        
        const mention = { mentions: [senderId] };
        const action = setting.action;
        
        switch (action) {
            case 'delete':
                await sock.sendMessage(chatId, {
                    text: `🔗 @${senderId.split('@')[0]} links are not allowed here!`,
                    ...mention,
                    contextInfo: channelInfo?.contextInfo
                });
                break;
                
            case 'kick':
                await sock.groupParticipantsUpdate(chatId, [senderId], 'remove');
                await sock.sendMessage(chatId, {
                    text: `👢 @${senderId.split('@')[0]} has been kicked for sending links!`,
                    ...mention,
                    contextInfo: channelInfo?.contextInfo
                });
                break;
                
            case 'warn':
                const warningCount = await incrementWarningCount(chatId, senderId);
                if (warningCount >= 3) {
                    await sock.groupParticipantsUpdate(chatId, [senderId], 'remove');
                    await resetWarningCount(chatId, senderId);
                    await sock.sendMessage(chatId, {
                        text: `⚠️ @${senderId.split('@')[0]} has been kicked after 3 warnings for sending links!`,
                        ...mention,
                        contextInfo: channelInfo?.contextInfo
                    });
                } else {
                    await sock.sendMessage(chatId, {
                        text: `⚠️ @${senderId.split('@')[0]} Warning ${warningCount}/3: Links are not allowed!`,
                        ...mention,
                        contextInfo: channelInfo?.contextInfo
                    });
                }
                break;
        }
    } catch (error) {
        printLog('error', `Link detection error: ${error.message}`);
    }
}

/**
 * Handle AntiBadword detection
 */
async function handleBadwordDetection(sock, chatId, message, userMessage, senderId) {
    try {
        const setting = await getAntiBadword(chatId);
        if (!setting.enabled) return;
        
        if (!containsBadWord(userMessage)) return;
        
        // Delete the message
        await sock.sendMessage(chatId, { delete: message.key });
        
        const mention = { mentions: [senderId] };
        const action = setting.action;
        
        switch (action) {
            case 'delete':
                await sock.sendMessage(chatId, {
                    text: `⚠️ @${senderId.split('@')[0]} bad words are not allowed here!`,
                    ...mention,
                    contextInfo: channelInfo?.contextInfo
                });
                break;
                
            case 'kick':
                await sock.groupParticipantsUpdate(chatId, [senderId], 'remove');
                await sock.sendMessage(chatId, {
                    text: `👢 @${senderId.split('@')[0]} has been kicked for using bad words!`,
                    ...mention,
                    contextInfo: channelInfo?.contextInfo
                });
                break;
                
            case 'warn':
                const warningCount = await incrementWarningCount(chatId, senderId);
                if (warningCount >= 3) {
                    await sock.groupParticipantsUpdate(chatId, [senderId], 'remove');
                    await resetWarningCount(chatId, senderId);
                    await sock.sendMessage(chatId, {
                        text: `⚠️ @${senderId.split('@')[0]} has been kicked after 3 warnings for using bad words!`,
                        ...mention,
                        contextInfo: channelInfo?.contextInfo
                    });
                } else {
                    await sock.sendMessage(chatId, {
                        text: `⚠️ @${senderId.split('@')[0]} Warning ${warningCount}/3: Bad words are not allowed!`,
                        ...mention,
                        contextInfo: channelInfo?.contextInfo
                    });
                }
                break;
        }
    } catch (error) {
        printLog('error', `Badword detection error: ${error.message}`);
    }
}

/**
 * Handle welcome message on group join
 */
async function handleJoinEvent(sock, groupId, participants) {
    try {
        const welcomeMessage = await getWelcomeMessage(groupId);
        if (!welcomeMessage) return;
        
        for (const participant of participants) {
            const participantId = typeof participant === 'string' ? participant : participant.id;
            await sock.sendMessage(groupId, {
                text: welcomeMessage.replace('{name}', participantId.split('@')[0]),
                mentions: [participantId],
                contextInfo: channelInfo?.contextInfo
            });
        }
    } catch (error) {
        printLog('error', `Welcome message error: ${error.message}`);
    }
}

/**
 * Handle goodbye message on group leave
 */
async function handleLeaveEvent(sock, groupId, participants) {
    try {
        // Optional goodbye message
        for (const participant of participants) {
            const participantId = typeof participant === 'string' ? participant : participant.id;
            printLog('info', `User left: ${participantId.split('@')[0]} from ${groupId}`);
        }
    } catch (error) {
        printLog('error', `Goodbye message error: ${error.message}`);
    }
}

/**
 * Handle promote event
 */
async function handlePromotionEvent(sock, groupId, participants, author) {
    try {
        for (const participant of participants) {
            const participantId = typeof participant === 'string' ? participant : participant.id;
            printLog('success', `Promoted: ${participantId.split('@')[0]} in ${groupId}`);
        }
    } catch (error) {
        printLog('error', `Promote event error: ${error.message}`);
    }
}

/**
 * Handle demote event
 */
async function handleDemotionEvent(sock, groupId, participants, author) {
    try {
        for (const participant of participants) {
            const participantId = typeof participant === 'string' ? participant : participant.id;
            printLog('warning', `Demoted: ${participantId.split('@')[0]} in ${groupId}`);
        }
    } catch (error) {
        printLog('error', `Demote event error: ${error.message}`);
    }
}

// ============================================================
//  MAIN MESSAGE HANDLER
// ============================================================

/**
 * Handle incoming messages
 */
async function handleMessages(sock, messageUpdate) {
    try {
        const { messages, type } = messageUpdate;
        if (type !== 'notify') return;
        
        const message = messages[0];
        if (!message?.message) return;
        
        // Print message to console
        await printMessage(message, sock);
        
        const chatId = message.key.remoteJid;
        const senderId = message.key.participant || chatId;
        const isGroup = chatId.endsWith('@g.us');
        
        // Auto-read messages (optional)
        try {
            await sock.readMessages([message.key]);
        } catch (error) {
            // Silent fail
        }
        
        // Handle status broadcasts
        if (chatId === 'status@broadcast') {
            printLog('info', `Status update from ${senderId.split('@')[0]}`);
            return;
        }
        
        // Get message text
        const textMsg = message.message?.conversation ||
                       message.message?.extendedTextMessage?.text ||
                       message.message?.imageMessage?.caption ||
                       message.message?.videoMessage?.caption || '';
        
        // Check if user is banned
        const userBanned = await isBanned(senderId);
        if (userBanned && !textMsg.toLowerCase().startsWith('.unban')) {
            return;
        }
        
        // Get bot mode and check permissions
        const botMode = settingsDB.get().mode || 'public';
        const isOwner = await isOwnerOrSudo(senderId, sock, chatId);
        
        // Group protection handlers
        if (isGroup && !message.key.fromMe && !isOwner) {
            // Check if bot is admin
            const { isBotAdmin } = await isAdmin(sock, chatId, sock.user.id);
            
            if (isBotAdmin) {
                // Anti-link
                await handleLinkDetection(sock, chatId, message, textMsg, senderId);
                // Anti-badword
                await handleBadwordDetection(sock, chatId, message, textMsg, senderId);
            }
        }
        
        // Get prefix
        const prefix = settingsDB.get().prefix || '.';
        const isPrefixless = settingsDB.get().isPrefixless || false;
        
        // Check for command
        let commandName = '';
        let args = [];
        
        if (!isPrefixless && textMsg.startsWith(prefix)) {
            const spaceIndex = textMsg.indexOf(' ', prefix.length);
            commandName = spaceIndex === -1 ? 
                textMsg.slice(prefix.length).toLowerCase().trim() : 
                textMsg.slice(prefix.length, spaceIndex).toLowerCase().trim();
            args = spaceIndex === -1 ? [] : textMsg.slice(spaceIndex).trim().split(/\s+/);
        }
        
        // If no command found, return
        if (!commandName) return;
        
        // Track command usage
        usageDB.increment(commandName, senderId);
        
        printLog('command', `${senderId.split('@')[0]} → ${prefix}${commandName}`);
        
        // Here you would execute the command from your commands map
        // This is handled in your index.js
        
    } catch (error) {
        printLog('error', `Message handler error: ${error.message}`);
        console.error(error.stack);
    }
}

/**
 * Handle group participant updates
 */
async function handleGroupParticipantUpdate(sock, update) {
    try {
        const { id, participants, action, author } = update;
        
        if (!id.endsWith('@g.us')) return;
        
        printLog('info', `Group update: ${action} in ${id.split('@')[0]}`);
        
        switch (action) {
            case 'add':
                await handleJoinEvent(sock, id, participants);
                break;
            case 'remove':
                await handleLeaveEvent(sock, id, participants);
                break;
            case 'promote':
                await handlePromotionEvent(sock, id, participants, author);
                break;
            case 'demote':
                await handleDemotionEvent(sock, id, participants, author);
                break;
            default:
                printLog('info', `Unhandled group action: ${action}`);
        }
    } catch (error) {
        printLog('error', `Group update error: ${error.message}`);
    }
}

/**
 * Handle status updates
 */
async function handleStatus(sock, status) {
    try {
        const statusData = status[0];
        if (!statusData) return;
        
        printLog('info', `Status update received`);
    } catch (error) {
        printLog('error', `Status handler error: ${error.message}`);
    }
}

/**
 * Handle calls
 */
async function handleCall(sock, calls) {
    try {
        // Anti-call feature
        const anticallEnabled = settingsDB.get().anticall || false;
        
        if (anticallEnabled) {
            for (const call of calls) {
                const callerJid = call.from || call.peerJid;
                if (callerJid) {
                    await sock.sendMessage(callerJid, {
                        text: '📵 *Anti-Call Enabled*\n\nCalls are not allowed. You have been blocked.',
                        contextInfo: channelInfo?.contextInfo
                    });
                    await sock.updateBlockStatus(callerJid, 'block');
                    printLog('warning', `Blocked caller: ${callerJid.split('@')[0]}`);
                }
            }
        }
    } catch (error) {
        printLog('error', `Call handler error: ${error.message}`);
    }
}

// ============================================================
//  EXPORTS
// ============================================================

export {
    handleMessages,
    handleGroupParticipantUpdate,
    handleStatus,
    handleCall,
    isAdmin,
    isOwnerOrSudo,
    isBanned,
    getWelcomeMessage,
    saveWelcomeMessage,
    printLog
};
