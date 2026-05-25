/*****************************************************************************
 *                     Developed By STANY TZ                                 *
 *****************************************************************************/

import fs from 'fs';
import path from 'path';
import moment from 'moment-timezone';
import { channelInfo } from '../../stanytz/messageConfig.js';
import isAdmin from '../../stanymain/isAdmin.js';
import isOwner from '../../stanymain/isOwner.js';
import isGroup from '../../stanymain/isGroup.js';

const DATA_DIR = path.join(process.cwd(), 'stanydata');
const WELCOME_FILE = path.join(DATA_DIR, 'welcome_settings.json');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(WELCOME_FILE)) fs.writeFileSync(WELCOME_FILE, JSON.stringify({}, null, 2));

// ============================================================
// WELCOME FUNCTIONS
// ============================================================

export async function getWelcomeSettings(chatId) {
    try {
        const data = JSON.parse(fs.readFileSync(WELCOME_FILE, 'utf8'));
        return data[chatId] || { enabled: false, message: null };
    } catch {
        return { enabled: false, message: null };
    }
}

export async function setWelcomeSettings(chatId, enabled, message) {
    try {
        const data = JSON.parse(fs.readFileSync(WELCOME_FILE, 'utf8'));
        data[chatId] = { enabled, message, updatedAt: new Date().toISOString() };
        fs.writeFileSync(WELCOME_FILE, JSON.stringify(data, null, 2));
        return true;
    } catch {
        return false;
    }
}

// ============================================================
// SEND MESSAGE
// ============================================================

async function sendMessage(sock, chatId, text, mentions = [], quoted = null) {
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
// SEND WELCOME MESSAGE (EXPORTED FOR INDEX.JS)
// ============================================================

export async function sendWelcomeMessage(sock, groupId, participants) {
    try {
        const settings = await getWelcomeSettings(groupId);
        if (!settings.enabled) return;
        
        const now = moment().tz('Africa/Dar_es_Salaam');
        const time = now.format('HH:mm:ss');
        const date = now.format('DD/MM/YYYY');
        
        // Get group name and description
        let groupName = 'Group';
        let groupDescription = '';
        try {
            const metadata = await sock.groupMetadata(groupId);
            groupName = metadata.subject || 'Group';
            groupDescription = metadata.desc || '';
        } catch (e) {}
        
        for (const participant of participants) {
            const participantId = typeof participant === 'string' ? participant : participant.id;
            const participantNumber = participantId.split('@')[0];
            
            // Get participant name (pushname)
            let participantName = participantNumber;
            try {
                const contact = await sock.onWhatsApp(participantId);
                if (contact && contact[0] && contact[0].name) {
                    participantName = contact[0].name;
                }
            } catch (e) {}
            
            // Build welcome message
            let welcomeMsg = `╭━━━━╮
┃              🎉 WELCOME 🎉              
╰━━━━━━━━╯

🎉 Welcome @${participantName} to ${groupName} Group!`;
            
            // Add group description if exists
            if (groupDescription) {
                welcomeMsg += `\n\n${groupDescription}`;
            }
            
            welcomeMsg += `\n\n━━━━━━━━━━━━
©️ MDINYANE WITH CONDOM
━━━━━━━━━━━━`;
            
            await sendMessage(sock, groupId, welcomeMsg, [participantId]);
        }
    } catch (error) {
        console.error('[WELCOME] Error:', error);
    }
}

// ============================================================
// MAIN COMMAND
// ============================================================

export default {
    name: 'welcome',
    description: 'Enable or disable welcome messages for new members',
    icon: '👋',
    alias: ['welcomemsg', 'greet', 'karibu'],
    category: 'group',
    groupOnly: true,
    
    async execute(sock, msg, args, currentPrefix, { isOwner, jidManager }) {
        const chatId = msg.key.remoteJid;
        const senderId = msg.key.participant || chatId;
        
        // Check if in group
        const groupCheck = isGroup(chatId);
        if (!groupCheck.isGroup) {
            await sendMessage(sock, chatId, `❌ This command only works in groups!`, [], msg);
            return;
        }
        
        // Check if admin or owner
        const ownerCheck = await isOwner(senderId, jidManager);
        const adminCheck = await isAdmin(sock, chatId, senderId);
        const isAuthorized = ownerCheck.isOwner || adminCheck.isSenderAdmin;
        
        if (!isAuthorized) {
            await sendMessage(sock, chatId, `❌ Only admins can use this command!`, [senderId], msg);
            return;
        }
        
        const action = args[0]?.toLowerCase();
        const settings = await getWelcomeSettings(chatId);
        const now = moment().tz('Africa/Dar_es_Salaam');
        const date = now.format('DD/MM/YYYY');
        const time = now.format('HH:mm:ss');
        
        // Get group name
        let groupName = 'Group';
        try {
            const metadata = await sock.groupMetadata(chatId);
            groupName = metadata.subject || 'Group';
        } catch (e) {}
        
        // ============================================================
        // STATUS
        // ============================================================
        if (!action || action === 'status') {
            const statusIcon = settings.enabled ? '✅' : '❌';
            const statusText = settings.enabled ? 'ENABLED' : 'DISABLED';
            
            await sendMessage(sock, chatId, `╭──❍「 👋 WELCOME 」❍
├ 📝 Status: ${statusIcon} ${statusText}
├ 📝 Message: ${settings.message || '🎉 Welcome {name} to {group} Group!'}
├ 👥 Group: ${groupName}
├ 📅 Date: ${date}
├ ⏰ Time: ${time} EAT
╰─┬────❍
╭─┴─❍「 📋 COMMANDS 」❍
│ 🔧 ${currentPrefix}welcome on - Enable welcome messages
│ 🔧 ${currentPrefix}welcome off - Disable welcome messages
│ 🔧 ${currentPrefix}welcome set <message> - Set custom message
│ 🔧 ${currentPrefix}welcome reset - Reset to default
│ 🔧 ${currentPrefix}welcome status - Show settings
╰──────❍
✨ *Variables you can use:*
   {name} - Member's name
   {group} - Group name
   {time} - Current time
   {date} - Current date
▰▰▰ ©️ MDINYANE WITH CONDOM ▰▰▰`, [], msg);
            return;
        }
        
        // ============================================================
        // ENABLE
        // ============================================================
        if (action === 'on') {
            await setWelcomeSettings(chatId, true, settings.message);
            await sendMessage(sock, chatId, `✅ Welcome messages ENABLED for ${groupName}`, [], msg);
            console.log(`[WELCOME] Enabled by ${senderId.split('@')[0]} in ${groupName}`);
            return;
        }
        
        // ============================================================
        // DISABLE
        // ============================================================
        if (action === 'off') {
            await setWelcomeSettings(chatId, false, settings.message);
            await sendMessage(sock, chatId, `❌ Welcome messages DISABLED for ${groupName}`, [], msg);
            console.log(`[WELCOME] Disabled by ${senderId.split('@')[0]} in ${groupName}`);
            return;
        }
        
        // ============================================================
        // SET CUSTOM MESSAGE
        // ============================================================
        if (action === 'set') {
            const newMessage = args.slice(1).join(' ');
            if (!newMessage) {
                await sendMessage(sock, chatId, `❌ Usage: ${currentPrefix}welcome set Welcome {name} to {group} Group!\n\n📝 Variables: {name}, {group}, {time}, {date}`, [], msg);
                return;
            }
            await setWelcomeSettings(chatId, settings.enabled, newMessage);
            await sendMessage(sock, chatId, `✅ Welcome message updated!\n\n📝 New: ${newMessage.substring(0, 100)}${newMessage.length > 100 ? '...' : ''}`, [], msg);
            console.log(`[WELCOME] Message updated by ${senderId.split('@')[0]} in ${groupName}`);
            return;
        }
        
        // ============================================================
        // RESET TO DEFAULT
        // ============================================================
        if (action === 'reset') {
            await setWelcomeSettings(chatId, settings.enabled, null);
            await sendMessage(sock, chatId, `✅ Reset to default welcome message\n\n📝 Default: 🎉 Welcome {name} to {group} Group!`, [], msg);
            console.log(`[WELCOME] Reset by ${senderId.split('@')[0]} in ${groupName}`);
            return;
        }
        
        // ============================================================
        // INVALID COMMAND
        // ============================================================
        await sendMessage(sock, chatId, `❌ Invalid command: ${action}\n📝 Use ${currentPrefix}welcome for help`, [], msg);
    }
};