import { channelInfo } from '../../stanytz/messageConfig.js';
import axios from 'axios';

export default {
    name: 'quote',
    description: 'Get inspirational quote',
    icon: '💬',
    alias: ['inspire', 'motivation'],
    category: 'general',
    
    async execute(sock, msg, args, currentPrefix) {
        const chatId = msg.key.remoteJid;
        
        const quotes = [
            "The only way to do great work is to love what you do. - Steve Jobs",
            "Life is what happens when you're busy making other plans. - John Lennon",
            "Success is not final, failure is not fatal. - Winston Churchill",
            "Believe you can and you're halfway there. - Theodore Roosevelt",
            "Don't watch the clock; do what it does. Keep going. - Sam Levenson",
            "The future belongs to those who believe in the beauty of their dreams. - Eleanor Roosevelt",
            "Everything you've ever wanted is on the other side of fear. - George Addair",
            "Your time is limited, don't waste it living someone else's life. - Steve Jobs",
            "Happiness is not by chance, but by choice. - Jim Rohn",
            "Wake up with determination. Go to bed with satisfaction."
        ];
        
        const randomQuote = quotes[Math.floor(Math.random() * quotes.length)];
        
        await sock.sendMessage(chatId, {
            text: `╭──❍「 *💬 INSPIRATIONAL QUOTE* 」❍
├ ✨ "${randomQuote}" ✨
╰──────❍
▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`,
            contextInfo: channelInfo.contextInfo
        }, { quoted: msg });
    }
};