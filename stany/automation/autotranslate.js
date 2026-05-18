/*****************************************************************************
 *                     Developed By STANY TZ                                 *
 *****************************************************************************/

import fs from 'fs';
import path from 'path';
import moment from 'moment-timezone';
import axios from 'axios';
import { channelInfo } from '../../stanytz/messageConfig.js';
import isOwner from '../../stanymain/isOwner.js';

const DATA_DIR = path.join(process.cwd(), 'stanydata');
const AUTO_TRANSLATE_FILE = path.join(DATA_DIR, 'autotranslate.json');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(AUTO_TRANSLATE_FILE)) {
    fs.writeFileSync(AUTO_TRANSLATE_FILE, JSON.stringify({ enabled: false, targetLang: 'en' }, null, 2));
}

async function sendForwardedMessage(sock, chatId, text, mentions = [], quoted = null) {
    try {
        await sock.sendMessage(chatId, { text: text, contextInfo: channelInfo.contextInfo, mentions: mentions }, { quoted: quoted });
    } catch (error) {
        await sock.sendMessage(chatId, { text: text, mentions: mentions }, { quoted: quoted });
    }
}

async function readConfig() {
    try { return JSON.parse(fs.readFileSync(AUTO_TRANSLATE_FILE, 'utf8')); } catch { return { enabled: false, targetLang: 'en' }; }
}

async function writeConfig(config) { try { fs.writeFileSync(AUTO_TRANSLATE_FILE, JSON.stringify(config, null, 2)); return true; } catch { return false; } }

export async function handleAutoTranslate(sock, message) {
    try {
        const config = await readConfig();
        if (!config.enabled) return;
        const text = message.message?.conversation || message.message?.extendedTextMessage?.text || '';
        if (!text) return;
        const response = await axios.get(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${config.targetLang}&dt=t&q=${encodeURIComponent(text)}`);
        const translated = response.data[0][0][0];
        if (translated && translated !== text) {
            await sock.sendMessage(message.key.remoteJid, {
                text: `🌐 Translated: ${translated}`,
                contextInfo: channelInfo.contextInfo
            });
        }
    } catch (error) {}
}

export default {
    name: 'autotranslate',
    description: 'Auto translate messages',
    icon: '🌐',
    alias: ['atranslate'],
    category: 'automation',
    ownerOnly: true,
    
    async execute(sock, msg, args, currentPrefix, { isOwner, jidManager }) {
        const chatId = msg.key.remoteJid;
        const senderId = msg.key.participant || chatId;
        
        const ownerCheck = await isOwner(senderId, jidManager);
        if (!ownerCheck.isOwner) {
            await sendForwardedMessage(sock, chatId, `╭──❍「 *🌐 AUTO TRANSLATE* 」❍\n├ ❌ Owner only command!\n╰──────❍`, [senderId], msg);
            return;
        }
        
        const config = await readConfig();
        const action = args[0]?.toLowerCase();
        const now = moment().tz('Africa/Dar_es_Salaam');
        
        if (!action || action === 'status') {
            await sendForwardedMessage(sock, chatId, `╭──❍「 *🌐 AUTO TRANSLATE* 」❍
├ 📝 *Status* : ${config.enabled ? '✅ ENABLED' : '❌ DISABLED'}
├ 🌍 *Target Lang* : ${config.targetLang}
├ 📅 *Date* : ${now.format('DD/MM/YYYY')}
├ ⏰ *Time* : ${now.format('HH:mm:ss')} EAT
╰─┬────❍
╭─┴─❍「 *📋 COMMANDS* 」❍
│ 🔧 ${currentPrefix}autotranslate on - Enable
│ 🔧 ${currentPrefix}autotranslate off - Disable
│ 🔧 ${currentPrefix}autotranslate set <lang> - Set language (en, sw, fr)
╰──────❍`, [], msg);
            return;
        }
        
        if (action === 'on') { config.enabled = true; await writeConfig(config); await sendForwardedMessage(sock, chatId, `╭──❍「 *🌐 AUTO TRANSLATE* 」❍\n├ ✅ ENABLED\n╰──────❍`, [], msg); }
        else if (action === 'off') { config.enabled = false; await writeConfig(config); await sendForwardedMessage(sock, chatId, `╭──❍「 *🌐 AUTO TRANSLATE* 」❍\n├ ❌ DISABLED\n╰──────❍`, [], msg); }
        else if (action === 'set') {
            const lang = args[1];
            if (!lang) { await sendForwardedMessage(sock, chatId, `╭──❍「 *🌐 AUTO TRANSLATE* 」❍\n├ ❌ Usage: ${currentPrefix}autotranslate set en\n╰──────❍`, [], msg); return; }
            config.targetLang = lang;
            await writeConfig(config);
            await sendForwardedMessage(sock, chatId, `╭──❍「 *🌐 AUTO TRANSLATE* 」❍\n├ ✅ Language set to: ${lang}\n╰──────❍`, [], msg);
        }
    }
};