/*****************************************************************************
 *                     Developed By STANY TZ                                 *
 *                                                                           *
 *  🌐  GitHub   : https://github.com/Stanytz378/iamlegendv2                 *
 *  ▶️  YouTube  : https://youtube.com/@STANYTZ                              *
 *  💬  WhatsApp : https://whatsapp.com/channel/0029Vb7fzu4EwEjmsD4Tzs1p     *
 *                                                                           *
 *    © 2026 STANY TZ. All rights reserved.                                 *
 *                                                                           *
 *****************************************************************************/

import { config } from '../config.js';

const typingSessions = new Map();

export async function handleAutoTyping(sock, chatId, isOwner, duration = 3000) {
    try {
        if (!config.autoTyping) return;
        if (typingSessions.has(chatId)) return;
        
        const isGroup = chatId?.endsWith('@g.us');
        let shouldShow = false;
        
        if (config.autoTypingLocation === 'both') shouldShow = true;
        else if (config.autoTypingLocation === 'private' && !isGroup) shouldShow = true;
        else if (config.autoTypingLocation === 'groups' && isGroup) shouldShow = true;
        
        if (!shouldShow && !isOwner) return;
        
        typingSessions.set(chatId, true);
        await sock.sendPresenceUpdate('composing', chatId);
        
        setTimeout(async () => {
            try {
                await sock.sendPresenceUpdate('paused', chatId);
                typingSessions.delete(chatId);
            } catch (e) {}
        }, duration);
    } catch (error) {
        typingSessions.delete(chatId);
    }
}