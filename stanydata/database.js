import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = __dirname;

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

// Premium Database
class PremiumDB {
    constructor() {
        this.db = new DatabaseManager('premium', { 
            users: [],
            totalPremium: 0,
            lastUpdated: new Date().toISOString()
        });
    }

    getAll() {
        return this.db.get().users || [];
    }

    isPremium(userId) {
        const users = this.getAll();
        const cleanId = this.cleanId(userId);
        const user = users.find(u => this.cleanId(u.id) === cleanId || u.id === userId);
        
        if (!user) return { isPremium: false, data: null };
        
        // Check expiry
        if (user.expiryDate && new Date(user.expiryDate) < new Date()) {
            this.remove(user.id);
            return { isPremium: false, data: null };
        }
        
        return { isPremium: true, data: user };
    }

    add(userId, options = {}) {
        const users = this.getAll();
        const cleanId = this.cleanId(userId);
        
        // Remove existing
        const filtered = users.filter(u => this.cleanId(u.id) !== cleanId);
        
        const newUser = {
            id: userId,
            cleanId: cleanId,
            addedAt: new Date().toISOString(),
            expiryDate: options.days ? new Date(Date.now() + (options.days * 86400000)).toISOString() : null,
            plan: options.plan || 'basic',
            addedBy: options.addedBy || 'system',
            ...options
        };
        
        filtered.push(newUser);
        
        this.db.update({ 
            users: filtered,
            totalPremium: filtered.length,
            lastUpdated: new Date().toISOString()
        });
        
        return newUser;
    }

    remove(userId) {
        const users = this.getAll();
        const cleanId = this.cleanId(userId);
        const filtered = users.filter(u => this.cleanId(u.id) !== cleanId);
        
        this.db.update({ 
            users: filtered,
            totalPremium: filtered.length,
            lastUpdated: new Date().toISOString()
        });
        
        return true;
    }

    getStats() {
        const users = this.getAll();
        const active = users.filter(u => !u.expiryDate || new Date(u.expiryDate) > new Date());
        
        return {
            total: users.length,
            active: active.length,
            expired: users.length - active.length,
            plans: users.reduce((acc, u) => {
                acc[u.plan] = (acc[u.plan] || 0) + 1;
                return acc;
            }, {})
        };
    }

    cleanId(id) {
        return id.split('@')[0].split(':')[0].replace(/[^0-9]/g, '');
    }
}

// Banned Database
class BannedDB {
    constructor() {
        this.db = new DatabaseManager('banned', { 
            users: [],
            totalBanned: 0,
            lastUpdated: new Date().toISOString()
        });
    }

    getAll() {
        return this.db.get().users || [];
    }

    isBanned(userId) {
        const users = this.getAll();
        const cleanId = this.cleanId(userId);
        const user = users.find(u => this.cleanId(u.id) === cleanId || u.id === userId);
        return user ? { isBanned: true, data: user } : { isBanned: false, data: null };
    }

    add(userId, reason = 'No reason', bannedBy = 'system') {
        const users = this.getAll();
        const cleanId = this.cleanId(userId);
        
        // Check if already banned
        if (users.some(u => this.cleanId(u.id) === cleanId)) {
            return false;
        }
        
        const newUser = {
            id: userId,
            cleanId: cleanId,
            reason: reason,
            bannedBy: bannedBy,
            bannedAt: new Date().toISOString()
        };
        
        users.push(newUser);
        
        this.db.update({ 
            users: users,
            totalBanned: users.length,
            lastUpdated: new Date().toISOString()
        });
        
        return true;
    }

    remove(userId) {
        const users = this.getAll();
        const cleanId = this.cleanId(userId);
        const filtered = users.filter(u => this.cleanId(u.id) !== cleanId);
        
        this.db.update({ 
            users: filtered,
            totalBanned: filtered.length,
            lastUpdated: new Date().toISOString()
        });
        
        return true;
    }

    cleanId(id) {
        return id.split('@')[0].split(':')[0].replace(/[^0-9]/g, '');
    }
}

// Blocked Database
class BlockedDB {
    constructor() {
        this.db = new DatabaseManager('blocked', { 
            users: [],
            totalBlocked: 0,
            lastUpdated: new Date().toISOString()
        });
    }

    getAll() {
        return this.db.get().users || [];
    }

    isBlocked(userId) {
        const users = this.getAll();
        const cleanId = this.cleanId(userId);
        const user = users.find(u => this.cleanId(u.id) === cleanId || u.id === userId);
        return user ? { isBlocked: true, data: user } : { isBlocked: false, data: null };
    }

    add(userId, reason = 'No reason', blockedBy = 'system') {
        const users = this.getAll();
        const cleanId = this.cleanId(userId);
        
        if (users.some(u => this.cleanId(u.id) === cleanId)) {
            return false;
        }
        
        const newUser = {
            id: userId,
            cleanId: cleanId,
            reason: reason,
            blockedBy: blockedBy,
            blockedAt: new Date().toISOString()
        };
        
        users.push(newUser);
        
        this.db.update({ 
            users: users,
            totalBlocked: users.length,
            lastUpdated: new Date().toISOString()
        });
        
        return true;
    }

    remove(userId) {
        const users = this.getAll();
        const cleanId = this.cleanId(userId);
        const filtered = users.filter(u => this.cleanId(u.id) !== cleanId);
        
        this.db.update({ 
            users: filtered,
            totalBlocked: filtered.length,
            lastUpdated: new Date().toISOString()
        });
        
        return true;
    }

    cleanId(id) {
        return id.split('@')[0].split(':')[0].replace(/[^0-9]/g, '');
    }
}

// Whitelist Database
class WhitelistDB {
    constructor() {
        this.db = new DatabaseManager('whitelist', { 
            users: [],
            totalWhitelisted: 0,
            lastUpdated: new Date().toISOString()
        });
    }

    getAll() {
        return this.db.get().users || [];
    }

    isWhitelisted(userId) {
        const users = this.getAll();
        const cleanId = this.cleanId(userId);
        return users.some(u => this.cleanId(u.id) === cleanId || u.id === userId);
    }

    add(userId, addedBy = 'system') {
        const users = this.getAll();
        const cleanId = this.cleanId(userId);
        
        if (users.some(u => this.cleanId(u.id) === cleanId)) {
            return false;
        }
        
        const newUser = {
            id: userId,
            cleanId: cleanId,
            addedBy: addedBy,
            addedAt: new Date().toISOString()
        };
        
        users.push(newUser);
        
        this.db.update({ 
            users: users,
            totalWhitelisted: users.length,
            lastUpdated: new Date().toISOString()
        });
        
        return true;
    }

    remove(userId) {
        const users = this.getAll();
        const cleanId = this.cleanId(userId);
        const filtered = users.filter(u => this.cleanId(u.id) !== cleanId);
        
        this.db.update({ 
            users: filtered,
            totalWhitelisted: filtered.length,
            lastUpdated: new Date().toISOString()
        });
        
        return true;
    }

    cleanId(id) {
        return id.split('@')[0].split(':')[0].replace(/[^0-9]/g, '');
    }
}

// Settings Database
class SettingsDB {
    constructor() {
        this.db = new DatabaseManager('settings', {
            prefix: '.',
            mode: 'public',
            autoReact: true,
            autoView: true,
            antiDemote: false,
            welcomeMessage: true,
            updatedAt: new Date().toISOString()
        });
    }

    get(key) {
        return this.db.get()[key];
    }

    getAll() {
        return this.db.get();
    }

    set(key, value) {
        const current = this.db.get();
        current[key] = value;
        current.updatedAt = new Date().toISOString();
        return this.db.set(current);
    }

    update(settings) {
        const current = this.db.get();
        const updated = { ...current, ...settings, updatedAt: new Date().toISOString() };
        return this.db.set(updated);
    }
}

// Usage/Stats Database
class UsageDB {
    constructor() {
        this.db = new DatabaseManager('usage', {
            commands: {},
            totalCommands: 0,
            dailyUsage: {},
            lastReset: new Date().toISOString()
        });
    }

    increment(command, userId) {
        const data = this.db.get();
        
        // Increment command count
        data.commands[command] = (data.commands[command] || 0) + 1;
        data.totalCommands = (data.totalCommands || 0) + 1;
        
        // Daily usage
        const today = new Date().toISOString().split('T')[0];
        if (!data.dailyUsage[today]) {
            data.dailyUsage[today] = {};
        }
        data.dailyUsage[today][command] = (data.dailyUsage[today][command] || 0) + 1;
        
        this.db.set(data);
        return true;
    }

    getStats() {
        const data = this.db.get();
        const today = new Date().toISOString().split('T')[0];
        
        // Get top commands
        const topCommands = Object.entries(data.commands)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10);
        
        return {
            totalCommands: data.totalCommands,
            totalUniqueCommands: Object.keys(data.commands).length,
            topCommands: topCommands,
            todayUsage: data.dailyUsage[today] || {},
            todayTotal: Object.values(data.dailyUsage[today] || {}).reduce((a, b) => a + b, 0)
        };
    }

    resetDaily() {
        const data = this.db.get();
        const today = new Date().toISOString().split('T')[0];
        
        if (data.lastReset.split('T')[0] !== today) {
            data.dailyUsage = {};
            data.lastReset = new Date().toISOString();
            this.db.set(data);
        }
        return true;
    }
}

// Export all databases
const premiumDB = new PremiumDB();
const bannedDB = new BannedDB();
const blockedDB = new BlockedDB();
const whitelistDB = new WhitelistDB();
const settingsDB = new SettingsDB();
const usageDB = new UsageDB();

export {
    premiumDB,
    bannedDB,
    blockedDB,
    whitelistDB,
    settingsDB,
    usageDB,
    PremiumDB,
    BannedDB,
    BlockedDB,
    WhitelistDB,
    SettingsDB,
    UsageDB
};
