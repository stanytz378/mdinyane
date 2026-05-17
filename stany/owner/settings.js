/*****************************************************************************
 *                     Developed By STANY TZ                                 *
 *****************************************************************************/

import fs from 'fs';
import path from 'path';
import moment from 'moment-timezone';
import { fileURLToPath } from 'url';
import { channelInfo, botImagePath } from '../../stanytz/messageConfig.js';
import isOwner from '../../stanymain/isOwner.js';
import { config, updateConfig } from '../../stanycore/config.js';
import { isSudoUser } from '../owner/sudo.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ============================================================
// QUOTES
// ============================================================
const QUOTES = [
    "I'm not lazy, I'm just on my energy saving mode.",
    "Life is short, smile while you still have teeth.",
    "Knowledge is power! 📊",
    "Stay informed about your bot! 🤖",
    "Settings at your fingertips! ⚙️"
];

const getRandomQuote = () => QUOTES[Math.floor(Math.random() * QUOTES.length)];

// ============================================================
// SEND WITH IMAGE AND FORWARDED MARK
// ============================================================

async function sendStyledMessage(sock, chatId, text, mentions = [], quoted = null) {
    try {
        const imageFullPath = path.join(process.cwd(), botImagePath);
        const imageExists = fs.existsSync(imageFullPath);
        
        if (imageExists) {
            await sock.sendMessage(chatId, {
                image: fs.readFileSync(imageFullPath),
                caption: text,
                contextInfo: channelInfo.contextInfo,
                mentions: mentions
            }, { quoted: quoted });
        } else {
            await sock.sendMessage(chatId, {
                text: text,
                contextInfo: channelInfo.contextInfo,
                mentions: mentions
            }, { quoted: quoted });
        }
    } catch (error) {
        await sock.sendMessage(chatId, {
            text: text,
            mentions: mentions
        }, { quoted: quoted });
    }
}

// ============================================================
// MAIN COMMAND
// ============================================================

export default {
    name: 'settings',
    description: 'View all bot settings and configuration',
    icon: '⚙️',
    alias: ['config', 'status', 'botstatus', 'info'],
    category: 'general',
    
    async execute(sock, msg, args, currentPrefix, { BOT_NAME, VERSION, isOwner, jidManager }) {
        
        const chatId = msg.key.remoteJid;
        const senderId = msg.key.participant || chatId;
        const randomQuote = getRandomQuote();
        const botName = BOT_NAME || 'MDINYANE';
        const botVersion = VERSION || '2.0.0';
        
        // Check if user is owner or sudo
        const ownerCheck = await isOwner(senderId, jidManager);
        const sudoCheck = isSudoUser(senderId);
        const isAdminUser = ownerCheck.isOwner || sudoCheck;
        
        const now = moment().tz('Africa/Dar_es_Salaam');
        const date = now.format('DD/MM/YYYY');
        const day = now.format('dddd');
        const time = now.format('HH:mm:ss');
        
        // ========== BOT INFO ==========
        const botInfo = `╭──❍「 *⚙️ ${botName.toUpperCase()} SETTINGS* 」❍
├ 📌 *Version* : v${botVersion}
├ 👨‍💻 *Developer* : STANY TZ
├ 📅 *Date* : ${date}
├ 📆 *Day* : ${day}
├ ⏰ *Time* : ${time} EAT
╰─┬────❍`;

        // ========== PREFIX SETTINGS ==========
        const prefixes = config.prefixes || ['.'];
        const prefixList = prefixes.map(p => p === ' ' ? '[SPACE]' : p).join(', ');
        const prefixlessStatus = config.prefixless ? '✅ ENABLED' : '❌ DISABLED';
        
        const prefixSection = `╭─┴─❍「 *🔧 PREFIX SETTINGS* 」❍
├ 🔹 *Active Prefixes* : ${prefixes.length}
├ 🔸 *Prefixes* : ${prefixList}
├ 🔹 *Prefixless Mode* : ${prefixlessStatus}
╰─┬────❍`;

        // ========== BOT MODE ==========
        const modeEmoji = config.mode === 'public' ? '🌍' : 
                         config.mode === 'private' ? '💬' : 
                         config.mode === 'groups' ? '👥' : '🔒';
        let modeDesc = '';
        switch(config.mode) {
            case 'public': modeDesc = 'Private chats + Groups'; break;
            case 'private': modeDesc = 'Private chats only'; break;
            case 'groups': modeDesc = 'Groups only'; break;
            case 'self': modeDesc = 'Owner only'; break;
            default: modeDesc = 'Public';
        }
        
        const modeSection = `╭─┴─❍「 *🎯 BOT MODE* 」❍
├ ${modeEmoji} *Mode* : ${config.mode.toUpperCase()}
├ 📝 *Description* : ${modeDesc}
╰─┬────❍`;

        // ========== AUTO FEATURES ==========
        const autoTypingStatus = config.autoTyping ? '✅' : '❌';
        const autoTypingLoc = config.autoTypingLocation === 'both' ? '🌍 Both' : 
                             config.autoTypingLocation === 'private' ? '💬 Private' : '👥 Groups';
        
        const autoRecordingStatus = config.autoRecording ? '✅' : '❌';
        const autoRecordingLoc = config.autoRecordingLocation === 'both' ? '🌍 Both' : 
                                config.autoRecordingLocation === 'private' ? '💬 Private' : '👥 Groups';
        
        const autoReadStatus = config.autoRead ? '✅' : '❌';
        const autoReadGroups = config.autoReadGroups ? '✅' : '❌';
        const autoReadPrivate = config.autoReadPrivate ? '✅' : '❌';
        
        const autoSection = `╭─┴─❍「 *🤖 AUTO FEATURES* 」❍
├ ⌨️ *Auto Typing* : ${autoTypingStatus} (${autoTypingLoc})
├ 🎙️ *Auto Recording* : ${autoRecordingStatus} (${autoRecordingLoc})
├ 👁️ *Auto Read* : ${autoReadStatus}
│   ├ 👥 Groups : ${autoReadGroups}
│   └ 💬 Private : ${autoReadPrivate}
├ 🟢 *Always Online* : ${config.alwaysOnline ? '✅' : '❌'}
╰─┬────❍`;

        // ========== ADMIN INFO ==========
        const sudoUsers = isAdminUser ? (() => {
            try {
                const sudoFile = path.join(process.cwd(), 'stanydata', 'sudo_users.json');
                if (fs.existsSync(sudoFile)) {
                    const data = JSON.parse(fs.readFileSync(sudoFile, 'utf8'));
                    const users = data.users || [];
                    if (users.length === 0) return '❌ No sudo users';
                    return users.map((u, i) => `${i + 1}. +${u}`).join('\n│ ');
                }
                return '❌ No sudo users';
            } catch {
                return '❌ No sudo users';
            }
        })() : '🔒 Owner only';
        
        const adminSection = `╭─┴─❍「 *👑 ADMIN INFO* 」❍
├ 👤 *Owner* : STANY TZ
├ 📞 *Contact* : +255787069580
├ 👥 *Sudo Users* : 
│ ${sudoUsers}
╰─┬────❍`;

        // ========== SYSTEM INFO ==========
        const uptime = process.uptime();
        const days = Math.floor(uptime / 86400);
        const hours = Math.floor((uptime % 86400) / 3600);
        const minutes = Math.floor((uptime % 3600) / 60);
        const seconds = Math.floor(uptime % 60);
        const uptimeText = `${days}d ${hours}h ${minutes}m ${seconds}s`;
        
        const systemSection = `╭─┴─❍「 *💻 SYSTEM INFO* 」❍
├ ⏱️ *Uptime* : ${uptimeText}
├ 🧠 *Node.js* : ${process.version}
├ 💾 *Platform* : ${process.platform}
├ 📊 *Memory* : ${Math.round(process.memoryUsage().rss / 1024 / 1024)} MB
╰─┬────❍`;

        // ========== COMMANDS SECTION ==========
        const commandsSection = `╭─┴─❍「 *📋 QUICK COMMANDS* 」❍
│ 🔧 ${currentPrefix}mode public/private/groups/self
│ 🔧 ${currentPrefix}prefix add/remove/list
│ 🔧 ${currentPrefix}autotyping on/off/both/private/groups
│ 🔧 ${currentPrefix}autorecording on/off/both/private/groups
│ 🔧 ${currentPrefix}autoread on/off
│ 🔧 ${currentPrefix}alwaysonline on/off
│ 🔧 ${currentPrefix}sudo add/remove/list
╰──────❍`;

        // ========== FOOTER ==========
        const footer = `✨ *"${randomQuote}"* ✨

_📌 Use ${currentPrefix}help for more commands_
▰▰▰ *©️ ${botName.toUpperCase()} BY STANY TZ* ▰▰▰`;

        // Combine all sections
        const fullMessage = `${botInfo}
${prefixSection}
${modeSection}
${autoSection}
${adminSection}
${systemSection}
${commandsSection}
${footer}`;

        await sendStyledMessage(sock, chatId, fullMessage, [], msg);
    }
};