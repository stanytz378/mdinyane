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
    "Get your bot deployed today! 🚀",
    "24/7 hosting available! 💎",
    "Professional deployment service! 👑"
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
    name: 'deploy',
    description: 'Bot deployment services',
    icon: '🚀',
    alias: ['deployment', 'host', 'hosting'],
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
        
        const infoMsg = `╭──❍「 *🚀 ${botName.toUpperCase()} DEPLOYMENT* 」❍
├ 📌 *Version* : v${botVersion}
├ 👨‍💻 *Developer* : STANY TZ
├ 📅 *Date* : ${date}
├ 📆 *Day* : ${day}
├ ⏰ *Time* : ${time} EAT
╰─┬────❍
╭─┴─❍「 *✨ WHAT WE DO* 」❍
├ 🔹 Full Bot Deployment
├ 🔹 24/7 Hosting Setup
├ 🔹 Panel Configuration
├ 🔹 Bot Installation
├ 🔹 Error Fixing
├ 🔹 Lifetime Support
╰─┬────❍
╭─┴─❍「 *💎 DEPLOYMENT PLAN* 」❍
│
│  📌 *STANDARD DEPLOYMENT*
│     • Full Bot Setup
│     • 24/7 Uptime
│     • Panel Included
│     • 1 Month Validity
│     • Free Support
│
│     💰 *PRICE* : TZS 5,000
│     💰 *KES* : 200
│     💰 *USD* : $2.00
│
╰──────❍
╭─┴─❍「 *💳 PAYMENT METHODS* 」❍
│  ✅ M-Pesa
│  ✅ Halopesa
│  ✅ Cryptocurrency (USDT, BTC)
╰──────❍
╭─┴─❍「 *📞 CONTACT* 」❍
│  💬 *WhatsApp* : +255787069580
│  📝 *DM to order your deployment!*
╰──────❍

✨ *"${randomQuote}"* ✨

_📌 Get your bot deployed and running 24/7!_
▰▰▰ *©️ ${botName.toUpperCase()} BY STANY TZ* ▰▰▰`;
        
        await sendStyledMessage(sock, chatId, infoMsg, [], msg);
    }
};