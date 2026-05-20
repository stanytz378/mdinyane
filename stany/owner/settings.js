/*****************************************************************************
 *                     Developed By STANY TZ                                 *
 *****************************************************************************/

import fs from 'fs';
import path from 'path';
import moment from 'moment-timezone';
import { channelInfo } from '../../stanytz/messageConfig.js';
import isOwner from '../../stanymain/isOwner.js';

// Config file
const DATA_DIR = path.join(process.cwd(), 'stanydata');
const CONFIG_FILE = path.join(DATA_DIR, 'bot_config.json');

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

function loadConfig() {
    try {
        if (fs.existsSync(CONFIG_FILE)) {
            const saved = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
            botConfig = { ...botConfig, ...saved };
        } else {
            saveConfig();
        }
    } catch (error) {
        console.error('Error loading config:', error);
    }
}

function saveConfig() {
    try {
        fs.writeFileSync(CONFIG_FILE, JSON.stringify(botConfig, null, 2));
        return true;
    } catch (error) {
        return false;
    }
}

function updateConfig(updates) {
    botConfig = { ...botConfig, ...updates };
    saveConfig();
    return botConfig;
}

loadConfig();

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

export default {
    name: 'settings',
    description: 'Manage all bot settings',
    icon: '⚙️',
    alias: ['config', 'setting', 'cfg'],
    category: 'owner',
    ownerOnly: true,
    
    async execute(sock, msg, args, currentPrefix, { isOwner, jidManager }) {
        const chatId = msg.key.remoteJid;
        const senderId = msg.key.participant || chatId;
        
        const ownerCheck = await isOwner(senderId, jidManager);
        if (!ownerCheck.isOwner) {
            await sendStyledMessage(sock, chatId, `╭──❍「 *⚙️ SETTINGS* 」❍
├ 👤 *User* : @${senderId.split('@')[0]}
├ ❌ *Error* : Owner only command!
╰──────❍`, [senderId], msg);
            return;
        }
        
        const action = args[0]?.toLowerCase();
        const subAction = args[1]?.toLowerCase();
        const value = args[2];
        const now = moment().tz('Africa/Dar_es_Salaam');
        
        // ============================================================
        // SHOW ALL SETTINGS
        // ============================================================
        if (!action || action === 'show' || action === 'status') {
            const modeEmoji = botConfig.mode === 'public' ? '🌍' : 
                             botConfig.mode === 'private' ? '💬' : 
                             botConfig.mode === 'groups' ? '👥' : '🔒';
            
            const prefixList = (botConfig.prefixes || ['.']).join(', ');
            
            await sendStyledMessage(sock, chatId, `╭──❍「 *⚙️ BOT SETTINGS* 」❍
├ 🤖 *Bot* : MDINYANE v2.0.0
├ 📅 *Date* : ${now.format('DD/MM/YYYY')}
├ ⏰ *Time* : ${now.format('HH:mm:ss')} EAT
╰─┬────❍
╭─┴─❍「 *🔧 PREFIX SETTINGS* 」❍
├ 🔹 *Prefixes* : ${prefixList}
├ 🔹 *Prefixless Mode* : ${botConfig.prefixless ? '✅ ON' : '❌ OFF'}
╰─┬────❍
╭─┴─❍「 *🎯 BOT MODE* 」❍
├ ${modeEmoji} *Mode* : ${botConfig.mode.toUpperCase()}
├ 📝 *Desc* : ${botConfig.mode === 'public' ? 'All chats' : botConfig.mode === 'private' ? 'Private only' : botConfig.mode === 'groups' ? 'Groups only' : 'Owner only'}
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
╭─┴─❍「 *📋 COMMANDS* 」❍
│ 🔧 ${currentPrefix}settings show - Show all settings
│ 🔧 ${currentPrefix}settings mode <public/private/groups/self>
│ 🔧 ${currentPrefix}settings prefix add <symbol>
│ 🔧 ${currentPrefix}settings prefix remove <symbol>
│ 🔧 ${currentPrefix}settings prefix reset
│ 🔧 ${currentPrefix}settings prefixless on/off
│ 🔧 ${currentPrefix}settings typing on/off/both/private/groups
│ 🔧 ${currentPrefix}settings recording on/off/both/private/groups
│ 🔧 ${currentPrefix}settings autoread on/off
│ 🔧 ${currentPrefix}settings autoread groups on/off
│ 🔧 ${currentPrefix}settings autoread private on/off
│ 🔧 ${currentPrefix}settings alwaysonline on/off
│ 🔧 ${currentPrefix}settings welcome on/off
│ 🔧 ${currentPrefix}settings goodbye on/off
│ 🔧 ${currentPrefix}settings antilink on/off
│ 🔧 ${currentPrefix}settings antibadword on/off
│ 🔧 ${currentPrefix}settings antispam on/off
│ 🔧 ${currentPrefix}settings antimedia on/off
│ 🔧 ${currentPrefix}settings reset - Reset all to default
╰──────❍
▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`, [], msg);
            return;
        }
        
        // ============================================================
        // BOT MODE
        // ============================================================
        if (action === 'mode') {
            if (!subAction || !['public', 'private', 'groups', 'self'].includes(subAction)) {
                await sendStyledMessage(sock, chatId, `╭──❍「 *⚙️ MODE* 」❍
├ ❌ Usage: ${currentPrefix}settings mode public|private|groups|self
╰──────❍`, [], msg);
                return;
            }
            updateConfig({ mode: subAction });
            await sendStyledMessage(sock, chatId, `╭──❍「 *⚙️ MODE* 」❍
├ ✅ Mode changed to: ${subAction.toUpperCase()}
╰──────❍`, [], msg);
            return;
        }
        
        // ============================================================
        // PREFIX
        // ============================================================
        if (action === 'prefix') {
            let prefixes = botConfig.prefixes || ['.'];
            
            if (subAction === 'add') {
                if (!value) {
                    await sendStyledMessage(sock, chatId, `╭──❍「 *⚙️ PREFIX* 」❍
├ ❌ Usage: ${currentPrefix}settings prefix add <symbol>
├ 📝 Example: ${currentPrefix}settings prefix add !
╰──────❍`, [], msg);
                    return;
                }
                if (!prefixes.includes(value)) {
                    prefixes.push(value);
                    updateConfig({ prefixes, prefixless: false });
                }
                await sendStyledMessage(sock, chatId, `╭──❍「 *⚙️ PREFIX* 」❍
├ ✅ Added prefix: ${value}
├ 📊 Active: ${prefixes.join(', ')}
╰──────❍`, [], msg);
            }
            else if (subAction === 'remove') {
                if (!value) {
                    await sendStyledMessage(sock, chatId, `╭──❍「 *⚙️ PREFIX* 」❍
├ ❌ Usage: ${currentPrefix}settings prefix remove <symbol>
╰──────❍`, [], msg);
                    return;
                }
                prefixes = prefixes.filter(p => p !== value);
                if (prefixes.length === 0) prefixes = ['.'];
                updateConfig({ prefixes });
                await sendStyledMessage(sock, chatId, `╭──❍「 *⚙️ PREFIX* 」❍
├ ✅ Removed prefix: ${value}
├ 📊 Active: ${prefixes.join(', ')}
╰──────❍`, [], msg);
            }
            else if (subAction === 'reset') {
                updateConfig({ prefixes: ['.'], prefixless: false });
                await sendStyledMessage(sock, chatId, `╭──❍「 *⚙️ PREFIX* 」❍
├ ✅ Reset to default prefix: .
╰──────❍`, [], msg);
            }
            else {
                await sendStyledMessage(sock, chatId, `╭──❍「 *⚙️ PREFIX* 」❍
├ 📝 Commands:
│ 🔧 ${currentPrefix}settings prefix add <symbol>
│ 🔧 ${currentPrefix}settings prefix remove <symbol>
│ 🔧 ${currentPrefix}settings prefix reset
╰──────❍`, [], msg);
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
├ ✅ Prefixless mode ENABLED
├ 📝 Commands work without prefix
╰──────❍`, [], msg);
            } else if (subAction === 'off') {
                updateConfig({ prefixless: false });
                await sendStyledMessage(sock, chatId, `╭──❍「 *⚙️ PREFIXLESS* 」❍
├ ❌ Prefixless mode DISABLED
╰──────❍`, [], msg);
            } else {
                await sendStyledMessage(sock, chatId, `╭──❍「 *⚙️ PREFIXLESS* 」❍
├ 📝 Usage: ${currentPrefix}settings prefixless on/off
╰──────❍`, [], msg);
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
├ ✅ Auto typing ENABLED
╰──────❍`, [], msg);
            } else if (subAction === 'off') {
                updateConfig({ autoTyping: false });
                await sendStyledMessage(sock, chatId, `╭──❍「 *⚙️ AUTO TYPING* 」❍
├ ❌ Auto typing DISABLED
╰──────❍`, [], msg);
            } else if (subAction === 'both') {
                updateConfig({ autoTypingLocation: 'both' });
                await sendStyledMessage(sock, chatId, `╭──❍「 *⚙️ AUTO TYPING* 」❍
├ 🌍 Location: BOTH (DM + Groups)
╰──────❍`, [], msg);
            } else if (subAction === 'private') {
                updateConfig({ autoTypingLocation: 'private' });
                await sendStyledMessage(sock, chatId, `╭──❍「 *⚙️ AUTO TYPING* 」❍
├ 💬 Location: PRIVATE ONLY
╰──────❍`, [], msg);
            } else if (subAction === 'groups') {
                updateConfig({ autoTypingLocation: 'groups' });
                await sendStyledMessage(sock, chatId, `╭──❍「 *⚙️ AUTO TYPING* 」❍
├ 👥 Location: GROUPS ONLY
╰──────❍`, [], msg);
            } else {
                await sendStyledMessage(sock, chatId, `╭──❍「 *⚙️ AUTO TYPING* 」❍
├ 📝 Usage: 
│ 🔧 ${currentPrefix}settings typing on/off
│ 🔧 ${currentPrefix}settings typing both/private/groups
╰──────❍`, [], msg);
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
├ ✅ Auto recording ENABLED
╰──────❍`, [], msg);
            } else if (subAction === 'off') {
                updateConfig({ autoRecording: false });
                await sendStyledMessage(sock, chatId, `╭──❍「 *⚙️ AUTO RECORDING* 」❍
├ ❌ Auto recording DISABLED
╰──────❍`, [], msg);
            } else if (subAction === 'both') {
                updateConfig({ autoRecordingLocation: 'both' });
                await sendStyledMessage(sock, chatId, `╭──❍「 *⚙️ AUTO RECORDING* 」❍
├ 🌍 Location: BOTH (DM + Groups)
╰──────❍`, [], msg);
            } else if (subAction === 'private') {
                updateConfig({ autoRecordingLocation: 'private' });
                await sendStyledMessage(sock, chatId, `╭──❍「 *⚙️ AUTO RECORDING* 」❍
├ 💬 Location: PRIVATE ONLY
╰──────❍`, [], msg);
            } else if (subAction === 'groups') {
                updateConfig({ autoRecordingLocation: 'groups' });
                await sendStyledMessage(sock, chatId, `╭──❍「 *⚙️ AUTO RECORDING* 」❍
├ 👥 Location: GROUPS ONLY
╰──────❍`, [], msg);
            } else {
                await sendStyledMessage(sock, chatId, `╭──❍「 *⚙️ AUTO RECORDING* 」❍
├ 📝 Usage: 
│ 🔧 ${currentPrefix}settings recording on/off
│ 🔧 ${currentPrefix}settings recording both/private/groups
╰──────❍`, [], msg);
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
├ ✅ Auto read ENABLED
╰──────❍`, [], msg);
            } else if (subAction === 'off') {
                updateConfig({ autoRead: false });
                await sendStyledMessage(sock, chatId, `╭──❍「 *⚙️ AUTO READ* 」❍
├ ❌ Auto read DISABLED
╰──────❍`, [], msg);
            } else if (subAction === 'groups') {
                const groupSetting = args[2]?.toLowerCase();
                if (groupSetting === 'on') {
                    updateConfig({ autoReadGroups: true });
                    await sendStyledMessage(sock, chatId, `╭──❍「 *⚙️ AUTO READ* 」❍
├ ✅ Groups auto read ENABLED
╰──────❍`, [], msg);
                } else if (groupSetting === 'off') {
                    updateConfig({ autoReadGroups: false });
                    await sendStyledMessage(sock, chatId, `╭──❍「 *⚙️ AUTO READ* 」❍
├ ❌ Groups auto read DISABLED
╰──────❍`, [], msg);
                }
            } else if (subAction === 'private') {
                const privateSetting = args[2]?.toLowerCase();
                if (privateSetting === 'on') {
                    updateConfig({ autoReadPrivate: true });
                    await sendStyledMessage(sock, chatId, `╭──❍「 *⚙️ AUTO READ* 」❍
├ ✅ Private auto read ENABLED
╰──────❍`, [], msg);
                } else if (privateSetting === 'off') {
                    updateConfig({ autoReadPrivate: false });
                    await sendStyledMessage(sock, chatId, `╭──❍「 *⚙️ AUTO READ* 」❍
├ ❌ Private auto read DISABLED
╰──────❍`, [], msg);
                }
            } else {
                await sendStyledMessage(sock, chatId, `╭──❍「 *⚙️ AUTO READ* 」❍
├ 📝 Usage:
│ 🔧 ${currentPrefix}settings autoread on/off
│ 🔧 ${currentPrefix}settings autoread groups on/off
│ 🔧 ${currentPrefix}settings autoread private on/off
╰──────❍`, [], msg);
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
├ ✅ Always online ENABLED
├ 📝 Bot will stay online 24/7
╰──────❍`, [], msg);
            } else if (subAction === 'off') {
                updateConfig({ alwaysOnline: false });
                await sendStyledMessage(sock, chatId, `╭──❍「 *⚙️ ALWAYS ONLINE* 」❍
├ ❌ Always online DISABLED
╰──────❍`, [], msg);
            } else {
                await sendStyledMessage(sock, chatId, `╭──❍「 *⚙️ ALWAYS ONLINE* 」❍
├ 📝 Usage: ${currentPrefix}settings alwaysonline on/off
╰──────❍`, [], msg);
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
├ ✅ Welcome messages ENABLED
╰──────❍`, [], msg);
            } else if (subAction === 'off') {
                updateConfig({ welcomeEnabled: false });
                await sendStyledMessage(sock, chatId, `╭──❍「 *⚙️ WELCOME* 」❍
├ ❌ Welcome messages DISABLED
╰──────❍`, [], msg);
            } else {
                await sendStyledMessage(sock, chatId, `╭──❍「 *⚙️ WELCOME* 」❍
├ 📝 Usage: ${currentPrefix}settings welcome on/off
╰──────❍`, [], msg);
            }
            return;
        }
        
        if (action === 'goodbye') {
            if (subAction === 'on') {
                updateConfig({ goodbyeEnabled: true });
                await sendStyledMessage(sock, chatId, `╭──❍「 *⚙️ GOODBYE* 」❍
├ ✅ Goodbye messages ENABLED
╰──────❍`, [], msg);
            } else if (subAction === 'off') {
                updateConfig({ goodbyeEnabled: false });
                await sendStyledMessage(sock, chatId, `╭──❍「 *⚙️ GOODBYE* 」❍
├ ❌ Goodbye messages DISABLED
╰──────❍`, [], msg);
            } else {
                await sendStyledMessage(sock, chatId, `╭──❍「 *⚙️ GOODBYE* 」❍
├ 📝 Usage: ${currentPrefix}settings goodbye on/off
╰──────❍`, [], msg);
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
├ ✅ Anti-link ENABLED
╰──────❍`, [], msg);
            } else if (subAction === 'off') {
                updateConfig({ antiLink: false });
                await sendStyledMessage(sock, chatId, `╭──❍「 *⚙️ ANTI-LINK* 」❍
├ ❌ Anti-link DISABLED
╰──────❍`, [], msg);
            } else {
                await sendStyledMessage(sock, chatId, `╭──❍「 *⚙️ ANTI-LINK* 」❍
├ 📝 Usage: ${currentPrefix}settings antilink on/off
╰──────❍`, [], msg);
            }
            return;
        }
        
        if (action === 'antibadword') {
            if (subAction === 'on') {
                updateConfig({ antiBadword: true });
                await sendStyledMessage(sock, chatId, `╭──❍「 *⚙️ ANTI-BADWORD* 」❍
├ ✅ Anti-badword ENABLED
╰──────❍`, [], msg);
            } else if (subAction === 'off') {
                updateConfig({ antiBadword: false });
                await sendStyledMessage(sock, chatId, `╭──❍「 *⚙️ ANTI-BADWORD* 」❍
├ ❌ Anti-badword DISABLED
╰──────❍`, [], msg);
            } else {
                await sendStyledMessage(sock, chatId, `╭──❍「 *⚙️ ANTI-BADWORD* 」❍
├ 📝 Usage: ${currentPrefix}settings antibadword on/off
╰──────❍`, [], msg);
            }
            return;
        }
        
        if (action === 'antispam') {
            if (subAction === 'on') {
                updateConfig({ antiSpam: true });
                await sendStyledMessage(sock, chatId, `╭──❍「 *⚙️ ANTI-SPAM* 」❍
├ ✅ Anti-spam ENABLED
╰──────❍`, [], msg);
            } else if (subAction === 'off') {
                updateConfig({ antiSpam: false });
                await sendStyledMessage(sock, chatId, `╭──❍「 *⚙️ ANTI-SPAM* 」❍
├ ❌ Anti-spam DISABLED
╰──────❍`, [], msg);
            } else {
                await sendStyledMessage(sock, chatId, `╭──❍「 *⚙️ ANTI-SPAM* 」❍
├ 📝 Usage: ${currentPrefix}settings antispam on/off
╰──────❍`, [], msg);
            }
            return;
        }
        
        if (action === 'antimedia') {
            if (subAction === 'on') {
                updateConfig({ antiMedia: true });
                await sendStyledMessage(sock, chatId, `╭──❍「 *⚙️ ANTI-MEDIA* 」❍
├ ✅ Anti-media ENABLED
╰──────❍`, [], msg);
            } else if (subAction === 'off') {
                updateConfig({ antiMedia: false });
                await sendStyledMessage(sock, chatId, `╭──❍「 *⚙️ ANTI-MEDIA* 」❍
├ ❌ Anti-media DISABLED
╰──────❍`, [], msg);
            } else {
                await sendStyledMessage(sock, chatId, `╭──❍「 *⚙️ ANTI-MEDIA* 」❍
├ 📝 Usage: ${currentPrefix}settings antimedia on/off
╰──────❍`, [], msg);
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
├ ✅ All settings reset to default
╰──────❍`, [], msg);
            return;
        }
        
        // ============================================================
        // INVALID COMMAND
        // ============================================================
        await sendStyledMessage(sock, chatId, `╭──❍「 *⚙️ SETTINGS* 」❍
├ ❌ Unknown command: ${action}
├ 📝 Use ${currentPrefix}settings show for help
╰──────❍`, [], msg);
    }
};

export { botConfig, updateConfig, loadConfig, saveConfig };