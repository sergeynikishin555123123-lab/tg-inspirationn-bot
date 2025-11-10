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
const db = new Client({
    host: '789badf9748826d5c6ffd045.twc1.net',
    port: 5432,
    database: 'default_db',
    user: 'gen_user',
    password: process.env.DB_PASSWORD, // Добавьте в переменные окружения
    ssl: {
        rejectUnauthorized: true,
        ca: process.env.DB_SSL_CERT // Для продакшена
    }
});

// Для разработки - отключаем SSL проверку
const dbDev = new Client({
    host: '789badf9748826d5c6ffd045.twc1.net',
    port: 5432,
    database: 'default_db',
    user: 'gen_user',
    password: process.env.DB_PASSWORD,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: true } : false
});

let dbClient = process.env.NODE_ENV === 'production' ? db : dbDev;

app.use(express.json({ limit: '50mb' }));
app.use(cors());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(join(__dirname, 'public')));
app.use('/admin', express.static(join(__dirname, 'admin')));

console.log('🎨 Мастерская Вдохновения - Запуск PostgreSQL версии...');

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
                purchased_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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

        // Добавляем тестовые товары
        await dbClient.query(
            `INSERT INTO shop_items (title, description, type, file_url, preview_url, price) 
             VALUES ($1, $2, $3, $4, $5, $6) 
             ON CONFLICT DO NOTHING`,
            ['🎨 Урок акварели', 'Видеоурок по основам акварели', 'video', 'https://example.com/video1.mp4', 'https://example.com/preview1.jpg', 15]
        );

        console.log('✅ База данных PostgreSQL готова');

    } catch (error) {
        console.error('❌ Ошибка инициализации базы данных:', error);
        // Продолжаем работу даже при ошибке БД
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
        // Проверяем подключение к БД
        await dbClient.query('SELECT 1');
        res.json({ 
            status: 'OK', 
            timestamp: new Date().toISOString(),
            version: '5.0.0',
            database: 'Connected'
        });
    } catch (error) {
        res.json({ 
            status: 'OK', 
            timestamp: new Date().toISOString(),
            version: '5.0.0', 
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
                    available_buttons: []
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
            await dbClient.query('UPDATE users SET sparks = sparks + $1 WHERE user_id = $2', [sparksAdded, userId]);
            await dbClient.query(
                'INSERT INTO activities (user_id, activity_type, sparks_earned, description) VALUES ($1, $2, $3, $4)',
                [userId, 'registration', sparksAdded, 'Регистрация']
            );
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
        
        const scorePercentage = (correctAnswers / questions.length) * 100;
        const sparksEarned = scorePercentage >= 60 ? quiz.sparks_reward : 0;
        
        // Сохраняем результат
        await dbClient.query(
            `INSERT INTO quiz_completions (user_id, quiz_id, score, sparks_earned) 
             VALUES ($1, $2, $3, $4) 
             ON CONFLICT (user_id, quiz_id) DO UPDATE SET
             completed_at = CURRENT_TIMESTAMP, score = EXCLUDED.score, sparks_earned = EXCLUDED.sparks_earned`,
            [userId, quizId, correctAnswers, sparksEarned]
        );
        
        // Обновляем искры пользователя
        if (sparksEarned > 0) {
            await dbClient.query('UPDATE users SET sparks = sparks + $1 WHERE user_id = $2', [sparksEarned, userId]);
            await dbClient.query(
                'INSERT INTO activities (user_id, activity_type, sparks_earned, description) VALUES ($1, $2, $3, $4)',
                [userId, 'quiz', sparksEarned, `Квиз: ${quiz.title}`]
            );
        }
        
        res.json({
            success: true,
            correctAnswers,
            totalQuestions: questions.length,
            scorePercentage: Math.round(scorePercentage),
            sparksEarned,
            passed: sparksEarned > 0,
            message: sparksEarned > 0 ? 
                `Поздравляем! Вы получили ${sparksEarned}✨ (${correctAnswers}/${questions.length})` : 
                `Попробуйте еще раз! Правильно: ${correctAnswers}/${questions.length}`
        });
    } catch (error) {
        res.status(500).json({ error: 'Database error' });
    }
});

// Магазин
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
        await dbClient.query("INSERT INTO purchases (user_id, item_id, price_paid) VALUES ($1, $2, $3)", [userId, itemId, item.price]);
        await dbClient.query(
            "INSERT INTO activities (user_id, activity_type, sparks_earned, description) VALUES ($1, $2, $3, $4)",
            [userId, 'purchase', -item.price, `Покупка: ${item.title}`]
        );
        
        const newBalanceResult = await dbClient.query("SELECT sparks FROM users WHERE user_id = $1", [userId]);
        
        res.json({
            success: true,
            message: `Покупка успешна! Куплено: ${item.title}`,
            remainingSparks: newBalanceResult.rows[0].sparks
        });
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
            adminsResult
        ] = await Promise.all([
            dbClient.query('SELECT COUNT(*) as count FROM users'),
            dbClient.query('SELECT COUNT(*) as count FROM quizzes WHERE is_active = TRUE'),
            dbClient.query('SELECT COUNT(*) as count FROM characters WHERE is_active = TRUE'),
            dbClient.query('SELECT COUNT(*) as count FROM shop_items WHERE is_active = TRUE'),
            dbClient.query('SELECT SUM(sparks) as total FROM users'),
            dbClient.query('SELECT COUNT(*) as count FROM admins')
        ]);

        res.json({
            totalUsers: parseInt(usersResult.rows[0].count),
            activeQuizzes: parseInt(quizzesResult.rows[0].count),
            activeCharacters: parseInt(charactersResult.rows[0].count),
            shopItems: parseInt(shopItemsResult.rows[0].count),
            totalSparks: parseFloat(sparksResult.rows[0].total) || 0,
            totalAdmins: parseInt(adminsResult.rows[0].count),
            activeToday: parseInt(usersResult.rows[0].count),
            totalPosts: 0,
            pendingModeration: 0,
            registeredToday: 0
        });
    } catch (error) {
        res.status(500).json({ error: 'Database error' });
    }
});

// Управление персонажами
app.get('/api/admin/characters', requireAdmin, async (req, res) => {
    try {
        const result = await dbClient.query("SELECT * FROM characters ORDER BY class, character_name");
        
        const parsed = result.rows.map(char => ({
            ...char,
            available_buttons: JSON.parse(char.available_buttons || '[]')
        }));
        
        res.json(parsed);
    } catch (error) {
        res.status(500).json({ error: 'Database error' });
    }
});

app.post('/api/admin/characters', requireAdmin, async (req, res) => {
    const { class: charClass, character_name, description, bonus_type, bonus_value, available_buttons } = req.body;
    
    console.log('👥 Добавление персонажа:', { charClass, character_name });
    
    if (!charClass || !character_name || !bonus_type || !bonus_value) {
        return res.status(400).json({ error: 'Все обязательные поля должны быть заполнены' });
    }
    
    const buttonsJson = JSON.stringify(available_buttons || ['quiz', 'activities']);
    
    try {
        const result = await dbClient.query(
            `INSERT INTO characters (class, character_name, description, bonus_type, bonus_value, available_buttons) 
             VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
            [charClass, character_name, description, bonus_type, bonus_value, buttonsJson]
        );
        
        res.json({
            success: true,
            message: 'Персонаж успешно создан',
            characterId: result.rows[0].id
        });
    } catch (error) {
        console.error('❌ Error creating character:', error);
        res.status(500).json({ error: 'Error creating character' });
    }
});

app.put('/api/admin/characters/:id', requireAdmin, async (req, res) => {
    const { id } = req.params;
    const { class: charClass, character_name, description, bonus_type, bonus_value, available_buttons, is_active } = req.body;
    
    const buttonsJson = JSON.stringify(available_buttons || []);
    
    try {
        await dbClient.query(
            `UPDATE characters SET class=$1, character_name=$2, description=$3, bonus_type=$4, bonus_value=$5, available_buttons=$6, is_active=$7 WHERE id=$8`,
            [charClass, character_name, description, bonus_type, bonus_value, buttonsJson, is_active, id]
        );
        
        res.json({
            success: true,
            message: 'Персонаж успешно обновлен'
        });
    } catch (error) {
        res.status(500).json({ error: 'Database error' });
    }
});

app.delete('/api/admin/characters/:id', requireAdmin, async (req, res) => {
    const { id } = req.params;
    
    try {
        await dbClient.query(`DELETE FROM characters WHERE id = $1`, [id]);
        
        res.json({
            success: true,
            message: 'Персонаж удален'
        });
    } catch (error) {
        res.status(500).json({ error: 'Database error' });
    }
});

// Управление квизами
app.get('/api/admin/quizzes', requireAdmin, async (req, res) => {
    try {
        const result = await dbClient.query("SELECT * FROM quizzes ORDER BY created_at DESC");
        
        const parsed = result.rows.map(quiz => ({
            ...quiz,
            questions: JSON.parse(quiz.questions || '[]')
        }));
        
        res.json(parsed);
    } catch (error) {
        res.status(500).json({ error: 'Database error' });
    }
});

app.post('/api/admin/quizzes', requireAdmin, async (req, res) => {
    const { title, description, questions, sparks_reward, cooldown_hours, is_active } = req.body;
    
    console.log('🎯 Создание квиза:', title);
    
    if (!title || !questions) {
        return res.status(400).json({ error: 'Title and questions are required' });
    }
    
    const questionsJson = JSON.stringify(questions);
    
    try {
        const result = await dbClient.query(
            `INSERT INTO quizzes (title, description, questions, sparks_reward, cooldown_hours, is_active) 
             VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
            [title, description, questionsJson, sparks_reward || 1, cooldown_hours || 24, is_active !== false]
        );
        
        res.json({
            success: true,
            message: 'Квиз успешно создан',
            quizId: result.rows[0].id
        });
    } catch (error) {
        console.error('❌ Error creating quiz:', error);
        res.status(500).json({ error: 'Error creating quiz' });
    }
});

app.delete('/api/admin/quizzes/:id', requireAdmin, async (req, res) => {
    const { id } = req.params;
    
    try {
        await dbClient.query(`DELETE FROM quizzes WHERE id = $1`, [id]);
        
        res.json({
            success: true,
            message: 'Квиз удален'
        });
    } catch (error) {
        res.status(500).json({ error: 'Database error' });
    }
});

// Управление товарами
app.get('/api/admin/shop/items', requireAdmin, async (req, res) => {
    try {
        const result = await dbClient.query("SELECT * FROM shop_items ORDER BY created_at DESC");
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: 'Database error' });
    }
});

app.post('/api/admin/shop/items', requireAdmin, async (req, res) => {
    const { title, description, type, file_url, preview_url, price, is_active } = req.body;
    
    console.log('🛒 Создание товара:', title);
    
    if (!title || !price) {
        return res.status(400).json({ error: 'Title and price are required' });
    }
    
    try {
        const result = await dbClient.query(
            `INSERT INTO shop_items (title, description, type, file_url, preview_url, price, is_active) 
             VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
            [title, description, type || 'video', file_url, preview_url, price, is_active !== false]
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

app.delete('/api/admin/shop/items/:id', requireAdmin, async (req, res) => {
    const { id } = req.params;
    
    try {
        await dbClient.query(`DELETE FROM shop_items WHERE id = $1`, [id]);
        
        res.json({
            success: true,
            message: 'Товар удален'
        });
    } catch (error) {
        res.status(500).json({ error: 'Database error' });
    }
});

// Управление админами
app.get('/api/admin/admins', requireAdmin, async (req, res) => {
    try {
        const result = await dbClient.query("SELECT * FROM admins ORDER BY role, user_id");
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: 'Database error' });
    }
});

app.post('/api/admin/admins', requireAdmin, async (req, res) => {
    const { user_id, username, role } = req.body;
    
    console.log('🔧 Добавление админа:', { user_id, username, role });
    
    if (!user_id) {
        return res.status(400).json({ error: 'User ID is required' });
    }
    
    try {
        await dbClient.query(
            `INSERT INTO admins (user_id, username, role) VALUES ($1, $2, $3) 
             ON CONFLICT (user_id) DO UPDATE SET username = EXCLUDED.username, role = EXCLUDED.role`,
            [user_id, username, role || 'moderator']
        );
        
        res.json({
            success: true,
            message: 'Админ успешно добавлен'
        });
    } catch (error) {
        console.error('❌ Error adding admin:', error);
        res.status(500).json({ error: 'Error adding admin' });
    }
});

app.delete('/api/admin/admins/:userId', requireAdmin, async (req, res) => {
    const { userId } = req.params;
    
    if (userId == req.admin.user_id) {
        return res.status(400).json({ error: 'Нельзя удалить самого себя' });
    }
    
    try {
        await dbClient.query(`DELETE FROM admins WHERE user_id = $1`, [userId]);
        
        res.json({
            success: true,
            message: 'Админ удален'
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
    console.log('✅ Все системы работают');
}).on('error', (err) => {
    console.error('❌ Server error:', err);
});
