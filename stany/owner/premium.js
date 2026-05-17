import fs from 'fs';
import path from 'path';
import moment from 'moment-timezone';
import { channelInfo } from '../../stanytz/messageConfig.js';
import isOwner from '../../stanymain/isOwner.js';

// ============================================================
// FILE PATHS
// ============================================================
const DATA_DIR = path.join(process.cwd(), 'stanydata');
const PREMIUM_FILE = path.join(DATA_DIR, 'premium_users.json');

// Ensure directory exists
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Initialize premium file if not exists
if (!fs.existsSync(PREMIUM_FILE)) {
    fs.writeFileSync(PREMIUM_FILE, JSON.stringify({ users: [] }, null, 2));
}

// ============================================================
// PREMIUM FUNCTIONS
// ============================================================

function loadPremiumUsers() {
    try {
        const data = JSON.parse(fs.readFileSync(PREMIUM_FILE, 'utf8'));
        return data.users || [];
    } catch {
        return [];
    }
}

function savePremiumUsers(users) {
    try {
        fs.writeFileSync(PREMIUM_FILE, JSON.stringify({ users: users, updatedAt: new Date().toISOString() }, null, 2));
        return true;
    } catch {
        return false;
    }
}

function addPremiumUser(userId, days = 30, addedBy) {
    const users = loadPremiumUsers();
    const cleanId = cleanNumber(userId);
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + days);
    
    const existingIndex = users.findIndex(u => u.id === cleanId);
    if (existingIndex !== -1) {
        users[existingIndex].expiryDate = expiryDate.toISOString();
        users[existingIndex].days = days;
        users[existingIndex].updatedAt = new Date().toISOString();
        users[existingIndex].updatedBy = addedBy;
    } else {
        users.push({
            id: cleanId,
            addedAt: new Date().toISOString(),
            addedBy: addedBy,
            expiryDate: expiryDate.toISOString(),
            days: days,
            status: 'active'
        });
    }
    return savePremiumUsers(users);
}

function removePremiumUser(userId) {
    const users = loadPremiumUsers();
    const cleanId = cleanNumber(userId);
    const newUsers = users.filter(u => u.id !== cleanId);
    return savePremiumUsers(newUsers);
}

function isPremiumUser(userId) {
    const users = loadPremiumUsers();
    const cleanId = cleanNumber(userId);
    const user = users.find(u => u.id === cleanId);
    
    if (!user) return false;
    
    if (user.expiryDate) {
        const expiryDate = new Date(user.expiryDate);
        if (expiryDate < new Date()) {
            removePremiumUser(userId);
            return false;
        }
    }
    return true;
}

function cleanNumber(jid) {
    if (!jid) return '';
    return jid.split('@')[0].split(':')[0].replace(/[^0-9]/g, '');
}

function getPremiumList() {
    const users = loadPremiumUsers();
    const now = new Date();
    
    return users.map(user => {
        const expiryDate = new Date(user.expiryDate);
        const isExpired = expiryDate < now;
        const daysLeft = Math.ceil((expiryDate - now) / (1000 * 60 * 60 * 24));
        
        return {
            ...user,
            isExpired,
            daysLeft: daysLeft > 0 ? daysLeft : 0
        };
    }).filter(u => !u.isExpired);
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
    name: 'premium',
    description: 'Manage premium users (add, remove, list)',
    icon: '💎',
    alias: ['premiumuser', 'premiummanage', 'vip'],
    category: 'owner',
    ownerOnly: true,
    
    async execute(sock, msg, args, currentPrefix, { isOwner, jidManager }) {
        const chatId = msg.key.remoteJid;
        const senderId = msg.key.participant || chatId;
        
        // Owner check
        const ownerCheck = await isOwner(senderId, jidManager);
        if (!ownerCheck.isOwner) {
            await sendStyledMessage(sock, chatId, `╭──❍「 *💎 PREMIUM* 」❍
├ 👤 *User* : @${senderId.split('@')[0]}
├ ❌ *Error* : Owner only command!
╰──────❍`, [senderId], msg);
            return;
        }
        
        const action = args[0]?.toLowerCase();
        const now = moment().tz('Africa/Dar_es_Salaam');
        const date = now.format('DD/MM/YYYY');
        const time = now.format('HH:mm:ss');
        
        // ============================================================
        // LIST PREMIUM USERS
        // ============================================================
        if (!action || action === 'list') {
            const premiumUsers = getPremiumList();
            
            if (premiumUsers.length === 0) {
                await sendStyledMessage(sock, chatId, `╭──❍「 *💎 PREMIUM USERS* 」❍
├ 📝 *No premium users found*
├ 📅 *Date* : ${date}
├ ⏰ *Time* : ${time} EAT
╰──────❍
_📌 Use ${currentPrefix}premium add @user to add_
▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`, [], msg);
                return;
            }
            
            let listText = `╭──❍「 *💎 PREMIUM USERS* 」❍\n`;
            for (let i = 0; i < premiumUsers.length; i++) {
                const user = premiumUsers[i];
                const expiryDate = new Date(user.expiryDate);
                const daysLeft = Math.ceil((expiryDate - new Date()) / (1000 * 60 * 60 * 24));
                listText += `├ ${i + 1}. +${user.id} (${daysLeft} days left)\n`;
            }
            listText += `├ 📅 *Date* : ${date}\n`;
            listText += `├ ⏰ *Time* : ${time} EAT\n`;
            listText += `╰──────❍\n`;
            listText += `_📌 Total: ${premiumUsers.length} premium users_\n`;
            listText += `▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`;
            
            await sendStyledMessage(sock, chatId, listText, [], msg);
            return;
        }
        
        // ============================================================
        // ADD PREMIUM USER
        // ============================================================
        if (action === 'add') {
            let targetId = getTargetId(msg, args);
            
            if (!targetId) {
                await sendStyledMessage(sock, chatId, `╭──❍「 *💎 ADD PREMIUM* 」❍
├ 📝 *Ways to add* :
│
│ 1️⃣ *Reply to user's message*
│    ${currentPrefix}premium add 30
│
│ 2️⃣ *Tag the user*
│    ${currentPrefix}premium add @user 30
│
│ 3️⃣ *Type their number*
│    ${currentPrefix}premium add 255712345678 30
│
├─┬────❍
╭─┴─❍「 *⏱️ DURATION* 」❍
│ 🔹 30 days (default)
│ 🔹 60 days
│ 🔹 90 days
│ 🔹 365 days (1 year)
╰──────❍
_📌 Days are optional, defaults to 30_
▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`, [], msg);
                return;
            }
            
            // Get duration
            let days = 30;
            let durationArg = null;
            for (let i = 0; i < args.length; i++) {
                const arg = args[i];
                if (arg.match(/^\d+$/)) {
                    days = parseInt(arg);
                    durationArg = arg;
                    break;
                }
            }
            
            if (days < 1) days = 30;
            if (days > 365) days = 365;
            
            const cleanTarget = cleanNumber(targetId);
            
            // Check if already premium
            const isAlreadyPremium = isPremiumUser(targetId);
            
            // Add premium
            addPremiumUser(targetId, days, senderId);
            
            const expiryDate = new Date();
            expiryDate.setDate(expiryDate.getDate() + days);
            const formattedExpiry = moment(expiryDate).tz('Africa/Dar_es_Salaam').format('DD/MM/YYYY');
            
            if (isAlreadyPremium) {
                await sendStyledMessage(sock, chatId, `╭──❍「 *💎 PREMIUM UPDATED* 」❍
├ 👤 *User* : +${cleanTarget}
├ ✅ *Status* : Premium extended
├ 📅 *Days* : +${days} days
├ 📆 *New Expiry* : ${formattedExpiry}
├ 📅 *Date* : ${date}
├ ⏰ *Time* : ${time} EAT
╰──────❍`, [targetId], msg);
            } else {
                await sendStyledMessage(sock, chatId, `╭──❍「 *💎 PREMIUM ADDED* 」❍
├ 👤 *User* : +${cleanTarget}
├ ✅ *Status* : Premium activated
├ 📅 *Duration* : ${days} days
├ 📆 *Expires* : ${formattedExpiry}
├ 📅 *Date* : ${date}
├ ⏰ *Time* : ${time} EAT
╰──────❍`, [targetId], msg);
            }
            
            // Notify the user
            try {
                const notifyMsg = `╭━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╮
┃       💎 *PREMIUM ACTIVATED* 💎       ┃
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯

✅ *Congratulations!*

You have been granted *PREMIUM* access!

📅 *Duration* : ${days} days
📆 *Expires* : ${formattedExpiry}

🎉 *Enjoy premium features!*

▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`;
                await sock.sendMessage(targetId, { text: notifyMsg });
            } catch (e) {}
            return;
        }
        
        // ============================================================
        // REMOVE PREMIUM USER
        // ============================================================
        if (action === 'remove' || action === 'delete' || action === 'del') {
            let targetId = getTargetId(msg, args);
            
            if (!targetId) {
                await sendStyledMessage(sock, chatId, `╭──❍「 *💎 REMOVE PREMIUM* 」❍
├ 📝 *Ways to remove* :
│
│ 1️⃣ *Reply to user's message*
│    ${currentPrefix}premium remove
│
│ 2️⃣ *Tag the user*
│    ${currentPrefix}premium remove @user
│
│ 3️⃣ *Type their number*
│    ${currentPrefix}premium remove 255712345678
╰──────❍
_📌 This will revoke premium access immediately_
▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`, [], msg);
                return;
            }
            
            const cleanTarget = cleanNumber(targetId);
            
            // Check if user is premium
            if (!isPremiumUser(targetId)) {
                await sendStyledMessage(sock, chatId, `╭──❍「 *💎 REMOVE PREMIUM* 」❍
├ ⚠️ *User* : +${cleanTarget}
├ ❌ *Status* : Not a premium user
╰──────❍`, [targetId], msg);
                return;
            }
            
            removePremiumUser(targetId);
            
            await sendStyledMessage(sock, chatId, `╭──❍「 *💎 PREMIUM REMOVED* 」❍
├ 👤 *User* : +${cleanTarget}
├ ❌ *Status* : Premium revoked
├ 📅 *Date* : ${date}
├ ⏰ *Time* : ${time} EAT
╰──────❍`, [targetId], msg);
            
            // Notify the user
            try {
                const notifyMsg = `╭━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╮
┃      ❌ *PREMIUM REMOVED* ❌       ┃
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯

Your premium access has been removed.

Contact the bot owner for more information.

▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`;
                await sock.sendMessage(targetId, { text: notifyMsg });
            } catch (e) {}
            return;
        }
        
        // ============================================================
        // CHECK PREMIUM STATUS
        // ============================================================
        if (action === 'check' || action === 'status') {
            let targetId = getTargetId(msg, args);
            
            if (!targetId) {
                // Check command sender
                targetId = senderId;
            }
            
            const cleanTarget = cleanNumber(targetId);
            const isPremium = isPremiumUser(targetId);
            const users = loadPremiumUsers();
            const userData = users.find(u => u.id === cleanTarget);
            
            if (!isPremium || !userData) {
                await sendStyledMessage(sock, chatId, `╭──❍「 *💎 PREMIUM STATUS* 」❍
├ 👤 *User* : +${cleanTarget}
├ ❌ *Status* : FREE
├ 💎 *Premium* : Not active
╰──────❍`, [targetId], msg);
                return;
            }
            
            const expiryDate = new Date(userData.expiryDate);
            const daysLeft = Math.ceil((expiryDate - new Date()) / (1000 * 60 * 60 * 24));
            const addedDate = moment(userData.addedAt).tz('Africa/Dar_es_Salaam').format('DD/MM/YYYY');
            
            await sendStyledMessage(sock, chatId, `╭──❍「 *💎 PREMIUM STATUS* 」❍
├ 👤 *User* : +${cleanTarget}
├ ✅ *Status* : PREMIUM
├ 📅 *Added* : ${addedDate}
├ 📆 *Expires* : ${moment(expiryDate).tz('Africa/Dar_es_Salaam').format('DD/MM/YYYY')}
├ ⏰ *Days Left* : ${daysLeft} days
├ 👑 *Added By* : ${userData.addedBy?.split('@')[0] || 'Owner'}
╰──────❍`, [targetId], msg);
            return;
        }
        
        // ============================================================
        // INVALID COMMAND
        // ============================================================
        await sendStyledMessage(sock, chatId, `╭──❍「 *💎 PREMIUM COMMANDS* 」❍
├ 📝 *Available commands* :
│
│ 🔧 ${currentPrefix}premium list - List all premium users
│ 🔧 ${currentPrefix}premium add @user - Add premium user
│ 🔧 ${currentPrefix}premium remove @user - Remove premium user
│ 🔧 ${currentPrefix}premium check @user - Check user status
│
├ 📌 *Shortcuts* :
│ 🔧 ${currentPrefix}premium add @user 30 - 30 days
│ 🔧 ${currentPrefix}premium add @user 90 - 90 days
│ 🔧 ${currentPrefix}premium add @user 365 - 1 year
│
╰──────❍
_📌 Days default to 30 if not specified_
▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`, [], msg);
    }
};

// Export for use in other files
export { isPremiumUser, addPremiumUser, removePremiumUser, getPremiumList };