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

// API configuration
const DL_API = 'https://api.qasimdev.dpdns.org/api/loaderto/download';
const API_KEY = 'xbps-install-Syu';

// ============================================================
// HELPER FUNCTIONS
// ============================================================

const wait = (ms) => new Promise(r => setTimeout(r, ms));

const downloadWithRetry = async (url, retries = 3) => {
    for (let i = 0; i < retries; i++) {
        try {
            const { data } = await axios.get(DL_API, {
                params: { apiKey: API_KEY, format: 'mp3', url },
                timeout: 90000
            });
            if (data?.data?.downloadUrl) return data.data;
            throw new Error('No download URL');
        } catch (err) {
            if (i === retries - 1) throw err;
            console.log(`Download attempt ${i + 1} failed, retrying in 5s...`);
            await wait(5000);
        }
    }
    throw new Error('All download attempts failed');
};

// ============================================================
// QUOTES
// ============================================================
const QUOTES = [
    "I'm not lazy, I'm just on my energy saving mode.",
    "Life is short, smile while you still have teeth.",
    "Music is the soundtrack of life! 🎵",
    "Good music, good vibes! 🎶",
    "Dance like nobody's watching! 💃",
    "Let the music play! 🎧",
    "Every song tells a story! 📖",
    "Your daily dose of music! 🎵"
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
        // If thumbnail fails, send as text
        await sendForwardedMessage(sock, chatId, caption, mentions, quoted);
    }
}

// ============================================================
// MAIN COMMAND
// ============================================================

export default {
    name: 'song',
    description: 'Download song from YouTube (MP3)',
    icon: '🎵',
    alias: ['music', 'audio', 'mp3', 'ytmp3'],
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
            const helpMsg = `╭──❍「 *🎵 MUSIC DOWNLOADER* 」❍
├ 📝 *Usage* : ${currentPrefix}song <song name | YouTube link>
├ 📝 *Example* : ${currentPrefix}song Davido Unavailable
├ 📝 *Example* : ${currentPrefix}song https://youtu.be/xxxxx
╰─┬────❍
╭─┴─❍「 *📋 COMMANDS* 」❍
│ 🔧 ${currentPrefix}song <song> - Download MP3
│ 🔧 ${currentPrefix}music <song> - Same as above
│ 🔧 ${currentPrefix}mp3 <song> - Same as above
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
        
        try {
            let video;
            let isLink = false;
            
            // Check if query is a YouTube link
            if (query.includes('youtube.com') || query.includes('youtu.be')) {
                isLink = true;
                video = { url: query };
            } else {
                // Search YouTube
                const searchingMsg = `╭──❍「 *🎵 MUSIC DOWNLOADER* 」❍
├ 🔍 *Searching* : "${query.substring(0, 40)}${query.length > 40 ? '...' : ''}"
├ ⏳ *Status* : Finding best match...
╰──────❍

▰▰▰ *©️ ${botName.toUpperCase()} BY STANY TZ* ▰▰▰`;
                await sendForwardedMessage(sock, chatId, searchingMsg, [], msg);
                
                const { videos } = await yts(query);
                if (!videos?.length) {
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
                video = videos[0];
            }
            
            // Greeting based on time
            const hour = moment().tz('Africa/Dar_es_Salaam').hour();
            let greeting = 'Good Morning 🌄';
            if (hour >= 12 && hour < 18) greeting = 'Good Afternoon 🏙️';
            else if (hour >= 18) greeting = 'Good Evening 🌃';
            else if (hour >= 22 || hour < 5) greeting = 'Good Night 🌌';
            
            // Send song info with thumbnail
            const infoCaption = `╭──❍「 *🎵 SONG FOUND* 」❍
├ 📝 *Title* : ${video.title || query}
├ ⏱️ *Duration* : ${video.timestamp || 'Unknown'}
${video.views ? `├ 👁️ *Views* : ${video.views.toLocaleString()}` : ''}
${video.ago ? `├ 📅 *Uploaded* : ${video.ago}` : ''}
╰─┬────❍
╭─┴─❍「 *📥 DOWNLOADING* 」❍
├ 🎵 *Quality* : MP3
├ ⏳ *Status* : Processing (may take up to 30s)
╰──────❍

✨ *"${greeting} @${sender.split('@')[0]}! Enjoy your music!"* ✨

_📌 Your song is being downloaded..._
▰▰▰ *©️ ${botName.toUpperCase()} BY STANY TZ* ▰▰▰`;
            
            if (video.thumbnail) {
                await sendThumbnailMessage(sock, chatId, video.thumbnail, infoCaption, [sender], msg);
            } else {
                await sendForwardedMessage(sock, chatId, infoCaption, [sender], msg);
            }
            
            // Download audio
            const audio = await downloadWithRetry(video.url);
            const audioTitle = audio.title || video.title || query;
            const safeTitle = audioTitle.replace(/[\\/:*?"<>|]/g, '');
            
            // Send the audio file with forwarded mark
            await sock.sendMessage(chatId, {
                audio: { url: audio.downloadUrl },
                mimetype: 'audio/mpeg',
                fileName: `${safeTitle}.mp3`,
                ptt: false,
                contextInfo: channelInfo.contextInfo
            }, { quoted: msg });
            
            // Send success message
            const successMsg = `╭──❍「 *🎵 DOWNLOAD COMPLETE* 」❍
├ ✅ *Status* : Success
├ 📝 *Song* : ${audioTitle.substring(0, 50)}${audioTitle.length > 50 ? '...' : ''}
├ ⏱️ *Duration* : ${audio.duration || video.timestamp || 'Unknown'}
╰──────❍

✨ *"${randomQuote}"* ✨

_📌 Use ${currentPrefix}song <song> to download more_
▰▰▰ *©️ ${botName.toUpperCase()} BY STANY TZ* ▰▰▰`;
            await sendForwardedMessage(sock, chatId, successMsg, [], msg);
            
        } catch (err) {
            console.error('Song plugin error:', err.message);
            
            let reason = err.message;
            if (err.response?.status === 408) {
                reason = 'Download timed out. Please try again.';
            } else if (err.message.includes('No download URL')) {
                reason = 'Could not get download link. Please try again.';
            } else if (err.message.includes('All download attempts failed')) {
                reason = 'All download attempts failed. Server might be busy.';
            }
            
            const failMsg = `╭──❍「 *🎵 MUSIC DOWNLOADER* 」❍
├ ❌ *Error* : Failed to download
├ 📝 *Reason* : ${reason}
╰──────❍

✨ *"${randomQuote}"* ✨

_📌 Please try again later or use a different song_
▰▰▰ *©️ ${botName.toUpperCase()} BY STANY TZ* ▰▰▰`;
            await sendForwardedMessage(sock, chatId, failMsg, [], msg);
        }
    }
};