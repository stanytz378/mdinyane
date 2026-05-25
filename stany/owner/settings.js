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
const DATA_DIR = path.join(process.cwd(), 'stanydata');
const CONFIG_FILE = path.join(DATA_DIR, 'bot_config.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

// Default config
let botConfig = {
    prefix: '.',
    prefixes: ['.'],
    prefixless: false,
    mode: 'public',
    autoTyping: false,
    autoTypingLocation: 'both',
    autoRecording: false,
    autoRecordingLocation: 'both',
    autoRead: false,
    autoReadGroups: true,
    autoReadPrivate: true,
    alwaysOnline: false,
    welcomeEnabled: false,
    goodbyeEnabled: false,
    antiLink: false,
    antiBadword: false,
    antiSpam: false,
    antiMedia: false
};

// Load config from file
function loadConfig() {
    try {
        if (fs.existsSync(CONFIG_FILE)) {
            const saved = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
            botConfig = { ...botConfig, ...saved };
            console.log('[CONFIG] Loaded successfully');
        } else {
            saveConfig();
        }
    } catch (error) {
        console.error('Error loading config:', error);
    }
}

// Save config to file
function saveConfig() {
    try {
        fs.writeFileSync(CONFIG_FILE, JSON.stringify(botConfig, null, 2));
        return true;
    } catch (error) {
        console.error('Error saving config:', error);
        return false;
    }
}

// Update config
function updateConfig(updates) {
    botConfig = { ...botConfig, ...updates };
    saveConfig();
    return botConfig;
}

// Load config on module load
loadConfig();

// Export functions for other modules
export { botConfig, updateConfig, loadConfig, saveConfig };

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
    name: 'settings',
    description: 'Manage all bot settings in one place',
    icon: '⚙️',
    alias: ['config', 'setting', 'cfg', 'allsettings'],
    category: 'owner',
    ownerOnly: true,
    
    async execute(sock, msg, args, currentPrefix, options) {
        const chatId = msg.key.remoteJid;
        const senderId = msg.key.participant || chatId;
        
        // Check if sender is owner
        const isOwnerUser = isUserOwner(senderId, sock);
        
        if (!isOwnerUser) {
            const senderName = senderId.split('@')[0];
            await sendStyledMessage(sock, chatId, `╭──❍「 *⚙️ SETTINGS* 」❍
├ 👤 @${senderName}
├ ❌ *Owner only command!*
╰──────❍
▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`, [senderId], msg);
            return;
        }
        
        const action = args[0]?.toLowerCase();
        const subAction = args[1]?.toLowerCase();
        const value = args[2];
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
        
        // ============================================================
        // SHOW ALL SETTINGS (DEFAULT)
        // ============================================================
        if (!action || action === 'show' || action === 'status' || action === 'all') {
            const modeEmoji = {
                public: '🌍', private: '💬', groups: '👥', self: '🔒'
            }[botConfig.mode] || '🤖';
            
            const modeDesc = {
                public: 'All chats', private: 'Private only', groups: 'Groups only', self: 'Owner only'
            }[botConfig.mode] || 'All chats';
            
            const prefixList = (botConfig.prefixes || ['.']).map(p => {
                if (p === ' ') return '[SPACE]';
                if (p === '\n') return '[NEWLINE]';
                if (p === '\t') return '[TAB]';
                return p;
            }).join(', ');
            
            const settingsMsg = `╭──❍「 *⚙️ BOT SETTINGS* 」❍
├ 🤖 *Bot* : MDINYANE v2.0.0
├ 👑 *Owner* : +${ownerNumber}
├ 📅 *Date* : ${date}
├ 📆 *Day* : ${day}
├ ⏰ *Time* : ${time} EAT
╰─┬────❍
╭─┴─❍「 *🔧 PREFIX SETTINGS* 」❍
├ 🔹 *Prefixes* : ${prefixList}
├ 🔹 *Prefixless Mode* : ${botConfig.prefixless ? '✅ ON' : '❌ OFF'}
├ 🔹 *Total Prefixes* : ${botConfig.prefixes?.length || 1}
╰─┬────❍
╭─┴─❍「 *🎯 BOT MODE* 」❍
├ ${modeEmoji} *Mode* : ${botConfig.mode.toUpperCase()}
├ 📝 *Description* : ${modeDesc}
╰─┬────❍
╭─┴─❍「 *🤖 AUTO FEATURES* 」❍
├ ⌨️ *Auto Typing* : ${botConfig.autoTyping ? '✅ ON' : '❌ OFF'} (${botConfig.autoTypingLocation})
├ 🎙️ *Auto Recording* : ${botConfig.autoRecording ? '✅ ON' : '❌ OFF'} (${botConfig.autoRecordingLocation})
├ 👁️ *Auto Read* : ${botConfig.autoRead ? '✅ ON' : '❌ OFF'}
│   ├ 👥 Groups: ${botConfig.autoReadGroups ? '✅' : '❌'}
│   └ 💬 Private: ${botConfig.autoReadPrivate ? '✅' : '❌'}
├ 🟢 *Always Online* : ${botConfig.alwaysOnline ? '✅ ON' : '❌ OFF'}
╰─┬────❍
╭─┴─❍「 *🛡️ PROTECTION* 」❍
├ 🔗 *Anti-Link* : ${botConfig.antiLink ? '✅ ON' : '❌ OFF'}
├ 🚫 *Anti-Badword* : ${botConfig.antiBadword ? '✅ ON' : '❌ OFF'}
├ 🛡️ *Anti-Spam* : ${botConfig.antiSpam ? '✅ ON' : '❌ OFF'}
├ 🖼️ *Anti-Media* : ${botConfig.antiMedia ? '✅ ON' : '❌ OFF'}
╰─┬────❍
╭─┴─❍「 *👋 GROUP GREETINGS* 」❍
├ 👋 *Welcome* : ${botConfig.welcomeEnabled ? '✅ ON' : '❌ OFF'}
├ 👋 *Goodbye* : ${botConfig.goodbyeEnabled ? '✅ ON' : '❌ OFF'}
╰──────❍
╭─┴─❍「 *📋 QUICK COMMANDS* 」❍
│ 🔧 ${currentPrefix}settings mode public|private|groups|self
│ 🔧 ${currentPrefix}settings prefix add/remove/reset
│ 🔧 ${currentPrefix}settings typing on/off/both/private/groups
│ 🔧 ${currentPrefix}settings recording on/off/both/private/groups
│ 🔧 ${currentPrefix}settings autoread on/off
│ 🔧 ${currentPrefix}settings alwaysonline on/off
│ 🔧 ${currentPrefix}settings reset
╰──────❍
▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`;
            
            await sendStyledMessage(sock, chatId, settingsMsg, [], msg);
            return;
        }
        
        // ============================================================
        // HELP COMMAND
        // ============================================================
        if (action === 'help') {
            const helpMsg = `╭──❍「 *⚙️ SETTINGS HELP* 」❍
├ 📝 *All available commands*
╰─┬────❍
╭─┴─❍「 *🎯 MODE* 」❍
│ 🔧 ${currentPrefix}settings mode public
│ 🔧 ${currentPrefix}settings mode private
│ 🔧 ${currentPrefix}settings mode groups
│ 🔧 ${currentPrefix}settings mode self
╰─┬────❍
╭─┴─❍「 *🔧 PREFIX* 」❍
│ 🔧 ${currentPrefix}settings prefix add <symbol>
│ 🔧 ${currentPrefix}settings prefix remove <symbol>
│ 🔧 ${currentPrefix}settings prefix reset
│ 🔧 ${currentPrefix}settings prefixless on/off
╰─┬────❍
╭─┴─❍「 *⌨️ AUTO TYPING* 」❍
│ 🔧 ${currentPrefix}settings typing on/off
│ 🔧 ${currentPrefix}settings typing both
│ 🔧 ${currentPrefix}settings typing private
│ 🔧 ${currentPrefix}settings typing groups
╰─┬────❍
╭─┴─❍「 *🎙️ AUTO RECORDING* 」❍
│ 🔧 ${currentPrefix}settings recording on/off
│ 🔧 ${currentPrefix}settings recording both
│ 🔧 ${currentPrefix}settings recording private
│ 🔧 ${currentPrefix}settings recording groups
╰─┬────❍
╭─┴─❍「 *👁️ AUTO READ* 」❍
│ 🔧 ${currentPrefix}settings autoread on/off
│ 🔧 ${currentPrefix}settings autoread groups on/off
│ 🔧 ${currentPrefix}settings autoread private on/off
╰─┬────❍
╭─┴─❍「 *🟢 ALWAYS ONLINE* 」❍
│ 🔧 ${currentPrefix}settings alwaysonline on/off
╰─┬────❍
╭─┴─❍「 *🛡️ PROTECTION* 」❍
│ 🔧 ${currentPrefix}settings antilink on/off
│ 🔧 ${currentPrefix}settings antibadword on/off
│ 🔧 ${currentPrefix}settings antispam on/off
│ 🔧 ${currentPrefix}settings antimedia on/off
╰─┬────❍
╭─┴─❍「 *👋 GREETINGS* 」❍
│ 🔧 ${currentPrefix}settings welcome on/off
│ 🔧 ${currentPrefix}settings goodbye on/off
╰─┬────❍
╭─┴─❍「 *🔄 OTHER* 」❍
│ 🔧 ${currentPrefix}settings reset - Reset all
│ 🔧 ${currentPrefix}settings show - Show all
╰──────❍
▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`;
            
            await sendStyledMessage(sock, chatId, helpMsg, [], msg);
            return;
        }
        
        // ============================================================
        // BOT MODE
        // ============================================================
        if (action === 'mode') {
            if (!subAction || !['public', 'private', 'groups', 'self'].includes(subAction)) {
                await sendStyledMessage(sock, chatId, `╭──❍「 *⚙️ MODE* 」❍
├ ❌ *Invalid mode* : ${subAction || 'empty'}
├ 📝 *Valid* : public, private, groups, self
├ 📝 *Example* : ${currentPrefix}settings mode public
╰──────❍
▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`, [], msg);
                return;
            }
            updateConfig({ mode: subAction });
            await sendStyledMessage(sock, chatId, `╭──❍「 *⚙️ MODE* 」❍
├ ✅ *Mode changed to* : ${subAction.toUpperCase()}
├ 📝 *Description* : ${subAction === 'public' ? 'Works everywhere' : subAction === 'private' ? 'Private chats only' : subAction === 'groups' ? 'Groups only' : 'Owner only'}
╰──────❍
▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`, [], msg);
            console.log(`[SETTINGS] Mode changed to ${subAction} by ${senderId.split('@')[0]}`);
            return;
        }
        
        // ============================================================
        // PREFIX
        // ============================================================
        if (action === 'prefix') {
            let prefixes = [...(botConfig.prefixes || ['.'])];
            
            if (subAction === 'add') {
                if (!value) {
                    await sendStyledMessage(sock, chatId, `╭──❍「 *⚙️ PREFIX* 」❍
├ ❌ *Usage* : ${currentPrefix}settings prefix add <symbol>
├ 📝 *Example* : ${currentPrefix}settings prefix add !
╰──────❍
▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`, [], msg);
                    return;
                }
                if (!prefixes.includes(value)) {
                    prefixes.push(value);
                    updateConfig({ prefixes, prefixless: false });
                }
                await sendStyledMessage(sock, chatId, `╭──❍「 *⚙️ PREFIX* 」❍
├ ✅ *Added prefix* : ${value}
├ 📊 *Active prefixes* : ${prefixes.join(', ')}
╰──────❍
▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`, [], msg);
            }
            else if (subAction === 'remove' || subAction === 'delete') {
                if (!value) {
                    await sendStyledMessage(sock, chatId, `╭──❍「 *⚙️ PREFIX* 」❍
├ ❌ *Usage* : ${currentPrefix}settings prefix remove <symbol>
├ 📝 *Example* : ${currentPrefix}settings prefix remove !
╰──────❍
▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`, [], msg);
                    return;
                }
                prefixes = prefixes.filter(p => p !== value);
                if (prefixes.length === 0) prefixes = ['.'];
                updateConfig({ prefixes });
                await sendStyledMessage(sock, chatId, `╭──❍「 *⚙️ PREFIX* 」❍
├ ✅ *Removed prefix* : ${value}
├ 📊 *Active prefixes* : ${prefixes.join(', ')}
╰──────❍
▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`, [], msg);
            }
            else if (subAction === 'reset') {
                updateConfig({ prefixes: ['.'], prefixless: false });
                await sendStyledMessage(sock, chatId, `╭──❍「 *⚙️ PREFIX* 」❍
├ ✅ *Reset to default* : .
╰──────❍
▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`, [], msg);
            }
            else {
                await sendStyledMessage(sock, chatId, `╭──❍「 *⚙️ PREFIX* 」❍
├ 📝 *Commands* :
│ 🔧 ${currentPrefix}settings prefix add <symbol>
│ 🔧 ${currentPrefix}settings prefix remove <symbol>
│ 🔧 ${currentPrefix}settings prefix reset
╰──────❍
▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`, [], msg);
            }
            return;
        }
        
        // ============================================================
        // PREFIXLESS MODE
        // ============================================================
        if (action === 'prefixless') {
            if (subAction === 'on') {
                updateConfig({ prefixless: true });
                await sendStyledMessage(sock, chatId, `╭──❍「 *⚙️ PREFIXLESS* 」❍
├ ✅ *Prefixless mode ENABLED*
├ 📝 Commands work without prefix
├ 📝 Example: Type "menu" instead of ".menu"
╰──────❍
▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`, [], msg);
            } else if (subAction === 'off') {
                updateConfig({ prefixless: false });
                await sendStyledMessage(sock, chatId, `╭──❍「 *⚙️ PREFIXLESS* 」❍
├ ❌ *Prefixless mode DISABLED*
├ 📝 Prefix required for commands
╰──────❍
▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`, [], msg);
            } else {
                await sendStyledMessage(sock, chatId, `╭──❍「 *⚙️ PREFIXLESS* 」❍
├ 📝 *Usage* : ${currentPrefix}settings prefixless on/off
╰──────❍
▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`, [], msg);
            }
            return;
        }
        
        // ============================================================
        // AUTO TYPING
        // ============================================================
        if (action === 'typing') {
            if (subAction === 'on') {
                updateConfig({ autoTyping: true });
                await sendStyledMessage(sock, chatId, `╭──❍「 *⚙️ AUTO TYPING* 」❍
├ ✅ *Auto typing ENABLED*
├ 📝 Bot shows typing for every message
╰──────❍
▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`, [], msg);
            } else if (subAction === 'off') {
                updateConfig({ autoTyping: false });
                await sendStyledMessage(sock, chatId, `╭──❍「 *⚙️ AUTO TYPING* 」❍
├ ❌ *Auto typing DISABLED*
╰──────❍
▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`, [], msg);
            } else if (subAction === 'both') {
                updateConfig({ autoTypingLocation: 'both' });
                await sendStyledMessage(sock, chatId, `╭──❍「 *⚙️ AUTO TYPING* 」❍
├ 🌍 *Location* : BOTH (DM + Groups)
╰──────❍
▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`, [], msg);
            } else if (subAction === 'private') {
                updateConfig({ autoTypingLocation: 'private' });
                await sendStyledMessage(sock, chatId, `╭──❍「 *⚙️ AUTO TYPING* 」❍
├ 💬 *Location* : PRIVATE ONLY
╰──────❍
▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`, [], msg);
            } else if (subAction === 'groups') {
                updateConfig({ autoTypingLocation: 'groups' });
                await sendStyledMessage(sock, chatId, `╭──❍「 *⚙️ AUTO TYPING* 」❍
├ 👥 *Location* : GROUPS ONLY
╰──────❍
▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`, [], msg);
            } else {
                await sendStyledMessage(sock, chatId, `╭──❍「 *⚙️ AUTO TYPING* 」❍
├ 📝 *Commands* :
│ 🔧 ${currentPrefix}settings typing on/off
│ 🔧 ${currentPrefix}settings typing both/private/groups
╰──────❍
▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`, [], msg);
            }
            return;
        }
        
        // ============================================================
        // AUTO RECORDING
        // ============================================================
        if (action === 'recording') {
            if (subAction === 'on') {
                updateConfig({ autoRecording: true });
                await sendStyledMessage(sock, chatId, `╭──❍「 *⚙️ AUTO RECORDING* 」❍
├ ✅ *Auto recording ENABLED*
├ 📝 Bot shows recording for every message
╰──────❍
▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`, [], msg);
            } else if (subAction === 'off') {
                updateConfig({ autoRecording: false });
                await sendStyledMessage(sock, chatId, `╭──❍「 *⚙️ AUTO RECORDING* 」❍
├ ❌ *Auto recording DISABLED*
╰──────❍
▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`, [], msg);
            } else if (subAction === 'both') {
                updateConfig({ autoRecordingLocation: 'both' });
                await sendStyledMessage(sock, chatId, `╭──❍「 *⚙️ AUTO RECORDING* 」❍
├ 🌍 *Location* : BOTH (DM + Groups)
╰──────❍
▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`, [], msg);
            } else if (subAction === 'private') {
                updateConfig({ autoRecordingLocation: 'private' });
                await sendStyledMessage(sock, chatId, `╭──❍「 *⚙️ AUTO RECORDING* 」❍
├ 💬 *Location* : PRIVATE ONLY
╰──────❍
▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`, [], msg);
            } else if (subAction === 'groups') {
                updateConfig({ autoRecordingLocation: 'groups' });
                await sendStyledMessage(sock, chatId, `╭──❍「 *⚙️ AUTO RECORDING* 」❍
├ 👥 *Location* : GROUPS ONLY
╰──────❍
▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`, [], msg);
            } else {
                await sendStyledMessage(sock, chatId, `╭──❍「 *⚙️ AUTO RECORDING* 」❍
├ 📝 *Commands* :
│ 🔧 ${currentPrefix}settings recording on/off
│ 🔧 ${currentPrefix}settings recording both/private/groups
╰──────❍
▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`, [], msg);
            }
            return;
        }
        
        // ============================================================
        // AUTO READ
        // ============================================================
        if (action === 'autoread') {
            if (subAction === 'on') {
                updateConfig({ autoRead: true });
                await sendStyledMessage(sock, chatId, `╭──❍「 *⚙️ AUTO READ* 」❍
├ ✅ *Auto read ENABLED*
├ 📝 Messages auto-marked as read
╰──────❍
▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`, [], msg);
            } else if (subAction === 'off') {
                updateConfig({ autoRead: false });
                await sendStyledMessage(sock, chatId, `╭──❍「 *⚙️ AUTO READ* 」❍
├ ❌ *Auto read DISABLED*
╰──────❍
▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`, [], msg);
            } else if (subAction === 'groups') {
                const groupSetting = args[2]?.toLowerCase();
                if (groupSetting === 'on') {
                    updateConfig({ autoReadGroups: true });
                    await sendStyledMessage(sock, chatId, `╭──❍「 *⚙️ AUTO READ* 」❍
├ ✅ *Groups auto read ENABLED*
╰──────❍
▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`, [], msg);
                } else if (groupSetting === 'off') {
                    updateConfig({ autoReadGroups: false });
                    await sendStyledMessage(sock, chatId, `╭──❍「 *⚙️ AUTO READ* 」❍
├ ❌ *Groups auto read DISABLED*
╰──────❍
▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`, [], msg);
                } else {
                    await sendStyledMessage(sock, chatId, `╭──❍「 *⚙️ AUTO READ* 」❍
├ 📝 *Usage* : ${currentPrefix}settings autoread groups on/off
╰──────❍
▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`, [], msg);
                }
            } else if (subAction === 'private') {
                const privateSetting = args[2]?.toLowerCase();
                if (privateSetting === 'on') {
                    updateConfig({ autoReadPrivate: true });
                    await sendStyledMessage(sock, chatId, `╭──❍「 *⚙️ AUTO READ* 」❍
├ ✅ *Private auto read ENABLED*
╰──────❍
▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`, [], msg);
                } else if (privateSetting === 'off') {
                    updateConfig({ autoReadPrivate: false });
                    await sendStyledMessage(sock, chatId, `╭──❍「 *⚙️ AUTO READ* 」❍
├ ❌ *Private auto read DISABLED*
╰──────❍
▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`, [], msg);
                } else {
                    await sendStyledMessage(sock, chatId, `╭──❍「 *⚙️ AUTO READ* 」❍
├ 📝 *Usage* : ${currentPrefix}settings autoread private on/off
╰──────❍
▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`, [], msg);
                }
            } else {
                await sendStyledMessage(sock, chatId, `╭──❍「 *⚙️ AUTO READ* 」❍
├ 📝 *Commands* :
│ 🔧 ${currentPrefix}settings autoread on/off
│ 🔧 ${currentPrefix}settings autoread groups on/off
│ 🔧 ${currentPrefix}settings autoread private on/off
╰──────❍
▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`, [], msg);
            }
            return;
        }
        
        // ============================================================
        // ALWAYS ONLINE
        // ============================================================
        if (action === 'alwaysonline') {
            if (subAction === 'on') {
                updateConfig({ alwaysOnline: true });
                await sendStyledMessage(sock, chatId, `╭──❍「 *⚙️ ALWAYS ONLINE* 」❍
├ ✅ *Always online ENABLED*
├ 📝 Bot stays online 24/7
╰──────❍
▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`, [], msg);
            } else if (subAction === 'off') {
                updateConfig({ alwaysOnline: false });
                await sendStyledMessage(sock, chatId, `╭──❍「 *⚙️ ALWAYS ONLINE* 」❍
├ ❌ *Always online DISABLED*
╰──────❍
▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`, [], msg);
            } else {
                await sendStyledMessage(sock, chatId, `╭──❍「 *⚙️ ALWAYS ONLINE* 」❍
├ 📝 *Usage* : ${currentPrefix}settings alwaysonline on/off
╰──────❍
▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`, [], msg);
            }
            return;
        }
        
        // ============================================================
        // WELCOME/GREETINGS
        // ============================================================
        if (action === 'welcome') {
            if (subAction === 'on') {
                updateConfig({ welcomeEnabled: true });
                await sendStyledMessage(sock, chatId, `╭──❍「 *⚙️ WELCOME* 」❍
├ ✅ *Welcome messages ENABLED*
╰──────❍
▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`, [], msg);
            } else if (subAction === 'off') {
                updateConfig({ welcomeEnabled: false });
                await sendStyledMessage(sock, chatId, `╭──❍「 *⚙️ WELCOME* 」❍
├ ❌ *Welcome messages DISABLED*
╰──────❍
▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`, [], msg);
            } else {
                await sendStyledMessage(sock, chatId, `╭──❍「 *⚙️ WELCOME* 」❍
├ 📝 *Usage* : ${currentPrefix}settings welcome on/off
╰──────❍
▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`, [], msg);
            }
            return;
        }
        
        if (action === 'goodbye') {
            if (subAction === 'on') {
                updateConfig({ goodbyeEnabled: true });
                await sendStyledMessage(sock, chatId, `╭──❍「 *⚙️ GOODBYE* 」❍
├ ✅ *Goodbye messages ENABLED*
╰──────❍
▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`, [], msg);
            } else if (subAction === 'off') {
                updateConfig({ goodbyeEnabled: false });
                await sendStyledMessage(sock, chatId, `╭──❍「 *⚙️ GOODBYE* 」❍
├ ❌ *Goodbye messages DISABLED*
╰──────❍
▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`, [], msg);
            } else {
                await sendStyledMessage(sock, chatId, `╭──❍「 *⚙️ GOODBYE* 」❍
├ 📝 *Usage* : ${currentPrefix}settings goodbye on/off
╰──────❍
▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`, [], msg);
            }
            return;
        }
        
        // ============================================================
        // PROTECTION SETTINGS
        // ============================================================
        if (action === 'antilink') {
            if (subAction === 'on') {
                updateConfig({ antiLink: true });
                await sendStyledMessage(sock, chatId, `╭──❍「 *⚙️ ANTI-LINK* 」❍
├ ✅ *Anti-link ENABLED*
├ 📝 Links will be detected & action taken
╰──────❍
▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`, [], msg);
            } else if (subAction === 'off') {
                updateConfig({ antiLink: false });
                await sendStyledMessage(sock, chatId, `╭──❍「 *⚙️ ANTI-LINK* 」❍
├ ❌ *Anti-link DISABLED*
╰──────❍
▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`, [], msg);
            } else {
                await sendStyledMessage(sock, chatId, `╭──❍「 *⚙️ ANTI-LINK* 」❍
├ 📝 *Usage* : ${currentPrefix}settings antilink on/off
╰──────❍
▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`, [], msg);
            }
            return;
        }
        
        if (action === 'antibadword') {
            if (subAction === 'on') {
                updateConfig({ antiBadword: true });
                await sendStyledMessage(sock, chatId, `╭──❍「 *⚙️ ANTI-BADWORD* 」❍
├ ✅ *Anti-badword ENABLED*
├ 📝 Bad words will be detected & action taken
╰──────❍
▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`, [], msg);
            } else if (subAction === 'off') {
                updateConfig({ antiBadword: false });
                await sendStyledMessage(sock, chatId, `╭──❍「 *⚙️ ANTI-BADWORD* 」❍
├ ❌ *Anti-badword DISABLED*
╰──────❍
▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`, [], msg);
            } else {
                await sendStyledMessage(sock, chatId, `╭──❍「 *⚙️ ANTI-BADWORD* 」❍
├ 📝 *Usage* : ${currentPrefix}settings antibadword on/off
╰──────❍
▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`, [], msg);
            }
            return;
        }
        
        if (action === 'antispam') {
            if (subAction === 'on') {
                updateConfig({ antiSpam: true });
                await sendStyledMessage(sock, chatId, `╭──❍「 *⚙️ ANTI-SPAM* 」❍
├ ✅ *Anti-spam ENABLED*
├ 📝 Spam messages will be detected
╰──────❍
▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`, [], msg);
            } else if (subAction === 'off') {
                updateConfig({ antiSpam: false });
                await sendStyledMessage(sock, chatId, `╭──❍「 *⚙️ ANTI-SPAM* 」❍
├ ❌ *Anti-spam DISABLED*
╰──────❍
▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`, [], msg);
            } else {
                await sendStyledMessage(sock, chatId, `╭──❍「 *⚙️ ANTI-SPAM* 」❍
├ 📝 *Usage* : ${currentPrefix}settings antispam on/off
╰──────❍
▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`, [], msg);
            }
            return;
        }
        
        if (action === 'antimedia') {
            if (subAction === 'on') {
                updateConfig({ antiMedia: true });
                await sendStyledMessage(sock, chatId, `╭──❍「 *⚙️ ANTI-MEDIA* 」❍
├ ✅ *Anti-media ENABLED*
├ 📝 Media files will be detected
╰──────❍
▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`, [], msg);
            } else if (subAction === 'off') {
                updateConfig({ antiMedia: false });
                await sendStyledMessage(sock, chatId, `╭──❍「 *⚙️ ANTI-MEDIA* 」❍
├ ❌ *Anti-media DISABLED*
╰──────❍
▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`, [], msg);
            } else {
                await sendStyledMessage(sock, chatId, `╭──❍「 *⚙️ ANTI-MEDIA* 」❍
├ 📝 *Usage* : ${currentPrefix}settings antimedia on/off
╰──────❍
▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`, [], msg);
            }
            return;
        }
        
        // ============================================================
        // RESET ALL SETTINGS
        // ============================================================
        if (action === 'reset') {
            botConfig = {
                prefix: '.',
                prefixes: ['.'],
                prefixless: false,
                mode: 'public',
                autoTyping: false,
                autoTypingLocation: 'both',
                autoRecording: false,
                autoRecordingLocation: 'both',
                autoRead: false,
                autoReadGroups: true,
                autoReadPrivate: true,
                alwaysOnline: false,
                welcomeEnabled: false,
                goodbyeEnabled: false,
                antiLink: false,
                antiBadword: false,
                antiSpam: false,
                antiMedia: false
            };
            saveConfig();
            await sendStyledMessage(sock, chatId, `╭──❍「 *⚙️ RESET* 」❍
├ ✅ *All settings reset to default*
├ 📝 Bot configuration restored to factory settings
╰──────❍
▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`, [], msg);
            console.log(`[SETTINGS] All settings reset by ${senderId.split('@')[0]}`);
            return;
        }
        
        // ============================================================
        // INVALID COMMAND
        // ============================================================
        await sendStyledMessage(sock, chatId, `╭──❍「 *⚙️ SETTINGS* 」❍
├ ❌ *Unknown command* : ${action}
├ 📝 *Use* : ${currentPrefix}settings help for all commands
├ 📝 *Or* : ${currentPrefix}settings show to see current settings
╰──────❍
▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`, [], msg);
    }
};