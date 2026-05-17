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

import fs from 'fs';
import path from 'path';
import moment from 'moment-timezone';
import { fileURLToPath } from 'url';
import { downloadContentFromMessage } from '@whiskeysockets/baileys';
import { writeFile } from 'fs/promises';
import { channelInfo, botImagePath } from '../../stanytz/messageConfig.js';
import isOwner from '../../stanymain/isOwner.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Data directory
const DATA_DIR = path.join(process.cwd(), 'stanydata');
const ANTIDELETE_FILE = path.join(DATA_DIR, 'antidelete.json');
const TEMP_MEDIA_DIR = path.join(DATA_DIR, 'temp_media');

if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}
if (!fs.existsSync(TEMP_MEDIA_DIR)) {
    fs.mkdirSync(TEMP_MEDIA_DIR, { recursive: true });
}

// Message store for deleted messages
const messageStore = new Map();

// ============================================================
// QUOTES
// ============================================================
const QUOTES = [
    "I'm not lazy, I'm just on my energy saving mode.",
    "Life is short, smile while you still have teeth.",
    "Nothing gets deleted on my watch! 👀",
    "Anti-delete is watching you! 🔍",
    "Deleted messages? Not today! 📝"
];

const getRandomQuote = () => QUOTES[Math.floor(Math.random() * QUOTES.length)];

// ============================================================
// SEND WITH IMAGE AND FORWARDED MARK
// ============================================================

async function sendStyledMessage(sock, chatId, text, mentions = [], quoted = null) {
    try {
        const imageFullPath = path.join(process.cwd(), botImagePath);
        const imageExists = fs.existsSync(imageFullPath);
        
        if (imageExists) {
            await sock.sendMessage(chatId, {
                image: fs.readFileSync(imageFullPath),
                caption: text,
                contextInfo: channelInfo.contextInfo,
                mentions: mentions
            }, { quoted: quoted });
        } else {
            await sock.sendMessage(chatId, {
                text: text,
                contextInfo: channelInfo.contextInfo,
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

// ============================================================
// UTILITY FUNCTIONS
// ============================================================

const getFolderSizeInMB = (folderPath) => {
    try {
        const files = fs.readdirSync(folderPath);
        let totalSize = 0;
        for (const file of files) {
            const filePath = path.join(folderPath, file);
            if (fs.statSync(filePath).isFile()) {
                totalSize += fs.statSync(filePath).size;
            }
        }
        return totalSize / (1024 * 1024);
    } catch {
        return 0;
    }
};

const cleanTempFolderIfLarge = () => {
    try {
        const sizeMB = getFolderSizeInMB(TEMP_MEDIA_DIR);
        if (sizeMB > 200) {
            const files = fs.readdirSync(TEMP_MEDIA_DIR);
            for (const file of files) {
                const filePath = path.join(TEMP_MEDIA_DIR, file);
                fs.unlinkSync(filePath);
            }
            console.log('🧹 Temp folder cleaned');
        }
    } catch (err) {
        console.error('Temp cleanup error:', err);
    }
};

setInterval(cleanTempFolderIfLarge, 60 * 1000);

// ============================================================
// CONFIG FUNCTIONS
// ============================================================

async function loadAntideleteConfig() {
    try {
        if (fs.existsSync(ANTIDELETE_FILE)) {
            return JSON.parse(fs.readFileSync(ANTIDELETE_FILE, 'utf8'));
        }
        return { enabled: false };
    } catch {
        return { enabled: false };
    }
}

async function saveAntideleteConfig(config) {
    try {
        fs.writeFileSync(ANTIDELETE_FILE, JSON.stringify(config, null, 2));
        return true;
    } catch (error) {
        console.error('Config save error:', error);
        return false;
    }
}

// ============================================================
// STORE MESSAGE
// ============================================================

export async function storeMessage(sock, message) {
    try {
        const config = await loadAntideleteConfig();
        if (!config.enabled) return;
        
        if (!message.key?.id) return;
        
        const messageId = message.key.id;
        let content = '';
        let mediaType = '';
        let mediaPath = '';
        let isViewOnce = false;
        const sender = message.key.participant || message.key.remoteJid;
        const viewOnceContainer = message.message?.viewOnceMessageV2?.message || message.message?.viewOnceMessage?.message;
        
        if (viewOnceContainer) {
            if (viewOnceContainer.imageMessage) {
                mediaType = 'image';
                content = viewOnceContainer.imageMessage.caption || '';
                const stream = await downloadContentFromMessage(viewOnceContainer.imageMessage, 'image');
                let buffer = Buffer.from([]);
                for await (const chunk of stream) {
                    buffer = Buffer.concat([buffer, chunk]);
                }
                mediaPath = path.join(TEMP_MEDIA_DIR, `${messageId}.jpg`);
                await writeFile(mediaPath, buffer);
                isViewOnce = true;
            } else if (viewOnceContainer.videoMessage) {
                mediaType = 'video';
                content = viewOnceContainer.videoMessage.caption || '';
                const stream = await downloadContentFromMessage(viewOnceContainer.videoMessage, 'video');
                let buffer = Buffer.from([]);
                for await (const chunk of stream) {
                    buffer = Buffer.concat([buffer, chunk]);
                }
                mediaPath = path.join(TEMP_MEDIA_DIR, `${messageId}.mp4`);
                await writeFile(mediaPath, buffer);
                isViewOnce = true;
            }
        }
        else if (message.message?.conversation) {
            content = message.message.conversation;
        }
        else if (message.message?.extendedTextMessage?.text) {
            content = message.message.extendedTextMessage.text;
        }
        else if (message.message?.imageMessage) {
            mediaType = 'image';
            content = message.message.imageMessage.caption || '';
            const stream = await downloadContentFromMessage(message.message.imageMessage, 'image');
            let buffer = Buffer.from([]);
            for await (const chunk of stream) {
                buffer = Buffer.concat([buffer, chunk]);
            }
            mediaPath = path.join(TEMP_MEDIA_DIR, `${messageId}.jpg`);
            await writeFile(mediaPath, buffer);
        }
        else if (message.message?.stickerMessage) {
            mediaType = 'sticker';
            const stream = await downloadContentFromMessage(message.message.stickerMessage, 'sticker');
            let buffer = Buffer.from([]);
            for await (const chunk of stream) {
                buffer = Buffer.concat([buffer, chunk]);
            }
            mediaPath = path.join(TEMP_MEDIA_DIR, `${messageId}.webp`);
            await writeFile(mediaPath, buffer);
        }
        else if (message.message?.videoMessage) {
            mediaType = 'video';
            content = message.message.videoMessage.caption || '';
            const stream = await downloadContentFromMessage(message.message.videoMessage, 'video');
            let buffer = Buffer.from([]);
            for await (const chunk of stream) {
                buffer = Buffer.concat([buffer, chunk]);
            }
            mediaPath = path.join(TEMP_MEDIA_DIR, `${messageId}.mp4`);
            await writeFile(mediaPath, buffer);
        }
        else if (message.message?.audioMessage) {
            mediaType = 'audio';
            const mime = message.message.audioMessage.mimetype || '';
            const ext = mime.includes('mpeg') ? 'mp3' : (mime.includes('ogg') ? 'ogg' : 'mp3');
            const stream = await downloadContentFromMessage(message.message.audioMessage, 'audio');
            let buffer = Buffer.from([]);
            for await (const chunk of stream) {
                buffer = Buffer.concat([buffer, chunk]);
            }
            mediaPath = path.join(TEMP_MEDIA_DIR, `${messageId}.${ext}`);
            await writeFile(mediaPath, buffer);
        }

        messageStore.set(messageId, {
            content,
            mediaType,
            mediaPath,
            sender,
            group: message.key.remoteJid.endsWith('@g.us') ? message.key.remoteJid : null,
            timestamp: new Date().toISOString()
        });

        if (isViewOnce && mediaType && fs.existsSync(mediaPath)) {
            try {
                const ownerNumber = `${sock.user.id.split(':')[0]}@s.whatsapp.net`;
                const senderName = sender.split('@')[0];
                const randomQuote = getRandomQuote();
                const mediaOptions = {
                    caption: `╭──❍「 *👁️ VIEWONCE* 」❍
├ 📱 From: @${senderName}
├ 📝 Type: ${mediaType}
╰──────❍

✨ *"${randomQuote}"* ✨

▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`,
                    mentions: [sender],
                    contextInfo: channelInfo.contextInfo
                };
                
                if (mediaType === 'image') {
                    await sock.sendMessage(ownerNumber, { image: { url: mediaPath }, ...mediaOptions });
                } else if (mediaType === 'video') {
                    await sock.sendMessage(ownerNumber, { video: { url: mediaPath }, ...mediaOptions });
                }
                
                try { fs.unlinkSync(mediaPath); } catch {}
            } catch (e) {}
        }
    } catch (err) {
        console.error('storeMessage error:', err);
    }
}

// ============================================================
// HANDLE MESSAGE REVOCATION - SINGLE EXPORT
// ============================================================

export async function handleMessageRevocation(sock, revocationMessage) {
    try {
        const config = await loadAntideleteConfig();
        if (!config.enabled) return;
        
        const messageId = revocationMessage.message.protocolMessage.key.id;
        const deletedBy = revocationMessage.participant || revocationMessage.key.participant || revocationMessage.key.remoteJid;
        const ownerNumber = `${sock.user.id.split(':')[0]}@s.whatsapp.net`;
        
        if (deletedBy.includes(sock.user.id) || deletedBy === ownerNumber) return;
        
        const original = messageStore.get(messageId);
        if (!original) return;
        
        const sender = original.sender;
        const senderName = sender.split('@')[0];
        const deletedByName = deletedBy.split('@')[0];
        
        let groupName = '';
        if (original.group) {
            try {
                const metadata = await sock.groupMetadata(original.group);
                groupName = metadata.subject;
            } catch {}
        }
        
        const now = moment().tz('Africa/Dar_es_Salaam');
        const time = now.format('HH:mm:ss');
        const date = now.format('DD/MM/YYYY');
        const randomQuote = getRandomQuote();
        
        let reportMsg = `╭──❍「 *🔰 ANTIDELETE* 」❍
├ 🗑️ Deleted By: @${deletedByName}
├ 👤 Sender: @${senderName}
├ 🕒 Time: ${time}
├ 📅 Date: ${date}
╰─┬────❍`;
        
        if (groupName) {
            reportMsg += `\n╭─┴─❍「 *👥 GROUP* 」❍
├ 📛 ${groupName}
╰──────❍`;
        }

        if (original.content) {
            reportMsg += `\n╭─┴─❍「 *💬 MESSAGE* 」❍
├ 📝 ${original.content.substring(0, 150)}
╰──────❍`;
        }

        reportMsg += `\n\n✨ *"${randomQuote}"* ✨\n\n▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`;

        await sendStyledMessage(sock, ownerNumber, reportMsg, [deletedBy, sender]);

        if (original.mediaType && fs.existsSync(original.mediaPath)) {
            try {
                switch (original.mediaType) {
                    case 'image':
                        await sock.sendMessage(ownerNumber, {
                            image: { url: original.mediaPath },
                            caption: `*DELETED ${original.mediaType.toUpperCase()}*`,
                            contextInfo: channelInfo.contextInfo
                        });
                        break;
                    case 'sticker':
                        await sock.sendMessage(ownerNumber, {
                            sticker: { url: original.mediaPath },
                            contextInfo: channelInfo.contextInfo
                        });
                        break;
                    case 'video':
                        await sock.sendMessage(ownerNumber, {
                            video: { url: original.mediaPath },
                            caption: `*DELETED ${original.mediaType.toUpperCase()}*`,
                            contextInfo: channelInfo.contextInfo
                        });
                        break;
                    case 'audio':
                        await sock.sendMessage(ownerNumber, {
                            audio: { url: original.mediaPath },
                            mimetype: 'audio/mpeg',
                            ptt: false,
                            contextInfo: channelInfo.contextInfo
                        });
                        break;
                }
            } catch (err) {
                await sock.sendMessage(ownerNumber, {
                    text: `⚠️ Error sending media: ${err.message}`,
                    contextInfo: channelInfo.contextInfo
                });
            }
            
            try { fs.unlinkSync(original.mediaPath); } catch {}
        }
        
        messageStore.delete(messageId);
    } catch (err) {
        console.error('handleMessageRevocation error:', err);
    }
}

// ============================================================
// COMMAND HANDLER
// ============================================================

export default {
    name: 'antidelete',
    description: 'Enable or disable antidelete feature to track deleted messages',
    icon: '🔰',
    alias: ['antidel', 'adel', 'deletetracker'],
    category: 'owner',
    ownerOnly: true,
    
    async execute(sock, msg, args, currentPrefix, { BOT_NAME, VERSION, isOwner, jidManager }) {
        
        const chatId = msg.key.remoteJid;
        const senderId = msg.key.participant || chatId;
        
        const ownerCheck = await isOwner(senderId, jidManager);
        if (!ownerCheck.isOwner) {
            const notAuthMsg = `╭──❍「 *🔰 ANTIDELETE* 」❍
├ 👤 @${senderId.split('@')[0]}
├ ❌ Owner only command!
╰──────❍

▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`;
            await sendStyledMessage(sock, chatId, notAuthMsg, [senderId], msg);
            return;
        }
        
        const now = moment().tz('Africa/Dar_es_Salaam');
        const date = now.format('DD/MM/YYYY');
        const day = now.format('dddd');
        const time = now.format('HH:mm:ss');
        
        const config = await loadAntideleteConfig();
        const randomQuote = getRandomQuote();
        const botName = BOT_NAME || 'MDINYANE';
        
        const action = args[0]?.toLowerCase();
        
        if (!action) {
            const statusIcon = config.enabled ? '✅' : '❌';
            const statusText = config.enabled ? 'ENABLED' : 'DISABLED';
            
            const statusMsg = `╭──❍「 *🔰 ANTIDELETE* 」❍
├ 📵 Status: ${statusIcon} ${statusText}
╰─┬────❍
╭─┴─❍「 *📋 COMMANDS* 」❍
│ 🔧 ${currentPrefix}antidelete on - Enable
│ 🔧 ${currentPrefix}antidelete off - Disable
╰──────❍
╭─┴─❍「 *📊 INFO* 」❍
├ 📅 ${date}
├ 📆 ${day}
├ ⏰ ${time} EAT
├ 🔍 Tracks deleted messages
╰──────❍

✨ *"${randomQuote}"* ✨

▰▰▰ *©️ ${botName.toUpperCase()} BY STANY TZ* ▰▰▰`;
            await sendStyledMessage(sock, chatId, statusMsg, [], msg);
            return;
        }
        
        if (action === 'on') {
            if (config.enabled) {
                const alreadyMsg = `╭──❍「 *🔰 ANTIDELETE* 」❍
├ ⚠️ Already ENABLED
╰──────❍

▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`;
                await sendStyledMessage(sock, chatId, alreadyMsg, [], msg);
                return;
            }
            
            config.enabled = true;
            await saveAntideleteConfig(config);
            
            const enableMsg = `╭──❍「 *🔰 ANTIDELETE* 」❍
├ ✅ ENABLED
├ 📝 Tracking deleted messages
├ 👁️ ViewOnce auto-save enabled
╰──────❍

✨ *"${randomQuote}"* ✨

_📌 Deleted messages will be sent to owner_
▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`;
            await sendStyledMessage(sock, chatId, enableMsg, [], msg);
            return;
        }
        
        if (action === 'off') {
            if (!config.enabled) {
                const alreadyOffMsg = `╭──❍「 *🔰 ANTIDELETE* 」❍
├ ⚠️ Already DISABLED
╰──────❍

▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`;
                await sendStyledMessage(sock, chatId, alreadyOffMsg, [], msg);
                return;
            }
            
            config.enabled = false;
            await saveAntideleteConfig(config);
            
            const disableMsg = `╭──❍「 *🔰 ANTIDELETE* 」❍
├ ❌ DISABLED
├ 📝 No longer tracking deletions
╰──────❍

▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`;
            await sendStyledMessage(sock, chatId, disableMsg, [], msg);
            return;
        }
        
        const invalidMsg = `╭──❍「 *🔰 ANTIDELETE* 」❍
├ ❌ Invalid: ${action}
├ 📝 Use: ${currentPrefix}antidelete for help
╰──────❍

▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`;
        await sendStyledMessage(sock, chatId, invalidMsg, [], msg);
    }
};

// ============================================================
// EXPORTS - NO DUPLICATES
// ============================================================
export { loadAntideleteConfig, saveAntideleteConfig };