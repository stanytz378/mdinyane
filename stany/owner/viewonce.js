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

import { downloadContentFromMessage } from '@whiskeysockets/baileys';
import moment from 'moment-timezone';
import { channelInfo } from '../../stanytz/messageConfig.js';

// ============================================================
// QUOTES
// ============================================================
const QUOTES = [
    "I'm not lazy, I'm just on my energy saving mode.",
    "Life is short, smile while you still have teeth.",
    "View once? Not anymore! 👀",
    "Nothing is truly view-once! 😏",
    "Privacy? What privacy? 🔓",
    "Saving disappearing media like a boss! 💪",
    "View once media? I got you covered! 📸"
];

const getRandomQuote = () => QUOTES[Math.floor(Math.random() * QUOTES.length)];

// ============================================================
// SEND WITH FORWARDED MARK (from messageConfig.js)
// ============================================================

async function sendForwardedMessage(sock, chatId, text, mentions = [], quoted = null) {
    try {
        await sock.sendMessage(chatId, {
            text: text,
            contextInfo: channelInfo.contextInfo,
            mentions: mentions
        }, { quoted: quoted });
    } catch (error) {
        await sock.sendMessage(chatId, {
            text: text,
            mentions: mentions
        }, { quoted: quoted });
    }
}

// ============================================================
// MAIN COMMAND
// ============================================================

export default {
    name: 'viewonce',
    description: 'Re-send a view-once image or video',
    icon: '👁️',
    alias: ['viewmedia', 'vv', 'vonce'],
    category: 'general',
    
    async execute(sock, msg, args, currentPrefix, { BOT_NAME, VERSION }) {
        
        const chatId = msg.key.remoteJid;
        const sender = msg.key.participant || chatId;
        const randomQuote = getRandomQuote();
        
        // Get current time (East Africa Time)
        const now = moment().tz('Africa/Dar_es_Salaam');
        const date = now.format('DD/MM/YYYY');
        const day = now.format('dddd');
        const time = now.format('HH:mm:ss');
        
        const botName = BOT_NAME || 'MDINYANE';
        
        try {
            // Get quoted message
            const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
            const quotedImage = quoted?.imageMessage;
            const quotedVideo = quoted?.videoMessage;
            
            // ========== NO VIEW-ONCE MEDIA FOUND ==========
            if (!quotedImage && !quotedVideo) {
                const helpMsg = `╭──❍「 *👁️ VIEW ONCE SAVER* 」❍
├ 📝 *Usage* : Reply to a view-once media with ${currentPrefix}viewonce
├ 📝 *Example* : Reply to a disappearing photo/video then type ${currentPrefix}vv
╰─┬────❍
╭─┴─❍「 *📋 COMMANDS* 」❍
│ 🔧 ${currentPrefix}viewonce - Save view-once image/video
│ 🔧 ${currentPrefix}vv - Shortcut
│ 🔧 ${currentPrefix}vonce - Shortcut
╰──────❍
╭─┴─❍「 *📊 INFO* 」❍
├ 📅 *Date* : ${date}
├ 📆 *Day* : ${day}
├ ⏰ *Time* : ${time} EAT
├ 📸 *Supports* : Images & Videos
╰──────❍

✨ *"${randomQuote}"* ✨

_📌 Reply to any view-once media to save it_
▰▰▰ *©️ ${botName.toUpperCase()} BY STANY TZ* ▰▰▰`;
                await sendForwardedMessage(sock, chatId, helpMsg, [], msg);
                return;
            }
            
            // ========== CHECK IF REPLYING TO VIEW-ONCE MEDIA ==========
            if ((quotedImage && !quotedImage.viewOnce) || (quotedVideo && !quotedVideo.viewOnce)) {
                const notViewOnceMsg = `╭──❍「 *👁️ VIEW ONCE SAVER* 」❍
├ ❌ *Error* : This is not a view-once media
├ 📝 *Note* : Only works with disappearing photos/videos
╰──────❍

✨ *"${randomQuote}"* ✨

_📌 Reply to a view-once media (disappearing photo/video)_
▰▰▰ *©️ ${botName.toUpperCase()} BY STANY TZ* ▰▰▰`;
                await sendForwardedMessage(sock, chatId, notViewOnceMsg, [], msg);
                return;
            }
            
            // ========== PROCESS IMAGE ==========
            if (quotedImage && quotedImage.viewOnce) {
                const processingMsg = `╭──❍「 *👁️ VIEW ONCE SAVER* 」❍
├ 📸 *Type* : Image
├ ⏳ *Status* : Processing...
╰──────❍

_📌 Saving disappearing image..._
▰▰▰ *©️ ${botName.toUpperCase()} BY STANY TZ* ▰▰▰`;
                await sendForwardedMessage(sock, chatId, processingMsg, [], msg);
                
                const stream = await downloadContentFromMessage(quotedImage, 'image');
                let buffer = Buffer.from([]);
                for await (const chunk of stream) {
                    buffer = Buffer.concat([buffer, chunk]);
                }
                
                const successCaption = `╭──❍「 *👁️ VIEW ONCE SAVED* 」❍
├ 📸 *Type* : Image
├ ✅ *Status* : Successfully saved
╰──────❍

✨ *"${randomQuote}"* ✨

_📌 View-once media saved successfully!_
▰▰▰ *©️ ${botName.toUpperCase()} BY STANY TZ* ▰▰▰`;
                
                await sock.sendMessage(chatId, {
                    image: buffer,
                    fileName: 'viewonce.jpg',
                    caption: successCaption,
                    contextInfo: channelInfo.contextInfo,
                    mentions: [sender]
                }, { quoted: msg });
            }
            
            // ========== PROCESS VIDEO ==========
            else if (quotedVideo && quotedVideo.viewOnce) {
                const processingMsg = `╭──❍「 *👁️ VIEW ONCE SAVER* 」❍
├ 🎥 *Type* : Video
├ ⏳ *Status* : Processing...
╰──────❍

_📌 Saving disappearing video..._
▰▰▰ *©️ ${botName.toUpperCase()} BY STANY TZ* ▰▰▰`;
                await sendForwardedMessage(sock, chatId, processingMsg, [], msg);
                
                const stream = await downloadContentFromMessage(quotedVideo, 'video');
                let buffer = Buffer.from([]);
                for await (const chunk of stream) {
                    buffer = Buffer.concat([buffer, chunk]);
                }
                
                const successCaption = `╭──❍「 *👁️ VIEW ONCE SAVED* 」❍
├ 🎥 *Type* : Video
├ ✅ *Status* : Successfully saved
╰──────❍

✨ *"${randomQuote}"* ✨

_📌 View-once media saved successfully!_
▰▰▰ *©️ ${botName.toUpperCase()} BY STANY TZ* ▰▰▰`;
                
                await sock.sendMessage(chatId, {
                    video: buffer,
                    fileName: 'viewonce.mp4',
                    caption: successCaption,
                    contextInfo: channelInfo.contextInfo,
                    mentions: [sender]
                }, { quoted: msg });
            }
            
        } catch (error) {
            console.error('Error in viewonceCommand:', error);
            
            const errorMsg = `╭──❍「 *👁️ VIEW ONCE SAVER* 」❍
├ ❌ *Error* : Failed to retrieve view-once media
├ 📝 *Reason* : ${error.message.substring(0, 50)}
╰──────❍

✨ *"${randomQuote}"* ✨

_📌 Please try again later or make sure the media still exists_
▰▰▰ *©️ ${botName.toUpperCase()} BY STANY TZ* ▰▰▰`;
            await sendForwardedMessage(sock, chatId, errorMsg, [], msg);
        }
    }
};