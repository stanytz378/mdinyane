/*****************************************************************************
 *                     Developed By STANY TZ                                 *
 *****************************************************************************/

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const OWNER_FILE = path.join(process.cwd(), 'owner.json');

async function isOwner(userId, jidManager = null) {
    try {
        if (!userId) return { isOwner: false };
        
        const cleanId = userId.split('@')[0].split(':')[0].replace(/[^0-9]/g, '');
        
        // Kwanza angalia jidManager
        if (jidManager && jidManager.getOwnerInfo) {
            const ownerInfo = jidManager.getOwnerInfo();
            const ownerNumber = ownerInfo?.ownerNumber;
            if (cleanId === ownerNumber) {
                return { isOwner: true, ownerInfo };
            }
        }
        
        // Angalia owner.json
        if (fs.existsSync(OWNER_FILE)) {
            const data = JSON.parse(fs.readFileSync(OWNER_FILE, 'utf8'));
            const ownerNumber = data.OWNER_CLEAN_NUMBER || data.OWNER_NUMBER;
            
            if (cleanId === ownerNumber) {
                return { isOwner: true, ownerInfo: { number: ownerNumber } };
            }
        }
        
        return { isOwner: false };
    } catch (err) {
        console.error('isOwner error:', err);
        return { isOwner: false };
    }
}

export default isOwner;