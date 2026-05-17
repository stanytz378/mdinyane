import { channelInfo } from '../../stanytz/messageConfig.js';

export default {
    name: 'urls',
    description: 'Check if URL is safe or suspicious',
    icon: '🔍',
    alias: ['urlcheck', 'checkurl'],
    category: 'general',
    
    async execute(sock, msg, args, currentPrefix) {
        const chatId = msg.key.remoteJid;
        const url = args[0];
        
        if (!url) {
            await sock.sendMessage(chatId, {
                text: `╭──❍「 *🔍 URL CHECKER* 」❍
├ 📝 Usage: ${currentPrefix}urls <url>
├ 📝 Example: ${currentPrefix}urls https://google.com
╰──────❍`,
                contextInfo: channelInfo.contextInfo
            }, { quoted: msg });
            return;
        }
        
        const suspiciousDomains = ['bit.ly', 'tinyurl', 'shorturl', 'rb.gy'];
        const safeDomains = ['google.com', 'youtube.com', 'github.com', 'whatsapp.com'];
        
        let isSuspicious = false;
        let isSafe = false;
        
        for (const domain of suspiciousDomains) {
            if (url.toLowerCase().includes(domain)) {
                isSuspicious = true;
                break;
            }
        }
        
        for (const domain of safeDomains) {
            if (url.toLowerCase().includes(domain)) {
                isSafe = true;
                break;
            }
        }
        
        let status = '⚠️ Unknown';
        let emoji = '❓';
        
        if (isSuspicious) {
            status = '⚠️ Suspicious';
            emoji = '⚠️';
        } else if (isSafe) {
            status = '✅ Safe';
            emoji = '✅';
        } else {
            status = '❓ Unknown';
            emoji = '❓';
        }
        
        await sock.sendMessage(chatId, {
            text: `╭──❍「 *🔍 URL ANALYSIS* 」❍
├ 🔗 *URL* : ${url}
├ ${emoji} *Status* : ${status}
├ 📝 *Length* : ${url.length} characters
├ 🔒 *Protocol* : ${url.startsWith('https') ? '🔒 HTTPS' : '🔓 HTTP'}
╰──────❍
_📌 Always be careful when clicking links_
▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`,
            contextInfo: channelInfo.contextInfo
        }, { quoted: msg });
    }
};