import moment from 'moment-timezone';
import { channelInfo } from '../../stanytz/messageConfig.js';

export default {
    name: 'age',
    description: 'Calculate age from birthdate',
    icon: '🎂',
    alias: ['birthday', 'howold'],
    category: 'general',
    
    async execute(sock, msg, args, currentPrefix) {
        const chatId = msg.key.remoteJid;
        
        if (args.length < 1) {
            await sock.sendMessage(chatId, {
                text: `╭──❍「 *🎂 AGE CALCULATOR* 」❍
├ 📝 Usage: ${currentPrefix}age <DD/MM/YYYY>
├ 📝 Example: ${currentPrefix}age 15/05/1990
├ 📝 Format: Day/Month/Year
╰──────❍`,
                contextInfo: channelInfo.contextInfo
            }, { quoted: msg });
            return;
        }
        
        const dateParts = args[0].split('/');
        if (dateParts.length !== 3) {
            await sock.sendMessage(chatId, {
                text: `╭──❍「 *🎂 AGE* 」❍
├ ❌ Invalid date format
├ 📝 Use DD/MM/YYYY
╰──────❍`,
                contextInfo: channelInfo.contextInfo
            }, { quoted: msg });
            return;
        }
        
        const day = parseInt(dateParts[0]);
        const month = parseInt(dateParts[1]) - 1;
        const year = parseInt(dateParts[2]);
        
        const birthDate = new Date(year, month, day);
        const today = new Date();
        
        let age = today.getFullYear() - birthDate.getFullYear();
        const m = today.getMonth() - birthDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }
        
        const nextBirthday = new Date(today.getFullYear(), month, day);
        if (nextBirthday < today) {
            nextBirthday.setFullYear(today.getFullYear() + 1);
        }
        const daysUntil = Math.ceil((nextBirthday - today) / (1000 * 60 * 60 * 24));
        
        await sock.sendMessage(chatId, {
            text: `╭──❍「 *🎂 AGE CALCULATOR* 」❍
├ 📅 *Birthdate* : ${args[0]}
├ 🎂 *Age* : ${age} years old
├ 📊 *Days until birthday* : ${daysUntil} days
╰──────❍
▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`,
            contextInfo: channelInfo.contextInfo
        }, { quoted: msg });
    }
};