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
import { channelInfo } from '../../stanytz/messageConfig.js';
import isAdmin from '../../stanymain/isAdmin.js';
import isOwner from '../../stanymain/isOwner.js';
import isGroup from '../../stanymain/isGroup.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Data directory
const DATA_DIR = path.join(process.cwd(), 'stanydata');
const ANTIBADWORD_FILE = path.join(DATA_DIR, 'antibadword_settings.json');

if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

// ============================================================
// DEFAULT BAD WORDS
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
// DATABASE FUNCTIONS
// ============================================================

async function loadDatabase() {
    try {
        if (fs.existsSync(ANTIBADWORD_FILE)) {
            return JSON.parse(fs.readFileSync(ANTIBADWORD_FILE, 'utf8'));
        }
        return {};
    } catch {
        return {};
    }
}

async function saveDatabase(data) {
    try {
        fs.writeFileSync(ANTIBADWORD_FILE, JSON.stringify(data, null, 2));
        return true;
    } catch (error) {
        console.error('Error saving antibadword config:', error);
        return false;
    }
}

async function getAntibadwordSettings(chatId) {
    const data = await loadDatabase();
    const setting = data[chatId];
    if (setting && typeof setting === 'object') {
        return {
            enabled: setting.enabled || false,
            words: Array.isArray(setting.words) ? setting.words : [...DEFAULT_BAD_WORDS]
        };
    }
    return { enabled: false, words: [...DEFAULT_BAD_WORDS] };
}

async function setAntibadwordSettings(chatId, enabled, words) {
    const data = await loadDatabase();
    data[chatId] = {
        enabled: Boolean(enabled),
        words: words || [...DEFAULT_BAD_WORDS],
        updatedAt: new Date().toISOString()
    };
    await saveDatabase(data);
    return data[chatId];
}

async function removeAntibadwordSettings(chatId) {
    const data = await loadDatabase();
    delete data[chatId];
    await saveDatabase(data);
}

// ============================================================
// CHECK BADWORD HANDLER
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
        if (!settings.enabled) return false;
        
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
            const warnMsg = `╭──❍「 *🚫 ANTI-BADWORD SYSTEM* 」❍
├ 👤 *User* : @${senderId.split('@')[0]}
├ 🚫 *Word* : "${foundWord}"
├ 🗑️ *Action* : Message deleted
╰──────❍

✨ *"${randomQuote}"* ✨

_📌 Please avoid using inappropriate language in this group_
▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`;
            
            await sendStyledMessage(sock, chatId, warnMsg, [senderId], message);
            return true;
        }
        
        return false;
    } catch (error) {
        console.error('Error in checkAntiBadword:', error);
        return false;
    }
}

// ============================================================
// COMMAND HANDLER
// ============================================================

export async function handleAntiBadwordCommand(sock, chatId, message, args, currentPrefix, isBotAdmin) {
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
        const statusText = settings.enabled ? 'ENABLED' : 'DISABLED';
        const wordCount = settings.words?.length || 0;
        
        const statusMsg = `╭──❍「 *🚫 ANTI-BADWORD FILTER* 」❍
├ 📝 *Status* : ${statusIcon} ${statusText}
├ 🔢 *Blocked Words* : ${wordCount}
├ 🤖 *Bot Admin* : ${isBotAdmin ? '✅' : '❌'}
╰─┬────❍
╭─┴─❍「 *📋 COMMANDS* 」❍
│ 🔧 ${currentPrefix}antibadword on - Enable filter
│ 🔧 ${currentPrefix}antibadword off - Disable filter
│ 🔧 ${currentPrefix}antibadword add <word> - Add word
│ 🔧 ${currentPrefix}antibadword remove <word> - Remove word
│ 🔧 ${currentPrefix}antibadword list - Show blocked words
│ 🔧 ${currentPrefix}antibadword reset - Reset to default
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
        
        await setAntibadwordSettings(chatId, true, settings.words);
        
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
        await setAntibadwordSettings(chatId, false, settings.words);
        
        const disableMsg = `╭──❍「 *🚫 ANTI-BADWORD* 」❍
├ ❌ *Status* : DISABLED
├ 📝 *Note* : Badword filter is inactive
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
├ ❌ *Usage* : ${currentPrefix}antibadword add <word>
├ 📝 *Example* : ${currentPrefix}antibadword add badword
╰──────❍

▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`;
            await sendStyledMessage(sock, chatId, usageMsg, [], message);
            return;
        }
        
        if (settings.words.includes(word)) {
            const existsMsg = `╭──❍「 *🚫 ANTI-BADWORD* 」❍
├ ❌ *Word* : "${word}"
├ 📝 *Status* : Already in blocked list
╰──────❍

▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`;
            await sendStyledMessage(sock, chatId, existsMsg, [], message);
            return;
        }
        
        const newWords = [...settings.words, word];
        await setAntibadwordSettings(chatId, settings.enabled, newWords);
        
        const addMsg = `╭──❍「 *🚫 ANTI-BADWORD* 」❍
├ ✅ *Word Added* : "${word}"
├ 📊 *Total Words* : ${newWords.length}
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
├ ❌ *Usage* : ${currentPrefix}antibadword remove <word>
├ 📝 *Example* : ${currentPrefix}antibadword remove badword
╰──────❍

▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`;
            await sendStyledMessage(sock, chatId, usageMsg, [], message);
            return;
        }
        
        if (!settings.words.includes(word)) {
            const notFoundMsg = `╭──❍「 *🚫 ANTI-BADWORD* 」❍
├ ❌ *Word* : "${word}"
├ 📝 *Status* : Not found in blocked list
╰──────❍

▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`;
            await sendStyledMessage(sock, chatId, notFoundMsg, [], message);
            return;
        }
        
        const newWords = settings.words.filter((w) => w !== word);
        await setAntibadwordSettings(chatId, settings.enabled, newWords);
        
        const removeMsg = `╭──❍「 *🚫 ANTI-BADWORD* 」❍
├ ✅ *Word Removed* : "${word}"
├ 📊 *Remaining Words* : ${newWords.length}
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

_📌 Use ${currentPrefix}antibadword add <word> to add words_
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
        await setAntibadwordSettings(chatId, settings.enabled, [...DEFAULT_BAD_WORDS]);
        
        const resetMsg = `╭──❍「 *🚫 ANTI-BADWORD* 」❍
├ 🔄 *Reset* : To default bad words
├ 📊 *Total Words* : ${DEFAULT_BAD_WORDS.length}
╰──────❍

▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`;
        await sendStyledMessage(sock, chatId, resetMsg, [], message);
        return;
    }
    
    // ========== INVALID COMMAND ==========
    const invalidMsg = `╭──❍「 *🚫 ANTI-BADWORD* 」❍
├ ❌ *Invalid command* : ${action}
├ 📝 *Use* : ${currentPrefix}antibadword for help
╰──────❍

▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`;
    await sendStyledMessage(sock, chatId, invalidMsg, [], message);
}

// ============================================================
// SINGLE EXPORT - NO DUPLICATES
// ============================================================

export { 
    getAntibadwordSettings, 
    setAntibadwordSettings, 
    removeAntibadwordSettings,
    DEFAULT_BAD_WORDS
};