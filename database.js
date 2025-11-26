// database.js
import sqlite3 from 'sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

class DatabaseService {
    constructor() {
        // Используем базу в памяти для простоты
        this.dbPath = ':memory:';
        this.db = null;
        this.init();
    }

    init() {
        return new Promise((resolve, reject) => {
            this.db = new sqlite3.Database(this.dbPath, (err) => {
                if (err) {
                    console.error('❌ Ошибка подключения к базе:', err.message);
                    reject(err);
                } else {
                    console.log('✅ Подключение к SQLite установлено');
                    this.createTables().then(resolve).catch(reject);
                }
            });
        });
    }

    async createTables() {
        console.log('📊 Создаем таблицы...');
        
        const tables = [
            // Пользователи
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
                is_active BOOLEAN DEFAULT 1
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
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
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

            // Посты
            `CREATE TABLE IF NOT EXISTS posts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                content TEXT,
                media_urls TEXT DEFAULT '[]',
                allowed_actions TEXT DEFAULT '[]',
                reward INTEGER DEFAULT 0,
                is_published BOOLEAN DEFAULT 1,
                views_count INTEGER DEFAULT 0,
                likes_count INTEGER DEFAULT 0,
                comments_count INTEGER DEFAULT 0,
                shares_count INTEGER DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                tags TEXT DEFAULT '[]',
                category TEXT
            )`,

            // Активности
            `CREATE TABLE IF NOT EXISTS activities (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                activity_type TEXT,
                sparks_earned REAL,
                description TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
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
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`
        ];

        try {
            // Создаем таблицы последовательно
            for (let i = 0; i < tables.length; i++) {
                await this.run(tables[i]);
                console.log(`✅ Таблица ${i + 1}/${tables.length} создана`);
            }
            
            // Заполняем начальными данными
            await this.fillInitialData();
            console.log('🎉 База данных готова к работе!');
            
        } catch (error) {
            console.error('❌ Ошибка создания таблиц:', error);
            throw error;
        }
    }

    async fillInitialData() {
        console.log('📦 Заполняем базу начальными данными...');

        // Роли
        const roles = [
            { 
                name: 'Художник', 
                description: 'Создавайте визуальные произведения искусства', 
                icon: '🎨', 
                available_buttons: JSON.stringify(['quiz','marathon','works','activities','posts','shop','invite','interactives','change_role']), 
                color: '#FF6B6B', 
                display_order: 1 
            },
            { 
                name: 'Писатель', 
                description: 'Создавайте литературные произведения', 
                icon: '📝', 
                available_buttons: JSON.stringify(['quiz','marathon','works','activities','posts','shop','invite','interactives','change_role']), 
                color: '#4ECDC4', 
                display_order: 2 
            },
            { 
                name: 'Дизайнер', 
                description: 'Создавайте эстетичные и функциональные дизайны', 
                icon: '✨', 
                available_buttons: JSON.stringify(['quiz','marathon','works','activities','posts','shop','invite','interactives','change_role']), 
                color: '#45B7D1', 
                display_order: 3 
            }
        ];

        for (const role of roles) {
            await this.run(
                "INSERT INTO roles (name, description, icon, available_buttons, color, display_order) VALUES (?, ?, ?, ?, ?, ?)",
                [role.name, role.description, role.icon, role.available_buttons, role.color, role.display_order]
            );
        }

        // Персонажи
        const characters = [
            { role_id: 1, name: 'Импрессионист', description: 'Мастер света и цвета', bonus_type: 'percent_bonus', bonus_value: '15' },
            { role_id: 1, name: 'Сюрреалист', description: 'Исследователь подсознания', bonus_type: 'random_gift', bonus_value: '3' },
            { role_id: 2, name: 'Поэт', description: 'Волшебник слова', bonus_type: 'forgiveness', bonus_value: '2' },
            { role_id: 2, name: 'Прозаик', description: 'Мастер повествования', bonus_type: 'series_bonus', bonus_value: '5' },
            { role_id: 3, name: 'Графический дизайнер', description: 'Создатель визуальных коммуникаций', bonus_type: 'secret_advice', bonus_value: '7' },
            { role_id: 3, name: 'UI/UX дизайнер', description: 'Специалист по пользовательскому опыту', bonus_type: 'percent_bonus', bonus_value: '10' }
        ];

        for (const character of characters) {
            await this.run(
                "INSERT INTO characters (role_id, name, description, bonus_type, bonus_value) VALUES (?, ?, ?, ?, ?)",
                [character.role_id, character.name, character.description, character.bonus_type, character.bonus_value]
            );
        }

        // Тестовый квиз
        const quizQuestions = [
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
        ];

        await this.run(
            `INSERT INTO quizzes (title, description, questions, total_questions, sparks_per_correct, sparks_perfect_bonus, category) 
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
                'Основы композиции', 
                'Проверьте свои знания основ композиции в искусстве', 
                JSON.stringify(quizQuestions), 
                2, 2, 5, 'art'
            ]
        );

        // Товары в магазине
        const shopItems = [
            { 
                title: 'Основы живописи', 
                description: 'Полный курс по основам живописи для начинающих', 
                type: 'video', 
                price: 50, 
                category: 'art',
                content_text: 'В этом курсе вы узнаете все основы живописи: от выбора материалов до создания завершенных работ.'
            },
            { 
                title: 'Основы композиции', 
                description: 'Изучите принципы построения гармоничных композиций', 
                type: 'text', 
                price: 30, 
                category: 'art',
                content_text: 'Композиция - это основа любого произведения искусства. В этом курсе вы научитесь создавать гармоничные и сбалансированные работы.'
            }
        ];

        for (const item of shopItems) {
            await this.run(
                "INSERT INTO shop_items (title, description, type, price, category, content_text) VALUES (?, ?, ?, ?, ?, ?)",
                [item.title, item.description, item.type, item.price, item.category, item.content_text]
            );
        }

        // Посты
        const posts = [
            {
                title: '10 советов для начинающих художников',
                content: '1. Рисуйте регулярно, даже если по 15 минут в день\n2. Не бойтесь экспериментировать с материалами\n3. Изучайте работы мастеров\n4. Начинайте с простых форм\n5. Практикуйте наблюдение\n6. Не сравнивайте себя с другими\n7. Сохраняйте свои ранние работы\n8. Ищите вдохновение вокруг\n9. Отдыхайте и делайте перерывы\n10. Наслаждайтесь процессом!',
                category: 'art',
                tags: JSON.stringify(['советы', 'обучение', 'искусство'])
            }
        ];

        for (const post of posts) {
            await this.run(
                "INSERT INTO posts (title, content, category, tags) VALUES (?, ?, ?, ?)",
                [post.title, post.content, post.category, post.tags]
            );
        }

        console.log('✅ Начальные данные успешно загружены');
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
        if (this.db) {
            this.db.close();
        }
    }
}

// Создаем и инициализируем базу данных
const dbService = new DatabaseService();

// Экспортируем промис, который разрешится когда база будет готова
export const databaseReady = dbService.init().catch(err => {
    console.error('❌ Критическая ошибка инициализации базы:', err);
    process.exit(1);
});

export { dbService };
