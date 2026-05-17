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
const GOODBYE_FILE = path.join(DATA_DIR, 'goodbye_settings.json');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(GOODBYE_FILE)) fs.writeFileSync(GOODBYE_FILE, JSON.stringify({}, null, 2));

async function getGoodbyeSettings(chatId) {
    try {
        const data = JSON.parse(fs.readFileSync(GOODBYE_FILE, 'utf8'));
        return data[chatId] || { enabled: false, message: null };
    } catch {
        return { enabled: false, message: null };
    }
}

async function setGoodbyeSettings(chatId, enabled, message) {
    try {
        const data = JSON.parse(fs.readFileSync(GOODBYE_FILE, 'utf8'));
        data[chatId] = { enabled, message, updatedAt: new Date().toISOString() };
        fs.writeFileSync(GOODBYE_FILE, JSON.stringify(data, null, 2));
        return true;
    } catch {
        return false;
    }
}

async function sendForwardedMessage(sock, chatId, text, mentions = [], quoted = null) {
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
    name: 'goodbye',
    description: 'Manage goodbye messages for leaving members',
    icon: '👋',
    alias: ['goodbyemsg', 'farewell', 'bye'],
    category: 'group',
    groupOnly: true,
    
    async execute(sock, msg, args, currentPrefix, { isOwner, jidManager }) {
        const chatId = msg.key.remoteJid;
        const senderId = msg.key.participant || chatId;
        
        const groupCheck = isGroup(chatId);
        if (!groupCheck.isGroup) {
            await sendForwardedMessage(sock, chatId, `╭──❍「 *👋 GOODBYE* 」❍\n├ ❌ This command only works in groups!\n╰──────❍`, [], msg);
            return;
        }
        
        const ownerCheck = await isOwner(senderId, jidManager);
        const adminCheck = await isAdmin(sock, chatId, senderId);
        const isAuthorized = ownerCheck.isOwner || adminCheck.isSenderAdmin;
        
        if (!isAuthorized) {
            await sendForwardedMessage(sock, chatId, `╭──❍「 *👋 GOODBYE* 」❍\n├ ❌ Only admins can use this command!\n╰──────❍`, [senderId], msg);
            return;
        }
        
        const action = args[0]?.toLowerCase();
        const settings = await getGoodbyeSettings(chatId);
        const now = moment().tz('Africa/Dar_es_Salaam');
        
        if (!action || action === 'status') {
            const statusIcon = settings.enabled ? '✅' : '❌';
            const msgText = `╭──❍「 *👋 GOODBYE SETTINGS* 」❍
├ 📝 Status: ${statusIcon} ${settings.enabled ? 'ENABLED' : 'DISABLED'}
├ 📝 Message: ${settings.message || 'Default goodbye message'}
╰─┬────❍
╭─┴─❍「 *📋 COMMANDS* 」❍
│ 🔧 ${currentPrefix}goodbye on - Enable goodbye
│ 🔧 ${currentPrefix}goodbye off - Disable goodbye
│ 🔧 ${currentPrefix}goodbye set <message> - Set custom message
│ 🔧 ${currentPrefix}goodbye reset - Reset to default
│ 🔧 ${currentPrefix}goodbye status - Show settings
╰──────❍
✨ *"{name} will be replaced with member name*"
▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`;
            await sendForwardedMessage(sock, chatId, msgText, [], msg);
            return;
        }
        
        if (action === 'on') {
            await setGoodbyeSettings(chatId, true, settings.message);
            await sendForwardedMessage(sock, chatId, `╭──❍「 *👋 GOODBYE* 」❍\n├ ✅ Goodbye messages ENABLED\n╰──────❍`, [], msg);
            return;
        }
        
        if (action === 'off') {
            await setGoodbyeSettings(chatId, false, settings.message);
            await sendForwardedMessage(sock, chatId, `╭──❍「 *👋 GOODBYE* 」❍\n├ ❌ Goodbye messages DISABLED\n╰──────❍`, [], msg);
            return;
        }
        
        if (action === 'set') {
            const newMessage = args.slice(1).join(' ');
            if (!newMessage) {
                await sendForwardedMessage(sock, chatId, `╭──❍「 *👋 GOODBYE* 」❍\n├ ❌ Please provide a message\n├ 📝 Usage: ${currentPrefix}goodbye set Goodbye {name}!\n╰──────❍`, [], msg);
                return;
            }
            await setGoodbyeSettings(chatId, settings.enabled, newMessage);
            await sendForwardedMessage(sock, chatId, `╭──❍「 *👋 GOODBYE* 」❍\n├ ✅ Goodbye message updated!\n├ 📝 New: ${newMessage.substring(0, 50)}...\n╰──────❍`, [], msg);
            return;
        }
        
        if (action === 'reset') {
            await setGoodbyeSettings(chatId, settings.enabled, null);
            await sendForwardedMessage(sock, chatId, `╭──❍「 *👋 GOODBYE* 」❍\n├ ✅ Reset to default goodbye message\n╰──────❍`, [], msg);
            return;
        }
        
        await sendForwardedMessage(sock, chatId, `╭──❍「 *👋 GOODBYE* 」❍\n├ ❌ Invalid command: ${action}\n├ 📝 Use ${currentPrefix}goodbye for help\n╰──────❍`, [], msg);
    }
};

export { getGoodbyeSettings, setGoodbyeSettings };