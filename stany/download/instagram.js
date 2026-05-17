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
    "Instagram content at your fingertips! 📸",
    "Save posts and reels easily! ⬇️",
    "Download Instagram media! 📱"
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
    name: 'instagram',
    description: 'Download Instagram posts, reels, stories',
    icon: '📸',
    alias: ['ig', 'insta', 'igdl'],
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
            const helpMsg = `╭──❍「 *📸 INSTAGRAM DOWNLOADER* 」❍
├ 📝 *Usage* : ${currentPrefix}instagram <instagram_url>
├ 📝 *Example* : ${currentPrefix}ig https://www.instagram.com/p/xxx
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
        
        if (!url.includes('instagram.com')) {
            await sendForwardedMessage(sock, chatId, `╭──❍「 *📸 ERROR* 」❍\n├ ❌ Invalid Instagram URL\n╰──────❍\n▰▰▰ *©️ ${botName.toUpperCase()} BY STANY TZ* ▰▰▰`, [], msg);
            return;
        }
        
        await sendForwardedMessage(sock, chatId, `╭──❍「 *📸 PROCESSING* 」❍\n├ 🔍 Fetching media...\n╰──────❍\n▰▰▰ *©️ ${botName.toUpperCase()} BY STANY TZ* ▰▰▰`, [], msg);
        
        try {
            const apiUrl = `https://api.princetechn.com/api/download/instagram?apikey=prince&url=${encodeURIComponent(url)}`;
            const response = await axios.get(apiUrl, { timeout: 30000 });
            
            const data = response.data;
            if (!data || data.status !== 200 || !data.result) throw new Error('API failed');
            
            const mediaItems = data.result.media || [data.result];
            
            for (const media of mediaItems) {
                const mediaUrl = media.url;
                const isVideo = media.type === 'video' || mediaUrl.includes('.mp4');
                const ext = isVideo ? 'mp4' : 'jpg';
                const tempFile = path.join(TMP_DIR, `ig_${Date.now()}_${Math.random()}.${ext}`);
                
                const mediaRes = await axios({ method: 'GET', url: mediaUrl, responseType: 'stream' });
                const writer = fs.createWriteStream(tempFile);
                mediaRes.data.pipe(writer);
                await new Promise((resolve, reject) => { writer.on('finish', resolve); writer.on('error', reject); });
                
                if (isVideo) {
                    await sock.sendMessage(chatId, {
                        video: { url: tempFile },
                        mimetype: "video/mp4",
                        contextInfo: channelInfo.contextInfo
                    }, { quoted: msg });
                } else {
                    await sock.sendMessage(chatId, {
                        image: { url: tempFile },
                        contextInfo: channelInfo.contextInfo
                    }, { quoted: msg });
                }
                fs.unlinkSync(tempFile);
            }
            
            await sendForwardedMessage(sock, chatId, `╭──❍「 *📸 DOWNLOAD COMPLETE* 」❍\n├ ✅ Success\n├ 📊 ${mediaItems.length} media downloaded\n╰──────❍\n\n✨ *"${randomQuote}"* ✨\n\n▰▰▰ *©️ ${botName.toUpperCase()} BY STANY TZ* ▰▰▰`, [], msg);
            
        } catch (error) {
            await sendForwardedMessage(sock, chatId, `╭──❍「 *📸 ERROR* 」❍\n├ ❌ Failed: ${error.message}\n╰──────❍\n▰▰▰ *©️ ${botName.toUpperCase()} BY STANY TZ* ▰▰▰`, [], msg);
        }
    }
};