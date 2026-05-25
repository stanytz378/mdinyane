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
// HELPER FUNCTIONS
// ============================================================

async function fetchWithRetry(url, retries = 3, delay = 2000) {
    for (let i = 0; i < retries; i++) {
        try {
            const response = await axios.get(url, { timeout: 60000 });
            return response;
        } catch (error) {
            if (i === retries - 1) throw error;
            await new Promise(resolve => setTimeout(resolve, delay));
            delay *= 2;
        }
    }
}

// ============================================================
// SEND MESSAGE
// ============================================================

async function sendMessage(sock, chatId, text, quoted = null) {
    try {
        await sock.sendMessage(chatId, {
            text: text,
            contextInfo: channelInfo.contextInfo
        }, { quoted: quoted });
    } catch (error) {
        await sock.sendMessage(chatId, { text: text }, { quoted: quoted });
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
    
    async execute(sock, msg, args, currentPrefix) {
        const chatId = msg.key.remoteJid;
        const query = args.join(' ').trim();
        
        // No query provided
        if (!query) {
            const helpMsg = `╭──❍「 *🎬 VIDEO DOWNLOADER* 」❍
├ 📝 *Usage* : ${currentPrefix}video <video name>
├ 📝 *Example* : ${currentPrefix}video Davido Unavailable
╰──────❍
▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`;
            await sendMessage(sock, chatId, helpMsg, msg);
            return;
        }
        
        // Send searching message
        await sendMessage(sock, chatId, `🔍 *Searching your song...*`, msg);
        
        try {
            // Search YouTube
            const search = await yts(query);
            
            if (!search || !search.videos || !search.videos.length) {
                await sendMessage(sock, chatId, `❌ *No results found for:* ${query}\n📝 Try different keywords`, msg);
                return;
            }
            
            const video = search.videos[0];
            
            // Fetch download link
            const apiUrl = `https://noobs-api.top/dipto/ytDl3?link=${encodeURIComponent(video.videoId)}&format=mp4`;
            const response = await fetchWithRetry(apiUrl);
            
            if (!response.data || !response.data.downloadLink) {
                throw new Error('No download link');
            }
            
            const downloadLink = response.data.downloadLink;
            
            // Send video
            await sock.sendMessage(chatId, {
                video: { url: downloadLink },
                caption: `🎬 *${video.title}*\n⏱️ ${video.timestamp}`,
                contextInfo: channelInfo.contextInfo
            }, { quoted: msg });
            
        } catch (error) {
            console.error('[VIDEO] Error:', error);
            await sendMessage(sock, chatId, `❌ *Failed to download video*\n📝 ${error.message || 'Try again later'}`, msg);
        }
    }
};