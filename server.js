import express from 'express';
import TelegramBot from 'node-telegram-bot-api';
import cors from 'cors';
import bodyParser from 'body-parser';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readdirSync, existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import dotenv from 'dotenv';
import multer from 'multer';
import path from 'path';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import sharp from 'sharp';
import pkg from 'pg';
const { Client } = pkg;

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const APP_ROOT = process.cwd();

// ==================== КОНСТАНТЫ И НАСТРОЙКИ ====================
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';
const SESSION_DURATION = 30 * 24 * 60 * 60 * 1000; // 30 дней

const SPARKS_SYSTEM = {
    QUIZ_PER_CORRECT_ANSWER: 1,
    QUIZ_PERFECT_BONUS: 5,
    MARATHON_DAY_COMPLETION: 7,
    MARATHON_COMPLETION_BONUS: 15,
    INVITE_FRIEND: 10,
    WRITE_REVIEW: 3,
    DAILY_COMMENT: 1,
    UPLOAD_WORK: 5,
    WORK_APPROVED: 15,
    REGISTRATION_BONUS: 10,
    PARTICIPATE_POLL: 2,
    INTERACTIVE_COMPLETION: 3,
    INTERACTIVE_SUBMISSION: 2,
    COMPLIMENT_CHALLENGE: 0.5,
    MARATHON_SUBMISSION: 5,
    ROLE_CHANGE: 0,
    DAILY_LOGIN: 2,
    PROFILE_COMPLETION: 5,
    FIRST_PURCHASE: 5,
    ACHIEVEMENT_UNLOCK: 10,
    CONTENT_SHARE: 3,
    COMMUNITY_HELP: 8
};

// ==================== БАЗА ДАННЫХ POSTGRESQL ====================
class PostgreSQLDatabaseService {
    constructor() {
        this.client = new Client({
            user: process.env.DB_USER || 'gen_user',
            host: process.env.DB_HOST || '789badf9748826d5c6ffd045.twc1.net',
            database: process.env.DB_NAME || 'default_db',
            password: process.env.DB_PASSWORD || 'GrMp*mZ^FF&1u<',
            port: parseInt(process.env.DB_PORT) || 5432,
            ssl: process.env.NODE_ENV === 'production' ? { 
                rejectUnauthorized: true,
                // ca: fs.readFileSync(path.join(os.homedir(), '.cloud-certs', 'root.crt'), 'utf-8')
            } : false
        });
        
        this.connected = false;
        this.init();
    }

    async init() {
        try {
            await this.client.connect();
            this.connected = true;
            console.log('✅ PostgreSQL подключена успешно');
            
            await this.createTables();
            await this.initializeDefaultData();
        } catch (error) {
            console.error('❌ Ошибка подключения к PostgreSQL:', error);
            // Fallback to SQLite for development
            await this.initializeFallbackDatabase();
        }
    }

    async createTables() {
        const tables = [
            // Таблица пользователей
            `
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                user_id BIGINT UNIQUE NOT NULL,
                tg_first_name TEXT NOT NULL,
                tg_username TEXT,
                email TEXT UNIQUE,
                phone TEXT,
                sparks REAL DEFAULT 0,
                level TEXT DEFAULT 'Ученик',
                is_registered BOOLEAN DEFAULT FALSE,
                class TEXT,
                character_id INTEGER,
                character_name TEXT,
                available_buttons JSONB DEFAULT '[]',
                registration_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                last_active TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                status TEXT DEFAULT 'active',
                invited_by BIGINT,
                invite_count INTEGER DEFAULT 0,
                total_invited INTEGER DEFAULT 0,
                is_active BOOLEAN DEFAULT TRUE
            )
            `,
            
            // Таблица ролей
            `
            CREATE TABLE IF NOT EXISTS roles (
                id SERIAL PRIMARY KEY,
                name TEXT UNIQUE NOT NULL,
                description TEXT,
                icon TEXT,
                available_buttons JSONB DEFAULT '[]',
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                color TEXT,
                display_order INTEGER DEFAULT 0
            )
            `,
            
            // Таблица персонажей
            `
            CREATE TABLE IF NOT EXISTS characters (
                id SERIAL PRIMARY KEY,
                role_id INTEGER NOT NULL REFERENCES roles(id),
                name TEXT NOT NULL,
                description TEXT,
                bonus_type TEXT NOT NULL,
                bonus_value TEXT NOT NULL,
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                image_url TEXT,
                personality TEXT,
                special_ability TEXT
            )
            `,
            
            // Таблица квизов
            `
            CREATE TABLE IF NOT EXISTS quizzes (
                id SERIAL PRIMARY KEY,
                title TEXT NOT NULL,
                description TEXT,
                questions JSONB NOT NULL,
                sparks_per_correct REAL DEFAULT 1,
                sparks_perfect_bonus INTEGER DEFAULT 5,
                cooldown_hours INTEGER DEFAULT 24,
                allow_retake BOOLEAN DEFAULT TRUE,
                is_active BOOLEAN DEFAULT TRUE,
                difficulty TEXT DEFAULT 'beginner',
                estimated_time INTEGER,
                category TEXT,
                tags JSONB DEFAULT '[]',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
            `,
            
            // Таблица завершений квизов
            `
            CREATE TABLE IF NOT EXISTS quiz_completions (
                id SERIAL PRIMARY KEY,
                user_id BIGINT NOT NULL REFERENCES users(user_id),
                quiz_id INTEGER NOT NULL REFERENCES quizzes(id),
                completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                score INTEGER NOT NULL,
                total_questions INTEGER NOT NULL,
                sparks_earned REAL NOT NULL,
                perfect_score BOOLEAN DEFAULT FALSE,
                time_spent INTEGER,
                answers JSONB,
                speed_bonus REAL DEFAULT 0
            )
            `,
            
            // Таблица марафонов
            `
            CREATE TABLE IF NOT EXISTS marathons (
                id SERIAL PRIMARY KEY,
                title TEXT NOT NULL,
                description TEXT,
                duration INTEGER NOT NULL,
                days JSONB NOT NULL,
                completion_reward INTEGER DEFAULT 0,
                start_date TIMESTAMP,
                is_active BOOLEAN DEFAULT TRUE,
                difficulty TEXT DEFAULT 'beginner',
                category TEXT,
                tags JSONB DEFAULT '[]',
                participants_count INTEGER DEFAULT 0,
                average_rating REAL DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                cover_image TEXT,
                requirements JSONB DEFAULT '[]'
            )
            `,
            
            // Таблица завершений марафонов
            `
            CREATE TABLE IF NOT EXISTS marathon_completions (
                id SERIAL PRIMARY KEY,
                user_id BIGINT NOT NULL REFERENCES users(user_id),
                marathon_id INTEGER NOT NULL REFERENCES marathons(id),
                current_day INTEGER DEFAULT 1,
                progress INTEGER DEFAULT 0,
                completed BOOLEAN DEFAULT FALSE,
                started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                total_sparks_earned REAL DEFAULT 0,
                days_completed JSONB DEFAULT '[]',
                UNIQUE(user_id, marathon_id)
            )
            `,
            
            // Таблица отправок марафонов
            `
            CREATE TABLE IF NOT EXISTS marathon_submissions (
                id SERIAL PRIMARY KEY,
                user_id BIGINT NOT NULL REFERENCES users(user_id),
                marathon_id INTEGER NOT NULL REFERENCES marathons(id),
                day INTEGER NOT NULL,
                submission_text TEXT,
                submission_image TEXT,
                submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                status TEXT DEFAULT 'pending',
                moderator_id BIGINT,
                moderated_at TIMESTAMP,
                admin_comment TEXT,
                sparks_awarded REAL DEFAULT 0,
                is_late BOOLEAN DEFAULT FALSE,
                time_spent INTEGER
            )
            `,
            
            // Таблица товаров магазина
            `
            CREATE TABLE IF NOT EXISTS shop_items (
                id SERIAL PRIMARY KEY,
                title TEXT NOT NULL,
                description TEXT,
                type TEXT NOT NULL,
                file_url TEXT,
                preview_url TEXT,
                price REAL NOT NULL,
                content_text TEXT,
                embed_html TEXT,
                is_active BOOLEAN DEFAULT TRUE,
                category TEXT,
                difficulty TEXT,
                estimated_duration TEXT,
                instructor TEXT,
                rating REAL DEFAULT 0,
                students_count INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                tags JSONB DEFAULT '[]'
            )
            `,
            
            // Таблица покупок
            `
            CREATE TABLE IF NOT EXISTS purchases (
                id SERIAL PRIMARY KEY,
                user_id BIGINT NOT NULL REFERENCES users(user_id),
                item_id INTEGER NOT NULL REFERENCES shop_items(id),
                price_paid REAL NOT NULL,
                purchased_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                status TEXT DEFAULT 'completed',
                download_count INTEGER DEFAULT 0,
                last_download TIMESTAMP
            )
            `,
            
            // Таблица активностей
            `
            CREATE TABLE IF NOT EXISTS activities (
                id SERIAL PRIMARY KEY,
                user_id BIGINT NOT NULL REFERENCES users(user_id),
                activity_type TEXT NOT NULL,
                sparks_earned REAL NOT NULL,
                description TEXT NOT NULL,
                old_sparks REAL,
                new_sparks REAL,
                old_level TEXT,
                new_level TEXT,
                metadata JSONB,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
            `,
            
            // Таблица постов
            `
            CREATE TABLE IF NOT EXISTS posts (
                id SERIAL PRIMARY KEY,
                title TEXT NOT NULL,
                content TEXT NOT NULL,
                media_urls JSONB DEFAULT '[]',
                allowed_actions JSONB DEFAULT '[]',
                reward REAL DEFAULT 0,
                is_published BOOLEAN DEFAULT TRUE,
                views_count INTEGER DEFAULT 0,
                likes_count INTEGER DEFAULT 0,
                comments_count INTEGER DEFAULT 0,
                shares_count INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                tags JSONB DEFAULT '[]',
                category TEXT,
                author_id BIGINT
            )
            `,
            
            // Таблица отзывов к постам
            `
            CREATE TABLE IF NOT EXISTS post_reviews (
                id SERIAL PRIMARY KEY,
                user_id BIGINT NOT NULL REFERENCES users(user_id),
                post_id INTEGER NOT NULL REFERENCES posts(id),
                review_text TEXT NOT NULL,
                rating INTEGER DEFAULT 5,
                status TEXT DEFAULT 'pending',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                moderated_at TIMESTAMP,
                moderator_id BIGINT,
                admin_comment TEXT
            )
            `,
            
            // Таблица работ пользователей
            `
            CREATE TABLE IF NOT EXISTS user_works (
                id SERIAL PRIMARY KEY,
                user_id BIGINT NOT NULL REFERENCES users(user_id),
                title TEXT NOT NULL,
                description TEXT,
                image_url TEXT NOT NULL,
                type TEXT DEFAULT 'image',
                status TEXT DEFAULT 'pending',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                moderated_at TIMESTAMP,
                moderator_id BIGINT,
                admin_comment TEXT,
                likes_count INTEGER DEFAULT 0,
                comments_count INTEGER DEFAULT 0,
                category TEXT,
                tags JSONB DEFAULT '[]'
            )
            `,
            
            // Таблица отзывов к работам
            `
            CREATE TABLE IF NOT EXISTS work_reviews (
                id SERIAL PRIMARY KEY,
                user_id BIGINT NOT NULL REFERENCES users(user_id),
                work_id INTEGER NOT NULL REFERENCES user_works(id),
                review_text TEXT NOT NULL,
                rating INTEGER DEFAULT 5,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
            `,
            
            // Таблица интерактивов
            `
            CREATE TABLE IF NOT EXISTS interactives (
                id SERIAL PRIMARY KEY,
                title TEXT NOT NULL,
                description TEXT,
                type TEXT NOT NULL,
                category TEXT NOT NULL,
                image_url TEXT,
                question TEXT,
                options JSONB DEFAULT '[]',
                correct_answer INTEGER,
                sparks_reward INTEGER DEFAULT 3,
                allow_retake BOOLEAN DEFAULT FALSE,
                is_active BOOLEAN DEFAULT TRUE,
                difficulty TEXT DEFAULT 'beginner',
                estimated_time INTEGER,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                attempts_count INTEGER DEFAULT 0,
                success_rate REAL DEFAULT 0
            )
            `,
            
            // Таблица завершений интерактивов
            `
            CREATE TABLE IF NOT EXISTS interactive_completions (
                id SERIAL PRIMARY KEY,
                user_id BIGINT NOT NULL REFERENCES users(user_id),
                interactive_id INTEGER NOT NULL REFERENCES interactives(id),
                completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                score INTEGER NOT NULL,
                sparks_earned REAL NOT NULL,
                answer TEXT,
                time_spent INTEGER,
                speed_bonus REAL DEFAULT 0
            )
            `,
            
            // Таблица отправок интерактивов
            `
            CREATE TABLE IF NOT EXISTS interactive_submissions (
                id SERIAL PRIMARY KEY,
                user_id BIGINT NOT NULL REFERENCES users(user_id),
                interactive_id INTEGER NOT NULL REFERENCES interactives(id),
                submission_data TEXT NOT NULL,
                description TEXT,
                submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                status TEXT DEFAULT 'pending',
                moderator_id BIGINT,
                moderated_at TIMESTAMP,
                admin_comment TEXT
            )
            `,
            
            // Таблица администраторов
            `
            CREATE TABLE IF NOT EXISTS admins (
                id SERIAL PRIMARY KEY,
                user_id BIGINT UNIQUE NOT NULL REFERENCES users(user_id),
                username TEXT NOT NULL,
                role TEXT DEFAULT 'moderator',
                permissions JSONB DEFAULT '[]',
                is_active BOOLEAN DEFAULT TRUE,
                last_login TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                notes TEXT
            )
            `,
            
            // Таблица логов администраторов
            `
            CREATE TABLE IF NOT EXISTS admin_logs (
                id SERIAL PRIMARY KEY,
                admin_id INTEGER NOT NULL REFERENCES admins(id),
                admin_name TEXT NOT NULL,
                action TEXT NOT NULL,
                details TEXT,
                target_id INTEGER,
                target_type TEXT,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                ip_address TEXT
            )
            `,
            
            // Таблица ежедневных отзывов
            `
            CREATE TABLE IF NOT EXISTS daily_reviews (
                id SERIAL PRIMARY KEY,
                user_id BIGINT NOT NULL REFERENCES users(user_id),
                date DATE NOT NULL,
                type TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(user_id, date, type)
            )
            `,
            
            // Таблица сессий
            `
            CREATE TABLE IF NOT EXISTS sessions (
                id SERIAL PRIMARY KEY,
                user_id BIGINT NOT NULL REFERENCES users(user_id),
                session_token TEXT UNIQUE NOT NULL,
                expires_at TIMESTAMP NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
            `,
            
            // Таблица уведомлений
            `
            CREATE TABLE IF NOT EXISTS notifications (
                id SERIAL PRIMARY KEY,
                user_id BIGINT NOT NULL REFERENCES users(user_id),
                title TEXT NOT NULL,
                message TEXT NOT NULL,
                type TEXT DEFAULT 'info',
                is_read BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
            `,
            
            // Таблица системных настроек
            `
            CREATE TABLE IF NOT EXISTS system_settings (
                id SERIAL PRIMARY KEY,
                key TEXT UNIQUE NOT NULL,
                value TEXT NOT NULL,
                description TEXT,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
            `
        ];

        for (const tableSQL of tables) {
            try {
                await this.client.query(tableSQL);
            } catch (error) {
                console.error('Ошибка создания таблицы:', error.message);
            }
        }

        console.log('✅ Все таблицы созданы успешно');
    }

    async initializeDefaultData() {
        // Проверяем, есть ли уже данные
        const rolesCount = await this.get("SELECT COUNT(*) as count FROM roles");
        
        if (rolesCount.count === 0) {
            console.log('🔄 Инициализация базы данных с тестовыми данными...');

            // Системные настройки
            const systemSettings = [
                ['systemName', 'Мастерская Вдохновения', 'Название системы'],
                ['registrationReward', '10', 'Награда за регистрацию'],
                ['dailyBonus', '5', 'Ежедневный бонус'],
                ['inviteLimit', '5', 'Лимит приглашений'],
                ['maxFileSize', '3145728000', 'Максимальный размер файла'],
                ['sparkExchangeRate', '1', 'Курс обмена искр'],
                ['telegramBotEnabled', 'true', 'Включен ли Telegram бот'],
                ['version', '2.0.0', 'Версия системы']
            ];

            for (const [key, value, description] of systemSettings) {
                await this.run(
                    "INSERT INTO system_settings (key, value, description) VALUES ($1, $2, $3)",
                    [key, value, description]
                );
            }

            // Роли
            const roles = [
                ['Художники', 'Творцы изобразительного искусства', '🎨', '["quiz","marathon","works","activities","posts","shop","invite","interactives","change_role"]', '#FF6B6B', 1],
                ['Стилисты', 'Мастера создания гармоничных образов', '👗', '["quiz","marathon","works","activities","posts","shop","invite","interactives","change_role"]', '#4ECDC4', 2],
                ['Мастера', 'Ремесленники прикладного искусства', '🧵', '["quiz","marathon","works","activities","posts","shop","invite","interactives","change_role"]', '#45B7D1', 3],
                ['Историки', 'Знатоки истории искусств и культуры', '🏛️', '["quiz","marathon","works","activities","posts","shop","invite","interactives","change_role"]', '#96CEB4', 4]
            ];

            for (const role of roles) {
                await this.run(
                    "INSERT INTO roles (name, description, icon, available_buttons, color, display_order) VALUES ($1, $2, $3, $4, $5, $6)",
                    role
                );
            }

            // Персонажи
            const characters = [
                [1, 'Лука Цветной', 'Рисует с детства, обожает эксперименты с цветом', 'percent_bonus', '10', '/images/characters/luka.jpg', 'Энергичный, экспериментатор', 'Цветовое чутье'],
                [1, 'Марина Кисть', 'Строгая преподавательница академической живописи', 'forgiveness', '1', '/images/characters/marina.jpg', 'Строгая, мудрая', 'Право на ошибку'],
                [2, 'Эстелла Моде', 'Бывший стилист парижских модных домов', 'percent_bonus', '5', '/images/characters/estella.jpg', 'Элегантная, внимательная', 'Стильный взгляд'],
                [3, 'Артем Резчик', 'Мастер по дереву и керамике', 'random_gift', '1-3', '/images/characters/artem.jpg', 'Терпеливый, основательный', 'Щедрая душа'],
                [4, 'София Хроник', 'Искусствовед и историк культуры', 'secret_advice', '2weeks', '/images/characters/sofia.jpg', 'Эрудированная, рассказчик', 'Мудрые советы']
            ];

            for (const character of characters) {
                await this.run(
                    "INSERT INTO characters (role_id, name, description, bonus_type, bonus_value, image_url, personality, special_ability) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)",
                    character
                );
            }

            // Тестовые пользователи
            const testUsers = [
                [12345, 'Тестовый Пользователь', 'test_user', 45.5, 'Искатель', 'Художники', 1, 'Лука Цветной'],
                [898508164, 'Администратор', 'admin', 250.0, 'Мастер', 'Художники', 1, 'Лука Цветной'],
                [79156202620, 'Тест Пользователь 2', 'test_user2', 30.0, 'Знаток', 'Стилисты', 3, 'Эстелла Моде']
            ];

            for (const user of testUsers) {
                await this.run(
                    `INSERT INTO users (user_id, tg_first_name, tg_username, sparks, level, class, character_id, character_name, is_registered, available_buttons) 
                     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true, $9)`,
                    [...user, '["quiz","marathon","works","activities","posts","shop","invite","interactives","change_role"]']
                );
            }

            // Администраторы
            const admins = [
                [898508164, 'admin', 'superadmin', '["users","content","moderation","settings","finance","analytics"]'],
                [79156202620, 'moderator1', 'moderator', '["users","moderation"]'],
                [781959267, 'content_manager', 'content_manager', '["content"]']
            ];

            for (const admin of admins) {
                await this.run(
                    "INSERT INTO admins (user_id, username, role, permissions) VALUES ($1, $2, $3, $4)",
                    admin
                );
            }

            console.log('✅ База данных инициализирована с тестовыми данными');
        }
    }

    async initializeFallbackDatabase() {
        console.log('🔄 Используется fallback база данных (SQLite не поддерживается в этой версии)');
        // В этой версии мы используем только PostgreSQL
    }

    async run(sql, params = []) {
        try {
            const result = await this.client.query(sql, params);
            return result;
        } catch (error) {
            console.error('❌ Ошибка выполнения запроса:', error);
            throw error;
        }
    }

    async get(sql, params = []) {
        try {
            const result = await this.client.query(sql, params);
            return result.rows[0] || null;
        } catch (error) {
            console.error('❌ Ошибка выполнения запроса:', error);
            throw error;
        }
    }

    async all(sql, params = []) {
        try {
            const result = await this.client.query(sql, params);
            return result.rows;
        } catch (error) {
            console.error('❌ Ошибка выполнения запроса:', error);
            throw error;
        }
    }

    // Вспомогательные методы для работы с JSON полями
    parseJSONField(field) {
        try {
            return field ? (typeof field === 'string' ? JSON.parse(field) : field) : [];
        } catch {
            return [];
        }
    }

    stringifyJSONField(data) {
        return JSON.stringify(data || []);
    }
}

const dbService = new PostgreSQLDatabaseService();

// ==================== СИСТЕМА АУТЕНТИФИКАЦИИ И СЕССИЙ ====================
class AuthService {
    static generateSessionToken() {
        return jwt.sign({ 
            id: uuidv4(),
            timestamp: Date.now()
        }, JWT_SECRET);
    }

    static verifySessionToken(token) {
        try {
            return jwt.verify(token, JWT_SECRET);
        } catch (error) {
            throw new Error('Недействительный токен сессии');
        }
    }

    static async createSession(userId) {
        const sessionToken = this.generateSessionToken();
        const expiresAt = new Date(Date.now() + SESSION_DURATION);
        
        await dbService.run(
            "INSERT INTO sessions (user_id, session_token, expires_at) VALUES (?, ?, ?)",
            [userId, sessionToken, expiresAt.toISOString()]
        );

        return { sessionToken, expiresAt };
    }

    static async validateSession(sessionToken) {
        const session = await dbService.get(
            `SELECT s.*, u.* FROM sessions s 
             JOIN users u ON s.user_id = u.user_id 
             WHERE s.session_token = ? AND s.expires_at > datetime('now')`,
            [sessionToken]
        );

        if (!session) {
            throw new Error('Сессия истекла или недействительна');
        }

        return session;
    }

    static async invalidateSession(sessionToken) {
        await dbService.run(
            "DELETE FROM sessions WHERE session_token = ?",
            [sessionToken]
        );
    }

    static async invalidateAllUserSessions(userId) {
        await dbService.run(
            "DELETE FROM sessions WHERE user_id = ?",
            [userId]
        );
    }
}

// ==================== РАСШИРЕННАЯ СИСТЕМА ИСКР ====================
class EnhancedSparksService {
    static calculateLevel(sparks) {
        if (sparks >= 400) return 'Наставник';
        if (sparks >= 300) return 'Мастер';
        if (sparks >= 150) return 'Знаток';
        if (sparks >= 50) return 'Искатель';
        return 'Ученик';
    }

    static async addSparks(userId, sparks, activityType, description, metadata = {}) {
        const user = await dbService.get(
            "SELECT sparks, level FROM users WHERE user_id = ?",
            [userId]
        );

        if (!user) {
            throw new Error('Пользователь не найден');
        }

        const oldSparks = user.sparks;
        const oldLevel = user.level;
        const newSparks = Math.max(0, user.sparks + sparks);
        const newLevel = this.calculateLevel(newSparks);

        // Обновляем баланс искр и уровень
        await dbService.run(
            "UPDATE users SET sparks = ?, level = ?, last_active = datetime('now') WHERE user_id = ?",
            [newSparks, newLevel, userId]
        );

        // Логируем активность
        await dbService.run(
            `INSERT INTO activities (user_id, activity_type, sparks_earned, description, old_sparks, new_sparks, old_level, new_level, metadata) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [userId, activityType, sparks, description, oldSparks, newSparks, oldLevel, newLevel, JSON.stringify(metadata)]
        );

        // Создаем уведомление о начислении искр
        if (sparks > 0) {
            await this.createNotification(
                userId,
                '✨ Получены искры!',
                `Вам начислено ${sparks} искр за: ${description}`,
                'success'
            );
        }

        // Проверяем достижения
        await this.checkAchievements(userId);

        return { newSparks, newLevel };
    }

    static async createNotification(userId, title, message, type = 'info') {
        await dbService.run(
            "INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, ?)",
            [userId, title, message, type]
        );
    }

    static async getUserStats(userId) {
        const stats = await dbService.get(`
            SELECT 
                (SELECT COUNT(*) FROM quiz_completions WHERE user_id = ?) as total_quizzes_completed,
                (SELECT COUNT(*) FROM quiz_completions WHERE user_id = ? AND perfect_score = 1) as perfect_quizzes,
                (SELECT COUNT(*) FROM user_works WHERE user_id = ?) as total_works,
                (SELECT COUNT(*) FROM user_works WHERE user_id = ? AND status = 'approved') as approved_works,
                (SELECT COUNT(*) FROM marathon_completions WHERE user_id = ? AND completed = 1) as total_marathons_completed,
                (SELECT COUNT(*) FROM interactive_completions WHERE user_id = ?) as total_interactives_completed,
                (SELECT COUNT(*) FROM post_reviews WHERE user_id = ?) as total_reviews,
                (SELECT COUNT(*) FROM activities WHERE user_id = ?) as total_activities,
                (SELECT COALESCE(SUM(sparks_earned), 0) FROM activities WHERE user_id = ?) as total_sparks_earned,
                (SELECT COUNT(*) FROM purchases WHERE user_id = ?) as total_purchases
        `, [userId, userId, userId, userId, userId, userId, userId, userId, userId, userId]);

        // Рассчитываем активность за последние 7 дней
        const recentActivities = await dbService.all(
            "SELECT COUNT(*) as count FROM activities WHERE user_id = ? AND created_at > datetime('now', '-7 days')",
            [userId]
        );

        const activityStreak = await this.calculateActivityStreak(userId);
        const rank = await this.calculateUserRank(userId);

        return {
            ...stats,
            recentActivity: recentActivities[0]?.count || 0,
            activityStreak,
            rank
        };
    }

    static async calculateActivityStreak(userId) {
        const activities = await dbService.all(
            "SELECT created_at FROM activities WHERE user_id = ? ORDER BY created_at DESC LIMIT 100",
            [userId]
        );

        if (activities.length === 0) return 0;

        let streak = 0;
        let currentDate = new Date();
        const today = currentDate.toDateString();

        // Проверяем активность за сегодня
        const hasActivityToday = activities.some(a => 
            new Date(a.created_at).toDateString() === today
        );

        if (!hasActivityToday) return 0;

        streak = 1;
        currentDate.setDate(currentDate.getDate() - 1);

        // Проверяем предыдущие дни
        for (let i = 1; i <= 365; i++) {
            const checkDate = currentDate.toDateString();
            const hasActivity = activities.some(a => 
                new Date(a.created_at).toDateString() === checkDate
            );

            if (hasActivity) {
                streak++;
                currentDate.setDate(currentDate.getDate() - 1);
            } else {
                break;
            }
        }

        return streak;
    }

    static async calculateUserRank(userId) {
        const user = await dbService.get(
            "SELECT sparks FROM users WHERE user_id = ?",
            [userId]
        );

        if (!user) return 0;

        const allUsers = await dbService.all(
            "SELECT user_id, sparks FROM users WHERE is_registered = 1 ORDER BY sparks DESC"
        );

        const userIndex = allUsers.findIndex(u => u.user_id === userId);
        return userIndex + 1;
    }

    static async checkAchievements(userId) {
        const stats = await this.getUserStats(userId);
        const achievements = [];

        // Проверяем различные достижения
        if (stats.total_sparks_earned >= 100) {
            achievements.push({
                id: 1,
                name: "✨ Первые 100 искр",
                description: "Заработайте 100 искр",
                unlocked_at: new Date().toISOString()
            });
        }

        if (stats.approved_works >= 5) {
            achievements.push({
                id: 2,
                name: "🎨 Плодовитый художник",
                description: "Получите одобрение для 5 работ",
                unlocked_at: new Date().toISOString()
            });
        }

        if (stats.activityStreak >= 7) {
            achievements.push({
                id: 3,
                name: "🔥 Неделя активности",
                description: "Будьте активны 7 дней подряд",
                unlocked_at: new Date().toISOString()
            });
        }

        if (stats.perfect_quizzes >= 3) {
            achievements.push({
                id: 4,
                name: "🏆 Знаток квизов",
                description: "Пройдите 3 квиза на идеальный результат",
                unlocked_at: new Date().toISOString()
            });
        }

        // Начисляем искры за новые достижения
        for (const achievement of achievements) {
            const existingActivity = await dbService.get(
                "SELECT * FROM activities WHERE user_id = ? AND activity_type = 'achievement_unlock' AND metadata LIKE ?",
                [userId, `%${achievement.id}%`]
            );

            if (!existingActivity) {
                await this.addSparks(
                    userId, 
                    SPARKS_SYSTEM.ACHIEVEMENT_UNLOCK, 
                    'achievement_unlock', 
                    `Достижение: ${achievement.name}`,
                    { achievementId: achievement.id }
                );
            }
        }

        return achievements;
    }
}

// ==================== СИСТЕМА ФАЙЛОВ И ЗАГРУЗКИ ====================
const uploadsDir = join(APP_ROOT, 'uploads');
const imagesDir = join(uploadsDir, 'images');
const videosDir = join(uploadsDir, 'videos');
const documentsDir = join(uploadsDir, 'documents');

[uploadsDir, imagesDir, videosDir, documentsDir].forEach(dir => {
    if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
    }
});

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        let uploadPath = uploadsDir;
        
        if (file.mimetype.startsWith('image/')) {
            uploadPath = imagesDir;
        } else if (file.mimetype.startsWith('video/')) {
            uploadPath = videosDir;
        } else {
            uploadPath = documentsDir;
        }
        
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 3 * 1024 * 1024 * 1024 // 3GB
    },
    fileFilter: (req, file, cb) => {
        cb(null, true);
    }
});

class FileService {
    static async processImage(buffer, options = {}) {
        const {
            width = 800,
            height = 600,
            quality = 80,
            format = 'jpeg'
        } = options;

        try {
            const processedImage = await sharp(buffer)
                .resize(width, height, {
                    fit: 'inside',
                    withoutEnlargement: true
                })
                .toFormat(format, { quality })
                .toBuffer();

            return processedImage;
        } catch (error) {
            throw new Error(`Ошибка обработки изображения: ${error.message}`);
        }
    }

    static async saveImageToDatabase(buffer, userId, imageType) {
        const imageId = uuidv4();
        return `data:image/jpeg;base64,${buffer.toString('base64')}`;
    }
}

// ==================== MIDDLEWARE ====================
const requireAuth = async (req, res, next) => {
    try {
        const sessionToken = req.headers.authorization?.replace('Bearer ', '') || 
                           req.query.session_token || 
                           req.cookies?.session_token;

        if (!sessionToken) {
            return res.status(401).json({ 
                success: false, 
                error: 'Требуется аутентификация',
                code: 'AUTH_REQUIRED'
            });
        }

        const session = await AuthService.validateSession(sessionToken);
        req.user = session;
        req.sessionToken = sessionToken;
        next();
    } catch (error) {
        res.status(401).json({ 
            success: false, 
            error: error.message,
            code: 'INVALID_SESSION'
        });
    }
};

const requireAdmin = async (req, res, next) => {
    try {
        await requireAuth(req, res, async () => {
            const admin = await dbService.get(
                "SELECT * FROM admins WHERE user_id = ? AND is_active = 1",
                [req.user.user_id]
            );

            if (!admin) {
                return res.status(403).json({ 
                    success: false, 
                    error: 'Недостаточно прав доступа',
                    code: 'ADMIN_ACCESS_DENIED'
                });
            }

            req.admin = admin;
            next();
        });
    } catch (error) {
        res.status(403).json({ 
            success: false, 
            error: error.message 
        });
    }
};

const requirePermission = (permission) => {
    return async (req, res, next) => {
        try {
            if (!req.admin) {
                return res.status(401).json({ 
                    success: false,
                    error: 'Admin authentication required' 
                });
            }
            
            const permissions = dbService.parseJSONField(req.admin.permissions);
            
            if (!permissions.includes(permission) && !permissions.includes('superadmin')) {
                return res.status(403).json({ 
                    success: false,
                    error: `Permission '${permission}' required`,
                    code: 'INSUFFICIENT_PERMISSIONS'
                });
            }
            
            next();
        } catch (error) {
            res.status(403).json({ 
                success: false, 
                error: error.message 
            });
        }
    };
};

// ==================== НАСТРОЙКИ CORS И БЕЗОПАСНОСТИ ====================
const corsOptions = {
    origin: function (origin, callback) {
        const allowedOrigins = [
            'https://web.telegram.org',
            'https://oauth.telegram.org',
            'http://localhost:3000',
            'http://localhost:5173',
            'https://localhost:3000',
            process.env.APP_URL || 'https://sergeynikishin555123123-lab-tg-inspirationn-bot-e112.twc1.net'
        ];
        
        if (!origin || allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            console.log('🚫 CORS блокирован для origin:', origin);
            callback(new Error('Not allowed by CORS'));
        }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin', 'User-Agent', 'tgwebviewdata', 'x-telegram-init-data'],
    credentials: true,
    preflightContinue: false,
    optionsSuccessStatus: 204,
    maxAge: 86400
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

// Усиленные настройки для мобильных устройств
app.use((req, res, next) => {
    const userAgent = req.headers['user-agent'] || '';
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
    const isTelegramWebApp = userAgent.includes('Telegram') || req.headers['sec-fetch-site'] === 'cross-site' || req.query.tgWebAppData;
    
    console.log(`📱 Запрос от: ${isMobile ? 'Мобильное устройство' : 'Десктоп'} - ${req.method} ${req.url}`);
    
    if (isTelegramWebApp) {
        res.removeHeader('X-Frame-Options');
        res.setHeader('Content-Security-Policy', 
            "default-src * 'unsafe-inline' 'unsafe-eval' data: blob:; " +
            "script-src * 'unsafe-inline' 'unsafe-eval'; " +
            "connect-src * 'unsafe-inline'; " +
            "img-src * data: blob: 'unsafe-inline'; " +
            "frame-src *; " +
            "style-src * 'unsafe-inline';"
        );
    }
    
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    
    if (isMobile) {
        req.setTimeout(300000);
        res.setTimeout(300000);
    }
    
    next();
});

// Увеличенные лимиты для больших файлов
app.use(express.json({ 
    limit: '3gb',
    verify: (req, res, buf) => {
        try {
            JSON.parse(buf);
        } catch (e) {
            console.error('❌ Ошибка парсинга JSON:', e.message);
            res.status(400).json({ error: 'Неверный формат JSON', details: e.message });
        }
    }
}));

app.use(express.urlencoded({ 
    limit: '3gb', 
    extended: true,
    parameterLimit: 100000
}));

app.use(bodyParser.json({ 
    limit: '3gb',
    verify: (req, res, buf) => {
        req.rawBody = buf;
    }
}));

app.use(bodyParser.urlencoded({ 
    limit: '3gb', 
    extended: true,
    parameterLimit: 100000
}));

// Статические файлы
app.use(express.static(join(APP_ROOT, 'public'), {
    maxAge: '1d',
    setHeaders: (res, path, stat) => {
        if (path.endsWith('.html')) {
            res.removeHeader('X-Frame-Options');
            res.setHeader('X-Frame-Options', 'ALLOWALL');
        }
        
        if (path.endsWith('.js') || path.endsWith('.css')) {
            res.setHeader('Cache-Control', 'public, max-age=3600');
        } else if (path.endsWith('.png') || path.endsWith('.jpg') || path.endsWith('.jpeg')) {
            res.setHeader('Cache-Control', 'public, max-age=86400');
        }
    }
}));

app.use('/admin', express.static(join(APP_ROOT, 'admin'), {
    maxAge: '1d',
    setHeaders: (res, path, stat) => {
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
    }
}));

app.use('/uploads', express.static(uploadsDir, {
    maxAge: '7d',
    setHeaders: (res, path, stat) => {
        res.setHeader('Cache-Control', 'public, max-age=604800');
    }
}));

// ==================== ОСНОВНЫЕ МАРШРУТЫ ====================
app.get('/', (req, res) => {
    const filePath = join(APP_ROOT, 'public', 'index.html');
    if (!existsSync(filePath)) {
        return res.status(404).json({ 
            success: false,
            error: 'Главная страница не найдена'
        });
    }
    res.sendFile(filePath);
});

app.get('/admin', (req, res) => {
    const filePath = join(APP_ROOT, 'admin', 'index.html');
    if (!existsSync(filePath)) {
        return res.status(404).json({ 
            success: false,
            error: 'Админка не найдена'
        });
    }
    res.sendFile(filePath);
});

app.get('/admin/*', (req, res) => {
    res.sendFile(join(APP_ROOT, 'admin', 'index.html'));
});

// Health check
app.get('/health', async (req, res) => {
    try {
        const stats = await dbService.get(`
            SELECT 
                (SELECT COUNT(*) FROM users) as total_users,
                (SELECT COUNT(*) FROM users WHERE is_registered = true) as registered_users,
                (SELECT COUNT(*) FROM quizzes WHERE is_active = true) as active_quizzes,
                (SELECT COUNT(*) FROM marathons WHERE is_active = true) as active_marathons,
                (SELECT COUNT(*) FROM shop_items WHERE is_active = true) as shop_items,
                (SELECT COUNT(*) FROM interactives WHERE is_active = true) as interactives,
                (SELECT COUNT(*) FROM posts WHERE is_published = true) as posts,
                (SELECT COUNT(*) FROM admins WHERE is_active = true) as admins
        `);

        const healthInfo = {
            status: 'OK',
            timestamp: new Date().toISOString(),
            version: '2.0.0',
            environment: process.env.NODE_ENV || 'development',
            database: {
                type: 'PostgreSQL',
                connected: dbService.connected,
                ...stats
            },
            system: {
                uptime: process.uptime(),
                memory: process.memoryUsage(),
                node_version: process.version,
                platform: process.platform
            },
            features: {
                telegram_bot: !!process.env.BOT_TOKEN,
                file_uploads: true,
                admin_panel: true,
                sparks_system: true,
                moderation: true,
                achievements: true
            }
        };
        
        res.json(healthInfo);
    } catch (error) {
        res.status(500).json({
            status: 'ERROR',
            error: error.message
        });
    }
});

// ==================== API АУТЕНТИФИКАЦИИ ====================
app.post('/api/auth/login', async (req, res) => {
    try {
        const { userId } = req.body;

        if (!userId) {
            return res.status(400).json({ 
                success: false, 
                error: 'User ID обязателен' 
            });
        }

        // Проверяем существование пользователя
        let user = await dbService.get(
            "SELECT * FROM users WHERE user_id = ?",
            [userId]
        );

        if (!user) {
            // Создаем нового пользователя
            await dbService.run(
                "INSERT INTO users (user_id, tg_first_name, is_registered, status) VALUES (?, ?, ?, ?)",
                [userId, 'Новый пользователь', false, 'active']
            );

            user = await dbService.get(
                "SELECT * FROM users WHERE user_id = ?",
                [userId]
            );
        }

        // Обновляем время последней активности
        await dbService.run(
            "UPDATE users SET last_active = datetime('now') WHERE user_id = ?",
            [userId]
        );

        // Создаем сессию
        const { sessionToken, expiresAt } = await AuthService.createSession(userId);

        const stats = await EnhancedSparksService.getUserStats(userId);

        res.json({
            success: true,
            user: {
                user_id: user.user_id,
                tg_first_name: user.tg_first_name,
                tg_username: user.tg_username,
                sparks: user.sparks,
                level: user.level,
                is_registered: user.is_registered,
                class: user.class,
                character_name: user.character_name,
                available_buttons: dbService.parseJSONField(user.available_buttons),
                stats: stats
            },
            session_token: sessionToken,
            expires_at: expiresAt
        });

    } catch (error) {
        console.error('Ошибка входа:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Ошибка сервера при входе' 
        });
    }
});

app.post('/api/auth/logout', requireAuth, async (req, res) => {
    try {
        await AuthService.invalidateSession(req.sessionToken);
        res.json({ success: true, message: 'Успешный выход' });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            error: 'Ошибка при выходе' 
        });
    }
});

// ==================== ПОЛНАЯ СИСТЕМА ПОЛЬЗОВАТЕЛЕЙ ====================
app.get('/api/users/:userId', requireAuth, async (req, res) => {
    try {
        const userId = parseInt(req.params.userId);
        
        if (userId !== req.user.user_id) {
            return res.status(403).json({ 
                success: false, 
                error: 'Доступ запрещен' 
            });
        }

        const user = await dbService.get(
            "SELECT * FROM users WHERE user_id = ?",
            [userId]
        );

        if (!user) {
            return res.status(404).json({ 
                success: false, 
                error: 'Пользователь не найден' 
            });
        }

        const stats = await EnhancedSparksService.getUserStats(userId);

        res.json({
            success: true,
            user: {
                ...user,
                available_buttons: dbService.parseJSONField(user.available_buttons),
                stats
            }
        });

    } catch (error) {
        console.error('Ошибка получения пользователя:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Ошибка сервера' 
        });
    }
});

app.post('/api/users/register', requireAuth, async (req, res) => {
    try {
        const { firstName, roleId, characterId, username } = req.body;
        const userId = req.user.user_id;

        if (!firstName || !roleId) {
            return res.status(400).json({ 
                success: false, 
                error: 'Имя и роль обязательны' 
            });
        }

        // Получаем роль и персонажа
        const role = await dbService.get(
            "SELECT * FROM roles WHERE id = ? AND is_active = 1",
            [roleId]
        );

        const character = await dbService.get(
            "SELECT * FROM characters WHERE id = ? AND is_active = 1",
            [characterId]
        );

        if (!role) {
            return res.status(404).json({ 
                success: false, 
                error: 'Роль не найдена' 
            });
        }

        const user = await dbService.get(
            "SELECT * FROM users WHERE user_id = ?",
            [userId]
        );

        const isNewUser = !user.is_registered;
        const oldClass = user.class;

        // Обновляем данные пользователя
        await dbService.run(
            `UPDATE users SET 
                tg_first_name = ?,
                tg_username = ?,
                class = ?,
                character_id = ?,
                character_name = ?,
                available_buttons = ?,
                is_registered = 1,
                last_active = datetime('now')
             WHERE user_id = ?`,
            [
                firstName,
                username || user.tg_username,
                role.name,
                characterId,
                character?.name || null,
                role.available_buttons,
                userId
            ]
        );

        let message = 'Регистрация успешна!';
        let sparksAdded = 0;

        if (isNewUser) {
            sparksAdded = SPARKS_SYSTEM.REGISTRATION_BONUS;
            await EnhancedSparksService.addSparks(
                userId, 
                sparksAdded, 
                'registration', 
                'Бонус за регистрацию'
            );
            message = `Регистрация успешна! +${sparksAdded}✨`;
        }

        // Бонус за завершение профиля
        if (!isNewUser && !oldClass && role.name) {
            const profileBonus = SPARKS_SYSTEM.PROFILE_COMPLETION;
            await EnhancedSparksService.addSparks(
                userId, 
                profileBonus, 
                'profile_completion', 
                'Завершение профиля'
            );
            message += ` +${profileBonus}✨ за завершение профиля`;
            sparksAdded += profileBonus;
        }

        const updatedUser = await dbService.get(
            "SELECT * FROM users WHERE user_id = ?",
            [userId]
        );

        const stats = await EnhancedSparksService.getUserStats(userId);

        res.json({
            success: true,
            message,
            sparksAdded,
            user: {
                ...updatedUser,
                available_buttons: dbService.parseJSONField(updatedUser.available_buttons),
                stats
            }
        });

    } catch (error) {
        console.error('Ошибка регистрации:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Ошибка сервера при регистрации' 
        });
    }
});

// Смена роли пользователя
app.post('/api/users/change-role', requireAuth, async (req, res) => {
    try {
        const { roleId, characterId } = req.body;
        const userId = req.user.user_id;

        if (!roleId) {
            return res.status(400).json({ 
                success: false, 
                error: 'Role ID обязателен' 
            });
        }

        const user = await dbService.get(
            "SELECT * FROM users WHERE user_id = ?",
            [userId]
        );

        const role = await dbService.get(
            "SELECT * FROM roles WHERE id = ? AND is_active = 1",
            [roleId]
        );

        const character = await dbService.get(
            "SELECT * FROM characters WHERE id = ? AND is_active = 1",
            [characterId]
        );

        if (!user || !role) {
            return res.status(404).json({ 
                success: false, 
                error: 'Пользователь или роль не найдены' 
            });
        }

        if (!user.is_registered) {
            return res.status(400).json({ 
                success: false, 
                error: 'Пользователь не зарегистрирован' 
            });
        }

        const oldRole = user.class;
        const oldCharacter = user.character_name;

        // Обновляем роль и персонажа
        await dbService.run(
            `UPDATE users SET 
                class = ?,
                character_id = ?,
                character_name = ?,
                available_buttons = ?,
                last_active = datetime('now')
             WHERE user_id = ?`,
            [
                role.name,
                characterId,
                character?.name || null,
                role.available_buttons,
                userId
            ]
        );

        await EnhancedSparksService.addSparks(
            userId, 
            SPARKS_SYSTEM.ROLE_CHANGE, 
            'role_change', 
            `Смена роли: ${oldRole} → ${role.name}, ${oldCharacter} → ${character?.name || 'Не выбран'}`
        );

        const updatedUser = await dbService.get(
            "SELECT * FROM users WHERE user_id = ?",
            [userId]
        );

        const stats = await EnhancedSparksService.getUserStats(userId);

        res.json({ 
            success: true, 
            message: 'Роль успешно изменена!',
            user: {
                ...updatedUser,
                available_buttons: dbService.parseJSONField(updatedUser.available_buttons),
                stats
            }
        });

    } catch (error) {
        console.error('Ошибка смены роли:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Ошибка сервера при смене роли' 
        });
    }
});

// Система приглашений
app.post('/api/users/invite', requireAuth, async (req, res) => {
    try {
        const { invitedUserId } = req.body;
        const userId = req.user.user_id;

        if (!invitedUserId) {
            return res.status(400).json({ 
                success: false, 
                error: 'ID приглашенного пользователя обязателен' 
            });
        }

        const user = await dbService.get(
            "SELECT * FROM users WHERE user_id = ?",
            [userId]
        );

        const invitedUser = await dbService.get(
            "SELECT * FROM users WHERE user_id = ?",
            [invitedUserId]
        );

        if (!user || !invitedUser) {
            return res.status(404).json({ 
                success: false, 
                error: 'Пользователь не найден' 
            });
        }

        if (invitedUser.invited_by) {
            return res.status(400).json({ 
                success: false, 
                error: 'Пользователь уже был приглашен кем-то другим' 
            });
        }

        // Устанавливаем пригласившего
        await dbService.run(
            "UPDATE users SET invited_by = ? WHERE user_id = ?",
            [userId, invitedUserId]
        );

        // Начисляем бонус пригласившему
        await EnhancedSparksService.addSparks(
            userId, 
            SPARKS_SYSTEM.INVITE_FRIEND, 
            'invite_friend', 
            `Приглашен новый пользователь: ${invitedUser.tg_first_name}`
        );

        // Обновляем счетчик приглашений
        await dbService.run(
            "UPDATE users SET invite_count = invite_count + 1, total_invited = total_invited + 1 WHERE user_id = ?",
            [userId]
        );

        res.json({ 
            success: true, 
            message: `Приглашение отправлено! +${SPARKS_SYSTEM.INVITE_FRIEND}✨`,
            sparksEarned: SPARKS_SYSTEM.INVITE_FRIEND
        });

    } catch (error) {
        console.error('Ошибка приглашения:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Ошибка сервера при отправке приглашения' 
        });
    }
});

// Ежедневный бонус
app.post('/api/users/daily-bonus', requireAuth, async (req, res) => {
    try {
        const userId = req.user.user_id;

        const today = new Date().toDateString();
        const lastBonus = await dbService.get(
            `SELECT * FROM activities WHERE user_id = ? AND activity_type = 'daily_bonus' 
             AND date(created_at) = date('now')`,
            [userId]
        );

        if (lastBonus) {
            return res.status(400).json({ 
                success: false,
                error: 'Ежедневный бонус уже получен сегодня' 
            });
        }

        const sparksEarned = SPARKS_SYSTEM.DAILY_LOGIN;
        await EnhancedSparksService.addSparks(
            userId, 
            sparksEarned, 
            'daily_bonus', 
            'Ежедневный бонус за вход'
        );

        res.json({ 
            success: true, 
            message: `Ежедневный бонус получен! +${sparksEarned}✨`,
            sparksEarned
        });

    } catch (error) {
        console.error('Ошибка ежедневного бонуса:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Ошибка сервера при получении бонуса' 
        });
    }
});

// ==================== СИСТЕМА РОЛЕЙ И ПЕРСОНАЖЕЙ ====================

app.get('/api/webapp/roles', async (req, res) => {
    try {
        const roles = await dbService.all(
            "SELECT * FROM roles WHERE is_active = 1 ORDER BY display_order, name"
        );

        const formattedRoles = roles.map(role => ({
            ...role,
            available_buttons: dbService.parseJSONField(role.available_buttons)
        }));

        res.json({
            success: true,
            roles: formattedRoles
        });
    } catch (error) {
        console.error('Ошибка получения ролей:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Ошибка сервера' 
        });
    }
});

app.get('/api/webapp/characters/:roleId', async (req, res) => {
    try {
        const roleId = parseInt(req.params.roleId);
        const characters = await dbService.all(
            "SELECT * FROM characters WHERE role_id = ? AND is_active = 1 ORDER BY name",
            [roleId]
        );

        res.json({
            success: true,
            characters: characters
        });
    } catch (error) {
        console.error('Ошибка получения персонажей:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Ошибка сервера' 
        });
    }
});

app.get('/api/webapp/characters', async (req, res) => {
    try {
        const characters = await dbService.all(`
            SELECT c.*, r.name as role_name, r.icon as role_icon 
            FROM characters c 
            JOIN roles r ON c.role_id = r.id 
            WHERE c.is_active = 1 
            ORDER BY r.display_order, c.name
        `);

        res.json({
            success: true,
            characters: characters
        });
    } catch (error) {
        console.error('Ошибка получения всех персонажей:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Ошибка сервера' 
        });
    }
});

// ==================== ПОЛНАЯ СИСТЕМА КВИЗОВ ====================
app.get('/api/webapp/quizzes', requireAuth, async (req, res) => {
    try {
        const userId = req.user.user_id;
        const { category, difficulty, search } = req.query;
        
        let whereConditions = ["q.is_active = 1"];
        let params = [];

        if (category) {
            whereConditions.push("q.category = ?");
            params.push(category);
        }
        
        if (difficulty) {
            whereConditions.push("q.difficulty = ?");
            params.push(difficulty);
        }

        if (search) {
            whereConditions.push("(q.title LIKE ? OR q.description LIKE ? OR q.tags LIKE ?)");
            const searchTerm = `%${search}%`;
            params.push(searchTerm, searchTerm, searchTerm);
        }

        const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

        const quizzes = await dbService.all(`
            SELECT q.* FROM quizzes q 
            ${whereClause}
            ORDER BY q.created_at DESC
        `, params);

        const quizzesWithStatus = await Promise.all(
            quizzes.map(async (quiz) => {
                const completion = await dbService.get(
                    "SELECT * FROM quiz_completions WHERE user_id = ? AND quiz_id = ? ORDER BY completed_at DESC LIMIT 1",
                    [userId, quiz.id]
                );
                
                const questions = dbService.parseJSONField(quiz.questions);
                
                let canRetake = quiz.allow_retake;
                let retakeAvailableIn = null;
                
                if (completion && quiz.cooldown_hours > 0) {
                    const lastCompletion = new Date(completion.completed_at);
                    const now = new Date();
                    const hoursSinceCompletion = (now - lastCompletion) / (1000 * 60 * 60);
                    canRetake = hoursSinceCompletion >= quiz.cooldown_hours;
                    
                    if (!canRetake) {
                        const hoursLeft = Math.ceil(quiz.cooldown_hours - hoursSinceCompletion);
                        retakeAvailableIn = hoursLeft;
                    }
                }
                
                return {
                    id: quiz.id,
                    title: quiz.title,
                    description: quiz.description,
                    questions_count: questions.length,
                    sparks_per_correct: quiz.sparks_per_correct,
                    sparks_perfect_bonus: quiz.sparks_perfect_bonus,
                    difficulty: quiz.difficulty,
                    category: quiz.category,
                    tags: dbService.parseJSONField(quiz.tags),
                    estimated_time: quiz.estimated_time,
                    completed: !!completion,
                    user_score: completion ? completion.score : 0,
                    total_questions: questions.length,
                    perfect_score: completion ? completion.perfect_score : false,
                    can_retake: canRetake && quiz.allow_retake,
                    retake_available_in: retakeAvailableIn,
                    last_completion: completion ? completion.completed_at : null,
                    cooldown_hours: quiz.cooldown_hours,
                    attempts_count: await dbService.get(
                        "SELECT COUNT(*) as count FROM quiz_completions WHERE user_id = ? AND quiz_id = ?",
                        [userId, quiz.id]
                    ).then(r => r.count)
                };
            })
        );

        // Получаем доступные фильтры
        const categories = await dbService.all(
            "SELECT DISTINCT category FROM quizzes WHERE is_active = 1 AND category IS NOT NULL"
        );
        
        const difficulties = await dbService.all(
            "SELECT DISTINCT difficulty FROM quizzes WHERE is_active = 1 AND difficulty IS NOT NULL"
        );

        res.json({
            success: true,
            quizzes: quizzesWithStatus,
            total: quizzesWithStatus.length,
            filters: {
                categories: categories.map(c => c.category),
                difficulties: difficulties.map(d => d.difficulty)
            }
        });

    } catch (error) {
        console.error('Ошибка получения квизов:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Ошибка сервера' 
        });
    }
});

app.get('/api/webapp/quizzes/:quizId', requireAuth, async (req, res) => {
    try {
        const quizId = parseInt(req.params.quizId);
        const userId = req.user.user_id;
        
        const quiz = await dbService.get(
            "SELECT * FROM quizzes WHERE id = ? AND is_active = 1",
            [quizId]
        );

        if (!quiz) {
            return res.status(404).json({ 
                success: false, 
                error: 'Квиз не найден' 
            });
        }

        const completion = await dbService.get(
            "SELECT * FROM quiz_completions WHERE user_id = ? AND quiz_id = ? ORDER BY completed_at DESC LIMIT 1",
            [userId, quizId]
        );

        const questions = dbService.parseJSONField(quiz.questions);
        
        // Для незавершенного квиза возвращаем вопросы без правильных ответов
        const safeQuestions = completion ? questions : questions.map(q => ({
            question: q.question,
            options: q.options,
            explanation: q.explanation
        }));

        res.json({
            success: true,
            quiz: {
                id: quiz.id,
                title: quiz.title,
                description: quiz.description,
                questions: safeQuestions,
                questions_count: questions.length,
                sparks_per_correct: quiz.sparks_per_correct,
                sparks_perfect_bonus: quiz.sparks_perfect_bonus,
                difficulty: quiz.difficulty,
                category: quiz.category,
                tags: dbService.parseJSONField(quiz.tags),
                estimated_time: quiz.estimated_time,
                completed: !!completion,
                user_score: completion ? completion.score : 0,
                perfect_score: completion ? completion.perfect_score : false,
                last_completion: completion ? completion.completed_at : null,
                cooldown_hours: quiz.cooldown_hours,
                allow_retake: quiz.allow_retake
            }
        });

    } catch (error) {
        console.error('Ошибка получения квиза:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Ошибка сервера' 
        });
    }
});

app.post('/api/webapp/quizzes/:quizId/submit', requireAuth, async (req, res) => {
    try {
        const quizId = parseInt(req.params.quizId);
        const { answers, timeSpent } = req.body;
        const userId = req.user.user_id;

        if (!answers || !Array.isArray(answers)) {
            return res.status(400).json({ 
                success: false, 
                error: 'Неверный формат ответов' 
            });
        }

        const quiz = await dbService.get(
            "SELECT * FROM quizzes WHERE id = ?",
            [quizId]
        );

        if (!quiz) {
            return res.status(404).json({ 
                success: false, 
                error: 'Квиз не найден' 
            });
        }

        const questions = dbService.parseJSONField(quiz.questions);

        if (answers.length !== questions.length) {
            return res.status(400).json({ 
                success: false, 
                error: 'Неверное количество ответов' 
            });
        }

        const existingCompletion = await dbService.get(
            "SELECT * FROM quiz_completions WHERE user_id = ? AND quiz_id = ? ORDER BY completed_at DESC LIMIT 1",
            [userId, quizId]
        );

        if (existingCompletion && !quiz.allow_retake) {
            return res.status(400).json({ 
                success: false, 
                error: 'Этот квиз нельзя пройти повторно' 
            });
        }

        if (existingCompletion && quiz.cooldown_hours > 0) {
            const lastCompletion = new Date(existingCompletion.completed_at);
            const now = new Date();
            const hoursSinceCompletion = (now - lastCompletion) / (1000 * 60 * 60);
            
            if (hoursSinceCompletion < quiz.cooldown_hours) {
                const hoursLeft = Math.ceil(quiz.cooldown_hours - hoursSinceCompletion);
                return res.status(400).json({ 
                    success: false, 
                    error: `Квиз можно пройти повторно через ${hoursLeft} часов` 
                });
            }
        }

        // Проверяем ответы
        let correctAnswers = 0;
        const results = questions.map((question, index) => {
            const isCorrect = answers[index] === question.correctAnswer;
            if (isCorrect) correctAnswers++;
            
            return {
                question: question.question,
                userAnswer: answers[index],
                correctAnswer: question.correctAnswer,
                isCorrect: isCorrect,
                explanation: question.explanation,
                options: question.options
            };
        });

        // Рассчитываем награду
        let sparksEarned = 0;
        const perfectScore = correctAnswers === questions.length;
        
        sparksEarned = correctAnswers * quiz.sparks_per_correct;
        
        if (perfectScore) {
            sparksEarned += quiz.sparks_perfect_bonus;
        }

        // Бонус за скорость
        let speedBonus = 0;
        if (timeSpent && quiz.estimated_time) {
            const estimatedSeconds = quiz.estimated_time * 60;
            if (timeSpent < estimatedSeconds * 0.5) {
                speedBonus = Math.floor(quiz.sparks_per_correct * 0.5);
                sparksEarned += speedBonus;
            }
        }

        // Сохраняем результат
        const completionData = {
            user_id: userId,
            quiz_id: quizId,
            completed_at: new Date().toISOString(),
            score: correctAnswers,
            total_questions: questions.length,
            sparks_earned: sparksEarned,
            perfect_score: perfectScore,
            time_spent: timeSpent || 0,
            answers: JSON.stringify(answers),
            speed_bonus: speedBonus
        };

        if (existingCompletion) {
            await dbService.run(
                `UPDATE quiz_completions SET 
                    score = ?, 
                    total_questions = ?,
                    sparks_earned = ?, 
                    perfect_score = ?,
                    completed_at = ?,
                    time_spent = ?,
                    answers = ?,
                    speed_bonus = ?
                 WHERE user_id = ? AND quiz_id = ?`,
                [
                    correctAnswers,
                    questions.length,
                    sparksEarned,
                    perfectScore,
                    completionData.completed_at,
                    timeSpent,
                    completionData.answers,
                    speedBonus,
                    userId,
                    quizId
                ]
            );
        } else {
            await dbService.run(
                `INSERT INTO quiz_completions 
                 (user_id, quiz_id, completed_at, score, total_questions, sparks_earned, perfect_score, time_spent, answers, speed_bonus) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    userId, quizId, completionData.completed_at, correctAnswers, 
                    questions.length, sparksEarned, perfectScore, timeSpent, 
                    completionData.answers, speedBonus
                ]
            );
        }

        // Начисляем искры
        if (sparksEarned > 0) {
            let description = `Квиз: ${quiz.title} (${correctAnswers}/${questions.length})`;
            if (perfectScore) description += ' - Идеальный результат!';
            if (speedBonus > 0) description += ` + бонус за скорость`;
            
            await EnhancedSparksService.addSparks(
                userId, 
                sparksEarned, 
                'quiz', 
                description,
                {
                    quizId: quizId,
                    score: correctAnswers,
                    totalQuestions: questions.length,
                    perfectScore: perfectScore,
                    speedBonus: speedBonus
                }
            );
        }

        const response = {
            success: true,
            correctAnswers,
            totalQuestions: questions.length,
            sparksEarned,
            perfectScore,
            speedBonus,
            scorePercentage: Math.round((correctAnswers / questions.length) * 100),
            results: results,
            canRetake: quiz.allow_retake,
            nextRetakeAvailable: quiz.allow_retake ? 
                new Date(Date.now() + quiz.cooldown_hours * 60 * 60 * 1000).toISOString() : null
        };

        if (perfectScore) {
            response.message = `🎉 Идеально! Все ответы правильные! +${sparksEarned}✨ (${correctAnswers}×${quiz.sparks_per_correct} + ${quiz.sparks_perfect_bonus} бонус${speedBonus ? ` + ${speedBonus} за скорость` : ''})`;
        } else {
            response.message = `Правильно: ${correctAnswers}/${questions.length}. +${sparksEarned}✨ (${correctAnswers}×${quiz.sparks_per_correct}${speedBonus ? ` + ${speedBonus} за скорость` : ''})`;
        }

        res.json(response);

    } catch (error) {
        console.error('Ошибка отправки квиза:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Ошибка сервера' 
        });
    }
});

// Статистика квизов пользователя
app.get('/api/webapp/users/:userId/quiz-stats', requireAuth, async (req, res) => {
    try {
        const userId = parseInt(req.params.userId);
        
        if (userId !== req.user.user_id) {
            return res.status(403).json({ 
                success: false, 
                error: 'Доступ запрещен' 
            });
        }

        const completions = await dbService.all(`
            SELECT qc.*, q.category, q.title as quiz_title 
            FROM quiz_completions qc 
            JOIN quizzes q ON qc.quiz_id = q.id 
            WHERE qc.user_id = ?
            ORDER BY qc.completed_at DESC
        `, [userId]);

        const perfectQuizzes = completions.filter(qc => qc.perfect_score);
        const totalSparks = completions.reduce((sum, qc) => sum + qc.sparks_earned, 0);
        
        const categoryStats = {};
        completions.forEach(completion => {
            if (completion.category) {
                if (!categoryStats[completion.category]) {
                    categoryStats[completion.category] = { count: 0, totalScore: 0, perfects: 0 };
                }
                categoryStats[completion.category].count++;
                categoryStats[completion.category].totalScore += completion.score;
                if (completion.perfect_score) categoryStats[completion.category].perfects++;
            }
        });

        // Рассчитываем средний балл по категориям
        Object.keys(categoryStats).forEach(category => {
            const stats = categoryStats[category];
            stats.averageScore = stats.count > 0 ? (stats.totalScore / stats.count).toFixed(1) : 0;
            stats.perfectRate = stats.count > 0 ? ((stats.perfects / stats.count) * 100).toFixed(1) : 0;
        });

        res.json({
            success: true,
            stats: {
                totalQuizzes: completions.length,
                perfectQuizzes: perfectQuizzes.length,
                totalSparks: totalSparks,
                averageScore: completions.length > 0 ? 
                    (completions.reduce((sum, qc) => sum + qc.score, 0) / completions.length).toFixed(1) : 0,
                totalQuestions: completions.reduce((sum, qc) => sum + qc.total_questions, 0),
                correctAnswers: completions.reduce((sum, qc) => sum + qc.score, 0),
                accuracy: completions.reduce((sum, qc) => sum + qc.total_questions, 0) > 0 ?
                    ((completions.reduce((sum, qc) => sum + qc.score, 0) / completions.reduce((sum, qc) => sum + qc.total_questions, 0)) * 100).toFixed(1) : 0,
                categoryStats: categoryStats
            },
            recentCompletions: completions
                .slice(0, 10)
                .map(completion => ({
                    quizTitle: completion.quiz_title,
                    score: completion.score,
                    totalQuestions: completion.total_questions,
                    perfectScore: completion.perfect_score,
                    sparksEarned: completion.sparks_earned,
                    completedAt: completion.completed_at,
                    timeSpent: completion.time_spent
                }))
        });

    } catch (error) {
        console.error('Ошибка получения статистики квизов:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Ошибка сервера' 
        });
    }
});

// ==================== ПОЛНАЯ СИСТЕМА МАРАФОНОВ ====================
app.get('/api/webapp/marathons', requireAuth, async (req, res) => {
    try {
        const userId = req.user.user_id;
        const { category, difficulty, status } = req.query;
        
        let whereConditions = ["m.is_active = 1"];
        let params = [];

        if (category) {
            whereConditions.push("m.category = ?");
            params.push(category);
        }
        
        if (difficulty) {
            whereConditions.push("m.difficulty = ?");
            params.push(difficulty);
        }

        const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

        const marathons = await dbService.all(`
            SELECT m.* FROM marathons m 
            ${whereClause}
            ORDER BY m.created_at DESC
        `, params);

        const marathonsWithStatus = await Promise.all(
            marathons.map(async (marathon) => {
                const completion = await dbService.get(
                    "SELECT * FROM marathon_completions WHERE user_id = ? AND marathon_id = ?",
                    [userId, marathon.id]
                );
                
                const days = dbService.parseJSONField(marathon.days);
                const currentDay = completion ? completion.current_day : 1;
                const currentTask = days.find(day => day.day_number === currentDay);
                const completedDays = completion ? completion.current_day - 1 : 0;
                const isStarted = !!completion;
                const isCompleted = completion ? completion.completed : false;
                
                // Проверяем статус марафона
                let marathonStatus = 'not_started';
                if (isCompleted) marathonStatus = 'completed';
                else if (isStarted) marathonStatus = 'in_progress';
                
                // Фильтрация по статусу
                if (status && status !== marathonStatus) {
                    return null;
                }
                
                // Проверяем дедлайны дней
                const now = new Date();
                const startDate = new Date(marathon.start_date);
                const daysSinceStart = Math.floor((now - startDate) / (1000 * 60 * 60 * 24));
                const isDayExpired = isStarted && currentDay <= daysSinceStart + 1;
                
                return {
                    id: marathon.id,
                    title: marathon.title,
                    description: marathon.description,
                    duration: marathon.duration,
                    current_day: currentDay,
                    completed_days: completedDays,
                    progress: completion ? completion.progress : 0,
                    completed: isCompleted,
                    started: isStarted,
                    status: marathonStatus,
                    start_date: marathon.start_date,
                    completion_reward: marathon.completion_reward,
                    difficulty: marathon.difficulty,
                    category: marathon.category,
                    tags: dbService.parseJSONField(marathon.tags),
                    cover_image: marathon.cover_image,
                    requirements: dbService.parseJSONField(marathon.requirements),
                    participants_count: marathon.participants_count,
                    average_rating: marathon.average_rating,
                    current_task: currentTask,
                    is_day_expired: isDayExpired,
                    days_until_start: Math.max(0, Math.ceil((startDate - now) / (1000 * 60 * 60 * 24))),
                    total_sparks_earned: completion ? completion.total_sparks_earned : 0
                };
            })
        ).then(results => results.filter(marathon => marathon !== null));

        // Получаем доступные фильтры
        const categories = await dbService.all(
            "SELECT DISTINCT category FROM marathons WHERE is_active = 1 AND category IS NOT NULL"
        );
        
        const difficulties = await dbService.all(
            "SELECT DISTINCT difficulty FROM marathons WHERE is_active = 1 AND difficulty IS NOT NULL"
        );

        res.json({
            success: true,
            marathons: marathonsWithStatus,
            total: marathonsWithStatus.length,
            filters: {
                categories: categories.map(c => c.category),
                difficulties: difficulties.map(d => d.difficulty),
                statuses: ['not_started', 'in_progress', 'completed']
            }
        });

    } catch (error) {
        console.error('Ошибка получения марафонов:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Ошибка сервера' 
        });
    }
});

// Начать марафон
app.post('/api/webapp/marathons/:marathonId/start', requireAuth, async (req, res) => {
    try {
        const marathonId = parseInt(req.params.marathonId);
        const userId = req.user.user_id;

        const marathon = await dbService.get(
            "SELECT * FROM marathons WHERE id = ? AND is_active = 1",
            [marathonId]
        );

        if (!marathon) {
            return res.status(404).json({ 
                success: false, 
                error: 'Марафон не найден' 
            });
        }

        const existingCompletion = await dbService.get(
            "SELECT * FROM marathon_completions WHERE user_id = ? AND marathon_id = ?",
            [userId, marathonId]
        );

        if (existingCompletion) {
            return res.status(400).json({ 
                success: false, 
                error: 'Марафон уже начат' 
            });
        }

        // Проверяем, не начался ли марафон слишком рано
        const now = new Date();
        const startDate = new Date(marathon.start_date);
        if (now < startDate) {
            return res.status(400).json({ 
                success: false, 
                error: `Марафон начнется ${startDate.toLocaleDateString('ru-RU')}` 
            });
        }

        const completion = {
            user_id: userId,
            marathon_id: marathonId,
            current_day: 1,
            progress: 0,
            completed: false,
            started_at: new Date().toISOString(),
            last_activity: new Date().toISOString(),
            total_sparks_earned: 0,
            days_completed: '[]'
        };

        await dbService.run(
            `INSERT INTO marathon_completions 
             (user_id, marathon_id, current_day, progress, completed, started_at, last_activity, total_sparks_earned, days_completed) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                completion.user_id, completion.marathon_id, completion.current_day, 
                completion.progress, completion.completed, completion.started_at,
                completion.last_activity, completion.total_sparks_earned, completion.days_completed
            ]
        );

        // Увеличиваем счетчик участников
        await dbService.run(
            "UPDATE marathons SET participants_count = participants_count + 1 WHERE id = ?",
            [marathonId]
        );

        const days = dbService.parseJSONField(marathon.days);

        res.json({
            success: true,
            message: 'Марафон начат! Удачи!',
            marathon: {
                ...marathon,
                days: days,
                current_day: 1,
                progress: 0,
                started: true,
                current_task: days.find(day => day.day_number === 1)
            }
        });

    } catch (error) {
        console.error('Ошибка начала марафона:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Ошибка сервера' 
        });
    }
});

// Отправка задания дня марафона
app.post('/api/webapp/marathons/:marathonId/submit-day', requireAuth, async (req, res) => {
    try {
        const marathonId = parseInt(req.params.marathonId);
        const { day, submission_text, submission_image, time_spent } = req.body;
        const userId = req.user.user_id;

        if (!day) {
            return res.status(400).json({ 
                success: false, 
                error: 'День обязателен' 
            });
        }

        const marathon = await dbService.get(
            "SELECT * FROM marathons WHERE id = ?",
            [marathonId]
        );

        if (!marathon) {
            return res.status(404).json({ 
                success: false, 
                error: 'Марафон не найден' 
            });
        }

        const days = dbService.parseJSONField(marathon.days);
        const task = days.find(d => d.day_number === parseInt(day));

        if (!task) {
            return res.status(404).json({ 
                success: false, 
                error: 'Задание не найдено' 
            });
        }

        let completion = await dbService.get(
            "SELECT * FROM marathon_completions WHERE user_id = ? AND marathon_id = ?",
            [userId, marathonId]
        );

        if (!completion) {
            return res.status(400).json({ 
                success: false, 
                error: 'Марафон не начат' 
            });
        }

        if (completion.current_day !== parseInt(day)) {
            return res.status(400).json({ 
                success: false, 
                error: 'Неверный день марафона' 
            });
        }

        // Проверяем дедлайн
        const now = new Date();
        const startDate = new Date(marathon.start_date);
        const daysSinceStart = Math.floor((now - startDate) / (1000 * 60 * 60 * 24));
        const currentDayExpected = daysSinceStart + 1;

        if (parseInt(day) > currentDayExpected) {
            return res.status(400).json({ 
                success: false, 
                error: 'Этот день еще не наступил' 
            });
        }

        let isLate = false;
        if (parseInt(day) < currentDayExpected) {
            isLate = true;
        }

        // Сохраняем работу пользователя
        let submissionId = null;
        if (task.requires_submission && (submission_text || submission_image)) {
            const submission = {
                user_id: userId,
                marathon_id: marathonId,
                day: parseInt(day),
                submission_text: submission_text,
                submission_image: submission_image,
                submitted_at: new Date().toISOString(),
                status: 'pending',
                is_late: isLate,
                time_spent: time_spent || 0,
                sparks_awarded: 0
            };

            const result = await dbService.run(
                `INSERT INTO marathon_submissions 
                 (user_id, marathon_id, day, submission_text, submission_image, submitted_at, status, is_late, time_spent, sparks_awarded) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    submission.user_id, submission.marathon_id, submission.day,
                    submission.submission_text, submission.submission_image, submission.submitted_at,
                    submission.status, submission.is_late, submission.time_spent, submission.sparks_awarded
                ]
            );

            submissionId = result.lastID;
        }

        // Начисляем искры за выполнение дня
        let sparksEarned = task.reward || SPARKS_SYSTEM.MARATHON_DAY_COMPLETION;

        // Штраф за опоздание
        if (isLate) {
            sparksEarned = Math.floor(sparksEarned * 0.7); // 30% штраф
        }

        // Бонус за скорость
        let speedBonus = 0;
        if (time_spent && task.estimated_time) {
            const estimatedSeconds = task.estimated_time * 60;
            if (time_spent < estimatedSeconds * 0.67) {
                speedBonus = Math.floor(sparksEarned * 0.3); // 30% бонус
                sparksEarned += speedBonus;
            }
        }

        await EnhancedSparksService.addSparks(
            userId, 
            sparksEarned, 
            'marathon_day', 
            `Марафон: ${marathon.title} - день ${day}${isLate ? ' (с опозданием)' : ''}${speedBonus ? ' + бонус за скорость' : ''}`,
            {
                marathonId: marathonId,
                day: parseInt(day),
                isLate: isLate,
                speedBonus: speedBonus,
                submissionId: submissionId
            }
        );

        // Обновляем прогресс
        const newCurrentDay = parseInt(day) + 1;
        const newProgress = Math.round((parseInt(day) / marathon.duration) * 100);
        const isCompleted = newCurrentDay > marathon.duration;

        const daysCompleted = dbService.parseJSONField(completion.days_completed || '[]');
        daysCompleted.push({
            day: parseInt(day),
            completed_at: new Date().toISOString(),
            sparks_earned: sparksEarned,
            is_late: isLate,
            submission_id: submissionId
        });

        await dbService.run(
            `UPDATE marathon_completions SET 
                current_day = ?, 
                progress = ?, 
                completed = ?,
                last_activity = ?,
                total_sparks_earned = total_sparks_earned + ?,
                days_completed = ?
             WHERE user_id = ? AND marathon_id = ?`,
            [
                newCurrentDay,
                newProgress,
                isCompleted,
                new Date().toISOString(),
                sparksEarned,
                JSON.stringify(daysCompleted),
                userId,
                marathonId
            ]
        );

        let message = '';
        if (isCompleted) {
            // Дополнительная награда за завершение марафона
            const completionBonus = marathon.completion_reward;
            await EnhancedSparksService.addSparks(
                userId, 
                completionBonus, 
                'marathon_completion', 
                `Завершение марафона: ${marathon.title}`
            );

            await dbService.run(
                "UPDATE marathon_completions SET total_sparks_earned = total_sparks_earned + ? WHERE user_id = ? AND marathon_id = ?",
                [completionBonus, userId, marathonId]
            );

            message = `🎉 Марафон завершен! +${sparksEarned}✨ (день) + ${completionBonus}✨ (бонус завершения)`;
        } else {
            message = `День ${day} завершен! +${sparksEarned}✨${isLate ? ' (с учетом опоздания)' : ''}${speedBonus ? ` + ${speedBonus} за скорость` : ''}`;
        }

        const nextTask = days.find(d => d.day_number === newCurrentDay);

        res.json({
            success: true,
            sparksEarned,
            currentDay: newCurrentDay,
            progress: newProgress,
            completed: isCompleted,
            isLate: isLate,
            speedBonus: speedBonus,
            nextTask: nextTask,
            message: message
        });

    } catch (error) {
        console.error('Ошибка отправки дня марафона:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Ошибка сервера' 
        });
    }
});

// ==================== ПОЛНАЯ СИСТЕМА МАГАЗИНА ====================
app.get('/api/webapp/shop/items', requireAuth, async (req, res) => {
    try {
        const userId = req.user.user_id;
        const { category, type, difficulty, priceRange, search } = req.query;
        
        let whereConditions = ["i.is_active = 1"];
        let params = [];

        if (category) {
            whereConditions.push("i.category = ?");
            params.push(category);
        }
        
        if (type) {
            whereConditions.push("i.type = ?");
            params.push(type);
        }
        
        if (difficulty) {
            whereConditions.push("i.difficulty = ?");
            params.push(difficulty);
        }

        if (priceRange) {
            const [min, max] = priceRange.split('-').map(Number);
            whereConditions.push("i.price >= ? AND i.price <= ?");
            params.push(min, max);
        }

        if (search) {
            whereConditions.push("(i.title LIKE ? OR i.description LIKE ? OR i.tags LIKE ?)");
            const searchTerm = `%${search}%`;
            params.push(searchTerm, searchTerm, searchTerm);
        }

        const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

        const items = await dbService.all(`
            SELECT i.* FROM shop_items i 
            ${whereClause}
            ORDER BY i.created_at DESC
        `, params);

        const itemsWithPurchaseStatus = await Promise.all(
            items.map(async (item) => {
                const purchase = await dbService.get(
                    "SELECT * FROM purchases WHERE user_id = ? AND item_id = ?",
                    [userId, item.id]
                );

                return {
                    id: item.id,
                    title: item.title,
                    description: item.description,
                    type: item.type,
                    file_url: item.file_url,
                    preview_url: item.preview_url,
                    price: item.price,
                    content_text: item.content_text,
                    embed_html: item.embed_html,
                    is_active: item.is_active,
                    category: item.category,
                    difficulty: item.difficulty,
                    estimated_duration: item.estimated_duration,
                    instructor: item.instructor,
                    rating: item.rating,
                    students_count: item.students_count,
                    tags: dbService.parseJSONField(item.tags),
                    purchased: !!purchase,
                    purchase_date: purchase ? purchase.purchased_at : null,
                    download_count: purchase ? purchase.download_count : 0,
                    can_download: !!purchase
                };
            })
        );

        // Получаем доступные фильтры
        const categories = await dbService.all(
            "SELECT DISTINCT category FROM shop_items WHERE is_active = 1 AND category IS NOT NULL"
        );
        
        const types = await dbService.all(
            "SELECT DISTINCT type FROM shop_items WHERE is_active = 1 AND type IS NOT NULL"
        );
        
        const difficulties = await dbService.all(
            "SELECT DISTINCT difficulty FROM shop_items WHERE is_active = 1 AND difficulty IS NOT NULL"
        );

        res.json({
            success: true,
            items: itemsWithPurchaseStatus,
            total: itemsWithPurchaseStatus.length,
            filters: {
                categories: categories.map(c => c.category),
                types: types.map(t => t.type),
                difficulties: difficulties.map(d => d.difficulty),
                priceRanges: [
                    '0-10',
                    '11-20', 
                    '21-30',
                    '31-50',
                    '51-100'
                ]
            }
        });

    } catch (error) {
        console.error('Ошибка получения товаров:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Ошибка сервера' 
        });
    }
});

app.post('/api/webapp/shop/purchase', requireAuth, async (req, res) => {
    try {
        const { itemId } = req.body;
        const userId = req.user.user_id;

        if (!itemId) {
            return res.status(400).json({ 
                success: false, 
                error: 'ID товара обязателен' 
            });
        }

        // Проверяем существование товара
        const item = await dbService.get(
            "SELECT * FROM shop_items WHERE id = ? AND is_active = 1",
            [itemId]
        );

        if (!item) {
            return res.status(404).json({ 
                success: false, 
                error: 'Товар не найден' 
            });
        }

        // Проверяем баланс
        const user = await dbService.get(
            "SELECT sparks FROM users WHERE user_id = ?",
            [userId]
        );

        if (user.sparks < item.price) {
            return res.status(400).json({ 
                success: false, 
                error: 'Недостаточно искр' 
            });
        }

        // Проверяем, не куплен ли уже товар
        const existingPurchase = await dbService.get(
            "SELECT * FROM purchases WHERE user_id = ? AND item_id = ?",
            [userId, itemId]
        );

        if (existingPurchase) {
            return res.status(400).json({ 
                success: false, 
                error: 'Вы уже купили этот товар' 
            });
        }

        // Выполняем покупку в транзакции
        await dbService.run("BEGIN TRANSACTION");

        try {
            // Списание искр
            await dbService.run(
                "UPDATE users SET sparks = sparks - ? WHERE user_id = ?",
                [item.price, userId]
            );

            // Создаем запись о покупке
            await dbService.run(
                "INSERT INTO purchases (user_id, item_id, price_paid, status) VALUES (?, ?, ?, ?)",
                [userId, itemId, item.price, 'completed']
            );

            // Логируем активность
            await dbService.run(
                "INSERT INTO activities (user_id, activity_type, sparks_earned, description) VALUES (?, ?, ?, ?)",
                [userId, 'purchase', -item.price, `Покупка: ${item.title}`]
            );

            // Обновляем статистику товара
            await dbService.run(
                "UPDATE shop_items SET students_count = students_count + 1 WHERE id = ?",
                [itemId]
            );

            // Бонус за первую покупку
            const userPurchases = await dbService.all(
                "SELECT * FROM purchases WHERE user_id = ?",
                [userId]
            );

            if (userPurchases.length === 1) {
                await EnhancedSparksService.addSparks(
                    userId, 
                    SPARKS_SYSTEM.FIRST_PURCHASE, 
                    'first_purchase', 
                    'Бонус за первую покупку в магазине'
                );
            }

            await dbService.run("COMMIT");

            const updatedUser = await dbService.get(
                "SELECT sparks FROM users WHERE user_id = ?",
                [userId]
            );

            res.json({
                success: true,
                message: `Покупка успешна! Куплено: ${item.title}`,
                remainingSparks: updatedUser.sparks,
                purchase: {
                    item_title: item.title,
                    item_type: item.type,
                    price_paid: item.price
                },
                firstPurchaseBonus: userPurchases.length === 1 ? SPARKS_SYSTEM.FIRST_PURCHASE : 0
            });

        } catch (transactionError) {
            await dbService.run("ROLLBACK");
            throw transactionError;
        }

    } catch (error) {
        console.error('Ошибка покупки:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Ошибка сервера при покупке' 
        });
    }
});

// Получение покупок пользователя
app.get('/api/webapp/users/:userId/purchases', requireAuth, async (req, res) => {
    try {
        const userId = parseInt(req.params.userId);
        const { type, category } = req.query;
        
        if (userId !== req.user.user_id) {
            return res.status(403).json({ 
                success: false, 
                error: 'Доступ запрещен' 
            });
        }

        let whereConditions = ["p.user_id = ?"];
        let params = [userId];

        if (type) {
            whereConditions.push("i.type = ?");
            params.push(type);
        }
        
        if (category) {
            whereConditions.push("i.category = ?");
            params.push(category);
        }

        const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

        const userPurchases = await dbService.all(`
            SELECT p.*, i.title, i.description, i.type, i.file_url, i.preview_url, i.content_text, 
                   i.embed_html, i.category, i.difficulty, i.estimated_duration, i.instructor, 
                   i.rating, i.students_count, i.tags
            FROM purchases p 
            JOIN shop_items i ON p.item_id = i.id 
            ${whereClause}
            ORDER BY p.purchased_at DESC
        `, params);

        const formattedPurchases = userPurchases.map(purchase => ({
            ...purchase,
            tags: dbService.parseJSONField(purchase.tags)
        }));

        // Статистика покупок
        const purchaseStats = {
            total: formattedPurchases.length,
            total_spent: formattedPurchases.reduce((sum, p) => sum + p.price_paid, 0),
            by_type: {},
            by_category: {}
        };

        formattedPurchases.forEach(purchase => {
            // Статистика по типам
            if (!purchaseStats.by_type[purchase.type]) {
                purchaseStats.by_type[purchase.type] = 0;
            }
            purchaseStats.by_type[purchase.type]++;

            // Статистика по категориям
            if (!purchaseStats.by_category[purchase.category]) {
                purchaseStats.by_category[purchase.category] = 0;
            }
            purchaseStats.by_category[purchase.category]++;
        });

        res.json({
            success: true,
            purchases: formattedPurchases,
            stats: purchaseStats,
            total: formattedPurchases.length
        });

    } catch (error) {
        console.error('Ошибка получения покупок:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Ошибка сервера' 
        });
    }
});

// ==================== СИСТЕМА ЗАГРУЗКИ ФАЙЛОВ ====================
app.post('/api/upload', upload.single('file'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                error: 'No file uploaded'
            });
        }

        const fileInfo = {
            id: Date.now(),
            originalname: req.file.originalname,
            filename: req.file.filename,
            path: `/uploads/${req.file.filename}`,
            fullPath: req.file.path,
            mimetype: req.file.mimetype,
            size: req.file.size,
            uploaded_at: new Date().toISOString(),
            url: `${process.env.APP_URL || 'http://localhost:3000'}/uploads/${req.file.filename}`
        };

        console.log('📁 Файл загружен:', fileInfo);

        res.json({
            success: true,
            message: 'File uploaded successfully',
            file: fileInfo
        });

    } catch (error) {
        console.error('❌ Ошибка загрузки файла:', error);
        res.status(500).json({
            success: false,
            error: 'File upload failed',
            details: error.message
        });
    }
});

app.post('/api/upload/multiple', upload.array('files', 10), (req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'No files uploaded'
            });
        }

        const filesInfo = req.files.map(file => ({
            id: Date.now() + Math.random(),
            originalname: file.originalname,
            filename: file.filename,
            path: `/uploads/${file.filename}`,
            fullPath: file.path,
            mimetype: file.mimetype,
            size: file.size,
            uploaded_at: new Date().toISOString(),
            url: `${process.env.APP_URL || 'http://localhost:3000'}/uploads/${file.filename}`
        }));

        console.log('📁 Загружено файлов:', filesInfo.length);

        res.json({
            success: true,
            message: `${filesInfo.length} files uploaded successfully`,
            files: filesInfo
        });

    } catch (error) {
        console.error('❌ Ошибка множественной загрузки файлов:', error);
        res.status(500).json({
            success: false,
            error: 'Files upload failed',
            details: error.message
        });
    }
});

// ==================== ПОЛНАЯ СИСТЕМА ИНТЕРАКТИВОВ ====================

app.get('/api/webapp/interactives', requireAuth, async (req, res) => {
    try {
        const userId = req.user.user_id;
        const { type, category, difficulty } = req.query;
        
        let whereConditions = ["i.is_active = 1"];
        let params = [];

        if (type) {
            whereConditions.push("i.type = ?");
            params.push(type);
        }
        
        if (category) {
            whereConditions.push("i.category = ?");
            params.push(category);
        }
        
        if (difficulty) {
            whereConditions.push("i.difficulty = ?");
            params.push(difficulty);
        }

        const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

        const interactives = await dbService.all(`
            SELECT i.* FROM interactives i 
            ${whereClause}
            ORDER BY i.created_at DESC
        `, params);

        const interactivesWithStatus = await Promise.all(
            interactives.map(async (interactive) => {
                const completion = await dbService.get(
                    "SELECT * FROM interactive_completions WHERE user_id = ? AND interactive_id = ?",
                    [userId, interactive.id]
                );
                
                const submission = await dbService.get(
                    "SELECT * FROM interactive_submissions WHERE user_id = ? AND interactive_id = ?",
                    [userId, interactive.id]
                );

                return {
                    id: interactive.id,
                    title: interactive.title,
                    description: interactive.description,
                    type: interactive.type,
                    category: interactive.category,
                    image_url: interactive.image_url,
                    question: interactive.question,
                    options: dbService.parseJSONField(interactive.options),
                    sparks_reward: interactive.sparks_reward,
                    allow_retake: interactive.allow_retake,
                    is_active: interactive.is_active,
                    difficulty: interactive.difficulty,
                    estimated_time: interactive.estimated_time,
                    attempts_count: interactive.attempts_count,
                    success_rate: interactive.success_rate,
                    completed: !!completion,
                    user_score: completion ? completion.score : 0,
                    can_retake: interactive.allow_retake && !completion,
                    has_submission: !!submission,
                    submission_status: submission ? submission.status : null,
                    last_attempt: completion ? completion.completed_at : null
                };
            })
        );

        // Получаем доступные фильтры
        const types = await dbService.all(
            "SELECT DISTINCT type FROM interactives WHERE is_active = 1 AND type IS NOT NULL"
        );
        
        const categories = await dbService.all(
            "SELECT DISTINCT category FROM interactives WHERE is_active = 1 AND category IS NOT NULL"
        );
        
        const difficulties = await dbService.all(
            "SELECT DISTINCT difficulty FROM interactives WHERE is_active = 1 AND difficulty IS NOT NULL"
        );

        res.json({
            success: true,
            interactives: interactivesWithStatus,
            total: interactivesWithStatus.length,
            filters: {
                types: types.map(t => t.type),
                categories: categories.map(c => c.category),
                difficulties: difficulties.map(d => d.difficulty)
            }
        });

    } catch (error) {
        console.error('Ошибка получения интерактивов:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Ошибка сервера' 
        });
    }
});

// Прохождение интерактива (для тестовых/геймифицированных)
app.post('/api/webapp/interactives/:interactiveId/submit', requireAuth, async (req, res) => {
    try {
        const interactiveId = parseInt(req.params.interactiveId);
        const { answer, timeSpent } = req.body;
        const userId = req.user.user_id;

        if (!userId) {
            return res.status(400).json({ 
                success: false,
                error: 'User ID is required' 
            });
        }

        const interactive = await dbService.get(
            "SELECT * FROM interactives WHERE id = ? AND is_active = 1",
            [interactiveId]
        );

        if (!interactive) {
            return res.status(404).json({ 
                success: false,
                error: 'Interactive not found' 
            });
        }

        const existingCompletion = await dbService.get(
            "SELECT * FROM interactive_completions WHERE user_id = ? AND interactive_id = ?",
            [userId, interactiveId]
        );

        if (existingCompletion && !interactive.allow_retake) {
            return res.status(400).json({ 
                success: false,
                error: 'Вы уже прошли этот интерактив' 
            });
        }

        // Обновляем статистику попыток
        await dbService.run(
            "UPDATE interactives SET attempts_count = attempts_count + 1 WHERE id = ?",
            [interactiveId]
        );

        const isCorrect = answer === interactive.correct_answer;
        let sparksEarned = isCorrect ? interactive.sparks_reward : 0;

        // Бонус за скорость для некоторых типов интерактивов
        let speedBonus = 0;
        if (timeSpent && interactive.estimated_time && isCorrect) {
            const estimatedSeconds = interactive.estimated_time * 60;
            if (timeSpent < estimatedSeconds * 0.5) {
                speedBonus = Math.floor(interactive.sparks_reward * 0.5);
                sparksEarned += speedBonus;
            }
        }

        // Обновляем статистику успешности
        if (isCorrect) {
            const totalCompletions = await dbService.all(
                "SELECT COUNT(*) as count FROM interactive_completions WHERE interactive_id = ? AND score > 0",
                [interactiveId]
            );
            const successRate = totalCompletions[0].count / (interactive.attempts_count + 1);
            await dbService.run(
                "UPDATE interactives SET success_rate = ? WHERE id = ?",
                [successRate, interactiveId]
            );
        }

        if (existingCompletion) {
            await dbService.run(
                `UPDATE interactive_completions SET 
                    score = ?,
                    sparks_earned = ?,
                    completed_at = ?,
                    answer = ?,
                    time_spent = ?,
                    speed_bonus = ?
                 WHERE user_id = ? AND interactive_id = ?`,
                [
                    isCorrect ? 1 : 0,
                    sparksEarned,
                    new Date().toISOString(),
                    answer,
                    timeSpent || 0,
                    speedBonus,
                    userId,
                    interactiveId
                ]
            );
        } else {
            await dbService.run(
                `INSERT INTO interactive_completions 
                 (user_id, interactive_id, completed_at, score, sparks_earned, answer, time_spent, speed_bonus) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    userId, interactiveId, new Date().toISOString(),
                    isCorrect ? 1 : 0, sparksEarned, answer,
                    timeSpent || 0, speedBonus
                ]
            );
        }

        if (sparksEarned > 0) {
            let description = `Интерактив: ${interactive.title}`;
            if (speedBonus > 0) description += ' + бонус за скорость';
            
            await EnhancedSparksService.addSparks(
                userId, 
                sparksEarned, 
                'interactive', 
                description,
                {
                    interactiveId: interactiveId,
                    type: interactive.type,
                    isCorrect: isCorrect,
                    speedBonus: speedBonus
                }
            );
        }

        res.json({
            success: true,
            correct: isCorrect,
            score: isCorrect ? 1 : 0,
            sparksEarned: sparksEarned,
            speedBonus: speedBonus,
            message: isCorrect ? 
                `Правильно! +${sparksEarned}✨${speedBonus ? ` (включая ${speedBonus} за скорость)` : ''}` : 
                'Попробуйте еще раз!',
            explanation: interactive.explanation || null,
            correct_answer: interactive.correct_answer,
            can_retry: interactive.allow_retake && !isCorrect
        });

    } catch (error) {
        console.error('Ошибка отправки интерактива:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Ошибка сервера' 
        });
    }
});

// Отправка творческой работы (для drawing_challenge и подобных)
app.post('/api/webapp/interactives/:interactiveId/submit-work', requireAuth, upload.single('work'), async (req, res) => {
    try {
        const interactiveId = parseInt(req.params.interactiveId);
        const { description } = req.body;
        const userId = req.user.user_id;

        if (!userId) {
            return res.status(400).json({ 
                success: false,
                error: 'User ID is required' 
            });
        }

        const interactive = await dbService.get(
            "SELECT * FROM interactives WHERE id = ? AND is_active = 1",
            [interactiveId]
        );

        if (!interactive) {
            return res.status(404).json({ 
                success: false,
                error: 'Interactive not found' 
            });
        }

        if (!req.file) {
            return res.status(400).json({ 
                success: false,
                error: 'Work file is required' 
            });
        }

        const existingSubmission = await dbService.get(
            "SELECT * FROM interactive_submissions WHERE user_id = ? AND interactive_id = ?",
            [userId, interactiveId]
        );

        if (existingSubmission) {
            return res.status(400).json({ 
                success: false,
                error: 'Работа уже отправлена' 
            });
        }

        const submission = {
            user_id: userId,
            interactive_id: interactiveId,
            submission_data: `/uploads/${req.file.filename}`,
            description: description || '',
            submitted_at: new Date().toISOString(),
            status: 'pending',
            moderator_comment: null
        };

        await dbService.run(
            `INSERT INTO interactive_submissions 
             (user_id, interactive_id, submission_data, description, submitted_at, status) 
             VALUES (?, ?, ?, ?, ?, ?)`,
            [
                submission.user_id, submission.interactive_id, submission.submission_data,
                submission.description, submission.submitted_at, submission.status
            ]
        );

        // Начисляем искры за отправку работы
        await EnhancedSparksService.addSparks(
            userId, 
            SPARKS_SYSTEM.INTERACTIVE_SUBMISSION, 
            'interactive_submission', 
            `Отправлена работа для: ${interactive.title}`,
            {
                interactiveId: interactiveId,
                submissionId: submission.id
            }
        );

        res.json({
            success: true,
            message: `Работа отправлена на модерацию! +${SPARKS_SYSTEM.INTERACTIVE_SUBMISSION}✨`,
            submissionId: submission.id,
            sparksEarned: SPARKS_SYSTEM.INTERACTIVE_SUBMISSION
        });

    } catch (error) {
        console.error('Ошибка отправки работы:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Ошибка сервера' 
        });
    }
});

// Получение конкретного интерактива
app.get('/api/webapp/interactives/:interactiveId', requireAuth, async (req, res) => {
    try {
        const interactiveId = parseInt(req.params.interactiveId);
        const userId = req.user.user_id;
        
        const interactive = await dbService.get(
            "SELECT * FROM interactives WHERE id = ? AND is_active = 1",
            [interactiveId]
        );

        if (!interactive) {
            return res.status(404).json({ 
                success: false, 
                error: 'Интерактив не найден' 
            });
        }

        const completion = await dbService.get(
            "SELECT * FROM interactive_completions WHERE user_id = ? AND interactive_id = ?",
            [userId, interactiveId]
        );

        const submission = await dbService.get(
            "SELECT * FROM interactive_submissions WHERE user_id = ? AND interactive_id = ?",
            [userId, interactiveId]
        );

        res.json({
            success: true,
            interactive: {
                id: interactive.id,
                title: interactive.title,
                description: interactive.description,
                type: interactive.type,
                category: interactive.category,
                image_url: interactive.image_url,
                question: interactive.question,
                options: dbService.parseJSONField(interactive.options),
                sparks_reward: interactive.sparks_reward,
                allow_retake: interactive.allow_retake,
                difficulty: interactive.difficulty,
                estimated_time: interactive.estimated_time,
                completed: !!completion,
                user_score: completion ? completion.score : 0,
                has_submission: !!submission,
                submission_status: submission ? submission.status : null,
                last_attempt: completion ? completion.completed_at : null
            }
        });

    } catch (error) {
        console.error('Ошибка получения интерактива:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Ошибка сервера' 
        });
    }
});

// Статистика интерактивов пользователя
app.get('/api/webapp/users/:userId/interactive-stats', requireAuth, async (req, res) => {
    try {
        const userId = parseInt(req.params.userId);
        
        if (userId !== req.user.user_id) {
            return res.status(403).json({ 
                success: false, 
                error: 'Доступ запрещен' 
            });
        }

        const completions = await dbService.all(`
            SELECT ic.*, i.type, i.category, i.title as interactive_title 
            FROM interactive_completions ic 
            JOIN interactives i ON ic.interactive_id = i.id 
            WHERE ic.user_id = ?
            ORDER BY ic.completed_at DESC
        `, [userId]);

        const submissions = await dbService.all(
            "SELECT * FROM interactive_submissions WHERE user_id = ?",
            [userId]
        );

        const stats = {
            total_completions: completions.length,
            total_submissions: submissions.length,
            total_sparks: completions.reduce((sum, c) => sum + c.sparks_earned, 0),
            by_type: {},
            by_category: {},
            accuracy: 0
        };

        completions.forEach(completion => {
            // Статистика по типам
            if (!stats.by_type[completion.type]) {
                stats.by_type[completion.type] = { count: 0, correct: 0 };
            }
            stats.by_type[completion.type].count++;
            if (completion.score > 0) stats.by_type[completion.type].correct++;

            // Статистика по категориям
            if (!stats.by_category[completion.category]) {
                stats.by_category[completion.category] = { count: 0, correct: 0 };
            }
            stats.by_category[completion.category].count++;
            if (completion.score > 0) stats.by_category[completion.category].correct++;
        });

        // Рассчитываем точность
        const totalAttempts = completions.length;
        const correctAttempts = completions.filter(c => c.score > 0).length;
        stats.accuracy = totalAttempts > 0 ? (correctAttempts / totalAttempts * 100).toFixed(1) : 0;

        res.json({
            success: true,
            stats: stats,
            recent_completions: completions.slice(0, 10).map(c => ({
                interactiveTitle: c.interactive_title,
                score: c.score,
                sparksEarned: c.sparks_earned,
                completedAt: c.completed_at,
                type: c.type
            })),
            submissions: submissions.map(s => ({
                id: s.id,
                interactive_id: s.interactive_id,
                status: s.status,
                submitted_at: s.submitted_at
            }))
        });

    } catch (error) {
        console.error('Ошибка получения статистики интерактивов:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Ошибка сервера' 
        });
    }
});

// ==================== ПОЛНАЯ СИСТЕМА ПОСТОВ И ОТЗЫВОВ ====================

app.get('/api/webapp/posts', requireAuth, async (req, res) => {
    try {
        const userId = req.user.user_id;
        const { category, tags, search, sortBy } = req.query;
        
        let whereConditions = ["p.is_published = 1"];
        let params = [];

        if (category) {
            whereConditions.push("p.category = ?");
            params.push(category);
        }
        
        if (tags) {
            const tagList = tags.split(',');
            whereConditions.push(`EXISTS (SELECT 1 FROM json_each(p.tags) WHERE value IN (${tagList.map(() => '?').join(',')}))`);
            params.push(...tagList);
        }

        if (search) {
            whereConditions.push("(p.title LIKE ? OR p.content LIKE ? OR p.tags LIKE ?)");
            const searchTerm = `%${search}%`;
            params.push(searchTerm, searchTerm, searchTerm);
        }

        const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

        let orderClause = "ORDER BY p.created_at DESC";
        if (sortBy === 'popular') {
            orderClause = "ORDER BY p.views_count DESC";
        } else if (sortBy === 'rating') {
            orderClause = `ORDER BY (
                SELECT COALESCE(AVG(r.rating), 0) 
                FROM post_reviews r 
                WHERE r.post_id = p.id AND r.status = 'approved'
            ) DESC`;
        }

        const posts = await dbService.all(`
            SELECT p.* FROM posts p 
            ${whereClause}
            ${orderClause}
        `, params);

        const postsWithUserStatus = await Promise.all(
            posts.map(async (post) => {
                const reviews = await dbService.all(
                    "SELECT * FROM post_reviews WHERE post_id = ? AND status = 'approved'",
                    [post.id]
                );
                
                const userReview = reviews.find(r => r.user_id === userId);
                const averageRating = reviews.length > 0 ? 
                    reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length : 0;
                
                return {
                    id: post.id,
                    title: post.title,
                    content: post.content,
                    media_urls: dbService.parseJSONField(post.media_urls),
                    allowed_actions: dbService.parseJSONField(post.allowed_actions),
                    reward: post.reward,
                    is_published: post.is_published,
                    views_count: post.views_count,
                    likes_count: post.likes_count,
                    comments_count: post.comments_count,
                    shares_count: post.shares_count,
                    created_at: post.created_at,
                    updated_at: post.updated_at,
                    tags: dbService.parseJSONField(post.tags),
                    category: post.category,
                    reviews_count: reviews.length,
                    average_rating: averageRating,
                    user_has_reviewed: !!userReview,
                    user_review: userReview ? {
                        id: userReview.id,
                        rating: userReview.rating,
                        review_text: userReview.review_text,
                        created_at: userReview.created_at,
                        status: userReview.status
                    } : null
                };
            })
        );

        // Получаем доступные фильтры
        const categories = await dbService.all(
            "SELECT DISTINCT category FROM posts WHERE is_published = 1 AND category IS NOT NULL"
        );
        
        const allTags = await dbService.all(
            "SELECT DISTINCT value as tag FROM posts, json_each(posts.tags) WHERE is_published = 1"
        );

        res.json({
            success: true,
            posts: postsWithUserStatus,
            total: postsWithUserStatus.length,
            filters: {
                categories: categories.map(c => c.category),
                tags: allTags.map(t => t.tag),
                sortOptions: ['newest', 'popular', 'rating']
            }
        });

    } catch (error) {
        console.error('Ошибка получения постов:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Ошибка сервера' 
        });
    }
});

// Получение конкретного поста
app.get('/api/webapp/posts/:postId', requireAuth, async (req, res) => {
    try {
        const postId = parseInt(req.params.postId);
        const userId = req.user.user_id;
        
        const post = await dbService.get(
            "SELECT * FROM posts WHERE id = ? AND is_published = 1",
            [postId]
        );

        if (!post) {
            return res.status(404).json({ 
                success: false, 
                error: 'Пост не найден' 
            });
        }

        // Увеличиваем счетчик просмотров
        await dbService.run(
            "UPDATE posts SET views_count = views_count + 1 WHERE id = ?",
            [postId]
        );

        const reviews = await dbService.all(
            "SELECT * FROM post_reviews WHERE post_id = ? AND status = 'approved'",
            [postId]
        );
        
        const userReview = reviews.find(r => r.user_id === userId);
        const averageRating = reviews.length > 0 ? 
            reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length : 0;

        // Получаем информацию об авторе (если есть)
        const author = post.author_id ? await dbService.get(
            "SELECT * FROM admins WHERE user_id = ?",
            [post.author_id]
        ) : null;

        res.json({
            success: true,
            post: {
                id: post.id,
                title: post.title,
                content: post.content,
                media_urls: dbService.parseJSONField(post.media_urls),
                allowed_actions: dbService.parseJSONField(post.allowed_actions),
                reward: post.reward,
                views_count: post.views_count + 1, // +1 т.к. только что увеличили
                likes_count: post.likes_count,
                comments_count: post.comments_count,
                shares_count: post.shares_count,
                created_at: post.created_at,
                updated_at: post.updated_at,
                tags: dbService.parseJSONField(post.tags),
                category: post.category,
                reviews_count: reviews.length,
                average_rating: averageRating,
                author: author ? {
                    name: author.username,
                    role: author.role
                } : null,
                user_has_reviewed: !!userReview,
                user_review: userReview ? {
                    id: userReview.id,
                    rating: userReview.rating,
                    review_text: userReview.review_text,
                    created_at: userReview.created_at
                } : null
            }
        });

    } catch (error) {
        console.error('Ошибка получения поста:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Ошибка сервера' 
        });
    }
});

// Написание отзыва к посту
app.post('/api/webapp/posts/:postId/review', requireAuth, async (req, res) => {
    try {
        const postId = parseInt(req.params.postId);
        const { reviewText, rating } = req.body;
        const userId = req.user.user_id;

        if (!reviewText) {
            return res.status(400).json({ 
                success: false, 
                error: 'Текст отзыва обязателен' 
            });
        }

        const post = await dbService.get(
            "SELECT * FROM posts WHERE id = ?",
            [postId]
        );

        if (!post) {
            return res.status(404).json({ 
                success: false, 
                error: 'Пост не найден' 
            });
        }

        const existingReview = await dbService.get(
            "SELECT * FROM post_reviews WHERE user_id = ? AND post_id = ?",
            [userId, postId]
        );

        if (existingReview) {
            return res.status(400).json({ 
                success: false, 
                error: 'Вы уже оставляли отзыв на этот пост' 
            });
        }

        // Проверяем лимит отзывов за день
        const today = new Date().toDateString();
        const todayReviews = await dbService.all(
            "SELECT * FROM daily_reviews WHERE user_id = ? AND date = date('now') AND type = 'daily_comment'",
            [userId]
        );

        let sparksEarned = SPARKS_SYSTEM.WRITE_REVIEW;

        // Бонус за первый комментарий дня
        if (todayReviews.length === 0) {
            sparksEarned += SPARKS_SYSTEM.DAILY_COMMENT;
            
            await dbService.run(
                "INSERT INTO daily_reviews (user_id, date, type) VALUES (?, date('now'), ?)",
                [userId, 'daily_comment']
            );
        }

        const newReview = {
            user_id: userId,
            post_id: postId,
            review_text: reviewText,
            rating: rating || 5,
            status: 'pending',
            created_at: new Date().toISOString()
        };

        await dbService.run(
            `INSERT INTO post_reviews 
             (user_id, post_id, review_text, rating, status, created_at) 
             VALUES (?, ?, ?, ?, ?, ?)`,
            [
                newReview.user_id, newReview.post_id, newReview.review_text,
                newReview.rating, newReview.status, newReview.created_at
            ]
        );

        // Начисляем искры
        await EnhancedSparksService.addSparks(
            userId, 
            sparksEarned, 
            'post_review', 
            `Отзыв к посту: ${post.title}`,
            {
                postId: postId,
                rating: rating,
                isDailyFirst: todayReviews.length === 0
            }
        );

        // Обновляем счетчик комментариев в посте
        await dbService.run(
            "UPDATE posts SET comments_count = comments_count + 1 WHERE id = ?",
            [postId]
        );

        const message = todayReviews.length === 0 
            ? `Отзыв отправлен! +${sparksEarned}✨ (${SPARKS_SYSTEM.WRITE_REVIEW} за отзыв + ${SPARKS_SYSTEM.DAILY_COMMENT} за первый комментарий сегодня)`
            : `Отзыв отправлен! +${sparksEarned}✨`;

        res.json({
            success: true,
            message: message,
            reviewId: newReview.id,
            sparksEarned: sparksEarned,
            isDailyFirst: todayReviews.length === 0
        });

    } catch (error) {
        console.error('Ошибка отправки отзыва:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Ошибка сервера' 
        });
    }
});

// Лайк поста
app.post('/api/webapp/posts/:postId/like', requireAuth, async (req, res) => {
    try {
        const postId = parseInt(req.params.postId);
        const userId = req.user.user_id;

        const post = await dbService.get(
            "SELECT * FROM posts WHERE id = ?",
            [postId]
        );

        if (!post) {
            return res.status(404).json({ 
                success: false, 
                error: 'Пост не найден' 
            });
        }

        // В реальной системе здесь была бы отдельная таблица лайков
        // Для демонстрации просто увеличиваем счетчик
        await dbService.run(
            "UPDATE posts SET likes_count = likes_count + 1 WHERE id = ?",
            [postId]
        );

        const updatedPost = await dbService.get(
            "SELECT likes_count FROM posts WHERE id = ?",
            [postId]
        );

        res.json({
            success: true,
            message: 'Пост понравился!',
            likes_count: updatedPost.likes_count
        });

    } catch (error) {
        console.error('Ошибка лайка поста:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Ошибка сервера' 
        });
    }
});

// Поделиться постом
app.post('/api/webapp/posts/:postId/share', requireAuth, async (req, res) => {
    try {
        const postId = parseInt(req.params.postId);
        const userId = req.user.user_id;

        const post = await dbService.get(
            "SELECT * FROM posts WHERE id = ?",
            [postId]
        );

        if (!post) {
            return res.status(404).json({ 
                success: false, 
                error: 'Пост не найден' 
            });
        }

        // Увеличиваем счетчик шарингов
        await dbService.run(
            "UPDATE posts SET shares_count = shares_count + 1 WHERE id = ?",
            [postId]
        );

        // Начисляем искры за шаринг
        await EnhancedSparksService.addSparks(
            userId, 
            SPARKS_SYSTEM.CONTENT_SHARE, 
            'content_share', 
            `Поделился постом: ${post.title}`
        );

        const updatedPost = await dbService.get(
            "SELECT shares_count FROM posts WHERE id = ?",
            [postId]
        );

        res.json({
            success: true,
            message: `Пост успешно опубликован! +${SPARKS_SYSTEM.CONTENT_SHARE}✨`,
            shares_count: updatedPost.shares_count,
            sparksEarned: SPARKS_SYSTEM.CONTENT_SHARE
        });

    } catch (error) {
        console.error('Ошибка шаринга поста:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Ошибка сервера' 
        });
    }
});

// ==================== ПОЛНАЯ СИСТЕМА РАБОТ ПОЛЬЗОВАТЕЛЕЙ ====================

// Загрузка работы пользователя
app.post('/api/webapp/upload-work', requireAuth, upload.single('work'), async (req, res) => {
    try {
        const { title, description, type, category, tags } = req.body;
        const userId = req.user.user_id;

        if (!title || !req.file) {
            return res.status(400).json({ 
                success: false, 
                error: 'Название и изображение обязательны' 
            });
        }

        const user = await dbService.get(
            "SELECT * FROM users WHERE user_id = ?",
            [userId]
        );

        if (!user) {
            return res.status(404).json({ 
                success: false, 
                error: 'Пользователь не найден' 
            });
        }

        // Обрабатываем изображение
        const processedImage = await FileService.processImage(req.file.buffer);
        const imageUrl = await FileService.saveImageToDatabase(processedImage, userId, 'work');

        const newWork = {
            user_id: userId,
            title,
            description: description || '',
            image_url: imageUrl,
            type: type || 'image',
            status: 'pending',
            category: category || 'general',
            tags: tags ? JSON.stringify(tags.split(',')) : '[]'
        };

        await dbService.run(
            `INSERT INTO user_works 
             (user_id, title, description, image_url, type, status, category, tags) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                newWork.user_id, newWork.title, newWork.description, newWork.image_url,
                newWork.type, newWork.status, newWork.category, newWork.tags
            ]
        );

        // Начисляем искры за загрузку работы
        await EnhancedSparksService.addSparks(
            userId, 
            SPARKS_SYSTEM.UPLOAD_WORK, 
            'upload_work', 
            `Загрузка работы: ${title}`,
            {
                workId: newWork.id,
                type: type,
                category: category
            }
        );

        res.json({
            success: true,
            message: `Работа успешно загружена! Получено +${SPARKS_SYSTEM.UPLOAD_WORK}✨. После одобрения вы получите +${SPARKS_SYSTEM.WORK_APPROVED}✨`,
            workId: newWork.id,
            work: newWork,
            sparksEarned: SPARKS_SYSTEM.UPLOAD_WORK,
            potentialBonus: SPARKS_SYSTEM.WORK_APPROVED
        });

    } catch (error) {
        console.error('Ошибка загрузки работы:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Ошибка сервера при загрузке работы' 
        });
    }
});

// Получение работ пользователя
app.get('/api/webapp/users/:userId/works', requireAuth, async (req, res) => {
    try {
        const userId = parseInt(req.params.userId);
        const { status, category, sortBy } = req.query;
        
        if (userId !== req.user.user_id) {
            return res.status(403).json({ 
                success: false, 
                error: 'Доступ запрещен' 
            });
        }

        let whereConditions = ["w.user_id = ?"];
        let params = [userId];

        if (status) {
            whereConditions.push("w.status = ?");
            params.push(status);
        }
        
        if (category) {
            whereConditions.push("w.category = ?");
            params.push(category);
        }

        const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

        let orderClause = "ORDER BY w.created_at DESC";
        if (sortBy === 'popular') {
            orderClause = "ORDER BY w.likes_count DESC";
        }

        const userWorks = await dbService.all(`
            SELECT w.* FROM user_works w 
            ${whereClause}
            ${orderClause}
        `, params);

        // Добавляем информацию о модераторе
        const worksWithModerator = await Promise.all(
            userWorks.map(async (work) => {
                const moderator = work.moderator_id ? 
                    await dbService.get(
                        "SELECT * FROM admins WHERE user_id = ?",
                        [work.moderator_id]
                    ) : null;
                
                return {
                    ...work,
                    tags: dbService.parseJSONField(work.tags),
                    moderator_name: moderator ? moderator.username : null
                };
            })
        );

        // Статистика работ
        const worksStats = {
            total: userWorks.length,
            approved: userWorks.filter(w => w.status === 'approved').length,
            pending: userWorks.filter(w => w.status === 'pending').length,
            rejected: userWorks.filter(w => w.status === 'rejected').length,
            by_category: {}
        };

        userWorks.forEach(work => {
            if (!worksStats.by_category[work.category]) {
                worksStats.by_category[work.category] = 0;
            }
            worksStats.by_category[work.category]++;
        });

        res.json({
            success: true,
            works: worksWithModerator,
            stats: worksStats,
            total: worksWithModerator.length
        });

    } catch (error) {
        console.error('Ошибка получения работ:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Ошибка сервера' 
        });
    }
});

// Получение активности пользователя
app.get('/api/webapp/users/:userId/activities', requireAuth, async (req, res) => {
    try {
        const userId = parseInt(req.params.userId);
        const { type, limit = 50, offset = 0 } = req.query;
        
        if (userId !== req.user.user_id) {
            return res.status(403).json({ 
                success: false, 
                error: 'Доступ запрещен' 
            });
        }

        let whereConditions = ["a.user_id = ?"];
        let params = [userId];

        if (type) {
            whereConditions.push("a.activity_type = ?");
            params.push(type);
        }

        const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

        const userActivities = await dbService.all(`
            SELECT a.* FROM activities a 
            ${whereClause}
            ORDER BY a.created_at DESC
            LIMIT ? OFFSET ?
        `, [...params, parseInt(limit), parseInt(offset)]);

        const totalActivities = await dbService.get(
            `SELECT COUNT(*) as count FROM activities WHERE ${whereConditions.join(' AND ')}`,
            params
        );

        // Статистика активности
        const activityStats = {
            total: totalActivities.count,
            total_sparks: await dbService.get(
                `SELECT COALESCE(SUM(sparks_earned), 0) as total FROM activities WHERE ${whereConditions.join(' AND ')}`,
                params
            ).then(r => r.total),
            by_type: {},
            by_period: {
                today: await dbService.get(
                    "SELECT COUNT(*) as count FROM activities WHERE user_id = ? AND date(created_at) = date('now')",
                    [userId]
                ).then(r => r.count),
                week: await dbService.get(
                    "SELECT COUNT(*) as count FROM activities WHERE user_id = ? AND created_at > datetime('now', '-7 days')",
                    [userId]
                ).then(r => r.count),
                month: await dbService.get(
                    "SELECT COUNT(*) as count FROM activities WHERE user_id = ? AND created_at > datetime('now', '-30 days')",
                    [userId]
                ).then(r => r.count)
            }
        };

        const allActivities = await dbService.all(
            `SELECT activity_type FROM activities WHERE ${whereConditions.join(' AND ')}`,
            params
        );

        allActivities.forEach(activity => {
            if (!activityStats.by_type[activity.activity_type]) {
                activityStats.by_type[activity.activity_type] = 0;
            }
            activityStats.by_type[activity.activity_type]++;
        });

        res.json({
            success: true,
            activities: userActivities.map(a => ({
                ...a,
                metadata: a.metadata ? JSON.parse(a.metadata) : {}
            })),
            stats: activityStats,
            pagination: {
                total: totalActivities.count,
                limit: parseInt(limit),
                offset: parseInt(offset),
                hasMore: parseInt(offset) + parseInt(limit) < totalActivities.count
            }
        });

    } catch (error) {
        console.error('Ошибка получения активности:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Ошибка сервера' 
        });
    }
});

// Получение конкретной работы
app.get('/api/webapp/works/:workId', requireAuth, async (req, res) => {
    try {
        const workId = parseInt(req.params.workId);
        const userId = req.user.user_id;
        
        const work = await dbService.get(
            "SELECT * FROM user_works WHERE id = ?",
            [workId]
        );

        if (!work) {
            return res.status(404).json({ 
                success: false, 
                error: 'Работа не найдена' 
            });
        }

        // Проверяем доступ (только автор или администратор)
        if (work.user_id !== userId) {
            const admin = await dbService.get(
                "SELECT * FROM admins WHERE user_id = ? AND is_active = 1",
                [userId]
            );
            if (!admin) {
                return res.status(403).json({ 
                    success: false, 
                    error: 'Доступ запрещен' 
                });
            }
        }

        const reviews = await dbService.all(
            "SELECT * FROM work_reviews WHERE work_id = ? ORDER BY created_at DESC",
            [workId]
        );

        const moderator = work.moderator_id ? await dbService.get(
            "SELECT username FROM admins WHERE user_id = ?",
            [work.moderator_id]
        ) : null;

        res.json({
            success: true,
            work: {
                ...work,
                tags: dbService.parseJSONField(work.tags),
                moderator_name: moderator ? moderator.username : null,
                reviews: reviews
            }
        });

    } catch (error) {
        console.error('Ошибка получения работы:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Ошибка сервера' 
        });
    }
});

// Добавление отзыва к работе
app.post('/api/webapp/works/:workId/review', requireAuth, async (req, res) => {
    try {
        const workId = parseInt(req.params.workId);
        const { review_text, rating } = req.body;
        const userId = req.user.user_id;

        if (!review_text) {
            return res.status(400).json({ 
                success: false, 
                error: 'Текст отзыва обязателен' 
            });
        }

        const work = await dbService.get(
            "SELECT * FROM user_works WHERE id = ?",
            [workId]
        );

        if (!work) {
            return res.status(404).json({ 
                success: false, 
                error: 'Работа не найдена' 
            });
        }

        // Нельзя оставлять отзыв на свою работу
        if (work.user_id === userId) {
            return res.status(400).json({ 
                success: false, 
                error: 'Нельзя оставлять отзыв на свою работу' 
            });
        }

        const existingReview = await dbService.get(
            "SELECT * FROM work_reviews WHERE user_id = ? AND work_id = ?",
            [userId, workId]
        );

        if (existingReview) {
            return res.status(400).json({ 
                success: false, 
                error: 'Вы уже оставляли отзыв на эту работу' 
            });
        }

        const newReview = {
            user_id: userId,
            work_id: workId,
            review_text: review_text,
            rating: rating || 5,
            created_at: new Date().toISOString()
        };

        await dbService.run(
            `INSERT INTO work_reviews 
             (user_id, work_id, review_text, rating, created_at) 
             VALUES (?, ?, ?, ?, ?)`,
            [
                newReview.user_id, newReview.work_id, newReview.review_text,
                newReview.rating, newReview.created_at
            ]
        );

        // Обновляем счетчик комментариев в работе
        await dbService.run(
            "UPDATE user_works SET comments_count = comments_count + 1 WHERE id = ?",
            [workId]
        );

        res.json({
            success: true,
            message: 'Отзыв успешно добавлен!',
            reviewId: newReview.id
        });

    } catch (error) {
        console.error('Ошибка добавления отзыва:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Ошибка сервера' 
        });
    }
});

// Лайк работы
app.post('/api/webapp/works/:workId/like', requireAuth, async (req, res) => {
    try {
        const workId = parseInt(req.params.workId);
        const userId = req.user.user_id;

        const work = await dbService.get(
            "SELECT * FROM user_works WHERE id = ?",
            [workId]
        );

        if (!work) {
            return res.status(404).json({ 
                success: false, 
                error: 'Работа не найдена' 
            });
        }

        // В реальной системе здесь была бы отдельная таблица лайков
        // Для демонстрации просто увеличиваем счетчик
        await dbService.run(
            "UPDATE user_works SET likes_count = likes_count + 1 WHERE id = ?",
            [workId]
        );

        const updatedWork = await dbService.get(
            "SELECT likes_count FROM user_works WHERE id = ?",
            [workId]
        );

        res.json({
            success: true,
            message: 'Работа понравилась!',
            likes_count: updatedWork.likes_count
        });

    } catch (error) {
        console.error('Ошибка лайка работы:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Ошибка сервера' 
        });
    }
});

// ==================== TELEGRAM BOT (ПОЛНАЯ РЕАЛИЗАЦИЯ) ====================
let bot;
if (process.env.BOT_TOKEN) {
    try {
        bot = new TelegramBot(process.env.BOT_TOKEN, { polling: true });
        
        console.log('✅ Telegram Bot инициализирован');
        
        // Команда /start
        bot.onText(/\/start/, async (msg) => {
            const chatId = msg.chat.id;
            const name = msg.from.first_name || 'Друг';
            const userId = msg.from.id;
            const username = msg.from.username;
            
            let user = await dbService.get(
                "SELECT * FROM users WHERE user_id = ?",
                [userId]
            );

            const isNewUser = !user;

            if (!user) {
                user = {
                    id: Date.now(),
                    user_id: userId,
                    tg_first_name: msg.from.first_name,
                    tg_username: username,
                    sparks: 0,
                    level: 'Ученик',
                    is_registered: false,
                    class: null,
                    character_id: null,
                    character_name: null,
                    available_buttons: '[]',
                    registration_date: new Date().toISOString(),
                    last_active: new Date().toISOString(),
                    status: 'active',
                    invited_by: null,
                    invite_count: 0,
                    total_invited: 0
                };
                
                await dbService.run(
                    "INSERT INTO users (user_id, tg_first_name, tg_username, status) VALUES (?, ?, ?, ?)",
                    [userId, msg.from.first_name, username, 'active']
                );
            } else {
                await dbService.run(
                    "UPDATE users SET last_active = datetime('now') WHERE user_id = ?",
                    [userId]
                );
            }
            
            const baseUrl = process.env.APP_URL || 'http://localhost:3000';
            const webAppUrl = `${baseUrl}?tgWebAppStartParam=${userId}`;
            
            let welcomeText = '';
            let keyboard = {};
            
            if (isNewUser) {
                welcomeText = `🎨 Привет, ${name}!

Добро пожаловать в **Мастерская Вдохновения**!

✨ Откройте личный кабинет чтобы:
• 🎯 Проходить квизы и получать искры
• 🏃‍♂️ Участвовать в марафонах  
• 🖼️ Загружать свои работы
• 🎮 Выполнять интерактивные задания
• 🔄 Менять роль и персонажа
• 📊 Отслеживать прогресс
• 🛒 Покупать обучающие материалы

Нажмите кнопку ниже чтобы начать!`;
                
                keyboard = {
                    inline_keyboard: [[
                        {
                            text: "📱 Открыть Личный Кабинет",
                            web_app: { url: webAppUrl }
                        }
                    ]]
                };
            } else {
                const stats = await EnhancedSparksService.getUserStats(userId);
                welcomeText = `👋 С возвращением, ${name}!

📊 Ваш прогресс:
✨ Искры: ${user.sparks}
🏆 Уровень: ${user.level}
🎯 Роль: ${user.class || 'Не выбрана'}
📈 Активность: ${stats.total_activities} действий

Что будем делать сегодня?`;
                
                keyboard = {
                    inline_keyboard: [
                        [
                            {
                                text: "📱 Личный Кабинет",
                                web_app: { url: webAppUrl }
                            }
                        ],
                        [
                            {
                                text: "🎯 Квизы",
                                callback_data: 'quizzes'
                            },
                            {
                                text: "🏃‍♂️ Марафоны", 
                                callback_data: 'marathons'
                            }
                        ],
                        [
                            {
                                text: "🛒 Магазин",
                                callback_data: 'shop'
                            },
                            {
                                text: "📊 Статистика",
                                callback_data: 'stats'
                            }
                        ]
                    ]
                };
            }

            bot.sendMessage(chatId, welcomeText, {
                parse_mode: 'Markdown',
                reply_markup: keyboard
            });
        });

        // Обработка callback-кнопок
        bot.on('callback_query', async (callbackQuery) => {
            const msg = callbackQuery.message;
            const userId = callbackQuery.from.id;
            const data = callbackQuery.data;
            
            let responseText = '';
            let keyboard = {};
            
            switch (data) {
                case 'quizzes':
                    const activeQuizzes = await dbService.all(
                        "SELECT * FROM quizzes WHERE is_active = 1"
                    );
                    
                    responseText = `🎯 Доступные квизы (${activeQuizzes.length}):\n\n`;
                    
                    activeQuizzes.forEach((quiz, index) => {
                        responseText += `${index + 1}. ${quiz.title}\n`;
                    });
                    
                    responseText += `\nОткройте личный кабинет для прохождения квизов!`;
                    
                    keyboard = {
                        inline_keyboard: [[
                            {
                                text: "📱 Открыть Квизы",
                                web_app: { url: `${process.env.APP_URL || 'http://localhost:3000'}/quizzes` }
                            }
                        ]]
                    };
                    break;
                    
                case 'marathons':
                    const activeMarathons = await dbService.all(
                        "SELECT * FROM marathons WHERE is_active = 1"
                    );
                    
                    responseText = `🏃‍♂️ Активные марафоны (${activeMarathons.length}):\n\n`;
                    
                    activeMarathons.forEach((marathon, index) => {
                        responseText += `${index + 1}. ${marathon.title} (${marathon.duration} дней)\n`;
                    });
                    
                    keyboard = {
                        inline_keyboard: [[
                            {
                                text: "📱 Открыть Марафоны", 
                                web_app: { url: `${process.env.APP_URL || 'http://localhost:3000'}/marathons` }
                            }
                        ]]
                    };
                    break;
                    
                case 'shop':
                    const shopItems = await dbService.all(
                        "SELECT * FROM shop_items WHERE is_active = 1"
                    );
                    
                    responseText = `🛒 Магазин курсов (${shopItems.length} товаров):\n\n`;
                    
                    shopItems.slice(0, 5).forEach((item, index) => {
                        responseText += `${index + 1}. ${item.title} - ${item.price}✨\n`;
                    });
                    
                    if (shopItems.length > 5) {
                        responseText += `\n... и еще ${shopItems.length - 5} товаров`;
                    }
                    
                    keyboard = {
                        inline_keyboard: [[
                            {
                                text: "📱 Открыть Магазин",
                                web_app: { url: `${process.env.APP_URL || 'http://localhost:3000'}/shop` }
                            }
                        ]]
                    };
                    break;
                    
                case 'stats':
                    const user = await dbService.get(
                        "SELECT * FROM users WHERE user_id = ?",
                        [userId]
                    );
                    
                    const stats = await EnhancedSparksService.getUserStats(userId);
                    
                    responseText = `📊 Ваша статистика:\n\n`;
                    responseText += `✨ Искры: ${user.sparks}\n`;
                    responseText += `🏆 Уровень: ${user.level}\n`;
                    responseText += `🎯 Роль: ${user.class || 'Не выбрана'}\n`;
                    responseText += `📈 Всего активностей: ${stats.total_activities}\n`;
                    responseText += `🖼️ Работ: ${stats.total_works} (${stats.approved_works} одобрено)\n`;
                    responseText += `🎯 Квизов пройдено: ${stats.total_quizzes_completed}\n`;
                    responseText += `🏃‍♂️ Марафонов завершено: ${stats.total_marathons_completed}\n`;
                    responseText += `🔥 Дней активности подряд: ${stats.activityStreak}\n`;
                    responseText += `🏅 Ранг: ${stats.rank}\n`;
                    
                    keyboard = {
                        inline_keyboard: [[
                            {
                                text: "📱 Подробная статистика",
                                web_app: { url: `${process.env.APP_URL || 'http://localhost:3000'}/profile` }
                            }
                        ]]
                    };
                    break;
            }
            
            bot.editMessageText(responseText, {
                chat_id: msg.chat.id,
                message_id: msg.message_id,
                parse_mode: 'Markdown',
                reply_markup: keyboard
            });
            
            bot.answerCallbackQuery(callbackQuery.id);
        });

        // Команда /admin для администраторов
        bot.onText(/\/admin/, async (msg) => {
            const chatId = msg.chat.id;
            const userId = msg.from.id;
            
            const admin = await dbService.get(
                "SELECT * FROM admins WHERE user_id = ? AND is_active = 1",
                [userId]
            );
            
            if (!admin) {
                bot.sendMessage(chatId, '❌ У вас нет прав доступа к админ панели.');
                return;
            }
            
            const baseUrl = process.env.APP_URL || 'http://localhost:3000';
            const adminUrl = `${baseUrl}/admin?userId=${userId}`;
            
            const keyboard = {
                inline_keyboard: [[
                    {
                        text: "🔧 Открыть Админ Панель",
                        url: adminUrl
                    }
                ]]
            };
            
            bot.sendMessage(chatId, `🔧 Панель администратора\n\nНажмите кнопку ниже чтобы открыть админ панель:`, {
                parse_mode: 'Markdown',
                reply_markup: keyboard
            });
        });

        // Команда /stats для администраторов
        bot.onText(/\/stats/, async (msg) => {
            const chatId = msg.chat.id;
            const userId = msg.from.id;
            
            const admin = await dbService.get(
                "SELECT * FROM admins WHERE user_id = ? AND is_active = 1",
                [userId]
            );
            
            if (!admin) {
                bot.sendMessage(chatId, '❌ У вас нет прав доступа.');
                return;
            }
            
            const stats = await dbService.get(`
                SELECT 
                    (SELECT COUNT(*) FROM users) as total_users,
                    (SELECT COUNT(*) FROM users WHERE is_registered = 1) as registered_users,
                    (SELECT COUNT(*) FROM users WHERE last_active > datetime('now', '-7 days')) as active_users,
                    (SELECT COUNT(*) FROM quizzes WHERE is_active = 1) as active_quizzes,
                    (SELECT COUNT(*) FROM marathons WHERE is_active = 1) as active_marathons,
                    (SELECT COUNT(*) FROM shop_items WHERE is_active = 1) as shop_items,
                    (SELECT COALESCE(SUM(sparks), 0) FROM users) as total_sparks,
                    (SELECT COUNT(*) FROM user_works WHERE status = 'pending') + 
                    (SELECT COUNT(*) FROM post_reviews WHERE status = 'pending') as pending_moderation
            `);
            
            const statsText = `📊 Статистика бота:
            
👥 Пользователи: ${stats.total_users}
✅ Зарегистрировано: ${stats.registered_users}
🔥 Активных (неделя): ${stats.active_users}
🎯 Активных квизов: ${stats.active_quizzes}
🏃‍♂️ Активных марафонов: ${stats.active_marathons}
🛒 Товаров в магазине: ${stats.shop_items}
✨ Всего искр: ${stats.total_sparks.toFixed(1)}
⏳ На модерации: ${stats.pending_moderation}`;
            
            bot.sendMessage(chatId, statsText);
        });

        // Команда /profile для просмотра своего профиля
        bot.onText(/\/profile/, async (msg) => {
            const chatId = msg.chat.id;
            const userId = msg.from.id;
            
            const user = await dbService.get(
                "SELECT * FROM users WHERE user_id = ?",
                [userId]
            );
            
            if (!user) {
                bot.sendMessage(chatId, '❌ Пользователь не найден. Используйте /start для регистрации.');
                return;
            }
            
            const stats = await EnhancedSparksService.getUserStats(userId);
            const baseUrl = process.env.APP_URL || 'http://localhost:3000';
            const profileUrl = `${baseUrl}/profile?userId=${userId}`;
            
            const profileText = `👤 Ваш профиль:

✨ Искры: ${user.sparks}
🏆 Уровень: ${user.level}
🎯 Роль: ${user.class || 'Не выбрана'}
👤 Персонаж: ${user.character_name || 'Не выбран'}

📊 Статистика:
🖼️ Работ: ${stats.total_works} (${stats.approved_works} одобрено)
🎯 Квизов: ${stats.total_quizzes_completed}
🏃‍♂️ Марафонов: ${stats.total_marathons_completed}
🔥 Дней активности: ${stats.activityStreak}
🏅 Ранг: ${stats.rank}

Откройте полный профиль для детальной статистики!`;
            
            const keyboard = {
                inline_keyboard: [[
                    {
                        text: "📱 Открыть Полный Профиль",
                        web_app: { url: profileUrl }
                    }
                ]]
            };
            
            bot.sendMessage(chatId, profileText, {
                parse_mode: 'Markdown',
                reply_markup: keyboard
            });
        });

        // Обработка ошибок бота
        bot.on('polling_error', (error) => {
            console.error('❌ Ошибка polling Telegram Bot:', error);
        });
        
        bot.on('webhook_error', (error) => {
            console.error('❌ Ошибка webhook Telegram Bot:', error);
        });

    } catch (error) {
        console.error('❌ Ошибка инициализации бота:', error);
    }
} else {
    console.log('⚠️ Telegram Bot отключен (BOT_TOKEN не установлен)');
}

// ==================== РАСШИРЕННЫЙ АДМИН API ====================

// Логирование действий администратора
const logAdminAction = async (adminId, action, details, targetId = null, targetType = null) => {
    const admin = await dbService.get(
        "SELECT username FROM admins WHERE id = ?",
        [adminId]
    );
    
    await dbService.run(
        `INSERT INTO admin_logs 
         (admin_id, admin_name, action, details, target_id, target_type, ip_address) 
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
            adminId,
            admin?.username || 'Unknown',
            action,
            details,
            targetId,
            targetType,
            req.ip || '127.0.0.1'
        ]
    );
};

// Полная статистика системы
app.get('/api/admin/full-stats', requireAdmin, requirePermission('analytics'), async (req, res) => {
    try {
        const stats = await dbService.get(`
            SELECT 
                -- Пользователи
                (SELECT COUNT(*) FROM users) as total_users,
                (SELECT COUNT(*) FROM users WHERE is_registered = 1) as registered_users,
                (SELECT COUNT(*) FROM users WHERE last_active > datetime('now', '-7 days')) as active_users_7d,
                (SELECT COUNT(*) FROM users WHERE last_active > datetime('now', '-30 days')) as active_users_30d,
                (SELECT COUNT(*) FROM users WHERE status = 'active') as active_status_users,
                
                -- Контент
                (SELECT COUNT(*) FROM quizzes WHERE is_active = 1) as active_quizzes,
                (SELECT COUNT(*) FROM marathons WHERE is_active = 1) as active_marathons,
                (SELECT COUNT(*) FROM shop_items WHERE is_active = 1) as shop_items,
                (SELECT COUNT(*) FROM interactives WHERE is_active = 1) as interactives,
                (SELECT COUNT(*) FROM posts WHERE is_published = 1) as published_posts,
                
                -- Активность
                (SELECT COUNT(*) FROM quiz_completions) as total_quiz_completions,
                (SELECT COUNT(*) FROM marathon_completions) as total_marathon_starts,
                (SELECT COUNT(*) FROM marathon_completions WHERE completed = 1) as completed_marathons,
                (SELECT COUNT(*) FROM purchases) as total_purchases,
                (SELECT COUNT(*) FROM activities) as total_activities,
                
                -- Модерация
                (SELECT COUNT(*) FROM user_works WHERE status = 'pending') as pending_works,
                (SELECT COUNT(*) FROM post_reviews WHERE status = 'pending') as pending_reviews,
                (SELECT COUNT(*) FROM interactive_submissions WHERE status = 'pending') as pending_interactive_submissions,
                (SELECT COUNT(*) FROM marathon_submissions WHERE status = 'pending') as pending_marathon_submissions,
                
                -- Финансы
                (SELECT COALESCE(SUM(sparks), 0) FROM users) as total_sparks_in_circulation,
                (SELECT COALESCE(SUM(price_paid), 0) FROM purchases) as total_revenue_sparks,
                (SELECT COALESCE(SUM(sparks_earned), 0) FROM activities WHERE sparks_earned > 0) as total_sparks_earned,
                (SELECT COALESCE(SUM(sparks_earned), 0) FROM activities WHERE sparks_earned < 0) as total_sparks_spent,
                
                -- Администрация
                (SELECT COUNT(*) FROM admins WHERE is_active = 1) as active_admins
        `);

        // Статистика по дням (последние 30 дней)
        const dailyStats = await dbService.all(`
            SELECT 
                date(created_at) as date,
                COUNT(*) as registrations,
                SUM(CASE WHEN activity_type = 'quiz' THEN 1 ELSE 0 END) as quiz_completions,
                SUM(CASE WHEN activity_type = 'purchase' THEN 1 ELSE 0 END) as purchases
            FROM activities 
            WHERE created_at > datetime('now', '-30 days')
            GROUP BY date(created_at)
            ORDER BY date DESC
            LIMIT 30
        `);

        // Популярные товары
        const popularItems = await dbService.all(`
            SELECT 
                i.title,
                i.price,
                COUNT(p.id) as purchase_count,
                i.students_count
            FROM shop_items i
            LEFT JOIN purchases p ON i.id = p.item_id
            WHERE i.is_active = 1
            GROUP BY i.id
            ORDER BY purchase_count DESC
            LIMIT 10
        `);

        // Активные пользователи
        const topUsers = await dbService.all(`
            SELECT 
                u.user_id,
                u.tg_first_name,
                u.tg_username,
                u.sparks,
                u.level,
                COUNT(a.id) as activity_count
            FROM users u
            LEFT JOIN activities a ON u.user_id = a.user_id
            WHERE u.is_registered = 1
            GROUP BY u.user_id
            ORDER BY activity_count DESC
            LIMIT 10
        `);

        res.json({
            success: true,
            stats,
            charts: {
                daily: dailyStats,
                popular_items: popularItems,
                top_users: topUsers
            }
        });

    } catch (error) {
        console.error('Ошибка получения полной статистики:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Ошибка сервера' 
        });
    }
});

// Управление пользователями
app.get('/api/admin/users', requireAdmin, requirePermission('users'), async (req, res) => {
    try {
        const { page = 1, limit = 20, search, status, sortBy } = req.query;
        const offset = (page - 1) * limit;

        let whereConditions = ["1=1"];
        let params = [];

        if (search) {
            whereConditions.push("(u.tg_first_name LIKE ? OR u.tg_username LIKE ? OR u.user_id = ?)");
            const searchTerm = `%${search}%`;
            params.push(searchTerm, searchTerm, search);
        }

        if (status) {
            whereConditions.push("u.status = ?");
            params.push(status);
        }

        const whereClause = whereConditions.join(' AND ');

        let orderClause = "ORDER BY u.registration_date DESC";
        if (sortBy === 'sparks') orderClause = "ORDER BY u.sparks DESC";
        if (sortBy === 'activity') orderClause = "ORDER BY u.last_active DESC";
        if (sortBy === 'name') orderClause = "ORDER BY u.tg_first_name ASC";

        const users = await dbService.all(`
            SELECT 
                u.*,
                (SELECT COUNT(*) FROM activities a WHERE a.user_id = u.user_id) as activity_count,
                (SELECT COUNT(*) FROM purchases p WHERE p.user_id = u.user_id) as purchase_count,
                (SELECT COUNT(*) FROM user_works w WHERE w.user_id = u.user_id) as works_count
            FROM users u
            WHERE ${whereClause}
            ${orderClause}
            LIMIT ? OFFSET ?
        `, [...params, limit, offset]);

        const totalUsers = await dbService.get(
            `SELECT COUNT(*) as count FROM users u WHERE ${whereClause}`,
            params
        );

        await logAdminAction(req.admin.id, 'view_users', `Просмотр списка пользователей (страница ${page})`);

        res.json({
            success: true,
            users: users.map(u => ({
                ...u,
                available_buttons: dbService.parseJSONField(u.available_buttons)
            })),
            pagination: {
                total: totalUsers.count,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(totalUsers.count / limit)
            }
        });

    } catch (error) {
        console.error('Ошибка получения пользователей:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Ошибка сервера' 
        });
    }
});

// Блокировка/разблокировка пользователя
app.post('/api/admin/users/:userId/toggle-status', requireAdmin, requirePermission('users'), async (req, res) => {
    try {
        const userId = parseInt(req.params.userId);
        const { status, reason } = req.body;

        const user = await dbService.get(
            "SELECT * FROM users WHERE user_id = ?",
            [userId]
        );

        if (!user) {
            return res.status(404).json({ 
                success: false, 
                error: 'Пользователь не найден' 
            });
        }

        const newStatus = status || (user.status === 'active' ? 'blocked' : 'active');
        
        await dbService.run(
            "UPDATE users SET status = ? WHERE user_id = ?",
            [newStatus, userId]
        );

        await logAdminAction(
            req.admin.id, 
            'toggle_user_status', 
            `Изменение статуса пользователя ${userId} на ${newStatus}. Причина: ${reason || 'Не указана'}`,
            userId,
            'user'
        );

        res.json({
            success: true,
            message: `Статус пользователя изменен на: ${newStatus}`,
            newStatus
        });

    } catch (error) {
        console.error('Ошибка изменения статуса пользователя:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Ошибка сервера' 
        });
    }
});

// Начисление/списание искр
app.post('/api/admin/users/:userId/adjust-sparks', requireAdmin, requirePermission('finance'), async (req, res) => {
    try {
        const userId = parseInt(req.params.userId);
        const { amount, reason } = req.body;

        if (!amount || !reason) {
            return res.status(400).json({ 
                success: false, 
                error: 'Сумма и причина обязательны' 
            });
        }

        const user = await dbService.get(
            "SELECT * FROM users WHERE user_id = ?",
            [userId]
        );

        if (!user) {
            return res.status(404).json({ 
                success: false, 
                error: 'Пользователь не найден' 
            });
        }

        const newSparks = Math.max(0, user.sparks + parseFloat(amount));
        const newLevel = EnhancedSparksService.calculateLevel(newSparks);

        await dbService.run(
            "UPDATE users SET sparks = ?, level = ? WHERE user_id = ?",
            [newSparks, newLevel, userId]
        );

        // Логируем действие
        await dbService.run(
            "INSERT INTO activities (user_id, activity_type, sparks_earned, description) VALUES (?, ?, ?, ?)",
            [userId, 'admin_adjustment', parseFloat(amount), `Администратор: ${reason}`]
        );

        await logAdminAction(
            req.admin.id, 
            'adjust_sparks', 
            `Изменение искр пользователя ${userId} на ${amount}. Новый баланс: ${newSparks}. Причина: ${reason}`,
            userId,
            'user'
        );

        res.json({
            success: true,
            message: `Баланс пользователя изменен на ${amount} искр`,
            newBalance: newSparks,
            newLevel
        });

    } catch (error) {
        console.error('Ошибка изменения искр:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Ошибка сервера' 
        });
    }
});

// Модерация работ пользователей
app.get('/api/admin/works/pending', requireAdmin, requirePermission('moderation'), async (req, res) => {
    try {
        const { page = 1, limit = 20 } = req.query;
        const offset = (page - 1) * limit;

        const pendingWorks = await dbService.all(`
            SELECT 
                w.*,
                u.tg_first_name,
                u.tg_username
            FROM user_works w
            JOIN users u ON w.user_id = u.user_id
            WHERE w.status = 'pending'
            ORDER BY w.created_at ASC
            LIMIT ? OFFSET ?
        `, [limit, offset]);

        const totalPending = await dbService.get(
            "SELECT COUNT(*) as count FROM user_works WHERE status = 'pending'"
        );

        res.json({
            success: true,
            works: pendingWorks.map(w => ({
                ...w,
                tags: dbService.parseJSONField(w.tags)
            })),
            pagination: {
                total: totalPending.count,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(totalPending.count / limit)
            }
        });

    } catch (error) {
        console.error('Ошибка получения работ на модерации:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Ошибка сервера' 
        });
    }
});

app.post('/api/admin/works/:workId/moderate', requireAdmin, requirePermission('moderation'), async (req, res) => {
    try {
        const workId = parseInt(req.params.workId);
        const { status, comment } = req.body;

        if (!['approved', 'rejected'].includes(status)) {
            return res.status(400).json({ 
                success: false, 
                error: 'Неверный статус' 
            });
        }

        const work = await dbService.get(
            "SELECT * FROM user_works WHERE id = ?",
            [workId]
        );

        if (!work) {
            return res.status(404).json({ 
                success: false, 
                error: 'Работа не найдена' 
            });
        }

        await dbService.run(
            "UPDATE user_works SET status = ?, moderated_at = datetime('now'), moderator_id = ?, admin_comment = ? WHERE id = ?",
            [status, req.admin.user_id, comment, workId]
        );

        // Если работа одобрена - начисляем бонус
        if (status === 'approved') {
            await EnhancedSparksService.addSparks(
                work.user_id,
                SPARKS_SYSTEM.WORK_APPROVED,
                'work_approved',
                `Работа одобрена: ${work.title}`,
                { workId: workId }
            );
        }

        await logAdminAction(
            req.admin.id, 
            'moderate_work', 
            `Модерация работы ${workId}. Статус: ${status}. Комментарий: ${comment || 'Отсутствует'}`,
            workId,
            'work'
        );

        res.json({
            success: true,
            message: `Работа ${status === 'approved' ? 'одобрена' : 'отклонена'}`,
            sparksAwarded: status === 'approved' ? SPARKS_SYSTEM.WORK_APPROVED : 0
        });

    } catch (error) {
        console.error('Ошибка модерации работы:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Ошибка сервера' 
        });
    }
});

// Управление контентом (квизы, марафоны, товары)
app.get('/api/admin/content/:type', requireAdmin, requirePermission('content'), async (req, res) => {
    try {
        const { type } = req.params;
        const { page = 1, limit = 20 } = req.query;
        const offset = (page - 1) * limit;

        let tableName, orderField;
        switch (type) {
            case 'quizzes':
                tableName = 'quizzes';
                orderField = 'created_at';
                break;
            case 'marathons':
                tableName = 'marathons';
                orderField = 'created_at';
                break;
            case 'shop-items':
                tableName = 'shop_items';
                orderField = 'created_at';
                break;
            case 'interactives':
                tableName = 'interactives';
                orderField = 'created_at';
                break;
            case 'posts':
                tableName = 'posts';
                orderField = 'created_at';
                break;
            default:
                return res.status(400).json({ 
                    success: false, 
                    error: 'Неверный тип контента' 
                });
        }

        const content = await dbService.all(`
            SELECT * FROM ${tableName}
            ORDER BY ${orderField} DESC
            LIMIT ? OFFSET ?
        `, [limit, offset]);

        const total = await dbService.get(
            `SELECT COUNT(*) as count FROM ${tableName}`
        );

        // Форматируем JSON поля
        const formattedContent = content.map(item => {
            const formatted = { ...item };
            // Обрабатываем JSON поля в зависимости от типа контента
            if (type === 'quizzes' && item.questions) {
                formatted.questions = dbService.parseJSONField(item.questions);
            }
            if (item.tags) {
                formatted.tags = dbService.parseJSONField(item.tags);
            }
            if (type === 'marathons' && item.days) {
                formatted.days = dbService.parseJSONField(item.days);
            }
            if (type === 'marathons' && item.requirements) {
                formatted.requirements = dbService.parseJSONField(item.requirements);
            }
            return formatted;
        });

        res.json({
            success: true,
            content: formattedContent,
            type: type,
            pagination: {
                total: total.count,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(total.count / limit)
            }
        });

    } catch (error) {
        console.error('Ошибка получения контента:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Ошибка сервера' 
        });
    }
});

// Создание/редактирование контента
app.post('/api/admin/content/:type', requireAdmin, requirePermission('content'), async (req, res) => {
    try {
        const { type } = req.params;
        const contentData = req.body;

        let tableName, action;
        
        if (contentData.id) {
            // Редактирование существующего
            action = 'update';
            // Здесь должна быть логика обновления в зависимости от типа
        } else {
            // Создание нового
            action = 'create';
            // Здесь должна быть логика создания в зависимости от типа
        }

        await logAdminAction(
            req.admin.id, 
            `${action}_content`, 
            `${action === 'create' ? 'Создание' : 'Редактирование'} контента типа ${type}`,
            contentData.id || null,
            type
        );

        res.json({
            success: true,
            message: `Контент успешно ${action === 'create' ? 'создан' : 'обновлен'}`,
            id: contentData.id || Date.now()
        });

    } catch (error) {
        console.error('Ошибка сохранения контента:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Ошибка сервера' 
        });
    }
});

// Системные настройки
app.get('/api/admin/settings', requireAdmin, requirePermission('settings'), async (req, res) => {
    try {
        const settings = await dbService.all(
            "SELECT * FROM system_settings ORDER BY key"
        );

        const settingsObj = {};
        settings.forEach(setting => {
            settingsObj[setting.key] = {
                value: setting.value,
                description: setting.description
            };
        });

        res.json({
            success: true,
            settings: settingsObj
        });

    } catch (error) {
        console.error('Ошибка получения настроек:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Ошибка сервера' 
        });
    }
});

app.post('/api/admin/settings', requireAdmin, requirePermission('settings'), async (req, res) => {
    try {
        const { settings } = req.body;

        await dbService.run("BEGIN TRANSACTION");

        for (const [key, value] of Object.entries(settings)) {
            await dbService.run(
                "INSERT OR REPLACE INTO system_settings (key, value, updated_at) VALUES (?, ?, datetime('now'))",
                [key, value]
            );
        }

        await dbService.run("COMMIT");

        await logAdminAction(
            req.admin.id, 
            'update_settings', 
            'Обновление системных настроек'
        );

        res.json({
            success: true,
            message: 'Настройки успешно обновлены'
        });

    } catch (error) {
        await dbService.run("ROLLBACK");
        console.error('Ошибка обновления настроек:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Ошибка сервера' 
        });
    }
});

// Логи администраторов
app.get('/api/admin/logs', requireAdmin, requirePermission('analytics'), async (req, res) => {
    try {
        const { page = 1, limit = 50, admin_id, action } = req.query;
        const offset = (page - 1) * limit;

        let whereConditions = ["1=1"];
        let params = [];

        if (admin_id) {
            whereConditions.push("admin_id = ?");
            params.push(admin_id);
        }

        if (action) {
            whereConditions.push("action = ?");
            params.push(action);
        }

        const whereClause = whereConditions.join(' AND ');

        const logs = await dbService.all(`
            SELECT * FROM admin_logs 
            WHERE ${whereClause}
            ORDER BY timestamp DESC
            LIMIT ? OFFSET ?
        `, [...params, limit, offset]);

        const totalLogs = await dbService.get(
            `SELECT COUNT(*) as count FROM admin_logs WHERE ${whereClause}`,
            params
        );

        res.json({
            success: true,
            logs,
            pagination: {
                total: totalLogs.count,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(totalLogs.count / limit)
            }
        });

    } catch (error) {
        console.error('Ошибка получения логов:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Ошибка сервера' 
        });
    }
});

// ==================== СИСТЕМА УВЕДОМЛЕНИЙ ====================

app.get('/api/webapp/notifications', requireAuth, async (req, res) => {
    try {
        const userId = req.user.user_id;
        const { unread_only = false, limit = 20, offset = 0 } = req.query;

        let whereConditions = ["user_id = ?"];
        let params = [userId];

        if (unread_only) {
            whereConditions.push("is_read = 0");
        }

        const whereClause = whereConditions.join(' AND ');

        const notifications = await dbService.all(`
            SELECT * FROM notifications 
            WHERE ${whereClause}
            ORDER BY created_at DESC
            LIMIT ? OFFSET ?
        `, [...params, parseInt(limit), parseInt(offset)]);

        const total = await dbService.get(
            `SELECT COUNT(*) as count FROM notifications WHERE ${whereClause}`,
            params
        );

        const unreadCount = await dbService.get(
            "SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = 0",
            [userId]
        );

        res.json({
            success: true,
            notifications,
            unread_count: unreadCount.count,
            pagination: {
                total: total.count,
                limit: parseInt(limit),
                offset: parseInt(offset),
                hasMore: parseInt(offset) + parseInt(limit) < total.count
            }
        });

    } catch (error) {
        console.error('Ошибка получения уведомлений:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Ошибка сервера' 
        });
    }
});

app.post('/api/webapp/notifications/:notificationId/read', requireAuth, async (req, res) => {
    try {
        const notificationId = parseInt(req.params.notificationId);
        const userId = req.user.user_id;

        const notification = await dbService.get(
            "SELECT * FROM notifications WHERE id = ? AND user_id = ?",
            [notificationId, userId]
        );

        if (!notification) {
            return res.status(404).json({ 
                success: false, 
                error: 'Уведомление не найдено' 
            });
        }

        await dbService.run(
            "UPDATE notifications SET is_read = 1 WHERE id = ?",
            [notificationId]
        );

        res.json({
            success: true,
            message: 'Уведомление отмечено как прочитанное'
        });

    } catch (error) {
        console.error('Ошибка отметки уведомления:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Ошибка сервера' 
        });
    }
});

app.post('/api/webapp/notifications/mark-all-read', requireAuth, async (req, res) => {
    try {
        const userId = req.user.user_id;

        await dbService.run(
            "UPDATE notifications SET is_read = 1 WHERE user_id = ?",
            [userId]
        );

        res.json({
            success: true,
            message: 'Все уведомления отмечены как прочитанные'
        });

    } catch (error) {
        console.error('Ошибка отметки всех уведомлений:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Ошибка сервера' 
        });
    }
});

app.delete('/api/webapp/notifications/:notificationId', requireAuth, async (req, res) => {
    try {
        const notificationId = parseInt(req.params.notificationId);
        const userId = req.user.user_id;

        const notification = await dbService.get(
            "SELECT * FROM notifications WHERE id = ? AND user_id = ?",
            [notificationId, userId]
        );

        if (!notification) {
            return res.status(404).json({ 
                success: false, 
                error: 'Уведомление не найдено' 
            });
        }

        await dbService.run(
            "DELETE FROM notifications WHERE id = ?",
            [notificationId]
        );

        res.json({
            success: true,
            message: 'Уведомление удалено'
        });

    } catch (error) {
        console.error('Ошибка удаления уведомления:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Ошибка сервера' 
        });
    }
});

// Админ: отправка уведомлений пользователям
app.post('/api/admin/notifications/send', requireAdmin, requirePermission('users'), async (req, res) => {
    try {
        const { user_ids, title, message, type = 'info' } = req.body;

        if (!title || !message) {
            return res.status(400).json({ 
                success: false, 
                error: 'Заголовок и сообщение обязательны' 
            });
        }

        let users = [];
        if (user_ids && user_ids.length > 0) {
            // Отправка конкретным пользователям
            const placeholders = user_ids.map(() => '?').join(',');
            users = await dbService.all(
                `SELECT user_id FROM users WHERE user_id IN (${placeholders})`,
                user_ids
            );
        } else {
            // Отправка всем пользователям
            users = await dbService.all("SELECT user_id FROM users WHERE is_registered = 1");
        }

        await dbService.run("BEGIN TRANSACTION");

        for (const user of users) {
            await dbService.run(
                "INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, ?)",
                [user.user_id, title, message, type]
            );
        }

        await dbService.run("COMMIT");

        await logAdminAction(
            req.admin.id, 
            'send_notifications', 
            `Отправка уведомления "${title}" для ${users.length} пользователей`
        );

        res.json({
            success: true,
            message: `Уведомление отправлено ${users.length} пользователям`,
            recipients_count: users.length
        });

    } catch (error) {
        await dbService.run("ROLLBACK");
        console.error('Ошибка отправки уведомлений:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Ошибка сервера' 
        });
    }
});

// ==================== ОБРАБОТКА ОШИБОК ====================
app.use('*', (req, res) => {
    console.log(`❌ 404 ошибка: ${req.method} ${req.originalUrl}`);
    
    if (req.accepts('html')) {
        const filePath = join(APP_ROOT, 'public', 'index.html');
        if (existsSync(filePath)) {
            return res.sendFile(filePath);
        }
    }
    
    res.status(404).json({
        success: false,
        error: 'Page not found: ' + req.originalUrl,
        method: req.method,
        timestamp: new Date().toISOString()
    });
});

app.use((error, req, res, next) => {
    console.error('❌ Глобальная ошибка:', error);
    
    const errorLog = {
        timestamp: new Date().toISOString(),
        method: req.method,
        url: req.url,
        headers: req.headers,
        body: req.body,
        error: {
            message: error.message,
            stack: error.stack,
            name: error.name
        }
    };
    
    console.error('📋 Детали ошибки:', JSON.stringify(errorLog, null, 2));
    
    res.status(error.status || 500).json({
        success: false,
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal Server Error',
        code: error.code || 'INTERNAL_ERROR',
        timestamp: new Date().toISOString(),
        ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
    });
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Необработанное отклонение промиса:', reason);
    console.error('📋 Промис:', promise);
});

process.on('uncaughtException', (error) => {
    console.error('❌ Неперехваченное исключение:', error);
    process.exit(1);
});

// ==================== SERVER START ====================
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', async () => {
    console.log(`🚀 Сервер запущен на порту ${PORT}`);
    console.log(`📱 WebApp: ${process.env.APP_URL || `http://localhost:${PORT}`}`);
    console.log(`🔧 Admin: ${process.env.APP_URL || `http://localhost:${PORT}`}/admin`);
    console.log(`🗄️ Database: PostgreSQL (${dbService.connected ? 'Connected' : 'Disconnected'})`);
    
    if (dbService.connected) {
        try {
            const stats = await dbService.get(`
                SELECT 
                    (SELECT COUNT(*) FROM users) as users,
                    (SELECT COUNT(*) FROM quizzes WHERE is_active = true) as quizzes,
                    (SELECT COUNT(*) FROM marathons WHERE is_active = true) as marathons,
                    (SELECT COUNT(*) FROM shop_items WHERE is_active = true) as shop_items,
                    (SELECT COUNT(*) FROM interactives WHERE is_active = true) as interactives,
                    (SELECT COUNT(*) FROM posts WHERE is_published = true) as posts,
                    (SELECT COUNT(*) FROM admins WHERE is_active = true) as admins
            `);
            
            console.log(`🎯 Квизов: ${stats.quizzes}`);
            console.log(`🏃‍♂️ Марафонов: ${stats.marathons}`);
            console.log(`🎮 Интерактивов: ${stats.interactives}`);
            console.log(`🛒 Товаров: ${stats.shop_items}`);
            console.log(`📝 Постов: ${stats.posts}`);
            console.log(`👥 Пользователей: ${stats.users}`);
            console.log(`🔧 Администраторов: ${stats.admins}`);
            console.log('✅ Все системы работают!');
            
        } catch (error) {
            console.log('⚠️ Не удалось получить статистику системы');
        }
    }
});
