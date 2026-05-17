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
    "Clone GitHub repos easily! 📦",
    "Download open source projects! 🐙",
    "Get any GitHub repository! ⬇️"
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
    name: 'gitclone',
    description: 'Download GitHub repositories',
    icon: '🐙',
    alias: ['github', 'git', 'repodl'],
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
            const helpMsg = `╭──❍「 *🐙 GITHUB REPO DOWNLOADER* 」❍
├ 📝 *Usage* : ${currentPrefix}gitclone <github_url>
├ 📝 *Example* : ${currentPrefix}gitclone https://github.com/user/repo
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
        
        if (!url.includes('github.com')) {
            await sendForwardedMessage(sock, chatId, `╭──❍「 *🐙 ERROR* 」❍\n├ ❌ Invalid GitHub URL\n╰──────❍\n▰▰▰ *©️ ${botName.toUpperCase()} BY STANY TZ* ▰▰▰`, [], msg);
            return;
        }
        
        await sendForwardedMessage(sock, chatId, `╭──❍「 *🐙 PROCESSING* 」❍\n├ 🔍 Fetching repository...\n╰──────❍\n▰▰▰ *©️ ${botName.toUpperCase()} BY STANY TZ* ▰▰▰`, [], msg);
        
        try {
            const apiUrl = `https://api.princetechn.com/api/download/gitclone?apikey=prince&url=${encodeURIComponent(url)}`;
            const response = await axios.get(apiUrl, { timeout: 60000 });
            
            const data = response.data;
            if (!data || data.status !== 200 || !data.result) throw new Error('API failed');
            
            const repoName = data.result.name;
            const downloadUrl = data.result.download_url;
            
            const tempFile = path.join(TMP_DIR, `${repoName}_${Date.now()}.zip`);
            
            const repoRes = await axios({ method: 'GET', url: downloadUrl, responseType: 'stream' });
            const writer = fs.createWriteStream(tempFile);
            repoRes.data.pipe(writer);
            await new Promise((resolve, reject) => { writer.on('finish', resolve); writer.on('error', reject); });
            
            const stats = fs.statSync(tempFile);
            
            await sock.sendMessage(chatId, {
                document: { url: tempFile },
                mimetype: 'application/zip',
                fileName: `${repoName}.zip`,
                caption: `╭──❍「 *🐙 DOWNLOAD COMPLETE* 」❍\n├ 📦 *Repo* : ${repoName}\n├ ✅ *Status* : Success\n├ 💾 *Size* : ${(stats.size / 1024 / 1024).toFixed(2)} MB\n╰──────❍\n\n✨ *"${randomQuote}"* ✨\n\n▰▰▰ *©️ ${botName.toUpperCase()} BY STANY TZ* ▰▰▰`,
                contextInfo: channelInfo.contextInfo
            }, { quoted: msg });
            
            fs.unlinkSync(tempFile);
        } catch (error) {
            await sendForwardedMessage(sock, chatId, `╭──❍「 *🐙 ERROR* 」❍\n├ ❌ Failed: ${error.message}\n╰──────❍\n▰▰▰ *©️ ${botName.toUpperCase()} BY STANY TZ* ▰▰▰`, [], msg);
        }
    }
};