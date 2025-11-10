import express from 'express';
import TelegramBot from 'node-telegram-bot-api';
import cors from 'cors';
import bodyParser from 'body-parser';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';
import pkg from 'pg';

const { Client } = pkg;
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();

// Подключение к PostgreSQL TimeWeb
const dbConfig = {
    host: process.env.DB_HOST || '789badf9748826d5c6ffd045.twc1.net',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'default_db',
    user: process.env.DB_USER || 'gen_user',
    password: process.env.DB_PASSWORD,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
};

console.log('🔗 Конфигурация базы данных:', {
    host: dbConfig.host,
    port: dbConfig.port,
    database: dbConfig.database,
    user: dbConfig.user,
    hasPassword: !!dbConfig.password
});

let dbClient;

async function connectDatabase() {
    try {
        dbClient = new Client(dbConfig);
        await dbClient.connect();
        console.log('✅ Подключение к PostgreSQL установлено');
        return true;
    } catch (error) {
        console.error('❌ Ошибка подключения к базе данных:', error.message);
        return false;
    }
}

// Пробуем подключиться к базе
connectDatabase().then(success => {
    if (!success) {
        console.log('🚫 База данных недоступна, но сервер продолжает работу');
    }
});

app.use(express.json({ limit: '50mb' }));
app.use(cors());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(join(__dirname, 'public')));
app.use('/admin', express.static(join(__dirname, 'admin')));

console.log('🎨 Мастерская Вдохновения - Запуск...');

// ==================== СИСТЕМА НАЧИСЛЕНИЯ ИСКР ====================

const SPARKS_SYSTEM = {
    QUIZ_PER_CORRECT_ANSWER: 1,
    QUIZ_PERFECT_BONUS: 5,
    DAILY_COMMENT: 1,
    INVITE_FRIEND: 10,
    PARTICIPATE_POLL: 2,
    PARTICIPATE_MARATHON: 7,
    WRITE_REVIEW: 3
};

// ==================== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ====================

function calculateLevel(sparks) {
    if (sparks >= 400) return 'Наставник';
    if (sparks >= 300) return 'Мастер';
    if (sparks >= 150) return 'Знаток';
    if (sparks >= 50) return 'Искатель';
    return 'Ученик';
}

async function addSparks(userId, sparks, activityType, description) {
    if (!dbClient) return false;
    
    try {
        await dbClient.query(
            'UPDATE users SET sparks = sparks + $1 WHERE user_id = $2',
            [sparks, userId]
        );
        await dbClient.query(
            'INSERT INTO activities (user_id, activity_type, sparks_earned, description) VALUES ($1, $2, $3, $4)',
            [userId, activityType, sparks, description]
        );
        return true;
    } catch (error) {
        console.error('❌ Error adding sparks:', error);
        return false;
    }
}

// ==================== MIDDLEWARE ====================

const requireAdmin = async (req, res, next) => {
    const userId = req.query.userId || req.body.userId;
    
    if (!userId) {
        return res.status(401).json({ error: 'User ID required' });
    }
    
    if (!dbClient) {
        return res.status(500).json({ error: 'Database not available' });
    }
    
    try {
        const result = await dbClient.query('SELECT * FROM admins WHERE user_id = $1', [userId]);
        if (result.rows.length === 0) {
            return res.status(403).json({ error: 'Admin access required' });
        }
        req.admin = result.rows[0];
        next();
    } catch (error) {
        return res.status(500).json({ error: 'Database error' });
    }
};

// ==================== BASIC ROUTES ====================

app.get('/health', async (req, res) => {
    const dbStatus = dbClient ? 'Connected' : 'Disconnected';
    
    res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        version: '6.1.0',
        database: dbStatus,
        bot: process.env.BOT_TOKEN ? 'Configured' : 'Not configured'
    });
});

app.get('/', (req, res) => {
    res.sendFile(join(__dirname, 'public', 'index.html'));
});

app.get('/admin', (req, res) => {
    res.sendFile(join(__dirname, 'admin', 'index.html'));
});

// ==================== ИНИЦИАЛИЗАЦИЯ БАЗЫ ДАННЫХ ====================

async function initializeDatabase() {
    try {
        await dbClient.connect();
        console.log('✅ Подключение к PostgreSQL установлено');

        // Создание таблиц
        await dbClient.query(`
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                user_id BIGINT UNIQUE NOT NULL,
                tg_username TEXT,
                tg_first_name TEXT,
                tg_last_name TEXT,
                class TEXT,
                character_id INTEGER,
                sparks REAL DEFAULT 0,
                level TEXT DEFAULT 'Ученик',
                is_registered BOOLEAN DEFAULT FALSE,
                registration_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                last_active TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                daily_commented BOOLEAN DEFAULT FALSE,
                consecutive_days INTEGER DEFAULT 0,
                invited_by INTEGER,
                invite_count INTEGER DEFAULT 0,
                last_bonus_claim TIMESTAMP,
                total_activities INTEGER DEFAULT 0,
                settings TEXT DEFAULT '{}'
            )
        `);

        await dbClient.query(`
            CREATE TABLE IF NOT EXISTS characters (
                id SERIAL PRIMARY KEY,
                class TEXT NOT NULL,
                character_name TEXT NOT NULL,
                description TEXT,
                bonus_type TEXT NOT NULL,
                bonus_value TEXT NOT NULL,
                available_buttons TEXT DEFAULT '["quiz","photo_work","shop","invite","activities"]',
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        await dbClient.query(`
            CREATE TABLE IF NOT EXISTS quizzes (
                id SERIAL PRIMARY KEY,
                title TEXT NOT NULL,
                description TEXT,
                questions TEXT NOT NULL,
                sparks_reward REAL DEFAULT 1,
                cooldown_hours INTEGER DEFAULT 24,
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        await dbClient.query(`
            CREATE TABLE IF NOT EXISTS quiz_completions (
                id SERIAL PRIMARY KEY,
                user_id BIGINT NOT NULL,
                quiz_id INTEGER NOT NULL,
                completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                score INTEGER NOT NULL,
                sparks_earned REAL NOT NULL,
                perfect_score BOOLEAN DEFAULT FALSE,
                UNIQUE(user_id, quiz_id)
            )
        `);

        await dbClient.query(`
            CREATE TABLE IF NOT EXISTS activities (
                id SERIAL PRIMARY KEY,
                user_id BIGINT NOT NULL,
                activity_type TEXT NOT NULL,
                sparks_earned REAL NOT NULL,
                description TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        await dbClient.query(`
            CREATE TABLE IF NOT EXISTS admins (
                id SERIAL PRIMARY KEY,
                user_id BIGINT UNIQUE NOT NULL,
                username TEXT,
                role TEXT DEFAULT 'moderator',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        await dbClient.query(`
            CREATE TABLE IF NOT EXISTS shop_items (
                id SERIAL PRIMARY KEY,
                title TEXT NOT NULL,
                description TEXT,
                type TEXT NOT NULL DEFAULT 'video',
                file_url TEXT,
                preview_url TEXT,
                price REAL NOT NULL,
                content_text TEXT,
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        await dbClient.query(`
            CREATE TABLE IF NOT EXISTS purchases (
                id SERIAL PRIMARY KEY,
                user_id BIGINT NOT NULL,
                item_id INTEGER NOT NULL,
                price_paid REAL NOT NULL,
                purchased_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                content_delivered BOOLEAN DEFAULT FALSE
            )
        `);

        // НОВЫЕ ТАБЛИЦЫ ДЛЯ КОММЕНТАРИЕВ И ПОСТОВ
        await dbClient.query(`
            CREATE TABLE IF NOT EXISTS channel_posts (
                id SERIAL PRIMARY KEY,
                post_id TEXT UNIQUE NOT NULL,
                title TEXT NOT NULL,
                content TEXT,
                image_url TEXT,
                admin_id BIGINT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                is_active BOOLEAN DEFAULT TRUE
            )
        `);

        await dbClient.query(`
            CREATE TABLE IF NOT EXISTS post_reviews (
                id SERIAL PRIMARY KEY,
                user_id BIGINT NOT NULL,
                post_id TEXT NOT NULL,
                review_text TEXT NOT NULL,
                rating INTEGER DEFAULT 5,
                status TEXT DEFAULT 'pending', -- pending, approved, rejected
                admin_comment TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                moderated_at TIMESTAMP,
                moderator_id BIGINT
            )
        `);

        await dbClient.query(`
            CREATE TABLE IF NOT EXISTS user_invites (
                id SERIAL PRIMARY KEY,
                inviter_id BIGINT NOT NULL,
                invited_id BIGINT NOT NULL,
                invite_code TEXT NOT NULL,
                completed BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        await dbClient.query(`
            CREATE TABLE IF NOT EXISTS polls (
                id SERIAL PRIMARY KEY,
                title TEXT NOT NULL,
                description TEXT,
                options TEXT NOT NULL, -- JSON array
                created_by BIGINT NOT NULL,
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        await dbClient.query(`
            CREATE TABLE IF NOT EXISTS poll_participants (
                id SERIAL PRIMARY KEY,
                user_id BIGINT NOT NULL,
                poll_id INTEGER NOT NULL,
                selected_option INTEGER NOT NULL,
                participated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(user_id, poll_id)
            )
        `);

        await dbClient.query(`
            CREATE TABLE IF NOT EXISTS marathons (
                id SERIAL PRIMARY KEY,
                title TEXT NOT NULL,
                description TEXT,
                start_date TIMESTAMP NOT NULL,
                end_date TIMESTAMP NOT NULL,
                reward_sparks REAL DEFAULT 7,
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        await dbClient.query(`
            CREATE TABLE IF NOT EXISTS marathon_participants (
                id SERIAL PRIMARY KEY,
                user_id BIGINT NOT NULL,
                marathon_id INTEGER NOT NULL,
                completed BOOLEAN DEFAULT FALSE,
                joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                completed_at TIMESTAMP,
                UNIQUE(user_id, marathon_id)
            )
        `);

        // Заполняем персонажей
        const characters = [
            ['Художники', 'Лука Цветной', 'Рисует с детства, любит эксперименты с цветом', 'percent_bonus', '10'],
            ['Художники', 'Марина Кисть', 'Строгая преподавательница академической живописи', 'forgiveness', '1'],
            ['Художники', 'Феликс Штрих', 'Экспериментатор, мастер зарисовок', 'random_gift', '1-3'],
            ['Стилисты', 'Эстелла Моде', 'Бывший стилист, обучает восприятию образа', 'percent_bonus', '5'],
            ['Стилисты', 'Роза Ателье', 'Мастер практического шитья', 'secret_advice', '2weeks'],
            ['Стилисты', 'Гертруда Линия', 'Ценит детали и аксессуары', 'series_bonus', '1'],
            ['Мастера', 'Тихон Творец', 'Ремесленник, любит простые техники', 'photo_bonus', '1'],
            ['Мастера', 'Агата Узор', 'Любит неожиданные материалы', 'weekly_surprise', '6'],
            ['Мастера', 'Борис Клей', 'Весёлый мастер импровизаций', 'mini_quest', '2'],
            ['Историки', 'Профессор Артёмий', 'Любитель архивов и фактов', 'quiz_hint', '1'],
            ['Историки', 'Соня Гравюра', 'Рассказывает истории картин', 'fact_star', '1'],
            ['Историки', 'Михаил Эпоха', 'Любит хронологию и эпохи', 'streak_multiplier', '2']
        ];

        for (const char of characters) {
            await dbClient.query(
                `INSERT INTO characters (class, character_name, description, bonus_type, bonus_value) 
                 VALUES ($1, $2, $3, $4, $5) 
                 ON CONFLICT DO NOTHING`,
                char
            );
        }

        // Добавляем тестового пользователя
        await dbClient.query(
            `INSERT INTO users (user_id, tg_first_name, sparks, level, is_registered, class, character_id) 
             VALUES ($1, $2, $3, $4, $5, $6, $7) 
             ON CONFLICT (user_id) DO NOTHING`,
            [12345, 'Тестовый Пользователь', 25.5, 'Ученик', true, 'Художники', 1]
        );

        // Добавляем админа
        if (process.env.ADMIN_ID) {
            await dbClient.query(
                `INSERT INTO admins (user_id, username, role) 
                 VALUES ($1, $2, $3) 
                 ON CONFLICT (user_id) DO NOTHING`,
                [process.env.ADMIN_ID, 'admin', 'superadmin']
            );
            console.log('✅ Админ добавлен:', process.env.ADMIN_ID);
        }

        // Добавляем тестовые квизы
        const testQuizzes = [
            {
                title: "🎨 Основы живописи",
                description: "Проверьте свои знания основ живописи",
                questions: JSON.stringify([
                    {
                        question: "Кто написал картину 'Мона Лиза'?",
                        options: ["Винсент Ван Гог", "Леонардо да Винчи", "Пабло Пикассо", "Клод Моне"],
                        correctAnswer: 1
                    },
                    {
                        question: "Какие цвета являются основными?",
                        options: ["Красный, синий, зеленый", "Красный, желтый, синий", "Фиолетовый, оранжевый, зеленый", "Черный, белый, серый"],
                        correctAnswer: 1
                    }
                ]),
                sparks_reward: 2
            }
        ];

        for (const quiz of testQuizzes) {
            await dbClient.query(
                `INSERT INTO quizzes (title, description, questions, sparks_reward) 
                 VALUES ($1, $2, $3, $4) 
                 ON CONFLICT DO NOTHING`,
                [quiz.title, quiz.description, quiz.questions, quiz.sparks_reward]
            );
        }

        console.log('✅ База данных PostgreSQL готова');

    } catch (error) {
        console.error('❌ Ошибка инициализации базы данных:', error);
    }
}

initializeDatabase();

// ==================== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ====================

function calculateLevel(sparks) {
    if (sparks >= 400) return 'Наставник';
    if (sparks >= 300) return 'Мастер';
    if (sparks >= 150) return 'Знаток';
    if (sparks >= 50) return 'Искатель';
    return 'Ученик';
}

async function addSparks(userId, sparks, activityType, description) {
    try {
        await dbClient.query(
            'UPDATE users SET sparks = sparks + $1 WHERE user_id = $2',
            [sparks, userId]
        );
        await dbClient.query(
            'INSERT INTO activities (user_id, activity_type, sparks_earned, description) VALUES ($1, $2, $3, $4)',
            [userId, activityType, sparks, description]
        );
        return true;
    } catch (error) {
        console.error('❌ Error adding sparks:', error);
        return false;
    }
}

// ==================== MIDDLEWARE ====================

const requireAdmin = async (req, res, next) => {
    const userId = req.query.userId || req.body.userId;
    
    if (!userId) {
        return res.status(401).json({ error: 'User ID required' });
    }
    
    try {
        const result = await dbClient.query('SELECT * FROM admins WHERE user_id = $1', [userId]);
        if (result.rows.length === 0) {
            return res.status(403).json({ error: 'Admin access required' });
        }
        req.admin = result.rows[0];
        next();
    } catch (error) {
        return res.status(500).json({ error: 'Database error' });
    }
};

// ==================== BASIC ROUTES ====================

app.get('/health', async (req, res) => {
    try {
        await dbClient.query('SELECT 1');
        res.json({ 
            status: 'OK', 
            timestamp: new Date().toISOString(),
            version: '6.0.0',
            database: 'Connected'
        });
    } catch (error) {
        res.json({ 
            status: 'OK', 
            timestamp: new Date().toISOString(),
            version: '6.0.0', 
            database: 'Disconnected',
            error: error.message
        });
    }
});

app.get('/', (req, res) => {
    res.sendFile(join(__dirname, 'public', 'index.html'));
});

app.get('/admin', (req, res) => {
    res.sendFile(join(__dirname, 'admin', 'index.html'));
});

// ==================== WEBAPP API ====================

// Получение данных пользователя
app.get('/api/users/:userId', async (req, res) => {
    const userId = req.params.userId;
    
    try {
        const result = await dbClient.query(
            `SELECT u.*, c.character_name, c.class, c.available_buttons
             FROM users u 
             LEFT JOIN characters c ON u.character_id = c.id 
             WHERE u.user_id = $1`,
            [userId]
        );
        
        if (result.rows.length > 0) {
            const user = result.rows[0];
            user.level = calculateLevel(user.sparks);
            user.available_buttons = JSON.parse(user.available_buttons || '[]');
            
            // Проверяем ежедневный бонус за комментарий
            const today = new Date().toDateString();
            const lastCommentDate = user.daily_commented ? new Date(user.last_active).toDateString() : null;
            user.can_comment_today = today !== lastCommentDate;
            
            res.json({ exists: true, user });
        } else {
            // Создаем нового пользователя
            await dbClient.query(
                `INSERT INTO users (user_id, tg_first_name, sparks, level) VALUES ($1, $2, $3, $4)`,
                [userId, 'Новый пользователь', 0, 'Ученик']
            );
            
            res.json({ 
                exists: false, 
                user: {
                    user_id: parseInt(userId),
                    sparks: 0,
                    level: 'Ученик',
                    is_registered: false,
                    class: null,
                    character_name: null,
                    tg_first_name: 'Новый пользователь',
                    available_buttons: [],
                    can_comment_today: true
                }
            });
        }
    } catch (error) {
        console.error('❌ Database error:', error);
        res.status(500).json({ error: 'Database error' });
    }
});

// Регистрация пользователя
app.post('/api/users/register', async (req, res) => {
    const { userId, userClass, characterId, tgUsername, tgFirstName } = req.body;
    
    console.log('📝 Регистрация пользователя:', { userId, userClass, characterId });
    
    if (!userId || !userClass || !characterId) {
        return res.status(400).json({ error: 'User ID, class and character are required' });
    }
    
    try {
        // Проверяем существование пользователя
        const userCheck = await dbClient.query('SELECT * FROM users WHERE user_id = $1', [userId]);
        const isNewUser = userCheck.rows.length === 0;
        
        await dbClient.query(
            `INSERT INTO users (user_id, tg_username, tg_first_name, class, character_id, is_registered, sparks)
             VALUES ($1, $2, $3, $4, $5, TRUE, COALESCE((SELECT sparks FROM users WHERE user_id = $1), 0))
             ON CONFLICT (user_id) DO UPDATE SET
             tg_username = EXCLUDED.tg_username,
             tg_first_name = EXCLUDED.tg_first_name,
             class = EXCLUDED.class,
             character_id = EXCLUDED.character_id,
             is_registered = TRUE`,
            [userId, tgUsername, tgFirstName, userClass, characterId]
        );
        
        let message = 'Регистрация успешна!';
        let sparksAdded = 0;
        
        if (isNewUser) {
            sparksAdded = 5;
            await addSparks(userId, sparksAdded, 'registration', 'Регистрация в приложении');
            message = 'Регистрация успешна! +5✨';
        }
        
        res.json({ 
            success: true, 
            message: message,
            sparksAdded: sparksAdded
        });
    } catch (error) {
        console.error('❌ Error saving user:', error);
        res.status(500).json({ error: 'Error saving user' });
    }
});

// Получение классов
app.get('/api/webapp/classes', (req, res) => {
    const classes = [
        { id: 'Художники', name: '🎨 Художники', description: 'Творцы изобразительного искусства', icon: '🎨' },
        { id: 'Стилисты', name: '👗 Стилисты', description: 'Мастера создания образов', icon: '👗' },
        { id: 'Мастера', name: '🧵 Мастера', description: 'Ремесленники прикладного искусства', icon: '🧵' },
        { id: 'Историки', name: '🏛️ Историки искусства', description: 'Знатоки истории искусств', icon: '🏛️' }
    ];
    res.json(classes);
});

// Получение персонажей
app.get('/api/webapp/characters', async (req, res) => {
    try {
        const result = await dbClient.query('SELECT * FROM characters WHERE is_active = TRUE ORDER BY class, character_name');
        
        const grouped = {};
        result.rows.forEach(char => {
            if (!grouped[char.class]) grouped[char.class] = [];
            grouped[char.class].push({
                ...char,
                available_buttons: JSON.parse(char.available_buttons || '[]')
            });
        });
        
        res.json(grouped);
    } catch (error) {
        res.status(500).json({ error: 'Database error' });
    }
});

// Получение квизов
app.get('/api/webapp/quizzes', async (req, res) => {
    const userId = req.query.userId;
    
    try {
        const result = await dbClient.query("SELECT * FROM quizzes WHERE is_active = TRUE ORDER BY created_at DESC");
        
        const parsedQuizzes = result.rows.map(quiz => ({
            ...quiz,
            questions: JSON.parse(quiz.questions)
        }));
        
        if (userId) {
            const completionsResult = await dbClient.query('SELECT quiz_id, completed_at FROM quiz_completions WHERE user_id = $1', [userId]);
            const quizzesWithStatus = parsedQuizzes.map(quiz => {
                const completion = completionsResult.rows.find(c => c.quiz_id === quiz.id);
                return {
                    ...quiz,
                    completed: !!completion,
                    can_retake: true
                };
            });
            res.json(quizzesWithStatus);
        } else {
            res.json(parsedQuizzes);
        }
    } catch (error) {
        res.status(500).json({ error: 'Database error' });
    }
});

// Прохождение квиза
app.post('/api/webapp/quizzes/:quizId/submit', async (req, res) => {
    const { quizId } = req.params;
    const { userId, answers } = req.body;
    
    console.log(`📝 Прохождение квиза ${quizId} пользователем ${userId}`);
    
    if (!userId) {
        return res.status(400).json({ error: 'User ID is required' });
    }
    
    try {
        const quizResult = await dbClient.query("SELECT * FROM quizzes WHERE id = $1", [quizId]);
        if (quizResult.rows.length === 0) {
            return res.status(404).json({ error: 'Quiz not found' });
        }
        
        const quiz = quizResult.rows[0];
        const questions = JSON.parse(quiz.questions);
        let correctAnswers = 0;
        
        questions.forEach((question, index) => {
            if (answers[index] === question.correctAnswer) {
                correctAnswers++;
            }
        });
        
        // НОВАЯ СИСТЕМА НАЧИСЛЕНИЯ ИСКР
        let sparksEarned = 0;
        const perfectScore = correctAnswers === questions.length;
        
        // За каждый правильный ответ
        sparksEarned += correctAnswers * SPARKS_SYSTEM.QUIZ_PER_CORRECT_ANSWER;
        
        // Бонус за идеальное прохождение
        if (perfectScore) {
            sparksEarned += SPARKS_SYSTEM.QUIZ_PERFECT_BONUS;
        }
        
        // Сохраняем результат
        await dbClient.query(
            `INSERT INTO quiz_completions (user_id, quiz_id, score, sparks_earned, perfect_score) 
             VALUES ($1, $2, $3, $4, $5) 
             ON CONFLICT (user_id, quiz_id) DO UPDATE SET
             completed_at = CURRENT_TIMESTAMP, score = EXCLUDED.score, sparks_earned = EXCLUDED.sparks_earned, perfect_score = EXCLUDED.perfect_score`,
            [userId, quizId, correctAnswers, sparksEarned, perfectScore]
        );
        
        // Обновляем искры пользователя
        if (sparksEarned > 0) {
            await addSparks(userId, sparksEarned, 'quiz', `Квиз: ${quiz.title} (${correctAnswers}/${questions.length} правильных)`);
        }
        
        res.json({
            success: true,
            correctAnswers,
            totalQuestions: questions.length,
            scorePercentage: Math.round((correctAnswers / questions.length) * 100),
            sparksEarned,
            perfectScore,
            passed: correctAnswers > 0,
            message: perfectScore ? 
                `Идеально! 🎉 +${sparksEarned}✨ (${correctAnswers} правильных + бонус)` : 
                `Правильно: ${correctAnswers}/${questions.length}. +${sparksEarned}✨`
        });
    } catch (error) {
        res.status(500).json({ error: 'Database error' });
    }
});

// Магазин - получение товаров
app.get('/api/webapp/shop/items', async (req, res) => {
    try {
        const result = await dbClient.query("SELECT * FROM shop_items WHERE is_active = TRUE ORDER BY price ASC");
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: 'Database error' });
    }
});

// Покупка товара
app.post('/api/webapp/shop/purchase', async (req, res) => {
    const { userId, itemId } = req.body;
    
    if (!userId || !itemId) {
        return res.status(400).json({ error: 'User ID and item ID are required' });
    }
    
    try {
        // Получаем данные пользователя и товара
        const userResult = await dbClient.query("SELECT sparks FROM users WHERE user_id = $1", [userId]);
        if (userResult.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        const itemResult = await dbClient.query("SELECT * FROM shop_items WHERE id = $1 AND is_active = TRUE", [itemId]);
        if (itemResult.rows.length === 0) {
            return res.status(404).json({ error: 'Item not found' });
        }
        
        const user = userResult.rows[0];
        const item = itemResult.rows[0];
        
        if (user.sparks < item.price) {
            return res.status(400).json({ error: 'Недостаточно искр' });
        }
        
        // Совершаем покупку
        await dbClient.query("UPDATE users SET sparks = sparks - $1 WHERE user_id = $2", [item.price, userId]);
        await dbClient.query(
            "INSERT INTO purchases (user_id, item_id, price_paid, content_delivered) VALUES ($1, $2, $3, $4)",
            [userId, itemId, item.price, true]
        );
        await dbClient.query(
            "INSERT INTO activities (user_id, activity_type, sparks_earned, description) VALUES ($1, $2, $3, $4)",
            [userId, 'purchase', -item.price, `Покупка: ${item.title}`]
        );
        
        const newBalanceResult = await dbClient.query("SELECT sparks FROM users WHERE user_id = $1", [userId]);
        
        res.json({
            success: true,
            message: `Покупка успешна! Куплено: ${item.title}`,
            remainingSparks: newBalanceResult.rows[0].sparks,
            purchasedItem: {
                title: item.title,
                description: item.description,
                type: item.type,
                content: item.content_text || item.file_url,
                purchasedAt: new Date().toISOString()
            }
        });
    } catch (error) {
        res.status(500).json({ error: 'Database error' });
    }
});

// Получение купленных товаров пользователя
app.get('/api/webapp/users/:userId/purchases', async (req, res) => {
    const userId = req.params.userId;
    
    try {
        const result = await dbClient.query(
            `SELECT p.*, si.title, si.description, si.type, si.content_text, si.file_url
             FROM purchases p
             JOIN shop_items si ON p.item_id = si.id
             WHERE p.user_id = $1
             ORDER BY p.purchased_at DESC`,
            [userId]
        );
        
        res.json({ purchases: result.rows });
    } catch (error) {
        res.status(500).json({ error: 'Database error' });
    }
});

// Активности пользователя
app.get('/api/webapp/users/:userId/activities', async (req, res) => {
    const userId = req.params.userId;
    
    try {
        const result = await dbClient.query(
            `SELECT * FROM activities WHERE user_id = $1 ORDER BY created_at DESC LIMIT 20`,
            [userId]
        );
        res.json({ activities: result.rows });
    } catch (error) {
        res.status(500).json({ error: 'Database error' });
    }
});

// ==================== НОВЫЕ API ДЛЯ КОММЕНТАРИЕВ И ОТЗЫВОВ ====================

// Получение постов канала
app.get('/api/webapp/channel-posts', async (req, res) => {
    try {
        const result = await dbClient.query(`
            SELECT cp.*, a.username as admin_username
            FROM channel_posts cp
            LEFT JOIN admins a ON cp.admin_id = a.user_id
            WHERE cp.is_active = TRUE
            ORDER BY cp.created_at DESC
        `);
        
        res.json({ posts: result.rows });
    } catch (error) {
        res.status(500).json({ error: 'Database error' });
    }
});

// Написание отзыва к посту
app.post('/api/webapp/posts/:postId/review', async (req, res) => {
    const { postId } = req.params;
    const { userId, reviewText, rating = 5 } = req.body;
    
    if (!userId || !reviewText) {
        return res.status(400).json({ error: 'User ID and review text are required' });
    }
    
    try {
        // Проверяем существование поста
        const postResult = await dbClient.query('SELECT * FROM channel_posts WHERE post_id = $1', [postId]);
        if (postResult.rows.length === 0) {
            return res.status(404).json({ error: 'Post not found' });
        }
        
        // Проверяем не оставлял ли пользователь уже отзыв к этому посту
        const existingReview = await dbClient.query(
            'SELECT * FROM post_reviews WHERE user_id = $1 AND post_id = $2',
            [userId, postId]
        );
        
        if (existingReview.rows.length > 0) {
            return res.status(400).json({ error: 'Вы уже оставляли отзыв к этому посту' });
        }
        
        // Сохраняем отзыв
        await dbClient.query(
            `INSERT INTO post_reviews (user_id, post_id, review_text, rating, status)
             VALUES ($1, $2, $3, $4, 'pending')`,
            [userId, postId, reviewText, rating]
        );
        
        // Начисляем искры за отзыв
        await addSparks(userId, SPARKS_SYSTEM.WRITE_REVIEW, 'review', `Отзыв к посту`);
        
        res.json({
            success: true,
            message: 'Отзыв отправлен на модерацию! +3✨',
            sparksEarned: SPARKS_SYSTEM.WRITE_REVIEW
        });
        
    } catch (error) {
        res.status(500).json({ error: 'Database error' });
    }
});

// Ежедневный комментарий
app.post('/api/webapp/daily-comment', async (req, res) => {
    const { userId } = req.body;
    
    if (!userId) {
        return res.status(400).json({ error: 'User ID is required' });
    }
    
    try {
        const userResult = await dbClient.query('SELECT * FROM users WHERE user_id = $1', [userId]);
        if (userResult.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        const user = userResult.rows[0];
        const today = new Date().toDateString();
        const lastCommentDate = user.daily_commented ? new Date(user.last_active).toDateString() : null;
        
        if (today === lastCommentDate) {
            return res.status(400).json({ error: 'Вы уже получали бонус за комментарий сегодня' });
        }
        
        // Начисляем бонус
        await addSparks(userId, SPARKS_SYSTEM.DAILY_COMMENT, 'daily_comment', 'Ежедневный комментарий');
        await dbClient.query(
            'UPDATE users SET daily_commented = TRUE, last_active = CURRENT_TIMESTAMP WHERE user_id = $1',
            [userId]
        );
        
        res.json({
            success: true,
            message: 'Бонус за комментарий получен! +1✨',
            sparksEarned: SPARKS_SYSTEM.DAILY_COMMENT
        });
        
    } catch (error) {
        res.status(500).json({ error: 'Database error' });
    }
});

// Приглашение друга
app.post('/api/webapp/invite-friend', async (req, res) => {
    const { inviterId, invitedId } = req.body;
    
    if (!inviterId || !invitedId) {
        return res.status(400).json({ error: 'Inviter and invited user IDs are required' });
    }
    
    try {
        // Проверяем не приглашал ли уже этот пользователь
        const existingInvite = await dbClient.query(
            'SELECT * FROM user_invites WHERE inviter_id = $1 AND invited_id = $2',
            [inviterId, invitedId]
        );
        
        if (existingInvite.rows.length > 0) {
            return res.status(400).json({ error: 'Вы уже приглашали этого пользователя' });
        }
        
        // Создаем запись о приглашении
        const inviteCode = `invite_${inviterId}_${Date.now()}`;
        await dbClient.query(
            'INSERT INTO user_invites (inviter_id, invited_id, invite_code, completed) VALUES ($1, $2, $3, TRUE)',
            [inviterId, invitedId, inviteCode]
        );
        
        // Начисляем искры за приглашение
        await addSparks(inviterId, SPARKS_SYSTEM.INVITE_FRIEND, 'invite', 'Приглашение друга');
        
        res.json({
            success: true,
            message: 'Друг приглашен! +10✨',
            sparksEarned: SPARKS_SYSTEM.INVITE_FRIEND
        });
        
    } catch (error) {
        res.status(500).json({ error: 'Database error' });
    }
});

// ==================== ADMIN API ====================

// Статистика
app.get('/api/admin/stats', requireAdmin, async (req, res) => {
    try {
        const [
            usersResult,
            quizzesResult,
            charactersResult,
            shopItemsResult,
            sparksResult,
            adminsResult,
            postsResult,
            reviewsResult
        ] = await Promise.all([
            dbClient.query('SELECT COUNT(*) as count FROM users'),
            dbClient.query('SELECT COUNT(*) as count FROM quizzes WHERE is_active = TRUE'),
            dbClient.query('SELECT COUNT(*) as count FROM characters WHERE is_active = TRUE'),
            dbClient.query('SELECT COUNT(*) as count FROM shop_items WHERE is_active = TRUE'),
            dbClient.query('SELECT SUM(sparks) as total FROM users'),
            dbClient.query('SELECT COUNT(*) as count FROM admins'),
            dbClient.query('SELECT COUNT(*) as count FROM channel_posts WHERE is_active = TRUE'),
            dbClient.query('SELECT COUNT(*) as count FROM post_reviews WHERE status = $1', ['pending'])
        ]);

        res.json({
            totalUsers: parseInt(usersResult.rows[0].count),
            activeQuizzes: parseInt(quizzesResult.rows[0].count),
            activeCharacters: parseInt(charactersResult.rows[0].count),
            shopItems: parseInt(shopItemsResult.rows[0].count),
            totalSparks: parseFloat(sparksResult.rows[0].total) || 0,
            totalAdmins: parseInt(adminsResult.rows[0].count),
            totalPosts: parseInt(postsResult.rows[0].count),
            pendingReviews: parseInt(reviewsResult.rows[0].count),
            activeToday: parseInt(usersResult.rows[0].count),
            totalPosts: 0,
            pendingModeration: parseInt(reviewsResult.rows[0].count),
            registeredToday: 0
        });
    } catch (error) {
        res.status(500).json({ error: 'Database error' });
    }
});

// Управление магазином - создание товара
app.post('/api/admin/shop/items', requireAdmin, async (req, res) => {
    const { title, description, type, file_url, preview_url, price, content_text, is_active } = req.body;
    
    console.log('🛒 Создание товара:', title);
    
    if (!title || !price) {
        return res.status(400).json({ error: 'Title and price are required' });
    }
    
    try {
        const result = await dbClient.query(
            `INSERT INTO shop_items (title, description, type, file_url, preview_url, price, content_text, is_active) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
            [title, description, type || 'video', file_url, preview_url, price, content_text, is_active !== false]
        );
        
        res.json({
            success: true,
            message: 'Товар успешно создан',
            itemId: result.rows[0].id
        });
    } catch (error) {
        console.error('❌ Error creating item:', error);
        res.status(500).json({ error: 'Error creating item' });
    }
});

// Управление постами канала
app.get('/api/admin/channel-posts', requireAdmin, async (req, res) => {
    try {
        const result = await dbClient.query(`
            SELECT cp.*, a.username as admin_username,
                   (SELECT COUNT(*) FROM post_reviews pr WHERE pr.post_id = cp.post_id) as reviews_count
            FROM channel_posts cp
            LEFT JOIN admins a ON cp.admin_id = a.user_id
            ORDER BY cp.created_at DESC
        `);
        res.json({ posts: result.rows });
    } catch (error) {
        res.status(500).json({ error: 'Database error' });
    }
});

app.post('/api/admin/channel-posts', requireAdmin, async (req, res) => {
    const { post_id, title, content, image_url } = req.body;
    const adminId = req.admin.user_id;
    
    if (!post_id || !title) {
        return res.status(400).json({ error: 'Post ID and title are required' });
    }
    
    try {
        await dbClient.query(
            `INSERT INTO channel_posts (post_id, title, content, image_url, admin_id) 
             VALUES ($1, $2, $3, $4, $5) 
             ON CONFLICT (post_id) DO UPDATE SET
             title = EXCLUDED.title, content = EXCLUDED.content, image_url = EXCLUDED.image_url`,
            [post_id, title, content, image_url, adminId]
        );
        
        res.json({
            success: true,
            message: 'Пост успешно сохранен'
        });
    } catch (error) {
        res.status(500).json({ error: 'Database error' });
    }
});

// Модерация отзывов
app.get('/api/admin/reviews', requireAdmin, async (req, res) => {
    const { status = 'pending' } = req.query;
    
    try {
        const result = await dbClient.query(`
            SELECT pr.*, u.tg_first_name, u.tg_username, cp.title as post_title
            FROM post_reviews pr
            JOIN users u ON pr.user_id = u.user_id
            JOIN channel_posts cp ON pr.post_id = cp.post_id
            WHERE pr.status = $1
            ORDER BY pr.created_at DESC
        `, [status]);
        
        res.json({ reviews: result.rows });
    } catch (error) {
        res.status(500).json({ error: 'Database error' });
    }
});

app.post('/api/admin/reviews/:reviewId/moderate', requireAdmin, async (req, res) => {
    const { reviewId } = req.params;
    const { status, admin_comment } = req.body;
    const moderatorId = req.admin.user_id;
    
    if (!['approved', 'rejected'].includes(status)) {
        return res.status(400).json({ error: 'Invalid status' });
    }
    
    try {
        await dbClient.query(
            `UPDATE post_reviews 
             SET status = $1, admin_comment = $2, moderator_id = $3, moderated_at = CURRENT_TIMESTAMP 
             WHERE id = $4`,
            [status, admin_comment, moderatorId, reviewId]
        );
        
        res.json({
            success: true,
            message: `Отзыв ${status === 'approved' ? 'одобрен' : 'отклонен'}`
        });
    } catch (error) {
        res.status(500).json({ error: 'Database error' });
    }
});

// Управление опросами
app.get('/api/admin/polls', requireAdmin, async (req, res) => {
    try {
        const result = await dbClient.query(`
            SELECT p.*, a.username as creator_username,
                   (SELECT COUNT(*) FROM poll_participants pp WHERE pp.poll_id = p.id) as participants_count
            FROM polls p
            LEFT JOIN admins a ON p.created_by = a.user_id
            ORDER BY p.created_at DESC
        `);
        
        const polls = result.rows.map(poll => ({
            ...poll,
            options: JSON.parse(poll.options || '[]')
        }));
        
        res.json({ polls });
    } catch (error) {
        res.status(500).json({ error: 'Database error' });
    }
});

app.post('/api/admin/polls', requireAdmin, async (req, res) => {
    const { title, description, options } = req.body;
    const createdBy = req.admin.user_id;
    
    if (!title || !options || !Array.isArray(options)) {
        return res.status(400).json({ error: 'Title and options array are required' });
    }
    
    try {
        const optionsJson = JSON.stringify(options);
        const result = await dbClient.query(
            `INSERT INTO polls (title, description, options, created_by) 
             VALUES ($1, $2, $3, $4) RETURNING id`,
            [title, description, optionsJson, createdBy]
        );
        
        res.json({
            success: true,
            message: 'Опрос создан',
            pollId: result.rows[0].id
        });
    } catch (error) {
        res.status(500).json({ error: 'Database error' });
    }
});

// Управление марафонами
app.get('/api/admin/marathons', requireAdmin, async (req, res) => {
    try {
        const result = await dbClient.query(`
            SELECT m.*, 
                   (SELECT COUNT(*) FROM marathon_participants mp WHERE mp.marathon_id = m.id) as participants_count
            FROM marathons m
            ORDER BY m.created_at DESC
        `);
        res.json({ marathons: result.rows });
    } catch (error) {
        res.status(500).json({ error: 'Database error' });
    }
});

app.post('/api/admin/marathons', requireAdmin, async (req, res) => {
    const { title, description, start_date, end_date, reward_sparks } = req.body;
    
    if (!title || !start_date || !end_date) {
        return res.status(400).json({ error: 'Title, start date and end date are required' });
    }
    
    try {
        const result = await dbClient.query(
            `INSERT INTO marathons (title, description, start_date, end_date, reward_sparks) 
             VALUES ($1, $2, $3, $4, $5) RETURNING id`,
            [title, description, start_date, end_date, reward_sparks || SPARKS_SYSTEM.PARTICIPATE_MARATHON]
        );
        
        res.json({
            success: true,
            message: 'Марафон создан',
            marathonId: result.rows[0].id
        });
    } catch (error) {
        res.status(500).json({ error: 'Database error' });
    }
});

// ==================== TELEGRAM BOT ====================

let bot;
try {
    bot = new TelegramBot(process.env.BOT_TOKEN, { 
        polling: true,
        request: {
            agentOptions: {
                keepAlive: true,
                family: 4
            }
        }
    });
    
    console.log('✅ Telegram Bot инициализирован с токеном:', process.env.BOT_TOKEN);
    
    // Обработчик команды /start
    bot.onText(/\/start/, (msg) => {
        const chatId = msg.chat.id;
        const name = msg.from.first_name || 'Друг';
        
        const welcomeText = `🎨 Привет, ${name}!

Добро пожаловать в **Мастерская Вдохновения**!

✨ Откройте личный кабинет чтобы:
• 🎯 Проходить квизы и получать искры
• 👥 Выбрать своего персонажа  
• 🛒 Покупать обучающие материалы
• 📊 Отслеживать свой прогресс
• 💬 Оставлять отзывы к постам
• 👥 Приглашать друзей

Нажмите кнопку ниже чтобы начать!`;
        
        const keyboard = {
            inline_keyboard: [[
                {
                    text: "📱 Открыть Личный Кабинет",
                    web_app: { url: process.env.APP_URL || `https://sergeynikishin555123123-lab-tg-inspirationn-bot-3c3e.twc1.net` }
                }
            ]]
        };

        bot.sendMessage(chatId, welcomeText, {
            parse_mode: 'Markdown',
            reply_markup: keyboard
        }).catch(err => {
            console.error('❌ Ошибка отправки сообщения:', err.message);
        });
    });

    // Обработчик команды /admin
    bot.onText(/\/admin/, (msg) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id;
        
        dbClient.query('SELECT * FROM admins WHERE user_id = $1', [userId])
            .then(result => {
                if (result.rows.length === 0) {
                    bot.sendMessage(chatId, '❌ У вас нет прав доступа к админ панели.').catch(console.error);
                    return;
                }
                
                const admin = result.rows[0];
                const adminUrl = `${process.env.APP_URL || 'https://sergeynikishin555123123-lab-tg-inspirationn-bot-3c3e.twc1.net'}/admin?userId=${userId}`;
                bot.sendMessage(chatId, 
                    `🔧 Панель администратора\n\nДоступ: ${admin.role}\n\n${adminUrl}`
                ).catch(console.error);
            })
            .catch(console.error);
    });

    // Обработчик ошибок бота
    bot.on('polling_error', (error) => {
        console.error('❌ Polling error:', error.message);
    });

    console.log('🤖 Бот готов к работе!');
    
} catch (error) {
    console.error('❌ Ошибка инициализации бота:', error.message);
    console.log('🚫 Бот отключен, но веб-приложение продолжает работать');
}

// ==================== SERVER START ====================

const PORT = process.env.PORT || 3000;

app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Сервер запущен на порту ${PORT}`);
    console.log(`📱 Mini App: ${process.env.APP_URL || `http://localhost:${PORT}`}`);
    console.log(`🔧 Admin Panel: ${process.env.APP_URL || `http://localhost:${PORT}`}/admin`);
    console.log(`🤖 Bot Token: ${process.env.BOT_TOKEN ? '✅ Настроен' : '❌ Отсутствует'}`);
    console.log(`🗄️ Database: PostgreSQL TimeWeb`);
    console.log(`✨ Новая система искр активирована`);
    console.log('✅ Все системы работают');
}).on('error', (err) => {
    console.error('❌ Server error:', err);
});
