/*****************************************************************************
 *                     Developed By STANY TZ                                 *
 *****************************************************************************/

import { config } from '../config.js';

let onlineInterval = null;
let lastPresence = 0;

async function handleAlwaysOnline(sock) {
    try {
        if (!config.alwaysOnline) return;
        
        const now = Date.now();
        if (now - lastPresence < 25000) return;
        
        await sock.sendPresenceUpdate('available');
        lastPresence = now;
    } catch (error) {}
}

function startAlwaysOnline(sock) {
    if (onlineInterval) clearInterval(onlineInterval);
    onlineInterval = setInterval(() => handleAlwaysOnline(sock), 20000);
}

function stopAlwaysOnline() {
    if (onlineInterval) {
        clearInterval(onlineInterval);
        onlineInterval = null;
    }
}

export { handleAlwaysOnline, startAlwaysOnline, stopAlwaysOnline };