/*****************************************************************************
 *                     Developed By STANY TZ                                 *
 *****************************************************************************/

import fs from 'fs';
import path from 'path';
import moment from 'moment-timezone';
import { channelInfo } from '../../stanytz/messageConfig.js';
import isOwner from '../../stanymain/isOwner.js';

const DATA_DIR = path.join(process.cwd(), 'stanydata');
const AUTO_RESPOND_FILE = path.join(DATA_DIR, 'autorespond.json');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(AUTO_RESPOND_FILE)) {
    fs.writeFileSync(AUTO_RESPOND_FILE, JSON.stringify({ enabled: false, templates: {} }, null, 2));
}

async function sendForwardedMessage(sock, chatId, text, mentions = [], quoted = null) {
    try {
        await sock.sendMessage(chatId, { text: text, contextInfo: channelInfo.contextInfo, mentions: mentions }, { quoted: quoted });
    } catch (error) {
        await sock.sendMessage(chatId, { text: text, mentions: mentions }, { quoted: quoted });
    }
}

async function readConfig() {
    try { return JSON.parse(fs.readFileSync(AUTO_RESPOND_FILE, 'utf8')); } catch { return { enabled: false, templates: {} }; }
}

async function writeConfig(config) { try { fs.writeFileSync(AUTO_RESPOND_FILE, JSON.stringify(config, null, 2)); return true; } catch { return false; } }

export async function handleAutoRespond(sock, message) {
    try {
        const config = await readConfig();
        if (!config.enabled) return;
        const text = message.message?.conversation || message.message?.extendedTextMessage?.text || '';
        if (!text) return;
        const chatId = message.key.remoteJid;
        const now = moment().tz('Africa/Dar_es_Salaam');
        const hour = now.hour();
        let greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
        for (const [trigger, response] of Object.entries(config.templates)) {
            if (text.toLowerCase().includes(trigger.toLowerCase())) {
                const finalResponse = response.replace(/{greeting}/g, greeting).replace(/{time}/g, now.format('HH:mm:ss'));
                await sock.sendMessage(chatId, { text: finalResponse, contextInfo: channelInfo.contextInfo });
                break;
            }
        }
    } catch (error) {}
}

export default {
    name: 'autorespond',
    description: 'Auto respond with templates',
    icon: '🤖',
    alias: ['arespond'],
    category: 'automation',
    ownerOnly: true,
    
    async execute(sock, msg, args, currentPrefix, { isOwner, jidManager }) {
        const chatId = msg.key.remoteJid;
        const senderId = msg.key.participant || chatId;
        
        const ownerCheck = await isOwner(senderId, jidManager);
        if (!ownerCheck.isOwner) {
            await sendForwardedMessage(sock, chatId, `╭──❍「 *🤖 AUTO RESPOND* 」❍\n├ ❌ Owner only command!\n╰──────❍`, [senderId], msg);
            return;
        }
        
        const config = await readConfig();
        const action = args[0]?.toLowerCase();
        const now = moment().tz('Africa/Dar_es_Salaam');
        
        if (!action || action === 'status') {
            let templateList = '';
            for (const [k, v] of Object.entries(config.templates)) {
                templateList += `│ 🔹 "${k}" → "${v.substring(0, 30)}..."\n`;
            }
            await sendForwardedMessage(sock, chatId, `╭──❍「 *🤖 AUTO RESPOND* 」❍
├ 📝 *Status* : ${config.enabled ? '✅ ENABLED' : '❌ DISABLED'}
├ 📋 *Templates* : ${Object.keys(config.templates).length}
${templateList}├ 📅 *Date* : ${now.format('DD/MM/YYYY')}
├ ⏰ *Time* : ${now.format('HH:mm:ss')} EAT
╰─┬────❍
╭─┴─❍「 *📋 COMMANDS* 」❍
│ 🔧 ${currentPrefix}autorespond on - Enable
│ 🔧 ${currentPrefix}autorespond off - Disable
│ 🔧 ${currentPrefix}autorespond add <trigger> <response> - Add
│ 🔧 ${currentPrefix}autorespond remove <trigger> - Remove
╰──────❍
_📌 Use {greeting}, {time} in response_`, [], msg);
            return;
        }
        
        if (action === 'on') { config.enabled = true; await writeConfig(config); await sendForwardedMessage(sock, chatId, `╭──❍「 *🤖 AUTO RESPOND* 」❍\n├ ✅ ENABLED\n╰──────❍`, [], msg); }
        else if (action === 'off') { config.enabled = false; await writeConfig(config); await sendForwardedMessage(sock, chatId, `╭──❍「 *🤖 AUTO RESPOND* 」❍\n├ ❌ DISABLED\n╰──────❍`, [], msg); }
        else if (action === 'add') {
            const trigger = args[1];
            const response = args.slice(2).join(' ');
            if (!trigger || !response) { await sendForwardedMessage(sock, chatId, `╭──❍「 *🤖 AUTO RESPOND* 」❍\n├ ❌ Usage: ${currentPrefix}autorespond add <trigger> <response>\n╰──────❍`, [], msg); return; }
            config.templates[trigger] = response;
            await writeConfig(config);
            await sendForwardedMessage(sock, chatId, `╭──❍「 *🤖 AUTO RESPOND* 」❍\n├ ✅ Added: "${trigger}" → "${response}"\n╰──────❍`, [], msg);
        }
        else if (action === 'remove') {
            const trigger = args[1];
            if (!trigger) { await sendForwardedMessage(sock, chatId, `╭──❍「 *🤖 AUTO RESPOND* 」❍\n├ ❌ Usage: ${currentPrefix}autorespond remove <trigger>\n╰──────❍`, [], msg); return; }
            if (config.templates[trigger]) delete config.templates[trigger];
            await writeConfig(config);
            await sendForwardedMessage(sock, chatId, `╭──❍「 *🤖 AUTO RESPOND* 」❍\n├ ✅ Removed: "${trigger}"\n╰──────❍`, [], msg);
        }
    }
};