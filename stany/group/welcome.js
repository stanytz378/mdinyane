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

async function getWelcomeSettings(chatId) {
    try {
        const data = JSON.parse(fs.readFileSync(WELCOME_FILE, 'utf8'));
        return data[chatId] || { enabled: false, message: null };
    } catch {
        return { enabled: false, message: null };
    }
}

async function setWelcomeSettings(chatId, enabled, message) {
    try {
        const data = JSON.parse(fs.readFileSync(WELCOME_FILE, 'utf8'));
        data[chatId] = { enabled, message, updatedAt: new Date().toISOString() };
        fs.writeFileSync(WELCOME_FILE, JSON.stringify(data, null, 2));
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
    name: 'welcome',
    description: 'Manage welcome messages for new members',
    icon: '👋',
    alias: ['welcomemsg', 'greet'],
    category: 'group',
    groupOnly: true,
    
    async execute(sock, msg, args, currentPrefix, { isOwner, jidManager }) {
        const chatId = msg.key.remoteJid;
        const senderId = msg.key.participant || chatId;
        
        const groupCheck = isGroup(chatId);
        if (!groupCheck.isGroup) {
            await sendForwardedMessage(sock, chatId, `╭──❍「 *👋 WELCOME* 」❍\n├ ❌ This command only works in groups!\n╰──────❍`, [], msg);
            return;
        }
        
        const ownerCheck = await isOwner(senderId, jidManager);
        const adminCheck = await isAdmin(sock, chatId, senderId);
        const isAuthorized = ownerCheck.isOwner || adminCheck.isSenderAdmin;
        
        if (!isAuthorized) {
            await sendForwardedMessage(sock, chatId, `╭──❍「 *👋 WELCOME* 」❍\n├ ❌ Only admins can use this command!\n╰──────❍`, [senderId], msg);
            return;
        }
        
        const action = args[0]?.toLowerCase();
        const settings = await getWelcomeSettings(chatId);
        const now = moment().tz('Africa/Dar_es_Salaam');
        
        if (!action || action === 'status') {
            const statusIcon = settings.enabled ? '✅' : '❌';
            const msgText = `╭──❍「 *👋 WELCOME SETTINGS* 」❍
├ 📝 Status: ${statusIcon} ${settings.enabled ? 'ENABLED' : 'DISABLED'}
├ 📝 Message: ${settings.message || 'Default welcome message'}
╰─┬────❍
╭─┴─❍「 *📋 COMMANDS* 」❍
│ 🔧 ${currentPrefix}welcome on - Enable welcome
│ 🔧 ${currentPrefix}welcome off - Disable welcome
│ 🔧 ${currentPrefix}welcome set <message> - Set custom message
│ 🔧 ${currentPrefix}welcome reset - Reset to default
│ 🔧 ${currentPrefix}welcome status - Show settings
╰──────❍
✨ *"{name} will be replaced with member name*"
▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`;
            await sendForwardedMessage(sock, chatId, msgText, [], msg);
            return;
        }
        
        if (action === 'on') {
            await setWelcomeSettings(chatId, true, settings.message);
            await sendForwardedMessage(sock, chatId, `╭──❍「 *👋 WELCOME* 」❍\n├ ✅ Welcome messages ENABLED\n╰──────❍`, [], msg);
            return;
        }
        
        if (action === 'off') {
            await setWelcomeSettings(chatId, false, settings.message);
            await sendForwardedMessage(sock, chatId, `╭──❍「 *👋 WELCOME* 」❍\n├ ❌ Welcome messages DISABLED\n╰──────❍`, [], msg);
            return;
        }
        
        if (action === 'set') {
            const newMessage = args.slice(1).join(' ');
            if (!newMessage) {
                await sendForwardedMessage(sock, chatId, `╭──❍「 *👋 WELCOME* 」❍\n├ ❌ Please provide a message\n├ 📝 Usage: ${currentPrefix}welcome set Welcome {name}!\n╰──────❍`, [], msg);
                return;
            }
            await setWelcomeSettings(chatId, settings.enabled, newMessage);
            await sendForwardedMessage(sock, chatId, `╭──❍「 *👋 WELCOME* 」❍\n├ ✅ Welcome message updated!\n├ 📝 New: ${newMessage.substring(0, 50)}...\n╰──────❍`, [], msg);
            return;
        }
        
        if (action === 'reset') {
            await setWelcomeSettings(chatId, settings.enabled, null);
            await sendForwardedMessage(sock, chatId, `╭──❍「 *👋 WELCOME* 」❍\n├ ✅ Reset to default welcome message\n╰──────❍`, [], msg);
            return;
        }
        
        await sendForwardedMessage(sock, chatId, `╭──❍「 *👋 WELCOME* 」❍\n├ ❌ Invalid command: ${action}\n├ 📝 Use ${currentPrefix}welcome for help\n╰──────❍`, [], msg);
    }
};

export { getWelcomeSettings, setWelcomeSettings };