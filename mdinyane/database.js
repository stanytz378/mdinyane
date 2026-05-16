/*****************************************************************************
 *                                                                           *
 *                     Developed By STANY TZ                                 *
 *                                                                           *
 *  🌐  GitHub   : https://github.com/Stanytz378/iamlegendv2                 *
 *  ▶️  YouTube  : https://youtube.com/@STANYTZ                              *
 *  💬  WhatsApp : https://whatsapp.com/channel/0029Vb7fzu4EwEjmsD4Tzs1p     *
 *                                                                           *
 *    © 2026 STANY TZ. All rights reserved.                                 *
 *                                                                           *
 *****************************************************************************/

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(process.cwd(), 'stanydata');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

class DatabaseManager {
    constructor(dbName, defaultData = {}) {
        this.dbName = dbName;
        this.dbPath = path.join(DATA_DIR, `${dbName}.json`);
        this.defaultData = defaultData;
        this.data = null;
        this.load();
    }

    load() {
        try {
            if (fs.existsSync(this.dbPath)) {
                this.data = JSON.parse(fs.readFileSync(this.dbPath, 'utf8'));
            } else {
                this.data = { ...this.defaultData };
                this.save();
            }
        } catch (error) {
            console.error(`❌ Error loading ${this.dbName}:`, error.message);
            this.data = { ...this.defaultData };
        }
        return this.data;
    }

    save() {
        try {
            fs.writeFileSync(this.dbPath, JSON.stringify(this.data, null, 2));
            return true;
        } catch (error) {
            console.error(`❌ Error saving ${this.dbName}:`, error.message);
            return false;
        }
    }

    get() {
        return this.data;
    }

    set(newData) {
        this.data = newData;
        return this.save();
    }

    update(updates) {
        this.data = { ...this.data, ...updates };
        return this.save();
    }
}

// Settings Database
const settingsDB = new DatabaseManager('settings', {
    prefix: '.',
    mode: 'public',
    botName: 'MDINYANE',
    version: '1.0.0',
    updatedAt: new Date().toISOString()
});

// Usage Database
const usageDB = new DatabaseManager('usage', {
    commands: {},
    totalCommands: 0,
    dailyUsage: {},
    lastReset: new Date().toISOString()
});

export { settingsDB, usageDB, DatabaseManager };
