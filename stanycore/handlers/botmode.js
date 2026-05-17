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

export function isChatAllowed(chatId, senderId, isOwner) {
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