import fs from 'fs';
import path from 'path';
import axios from 'axios';
import FormData from 'form-data';
import { downloadContentFromMessage } from '@whiskeysockets/baileys';
import { channelInfo } from '../../stanytz/messageConfig.js';

const TMP_DIR = path.join(process.cwd(), 'temp');

if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR, { recursive: true });

// Upload to Catbox (free file hosting)
async function uploadToCatbox(filePath, fileName) {
    try {
        const form = new FormData();
        form.append('reqtype', 'fileupload');
        form.append('fileToUpload', fs.createReadStream(filePath), fileName);
        
        const response = await axios.post('https://catbox.moe/user/api.php', form, {
            headers: { ...form.getHeaders() },
            timeout: 120000
        });
        
        if (response.data && response.data.startsWith('https://')) {
            return response.data;
        }
        return null;
    } catch (error) {
        console.error('Catbox upload error:', error);
        return null;
    }
}

// Upload to Telegra.ph (for images)
async function uploadToTelegraph(filePath) {
    try {
        const form = new FormData();
        form.append('file', fs.createReadStream(filePath));
        
        const response = await axios.post('https://telegra.ph/upload', form, {
            headers: { ...form.getHeaders() },
            timeout: 60000
        });
        
        if (response.data && response.data[0] && response.data[0].src) {
            return `https://telegra.ph${response.data[0].src}`;
        }
        return null;
    } catch (error) {
        console.error('Telegraph upload error:', error);
        return null;
    }
}

// Get file extension and MIME type
function getFileInfo(mediaType, mimeType) {
    const info = {
        image: { ext: 'jpg', mime: 'image/jpeg', icon: '🖼️', name: 'Image' },
        video: { ext: 'mp4', mime: 'video/mp4', icon: '🎥', name: 'Video' },
        audio: { ext: 'mp3', mime: 'audio/mpeg', icon: '🎵', name: 'Audio' },
        document: { ext: 'bin', mime: 'application/octet-stream', icon: '📄', name: 'Document' },
        sticker: { ext: 'webp', mime: 'image/webp', icon: '🏷️', name: 'Sticker' }
    };
    
    if (info[mediaType]) return info[mediaType];
    
    if (mimeType?.includes('image')) return info.image;
    if (mimeType?.includes('video')) return info.video;
    if (mimeType?.includes('audio')) return info.audio;
    return { ext: 'bin', mime: 'application/octet-stream', icon: '📄', name: 'File' };
}

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
    name: 'turl',
    description: 'Convert any media to direct link',
    icon: '🔗',
    alias: ['tourl', 'upload', 'media2link', 'getlink'],
    category: 'general',
    
    async execute(sock, msg, args, currentPrefix) {
        const chatId = msg.key.remoteJid;
        const sender = msg.key.participant || chatId;
        
        // Check if replying to a message
        const quotedMsg = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        
        if (!quotedMsg) {
            await sendForwardedMessage(sock, chatId, `╭──❍「 *🔗 MEDIA TO LINK* 」❍
├ 📝 *Usage* : Reply to a media message with ${currentPrefix}turl
├ 📝 *Supports* : Image, Video, Audio, Document, Sticker
├ 📝 *Example* : Reply to an image then type ${currentPrefix}turl
╰──────❍
_📌 Uploads media and returns a direct download link_
▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`, [], msg);
            return;
        }
        
        // Detect media type
        let mediaType = null;
        let mediaMessage = null;
        let caption = '';
        
        if (quotedMsg.imageMessage) {
            mediaType = 'image';
            mediaMessage = quotedMsg.imageMessage;
            caption = quotedMsg.imageMessage.caption || '';
        } else if (quotedMsg.videoMessage) {
            mediaType = 'video';
            mediaMessage = quotedMsg.videoMessage;
            caption = quotedMsg.videoMessage.caption || '';
        } else if (quotedMsg.audioMessage) {
            mediaType = 'audio';
            mediaMessage = quotedMsg.audioMessage;
            caption = quotedMsg.audioMessage.caption || '';
        } else if (quotedMsg.documentMessage) {
            mediaType = 'document';
            mediaMessage = quotedMsg.documentMessage;
            caption = quotedMsg.documentMessage.caption || '';
        } else if (quotedMsg.stickerMessage) {
            mediaType = 'sticker';
            mediaMessage = quotedMsg.stickerMessage;
            caption = '';
        } else {
            await sendForwardedMessage(sock, chatId, `╭──❍「 *🔗 MEDIA TO LINK* 」❍
├ ❌ No supported media found
├ 📝 Reply to an image, video, audio, document, or sticker
╰──────❍`, [], msg);
            return;
        }
        
        const fileInfo = getFileInfo(mediaType, mediaMessage.mimetype);
        
        // Send processing message
        await sendForwardedMessage(sock, chatId, `╭──❍「 *🔗 MEDIA TO LINK* 」❍
├ ${fileInfo.icon} *Type* : ${fileInfo.name}
├ ⏳ *Status* : Uploading to server...
╰──────❍`, [], msg);
        
        try {
            // Download media
            const stream = await downloadContentFromMessage(mediaMessage, mediaType);
            let buffer = Buffer.from([]);
            for await (const chunk of stream) {
                buffer = Buffer.concat([buffer, chunk]);
            }
            
            // Save to temp file
            const fileName = `media_${Date.now()}.${fileInfo.ext}`;
            const tempFile = path.join(TMP_DIR, fileName);
            fs.writeFileSync(tempFile, buffer);
            
            const fileSize = fs.statSync(tempFile).size;
            const fileSizeMB = (fileSize / 1024 / 1024).toFixed(2);
            
            // Upload based on type
            let uploadUrl = null;
            let uploadMethod = '';
            
            if (mediaType === 'image' && fileSize < 5 * 1024 * 1024) {
                uploadUrl = await uploadToTelegraph(tempFile);
                uploadMethod = 'Telegraph';
                if (!uploadUrl) uploadUrl = await uploadToCatbox(tempFile, fileName);
            } else {
                uploadUrl = await uploadToCatbox(tempFile, fileName);
                uploadMethod = 'Catbox';
            }
            
            // Clean up temp file
            fs.unlinkSync(tempFile);
            
            if (!uploadUrl) {
                await sendForwardedMessage(sock, chatId, `╭──❍「 *🔗 MEDIA TO LINK* 」❍
├ ❌ *Upload Failed*
├ 📝 Server error, please try again
╰──────❍`, [], msg);
                return;
            }
            
            // Send success message with link
            const successMsg = `╭──❍「 *🔗 MEDIA LINK GENERATED* 」❍
├ ${fileInfo.icon} *Type* : ${fileInfo.name}
├ 📦 *Size* : ${fileSizeMB} MB
├ 🔗 *Direct Link* : ${uploadUrl}
├ 📅 *Expires* : Never (permanent)
├ ☁️ *Host* : ${uploadMethod}
╰──────❍
_📌 Click the link to view/download the media_
▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`;
            
            await sock.sendMessage(chatId, {
                text: successMsg,
                contextInfo: channelInfo.contextInfo,
                mentions: [sender]
            }, { quoted: msg });
            
        } catch (error) {
            console.error('Upload error:', error);
            await sendForwardedMessage(sock, chatId, `╭──❍「 *🔗 MEDIA TO LINK* 」❍
├ ❌ *Upload Failed*
├ 📝 Error: ${error.message.substring(0, 50)}
╰──────❍`, [], msg);
        }
    }
};