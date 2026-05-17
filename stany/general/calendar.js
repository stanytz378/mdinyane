import moment from 'moment-timezone';
import { channelInfo } from '../../stanytz/messageConfig.js';

export default {
    name: 'calendar',
    description: 'Show current calendar',
    icon: '📅',
    alias: ['cal', 'month'],
    category: 'general',
    
    async execute(sock, msg, args, currentPrefix) {
        const chatId = msg.key.remoteJid;
        
        const now = moment().tz('Africa/Dar_es_Salaam');
        const year = args[0] ? parseInt(args[0]) : now.year();
        const month = args[1] ? parseInt(args[1]) - 1 : now.month();
        
        const date = moment().tz('Africa/Dar_es_Salaam').year(year).month(month);
        const daysInMonth = date.daysInMonth();
        const firstDay = date.startOf('month').day();
        
        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
        
        let calendar = `╭──❍「 *📅 ${monthNames[month]} ${year}* 」❍\n`;
        calendar += `│ Su Mo Tu We Th Fr Sa\n`;
        calendar += `├${'─'.repeat(20)}┤\n│`;
        
        let dayCount = 1;
        for (let i = 0; i < 6; i++) {
            let weekLine = '';
            for (let j = 0; j < 7; j++) {
                if (i === 0 && j < firstDay) {
                    weekLine += '   ';
                } else if (dayCount > daysInMonth) {
                    weekLine += '   ';
                } else {
                    weekLine += `${dayCount.toString().padStart(2, ' ')} `;
                    dayCount++;
                }
            }
            if (weekLine.trim()) calendar += `${weekLine}\n│`;
        }
        calendar += `\n╰──────❍\n▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`;
        
        await sock.sendMessage(chatId, {
            text: calendar,
            contextInfo: channelInfo.contextInfo
        }, { quoted: msg });
    }
};