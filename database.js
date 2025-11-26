// database.js
import sqlite3 from 'sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

class RealDatabaseService {
    constructor() {
        this.dbPath = join(__dirname, 'data', 'inspiration.db');
        this.init();
    }

    init() {
        // Создаем директорию для данных если не существует
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
            // Пользователи
            `CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER UNIQUE NOT NULL,
                tg_first_name TEXT,
                tg_username TEXT,
                sparks REAL DEFAULT 0,
                level TEXT DEFAULT 'Ученик',
                is_registered BOOLEAN DEFAULT 0,
                class TEXT,
                character_id INTEGER,
                character_name TEXT,
                available_buttons TEXT DEFAULT '[]',
                registration_date DATETIME DEFAULT CURRENT_TIMESTAMP,
                last_active DATETIME DEFAULT CURRENT_TIMESTAMP,
                status TEXT DEFAULT 'active',
                invited_by INTEGER,
                invite_count INTEGER DEFAULT 0,
                total_invited INTEGER DEFAULT 0
            )`,

            // Роли
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

            // Персонажи
            `CREATE TABLE IF NOT EXISTS characters (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                role_id INTEGER,
                name TEXT NOT NULL,
                description TEXT,
                bonus_type TEXT,
                bonus_value TEXT,
                image_url TEXT,
                personality TEXT,
                special_ability TEXT,
                is_active BOOLEAN DEFAULT 1,
                FOREIGN KEY (role_id) REFERENCES roles (id)
            )`,

            // Квизы
            `CREATE TABLE IF NOT EXISTS quizzes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                description TEXT,
                questions TEXT,
                total_questions INTEGER DEFAULT 0,
                sparks_per_correct INTEGER DEFAULT 1,
                sparks_perfect_bonus INTEGER DEFAULT 5,
                difficulty TEXT DEFAULT 'easy',
                category TEXT,
                tags TEXT DEFAULT '[]',
                estimated_time INTEGER,
                is_active BOOLEAN DEFAULT 1,
                allow_retake BOOLEAN DEFAULT 1,
                cooldown_hours INTEGER DEFAULT 24,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`,

            // Завершения квизов
            `CREATE TABLE IF NOT EXISTS quiz_completions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                quiz_id INTEGER,
                completed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                score INTEGER,
                total_questions INTEGER,
                sparks_earned INTEGER,
                perfect_score BOOLEAN DEFAULT 0,
                time_spent INTEGER,
                answers TEXT,
                speed_bonus INTEGER DEFAULT 0,
                FOREIGN KEY (user_id) REFERENCES users (user_id),
                FOREIGN KEY (quiz_id) REFERENCES quizzes (id)
            )`,

            // Магазин
            `CREATE TABLE IF NOT EXISTS shop_items (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                description TEXT,
                type TEXT,
                file_url TEXT,
                preview_url TEXT,
                price INTEGER,
                content_text TEXT,
                embed_html TEXT,
                is_active BOOLEAN DEFAULT 1,
                category TEXT,
                difficulty TEXT,
                estimated_duration INTEGER,
                instructor TEXT,
                rating REAL DEFAULT 0,
                students_count INTEGER DEFAULT 0,
                tags TEXT DEFAULT '[]',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`,

            // Покупки
            `CREATE TABLE IF NOT EXISTS purchases (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                item_id INTEGER,
                price_paid INTEGER,
                purchased_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                status TEXT DEFAULT 'completed',
                download_count INTEGER DEFAULT 0,
                FOREIGN KEY (user_id) REFERENCES users (user_id),
                FOREIGN KEY (item_id) REFERENCES shop_items (id)
            )`,

            // Активности
            `CREATE TABLE IF NOT EXISTS activities (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                activity_type TEXT,
                sparks_earned REAL,
                description TEXT,
                old_sparks REAL,
                new_sparks REAL,
                old_level TEXT,
                new_level TEXT,
                metadata TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (user_id)
            )`,

            // Работы пользователей
            `CREATE TABLE IF NOT EXISTS user_works (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                title TEXT NOT NULL,
                description TEXT,
                image_url TEXT,
                type TEXT DEFAULT 'image',
                status TEXT DEFAULT 'pending',
                category TEXT DEFAULT 'general',
                tags TEXT DEFAULT '[]',
                likes_count INTEGER DEFAULT 0,
                comments_count INTEGER DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                moderated_at DATETIME,
                moderator_id INTEGER,
                admin_comment TEXT,
                FOREIGN KEY (user_id) REFERENCES users (user_id)
            )`
        ];

        tables.forEach(sql => {
            this.db.run(sql, (err) => {
                if (err) {
                    console.error('❌ Ошибка создания таблицы:', err.message);
                }
            });
        });

        // Заполняем начальными данными
        this.initializeData();
    }

    initializeData() {
        // Проверяем, есть ли уже данные
        this.get("SELECT COUNT(*) as count FROM roles", [], (err, result) => {
            if (result.count === 0) {
                console.log('📦 Заполняем базу начальными данными...');
                this.initializeDefaultData();
            }
        });
    }

    initializeDefaultData() {
        const roles = [
            { name: 'Художник', description: 'Создавайте визуальные произведения искусства', icon: '🎨', available_buttons: JSON.stringify(['quiz','marathon','works','activities','posts','shop','invite','interactives','change_role']), color: '#FF6B6B', display_order: 1 },
            { name: 'Писатель', description: 'Создавайте литературные произведения', icon: '📝', available_buttons: JSON.stringify(['quiz','marathon','works','activities','posts','shop','invite','interactives','change_role']), color: '#4ECDC4', display_order: 2 },
            { name: 'Дизайнер', description: 'Создавайте эстетичные и функциональные дизайны', icon: '✨', available_buttons: JSON.stringify(['quiz','marathon','works','activities','posts','shop','invite','interactives','change_role']), color: '#45B7D1', display_order: 3 }
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

        const quizQuestions = JSON.stringify([
            {
                question: "Что такое правило третей?",
                options: [
                    "Разделение изображения на 9 равных частей",
                    "Использование только трех цветов", 
                    "Создание трехмерного эффекта",
                    "Ограничение тремя объектами на изображении"
                ],
                correct_answer: 0,
                explanation: "Правило третей - это принцип композиции, при котором изображение делится на 9 равных частей двумя горизонтальными и двумя вертикальными линиями."
            },
            {
                question: "Что такое золотое сечение?",
                options: [
                    "Математическая пропорция 1:1.618",
                    "Использование золотого цвета",
                    "Создание симметрии", 
                    "Разделение на равные части"
                ],
                correct_answer: 0,
                explanation: "Золотое сечение - это математическая пропорция, приблизительно равная 1:1.618, которая считается эстетически приятной."
            }
        ]);

        this.run(
            `INSERT INTO quizzes (title, description, questions, total_questions, sparks_per_correct, sparks_perfect_bonus, category) 
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            ['Основы композиции', 'Проверьте свои знания основ композиции в искусстве', quizQuestions, 2, 2, 5, 'art']
        );

        const shopItems = [
            { title: 'Основы живописи', description: 'Полный курс по основам живописи для начинающих', type: 'video', price: 50, category: 'art' },
            { title: 'Основы композиции', description: 'Изучите принципы построения гармоничных композиций', type: 'text', price: 30, category: 'art' },
            { title: 'Цветоведение', description: 'Научитесь работать с цветом и создавать гармоничные палитры', type: 'video', price: 45, category: 'design' }
        ];

        shopItems.forEach(item => {
            this.run(
                "INSERT INTO shop_items (title, description, type, price, category) VALUES (?, ?, ?, ?, ?)",
                [item.title, item.description, item.type, item.price, item.category]
            );
        });

        console.log('✅ Начальные данные загружены в базу');
    }

    // Методы для работы с базой
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

    close() {
        this.db.close((err) => {
            if (err) {
                console.error('❌ Ошибка закрытия базы:', err.message);
            } else {
                console.log('✅ Подключение к базе закрыто');
            }
        });
    }
}

export const dbService = new RealDatabaseService();
