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
    name: 'autorecording',
    description: 'Configure auto recording feature',
    icon: '🎙️',
    alias: ['autorecord', 'record'],
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
            const locationEmoji = config.autoRecordingLocation === 'both' ? '🌍' : 
                                 config.autoRecordingLocation === 'private' ? '💬' : '👥';
            let locationText = '';
            switch(config.autoRecordingLocation) {
                case 'both': locationText = 'Private chats & Groups'; break;
                case 'private': locationText = 'Private chats only'; break;
                case 'groups': locationText = 'Groups only'; break;
            }
            
            const statusMsg = `╭──❍「 *🎙️ AUTO RECORDING CONFIG* 」❍
├ 📝 *Status* : ${config.autoRecording ? '✅ ENABLED' : '❌ DISABLED'}
├ ${locationEmoji} *Location* : ${locationText}
╰─┬────❍
╭─┴─❍「 *📋 COMMANDS* 」❍
│ 🔧 ${currentPrefix}autorecording on - Enable
│ 🔧 ${currentPrefix}autorecording off - Disable
│ 🔧 ${currentPrefix}autorecording both - DM & Groups
│ 🔧 ${currentPrefix}autorecording private - DM only
│ 🔧 ${currentPrefix}autorecording groups - Groups only
╰──────❍

_📌 Bot will show recording indicator before responding_
▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`;
            await sendStyledMessage(sock, chatId, statusMsg, [], msg);
            return;
        }
        
        // Enable
        if (action === 'on') {
            if (config.autoRecording) {
                await sendStyledMessage(sock, chatId, `╭──❍「 *🎙️ AUTO RECORDING* 」❍\n├ ⚠️ *Status* : Already ENABLED\n╰──────❍`, [], msg);
                return;
            }
            updateConfig({ autoRecording: true });
            await sendStyledMessage(sock, chatId, `╭──❍「 *🎙️ AUTO RECORDING* 」❍\n├ ✅ *Status* : ENABLED\n├ 📝 *Location* : ${config.autoRecordingLocation === 'both' ? 'DM & Groups' : config.autoRecordingLocation === 'private' ? 'DM only' : 'Groups only'}\n╰──────❍`, [], msg);
            return;
        }
        
        // Disable
        if (action === 'off') {
            if (!config.autoRecording) {
                await sendStyledMessage(sock, chatId, `╭──❍「 *🎙️ AUTO RECORDING* 」❍\n├ ⚠️ *Status* : Already DISABLED\n╰──────❍`, [], msg);
                return;
            }
            updateConfig({ autoRecording: false });
            await sendStyledMessage(sock, chatId, `╭──❍「 *🎙️ AUTO RECORDING* 」❍\n├ ❌ *Status* : DISABLED\n╰──────❍`, [], msg);
            return;
        }
        
        // Set location
        if (action === 'both') {
            updateConfig({ autoRecordingLocation: 'both' });
            await sendStyledMessage(sock, chatId, `╭──❍「 *🎙️ AUTO RECORDING* 」❍\n├ 🌍 *Location* : BOTH (DM & Groups)\n├ 📝 *Recording will show in all chats*\n╰──────❍`, [], msg);
            return;
        }
        
        if (action === 'private') {
            updateConfig({ autoRecordingLocation: 'private' });
            await sendStyledMessage(sock, chatId, `╭──❍「 *🎙️ AUTO RECORDING* 」❍\n├ 💬 *Location* : PRIVATE ONLY\n├ 📝 *Recording will show only in direct messages*\n╰──────❍`, [], msg);
            return;
        }
        
        if (action === 'groups') {
            updateConfig({ autoRecordingLocation: 'groups' });
            await sendStyledMessage(sock, chatId, `╭──❍「 *🎙️ AUTO RECORDING* 」❍\n├ 👥 *Location* : GROUPS ONLY\n├ 📝 *Recording will show only in groups*\n╰──────❍`, [], msg);
            return;
        }
        
        await sendStyledMessage(sock, chatId, `╭──❍「 *🎙️ AUTO RECORDING* 」❍\n├ ❌ *Invalid command* : ${action}\n├ 📝 *Use* : ${currentPrefix}autorecording for help\n╰──────❍`, [], msg);
    }
};