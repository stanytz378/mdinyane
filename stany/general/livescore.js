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
const API_URL = 'https://api.princetechn.com/api/football/livescore?apikey=prince';

// Cache
let scoresCache = {
    data: null,
    timestamp: null
};
const CACHE_DURATION = 30000; // 30 seconds

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
// FETCH FROM API ONLY
// ============================================================

async function fetchFromAPI() {
    try {
        const response = await axios.get(API_URL, {
            timeout: 15000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });
        
        if (response.data && response.data.success && response.data.result) {
            return {
                success: true,
                totalMatches: response.data.result.totalMatches,
                matches: response.data.result.matches || [],
                creator: response.data.creator
            };
        }
        
        return { success: false, matches: [], error: 'Invalid API response' };
    } catch (error) {
        console.error('[LIVESCORE] API Error:', error.message);
        return { success: false, matches: [], error: error.message };
    }
}

// ============================================================
// GET LIVE SCORES WITH CACHE
// ============================================================

async function getLiveScores(forceRefresh = false) {
    if (!forceRefresh && scoresCache.data && scoresCache.timestamp) {
        const age = Date.now() - scoresCache.timestamp;
        if (age < CACHE_DURATION) {
            return scoresCache.data;
        }
    }
    
    const result = await fetchFromAPI();
    
    if (result.success) {
        scoresCache = {
            data: result,
            timestamp: Date.now()
        };
        return result;
    }
    
    return { success: false, matches: [], error: result.error };
}

// ============================================================
// FORMAT ALL MATCHES
// ============================================================

function formatAllMatches(data) {
    const now = moment().tz('Africa/Dar_es_Salaam');
    const date = now.format('DD/MM/YYYY');
    const time = now.format('HH:mm:ss');
    const day = now.format('dddd');
    
    const matches = data.matches || [];
    const totalMatches = data.totalMatches || matches.length;
    
    // Filter by status
    const liveMatches = matches.filter(m => m.status === 'Live' || m.status === '2nd Half' || m.status === '1st Half');
    const todayMatches = matches.filter(m => m.status === 'Not Started' && m.date === date);
    const finishedMatches = matches.filter(m => m.status === 'Full Time');
    
    let message = `╭──❍「 *⚽ LIVE SCORES* 」❍
├ 🟢 *Live Now* : ${liveMatches.length} matches
├ 📅 *Today* : ${todayMatches.length} matches
├ ✅ *Finished* : ${finishedMatches.length} matches
├ 📊 *Total* : ${totalMatches} matches
├ 📅 *Date* : ${date}
├ 📆 *Day* : ${day}
├ ⏰ *Time* : ${time} EAT
╰─┬────❍\n`;
    
    // LIVE MATCHES
    if (liveMatches.length > 0) {
        message += `\n╭─┴─❍「 *🟢 LIVE NOW* 」❍\n`;
        
        for (const match of liveMatches) {
            const homeScore = match.homeScore || '0';
            const awayScore = match.awayScore || '0';
            const minute = match.minute || (match.status === '2nd Half' ? 'HT' : 'LIVE');
            
            let scoreEmoji = '⚽';
            if (parseInt(homeScore) > parseInt(awayScore)) scoreEmoji = '🟢';
            else if (parseInt(homeScore) < parseInt(awayScore)) scoreEmoji = '🔴';
            else if (parseInt(homeScore) > 0) scoreEmoji = '🟡';
            
            message += `├ ${scoreEmoji} *${match.homeTeam}* ${homeScore} - ${awayScore} *${match.awayTeam}*\n`;
            message += `│  ⏱️ ${typeof minute === 'number' ? minute + "'" : minute} | ${match.league}\n`;
            message += `│  ━━━━━━━━━━━━━━━━━━━━━━\n`;
        }
    }
    
    // TODAY'S MATCHES
    if (todayMatches.length > 0) {
        message += `\n╭─┴─❍「 *📅 TODAY'S MATCHES* 」❍\n`;
        
        // Group by league
        const grouped = {};
        for (const match of todayMatches) {
            const league = match.league || 'Other';
            if (!grouped[league]) grouped[league] = [];
            grouped[league].push(match);
        }
        
        for (const [league, leagueMatches] of Object.entries(grouped)) {
            message += `\n├ *${league}*\n`;
            for (const match of leagueMatches) {
                const matchTime = match.time || 'TBD';
                message += `│  ⏰ ${matchTime} | *${match.homeTeam}* vs *${match.awayTeam}*\n`;
            }
        }
    }
    
    // FINISHED MATCHES
    if (finishedMatches.length > 0) {
        message += `\n╭─┴─❍「 *✅ FINISHED* 」❍\n`;
        for (const match of finishedMatches.slice(0, 10)) {
            const homeScore = match.homeScore || '0';
            const awayScore = match.awayScore || '0';
            message += `│  *${match.homeTeam}* ${homeScore} - ${awayScore} *${match.awayTeam}*\n`;
            message += `│  ━━━━━━━━━━━━━━━━━━━━━━\n`;
        }
        if (finishedMatches.length > 10) {
            message += `│  📊 +${finishedMatches.length - 10} more results\n`;
        }
    }
    
    // NO MATCHES
    if (matches.length === 0) {
        message += `\n╭─┴─❍「 *ℹ️ INFO* 」❍
├ ⏳ No matches found from API
╰──────❍`;
    }
    
    message += `\n\n╭─┴─❍「 *📋 COMMANDS* 」❍
│ 🔧 .livescore - All matches
│ 🔧 .livescore live - Live matches only
│ 🔧 .livescore today - Today's matches
│ 🔧 .livescore finished - Finished matches
│ 🔧 .livescore league <name> - Filter by league
│ 🔧 .livescore refresh - Force refresh
╰──────❍
▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`;
    
    return message;
}

// ============================================================
// FORMAT LIVE MATCHES ONLY
// ============================================================

function formatLiveMatches(data) {
    const now = moment().tz('Africa/Dar_es_Salaam');
    const time = now.format('HH:mm:ss');
    
    const matches = (data.matches || []).filter(m => 
        m.status === 'Live' || m.status === '2nd Half' || m.status === '1st Half'
    );
    
    let message = `╭──❍「 *🟢 LIVE MATCHES* 」❍
├ 📊 *Total* : ${matches.length} live matches
├ ⏰ *Time* : ${time} EAT
╰─┬────❍\n`;
    
    if (matches.length === 0) {
        message += `\n╭─┴─❍「 *ℹ️ INFO* 」❍
├ ⏳ No live matches at the moment
╰──────❍`;
    } else {
        for (const match of matches) {
            const homeScore = match.homeScore || '0';
            const awayScore = match.awayScore || '0';
            const minute = match.minute || (match.status === '2nd Half' ? 'HT' : 'LIVE');
            
            let scoreEmoji = '⚽';
            if (parseInt(homeScore) > parseInt(awayScore)) scoreEmoji = '🟢';
            else if (parseInt(homeScore) < parseInt(awayScore)) scoreEmoji = '🔴';
            else if (parseInt(homeScore) > 0) scoreEmoji = '🟡';
            
            message += `\n├ ${scoreEmoji} *${match.homeTeam}* ${homeScore} - ${awayScore} *${match.awayTeam}*\n`;
            message += `│  ⏱️ ${typeof minute === 'number' ? minute + "'" : minute}\n`;
            message += `│  🏆 ${match.league}\n`;
            message += `│  ━━━━━━━━━━━━━━━━━━━━━━\n`;
        }
    }
    
    message += `\n▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`;
    return message;
}

// ============================================================
// FORMAT TODAY'S MATCHES
// ============================================================

function formatTodayMatches(data) {
    const now = moment().tz('Africa/Dar_es_Salaam');
    const date = now.format('DD/MM/YYYY');
    const time = now.format('HH:mm:ss');
    
    const matches = (data.matches || []).filter(m => 
        m.status === 'Not Started' && m.date === date
    );
    
    let message = `╭──❍「 *📅 TODAY'S MATCHES* 」❍
├ 📊 *Total* : ${matches.length} matches
├ 📅 *Date* : ${date}
├ ⏰ *Time* : ${time} EAT
╰─┬────❍\n`;
    
    if (matches.length === 0) {
        message += `\n╭─┴─❍「 *ℹ️ INFO* 」❍
├ ⏳ No matches scheduled today
╰──────❍`;
    } else {
        // Group by league
        const grouped = {};
        for (const match of matches) {
            const league = match.league || 'Other';
            if (!grouped[league]) grouped[league] = [];
            grouped[league].push(match);
        }
        
        for (const [league, leagueMatches] of Object.entries(grouped)) {
            message += `\n├ *${league}*\n`;
            for (const match of leagueMatches) {
                const matchTime = match.time || 'TBD';
                message += `│  ⏰ ${matchTime} | *${match.homeTeam}* vs *${match.awayTeam}*\n`;
            }
        }
    }
    
    message += `\n▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`;
    return message;
}

// ============================================================
// FORMAT FINISHED MATCHES
// ============================================================

function formatFinishedMatches(data) {
    const now = moment().tz('Africa/Dar_es_Salaam');
    const time = now.format('HH:mm:ss');
    
    const matches = (data.matches || []).filter(m => m.status === 'Full Time');
    
    let message = `╭──❍「 *✅ FINISHED MATCHES* 」❍
├ 📊 *Total* : ${matches.length} results
├ ⏰ *Time* : ${time} EAT
╰─┬────❍\n`;
    
    if (matches.length === 0) {
        message += `\n╭─┴─❍「 *ℹ️ INFO* 」❍
├ ⏳ No finished matches
╰──────❍`;
    } else {
        for (const match of matches.slice(0, 20)) {
            const homeScore = match.homeScore || '0';
            const awayScore = match.awayScore || '0';
            message += `\n├ *${match.homeTeam}* ${homeScore} - ${awayScore} *${match.awayTeam}*\n`;
            message += `│  🏆 ${match.league}\n`;
            message += `│  ━━━━━━━━━━━━━━━━━━━━━━\n`;
        }
        if (matches.length > 20) {
            message += `\n│  📊 +${matches.length - 20} more results\n`;
        }
    }
    
    message += `\n▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`;
    return message;
}

// ============================================================
// FORMAT LEAGUE FILTER
// ============================================================

function formatLeagueMatches(data, leagueName) {
    const now = moment().tz('Africa/Dar_es_Salaam');
    const time = now.format('HH:mm:ss');
    
    const matches = (data.matches || []).filter(m => 
        m.league?.toLowerCase().includes(leagueName.toLowerCase())
    );
    
    let message = `╭──❍「 *⚽ ${leagueName.toUpperCase()}* 」❍
├ 📊 *Total* : ${matches.length} matches
├ ⏰ *Time* : ${time} EAT
╰─┬────❍\n`;
    
    if (matches.length === 0) {
        message += `\n╭─┴─❍「 *ℹ️ INFO* 」❍
├ ⏳ No matches found for ${leagueName}
╰──────❍`;
    } else {
        const live = matches.filter(m => m.status === 'Live' || m.status === '2nd Half');
        const upcoming = matches.filter(m => m.status === 'Not Started');
        const finished = matches.filter(m => m.status === 'Full Time');
        
        if (live.length > 0) {
            message += `\n├ 🟢 *LIVE* (${live.length})\n`;
            for (const match of live) {
                const homeScore = match.homeScore || '0';
                const awayScore = match.awayScore || '0';
                message += `│  *${match.homeTeam}* ${homeScore} - ${awayScore} *${match.awayTeam}*\n`;
            }
        }
        
        if (upcoming.length > 0) {
            message += `\n├ 📅 *UPCOMING* (${upcoming.length})\n`;
            for (const match of upcoming) {
                const matchTime = match.time || 'TBD';
                message += `│  ⏰ ${matchTime} | *${match.homeTeam}* vs *${match.awayTeam}*\n`;
            }
        }
        
        if (finished.length > 0) {
            message += `\n├ ✅ *FINISHED* (${finished.length})\n`;
            for (const match of finished.slice(0, 5)) {
                const homeScore = match.homeScore || '0';
                const awayScore = match.awayScore || '0';
                message += `│  *${match.homeTeam}* ${homeScore} - ${awayScore} *${match.awayTeam}*\n`;
            }
        }
    }
    
    message += `\n▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`;
    return message;
}

// ============================================================
// COMMAND EXPORT
// ============================================================

export default {
    name: 'livescore',
    description: 'Get live football scores from API',
    icon: '⚽',
    alias: ['scores', 'livefootball', 'matches', 'football', 'livescores'],
    category: 'general',
    
    async execute(sock, msg, args, currentPrefix, options) {
        const chatId = msg.key.remoteJid;
        const action = args[0]?.toLowerCase();
        const leagueArg = args[1]?.toLowerCase();
        
        // Send loading message
        const loadingMsg = await sock.sendMessage(chatId, { 
            text: `╭──❍「 *⚽ LIVE SCORES* 」❍
├ 🔄 *Fetching from API...*
├ ⏳ Please wait...
╰──────❍
▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`
        });
        
        try {
            const forceRefresh = (action === 'refresh' || action === 'reload');
            const result = await getLiveScores(forceRefresh);
            
            if (!result.success) {
                await sock.sendMessage(chatId, { 
                    text: `╭──❍「 *⚽ LIVE SCORES* 」❍
├ ❌ *API Error*
├ 📝 ${result.error || 'Failed to fetch data'}
╰──────❍
▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`,
                    edit: loadingMsg.key
                });
                return;
            }
            
            // No action - show all matches
            if (!action || action === 'all' || action === 'status') {
                const message = formatAllMatches(result);
                await sock.sendMessage(chatId, { text: message, edit: loadingMsg.key });
                return;
            }
            
            // Live matches only
            if (action === 'live' || action === 'now') {
                const message = formatLiveMatches(result);
                await sock.sendMessage(chatId, { text: message, edit: loadingMsg.key });
                return;
            }
            
            // Today's matches
            if (action === 'today') {
                const message = formatTodayMatches(result);
                await sock.sendMessage(chatId, { text: message, edit: loadingMsg.key });
                return;
            }
            
            // Finished matches
            if (action === 'finished' || action === 'ended' || action === 'results') {
                const message = formatFinishedMatches(result);
                await sock.sendMessage(chatId, { text: message, edit: loadingMsg.key });
                return;
            }
            
            // League filter
            if (action === 'league' && leagueArg) {
                const message = formatLeagueMatches(result, leagueArg);
                await sock.sendMessage(chatId, { text: message, edit: loadingMsg.key });
                return;
            }
            
            // Refresh
            if (action === 'refresh' || action === 'reload') {
                const message = formatAllMatches(result);
                await sock.sendMessage(chatId, { text: message, edit: loadingMsg.key });
                return;
            }
            
            // Quick league filters
            const leagueFilters = ['premier', 'laliga', 'bundesliga', 'seriea', 'ligue1', 'ucl', 'europa', 'eredivisie', 'primeira'];
            if (leagueFilters.includes(action)) {
                const leagueNames = {
                    'premier': 'Premier League',
                    'laliga': 'La Liga',
                    'bundesliga': 'Bundesliga',
                    'seriea': 'Serie A',
                    'ligue1': 'Ligue 1',
                    'ucl': 'Champions League',
                    'europa': 'Europa League',
                    'eredivisie': 'Eredivisie',
                    'primeira': 'Primeira Liga'
                };
                const message = formatLeagueMatches(result, leagueNames[action]);
                await sock.sendMessage(chatId, { text: message, edit: loadingMsg.key });
                return;
            }
            
            // Help
            const helpMsg = `╭──❍「 *⚽ LIVE SCORES HELP* 」❍
├ 📝 *Commands* :
│
│ 🔧 .livescore - All matches
│ 🔧 .livescore live - Live matches only
│ 🔧 .livescore today - Today's matches
│ 🔧 .livescore finished - Finished matches
│ 🔧 .livescore league <name> - Filter by league
│ 🔧 .livescore refresh - Force refresh
│
│ 🏆 *Quick Leagues* :
│ 🔧 .livescore premier
│ 🔧 .livescore laliga
│ 🔧 .livescore bundesliga
│ 🔧 .livescore seriea
│ 🔧 .livescore ligue1
│ 🔧 .livescore ucl
╰──────❍
▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`;
            
            await sock.sendMessage(chatId, { text: helpMsg, edit: loadingMsg.key });
            
        } catch (error) {
            console.error('[LIVESCORE] Error:', error);
            await sock.sendMessage(chatId, { 
                text: `╭──❍「 *⚽ LIVE SCORES* 」❍
├ ❌ *Error*
├ 📝 ${error.message || 'Please try again later'}
╰──────❍
▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`,
                edit: loadingMsg.key
            });
        }
    }
};