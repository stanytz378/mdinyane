/*****************************************************************************
 *                                                                           *
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
import { fileURLToPath } from 'url';
import { channelInfo, botImagePath } from '../../stanytz/messageConfig.js';
import isOwner from '../../stanymain/isOwner.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Data directory
const DATA_DIR = path.join(process.cwd(), 'stanydata');
const AUTO_STATUS_FILE = path.join(DATA_DIR, 'autostatus.json');

if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}
if (!fs.existsSync(AUTO_STATUS_FILE)) {
    fs.writeFileSync(AUTO_STATUS_FILE, JSON.stringify({
        enabled: false,
        reactOn: false,
        likeOn: false
    }, null, 2));
}

// ============================================================
// RANDOM EMOJIS FOR LIKES
// ============================================================
const LIKE_EMOJIS = [
    '❤️', '🔥', '👍', '💯', '✨', '🌟', '⭐', '💖', '💗', '💓',
    '💕', '💞', '💝', '💟', '❣️', '💋', '😍', '🥰', '😘', '🤩',
    '🎉', '🏆', '👏', '🙌', '🤗', '😊', '😎', '👌', '💪', '🎯',
    '🔱', '⚡', '💎', '👑', '⭐', '🌹', '🌸', '💐', '🍀', '🌈'
];

const REACTION_EMOJIS = [
    '❤️', '🔥', '👍', '💯', '✨', '🌟', '💖', '💗', '😍', '🥰',
    '👏', '🙌', '🤗', '😎', '👌', '💪', '🎉', '🏆', '🔱', '⚡'
];

const getRandomLikeEmoji = () => LIKE_EMOJIS[Math.floor(Math.random() * LIKE_EMOJIS.length)];
const getRandomReactionEmoji = () => REACTION_EMOJIS[Math.floor(Math.random() * REACTION_EMOJIS.length)];

// ============================================================
// QUOTES
// ============================================================
const QUOTES = [
    "I'm not lazy, I'm just on my energy saving mode.",
    "Life is short, smile while you still have teeth.",
    "Auto status is watching! 👀",
    "Status viewer mode: ACTIVE",
    "Keeping up with your stories! 📸",
    "Bot is lurking on statuses... 👻",
    "Auto view is better than manual!",
    "Never miss a status again!",
    "Status? I see everything! 🔭",
    "Liking statuses like a boss! 👑",
    "Spreading love with random emojis! 💖"
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
// CONFIG FUNCTIONS
// ============================================================

async function readConfig() {
    try {
        const data = fs.readFileSync(AUTO_STATUS_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        return { enabled: false, reactOn: false, likeOn: false };
    }
}

async function writeConfig(config) {
    try {
        fs.writeFileSync(AUTO_STATUS_FILE, JSON.stringify(config, null, 2));
        return true;
    } catch (error) {
        console.error('Error writing auto status config:', error);
        return false;
    }
}

async function isAutoStatusEnabled() {
    const config = await readConfig();
    return config.enabled;
}

async function isStatusReactionEnabled() {
    const config = await readConfig();
    return config.reactOn || false;
}

async function isStatusLikeEnabled() {
    const config = await readConfig();
    return config.likeOn || false;
}

// ============================================================
// REAL LIKE FUNCTION (Sends actual like to status)
// ============================================================

async function likeStatus(sock, statusKey) {
    try {
        const likeEnabled = await isStatusLikeEnabled();
        if (!likeEnabled) return false;
        
        const randomEmoji = getRandomLikeEmoji();
        
        // Send real reaction (like) to status
        await sock.relayMessage('status@broadcast', {
            reactionMessage: {
                key: {
                    remoteJid: 'status@broadcast',
                    id: statusKey.id,
                    participant: statusKey.participant || statusKey.remoteJid,
                    fromMe: false
                },
                text: randomEmoji
            }
        }, {
            messageId: statusKey.id,
            statusJidList: [statusKey.remoteJid, statusKey.participant || statusKey.remoteJid]
        });
        
        console.log(`✅ Liked status with ${randomEmoji}`);
        return true;
    } catch (error) {
        console.error('❌ Error liking status:', error.message);
        return false;
    }
}

// ============================================================
// REACTION FUNCTION (Optional - can be used alongside like)
// ============================================================

async function reactToStatus(sock, statusKey) {
    try {
        const reactEnabled = await isStatusReactionEnabled();
        if (!reactEnabled) return false;
        
        // Don't react if like is already sent (avoid double)
        const likeEnabled = await isStatusLikeEnabled();
        if (likeEnabled) return false;
        
        const randomEmoji = getRandomReactionEmoji();
        
        await sock.relayMessage('status@broadcast', {
            reactionMessage: {
                key: {
                    remoteJid: 'status@broadcast',
                    id: statusKey.id,
                    participant: statusKey.participant || statusKey.remoteJid,
                    fromMe: false
                },
                text: randomEmoji
            }
        }, {
            messageId: statusKey.id,
            statusJidList: [statusKey.remoteJid, statusKey.participant || statusKey.remoteJid]
        });
        
        console.log(`✅ Reacted to status with ${randomEmoji}`);
        return true;
    } catch (error) {
        console.error('❌ Error reacting to status:', error.message);
        return false;
    }
}

// ============================================================
// MAIN HANDLER
// ============================================================

export async function handleStatusUpdate(sock, status) {
    try {
        const enabled = await isAutoStatusEnabled();
        if (!enabled) return;
        
        // Wait a bit before interacting
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        let statusKey = null;
        
        // Extract status key from different possible formats
        if (status.messages && status.messages.length > 0) {
            const msg = status.messages[0];
            if (msg.key && msg.key.remoteJid === 'status@broadcast') {
                statusKey = msg.key;
            }
        }
        
        if (!statusKey && status.key && status.key.remoteJid === 'status@broadcast') {
            statusKey = status.key;
        }
        
        if (!statusKey && status.reaction && status.reaction.key && status.reaction.key.remoteJid === 'status@broadcast') {
            statusKey = status.reaction.key;
        }
        
        if (!statusKey) return;
        
        // View the status (mark as seen)
        try {
            await sock.readMessages([statusKey]);
            console.log('✅ Viewed status');
        } catch (err) {
            if (err.message?.includes('rate-overlimit')) {
                await new Promise(resolve => setTimeout(resolve, 3000));
                await sock.readMessages([statusKey]);
            } else {
                console.error('Error viewing status:', err.message);
            }
        }
        
        // Send real LIKE to status (if enabled)
        await likeStatus(sock, statusKey);
        
        // Send reaction (if enabled and like is disabled)
        if (!(await isStatusLikeEnabled())) {
            await reactToStatus(sock, statusKey);
        }
        
    } catch (error) {
        console.error('❌ Error in auto status view:', error.message);
    }
}

// ============================================================
// COMMAND
// ============================================================

export default {
    name: 'autostatus',
    description: 'Automatically view, like and react to WhatsApp statuses',
    icon: '👁️',
    alias: ['autoview', 'statusview', 'astatus', 'autolike'],
    category: 'automation',
    ownerOnly: true,
    
    async execute(sock, msg, args, currentPrefix, { BOT_NAME, VERSION, isOwner, jidManager }) {
        
        const chatId = msg.key.remoteJid;
        const senderId = msg.key.participant || chatId;
        
        // Check if owner
        const ownerCheck = await isOwner(senderId, jidManager);
        if (!ownerCheck.isOwner) {
            const notAuthMsg = `╭──❍「 *👁️ AUTO STATUS* 」❍
├ 👤 *User* : @${senderId.split('@')[0]}
├ ❌ *Error* : Owner only command!
╰──────❍

_📌 This command is only for bot owner_
▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`;
            await sendStyledMessage(sock, chatId, notAuthMsg, [senderId], msg);
            return;
        }
        
        // Get current time
        const now = moment().tz('Africa/Dar_es_Salaam');
        const date = now.format('DD/MM/YYYY');
        const day = now.format('dddd');
        const time = now.format('HH:mm:ss');
        
        const config = await readConfig();
        const randomQuote = getRandomQuote();
        const botName = BOT_NAME || 'MDINYANE';
        
        const action = args[0]?.toLowerCase();
        
        // ========== SHOW STATUS (default) ==========
        if (!action) {
            const viewStatus = config.enabled ? '✅ ENABLED' : '❌ DISABLED';
            const likeStatus = config.likeOn ? '✅ ENABLED' : '❌ DISABLED';
            const reactStatus = config.reactOn ? '✅ ENABLED' : '❌ DISABLED';
            
            const statusMsg = `╭──❍「 *👁️ AUTO STATUS CONFIG* 」❍
├ 📱 *Auto View* : ${viewStatus}
├ 💖 *Auto Like* : ${likeStatus}
├ 💫 *Auto React* : ${reactStatus}
├ 💾 *Storage* : File System
╰─┬────❍
╭─┴─❍「 *📋 COMMANDS* 」❍
│ 🔧 ${currentPrefix}autostatus on - Enable auto view
│ 🔧 ${currentPrefix}autostatus off - Disable auto view
│ 🔧 ${currentPrefix}autostatus like on - Enable auto like
│ 🔧 ${currentPrefix}autostatus like off - Disable auto like
│ 🔧 ${currentPrefix}autostatus react on - Enable auto react
│ 🔧 ${currentPrefix}autostatus react off - Disable auto react
╰──────❍
╭─┴─❍「 *📊 INFO* 」❍
├ 📅 *Date* : ${date}
├ 📆 *Day* : ${day}
├ ⏰ *Time* : ${time} EAT
├ 💖 *Like Emojis* : ${LIKE_EMOJIS.length} random emojis
╰──────❍

✨ *"${randomQuote}"* ✨

_📌 Bot will automatically view, like and react to statuses with random emojis!_
▰▰▰ *©️ ${botName.toUpperCase()} BY STANY TZ* ▰▰▰`;
            await sendStyledMessage(sock, chatId, statusMsg, [], msg);
            return;
        }
        
        // ========== ENABLE AUTO VIEW ==========
        if (action === 'on') {
            config.enabled = true;
            await writeConfig(config);
            
            const successMsg = `╭──❍「 *👁️ AUTO STATUS* 」❍
├ ✅ *Auto View* : ENABLED
├ 📝 *Bot will now view all statuses*
╰──────❍

✨ *"${randomQuote}"* ✨

_📌 Auto Like: ${config.likeOn ? 'ON' : 'OFF'} | Auto React: ${config.reactOn ? 'ON' : 'OFF'}_
▰▰▰ *©️ ${botName.toUpperCase()} BY STANY TZ* ▰▰▰`;
            await sendStyledMessage(sock, chatId, successMsg, [], msg);
            return;
        }
        
        // ========== DISABLE AUTO VIEW ==========
        if (action === 'off') {
            config.enabled = false;
            await writeConfig(config);
            
            const disableMsg = `╭──❍「 *👁️ AUTO STATUS* 」❍
├ ❌ *Auto View* : DISABLED
├ 📝 *Bot will no longer view statuses*
╰──────❍

▰▰▰ *©️ ${botName.toUpperCase()} BY STANY TZ* ▰▰▰`;
            await sendStyledMessage(sock, chatId, disableMsg, [], msg);
            return;
        }
        
        // ========== LIKE COMMANDS ==========
        if (action === 'like') {
            const likeAction = args[1]?.toLowerCase();
            
            if (!likeAction || (likeAction !== 'on' && likeAction !== 'off')) {
                const usageMsg = `╭──❍「 *👁️ AUTO STATUS* 」❍
├ ❌ *Usage* : ${currentPrefix}autostatus like on|off
├ 📝 *Example* : ${currentPrefix}autostatus like on
╰──────❍

_📌 Enable or disable real likes to statuses with random emojis_
▰▰▰ *©️ ${botName.toUpperCase()} BY STANY TZ* ▰▰▰`;
                await sendStyledMessage(sock, chatId, usageMsg, [], msg);
                return;
            }
            
            if (likeAction === 'on') {
                config.likeOn = true;
                config.reactOn = false; // Disable reaction when like is on
                await writeConfig(config);
                
                const likeOnMsg = `╭──❍「 *👁️ AUTO STATUS* 」❍
├ 💖 *Auto Like* : ENABLED
├ 📝 *Bot will like statuses with random emojis*
├ 🎲 *Emojis* : ${LIKE_EMOJIS.slice(0, 5).join(', ')}...
╰──────❍

✨ *"${randomQuote}"* ✨

_📌 Example emojis: ❤️ 🔥 👍 💯 ✨_
▰▰▰ *©️ ${botName.toUpperCase()} BY STANY TZ* ▰▰▰`;
                await sendStyledMessage(sock, chatId, likeOnMsg, [], msg);
            } else {
                config.likeOn = false;
                await writeConfig(config);
                
                const likeOffMsg = `╭──❍「 *👁️ AUTO STATUS* 」❍
├ ❌ *Auto Like* : DISABLED
├ 📝 *Bot will not like statuses*
╰──────❍

▰▰▰ *©️ ${botName.toUpperCase()} BY STANY TZ* ▰▰▰`;
                await sendStyledMessage(sock, chatId, likeOffMsg, [], msg);
            }
            return;
        }
        
        // ========== REACTION COMMANDS ==========
        if (action === 'react') {
            const reactAction = args[1]?.toLowerCase();
            
            if (!reactAction || (reactAction !== 'on' && reactAction !== 'off')) {
                const usageMsg = `╭──❍「 *👁️ AUTO STATUS* 」❍
├ ❌ *Usage* : ${currentPrefix}autostatus react on|off
├ 📝 *Example* : ${currentPrefix}autostatus react on
╰──────❍

_📌 Enable or disable reactions to statuses (only when auto like is OFF)_
▰▰▰ *©️ ${botName.toUpperCase()} BY STANY TZ* ▰▰▰`;
                await sendStyledMessage(sock, chatId, usageMsg, [], msg);
                return;
            }
            
            if (reactAction === 'on') {
                config.reactOn = true;
                config.likeOn = false; // Disable like when reaction is on
                await writeConfig(config);
                
                const reactOnMsg = `╭──❍「 *👁️ AUTO STATUS* 」❍
├ 💫 *Auto React* : ENABLED
├ 📝 *Bot will react to statuses with random emojis*
├ 🎲 *Emojis* : ${REACTION_EMOJIS.slice(0, 5).join(', ')}...
╰──────❍

✨ *"${randomQuote}"* ✨

_📌 Example emojis: ❤️ 🔥 👍 💯 ✨_
▰▰▰ *©️ ${botName.toUpperCase()} BY STANY TZ* ▰▰▰`;
                await sendStyledMessage(sock, chatId, reactOnMsg, [], msg);
            } else {
                config.reactOn = false;
                await writeConfig(config);
                
                const reactOffMsg = `╭──❍「 *👁️ AUTO STATUS* 」❍
├ ❌ *Auto React* : DISABLED
├ 📝 *Bot will not react to statuses*
╰──────❍

▰▰▰ *©️ ${botName.toUpperCase()} BY STANY TZ* ▰▰▰`;
                await sendStyledMessage(sock, chatId, reactOffMsg, [], msg);
            }
            return;
        }
        
        // ========== INVALID COMMAND ==========
        const invalidMsg = `╭──❍「 *👁️ AUTO STATUS* 」❍
├ ❌ *Invalid command* : ${action}
├ 📝 *Use* : ${currentPrefix}autostatus for help
╰──────❍

▰▰▰ *©️ ${botName.toUpperCase()} BY STANY TZ* ▰▰▰`;
        await sendStyledMessage(sock, chatId, invalidMsg, [], msg);
    }
};

// Export functions for use in index.js
export { 
    isAutoStatusEnabled, 
    isStatusReactionEnabled, 
    isStatusLikeEnabled,
    likeStatus,
    reactToStatus, 
    readConfig, 
    writeConfig,
    getRandomLikeEmoji,
    getRandomReactionEmoji
};