/*****************************************************************************
 *                     Developed By STANY TZ                                 *
 *****************************************************************************/

import fs from 'fs';
import path from 'path';
import moment from 'moment-timezone';
import { channelInfo, botImagePath } from '../../stanytz/messageConfig.js';

const QUOTES = [
    "I'm not lazy, I'm just on my energy saving mode.",
    "Life is short, smile while you still have teeth.",
    "Premium WhatsApp Bot! 🤖",
    "24/7 hosting available! 🚀",
    "Get your own bot today! 💎"
];

const getRandomQuote = () => QUOTES[Math.floor(Math.random() * QUOTES.length)];

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

export default {
    name: 'repo',
    description: 'Bot information and panel hosting',
    icon: '📋',
    alias: ['info', 'about', 'bot', 'panel', 'hosting'],
    category: 'general',
    
    async execute(sock, msg, args, currentPrefix, { BOT_NAME, VERSION }) {
        const chatId = msg.key.remoteJid;
        const randomQuote = getRandomQuote();
        const botName = BOT_NAME || 'MDINYANE';
        const botVersion = VERSION || '2.0.0';
        
        const now = moment().tz('Africa/Dar_es_Salaam');
        const date = now.format('DD/MM/YYYY');
        const day = now.format('dddd');
        const time = now.format('HH:mm:ss');
        
        const repoUrl = 'https://github.com/stanytz378/mdinyane';
        
        const infoMsg = `╭──❍「 *🤖 ${botName.toUpperCase()} BOT* 」❍
├ 📌 *Version* : v${botVersion}
├ 👨‍💻 *Developer* : STANY TZ
├ 🔗 *Repo* : ${repoUrl}
├ 📅 *Date* : ${date}
├ 📆 *Day* : ${day}
├ ⏰ *Time* : ${time} EAT
╰─┬────❍
╭─┴─❍「 *✨ FEATURES* 」❍
├ 🔗 Anti-Link
├ 🚫 Anti-Badword
├ 🏷️ Anti-Tag
├ 🛡️ Anti-Spam
├ 📵 Anti-Call
├ 👁️ Auto Status
├ ⌨️ Auto Typing
├ 🎙️ Auto Recording
├ 👀 Auto Read
├ 🟢 Always Online
├ 🎵 Music Downloader
├ 📱 Social Media Downloader
├ 🤖 AI Chatbot
└ 📊 +50 more commands
╰─┬────❍
╭─┴─❍「 *💎 PANEL HOSTING (1 MONTH)* 」❍
│
│ 📌 *BASIC PANEL*
│    • 512MB RAM | 2GB Storage
│    💰 TZS 1,000  |  KES 40  |  USD 0.40
│
│ 📌 *STANDARD PANEL*
│    • 1GB RAM | 5GB Storage
│    💰 TZS 1,500  |  KES 60  |  USD 0.60
│
│ 📌 *PREMIUM PANEL*
│    • 2GB RAM | 10GB Storage
│    💰 TZS 2,500  |  KES 100 |  USD 1.00
│
│ 📌 *UNLIMITED PANEL*
│    • Unlimited RAM & Storage
│    💰 TZS 4,000  |  KES 160 |  USD 1.60
│
│ 📌 *ADMIN PANEL*
│    • Full Control | Multi-User
│    💰 TZS 10,000 |  KES 400 |  USD 4.00
│
╰──────❍
╭─┴─❍「 *💳 PAYMENT METHODS* 」❍
│ ✅ M-Pesa
│ ✅ Halopesa
│ ✅ Cryptocurrency (USDT, BTC)
╰──────❍
╭─┴─❍「 *📞 CONTACT* 」❍
│ 💬 *WhatsApp* : +255787069580
│ 📝 *DM for orders & inquiries*
╰──────❍

✨ *"${randomQuote}"* ✨

_📌 Valid for 1 month only!_
▰▰▰ *©️ ${botName.toUpperCase()} BY STANY TZ* ▰▰▰`;
        
        await sendStyledMessage(sock, chatId, infoMsg, [], msg);
    }
};