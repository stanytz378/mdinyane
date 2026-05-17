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
import { channelInfo } from '../../stanytz/messageConfig.js';

// ============================================================
// Helper function to fetch with retries
// ============================================================
async function fetchWithRetry(url, retries = 3, delay = 2000) {
    for (let i = 0; i < retries; i++) {
        try {
            const response = await axios.get(url, { timeout: 90000 });
            return response;
        } catch (error) {
            if (i === retries - 1) throw error;
            console.warn(`[PLAY] Retry ${i + 1}/${retries} after error: ${error.message}`);
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
    "Music is the soundtrack of life! 🎵",
    "Good music, good vibes! 🎶",
    "Dance like nobody's watching! 💃",
    "Let the music play! 🎧"
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
// MAIN COMMAND
// ============================================================

export default {
    name: 'play',
    description: 'Download audio from YouTube',
    icon: '🎵',
    alias: ['song', 'music', 'ytmp3'],
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
        
        // ========== NO QUERY PROVIDED ==========
        if (!args.length) {
            const helpMsg = `╭──❍「 *🎵 MUSIC DOWNLOADER* 」❍
├ 📝 *Usage* : ${currentPrefix}play <song name>
├ 📝 *Example* : ${currentPrefix}play Davido Unavailable
╰─┬────❍
╭─┴─❍「 *📋 COMMANDS* 」❍
│ 🔧 ${currentPrefix}play <song> - Download music
│ 🔧 ${currentPrefix}song <song> - Same as above
╰──────❍
╭─┴─❍「 *📊 INFO* 」❍
├ 📅 *Date* : ${date}
├ 📆 *Day* : ${day}
├ ⏰ *Time* : ${time} EAT
├ 🎵 *Quality* : MP3 High Quality
╰──────❍

✨ *"${randomQuote}"* ✨

_📌 Find and download any song from YouTube_
▰▰▰ *©️ ${botName.toUpperCase()} BY STANY TZ* ▰▰▰`;
            await sendForwardedMessage(sock, chatId, helpMsg, [], msg);
            return;
        }
        
        const query = args.join(' ');
        
        // Send searching message
        const searchingMsg = `╭──❍「 *🎵 MUSIC DOWNLOADER* 」❍
├ 🔍 *Status* : Searching for "${query}"
├ ⏳ *Please wait* : Finding best match...
╰──────❍

▰▰▰ *©️ ${botName.toUpperCase()} BY STANY TZ* ▰▰▰`;
        await sendForwardedMessage(sock, chatId, searchingMsg, [], msg);
        
        try {
            // Search YouTube
            const search = await yts(query);
            if (!search || !search.videos || !search.videos.length) {
                const notFoundMsg = `╭──❍「 *🎵 MUSIC DOWNLOADER* 」❍
├ ❌ *Error* : No results found
├ 📝 *Query* : "${query}"
╰──────❍

✨ *"${randomQuote}"* ✨

_📌 Try different song name or artist_
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
            
            // Send song info with thumbnail
            const infoCaption = `╭──❍「 *🎵 SONG FOUND* 」❍
├ 📝 *Title* : ${video.title}
├ 👁️ *Views* : ${video.views.toLocaleString()}
├ 📅 *Uploaded* : ${video.ago}
├ ⏱️ *Duration* : ${video.timestamp}
╰─┬────❍
╭─┴─❍「 *📥 DOWNLOADING* 」❍
├ 🎵 *Quality* : MP3
├ 💾 *Size* : Processing...
╰──────❍

✨ *"${greeting} @${sender.split('@')[0]}! Enjoy your music!"* ✨

_📌 Your song is being prepared..._
▰▰▰ *©️ ${botName.toUpperCase()} BY STANY TZ* ▰▰▰`;
            
            // Send thumbnail with forwarded mark
            try {
                await sock.sendMessage(chatId, {
                    image: { url: video.thumbnail },
                    caption: infoCaption,
                    contextInfo: channelInfo.contextInfo,
                    mentions: [sender]
                }, { quoted: msg });
            } catch (thumbError) {
                console.error('Thumbnail error:', thumbError);
                await sendForwardedMessage(sock, chatId, infoCaption, [sender], msg);
            }
            
            // Fetch audio download link
            const apiUrl = `https://noobs-api.top/dipto/ytDl3?link=${encodeURIComponent(video.videoId)}&format=mp3`;
            const response = await fetchWithRetry(apiUrl, 3, 2000);
            
            if (response.status !== 200 || !response.data.downloadLink) {
                throw new Error('Invalid API response');
            }
            
            const downloadLink = response.data.downloadLink;
            
            // Send the audio file with forwarded mark
            await sock.sendMessage(chatId, {
                audio: { url: downloadLink },
                mimetype: 'audio/mpeg',
                fileName: `${safeTitle}.mp3`,
                contextInfo: channelInfo.contextInfo
            }, { quoted: msg });
            
            // Send success message
            const successMsg = `╭──❍「 *🎵 DOWNLOAD COMPLETE* 」❍
├ ✅ *Status* : Success
├ 📝 *Song* : ${video.title}
├ ⏱️ *Duration* : ${video.timestamp}
╰──────❍

✨ *"${randomQuote}"* ✨

_📌 Use ${currentPrefix}play <song> to download more_
▰▰▰ *©️ ${botName.toUpperCase()} BY STANY TZ* ▰▰▰`;
            await sendForwardedMessage(sock, chatId, successMsg, [], msg);
            
        } catch (error) {
            console.error('[PLAY] Error:', error);
            
            let errorMsg = error.message || 'Unknown error';
            if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
                errorMsg = 'The server took too long to respond. Please try again later.';
            }
            
            const failMsg = `╭──❍「 *🎵 MUSIC DOWNLOADER* 」❍
├ ❌ *Error* : Failed to process
├ 📝 *Reason* : ${errorMsg}
╰──────❍

✨ *"${randomQuote}"* ✨

_📌 Please try again later or use a different song_
▰▰▰ *©️ ${botName.toUpperCase()} BY STANY TZ* ▰▰▰`;
            await sendForwardedMessage(sock, chatId, failMsg, [], msg);
        }
    }
};