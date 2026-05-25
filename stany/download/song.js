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
                timeout: 60000
            });
            if (data?.data?.downloadUrl) return data.data;
            throw new Error('No download URL');
        } catch (err) {
            if (i === retries - 1) throw err;
            await wait(5000);
        }
    }
    throw new Error('All download attempts failed');
};

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
    name: 'song',
    description: 'Download song from YouTube (MP3)',
    icon: '🎵',
    alias: ['music', 'audio', 'mp3', 'ytmp3'],
    category: 'download',
    
    async execute(sock, msg, args, currentPrefix) {
        const chatId = msg.key.remoteJid;
        const query = args.join(' ').trim();
        
        // No query provided
        if (!query) {
            const helpMsg = `╭──❍「 *🎵 MUSIC DOWNLOADER* 」❍
├ 📝 *Usage* : ${currentPrefix}song <song name>
├ 📝 *Example* : ${currentPrefix}song Davido Unavailable
╰──────❍
▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`;
            await sendMessage(sock, chatId, helpMsg, msg);
            return;
        }
        
        // Send searching message
        await sendMessage(sock, chatId, `🔍 *Searching your song...*`, msg);
        
        try {
            let video;
            let isLink = false;
            
            // Check if query is a YouTube link
            if (query.includes('youtube.com') || query.includes('youtu.be')) {
                isLink = true;
                video = { url: query };
            } else {
                // Search YouTube
                const { videos } = await yts(query);
                if (!videos?.length) {
                    await sendMessage(sock, chatId, `❌ *No results found for:* ${query}\n📝 Try different keywords`, msg);
                    return;
                }
                video = videos[0];
            }
            
            // Download audio
            const audio = await downloadWithRetry(isLink ? query : video.url);
            const audioTitle = audio.title || video.title || query;
            const safeTitle = audioTitle.replace(/[\\/:*?"<>|]/g, '');
            
            // Send audio
            await sock.sendMessage(chatId, {
                audio: { url: audio.downloadUrl },
                mimetype: 'audio/mpeg',
                fileName: `${safeTitle}.mp3`,
                ptt: false,
                contextInfo: channelInfo.contextInfo
            }, { quoted: msg });
            
        } catch (error) {
            console.error('[SONG] Error:', error);
            await sendMessage(sock, chatId, `❌ *Failed to download song*\n📝 ${error.message || 'Try again later'}`, msg);
        }
    }
};