import moment from 'moment-timezone';
import { channelInfo } from '../../stanytz/messageConfig.js';

export default {
    name: 'donate',
    description: 'Support bot development via donation',
    icon: '💝',
    alias: ['support', 'contribute', 'fund', 'sponsor'],
    category: 'general',
    
    async execute(sock, msg, args, currentPrefix, { BOT_NAME }) {
        const chatId = msg.key.remoteJid;
        const sender = msg.key.participant || chatId;
        
        const now = moment().tz('Africa/Dar_es_Salaam');
        const date = now.format('DD/MM/YYYY');
        const time = now.format('HH:mm:ss');
        
        const botName = BOT_NAME || 'MDINYANE';
        
        const donateMsg = `╭──❍「 *💝 SUPPORT ${botName.toUpperCase()}* 」❍
├ 🤖 *Bot* : ${botName}
├ 🌍 *Region* : Tanzania, East Africa
├ 📅 *Date* : ${date}
├ ⏰ *Time* : ${time} EAT
╰─┬────❍
╭─┴─❍「 *💰 DONATION METHODS* 」❍
│
│  🔹 *M-Pesa (Tanzania)*
│     📞 *Number* : +255787069580
│     👤 *Name* : MASANYIWA STANLEY
│
│  🔹 *Halopesa (Tanzania)*
│     📞 *Number* : +255618558502
│     👤 *Name* : MASANYIWA STANLEY
│
│  🔹 *Cryptocurrency*
│     💰 *USDT (TRC20)* : Request via DM
│     💰 *Bitcoin (BTC)* : Request via DM
│
╰──────❍
╭─┴─❍「 *💎 WHAT YOU GET* 」❍
│
│  💝 *Donation Benefits:*
│  • Premium status (1 month)
│  • Priority support
│  • Early access to new features
│  • Name in credits 
│
╰──────❍
╭─┴─❍「 *💳 HOW TO DONATE* 」❍
│
│  1️⃣ Send money via M-Pesa/Halopesa
│  2️⃣ Screenshot and send to me
│  3️⃣ Receive premium access
│
│  *Minimum Donation* : TZS 1,000
│
╰──────❍
╭─┴─❍「 *📞 CONTACT* 」❍
│
│  💬 *WhatsApp* : +255787069580
│  📧 *DM* : Direct Message
│
╰──────❍

✨ *"Your support keeps the bot alive! 🚀"* ✨

_📌 Every contribution helps maintain 24/7 service_
▰▰▰ *©️ ${botName.toUpperCase()} BY STANY TZ* ▰▰▰`;
        
        await sock.sendMessage(chatId, {
            text: donateMsg,
            contextInfo: channelInfo.contextInfo,
            mentions: [sender]
        }, { quoted: msg });
    }
};