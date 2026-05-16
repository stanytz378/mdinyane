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
import isAdmin from '../../stanymain/isAdmin.js';
import isOwner from '../../stanymain/isOwner.js';
import isGroup from '../../stanymain/isGroup.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Data directory
const DATA_DIR = path.join(process.cwd(), 'stanydata');
const ANTIBADWORD_FILE = path.join(DATA_DIR, 'antibadword_settings.json');
const WARNINGS_FILE = path.join(DATA_DIR, 'antibadword_warnings.json');

if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

// ============================================================
// DEFAULT BAD WORDS (Common profanity)
// ============================================================
const DEFAULT_BAD_WORDS = [
    "fuck", "shit", "damn", "hell", "ass", "bitch", "bastard", "crap", "piss",
    "dick", "cock", "pussy", "cunt", "twat", "whore", "slut", "motherfucker",
    "asshole", "bullshit", "goddamn", "bloody", "nigga", "retard", "moron",
    "idiot", "stupid", "dumb", "loser", "jerk", "douche", "scumbag", "trash"
];

// ============================================================
// QUOTES
// ============================================================
const QUOTES = [
    "I'm not lazy, I'm just on my energy saving mode.",
    "Life is short, smile while you still have teeth.",
    "Watch your language! 🚫",
    "Keep the group clean and respectful!",
    "Bad words? Not on my watch! 👀",
    "Respect others, choose your words wisely!",
    "Toxicity is not welcome here!",
    "Spread love, not hate! 💖"
];

const getRandomQuote = () => QUOTES[Math.floor(Math.random() * QUOTES.length)];

// ============================================================
// DATABASE FUNCTIONS
// ============================================================

async function loadDatabase(filePath, defaultData = {}) {
    try {
        if (fs.existsSync(filePath)) {
            return JSON.parse(fs.readFileSync(filePath, 'utf8'));
        }
        return defaultData;
    } catch {
        return defaultData;
    }
}

async function saveDatabase(filePath, data) {
    try {
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
        return true;
    } catch {
        return false;
    }
}

async function getAntibadwordSettings(chatId) {
    const settings = await loadDatabase(ANTIBADWORD_FILE, {});
    return settings[chatId] || { enabled: false, words: DEFAULT_BAD_WORDS };
}

async function saveAntibadwordSettings(chatId, settings) {
    const allSettings = await loadDatabase(ANTIBADWORD_FILE, {});
    allSettings[chatId] = settings;
    await saveDatabase(ANTIBADWORD_FILE, allSettings);
}

async function getWarnings(chatId, userId) {
    const warns = await loadDatabase(WARNINGS_FILE, {});
    return warns[chatId]?.[userId] || 0;
}

async function addWarning(chatId, userId) {
    const warns = await loadDatabase(WARNINGS_FILE, {});
    if (!warns[chatId]) warns[chatId] = {};
    warns[chatId][userId] = (warns[chatId][userId] || 0) + 1;
    await saveDatabase(WARNINGS_FILE, warns);
    return warns[chatId][userId];
}

async function resetWarnings(chatId, userId) {
    const warns = await loadDatabase(WARNINGS_FILE, {});
    if (warns[chatId]) {
        delete warns[chatId][userId];
        await saveDatabase(WARNINGS_FILE, warns);
    }
}

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
// BADWORD DETECTION HANDLER
// ============================================================

export async function checkAntiBadword(sock, message, context) {
    try {
        const chatId = message.key.remoteJid;
        
        // Check if it's a group
        const groupCheck = isGroup(chatId);
        if (!groupCheck.isGroup) return false;
        
        const senderId = message.key.participant || message.key.remoteJid;
        
        // Check if sender is owner (exempt)
        const ownerCheck = await isOwner(senderId);
        if (ownerCheck.isOwner) return false;
        
        // Check if sender is admin (exempt)
        const adminCheck = await isAdmin(sock, chatId, senderId);
        if (adminCheck.isSenderAdmin) return false;
        
        // Get settings
        const settings = await getAntibadwordSettings(chatId);
        if (!settings.enabled || !settings.words || settings.words.length === 0) return false;
        
        // Get message text
        const messageText = (message.message?.conversation ||
            message.message?.extendedTextMessage?.text ||
            message.message?.imageMessage?.caption ||
            message.message?.videoMessage?.caption ||
            '').toLowerCase();
        
        if (!messageText) return false;
        
        // Check for bad words
        let foundWord = null;
        for (const word of settings.words) {
            if (messageText.includes(word.toLowerCase())) {
                foundWord = word;
                break;
            }
        }
        
        if (foundWord) {
            const randomQuote = getRandomQuote();
            
            // Delete the message
            try {
                await sock.sendMessage(chatId, { delete: message.key });
            } catch {}
            
            // Send warning
            const warningMsg = `╭──❍「 *🚫 ANTI-BADWORD* 」❍
├ 👤 *User* : @${senderId.split('@')[0]}
├ 🚫 *Word* : "${foundWord}"
├ 🗑️ *Action* : Message deleted
╰──────❍

✨ *"${randomQuote}"* ✨

_📌 Please avoid using inappropriate language in this group_
▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`;
            
            await sendStyledMessage(sock, chatId, warningMsg, [senderId], message);
            return true;
        }
        
        return false;
    } catch (error) {
        console.error('Error in antibadword check:', error);
        return false;
    }
}

// ============================================================
// COMMAND HANDLER
// ============================================================

async function handleAntiBadwordCommand(sock, chatId, message, args, isBotAdmin) {
    const action = args[0]?.toLowerCase();
    const settings = await getAntibadwordSettings(chatId);
    const randomQuote = getRandomQuote();
    const now = moment().tz('Africa/Dar_es_Salaam');
    const date = now.format('DD/MM/YYYY');
    const day = now.format('dddd');
    const time = now.format('HH:mm:ss');
    
    // ========== SHOW STATUS (default) ==========
    if (!action || action === 'status') {
        const statusIcon = settings.enabled ? '✅' : '❌';
        const wordCount = settings.words?.length || 0;
        
        const statusMsg = `╭──❍「 *🚫 ANTI-BADWORD FILTER* 」❍
├ 📝 *Status* : ${statusIcon} ${settings.enabled ? 'ENABLED' : 'DISABLED'}
├ 🔢 *Blocked Words* : ${wordCount}
├ 🤖 *Bot Admin* : ${isBotAdmin ? '✅' : '❌'}
╰─┬────❍
╭─┴─❍「 *📋 COMMANDS* 」❍
│ 🔧 ${args[2] || '.'}antibadword on - Enable filter
│ 🔧 ${args[2] || '.'}antibadword off - Disable filter
│ 🔧 ${args[2] || '.'}antibadword add <word> - Add word
│ 🔧 ${args[2] || '.'}antibadword remove <word> - Remove word
│ 🔧 ${args[2] || '.'}antibadword list - Show blocked words
│ 🔧 ${args[2] || '.'}antibadword reset - Reset to default words
╰──────❍
╭─┴─❍「 *📊 INFO* 」❍
├ 📅 *Date* : ${date}
├ 📆 *Day* : ${day}
├ ⏰ *Time* : ${time} EAT
├ 👑 *Exempt* : Admins & Owner
╰──────❍

✨ *"${randomQuote}"* ✨

_📌 Admins and Owner are EXEMPT from antibadword filter_
▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`;
        await sendStyledMessage(sock, chatId, statusMsg, [], message);
        return;
    }
    
    // ========== ENABLE ==========
    if (action === 'on') {
        if (settings.enabled) {
            const alreadyMsg = `╭──❍「 *🚫 ANTI-BADWORD* 」❍
├ ⚠️ *Status* : Already ENABLED
├ 📝 *Blocked Words* : ${settings.words?.length || 0}
╰──────❍

▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`;
            await sendStyledMessage(sock, chatId, alreadyMsg, [], message);
            return;
        }
        
        settings.enabled = true;
        await saveAntibadwordSettings(chatId, settings);
        
        const enableMsg = `╭──❍「 *🚫 ANTI-BADWORD* 」❍
├ ✅ *Status* : ENABLED
├ 📝 *Blocked Words* : ${settings.words?.length || 0}
├ 👑 *Exempt* : Admins & Owner
╰──────❍

✨ *"${randomQuote}"* ✨

_📌 Messages with bad words will be automatically deleted_
▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`;
        await sendStyledMessage(sock, chatId, enableMsg, [], message);
        return;
    }
    
    // ========== DISABLE ==========
    if (action === 'off') {
        settings.enabled = false;
        await saveAntibadwordSettings(chatId, settings);
        
        const disableMsg = `╭──❍「 *🚫 ANTI-BADWORD* 」❍
├ ❌ *Status* : DISABLED
├ 📝 *Note* : Badword filter is now inactive
╰──────❍

▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`;
        await sendStyledMessage(sock, chatId, disableMsg, [], message);
        return;
    }
    
    // ========== ADD WORD ==========
    if (action === 'add') {
        const word = args.slice(1).join(' ').toLowerCase().trim();
        if (!word) {
            const usageMsg = `╭──❍「 *🚫 ANTI-BADWORD* 」❍
├ ❌ *Usage* : .antibadword add <word>
├ 📝 *Example* : .antibadword add badword
╰──────❍

▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`;
            await sendStyledMessage(sock, chatId, usageMsg, [], message);
            return;
        }
        
        if (!settings.words) settings.words = [...DEFAULT_BAD_WORDS];
        if (settings.words.includes(word)) {
            const existsMsg = `╭──❍「 *🚫 ANTI-BADWORD* 」❍
├ ❌ *Word* : "${word}"
├ 📝 *Status* : Already in blocked list
╰──────❍

▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`;
            await sendStyledMessage(sock, chatId, existsMsg, [], message);
            return;
        }
        
        settings.words.push(word);
        await saveAntibadwordSettings(chatId, settings);
        
        const addMsg = `╭──❍「 *🚫 ANTI-BADWORD* 」❍
├ ✅ *Word Added* : "${word}"
├ 📊 *Total Words* : ${settings.words.length}
╰──────❍

▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`;
        await sendStyledMessage(sock, chatId, addMsg, [], message);
        return;
    }
    
    // ========== REMOVE WORD ==========
    if (action === 'remove' || action === 'delete' || action === 'del') {
        const word = args.slice(1).join(' ').toLowerCase().trim();
        if (!word) {
            const usageMsg = `╭──❍「 *🚫 ANTI-BADWORD* 」❍
├ ❌ *Usage* : .antibadword remove <word>
├ 📝 *Example* : .antibadword remove badword
╰──────❍

▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`;
            await sendStyledMessage(sock, chatId, usageMsg, [], message);
            return;
        }
        
        if (!settings.words || !settings.words.includes(word)) {
            const notFoundMsg = `╭──❍「 *🚫 ANTI-BADWORD* 」❍
├ ❌ *Word* : "${word}"
├ 📝 *Status* : Not found in blocked list
╰──────❍

▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`;
            await sendStyledMessage(sock, chatId, notFoundMsg, [], message);
            return;
        }
        
        settings.words = settings.words.filter((w) => w !== word);
        await saveAntibadwordSettings(chatId, settings);
        
        const removeMsg = `╭──❍「 *🚫 ANTI-BADWORD* 」❍
├ ✅ *Word Removed* : "${word}"
├ 📊 *Remaining Words* : ${settings.words.length}
╰──────❍

▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`;
        await sendStyledMessage(sock, chatId, removeMsg, [], message);
        return;
    }
    
    // ========== LIST WORDS ==========
    if (action === 'list') {
        if (!settings.words || settings.words.length === 0) {
            const emptyMsg = `╭──❍「 *🚫 ANTI-BADWORD* 」❍
├ 📝 *Blocked Words List*
├ 📊 *Total* : 0 words
├ 📝 *Status* : No words blocked
╰──────❍

_📌 Use .antibadword add <word> to add words_
▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`;
            await sendStyledMessage(sock, chatId, emptyMsg, [], message);
            return;
        }
        
        const wordsPerPage = 20;
        const page = parseInt(args[1]) || 1;
        const totalPages = Math.ceil(settings.words.length / wordsPerPage);
        const start = (page - 1) * wordsPerPage;
        const end = start + wordsPerPage;
        const pageWords = settings.words.slice(start, end);
        
        let wordList = '';
        pageWords.forEach((w, i) => {
            wordList += `├ ${start + i + 1}. *${w}*\n`;
        });
        
        const listMsg = `╭──❍「 *🚫 BLOCKED WORDS LIST* 」❍
${wordList}╰─┬────❍
╭─┴─❍「 *📊 INFO* 」❍
├ 📊 *Total Words* : ${settings.words.length}
├ 📄 *Page* : ${page}/${totalPages}
╰──────❍

▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`;
        await sendStyledMessage(sock, chatId, listMsg, [], message);
        return;
    }
    
    // ========== RESET TO DEFAULT ==========
    if (action === 'reset') {
        settings.words = [...DEFAULT_BAD_WORDS];
        await saveAntibadwordSettings(chatId, settings);
        
        const resetMsg = `╭──❍「 *🚫 ANTI-BADWORD* 」❍
├ 🔄 *Reset* : To default bad words
├ 📊 *Total Words* : ${settings.words.length}
╰──────❍

▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`;
        await sendStyledMessage(sock, chatId, resetMsg, [], message);
        return;
    }
    
    // ========== INVALID COMMAND ==========
    const invalidMsg = `╭──❍「 *🚫 ANTI-BADWORD* 」❍
├ ❌ *Invalid command* : ${action}
├ 📝 *Use* : .antibadword for help
╰──────❍

▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`;
    await sendStyledMessage(sock, chatId, invalidMsg, [], message);
}

// ============================================================
// MAIN COMMAND
// ============================================================

export default {
    name: 'antibadword',
    description: 'Configure anti-badword filter for groups',
    icon: '🚫',
    alias: ['abw', 'badword', 'antibad', 'filter'],
    category: 'group',
    groupOnly: true,
    
    async execute(sock, msg, args, currentPrefix, { isOwner, jidManager }) {
        
        const chatId = msg.key.remoteJid;
        const senderId = msg.key.participant || chatId;
        
        // Check if it's a group
        const groupCheck = isGroup(chatId);
        if (!groupCheck.isGroup) {
            const notGroupMsg = `╭──❍「 *🚫 ANTI-BADWORD* 」❍
├ ❌ *Error* : This command only works in groups!
╰──────❍

▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`;
            await sendStyledMessage(sock, chatId, notGroupMsg, [], msg);
            return;
        }
        
        // Check if sender is owner or admin
        const ownerCheck = await isOwner(senderId, jidManager);
        const adminCheck = await isAdmin(sock, chatId, senderId);
        const isAuthorized = ownerCheck.isOwner || adminCheck.isSenderAdmin;
        
        if (!isAuthorized) {
            const notAuthMsg = `╭──❍「 *🚫 ANTI-BADWORD* 」❍
├ 👤 *User* : @${senderId.split('@')[0]}
├ ❌ *Error* : Only admins can use this command!
╰──────❍

_📌 Contact group admin for assistance_
▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`;
            await sendStyledMessage(sock, chatId, notAuthMsg, [senderId], msg);
            return;
        }
        
        // Check if bot is admin (needed for deletion)
        const botAdminCheck = await isAdmin(sock, chatId, sock.user.id);
        const isBotAdmin = botAdminCheck.isBotAdmin;
        
        // Pass prefix as args[2] for help display
        const newArgs = [...args];
        newArgs[2] = currentPrefix;
        
        await handleAntiBadwordCommand(sock, chatId, msg, newArgs, isBotAdmin);
    }
};

// Export for use in index.js
export { handleAntiBadwordCommand, checkAntiBadword, getAntibadwordSettings, saveAntibadwordSettings };