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
import yts from 'yt-search';
import moment from 'moment-timezone';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { channelInfo } from '../../stanytz/messageConfig.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ============================================================
// HELPER FUNCTIONS
// ============================================================

async function fetchWithRetry(url, retries = 3, delay = 2000) {
    for (let i = 0; i < retries; i++) {
        try {
            const response = await axios.get(url, { timeout: 90000 });
            return response;
        } catch (error) {
            if (i === retries - 1) throw error;
            console.warn(`[VIDEO] Retry ${i + 1}/${retries} after error: ${error.message}`);
            await new Promise(resolve => setTimeout(resolve, delay));
            delay *= 2;
        }
    }
}

// ============================================================
// QUOTES
// ============================================================
const QUOTES = [
    "I'm not lazy, I'm just on my energy saving mode.",
    "Life is short, smile while you still have teeth.",
    "Watch your favorite videos! 🎬",
    "Video mode activated! 📹",
    "Entertainment at your fingertips! 🎥",
    "Stream and enjoy! 📺",
    "Video downloading made easy! ⬇️"
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

async function sendThumbnailMessage(sock, chatId, imageUrl, caption, mentions = [], quoted = null) {
    try {
        await sock.sendMessage(chatId, {
            image: { url: imageUrl },
            caption: caption,
            contextInfo: channelInfo.contextInfo,
            mentions: mentions
        }, { quoted: quoted });
    } catch (error) {
        await sendForwardedMessage(sock, chatId, caption, mentions, quoted);
    }
}

// ============================================================
// MAIN COMMAND
// ============================================================

export default {
    name: 'video',
    description: 'Download YouTube videos',
    icon: '🎬',
    alias: ['ytvideo', 'ytv', 'ytmp4'],
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
        const query = args.join(' ').trim();
        
        // ========== NO QUERY PROVIDED ==========
        if (!query) {
            const helpMsg = `╭──❍「 *🎬 VIDEO DOWNLOADER* 」❍
├ 📝 *Usage* : ${currentPrefix}video <video name>
├ 📝 *Example* : ${currentPrefix}video Davido Unavailable
╰─┬────❍
╭─┴─❍「 *📋 COMMANDS* 」❍
│ 🔧 ${currentPrefix}video <query> - Download MP4
│ 🔧 ${currentPrefix}ytvideo <query> - Same as above
╰──────❍
╭─┴─❍「 *📊 INFO* 」❍
├ 📅 *Date* : ${date}
├ 📆 *Day* : ${day}
├ ⏰ *Time* : ${time} EAT
├ 🎥 *Quality* : MP4 High Quality
╰──────❍

✨ *"${randomQuote}"* ✨

_📌 Find and download any video from YouTube_
▰▰▰ *©️ ${botName.toUpperCase()} BY STANY TZ* ▰▰▰`;
            await sendForwardedMessage(sock, chatId, helpMsg, [], msg);
            return;
        }
        
        // Send searching message
        const searchingMsg = `╭──❍「 *🎬 VIDEO DOWNLOADER* 」❍
├ 🔍 *Searching* : "${query.substring(0, 40)}${query.length > 40 ? '...' : ''}"
├ ⏳ *Status* : Finding best match...
╰──────❍

▰▰▰ *©️ ${botName.toUpperCase()} BY STANY TZ* ▰▰▰`;
        await sendForwardedMessage(sock, chatId, searchingMsg, [], msg);
        
        try {
            // Search YouTube
            const search = await yts(query);
            if (!search || !search.videos || !search.videos.length) {
                const notFoundMsg = `╭──❍「 *🎬 VIDEO DOWNLOADER* 」❍
├ ❌ *Error* : No results found
├ 📝 *Query* : "${query}"
╰──────❍

✨ *"${randomQuote}"* ✨

_📌 Try different video name or keywords_
▰▰▰ *©️ ${botName.toUpperCase()} BY STANY TZ* ▰▰▰`;
                await sendForwardedMessage(sock, chatId, notFoundMsg, [], msg);
                return;
            }
            
            const video = search.videos[0];
            const safeTitle = video.title.replace(/[\\/:*?"<>|]/g, '');
            
            // Greeting based on time
            const hour = moment().tz('Africa/Dar_es_Salaam').hour();
            let greeting = 'Good Morning 🌄';
            if (hour >= 12 && hour < 18) greeting = 'Good Afternoon 🏙️';
            else if (hour >= 18) greeting = 'Good Evening 🌃';
            else if (hour >= 22 || hour < 5) greeting = 'Good Night 🌌';
            
            // Send video info with thumbnail
            const infoCaption = `╭──❍「 *🎬 VIDEO FOUND* 」❍
├ 📝 *Title* : ${video.title}
├ 👁️ *Views* : ${video.views.toLocaleString()}
├ 📅 *Uploaded* : ${video.ago}
├ ⏱️ *Duration* : ${video.timestamp}
╰─┬────❍
╭─┴─❍「 *📥 DOWNLOADING* 」❍
├ 🎥 *Quality* : MP4
├ 💾 *Size* : Processing...
╰──────❍

✨ *"${greeting} @${sender.split('@')[0]}! Enjoy your video!"* ✨

_📌 Your video is being prepared..._
▰▰▰ *©️ ${botName.toUpperCase()} BY STANY TZ* ▰▰▰`;
            
            await sendThumbnailMessage(sock, chatId, video.thumbnail, infoCaption, [sender], msg);
            
            // Fetch video download link
            const apiUrl = `https://noobs-api.top/dipto/ytDl3?link=${encodeURIComponent(video.videoId)}&format=mp4`;
            const response = await fetchWithRetry(apiUrl, 3, 2000);
            
            if (response.status !== 200 || !response.data.downloadLink) {
                throw new Error('Invalid API response');
            }
            
            const downloadLink = response.data.downloadLink;
            
            // Send the video file with forwarded mark
            await sock.sendMessage(chatId, {
                video: { url: downloadLink },
                caption: `✅ *Download Complete*\n\n${video.title}`,
                contextInfo: channelInfo.contextInfo
            }, { quoted: msg });
            
            // Send success message
            const successMsg = `╭──❍「 *🎬 DOWNLOAD COMPLETE* 」❍
├ ✅ *Status* : Success
├ 📝 *Video* : ${video.title.substring(0, 50)}${video.title.length > 50 ? '...' : ''}
├ ⏱️ *Duration* : ${video.timestamp}
╰──────❍

✨ *"${randomQuote}"* ✨

_📌 Use ${currentPrefix}video <query> to download more_
▰▰▰ *©️ ${botName.toUpperCase()} BY STANY TZ* ▰▰▰`;
            await sendForwardedMessage(sock, chatId, successMsg, [], msg);
            
        } catch (error) {
            console.error('[VIDEO] Error:', error);
            
            let errorMsg = error.message || 'Unknown error';
            if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
                errorMsg = 'The server took too long to respond. Please try again later.';
            }
            
            const failMsg = `╭──❍「 *🎬 VIDEO DOWNLOADER* 」❍
├ ❌ *Error* : Failed to process video
├ 📝 *Reason* : ${errorMsg}
╰──────❍

✨ *"${randomQuote}"* ✨

_📌 Please try again later or use a different video_
▰▰▰ *©️ ${botName.toUpperCase()} BY STANY TZ* ▰▰▰`;
            await sendForwardedMessage(sock, chatId, failMsg, [], msg);
        }
    }
};