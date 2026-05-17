/*****************************************************************************
 *                     Developed By STANY TZ                                 *
 *****************************************************************************/

import fs from 'fs';
import path from 'path';
import moment from 'moment-timezone';
import { fileURLToPath } from 'url';
import { channelInfo, botImagePath } from '../../stanytz/messageConfig.js';
import isOwner from '../../stanymain/isOwner.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Sudo users file
const DATA_DIR = path.join(process.cwd(), 'stanydata');
const SUDO_FILE = path.join(DATA_DIR, 'sudo_users.json');

if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

if (!fs.existsSync(SUDO_FILE)) {
    fs.writeFileSync(SUDO_FILE, JSON.stringify({ users: [], updatedAt: new Date().toISOString() }, null, 2));
}

// ============================================================
// SUDO FUNCTIONS
// ============================================================

function loadSudoUsers() {
    try {
        const data = JSON.parse(fs.readFileSync(SUDO_FILE, 'utf8'));
        return data.users || [];
    } catch {
        return [];
    }
}

function saveSudoUsers(users) {
    try {
        fs.writeFileSync(SUDO_FILE, JSON.stringify({ users: users, updatedAt: new Date().toISOString() }, null, 2));
        return true;
    } catch {
        return false;
    }
}

function addSudoUser(userId) {
    const users = loadSudoUsers();
    const cleanId = cleanNumber(userId);
    
    if (!users.includes(cleanId) && !users.includes(userId)) {
        users.push(cleanId);
        saveSudoUsers(users);
        return true;
    }
    return false;
}

function removeSudoUser(userId) {
    const users = loadSudoUsers();
    const cleanId = cleanNumber(userId);
    const newUsers = users.filter(u => u !== cleanId && u !== userId);
    
    if (newUsers.length !== users.length) {
        saveSudoUsers(newUsers);
        return true;
    }
    return false;
}

function isSudoUser(userId) {
    const users = loadSudoUsers();
    const cleanId = cleanNumber(userId);
    return users.includes(cleanId) || users.includes(userId);
}

function cleanNumber(jid) {
    if (!jid) return '';
    return jid.split('@')[0].split(':')[0].replace(/[^0-9]/g, '');
}

function getSudoList() {
    return loadSudoUsers();
}

// ============================================================
// GET USER ID FROM DIFFERENT INPUTS
// ============================================================

async function getUserId(sock, msg, args) {
    // Method 1: Check if mentioned
    if (msg.message?.extendedTextMessage?.contextInfo?.mentionedJid) {
        const mentioned = msg.message.extendedTextMessage.contextInfo.mentionedJid[0];
        if (mentioned) return mentioned;
    }
    
    // Method 2: Check if replying to a message
    const quotedMsg = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    if (quotedMsg) {
        const quotedParticipant = msg.message.extendedTextMessage.contextInfo.participant;
        if (quotedParticipant) return quotedParticipant;
        
        // Try to get sender from quoted message
        if (quotedMsg.key?.participant) return quotedMsg.key.participant;
        if (quotedMsg.key?.remoteJid) return quotedMsg.key.remoteJid;
    }
    
    // Method 3: Check if a number was provided
    const number = args[1]?.trim();
    if (number) {
        // Check if it's a valid number
        const cleanNum = number.replace(/[^0-9]/g, '');
        if (cleanNum && cleanNum.length >= 9) {
            return `${cleanNum}@s.whatsapp.net`;
        }
    }
    
    return null;
}

// ============================================================
// QUOTES
// ============================================================
const QUOTES = [
    "I'm not lazy, I'm just on my energy saving mode.",
    "Life is short, smile while you still have teeth.",
    "With great power comes great responsibility! 👑",
    "Trusted users only! 🤝",
    "Manage your team wisely! 🛡️"
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
    name: 'sudo',
    description: 'Manage sudo users (bot admins)',
    icon: '👑',
    alias: ['admin', 'sudoer', 'addsudo'],
    category: 'owner',
    ownerOnly: true,
    
    async execute(sock, msg, args, currentPrefix, { isOwner, jidManager }) {
        
        const chatId = msg.key.remoteJid;
        const senderId = msg.key.participant || chatId;
        
        // Owner check
        const ownerCheck = await isOwner(senderId, jidManager);
        if (!ownerCheck.isOwner) {
            const notAuthMsg = `╭──❍「 *👑 SUDO SYSTEM* 」❍
├ 👤 *User* : @${senderId.split('@')[0]}
├ ❌ *Error* : Owner only command!
╰──────❍

_📌 This command is only for bot owner_
▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`;
            await sendStyledMessage(sock, chatId, notAuthMsg, [senderId], msg);
            return;
        }
        
        const now = moment().tz('Africa/Dar_es_Salaam');
        const date = now.format('DD/MM/YYYY');
        const day = now.format('dddd');
        const time = now.format('HH:mm:ss');
        
        const randomQuote = getRandomQuote();
        const botName = 'MDINYANE';
        const action = args[0]?.toLowerCase();
        
        // ========== SHOW SUDO LIST ==========
        if (!action || action === 'list') {
            const sudoUsers = getSudoList();
            const sudoList = sudoUsers.length > 0 
                ? sudoUsers.map((u, i) => `${i + 1}. +${u}`).join('\n│ ')
                : '│ ❌ No sudo users added yet';
            
            const listMsg = `╭──❍「 *👑 SUDO USERS* 」❍
├ 📅 *Date* : ${date}
├ 📆 *Day* : ${day}
├ ⏰ *Time* : ${time} EAT
├ 📊 *Total* : ${sudoUsers.length} sudo users
╰─┬────❍
╭─┴─❍「 *👥 SUDO LIST* 」❍
│ ${sudoList}
╰─┬────❍
╭─┴─❍「 *📋 COMMANDS* 」❍
│ 🔧 ${currentPrefix}sudo add @user - Tag user
│ 🔧 ${currentPrefix}sudo add 255xxxxxx - By number
│ 🔧 ${currentPrefix}sudo add - Reply to message
│ 🔧 ${currentPrefix}sudo remove @user - Remove user
│ 🔧 ${currentPrefix}sudo list - Show sudo users
╰──────❍
╭─┴─❍「 *💡 HOW TO ADD* 」❍
│ ✅ Tag the user: .sudo add @username
│ ✅ Type number: .sudo add 255712345678
│ ✅ Reply to message: .sudo add (reply to user's msg)
╰──────❍
╭─┴─❍「 *🔒 INFO* 」❍
│ 👑 *Sudo users can:*
│    • Use owner commands
│    • Manage bot settings
│    • Configure features
│    • View all data
╰──────❍

✨ *"${randomQuote}"* ✨

▰▰▰ *©️ ${botName.toUpperCase()} BY STANY TZ* ▰▰▰`;
            await sendStyledMessage(sock, chatId, listMsg, [], msg);
            return;
        }
        
        // ========== ADD SUDO USER ==========
        if (action === 'add') {
            // Get user ID from various methods
            const targetId = await getUserId(sock, msg, args);
            
            if (!targetId) {
                const usageMsg = `╭──❍「 *👑 SUDO SYSTEM* 」❍
├ ❌ *Error* : Please provide a user to add
├ 📝 *Ways to add* :
│
│ 1️⃣ *Tag the user*
│    ${currentPrefix}sudo add @username
│
│ 2️⃣ *Type their number*
│    ${currentPrefix}sudo add 255712345678
│
│ 3️⃣ *Reply to their message*
│    Reply to any message from the user
│    Then type ${currentPrefix}sudo add
╰──────❍

_📌 Choose any method above_
▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`;
                await sendStyledMessage(sock, chatId, usageMsg, [], msg);
                return;
            }
            
            const cleanTarget = cleanNumber(targetId);
            const targetNumber = `+${cleanTarget}`;
            
            // Check if trying to add owner
            const ownerNumber = cleanNumber(OWNER_NUMBER || jidManager?.owner?.cleanNumber);
            if (cleanTarget === ownerNumber) {
                const ownerMsg = `╭──❍「 *👑 SUDO SYSTEM* 」❍
├ ⚠️ *Error* : Cannot add main owner as sudo
├ 📝 *Note* : Owner already has full access
╰──────❍

▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`;
                await sendStyledMessage(sock, chatId, ownerMsg, [], msg);
                return;
            }
            
            // Check if already sudo
            if (isSudoUser(targetId)) {
                const alreadyMsg = `╭──❍「 *👑 SUDO SYSTEM* 」❍
├ ⚠️ *Status* : User is already a sudo user
├ 👤 *User* : ${targetNumber}
╰──────❍

▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`;
                await sendStyledMessage(sock, chatId, alreadyMsg, [], msg);
                return;
            }
            
            // Add sudo user
            addSudoUser(targetId);
            
            const addMsg = `╭──❍「 *👑 SUDO SYSTEM* 」❍
├ ✅ *Sudo User Added*
├ 👤 *User* : ${targetNumber}
├ 📅 *Date* : ${date}
├ ⏰ *Time* : ${time} EAT
╰──────❍

✨ *"${randomQuote}"* ✨

_📌 User can now use owner commands_
▰▰▰ *©️ ${botName.toUpperCase()} BY STANY TZ* ▰▰▰`;
            await sendStyledMessage(sock, chatId, addMsg, [targetId], msg);
            
            // Notify the new sudo user
            try {
                const notifyMsg = `╭──❍「 *👑 SUDO NOTIFICATION* 」❍
├ ✅ *Congratulations!* 
├ 📝 *Status* : You have been added as a SUDO user
├ 🔧 *Permissions* : Full owner access
├ 👨‍💻 *Added By* : Bot Owner
╰──────❍

_📌 You can now use all owner commands_
▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`;
                await sock.sendMessage(targetId, {
                    text: notifyMsg,
                    contextInfo: channelInfo.contextInfo
                });
            } catch (e) {
                console.log('Could not notify user:', e.message);
            }
            return;
        }
        
        // ========== REMOVE SUDO USER ==========
        if (action === 'remove' || action === 'delete' || action === 'del') {
            const targetId = await getUserId(sock, msg, args);
            
            if (!targetId) {
                const usageMsg = `╭──❍「 *👑 SUDO SYSTEM* 」❍
├ ❌ *Error* : Please provide a user to remove
├ 📝 *Ways to remove* :
│
│ 1️⃣ *Tag the user*
│    ${currentPrefix}sudo remove @username
│
│ 2️⃣ *Type their number*
│    ${currentPrefix}sudo remove 255712345678
│
│ 3️⃣ *Reply to their message*
│    Reply to any message from the user
│    Then type ${currentPrefix}sudo remove
╰──────❍

_📌 Choose any method above_
▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`;
                await sendStyledMessage(sock, chatId, usageMsg, [], msg);
                return;
            }
            
            const cleanTarget = cleanNumber(targetId);
            const targetNumber = `+${cleanTarget}`;
            
            // Check if exists
            if (!isSudoUser(targetId)) {
                const notFoundMsg = `╭──❍「 *👑 SUDO SYSTEM* 」❍
├ ❌ *Error* : User is not a sudo user
├ 👤 *User* : ${targetNumber}
╰──────❍

▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`;
                await sendStyledMessage(sock, chatId, notFoundMsg, [], msg);
                return;
            }
            
            // Remove sudo user
            removeSudoUser(targetId);
            
            const removeMsg = `╭──❍「 *👑 SUDO SYSTEM* 」❍
├ ❌ *Sudo User Removed*
├ 👤 *User* : ${targetNumber}
├ 📅 *Date* : ${date}
├ ⏰ *Time* : ${time} EAT
╰──────❍

✨ *"${randomQuote}"* ✨

_📌 User can no longer use owner commands_
▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`;
            await sendStyledMessage(sock, chatId, removeMsg, [targetId], msg);
            
            // Notify the removed user
            try {
                const notifyMsg = `╭──❍「 *👑 SUDO NOTIFICATION* 」❍
├ ❌ *Status* : You have been removed as a SUDO user
├ 📝 *Note* : Owner privileges revoked
╰──────❍

_📌 Contact bot owner for more information_
▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`;
                await sock.sendMessage(targetId, { text: notifyMsg });
            } catch (e) {}
            return;
        }
        
        // Invalid command
        const invalidMsg = `╭──❍「 *👑 SUDO SYSTEM* 」❍
├ ❌ *Invalid command* : ${action}
├ 📝 *Use* : ${currentPrefix}sudo for help
╰──────❍

▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`;
        await sendStyledMessage(sock, chatId, invalidMsg, [], msg);
    }
};

// Export for use in other files
export { isSudoUser, addSudoUser, removeSudoUser, getSudoList };