/*****************************************************************************
 *                     Developed By STANY TZ                                 *
 *****************************************************************************/

import { config } from '../config.js';

function isChatAllowed(chatId, senderId, isOwner) {
    if (isOwner) return true;
    
    const isGroup = chatId?.endsWith('@g.us');
    
    switch(config.mode) {
        case 'public': return true;
        case 'private': return !isGroup;
        case 'groups': return isGroup;
        case 'self': return false;
        default: return true;
    }
}

export { isChatAllowed };