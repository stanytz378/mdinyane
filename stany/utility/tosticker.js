/*****************************************************************************
 *                     Developed By STANY TZ                                 *
 *****************************************************************************/

import { downloadContentFromMessage } from '@whiskeysockets/baileys';
import moment from 'moment-timezone';
import { channelInfo } from '../../stanytz/messageConfig.js';

async function sendStyledMessage(sock, chatId, text, mentions = [], quoted = null) {
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
    name: 'tosticker',
    description: 'Convert image to sticker with custom packname',
    icon: '🎨',
    alias: ['sticker2', 's2'],
    category: 'group',
    
    async execute(sock, msg, args, currentPrefix) {
        const chatId = msg.key.remoteJid;
        
        const quotedMsg = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        let imageMsg = quotedMsg?.imageMessage || msg.message?.imageMessage;
        
        if (!imageMsg) {
            await sendStyledMessage(sock, chatId, `╭──❍「 *🎨 TOSTICKER* 」❍
├ 📝 Reply to an image with ${currentPrefix}tosticker
├ 📝 Optional: Add packname and author
├ 📝 Example: ${currentPrefix}tosticker MyPack MyAuthor
╰──────❍`, [], msg);
            return;
        }
        
        let packname = 'MDINYANE';
        let author = 'STANY TZ';
        
        if (args.length >= 1) packname = args[0];
        if (args.length >= 2) author = args.slice(1).join(' ');
        
        try {
            const stream = await downloadContentFromMessage(imageMsg, 'image');
            let buffer = Buffer.from([]);
            for await (const chunk of stream) {
                buffer = Buffer.concat([buffer, chunk]);
            }
            
            await sock.sendMessage(chatId, {
                sticker: buffer,
                contextInfo: {
                    ...channelInfo.contextInfo,
                    externalAdReply: {
                        title: packname,
                        body: author,
                        mediaType: 1
                    }
                }
            });
        } catch (error) {
            await sendStyledMessage(sock, chatId, `╭──❍「 *🎨 TOSTICKER* 」❍\n├ ❌ Failed: ${error.message}\n╰──────❍`, [], msg);
        }
    }
};