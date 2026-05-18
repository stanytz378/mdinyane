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
import isOwner from '../../stanymain/isOwner.js';

// ============================================================
// FILE PATHS
// ============================================================
const DATA_DIR = path.join(process.cwd(), 'stanydata');
const SUDO_FILE = path.join(DATA_DIR, 'sudo_users.json');

if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

if (!fs.existsSync(SUDO_FILE)) {
    fs.writeFileSync(SUDO_FILE, JSON.stringify({ users: [] }, null, 2));
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

function addSudoUser(userId, addedBy) {
    const users = loadSudoUsers();
    const cleanId = cleanNumber(userId);
    
    if (users.includes(cleanId)) {
        return false;
    }
    
    users.push(cleanId);
    saveSudoUsers(users);
    return true;
}

function removeSudoUser(userId) {
    const users = loadSudoUsers();
    const cleanId = cleanNumber(userId);
    const newUsers = users.filter(u => u !== cleanId);
    
    if (newUsers.length === users.length) {
        return false;
    }
    
    saveSudoUsers(newUsers);
    return true;
}

function isSudoUser(userId) {
    const users = loadSudoUsers();
    const cleanId = cleanNumber(userId);
    return users.includes(cleanId);
}

function getSudoList() {
    return loadSudoUsers();
}

function cleanNumber(jid) {
    if (!jid) return '';
    return jid.split('@')[0].split(':')[0].replace(/[^0-9]/g, '');
}

function getTargetId(msg, args) {
    // Check if replying to a message
    const quotedMsg = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    if (quotedMsg) {
        const quotedParticipant = msg.message.extendedTextMessage.contextInfo.participant;
        if (quotedParticipant) return quotedParticipant;
        if (quotedMsg.key?.participant) return quotedMsg.key.participant;
        if (quotedMsg.key?.remoteJid) return quotedMsg.key.remoteJid;
    }
    
    // Check if mentioned
    if (msg.message?.extendedTextMessage?.contextInfo?.mentionedJid) {
        const mentioned = msg.message.extendedTextMessage.contextInfo.mentionedJid[0];
        if (mentioned) return mentioned;
    }
    
    // Check if number provided
    const number = args[0]?.trim();
    if (number && number.match(/^[0-9]{10,15}$/)) {
        return `${number}@s.whatsapp.net`;
    }
    
    return null;
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
        await sock.sendMessage(chatId, { text: text, mentions: mentions }, { quoted: quoted });
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
        
        const ownerCheck = await isOwner(senderId, jidManager);
        if (!ownerCheck.isOwner) {
            await sendStyledMessage(sock, chatId, `╭──❍「 *👑 SUDO* 」❍
├ 👤 *User* : @${senderId.split('@')[0]}
├ ❌ *Error* : Owner only command!
╰──────❍
▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`, [senderId], msg);
            return;
        }
        
        const action = args[0]?.toLowerCase();
        const now = moment().tz('Africa/Dar_es_Salaam');
        const date = now.format('DD/MM/YYYY');
        const time = now.format('HH:mm:ss');
        
        // ============================================================
        // LIST SUDO USERS
        // ============================================================
        if (!action || action === 'list') {
            const sudoUsers = getSudoList();
            
            if (sudoUsers.length === 0) {
                await sendStyledMessage(sock, chatId, `╭──❍「 *👑 SUDO USERS* 」❍
├ 📝 *No sudo users found*
├ 📅 *Date* : ${date}
├ ⏰ *Time* : ${time} EAT
╰──────❍
_📌 Use ${currentPrefix}sudo add @user to add_
▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`, [], msg);
                return;
            }
            
            let listText = `╭──❍「 *👑 SUDO USERS* 」❍\n`;
            for (let i = 0; i < sudoUsers.length; i++) {
                listText += `├ ${i + 1}. +${sudoUsers[i]}\n`;
            }
            listText += `├ 📊 *Total* : ${sudoUsers.length}\n`;
            listText += `├ 📅 *Date* : ${date}\n`;
            listText += `├ ⏰ *Time* : ${time} EAT\n`;
            listText += `╰──────❍\n`;
            listText += `_📌 Sudo users can use owner commands_\n`;
            listText += `▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`;
            
            await sendStyledMessage(sock, chatId, listText, [], msg);
            return;
        }
        
        // ============================================================
        // ADD SUDO USER
        // ============================================================
        if (action === 'add') {
            let targetId = getTargetId(msg, args);
            
            if (!targetId) {
                await sendStyledMessage(sock, chatId, `╭──❍「 *👑 SUDO* 」❍
├ 📝 *Ways to add* :
│
│ 1️⃣ *Reply to user's message*
│    ${currentPrefix}sudo add
│
│ 2️⃣ *Tag the user*
│    ${currentPrefix}sudo add @user
│
│ 3️⃣ *Type their number*
│    ${currentPrefix}sudo add 255787069580
╰──────❍
▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`, [], msg);
                return;
            }
            
            const cleanTarget = cleanNumber(targetId);
            const ownerNumber = cleanNumber(OWNER_NUMBER || jidManager?.owner?.cleanNumber);
            
            // Check if trying to add owner
            if (cleanTarget === ownerNumber) {
                await sendStyledMessage(sock, chatId, `╭──❍「 *👑 SUDO* 」❍
├ ⚠️ *Error* : Cannot add main owner as sudo
├ 📝 *Owner already has full access*
╰──────❍
▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`, [], msg);
                return;
            }
            
            // Check if already sudo
            if (isSudoUser(targetId)) {
                await sendStyledMessage(sock, chatId, `╭──❍「 *👑 SUDO* 」❍
├ ⚠️ *Already Sudo* : +${cleanTarget}
├ 📝 *User is already a sudo user*
╰──────❍
▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`, [targetId], msg);
                return;
            }
            
            // Add sudo user
            addSudoUser(targetId, senderId);
            
            await sendStyledMessage(sock, chatId, `╭──❍「 *👑 SUDO ADDED* 」❍
├ ✅ *User* : +${cleanTarget}
├ 👑 *Added By* : @${senderId.split('@')[0]}
├ 📅 *Date* : ${date}
├ ⏰ *Time* : ${time} EAT
╰──────❍
_📌 User can now use owner commands_
▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`, [targetId, senderId], msg);
            
            // Notify the new sudo user
            try {
                const notifyMsg = `╭━━━━━━━━━━━━━━━━━━━━━━╮
┃         👑 *SUDO ACCESS GRANTED* 👑        
╰━━━━━━━━━━━━━━━━━━━━━━╯

✅ *Congratulations!*

You have been granted *SUDO* access.

🔧 *Permissions* : Full owner commands
👑 *Granted By* : Bot Owner

_📌 Use this power responsibly_

▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`;
                await sock.sendMessage(targetId, { text: notifyMsg });
            } catch (e) {}
            return;
        }
        
        // ============================================================
        // REMOVE SUDO USER
        // ============================================================
        if (action === 'remove' || action === 'delete' || action === 'del') {
            let targetId = getTargetId(msg, args);
            
            if (!targetId) {
                await sendStyledMessage(sock, chatId, `╭──❍「 *👑 SUDO* 」❍
├ 📝 *Ways to remove* :
│
│ 1️⃣ *Reply to user's message*
│    ${currentPrefix}sudo remove
│
│ 2️⃣ *Tag the user*
│    ${currentPrefix}sudo remove @user
│
│ 3️⃣ *Type their number*
│    ${currentPrefix}sudo remove 255712345678
╰──────❍
▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`, [], msg);
                return;
            }
            
            const cleanTarget = cleanNumber(targetId);
            
            // Check if exists
            if (!isSudoUser(targetId)) {
                await sendStyledMessage(sock, chatId, `╭──❍「 *👑 SUDO* 」❍
├ ❌ *Not Found* : +${cleanTarget}
├ 📝 *User is not a sudo user*
╰──────❍
▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`, [targetId], msg);
                return;
            }
            
            // Remove sudo user
            removeSudoUser(targetId);
            
            await sendStyledMessage(sock, chatId, `╭──❍「 *👑 SUDO REMOVED* 」❍
├ ❌ *User* : +${cleanTarget}
├ 👑 *Removed By* : @${senderId.split('@')[0]}
├ 📅 *Date* : ${date}
├ ⏰ *Time* : ${time} EAT
╰──────❍
_📌 User can no longer use owner commands_
▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`, [targetId, senderId], msg);
            
            // Notify the removed user
            try {
                const notifyMsg = `╭━━━━━━━━━━━━━━━━━━━━━━╮
┃        ❌ *SUDO ACCESS REVOKED* ❌        
╰━━━━━━━━━━━━━━━━━━━━━━╯

Your SUDO access has been removed.

Contact the bot owner for more information.

▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`;
                await sock.sendMessage(targetId, { text: notifyMsg });
            } catch (e) {}
            return;
        }
        
        // ============================================================
        // CHECK SUDO STATUS
        // ============================================================
        if (action === 'check' || action === 'status') {
            let targetId = getTargetId(msg, args);
            
            if (!targetId) {
                targetId = senderId;
            }
            
            const cleanTarget = cleanNumber(targetId);
            const isSudo = isSudoUser(targetId);
            const ownerNumber = cleanNumber(OWNER_NUMBER || jidManager?.owner?.cleanNumber);
            const isMainOwner = cleanTarget === ownerNumber;
            
            let role = '👤 USER';
            let roleIcon = '👤';
            
            if (isMainOwner) {
                role = '👑 OWNER';
                roleIcon = '👑';
            } else if (isSudo) {
                role = '⚡ SUDO';
                roleIcon = '⚡';
            }
            
            await sendStyledMessage(sock, chatId, `╭──❍「 *👑 SUDO STATUS* 」❍
├ 👤 *User* : +${cleanTarget}
├ ${roleIcon} *Role* : ${role}
├ 🔧 *Sudo* : ${isSudo ? '✅ Yes' : '❌ No'}
├ 📅 *Date* : ${date}
├ ⏰ *Time* : ${time} EAT
╰──────❍
_📌 Sudo users can use owner commands_
▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`, [targetId], msg);
            return;
        }
        
        // ============================================================
        // INVALID COMMAND
        // ============================================================
        await sendStyledMessage(sock, chatId, `╭──❍「 *👑 SUDO COMMANDS* 」❍
├ 📝 *Available commands* :
│
│ 🔧 ${currentPrefix}sudo list - List all sudo users
│ 🔧 ${currentPrefix}sudo add @user - Add sudo user
│ 🔧 ${currentPrefix}sudo remove @user - Remove sudo user
│ 🔧 ${currentPrefix}sudo check @user - Check user status
│
├ 📌 *Ways to add/remove* :
│ • Reply to user's message
│ • Tag the user
│ • Type their number
│
╰──────❍
_📌 Sudo users get owner privileges_
▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`, [], msg);
    }
};

// Export for use in other files
export { isSudoUser, addSudoUser, removeSudoUser, getSudoList };