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

const recordingSessions = new Map();

export async function handleAutoRecording(sock, chatId, isOwner, duration = 3000) {
    try {
        if (!config.autoRecording) return;
        if (recordingSessions.has(chatId)) return;
        
        const isGroup = chatId?.endsWith('@g.us');
        let shouldShow = false;
        
        if (config.autoRecordingLocation === 'both') shouldShow = true;
        else if (config.autoRecordingLocation === 'private' && !isGroup) shouldShow = true;
        else if (config.autoRecordingLocation === 'groups' && isGroup) shouldShow = true;
        
        if (!shouldShow && !isOwner) return;
        
        recordingSessions.set(chatId, true);
        await sock.sendPresenceUpdate('recording', chatId);
        
        setTimeout(async () => {
            try {
                await sock.sendPresenceUpdate('paused', chatId);
                recordingSessions.delete(chatId);
            } catch (e) {}
        }, duration);
    } catch (error) {
        recordingSessions.delete(chatId);
    }
}