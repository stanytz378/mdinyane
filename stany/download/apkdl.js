/*****************************************************************************
 *                     Developed By STANY TZ                                 *
 *                                                                           *
 *  🌐  GitHub   : https://github.com/Stanytz378/iamlegendv2                 *
 *  ▶️  YouTube  : https://youtube.com/@STANYTZ                              *
 *  💬  WhatsApp : https://whatsapp.com/channel/0029Vb7fzu4EwEjmsD4Tzs1p     *
 *                                                                           *
 *    © 2026 STANY TZ. All rights reserved.                                 *
 *                                                                           *
 *****************************************************************************/

import axios from 'axios';
import moment from 'moment-timezone';
import { channelInfo, botImagePath } from '../../stanytz/messageConfig.js';
import fs from 'fs';
import path from 'path';

// API Configuration
const API_URL = 'https://api.princetechn.com/api/download/apkdl';

// Cache for APK info
let apkCache = new Map();
const CACHE_DURATION = 3600000; // 1 hour cache

// ============================================================
// SEND STYLED MESSAGE
// ============================================================

async function sendStyledMessage(sock, chatId, text, mentions = [], quoted = null) {
    try {
        const imageFullPath = path.join(process.cwd(), botImagePath);
        const imageExists = fs.existsSync(imageFullPath);
        
        const forwardContext = {
            forwardingScore: 999,
            isForwarded: true,
            forwardedNewsletterMessageInfo: {
                newsletterJid: '120363404317544295@newsletter',
                newsletterName: '✨ᴍᴅɪɴʏᴀɴᴇ ʙᴏᴛ💫',
                serverMessageId: Date.now().toString()
            }
        };
        
        if (imageExists) {
            await sock.sendMessage(chatId, {
                image: fs.readFileSync(imageFullPath),
                caption: text,
                contextInfo: forwardContext,
                mentions: mentions
            }, { quoted: quoted });
        } else {
            await sock.sendMessage(chatId, {
                text: text,
                contextInfo: forwardContext,
                mentions: mentions
            }, { quoted: quoted });
        }
    } catch (error) {
        try {
            await sock.sendMessage(chatId, {
                text: text,
                mentions: mentions
            }, { quoted: quoted });
        } catch (e) {
            console.error('Failed to send message:', e);
        }
    }
}

// ============================================================
// FETCH APK INFO FROM API
// ============================================================

async function fetchApkInfo(appName, forceRefresh = false) {
    const cacheKey = appName.toLowerCase();
    
    // Check cache
    if (!forceRefresh && apkCache.has(cacheKey)) {
        const cached = apkCache.get(cacheKey);
        const age = Date.now() - cached.timestamp;
        if (age < CACHE_DURATION) {
            return cached.data;
        }
    }
    
    try {
        const response = await axios.get(API_URL, {
            params: {
                apikey: 'prince',
                appName: appName
            },
            timeout: 15000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });
        
        if (response.data && response.data.success && response.data.result) {
            const result = {
                success: true,
                appname: response.data.result.appname,
                appicon: response.data.result.appicon,
                developer: response.data.result.developer,
                mimetype: response.data.result.mimetype,
                download_url: response.data.result.download_url,
                creator: response.data.creator
            };
            
            // Update cache
            apkCache.set(cacheKey, {
                data: result,
                timestamp: Date.now()
            });
            
            return result;
        }
        
        return { success: false, error: 'App not found' };
    } catch (error) {
        console.error('[APKDL] API Error:', error.message);
        return { success: false, error: error.message };
    }
}

// ============================================================
// FORMAT APK INFO MESSAGE
// ============================================================

function formatApkMessage(apkInfo, appName) {
    const now = moment().tz('Africa/Dar_es_Salaam');
    const date = now.format('DD/MM/YYYY');
    const time = now.format('HH:mm:ss');
    
    return `╭──❍「 *📱 APK DOWNLOADER* 」❍
├ 📱 *App* : ${apkInfo.appname}
├ 👨‍💻 *Developer* : ${apkInfo.developer}
├ 📅 *Date* : ${date}
├ ⏰ *Time* : ${time} EAT
╰─┬────❍
╭─┴─❍「 *🔗 DOWNLOAD LINK* 」❍
│ ${apkInfo.download_url}
╰──────❍
╭─┴─❍「 *📋 INFO* 」❍
│ 📦 *Type* : APK File
│ 📝 *MIME* : ${apkInfo.mimetype}
│ 👑 *Source* : ${apkInfo.creator}
╰──────❍
╭─┴─❍「 *📋 COMMANDS* 」❍
│ 🔧 .apkdl whatsapp - Download WhatsApp
│ 🔧 .apkdl telegram - Download Telegram
│ 🔧 .apkdl instagram - Download Instagram
│ 🔧 .apkdl facebook - Download Facebook
│ 🔧 .apkdl tiktok - Download TikTok
│ 🔧 .apkdl spotify - Download Spotify
│ 🔧 .apkdl <appname> - Search any app
╰──────❍
▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`;
}

// ============================================================
// FORMAT ERROR MESSAGE
// ============================================================

function formatErrorMessage(appName, error) {
    return `╭──❍「 *📱 APK DOWNLOADER* 」❍
├ ❌ *Error*
├ 📱 *App* : ${appName}
├ 📝 *Reason* : ${error}
╰──────❍
╭─┴─❍「 *📋 TIPS* 」❍
│ 🔧 Check app name spelling
│ 🔧 Use lowercase (e.g., whatsapp)
│ 🔧 Try alternative names
╰──────❍
▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`;
}

// ============================================================
// FORMAT HELP MESSAGE
// ============================================================

function formatHelpMessage(currentPrefix) {
    const now = moment().tz('Africa/Dar_es_Salaam');
    const date = now.format('DD/MM/YYYY');
    const time = now.format('HH:mm:ss');
    
    return `╭──❍「 *📱 APK DOWNLOADER* 」❍
├ 📝 *Download Android APKs directly*
├ 📅 *Date* : ${date}
├ ⏰ *Time* : ${time} EAT
╰─┬────❍
╭─┴─❍「 *📋 COMMANDS* 」❍
│ 🔧 ${currentPrefix}apkdl <appname>
│
│ 📱 *Popular Apps* :
│ 🔹 ${currentPrefix}apkdl whatsapp
│ 🔹 ${currentPrefix}apkdl telegram
│ 🔹 ${currentPrefix}apkdl instagram
│ 🔹 ${currentPrefix}apkdl facebook
│ 🔹 ${currentPrefix}apkdl tiktok
│ 🔹 ${currentPrefix}apkdl spotify
│ 🔹 ${currentPrefix}apkdl youtube
│ 🔹 ${currentPrefix}apkdl capcut
│ 🔹 ${currentPrefix}apkdl snapchat
│ 🔹 ${currentPrefix}apkdl twitter
│
│ 📝 *Examples* :
│ 🔸 ${currentPrefix}apkdl whatsapp
│ 🔸 ${currentPrefix}apkdl lightroom
│ 🔸 ${currentPrefix}apkdl gb whatsapp
╰──────❍
▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`;
}

// ============================================================
// POPULAR APP NAME MAPPINGS
// ============================================================

const popularApps = {
    'whatsapp': 'WhatsApp',
    'wa': 'WhatsApp',
    'whats': 'WhatsApp',
    'telegram': 'Telegram',
    'tg': 'Telegram',
    'instagram': 'Instagram',
    'ig': 'Instagram',
    'fb': 'Facebook',
    'facebook': 'Facebook',
    'tiktok': 'TikTok',
    'tt': 'TikTok',
    'spotify': 'Spotify',
    'yt': 'YouTube',
    'youtube': 'YouTube',
    'capcut': 'CapCut',
    'cc': 'CapCut',
    'snapchat': 'Snapchat',
    'snap': 'Snapchat',
    'twitter': 'Twitter',
    'x': 'Twitter',
    'lightroom': 'Lightroom',
    'lr': 'Lightroom',
    'gb whatsapp': 'GB WhatsApp',
    'gbwa': 'GB WhatsApp',
    'fm whatsapp': 'FM WhatsApp',
    'whatsapp plus': 'WhatsApp Plus'
};

// ============================================================
// COMMAND EXPORT
// ============================================================

export default {
    name: 'apkdl',
    description: 'Download Android APK files directly',
    icon: '📱',
    alias: ['apk', 'downloadapk', 'getapk', 'android'],
    category: 'general',
    
    async execute(sock, msg, args, currentPrefix, options) {
        const chatId = msg.key.remoteJid;
        let appName = args.join(' ').toLowerCase().trim();
        
        // Show help if no app name provided
        if (!appName) {
            const helpMsg = formatHelpMessage(currentPrefix);
            await sendStyledMessage(sock, chatId, helpMsg, [], msg);
            return;
        }
        
        // Check if app is in popular apps mapping
        if (popularApps[appName]) {
            appName = popularApps[appName];
        } else {
            // Capitalize first letter of each word
            appName = appName.split(' ').map(word => 
                word.charAt(0).toUpperCase() + word.slice(1)
            ).join(' ');
        }
        
        // Send loading message
        const loadingMsg = await sock.sendMessage(chatId, { 
            text: `╭──❍「 *📱 APK DOWNLOADER* 」❍
├ 🔄 *Searching for ${appName}...*
├ ⏳ Please wait...
╰──────❍
▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`
        });
        
        try {
            const forceRefresh = args.includes('--refresh') || args.includes('-r');
            const apkInfo = await fetchApkInfo(appName, forceRefresh);
            
            if (!apkInfo.success) {
                const errorMsg = formatErrorMessage(appName, apkInfo.error || 'App not found');
                await sock.sendMessage(chatId, { text: errorMsg, edit: loadingMsg.key });
                return;
            }
            
            const message = formatApkMessage(apkInfo, appName);
            await sock.sendMessage(chatId, { text: message, edit: loadingMsg.key });
            
        } catch (error) {
            console.error('[APKDL] Error:', error);
            const errorMsg = formatErrorMessage(appName, error.message || 'Unknown error');
            await sock.sendMessage(chatId, { text: errorMsg, edit: loadingMsg.key });
        }
    }
};