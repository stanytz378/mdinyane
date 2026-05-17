import { channelInfo } from '../../stanytz/messageConfig.js';

export default {
    name: 'bmi',
    description: 'Calculate Body Mass Index',
    icon: '⚖️',
    alias: ['bodymass', 'bmi'],
    category: 'general',
    
    async execute(sock, msg, args, currentPrefix) {
        const chatId = msg.key.remoteJid;
        
        if (args.length < 2) {
            await sock.sendMessage(chatId, {
                text: `╭──❍「 *⚖️ BMI CALCULATOR* 」❍
├ 📝 Usage: ${currentPrefix}bmi <weight_kg> <height_cm>
├ 📝 Example: ${currentPrefix}bmi 70 175
╰──────❍`,
                contextInfo: channelInfo.contextInfo
            }, { quoted: msg });
            return;
        }
        
        const weight = parseFloat(args[0]);
        const height = parseFloat(args[1]) / 100;
        
        if (isNaN(weight) || isNaN(height) || weight <= 0 || height <= 0) {
            await sock.sendMessage(chatId, {
                text: `╭──❍「 *⚖️ BMI* 」❍
├ ❌ Invalid input
├ 📝 Use numbers only
╰──────❍`,
                contextInfo: channelInfo.contextInfo
            }, { quoted: msg });
            return;
        }
        
        const bmi = weight / (height * height);
        let category = '';
        let emoji = '';
        
        if (bmi < 18.5) { category = 'Underweight'; emoji = '🍽️'; }
        else if (bmi < 25) { category = 'Normal weight'; emoji = '✅'; }
        else if (bmi < 30) { category = 'Overweight'; emoji = '⚠️'; }
        else { category = 'Obese'; emoji = '🔴'; }
        
        await sock.sendMessage(chatId, {
            text: `╭──❍「 *⚖️ BMI RESULT* 」❍
├ ⚖️ *Weight* : ${weight} kg
├ 📏 *Height* : ${height * 100} cm
├ 📊 *BMI* : ${bmi.toFixed(1)}
├ ${emoji} *Category* : ${category}
╰──────❍
▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`,
            contextInfo: channelInfo.contextInfo
        }, { quoted: msg });
    }
};