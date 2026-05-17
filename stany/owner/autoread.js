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
    name: 'autoread',
    description: 'Configure auto read messages feature',
    icon: '👁️',
    alias: ['autoreadmsg', 'readmsg', 'autoseen'],
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
            const statusMsg = `╭──❍「 *👁️ AUTO READ CONFIG* 」❍
├ 📝 *Status* : ${config.autoRead ? '✅ ENABLED' : '❌ DISABLED'}
├ 👥 *Groups* : ${config.autoReadGroups ? '✅' : '❌'}
├ 💬 *Private* : ${config.autoReadPrivate ? '✅' : '❌'}
╰─┬────❍
╭─┴─❍「 *📋 COMMANDS* 」❍
│ 🔧 ${currentPrefix}autoread on - Enable
│ 🔧 ${currentPrefix}autoread off - Disable
│ 🔧 ${currentPrefix}autoread groups on/off - Toggle groups
│ 🔧 ${currentPrefix}autoread private on/off - Toggle private
╰──────❍

_📌 Bot will automatically mark messages as read_
▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`;
            await sendStyledMessage(sock, chatId, statusMsg, [], msg);
            return;
        }
        
        // Enable
        if (action === 'on') {
            if (config.autoRead) {
                await sendStyledMessage(sock, chatId, `╭──❍「 *👁️ AUTO READ* 」❍\n├ ⚠️ *Status* : Already ENABLED\n╰──────❍`, [], msg);
                return;
            }
            updateConfig({ autoRead: true });
            await sendStyledMessage(sock, chatId, `╭──❍「 *👁️ AUTO READ* 」❍\n├ ✅ *Status* : ENABLED\n╰──────❍`, [], msg);
            return;
        }
        
        // Disable
        if (action === 'off') {
            if (!config.autoRead) {
                await sendStyledMessage(sock, chatId, `╭──❍「 *👁️ AUTO READ* 」❍\n├ ⚠️ *Status* : Already DISABLED\n╰──────❍`, [], msg);
                return;
            }
            updateConfig({ autoRead: false });
            await sendStyledMessage(sock, chatId, `╭──❍「 *👁️ AUTO READ* 」❍\n├ ❌ *Status* : DISABLED\n╰──────❍`, [], msg);
            return;
        }
        
        // Groups toggle
        if (action === 'groups') {
            const subAction = args[1]?.toLowerCase();
            if (subAction === 'on') {
                updateConfig({ autoReadGroups: true });
                await sendStyledMessage(sock, chatId, `╭──❍「 *👁️ AUTO READ* 」❍\n├ ✅ *Groups* : ENABLED\n╰──────❍`, [], msg);
            } else if (subAction === 'off') {
                updateConfig({ autoReadGroups: false });
                await sendStyledMessage(sock, chatId, `╭──❍「 *👁️ AUTO READ* 」❍\n├ ❌ *Groups* : DISABLED\n╰──────❍`, [], msg);
            } else {
                await sendStyledMessage(sock, chatId, `╭──❍「 *👁️ AUTO READ* 」❍\n├ ❌ *Usage* : ${currentPrefix}autoread groups on/off\n╰──────❍`, [], msg);
            }
            return;
        }
        
        // Private toggle
        if (action === 'private') {
            const subAction = args[1]?.toLowerCase();
            if (subAction === 'on') {
                updateConfig({ autoReadPrivate: true });
                await sendStyledMessage(sock, chatId, `╭──❍「 *👁️ AUTO READ* 」❍\n├ ✅ *Private* : ENABLED\n╰──────❍`, [], msg);
            } else if (subAction === 'off') {
                updateConfig({ autoReadPrivate: false });
                await sendStyledMessage(sock, chatId, `╭──❍「 *👁️ AUTO READ* 」❍\n├ ❌ *Private* : DISABLED\n╰──────❍`, [], msg);
            } else {
                await sendStyledMessage(sock, chatId, `╭──❍「 *👁️ AUTO READ* 」❍\n├ ❌ *Usage* : ${currentPrefix}autoread private on/off\n╰──────❍`, [], msg);
            }
            return;
        }
        
        await sendStyledMessage(sock, chatId, `╭──❍「 *👁️ AUTO READ* 」❍\n├ ❌ *Invalid command* : ${action}\n├ 📝 *Use* : ${currentPrefix}autoread for help\n╰──────❍`, [], msg);
    }
};