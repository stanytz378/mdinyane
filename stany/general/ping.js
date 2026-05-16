export default {
    name: 'ping',
    description: 'Check bot response time',
    icon: '🏓',
    category: 'general',
    
    async execute(sock, msg, args, currentPrefix, { channelInfo }) {
        const chatId = msg.key.remoteJid;
        const start = Date.now();
        
        const pingMessage = `🏓 *PONG!*\n⏱️ Latency: ${Date.now() - start}ms`;
        
        await sock.sendMessage(chatId, {
            text: pingMessage,
            contextInfo: channelInfo?.contextInfo
        }, { quoted: msg });
    }
};
