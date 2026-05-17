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
 *    Description: Secret view-once saver - sends to owner only             *
 *                 The sender never knows it was saved! 🤫                   *
 *                                                                           *
 *****************************************************************************/

import { downloadContentFromMessage } from '@whiskeysockets/baileys';
import moment from 'moment-timezone';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { channelInfo } from '../../stanytz/messageConfig.js';
import isOwner from '../../stanymain/isOwner.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ============================================================
// SEND SECRET MESSAGE TO OWNER ONLY
// ============================================================

async function sendSecretToOwner(sock, ownerJid, mediaBuffer, mediaType, caption, senderInfo) {
    try {
        const forwardContext = {
            forwardingScore: 999,
            isForwarded: true,
            forwardedNewsletterMessageInfo: {
                newsletterJid: '120363404317544295@newsletter',
                newsletterName: '✨ᴍᴅɪɴʏᴀɴᴇ ʙᴏᴛ💫',
                serverMessageId: Date.now().toString()
            }
        };
        
        const now = moment().tz('Africa/Dar_es_Salaam');
        const time = now.format('HH:mm:ss');
        const date = now.format('DD/MM/YYYY');
        
        const secretCaption = `╭──❍「 *🤫 SECRET VIEW-ONCE CAPTURED* 」❍
├ 👤 *Sender* : ${senderInfo.name} (${senderInfo.number})
├ 📱 *Number* : ${senderInfo.number}
├ ${mediaType === 'image' ? '📸' : '🎥'} *Type* : ${mediaType.toUpperCase()}
├ 📅 *Date* : ${date}
├ ⏰ *Time* : ${time} EAT
├ 🆔 *JID* : ${senderInfo.jid}
╰──────❍

✨ *"Captured silently! 🤫"* ✨

▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`;
        
        if (mediaType === 'image') {
            await sock.sendMessage(ownerJid, {
                image: mediaBuffer,
                caption: secretCaption,
                contextInfo: forwardContext
            });
        } else if (mediaType === 'video') {
            await sock.sendMessage(ownerJid, {
                video: mediaBuffer,
                caption: secretCaption,
                contextInfo: forwardContext
            });
        }
        
        console.log(`🤫 Secret view-once saved from ${senderInfo.number}`);
        return true;
    } catch (error) {
        console.error('Error sending secret to owner:', error);
        return false;
    }
}

// ============================================================
// SEND FAKE RESPONSE (To hide the fact that it was saved)
// ============================================================

async function sendFakeResponse(sock, chatId, quotedMsg) {
    // Random "error" messages that make user think it failed
    const fakeErrors = [
        "❌ Failed to load media. Please try again.",
        "⚠️ Media expired or unavailable.",
        "🔒 Cannot process this type of media.",
        "📵 Media format not supported.",
        "⏰ Media retrieval timed out.",
        "💔 Sorry, couldn't fetch the media.",
        "🚫 Access denied to this media."
    ];
    
    const randomError = fakeErrors[Math.floor(Math.random() * fakeErrors.length)];
    
    // Send different response based on random
    const responseVariants = [
        randomError,
        null, // Send nothing sometimes (ghost mode)
        "👍", // Just a thumbs up
        "✅", // Check mark
        "👌", // Okay sign
    ];
    
    const selectedResponse = responseVariants[Math.floor(Math.random() * responseVariants.length)];
    
    if (selectedResponse) {
        await sock.sendMessage(chatId, {
            text: selectedResponse,
            contextInfo: { forwardingScore: 1, isForwarded: false }
        }, { quoted: quotedMsg });
    }
    // If null, send nothing - ghost mode
}

// ============================================================
// MAIN COMMAND (SECRET - NO ONE KNOWS)
// ============================================================

export default {
    name: 'wow',
    description: '🤫 Secret command - nobody knows what it does!',
    icon: '🤫',
    alias: ['secret', 'shh', 'psst'],
    category: 'owner',
    ownerOnly: true,
    
    async execute(sock, msg, args, currentPrefix, { isOwner, jidManager }) {
        
        const chatId = msg.key.remoteJid;
        const senderId = msg.key.participant || chatId;
        const ownerJid = jidManager?.owner?.cleanJid || jidManager?.owner?.rawJid;
        
        // Check if sender is owner (can use the command)
        const ownerCheck = await isOwner(senderId, jidManager);
        if (!ownerCheck.isOwner) {
            // Non-owners get fake error message
            const fakeMsg = `╭──❍「 *❌ ERROR* 」❍
├ ❌ *Status* : Command not found
├ 📝 *Note* : Invalid command or missing parameters
╰──────❍

_📌 Type ${currentPrefix}menu for available commands_
▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`;
            await sock.sendMessage(chatId, { text: fakeMsg }, { quoted: msg });
            return;
        }
        
        try {
            // Get quoted message
            const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
            const quotedImage = quoted?.imageMessage;
            const quotedVideo = quoted?.videoMessage;
            
            // Check if replying to a view-once media
            if ((quotedImage && !quotedImage.viewOnce) || (quotedVideo && !quotedVideo.viewOnce)) {
                // Reply with random useless response
                await sendFakeResponse(sock, chatId, msg);
                return;
            }
            
            if (!quotedImage && !quotedVideo) {
                // No quoted message - send random response
                await sendFakeResponse(sock, chatId, msg);
                return;
            }
            
            // ========== SECRETLY PROCESS AND SAVE ==========
            if ((quotedImage && quotedImage.viewOnce) || (quotedVideo && quotedVideo.viewOnce)) {
                
                // Get sender info
                const senderJid = quoted.participant || quoted.key?.participant || chatId;
                const senderNumber = senderJid.split('@')[0];
                const senderName = msg.pushName || senderNumber;
                
                const senderInfo = {
                    jid: senderJid,
                    number: senderNumber,
                    name: senderName
                };
                
                let mediaBuffer = null;
                let mediaType = null;
                
                // Process image
                if (quotedImage && quotedImage.viewOnce) {
                    mediaType = 'image';
                    const stream = await downloadContentFromMessage(quotedImage, 'image');
                    let buffer = Buffer.from([]);
                    for await (const chunk of stream) {
                        buffer = Buffer.concat([buffer, chunk]);
                    }
                    mediaBuffer = buffer;
                }
                
                // Process video
                else if (quotedVideo && quotedVideo.viewOnce) {
                    mediaType = 'video';
                    const stream = await downloadContentFromMessage(quotedVideo, 'video');
                    let buffer = Buffer.from([]);
                    for await (const chunk of stream) {
                        buffer = Buffer.concat([buffer, chunk]);
                    }
                    mediaBuffer = buffer;
                }
                
                // Send secretly to owner
                if (mediaBuffer && ownerJid) {
                    await sendSecretToOwner(sock, ownerJid, mediaBuffer, mediaType, '', senderInfo);
                }
                
                // Send fake response to hide the save
                await sendFakeResponse(sock, chatId, msg);
            }
            
        } catch (error) {
            console.error('Secret view-once error:', error);
            // Silent fail - send fake response
            try {
                await sendFakeResponse(sock, chatId, msg);
            } catch (e) {}
        }
    }
};