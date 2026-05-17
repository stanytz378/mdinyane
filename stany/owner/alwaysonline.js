/*****************************************************************************
 *                     Developed By STANY TZ                                 *
 *****************************************************************************/

import fs from 'fs';
import path from 'path';
import { channelInfo, botImagePath } from '../../stanytz/messageConfig.js';
import isOwner from '../../stanymain/isOwner.js';
import { config, updateConfig } from '../../stanycore/config.js';

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
        await sock.sendMessage(chatId, {
            text: text,
            mentions: mentions
        }, { quoted: quoted });
    }
}

export default {
    name: 'alwaysonline',
    description: 'Keep bot online 24/7',
    icon: '🟢',
    alias: ['online', 'stayonline'],
    category: 'owner',
    ownerOnly: true,
    
    async execute(sock, msg, args, currentPrefix, { isOwner, jidManager }) {
        
        const chatId = msg.key.remoteJid;
        const senderId = msg.key.participant || chatId;
        
        // Owner check
        const ownerCheck = await isOwner(senderId, jidManager);
        if (!ownerCheck.isOwner) return;
        
        const action = args[0]?.toLowerCase();
        
        // Show status
        if (!action || action === 'status') {
            const statusMsg = `╭──❍「 *🟢 ALWAYS ONLINE* 」❍
├ 📝 *Status* : ${config.alwaysOnline ? '✅ ENABLED' : '❌ DISABLED'}
╰─┬────❍
╭─┴─❍「 *📋 COMMANDS* 」❍
│ 🔧 ${currentPrefix}alwaysonline on - Enable
│ 🔧 ${currentPrefix}alwaysonline off - Disable
╰──────❍

_📌 Bot will stay online 24/7_
▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`;
            await sendStyledMessage(sock, chatId, statusMsg, [], msg);
            return;
        }
        
        // Enable
        if (action === 'on') {
            if (config.alwaysOnline) {
                await sendStyledMessage(sock, chatId, `╭──❍「 *🟢 ALWAYS ONLINE* 」❍\n├ ⚠️ *Status* : Already ENABLED\n╰──────❍`, [], msg);
                return;
            }
            updateConfig({ alwaysOnline: true });
            await sendStyledMessage(sock, chatId, `╭──❍「 *🟢 ALWAYS ONLINE* 」❍\n├ ✅ *Status* : ENABLED\n├ 📝 *Bot will stay online 24/7*\n╰──────❍`, [], msg);
            return;
        }
        
        // Disable
        if (action === 'off') {
            if (!config.alwaysOnline) {
                await sendStyledMessage(sock, chatId, `╭──❍「 *🟢 ALWAYS ONLINE* 」❍\n├ ⚠️ *Status* : Already DISABLED\n╰──────❍`, [], msg);
                return;
            }
            updateConfig({ alwaysOnline: false });
            await sendStyledMessage(sock, chatId, `╭──❍「 *🟢 ALWAYS ONLINE* 」❍\n├ ❌ *Status* : DISABLED\n╰──────❍`, [], msg);
            return;
        }
        
        await sendStyledMessage(sock, chatId, `╭──❍「 *🟢 ALWAYS ONLINE* 」❍\n├ ❌ *Invalid command* : ${action}\n├ 📝 *Use* : ${currentPrefix}alwaysonline for help\n╰──────❍`, [], msg);
    }
};