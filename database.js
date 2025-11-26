// database.js
import sqlite3 from 'sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export class DatabaseService {
    constructor() {
        this.dbPath = join(__dirname, 'data', 'inspiration.db');
        this.init();
    }

    init() {
        const dataDir = join(__dirname, 'data');
        if (!existsSync(dataDir)) {
            mkdirSync(dataDir, { recursive: true });
        }

        this.db = new sqlite3.Database(this.dbPath, (err) => {
            if (err) {
                console.error('❌ Ошибка подключения к базе:', err.message);
            } else {
                console.log('✅ Подключение к SQLite установлено');
                this.createTables();
            }
        });
    }

    createTables() {
        const tables = [
            `CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER UNIQUE NOT NULL,
                tg_first_name TEXT,
                tg_username TEXT,
                sparks REAL DEFAULT 50,
                level TEXT DEFAULT 'Ученик',
                is_registered BOOLEAN DEFAULT 0,
                class TEXT,
                character_id INTEGER,
                character_name TEXT,
                available_buttons TEXT DEFAULT '[]',
                registration_date DATETIME DEFAULT CURRENT_TIMESTAMP,
                last_active DATETIME DEFAULT CURRENT_TIMESTAMP,
                status TEXT DEFAULT 'active'
            )`,
            `CREATE TABLE IF NOT EXISTS roles (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                description TEXT,
                icon TEXT,
                available_buttons TEXT DEFAULT '[]',
                color TEXT,
                display_order INTEGER DEFAULT 1,
                is_active BOOLEAN DEFAULT 1
            )`,
            `CREATE TABLE IF NOT EXISTS characters (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                role_id INTEGER,
                name TEXT NOT NULL,
                description TEXT,
                bonus_type TEXT,
                bonus_value TEXT,
                is_active BOOLEAN DEFAULT 1
            )`
        ];

        tables.forEach(sql => {
            this.db.run(sql, (err) => {
                if (err) {
                    console.error('❌ Ошибка создания таблицы:', err.message);
                }
            });
        });

        this.initializeData();
    }

    initializeData() {
        this.get("SELECT COUNT(*) as count FROM roles", []).then(result => {
            if (result && result.count === 0) {
                console.log('📦 Заполняем базу начальными данными...');
                this.fillInitialData();
            }
        }).catch(console.error);
    }

    fillInitialData() {
        const roles = [
            { name: 'Художник', description: 'Создавайте визуальные произведения искусства', icon: '🎨', available_buttons: '["quiz","marathon","works","activities","posts","shop","invite","interactives","change_role"]', color: '#FF6B6B', display_order: 1 },
            { name: 'Писатель', description: 'Создавайте литературные произведения', icon: '📝', available_buttons: '["quiz","marathon","works","activities","posts","shop","invite","interactives","change_role"]', color: '#4ECDC4', display_order: 2 },
            { name: 'Дизайнер', description: 'Создавайте эстетичные и функциональные дизайны', icon: '✨', available_buttons: '["quiz","marathon","works","activities","posts","shop","invite","interactives","change_role"]', color: '#45B7D1', display_order: 3 }
        ];

        roles.forEach(role => {
            this.run(
                "INSERT INTO roles (name, description, icon, available_buttons, color, display_order) VALUES (?, ?, ?, ?, ?, ?)",
                [role.name, role.description, role.icon, role.available_buttons, role.color, role.display_order]
            );
        });

        const characters = [
            { role_id: 1, name: 'Импрессионист', description: 'Мастер света и цвета', bonus_type: 'percent_bonus', bonus_value: '15' },
            { role_id: 1, name: 'Сюрреалист', description: 'Исследователь подсознания', bonus_type: 'random_gift', bonus_value: '3' },
            { role_id: 2, name: 'Поэт', description: 'Волшебник слова', bonus_type: 'forgiveness', bonus_value: '2' },
            { role_id: 2, name: 'Прозаик', description: 'Мастер повествования', bonus_type: 'series_bonus', bonus_value: '5' },
            { role_id: 3, name: 'Графический дизайнер', description: 'Создатель визуальных коммуникаций', bonus_type: 'secret_advice', bonus_value: '7' },
            { role_id: 3, name: 'UI/UX дизайнер', description: 'Специалист по пользовательскому опыту', bonus_type: 'percent_bonus', bonus_value: '10' }
        ];

        characters.forEach(character => {
            this.run(
                "INSERT INTO characters (role_id, name, description, bonus_type, bonus_value) VALUES (?, ?, ?, ?, ?)",
                [character.role_id, character.name, character.description, character.bonus_type, character.bonus_value]
            );
        });
    }

    run(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.run(sql, params, function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve({ lastID: this.lastID, changes: this.changes });
                }
            });
        });
    }

    get(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.get(sql, params, (err, row) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(row);
                }
            });
        });
    }

    all(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.all(sql, params, (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });
    }
}

export const dbService = new DatabaseService();
