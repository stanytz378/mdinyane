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

let onlineInterval = null;
let lastPresence = 0;

export async function handleAlwaysOnline(sock) {
    try {
        if (!config.alwaysOnline) return;
        
        const now = Date.now();
        if (now - lastPresence < 25000) return;
        
        await sock.sendPresenceUpdate('available');
        lastPresence = now;
    } catch (error) {}
}

export function startAlwaysOnline(sock) {
    if (onlineInterval) clearInterval(onlineInterval);
    onlineInterval = setInterval(() => handleAlwaysOnline(sock), 20000);
}

export function stopAlwaysOnline() {
    if (onlineInterval) {
        clearInterval(onlineInterval);
        onlineInterval = null;
    }
}