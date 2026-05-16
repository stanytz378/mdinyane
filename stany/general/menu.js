import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import moment from 'moment-timezone';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const STANY_DIR = path.join(__dirname, '..');

export default {
    name: 'menu',
    description: 'Display main menu with all bot commands',
    icon: '📋',
    alias: ['help', 'commands', 'listmenu', 'allmenu', 'h'],
    category: 'general',
    
    async execute(sock, msg, args, currentPrefix, { BOT_NAME, VERSION, isOwner, getCurrentPrefix, isPrefixless }) {
        
        const chatId = msg.key.remoteJid;
        const sender = msg.key.participant || chatId;
        const isOwnerUser = isOwner(msg);
        
        const now = moment().tz('Africa/Dar_es_Salaam');
        const day = now.format('dddd');
        const date = now.format('DD/MM/YYYY');
        const time = now.format('HH:mm:ss');
        
        let greeting;
        if (time < '05:00:00') greeting = 'Good Early Morning 🌉';
        else if (time < '11:00:00') greeting = 'Good Morning 🌄';
        else if (time < '15:00:00') greeting = 'Good Afternoon 🏙️';
        else if (time < '18:00:00') greeting = 'Good Evening 🌅';
        else if (time < '19:00:00') greeting = 'Good Evening 🌃';
        else greeting = 'Good Night 🌌';
        
        const quotes = [
            "I'm not lazy, I'm just on my energy saving mode.",
            "Life is short, smile while you still have teeth.",
            "The early bird can have the worm because worms are gross and mornings are stupid.",
            "If life gives you lemons, make lemonade. Then find someone whose life has given them vodka and have a party!"
        ];
        
        const randomQuote = quotes[Math.floor(Math.random() * quotes.length)];
        
        const prefixDisplay = isPrefixless ? '' : currentPrefix;
        const botName = BOT_NAME || 'MDINYANE';
        
        let menu = `╭──❍「 *TOP MENU* 」❍\n`;
        menu += `│📋 ${prefixDisplay}menu\n`;
        menu += `│🏓 ${prefixDisplay}ping\n`;
        menu += `│👑 ${prefixDisplay}owner\n`;
        menu += `╰─┬────❍\n`;
        
        menu += `╭─┴─❍「 *USER INFO* 」❍\n`;
        menu += `├ 👤 *Name* : ${msg.pushName || 'No Name'}\n`;
        menu += `├ 👑 *User* : ${isOwnerUser ? 'OWNER' : 'USER'}\n`;
        menu += `╰─┬────❍\n`;
        
        menu += `╭─┴─❍「 *BOT INFO* 」❍\n`;
        menu += `├ 🤖 *App* : ${botName}\n`;
        menu += `├ 📌 *Version* : ${VERSION}\n`;
        menu += `├ 👨‍💻 *Owner* : STANY TZ\n`;
        menu += `├ 🌍 *Mode* : Public\n`;
        menu += `├ 🔧 *Prefix* : ${isPrefixless ? 'None' : prefixDisplay}\n`;
        menu += `╰─┬────❍\n`;
        
        menu += `╭─┴─❍「 *GENERAL COMMANDS* 」❍\n`;
        menu += `│ 📋 ${prefixDisplay}menu - Show menu\n`;
        menu += `│ 🏓 ${prefixDisplay}ping - Check bot\n`;
        menu += `│ 👑 ${prefixDisplay}owner - Owner info\n`;
        menu += `╰──────❍\n`;
        
        menu += `╭─┴─❍「 *ABOUT* 」❍\n`;
        menu += `├ 📅 *Date* : ${date}\n`;
        menu += `├ 📆 *Day* : ${day}\n`;
        menu += `├ ⏰ *Time* : ${time} EAT\n`;
        menu += `╰──────❍\n\n`;
        
        menu += `✨ *"${randomQuote}"* ✨\n\n`;
        menu += `▰▰▰ *© ${botName.toUpperCase()} BY STANY TZ* ▰▰▰\n\n`;
        menu += `_📌 Use ${prefixDisplay}help <command> for detailed info_\n`;
        menu += `_🎯 YouTube: @STANYTZ | GitHub: Stanytz378_`;
        
        await sock.sendMessage(chatId, {
            text: menu,
            mentions: [sender]
        }, { quoted: msg });
    }
};