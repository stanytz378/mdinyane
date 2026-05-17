import { channelInfo } from '../../stanytz/messageConfig.js';

export default {
    name: 'color',
    description: 'Get color information',
    icon: '🎨',
    alias: ['colour', 'hex'],
    category: 'general',
    
    async execute(sock, msg, args, currentPrefix) {
        const chatId = msg.key.remoteJid;
        let colorInput = args[0];
        
        if (!colorInput) {
            await sock.sendMessage(chatId, {
                text: `╭──❍「 *🎨 COLOR INFO* 」❍
├ 📝 Usage: ${currentPrefix}color <color>
├ 📝 Example: ${currentPrefix}color red
├ 📝 Example: ${currentPrefix}color #FF5733
├ 📝 Example: ${currentPrefix}color rgb(255,87,51)
╰──────❍`,
                contextInfo: channelInfo.contextInfo
            }, { quoted: msg });
            return;
        }
        
        const colors = {
            red: { hex: '#FF0000', rgb: '255,0,0' },
            blue: { hex: '#0000FF', rgb: '0,0,255' },
            green: { hex: '#00FF00', rgb: '0,255,0' },
            yellow: { hex: '#FFFF00', rgb: '255,255,0' },
            purple: { hex: '#800080', rgb: '128,0,128' },
            orange: { hex: '#FFA500', rgb: '255,165,0' },
            pink: { hex: '#FFC0CB', rgb: '255,192,203' },
            black: { hex: '#000000', rgb: '0,0,0' },
            white: { hex: '#FFFFFF', rgb: '255,255,255' },
            gray: { hex: '#808080', rgb: '128,128,128' }
        };
        
        let result;
        if (colorInput.startsWith('#')) {
            result = { hex: colorInput.toUpperCase(), rgb: 'Unknown' };
        } else if (colorInput.startsWith('rgb')) {
            result = { hex: 'Unknown', rgb: colorInput };
        } else {
            result = colors[colorInput.toLowerCase()] || { hex: 'Unknown', rgb: 'Unknown' };
        }
        
        await sock.sendMessage(chatId, {
            text: `╭──❍「 *🎨 COLOR INFORMATION* 」❍
├ 🎨 *Color* : ${colorInput}
├ 🟦 *HEX* : ${result.hex}
├ 🎨 *RGB* : ${result.rgb}
╰──────❍
▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`,
            contextInfo: channelInfo.contextInfo
        }, { quoted: msg });
    }
};