/*****************************************************************************
 *                                                                           *
 *                     Developed By STANY TZ                                 *
 *                                                                           *
 *  🌐  GitHub   : https://github.com/Stanytz378                             *
 *  ▶️  YouTube  : https://youtube.com/@STANYTZ                              *
 *  💬  WhatsApp : https://whatsapp.com/channel/0029Vb7fzu4EwEjmsD4Tzs1p     *
 *                                                                           *
 *    © 2026 STANY TZ. All rights reserved.                                 *
 *                                                                           *
 *****************************************************************************/

import os from 'os';
import process from 'process';
import fs from 'fs';
import path from 'path';
import moment from 'moment-timezone';
import { channelInfo, botImagePath } from '../../stanytz/messageConfig.js';

// ============================================================
// QUOTES
// ============================================================
const QUOTES = [
    "I'm not lazy, I'm just on my energy saving mode.",
    "Life is short, smile while you still have teeth.",
    "I may be a bad influence, but darn I am fun!",
    "I'm on a whiskey diet. I've lost three days already.",
    "The only way to do great work is to love what you do. - Steve Jobs",
    "Success is not final, failure is not fatal. - Winston Churchill",
    "Your time is limited, don't waste it living someone else's life. - Steve Jobs",
    "Believe you can and you're halfway there. - Theodore Roosevelt",
    "Don't watch the clock; do what it does. Keep going. - Sam Levenson",
    "The best way to predict the future is to create it.",
    "Wake up with determination. Go to bed with satisfaction.",
    "Small steps every day lead to big results.",
    "Be stronger than your excuses.",
    "Your only limit is your mind.",
    "Progress, not perfection.",
    "Fall seven times, stand up eight."
];

const getRandomQuote = () => QUOTES[Math.floor(Math.random() * QUOTES.length)];

// ============================================================
// SEND WITH IMAGE AND FORWARDED MARK
// ============================================================

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

// ============================================================
// MAIN COMMAND
// ============================================================

export default {
    name: 'alive',
    description: 'Check bot status and system information',
    icon: '🟢',
    alias: ['status', 'bot', 'ping', 'runtime'],
    category: 'general',
    
    async execute(sock, msg, args, currentPrefix, { BOT_NAME, VERSION }) {
        
        const chatId = msg.key.remoteJid;
        const sender = msg.key.participant || chatId;
        const randomQuote = getRandomQuote();
        
        // Get current time (East Africa Time)
        const now = moment().tz('Africa/Dar_es_Salaam');
        const date = now.format('DD/MM/YYYY');
        const day = now.format('dddd');
        const time = now.format('HH:mm:ss');
        
        // Calculate uptime
        let uptime = Math.floor(process.uptime());
        const days = Math.floor(uptime / 86400);
        uptime %= 86400;
        const hours = Math.floor(uptime / 3600);
        uptime %= 3600;
        const minutes = Math.floor(uptime / 60);
        const seconds = uptime % 60;
        
        const uptimeParts = [];
        if (days > 0) uptimeParts.push(`${days}d`);
        if (hours > 0) uptimeParts.push(`${hours}h`);
        if (minutes > 0) uptimeParts.push(`${minutes}m`);
        if (seconds > 0 || uptimeParts.length === 0) uptimeParts.push(`${seconds}s`);
        const uptimeText = uptimeParts.join(' ');
        
        // Memory info
        const totalMem = (os.totalmem() / 1024 / 1024).toFixed(0);
        const freeMem = (os.freemem() / 1024 / 1024).toFixed(0);
        const usedMem = (Number(totalMem) - Number(freeMem)).toFixed(0);
        const memPercent = ((usedMem / totalMem) * 100).toFixed(1);
        
        // System info
        const cpuLoad = os.loadavg()[0].toFixed(2);
        const platform = os.platform();
        const arch = os.arch();
        const nodeVersion = process.version;
        const cpus = os.cpus().length;
        
        // Platform name
        let platformName = platform;
        if (process.env.DYNO) platformName = 'Heroku';
        else if (process.env.RENDER) platformName = 'Render';
        else if (process.env.RAILWAY_ENVIRONMENT) platformName = 'Railway';
        else if (process.env.PANEL) platformName = 'Panel';
        else platformName = platform === 'linux' ? 'Linux' : platform;
        
        // RAM Bar
        const ramPercent = (usedMem / totalMem) * 100;
        const barLength = 10;
        const filledBars = Math.round((ramPercent / 100) * barLength);
        const emptyBars = barLength - filledBars;
        const ramBar = '█'.repeat(filledBars) + '░'.repeat(emptyBars);
        
        // Bot name
        const botName = BOT_NAME || 'MDINYANE';
        const botVersion = VERSION || '1.0.0';
        
        // ============================================================
        // BUILD STATUS MESSAGE (kama menu.js style)
        // ============================================================
        const statusMsg = `╭──❍「 *🟢 BOT STATUS* 」❍
├ 🤖 *Bot* : ${botName} v${botVersion}
├ 🟢 *Status* : ● ONLINE
├ 📡 *Mode* : Public
╰─┬────❍
╭─┴─❍「 *⚡ SYSTEM INFO* 」❍
├ ⏱️ *Uptime* : ${uptimeText}
├ 🧠 *RAM* : ${usedMem}MB / ${totalMem}MB
├ 📊 *RAM Bar* : [${ramBar}] ${memPercent}%
├ 💻 *CPU Load* : ${cpuLoad}% (${cpus} cores)
╰─┬────❍
╭─┴─❍「 *💻 PLATFORM* 」❍
├ 🖥️ *OS* : ${platformName} (${arch})
├ ⚡ *Node.js* : ${nodeVersion}
╰─┬────❍
╭─┴─❍「 *📅 DATE & TIME* 」❍
├ 📅 *Date* : ${date}
├ 📆 *Day* : ${day}
├ ⏰ *Time* : ${time} EAT
╰──────❍

✨ *"${randomQuote}"* ✨

_📌 Bot is 24/7 Active | Type ${currentPrefix}menu for commands_
▰▰▰ *©️ ${botName.toUpperCase()} BY STANY TZ* ▰▰▰`;
        
        // Send message with image and forwarded mark
        await sendStyledMessage(sock, chatId, statusMsg, [], msg);
    }
};
