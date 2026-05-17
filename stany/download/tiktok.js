/*****************************************************************************
 *                     Developed By STANY TZ                                 *
 *****************************************************************************/

import axios from 'axios';
import fs from 'fs';
import path from 'path';
import moment from 'moment-timezone';
import { channelInfo } from '../../stanytz/messageConfig.js';

const TMP_DIR = path.join(process.cwd(), 'tmp');
if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR, { recursive: true });

const QUOTES = [
    "TikTok videos are trending! 🎵",
    "Download TikTok videos easily! ⬇️",
    "Save your favorite TikToks! 📱"
];

const getRandomQuote = () => QUOTES[Math.floor(Math.random() * QUOTES.length)];

async function sendForwardedMessage(sock, chatId, text, mentions = [], quoted = null) {
    try {
        await sock.sendMessage(chatId, {
            text: text,
            contextInfo: channelInfo.contextInfo,
            mentions: mentions
        }, { quoted: quoted });
    } catch (error) {
        await sock.sendMessage(chatId, { text: text, mentions: mentions }, { quoted: quoted });
    }
}

export default {
    name: 'tiktok',
    description: 'Download TikTok videos',
    icon: '🎵',
    alias: ['tt', 'tiktokdl', 'ttdl'],
    category: 'download',
    
    async execute(sock, msg, args, currentPrefix, { BOT_NAME, VERSION }) {
        const chatId = msg.key.remoteJid;
        const randomQuote = getRandomQuote();
        const botName = BOT_NAME || 'MDINYANE';
        const url = args[0]?.trim();
        
        const now = moment().tz('Africa/Dar_es_Salaam');
        const date = now.format('DD/MM/YYYY');
        const day = now.format('dddd');
        const time = now.format('HH:mm:ss');
        
        if (!url) {
            const helpMsg = `╭──❍「 *🎵 TIKTOK DOWNLOADER* 」❍
├ 📝 *Usage* : ${currentPrefix}tiktok <tiktok_url>
├ 📝 *Example* : ${currentPrefix}tt https://www.tiktok.com/@user/video/xxx
╰─┬────❍
╭─┴─❍「 *📋 INFO* 」❍
├ 📅 *Date* : ${date}
├ 📆 *Day* : ${day}
├ ⏰ *Time* : ${time} EAT
╰──────❍

✨ *"${randomQuote}"* ✨

▰▰▰ *©️ ${botName.toUpperCase()} BY STANY TZ* ▰▰▰`;
            await sendForwardedMessage(sock, chatId, helpMsg, [], msg);
            return;
        }
        
        if (!url.includes('tiktok.com')) {
            await sendForwardedMessage(sock, chatId, `╭──❍「 *🎵 ERROR* 」❍\n├ ❌ Invalid TikTok URL\n╰──────❍\n▰▰▰ *©️ ${botName.toUpperCase()} BY STANY TZ* ▰▰▰`, [], msg);
            return;
        }
        
        await sendForwardedMessage(sock, chatId, `╭──❍「 *🎵 PROCESSING* 」❍\n├ 🔍 Fetching video...\n╰──────❍\n▰▰▰ *©️ ${botName.toUpperCase()} BY STANY TZ* ▰▰▰`, [], msg);
        
        try {
            const apiUrl = `https://api.princetechn.com/api/download/tiktok?apikey=prince&url=${encodeURIComponent(url)}`;
            const response = await axios.get(apiUrl, { timeout: 30000 });
            
            const data = response.data;
            if (!data || data.status !== 200 || !data.result) throw new Error('API failed');
            
            const videoUrl = data.result.video || data.result.nowatermark;
            if (!videoUrl) throw new Error('No video found');
            
            const tempFile = path.join(TMP_DIR, `tt_${Date.now()}.mp4`);
            const videoRes = await axios({ method: 'GET', url: videoUrl, responseType: 'stream' });
            const writer = fs.createWriteStream(tempFile);
            videoRes.data.pipe(writer);
            await new Promise((resolve, reject) => { writer.on('finish', resolve); writer.on('error', reject); });
            
            const stats = fs.statSync(tempFile);
            await sock.sendMessage(chatId, {
                video: { url: tempFile },
                mimetype: "video/mp4",
                caption: `╭──❍「 *🎵 DOWNLOAD COMPLETE* 」❍\n├ ✅ Success\n├ 💾 Size: ${(stats.size / 1024 / 1024).toFixed(2)} MB\n╰──────❍\n\n✨ *"${randomQuote}"* ✨\n\n▰▰▰ *©️ ${botName.toUpperCase()} BY STANY TZ* ▰▰▰`,
                contextInfo: channelInfo.contextInfo
            }, { quoted: msg });
            
            fs.unlinkSync(tempFile);
        } catch (error) {
            await sendForwardedMessage(sock, chatId, `╭──❍「 *🎵 ERROR* 」❍\n├ ❌ Failed: ${error.message}\n╰──────❍\n▰▰▰ *©️ ${botName.toUpperCase()} BY STANY TZ* ▰▰▰`, [], msg);
        }
    }
};