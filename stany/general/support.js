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
    "We're here to help! 💬",
    "Customer satisfaction is our priority! ⭐",
    "24/7 support available! 🚀"
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
    name: 'support',
    description: 'Customer support and inquiries',
    icon: '💬',
    alias: ['help', 'contact', 'support'],
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
        
        const infoMsg = `╭──❍「 *💬 ${botName.toUpperCase()} SUPPORT* 」❍
├ 📌 *Version* : v${botVersion}
├ 👨‍💻 *Developer* : STANY TZ
├ 📅 *Date* : ${date}
├ 📆 *Day* : ${day}
├ ⏰ *Time* : ${time} EAT
╰─┬────❍
╭─┴─❍「 *✨ SUPPORT SERVICES* 」❍
├ 🔹 Bot Installation Help
├ 🔹 Deployment Assistance
├ 🔹 Error Troubleshooting
├ 🔹 Feature Requests
├ 🔹 Payment Inquiries
├ 🔹 General Questions
╰─┬────❍
╭─┴─❍「 *📞 CONTACT INFORMATION* 」❍
│
│  💬 *WhatsApp* : +255787069580
│  📧 *DM* : Direct Message
│  ⏰ *Response Time* : Within 24 hours
│
╰──────❍
╭─┴─❍「 *💳 PAYMENT SUPPORT* 」❍
│  ✅ M-Pesa
│  ✅ Halopesa
│  ✅ Cryptocurrency (USDT, BTC)
╰──────❍
╭─┴─❍「 *📝 HOW TO REACH US* 」❍
│
│  1️⃣ Save the contact number
│  2️⃣ Send a message explaining your issue
│  3️⃣ Include order details (if any)
│  4️⃣ Wait for response
│
╰──────❍

✨ *"${randomQuote}"* ✨

_📌 We're here to help you 24/7!_
▰▰▰ *©️ ${botName.toUpperCase()} BY STANY TZ* ▰▰▰`;
        
        await sendStyledMessage(sock, chatId, infoMsg, [], msg);
    }
};