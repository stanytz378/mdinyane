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

import fs from 'fs';
import path from 'path';
import moment from 'moment-timezone';
import { channelInfo } from '../../stanytz/messageConfig.js';

const OWNER_FILE = path.join(process.cwd(), 'owner.json');
const PREFIX_CONFIG_FILE = path.join(process.cwd(), 'prefix_config.json');
const DATA_DIR = path.join(process.cwd(), 'stanydata');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

// Global prefix config
let prefixConfig = {
    prefixes: ['.'],
    prefixless: false
};

// Load saved prefix config
try {
    if (fs.existsSync(PREFIX_CONFIG_FILE)) {
        const saved = JSON.parse(fs.readFileSync(PREFIX_CONFIG_FILE, 'utf8'));
        prefixConfig = { ...prefixConfig, ...saved };
    } else {
        fs.writeFileSync(PREFIX_CONFIG_FILE, JSON.stringify(prefixConfig, null, 2));
    }
} catch (e) {
    console.error('Error loading prefix config:', e);
}

// Export for other modules
export const getPrefixes = () => prefixConfig.prefixes;
export const isPrefixless = () => prefixConfig.prefixless;
export const getCurrentPrefix = () => prefixConfig.prefixes[0] || '.';

// Function to update prefix config
export function updatePrefixConfig(newConfig) {
    try {
        prefixConfig = { ...prefixConfig, ...newConfig };
        fs.writeFileSync(PREFIX_CONFIG_FILE, JSON.stringify(prefixConfig, null, 2));
        return true;
    } catch (error) {
        console.error('Error saving prefix config:', error);
        return false;
    }
}

// ============================================================
// ENHANCED OWNER CHECK
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
        try {
            await sock.sendMessage(chatId, { text: text, mentions: mentions }, { quoted: quoted });
        } catch (e) {
            console.error('Failed to send message:', e);
        }
    }
}

// ============================================================
// COMMAND EXPORT
// ============================================================

export default {
    name: 'prefix',
    description: 'Manage bot prefixes (multiple prefixes supported)',
    icon: '🔧',
    alias: ['setprefix', 'changeprefix', 'multiprefix', 'prefixes'],
    category: 'owner',
    ownerOnly: true,
    
    async execute(sock, msg, args, currentPrefix, options) {
        const chatId = msg.key.remoteJid;
        const senderId = msg.key.participant || chatId;
        
        // Check if sender is owner
        const isOwnerUser = isUserOwner(senderId, sock);
        
        if (!isOwnerUser) {
            const senderName = senderId.split('@')[0];
            await sendStyledMessage(sock, chatId, `╭──❍「 *🔧 PREFIX* 」❍
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
        
        const currentPrefixes = prefixConfig.prefixes;
        const prefixlessStatus = prefixConfig.prefixless;
        
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
        
        // ============================================================
        // SHOW STATUS (default)
        // ============================================================
        if (!action || action === 'status') {
            const prefixList = currentPrefixes.map(p => {
                if (p === ' ') return '[SPACE]';
                if (p === '\n') return '[NEWLINE]';
                if (p === '\t') return '[TAB]';
                return p;
            }).join(', ');
            
            await sendStyledMessage(sock, chatId, `╭──❍「 *🔧 PREFIX SETTINGS* 」❍
├ 📝 *Active Prefixes* : ${currentPrefixes.length}
├ 🔧 *Prefixes* : ${prefixList}
├ 🔓 *Prefixless Mode* : ${prefixlessStatus ? '✅ ENABLED' : '❌ DISABLED'}
├ 👑 *Owner* : +${ownerNumber}
├ 📅 *Date* : ${date}
├ 📆 *Day* : ${day}
├ ⏰ *Time* : ${time} EAT
╰─┬────❍
╭─┴─❍「 *📋 COMMANDS* 」❍
│ 🔧 ${currentPrefix}prefix add <symbol> - Add prefix
│ 🔧 ${currentPrefix}prefix remove <symbol> - Remove prefix
│ 🔧 ${currentPrefix}prefix list - Show all prefixes
│ 🔧 ${currentPrefix}prefix clear - Remove all prefixes
│ 🔧 ${currentPrefix}prefix none - Enable prefixless mode
│ 🔧 ${currentPrefix}prefix reset - Reset to default (.)
╰──────❍
╭─┴─❍「 *📝 EXAMPLES* 」❍
│ 🔹 ${currentPrefix}prefix add !
│ 🔹 ${currentPrefix}prefix add /
│ 🔹 ${currentPrefix}prefix add 🔥
│ 🔹 ${currentPrefix}prefix remove /
│ 🔹 ${currentPrefix}prefix none
│ 🔹 ${currentPrefix}prefix reset
╰──────❍
▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`, [], msg);
            return;
        }
        
        // ============================================================
        // ADD PREFIX
        // ============================================================
        if (action === 'add') {
            let newPrefix = args[1];
            
            if (!newPrefix) {
                await sendStyledMessage(sock, chatId, `╭──❍「 *🔧 PREFIX* 」❍
├ ❌ *Error* : Please provide a prefix to add
├ 📝 *Example* : ${currentPrefix}prefix add !
├ 📝 *Example* : ${currentPrefix}prefix add 🔥
╰──────❍
▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`, [], msg);
                return;
            }
            
            // Handle special characters
            if (newPrefix === 'space') newPrefix = ' ';
            if (newPrefix === 'tab') newPrefix = '\t';
            if (newPrefix === 'newline') newPrefix = '\n';
            
            let prefixes = [...currentPrefixes];
            
            if (prefixes.includes(newPrefix)) {
                await sendStyledMessage(sock, chatId, `╭──❍「 *🔧 PREFIX* 」❍
├ ⚠️ *Already Exists* : "${newPrefix}" is already a prefix
╰──────❍
▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`, [], msg);
                return;
            }
            
            prefixes.push(newPrefix);
            updatePrefixConfig({ prefixes: prefixes, prefixless: false });
            
            const displayPrefix = newPrefix === ' ' ? '[SPACE]' : newPrefix === '\t' ? '[TAB]' : newPrefix === '\n' ? '[NEWLINE]' : newPrefix;
            
            await sendStyledMessage(sock, chatId, `╭──❍「 *🔧 PREFIX* 」❍
├ ✅ *Prefix Added* : ${displayPrefix}
├ 📊 *Total Prefixes* : ${prefixes.length}
├ 📝 *Active Prefixes* : ${prefixes.join(', ')}
╰──────❍
▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`, [], msg);
            console.log(`[PREFIX] Added "${newPrefix}" by ${senderId.split('@')[0]}`);
            return;
        }
        
        // ============================================================
        // REMOVE PREFIX
        // ============================================================
        if (action === 'remove' || action === 'delete' || action === 'del') {
            let removePrefix = args[1];
            
            if (!removePrefix) {
                await sendStyledMessage(sock, chatId, `╭──❍「 *🔧 PREFIX* 」❍
├ ❌ *Error* : Please provide a prefix to remove
├ 📝 *Example* : ${currentPrefix}prefix remove !
╰──────❍
▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`, [], msg);
                return;
            }
            
            if (removePrefix === 'space') removePrefix = ' ';
            if (removePrefix === 'tab') removePrefix = '\t';
            if (removePrefix === 'newline') removePrefix = '\n';
            
            let prefixes = [...currentPrefixes];
            
            if (!prefixes.includes(removePrefix)) {
                await sendStyledMessage(sock, chatId, `╭──❍「 *🔧 PREFIX* 」❍
├ ❌ *Not Found* : "${removePrefix}" is not an active prefix
╰──────❍
▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`, [], msg);
                return;
            }
            
            if (prefixes.length === 1) {
                await sendStyledMessage(sock, chatId, `╭──❍「 *🔧 PREFIX* 」❍
├ ⚠️ *Cannot Remove Last Prefix*
├ 📝 *Suggestion* : Use "${currentPrefix}prefix none" for prefixless mode
╰──────❍
▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`, [], msg);
                return;
            }
            
            prefixes = prefixes.filter(p => p !== removePrefix);
            updatePrefixConfig({ prefixes: prefixes });
            
            const displayPrefix = removePrefix === ' ' ? '[SPACE]' : removePrefix === '\t' ? '[TAB]' : removePrefix === '\n' ? '[NEWLINE]' : removePrefix;
            
            await sendStyledMessage(sock, chatId, `╭──❍「 *🔧 PREFIX* 」❍
├ ✅ *Prefix Removed* : ${displayPrefix}
├ 📊 *Remaining Prefixes* : ${prefixes.length}
├ 📝 *Active Prefixes* : ${prefixes.join(', ')}
╰──────❍
▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`, [], msg);
            console.log(`[PREFIX] Removed "${removePrefix}" by ${senderId.split('@')[0]}`);
            return;
        }
        
        // ============================================================
        // LIST PREFIXES
        // ============================================================
        if (action === 'list') {
            let listText = `╭──❍「 *🔧 ACTIVE PREFIXES* 」❍\n`;
            for (let i = 0; i < currentPrefixes.length; i++) {
                const p = currentPrefixes[i];
                let display = p;
                if (p === ' ') display = '[SPACE]';
                if (p === '\t') display = '[TAB]';
                if (p === '\n') display = '[NEWLINE]';
                listText += `│ ${i + 1}. ${display}\n`;
            }
            listText += `├ 📊 *Total* : ${currentPrefixes.length}\n`;
            listText += `├ 👑 *Owner* : +${ownerNumber}\n`;
            listText += `├ 📅 *Date* : ${date}\n`;
            listText += `├ ⏰ *Time* : ${time} EAT\n`;
            listText += `╰──────❍\n`;
            listText += `▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`;
            
            await sendStyledMessage(sock, chatId, listText, [], msg);
            return;
        }
        
        // ============================================================
        // CLEAR ALL PREFIXES
        // ============================================================
        if (action === 'clear') {
            await sendStyledMessage(sock, chatId, `╭──❍「 *🔧 PREFIX* 」❍
├ ⚠️ *Warning* : This will remove all prefixes
├ 📝 *Default prefix (.) will be added back*
├ ❓ *Confirm* : Use "${currentPrefix}prefix reset" to reset
╰──────❍
▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`, [], msg);
            return;
        }
        
        // ============================================================
        // ENABLE PREFIXLESS MODE
        // ============================================================
        if (action === 'none' || action === 'off' || action === 'prefixless') {
            if (prefixConfig.prefixless) {
                await sendStyledMessage(sock, chatId, `╭──❍「 *🔧 PREFIX* 」❍
├ ⚠️ *Prefixless Mode* : Already ENABLED
├ 📝 *Commands work without prefix*
╰──────❍
▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`, [], msg);
                return;
            }
            
            updatePrefixConfig({ prefixless: true });
            
            await sendStyledMessage(sock, chatId, `╭──❍「 *🔧 PREFIX* 」❍
├ ✅ *Prefixless Mode* : ENABLED
├ 📝 *No prefix needed for commands*
├ 📝 *Example* : Type "menu" instead of ".menu"
╰──────❍
▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`, [], msg);
            console.log(`[PREFIX] Prefixless mode enabled by ${senderId.split('@')[0]}`);
            return;
        }
        
        // ============================================================
        // RESET TO DEFAULT
        // ============================================================
        if (action === 'reset' || action === 'default') {
            updatePrefixConfig({ prefixes: ['.'], prefixless: false });
            
            await sendStyledMessage(sock, chatId, `╭──❍「 *🔧 PREFIX* 」❍
├ ✅ *Prefix Reset*
├ 🔧 *Default Prefix* : .
├ 📊 *Total Prefixes* : 1
├ 📝 *Example* : .menu
╰──────❍
▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`, [], msg);
            console.log(`[PREFIX] Reset to default by ${senderId.split('@')[0]}`);
            return;
        }
        
        // ============================================================
        // INVALID COMMAND
        // ============================================================
        await sendStyledMessage(sock, chatId, `╭──❍「 *🔧 PREFIX* 」❍
├ ❌ *Invalid command* : ${action}
├ 📝 *Use* : ${currentPrefix}prefix for help
╰──────❍
▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`, [], msg);
    }
};