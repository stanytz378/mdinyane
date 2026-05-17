/*****************************************************************************
 *                                                                           *
 *                     Developed By STANY TZ                                 *
 *                                                                           *
 *  🌐  GitHub   : https://github.com/Stanytz378                             *
 *  ▶️  YouTube  : https://youtube.com/@STANYTZ                              *
 *  💬  WhatsApp : https://whatsapp.com/channel/0029Vb7fzu4EwEjmsD4Tzs1p     *
 *                                                                           *
 *    © 2026 STANY TZ. All rights reserved.                                 *
 *                                                                           *
 *****************************************************************************/

import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import moment from 'moment-timezone';
import { channelInfo } from '../../stanytz/messageConfig.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Temp directory for downloads
const TMP_DIR = path.join(process.cwd(), 'tmp');
if (!fs.existsSync(TMP_DIR)) {
    fs.mkdirSync(TMP_DIR, { recursive: true });
}

// ============================================================
// QUOTES
// ============================================================
const QUOTES = [
    "I'm not lazy, I'm just on my energy saving mode.",
    "Life is short, smile while you still have teeth.",
    "Downloading Facebook videos like a pro! 📱",
    "Social media content at your fingertips! 📥",
    "Save and watch anytime! 🎬",
    "Facebook video downloader activated! 🔥"
];

const getRandomQuote = () => QUOTES[Math.floor(Math.random() * QUOTES.length)];

// ============================================================
// SEND WITH FORWARDED MARK (from messageConfig.js)
// ============================================================

async function sendForwardedMessage(sock, chatId, text, mentions = [], quoted = null) {
    try {
        await sock.sendMessage(chatId, {
            text: text,
            contextInfo: channelInfo.contextInfo,
            mentions: mentions
        }, { quoted: quoted });
    } catch (error) {
        await sock.sendMessage(chatId, {
            text: text,
            mentions: mentions
        }, { quoted: quoted });
    }
}

// ============================================================
// FETCH WITH RETRY
// ============================================================

async function fetchFromApi(url, retries = 3) {
    for (let i = 0; i < retries; i++) {
        try {
            const response = await axios.get(url, {
                timeout: 40000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    'Accept': 'application/json, text/plain, */*'
                },
                maxRedirects: 5,
                validateStatus: s => s >= 200 && s < 500
            });
            return response;
        } catch (error) {
            if (i === retries - 1) throw error;
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
    }
}

// ============================================================
// MAIN COMMAND
// ============================================================

export default {
    name: 'fb',
    description: 'Download Facebook videos',
    icon: '📱',
    alias: ['facebook', 'fbdl', 'fbvideo'],
    category: 'download',
    
    async execute(sock, msg, args, currentPrefix, { BOT_NAME, VERSION }) {
        
        const chatId = msg.key.remoteJid;
        const sender = msg.key.participant || chatId;
        const randomQuote = getRandomQuote();
        
        // Get current time (East Africa Time)
        const now = moment().tz('Africa/Dar_es_Salaam');
        const date = now.format('DD/MM/YYYY');
        const day = now.format('dddd');
        const time = now.format('HH:mm:ss');
        
        const botName = BOT_NAME || 'MDINYANE';
        const url = args[0]?.trim();
        
        // ========== NO URL PROVIDED ==========
        if (!url) {
            const helpMsg = `╭──❍「 *📱 FACEBOOK VIDEO DOWNLOADER* 」❍
├ 📝 *Usage* : ${currentPrefix}fb <facebook_video_url>
├ 📝 *Example* : ${currentPrefix}fb https://www.facebook.com/xxxxx
╰─┬────❍
╭─┴─❍「 *📋 COMMANDS* 」❍
│ 🔧 ${currentPrefix}fb <url> - Download video
│ 🔧 ${currentPrefix}facebook <url> - Same as above
│ 🔧 ${currentPrefix}fbdl <url> - Same as above
╰──────❍
╭─┴─❍「 *📊 INFO* 」❍
├ 📅 *Date* : ${date}
├ 📆 *Day* : ${day}
├ ⏰ *Time* : ${time} EAT
├ 📱 *Supports* : Public Facebook videos
╰──────❍

✨ *"${randomQuote}"* ✨

_📌 Make sure the video is public_
▰▰▰ *©️ ${botName.toUpperCase()} BY STANY TZ* ▰▰▰`;
            await sendForwardedMessage(sock, chatId, helpMsg, [], msg);
            return;
        }
        
        // ========== VALIDATE URL ==========
        if (!url.includes('facebook.com') && !url.includes('fb.com')) {
            const invalidMsg = `╭──❍「 *📱 FACEBOOK VIDEO DOWNLOADER* 」❍
├ ❌ *Error* : Invalid Facebook URL
├ 📝 *Note* : Please provide a valid Facebook video link
╰──────❍

✨ *"${randomQuote}"* ✨

_📌 Example: ${currentPrefix}fb https://www.facebook.com/xxxxx_
▰▰▰ *©️ ${botName.toUpperCase()} BY STANY TZ* ▰▰▰`;
            await sendForwardedMessage(sock, chatId, invalidMsg, [], msg);
            return;
        }
        
        // Send processing message
        const processingMsg = `╭──❍「 *📱 FACEBOOK VIDEO DOWNLOADER* 」❍
├ 🔍 *Status* : Processing video...
├ ⏳ *Please wait* : Fetching video data
╰──────❍

_📌 This may take a few moments_
▰▰▰ *©️ ${botName.toUpperCase()} BY STANY TZ* ▰▰▰`;
        await sendForwardedMessage(sock, chatId, processingMsg, [], msg);
        
        try {
            let resolvedUrl = url;
            
            // Resolve short URLs
            try {
                const res = await axios.get(url, { 
                    timeout: 20000, 
                    maxRedirects: 10, 
                    headers: { 'User-Agent': 'Mozilla/5.0' } 
                });
                const possible = res?.request?.res?.responseUrl;
                if (possible && typeof possible === 'string') {
                    resolvedUrl = possible;
                }
            } catch {}
            
            // Fetch video data
            let response;
            const apiUrl = `https://api.princetechn.com/api/download/facebook?apikey=prince&url=${encodeURIComponent(resolvedUrl)}`;
            
            try {
                response = await fetchFromApi(apiUrl);
                if (!response || response.status >= 400 || !response.data) throw new Error('API failed');
            } catch {
                // Try with original URL
                const fallbackApiUrl = `https://api.princetechn.com/api/download/facebook?apikey=prince&url=${encodeURIComponent(url)}`;
                response = await fetchFromApi(fallbackApiUrl);
            }
            
            const data = response.data;
            
            if (!data || data.status !== 200 || !data.success || !data.result) {
                const apiErrorMsg = `╭──❍「 *📱 FACEBOOK VIDEO DOWNLOADER* 」❍
├ ❌ *Error* : API returned invalid response
├ 📝 *Note* : Please try again later
╰──────❍

✨ *"${randomQuote}"* ✨

_📌 The video might be private or unavailable_
▰▰▰ *©️ ${botName.toUpperCase()} BY STANY TZ* ▰▰▰`;
                await sendForwardedMessage(sock, chatId, apiErrorMsg, [], msg);
                return;
            }
            
            const videoUrl = data.result.hd_video || data.result.sd_video;
            
            if (!videoUrl) {
                const noVideoMsg = `╭──❍「 *📱 FACEBOOK VIDEO DOWNLOADER* 」❍
├ ❌ *Error* : No video found
├ 📝 *Note* : Make sure the link contains a video
╰──────❍

✨ *"${randomQuote}"* ✨

_📌 Try a different Facebook video link_
▰▰▰ *©️ ${botName.toUpperCase()} BY STANY TZ* ▰▰▰`;
                await sendForwardedMessage(sock, chatId, noVideoMsg, [], msg);
                return;
            }
            
            // Download video
            const downloadingMsg = `╭──❍「 *📱 FACEBOOK VIDEO DOWNLOADER* 」❍
├ 📥 *Status* : Downloading video...
├ ⏳ *Please wait* : This may take up to 30 seconds
╰──────❍

_📌 Large videos may take longer_
▰▰▰ *©️ ${botName.toUpperCase()} BY STANY TZ* ▰▰▰`;
            await sendForwardedMessage(sock, chatId, downloadingMsg, [], msg);
            
            const tempFile = path.join(TMP_DIR, `fb_${Date.now()}.mp4`);
            
            const videoResponse = await axios({
                method: 'GET',
                url: videoUrl,
                responseType: 'stream',
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    'Accept': 'video/mp4,video/*;q=0.9,*/*;q=0.8',
                    'Referer': 'https://www.facebook.com/'
                }
            });
            
            const writer = fs.createWriteStream(tempFile);
            videoResponse.data.pipe(writer);
            
            await new Promise((resolve, reject) => {
                writer.on('finish', resolve);
                writer.on('error', reject);
            });
            
            // Check file size
            const stats = fs.statSync(tempFile);
            if (stats.size === 0) throw new Error('Downloaded file is empty');
            
            // Greeting based on time
            const hour = moment().tz('Africa/Dar_es_Salaam').hour();
            let greeting = 'Good Morning 🌄';
            if (hour >= 12 && hour < 18) greeting = 'Good Afternoon 🏙️';
            else if (hour >= 18) greeting = 'Good Evening 🌃';
            else if (hour >= 22 || hour < 5) greeting = 'Good Night 🌌';
            
            const successCaption = `╭──❍「 *📱 DOWNLOAD COMPLETE* 」❍
├ ✅ *Status* : Success
├ 📱 *Source* : Facebook
├ 💾 *Size* : ${(stats.size / 1024 / 1024).toFixed(2)} MB
╰──────❍

✨ *"${greeting} @${sender.split('@')[0]}! Enjoy your video!"* ✨

_📌 Video downloaded successfully_
▰▰▰ *©️ ${botName.toUpperCase()} BY STANY TZ* ▰▰▰`;
            
            // Send video with forwarded mark
            await sock.sendMessage(chatId, {
                video: { url: tempFile },
                mimetype: "video/mp4",
                caption: successCaption,
                contextInfo: channelInfo.contextInfo,
                mentions: [sender]
            }, { quoted: msg });
            
            // Clean up temp file
            try {
                fs.unlinkSync(tempFile);
            } catch (err) {
                console.error('Error cleaning up temp file:', err);
            }
            
        } catch (error) {
            console.error('Facebook download error:', error);
            
            const errorMsg = `╭──❍「 *📱 FACEBOOK VIDEO DOWNLOADER* 」❍
├ ❌ *Error* : Failed to download video
├ 📝 *Reason* : ${error.message.substring(0, 50)}
╰──────❍

✨ *"${randomQuote}"* ✨

_📌 Please try again later or check the video link_
▰▰▰ *©️ ${botName.toUpperCase()} BY STANY TZ* ▰▰▰`;
            await sendForwardedMessage(sock, chatId, errorMsg, [], msg);
        }
    }
};