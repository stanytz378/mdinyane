/*****************************************************************************
 *                     Developed By STANY TZ                                 *
 *****************************************************************************/

import { config } from '../config.js';

const readReceipts = new Set();

async function handleAutoRead(sock, message) {
    try {
        if (!config.autoRead) return;
        
        const chatId = message.key.remoteJid;
        if (!chatId || chatId === 'status@broadcast') return;
        
        const isGroup = chatId.endsWith('@g.us');
        if (isGroup && !config.autoReadGroups) return;
        if (!isGroup && !config.autoReadPrivate) return;
        
        const msgId = message.key.id;
        const receiptKey = `${chatId}_${msgId}`;
        if (readReceipts.has(receiptKey)) return;
        
        readReceipts.add(receiptKey);
        await sock.readMessages([message.key]);
        
        setTimeout(() => readReceipts.delete(receiptKey), 10000);
    } catch (error) {
        // Silent fail
    }
}

export { handleAutoRead };