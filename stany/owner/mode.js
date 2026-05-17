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
    name: 'mode',
    description: 'Change bot mode (public, private, groups, self)',
    icon: '🤖',
    alias: ['botmode', 'setmode'],
    category: 'owner',
    ownerOnly: true,
    
    async execute(sock, msg, args, currentPrefix, { isOwner, jidManager }) {
        
        const chatId = msg.key.remoteJid;
        const senderId = msg.key.participant || chatId;
        
        // Owner check
        const ownerCheck = await isOwner(senderId, jidManager);
        if (!ownerCheck.isOwner) return;
        
        const action = args[0]?.toLowerCase();
        
        // Show current mode
        if (!action || action === 'status') {
            const modeEmoji = config.mode === 'public' ? '🌍' : 
                             config.mode === 'private' ? '💬' : 
                             config.mode === 'groups' ? '👥' : '🔒';
            let modeDesc = '';
            switch(config.mode) {
                case 'public': modeDesc = 'Bot works in BOTH private chats AND groups'; break;
                case 'private': modeDesc = 'Bot works ONLY in private chats (one-on-one)'; break;
                case 'groups': modeDesc = 'Bot works ONLY in groups'; break;
                case 'self': modeDesc = 'Bot works ONLY for owner'; break;
            }
            
            const statusMsg = `╭──❍「 *🤖 BOT MODE* 」❍
├ ${modeEmoji} *Current Mode* : ${config.mode.toUpperCase()}
├ 📝 *Description* : ${modeDesc}
╰─┬────❍
╭─┴─❍「 *📋 AVAILABLE MODES* 」❍
│ 🌍 *public* - Private chats & Groups (default)
│ 💬 *private* - Private chats only
│ 👥 *groups* - Groups only
│ 🔒 *self* - Owner only
╰──────❍
╭─┴─❍「 *📋 COMMANDS* 」❍
│ 🔧 ${currentPrefix}mode public
│ 🔧 ${currentPrefix}mode private
│ 🔧 ${currentPrefix}mode groups
│ 🔧 ${currentPrefix}mode self
╰──────❍

▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`;
            await sendStyledMessage(sock, chatId, statusMsg, [], msg);
            return;
        }
        
        // Change mode
        if (action === 'public') {
            updateConfig({ mode: 'public' });
            await sendStyledMessage(sock, chatId, `╭──❍「 *🤖 BOT MODE* 」❍\n├ 🌍 *Mode* : PUBLIC\n├ 📝 *Bot works in private chats AND groups*\n╰──────❍`, [], msg);
            return;
        }
        
        if (action === 'private') {
            updateConfig({ mode: 'private' });
            await sendStyledMessage(sock, chatId, `╭──❍「 *🤖 BOT MODE* 」❍\n├ 💬 *Mode* : PRIVATE\n├ 📝 *Bot works ONLY in private chats*\n╰──────❍`, [], msg);
            return;
        }
        
        if (action === 'groups') {
            updateConfig({ mode: 'groups' });
            await sendStyledMessage(sock, chatId, `╭──❍「 *🤖 BOT MODE* 」❍\n├ 👥 *Mode* : GROUPS\n├ 📝 *Bot works ONLY in groups*\n╰──────❍`, [], msg);
            return;
        }
        
        if (action === 'self') {
            updateConfig({ mode: 'self' });
            await sendStyledMessage(sock, chatId, `╭──❍「 *🤖 BOT MODE* 」❍\n├ 🔒 *Mode* : SELF\n├ 📝 *Bot works ONLY for owner*\n╰──────❍`, [], msg);
            return;
        }
        
        await sendStyledMessage(sock, chatId, `╭──❍「 *🤖 BOT MODE* 」❍\n├ ❌ *Invalid mode* : ${action}\n├ 📝 *Use* : ${currentPrefix}mode public|private|groups|self\n╰──────❍`, [], msg);
    }
};