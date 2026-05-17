import { channelInfo } from '../../stanytz/messageConfig.js';

export default {
    name: 'password',
    description: 'Generate random strong password',
    icon: '🔑',
    alias: ['genpass', 'randompass'],
    category: 'general',
    
    async execute(sock, msg, args, currentPrefix) {
        const chatId = msg.key.remoteJid;
        
        let length = args[0] ? parseInt(args[0]) : 12;
        if (length < 6) length = 6;
        if (length > 32) length = 32;
        
        const uppercase = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
        const lowercase = 'abcdefghijkmnopqrstuvwxyz';
        const numbers = '23456789';
        const symbols = '!@#$%&*?';
        
        let chars = uppercase + lowercase + numbers + symbols;
        let password = '';
        
        // Ensure at least one of each type
        password += uppercase[Math.floor(Math.random() * uppercase.length)];
        password += lowercase[Math.floor(Math.random() * lowercase.length)];
        password += numbers[Math.floor(Math.random() * numbers.length)];
        password += symbols[Math.floor(Math.random() * symbols.length)];
        
        for (let i = password.length; i < length; i++) {
            password += chars[Math.floor(Math.random() * chars.length)];
        }
        
        // Shuffle
        password = password.split('').sort(() => 0.5 - Math.random()).join('');
        
        let strength = '💪 Strong';
        if (length < 8) strength = '⚠️ Weak';
        else if (length < 12) strength = '👍 Good';
        
        await sock.sendMessage(chatId, {
            text: `╭──❍「 *🔑 GENERATED PASSWORD* 」❍
├ 🔐 *Password* : \`${password}\`
├ 📏 *Length* : ${length} characters
├ 💪 *Strength* : ${strength}
├ 📅 *Generated* : ${new Date().toLocaleString()}
╰──────❍
_📌 Copy and save your password securely_
▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`,
            contextInfo: channelInfo.contextInfo
        }, { quoted: msg });
    }
};