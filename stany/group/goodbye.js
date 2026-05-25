// stany/group/goodbye.js

import fs from 'fs';
import path from 'path';
import moment from 'moment-timezone';
import { channelInfo } from '../../stanytz/messageConfig.js';

const DATA_DIR = path.join(process.cwd(), 'stanydata');
const GOODBYE_FILE = path.join(DATA_DIR, 'goodbye_settings.json');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(GOODBYE_FILE)) fs.writeFileSync(GOODBYE_FILE, JSON.stringify({}, null, 2));

export async function getGoodbyeSettings(chatId) {
    try {
        const data = JSON.parse(fs.readFileSync(GOODBYE_FILE, 'utf8'));
        return data[chatId] || { enabled: false, message: null };
    } catch {
        return { enabled: false, message: null };
    }
}

export async function setGoodbyeSettings(chatId, enabled, message) {
    try {
        const data = JSON.parse(fs.readFileSync(GOODBYE_FILE, 'utf8'));
        data[chatId] = { enabled, message, updatedAt: new Date().toISOString() };
        fs.writeFileSync(GOODBYE_FILE, JSON.stringify(data, null, 2));
        return true;
    } catch {
        return false;
    }
}

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

export async function sendGoodbyeMessage(sock, groupId, participants) {
    try {
        const settings = await getGoodbyeSettings(groupId);
        if (!settings.enabled) return;
        
        const now = moment().tz('Africa/Dar_es_Salaam');
        const time = now.format('HH:mm:ss');
        const date = now.format('DD/MM/YYYY');
        
        let groupName = 'Group';
        try {
            const metadata = await sock.groupMetadata(groupId);
            groupName = metadata.subject || 'Group';
        } catch (e) {}
        
        for (const participant of participants) {
            const participantId = typeof participant === 'string' ? participant : participant.id;
            const participantNumber = participantId.split('@')[0];
            
            let participantName = participantNumber;
            try {
                const contact = await sock.onWhatsApp(participantId);
                if (contact && contact[0] && contact[0].name) {
                    participantName = contact[0].name;
                }
            } catch (e) {}
            
            const goodbyeMsg = `╭━━━━╮
┃            👋 GOODBYE 👋              
╰━━━━━━━━╯

👋 Goodbye @${participantName} from ${groupName} Group!

━━━━━━━━━━━━
©️ MDINYANE WITH CONDOM
━━━━━━━━━━━━`;
            
            await sendMessage(sock, groupId, goodbyeMsg, [participantId]);
        }
    } catch (error) {
        console.error('[GOODBYE] Error:', error);
    }
}

export default {
    name: 'goodbye',
    description: 'Enable or disable goodbye messages',
    icon: '👋',
    alias: ['goodbyemsg', 'farewell'],
    category: 'group',
    groupOnly: true,
    
    async execute(sock, msg, args, currentPrefix, { isOwner, jidManager }) {
        const chatId = msg.key.remoteJid;
        const senderId = msg.key.participant || chatId;
        
        const groupCheck = await isGroup(chatId);
        if (!groupCheck.isGroup) {
            await sendMessage(sock, chatId, `❌ This command only works in groups!`, [], msg);
            return;
        }
        
        const ownerCheck = await isOwner(senderId, jidManager);
        const adminCheck = await isAdmin(sock, chatId, senderId);
        const isAuthorized = ownerCheck.isOwner || adminCheck.isSenderAdmin;
        
        if (!isAuthorized) {
            await sendMessage(sock, chatId, `❌ Only admins can use this command!`, [senderId], msg);
            return;
        }
        
        const action = args[0]?.toLowerCase();
        const settings = await getGoodbyeSettings(chatId);
        
        if (!action || action === 'status') {
            await sendMessage(sock, chatId, `╭──❍「 👋 GOODBYE 」❍
├ 📝 Status: ${settings.enabled ? '✅ ENABLED' : '❌ DISABLED'}
├ 📝 Message: ${settings.message || '👋 Goodbye {name} from {group} Group!'}
╰─┬────❍
╭─┴─❍「 📋 COMMANDS 」❍
│ 🔧 ${currentPrefix}goodbye on - Enable
│ 🔧 ${currentPrefix}goodbye off - Disable
│ 🔧 ${currentPrefix}goodbye set <message> - Custom message
│ 🔧 ${currentPrefix}goodbye reset - Reset default
│ 🔧 ${currentPrefix}goodbye status - Show settings
╰──────❍
✨ Variables: {name}, {group}, {time}, {date}
▰▰▰ ©️ MDINYANE WITH CONDOM ▰▰▰`, [], msg);
            return;
        }
        
        if (action === 'on') {
            await setGoodbyeSettings(chatId, true, settings.message);
            await sendMessage(sock, chatId, `✅ Goodbye messages ENABLED`, [], msg);
            return;
        }
        
        if (action === 'off') {
            await setGoodbyeSettings(chatId, false, settings.message);
            await sendMessage(sock, chatId, `❌ Goodbye messages DISABLED`, [], msg);
            return;
        }
        
        if (action === 'set') {
            const newMessage = args.slice(1).join(' ');
            if (!newMessage) {
                await sendMessage(sock, chatId, `❌ Usage: ${currentPrefix}goodbye set Goodbye {name}!`, [], msg);
                return;
            }
            await setGoodbyeSettings(chatId, settings.enabled, newMessage);
            await sendMessage(sock, chatId, `✅ Goodbye message updated!`, [], msg);
            return;
        }
        
        if (action === 'reset') {
            await setGoodbyeSettings(chatId, settings.enabled, null);
            await sendMessage(sock, chatId, `✅ Reset to default goodbye message`, [], msg);
            return;
        }
        
        await sendMessage(sock, chatId, `❌ Invalid: ${action}\n📝 Use ${currentPrefix}goodbye for help`, [], msg);
    }
};