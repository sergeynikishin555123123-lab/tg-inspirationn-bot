import express from 'express';
import TelegramBot from 'node-telegram-bot-api';
import cors from 'cors';
import bodyParser from 'body-parser';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();

// ==================== КРИТИЧЕСКИ ВАЖНО: Определяем корневую папку ====================
const APP_ROOT = (() => {
    const possibleRoots = [
        '/app', // TimeWeb Cloud
        __dirname, // Локальная разработка
        process.cwd() // Альтернативный путь
    ];
    
    const fs = require('fs');
    for (const root of possibleRoots) {
        const testPath = join(root, 'admin', 'index.html');
        if (fs.existsSync(testPath)) {
            console.log('✅ Найдена корневая папка:', root);
            return root;
        }
    }
    
    console.log('⚠️ Корневая папка не найдена, используем __dirname');
    return __dirname;
})();

console.log('🔍 Информация о путях:');
console.log('   __dirname:', __dirname);
console.log('   APP_ROOT:', APP_ROOT);
console.log('   Admin path:', join(APP_ROOT, 'admin', 'index.html'));

// In-memory база данных с новой структурой
let db = {
    users: [
        {
            id: 1,
            user_id: 12345,
            tg_first_name: 'Тестовый Пользователь',
            tg_username: 'test_user',
            sparks: 25.5,
            level: 'Ученик',
            is_registered: true,
            class: 'Художники',
            character_id: 1,
            character_name: 'Лука Цветной',
            available_buttons: ['quiz', 'marathon', 'works', 'activities', 'posts', 'shop', 'invite'],
            registration_date: new Date().toISOString(),
            last_active: new Date().toISOString()
        }
    ],
    roles: [
        {
            id: 1,
            name: 'Художники',
            description: 'Творцы изобразительного искусства',
            icon: '🎨',
            available_buttons: ['quiz', 'marathon', 'works', 'activities', 'posts', 'shop', 'invite'],
            is_active: true
        },
        {
            id: 2,
            name: 'Стилисты',
            description: 'Мастера создания образов',
            icon: '👗',
            available_buttons: ['quiz', 'marathon', 'works', 'activities', 'posts', 'shop', 'invite'],
            is_active: true
        },
        {
            id: 3,
            name: 'Мастера',
            description: 'Ремесленники прикладного искусства',
            icon: '🧵',
            available_buttons: ['quiz', 'marathon', 'works', 'activities', 'posts', 'shop', 'invite'],
            is_active: true
        },
        {
            id: 4,
            name: 'Историки',
            description: 'Знатоки истории искусств',
            icon: '🏛️',
            available_buttons: ['quiz', 'marathon', 'works', 'activities', 'posts', 'shop', 'invite'],
            is_active: true
        }
    ],
    characters: [
        { id: 1, role_id: 1, name: 'Лука Цветной', description: 'Рисует с детства, любит эксперименты с цветом', bonus_type: 'percent_bonus', bonus_value: '10', is_active: true },
        { id: 2, role_id: 1, name: 'Марина Кисть', description: 'Строгая преподавательница академической живописи', bonus_type: 'forgiveness', bonus_value: '1', is_active: true },
        { id: 3, role_id: 1, name: 'Феликс Штрих', description: 'Экспериментатор, мастер зарисовок', bonus_type: 'random_gift', bonus_value: '1-3', is_active: true },
        { id: 4, role_id: 2, name: 'Эстелла Моде', description: 'Бывший стилист, обучает восприятию образа', bonus_type: 'percent_bonus', bonus_value: '5', is_active: true },
        { id: 5, role_id: 2, name: 'Роза Ателье', description: 'Мастер практического шитья', bonus_type: 'secret_advice', bonus_value: '2weeks', is_active: true },
        { id: 6, role_id: 2, name: 'Гертруда Линия', description: 'Ценит детали и аксессуары', bonus_type: 'series_bonus', bonus_value: '1', is_active: true }
    ],
    quizzes: [
        {
            id: 1,
            title: "🎨 Основы живописи",
            description: "Проверьте свои знания основ живописи",
            questions: [
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
            ],
            sparks_reward: 5,
            cooldown_hours: 24,
            is_active: true,
            created_at: new Date().toISOString()
        }
    ],
    marathons: [
        {
            id: 1,
            title: "🏃‍♂️ Марафон акварели",
            description: "7-дневный марафон по основам акварельной живописи",
            duration_days: 7,
            tasks: [
                { day: 1, title: "Основные техники", description: "Изучите основные техники работы с акварелью" },
                { day: 2, title: "Смешивание цветов", description: "Практикуйтесь в смешивании цветов" }
            ],
            sparks_reward: 50,
            is_active: true,
            created_at: new Date().toISOString()
        }
    ],
    shop_items: [
        {
            id: 1,
            title: "🎨 Урок акварели для начинающих",
            description: "Полный видеоурок по основам акварельной живописи",
            type: "video",
            file_url: "https://example.com/watercolor-course.mp4",
            preview_url: "https://via.placeholder.com/300x200/667eea/ffffff?text=Акварель",
            price: 15,
            content_text: "В этом уроке вы научитесь основам работы с акварелью, смешиванию цветов и созданию первых работ.",
            is_active: true,
            created_at: new Date().toISOString()
        }
    ],
    activities: [],
    admins: [
        { id: 1, user_id: 898508164, username: 'admin', role: 'superadmin', created_at: new Date().toISOString() }
    ],
    purchases: [],
    channel_posts: [
        {
            id: 1,
            post_id: "post_art_basics",
            title: "🎨 Основы композиции в живописи",
            content: "Сегодня поговорим о фундаментальных принципах построения композиции. Золотое сечение, правило третей и многое другое!",
            image_url: "https://via.placeholder.com/400x300/764ba2/ffffff?text=Композиция",
            admin_id: 898508164,
            is_active: true,
            created_at: new Date().toISOString()
        }
    ],
    post_reviews: [],
    user_works: [],
    work_reviews: [],
    marathon_completions: [],
    quiz_completions: []
};

app.use(express.json({ limit: '50mb' }));
app.use(cors());
app.use(bodyParser.urlencoded({ extended: true }));

// ==================== СТАТИЧЕСКИЕ ФАЙЛЫ С ПРАВИЛЬНЫМИ ПУТЯМИ ====================
app.use(express.static(join(APP_ROOT, 'public')));
app.use('/admin', express.static(join(APP_ROOT, 'admin')));

// ==================== ОСНОВНЫЕ МАРШРУТЫ ====================
app.get('/', (req, res) => {
    res.sendFile(join(APP_ROOT, 'public', 'index.html'));
});

app.get('/admin', (req, res) => {
    res.sendFile(join(APP_ROOT, 'admin', 'index.html'));
});

app.get('/admin/*', (req, res) => {
    res.sendFile(join(APP_ROOT, 'admin', 'index.html'));
});

// ==================== ДИАГНОСТИЧЕСКИЕ МАРШРУТЫ ====================
app.get('/debug-paths', (req, res) => {
    const fs = require('fs');
    
    const paths = {
        APP_ROOT: APP_ROOT,
        __dirname: __dirname,
        process_cwd: process.cwd(),
        admin: {
            path: join(APP_ROOT, 'admin'),
            exists: fs.existsSync(join(APP_ROOT, 'admin')),
            files: fs.existsSync(join(APP_ROOT, 'admin')) ? fs.readdirSync(join(APP_ROOT, 'admin')) : []
        },
        public: {
            path: join(APP_ROOT, 'public'),
            exists: fs.existsSync(join(APP_ROOT, 'public')),
            files: fs.existsSync(join(APP_ROOT, 'public')) ? fs.readdirSync(join(APP_ROOT, 'public')) : []
        },
        admin_index: {
            path: join(APP_ROOT, 'admin', 'index.html'),
            exists: fs.existsSync(join(APP_ROOT, 'admin', 'index.html'))
        },
        public_index: {
            path: join(APP_ROOT, 'public', 'index.html'),
            exists: fs.existsSync(join(APP_ROOT, 'public', 'index.html'))
        }
    };
    
    res.json(paths);
});

app.get('/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        app_root: APP_ROOT,
        environment: process.env.NODE_ENV || 'development'
    });
});

console.log('🎨 Мастерская Вдохновения - Запуск...');

// Система начисления искр - ИСПРАВЛЕНА
const SPARKS_SYSTEM = {
    QUIZ_PER_CORRECT_ANSWER: 1,
    QUIZ_PERFECT_BONUS: 5,
    MARATHON_DAY_COMPLETION: 5,
    MARATHON_COMPLETION: 20,
    INVITE_FRIEND: 10,
    WRITE_REVIEW: 3,
    UPLOAD_WORK: 5,
    WORK_APPROVED: 15,
    REGISTRATION_BONUS: 10
};

// Вспомогательные функции
function calculateLevel(sparks) {
    if (sparks >= 400) return 'Наставник';
    if (sparks >= 300) return 'Мастер';
    if (sparks >= 150) return 'Знаток';
    if (sparks >= 50) return 'Искатель';
    return 'Ученик';
}

function addSparks(userId, sparks, activityType, description) {
    const user = db.users.find(u => u.user_id == userId);
    if (user) {
        user.sparks += sparks;
        user.level = calculateLevel(user.sparks);
        user.last_active = new Date().toISOString();
        
        const activity = {
            id: Date.now(),
            user_id: userId,
            activity_type: activityType,
            sparks_earned: sparks,
            description: description,
            created_at: new Date().toISOString()
        };
        
        db.activities.push(activity);
        return activity;
    }
    return null;
}

function getUserStats(userId) {
    const user = db.users.find(u => u.user_id == userId);
    if (!user) return null;
    
    const activities = db.activities.filter(a => a.user_id == userId);
    const purchases = db.purchases.filter(p => p.user_id == userId);
    const works = db.user_works.filter(w => w.user_id == userId);
    const quizCompletions = db.quiz_completions.filter(q => q.user_id == userId);
    const marathonCompletions = db.marathon_completions.filter(m => m.user_id == userId);
    
    return {
        totalActivities: activities.length,
        totalPurchases: purchases.length,
        totalWorks: works.length,
        approvedWorks: works.filter(w => w.status === 'approved').length,
        totalQuizzesCompleted: quizCompletions.length,
        totalMarathonsCompleted: marathonCompletions.filter(m => m.completed).length,
        totalSparksEarned: activities.reduce((sum, a) => sum + a.sparks_earned, 0)
    };
}

// Middleware
const requireAdmin = (req, res, next) => {
    const userId = req.query.userId || req.body.userId;
    
    if (!userId) {
        return res.status(401).json({ error: 'User ID required' });
    }
    
    const admin = db.admins.find(a => a.user_id == userId);
    if (!admin) {
        return res.status(403).json({ error: 'Admin access required' });
    }
    
    req.admin = admin;
    next();
};

// Basic routes
app.get('/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        database: 'In-Memory',
        users: db.users.length,
        quizzes: db.quizzes.length,
        marathons: db.marathons.length,
        shop_items: db.shop_items.length
    });
});

// WebApp API
app.get('/api/users/:userId', (req, res) => {
    const userId = parseInt(req.params.userId);
    const user = db.users.find(u => u.user_id === userId);
    
    if (user) {
        const stats = getUserStats(userId);
        res.json({ 
            exists: true, 
            user: {
                ...user,
                stats: stats
            }
        });
    } else {
        const newUser = {
            id: Date.now(),
            user_id: userId,
            tg_first_name: 'Новый пользователь',
            sparks: 0,
            level: 'Ученик',
            is_registered: false,
            class: null,
            character_id: null,
            character_name: null,
            available_buttons: [],
            registration_date: new Date().toISOString(),
            last_active: new Date().toISOString()
        };
        db.users.push(newUser);
        res.json({ 
            exists: false, 
            user: newUser 
        });
    }
});

app.post('/api/users/register', (req, res) => {
    const { userId, firstName, roleId, characterId } = req.body;
    
    if (!userId || !firstName || !roleId) {
        return res.status(400).json({ error: 'User ID, first name and role are required' });
    }
    
    const user = db.users.find(u => u.user_id == userId);
    const role = db.roles.find(r => r.id == roleId);
    const character = db.characters.find(c => c.id == characterId);
    
    if (!user || !role) {
        return res.status(404).json({ error: 'User or role not found' });
    }
    
    const isNewUser = !user.is_registered;
    
    user.tg_first_name = firstName;
    user.class = role.name;
    user.character_id = characterId;
    user.character_name = character ? character.name : null;
    user.is_registered = true;
    user.available_buttons = role.available_buttons;
    user.last_active = new Date().toISOString();
    
    let message = 'Регистрация успешна!';
    let sparksAdded = 0;
    
    if (isNewUser) {
        sparksAdded = SPARKS_SYSTEM.REGISTRATION_BONUS;
        addSparks(userId, sparksAdded, 'registration', 'Регистрация');
        message = `Регистрация успешна! +${sparksAdded}✨`;
    }
    
    res.json({ 
        success: true, 
        message, 
        sparksAdded,
        user: user
    });
});

app.get('/api/webapp/roles', (req, res) => {
    const roles = db.roles.filter(role => role.is_active);
    res.json(roles);
});

app.get('/api/webapp/characters/:roleId', (req, res) => {
    const roleId = parseInt(req.params.roleId);
    const characters = db.characters.filter(char => char.role_id === roleId && char.is_active);
    res.json(characters);
});

// ... остальные ваши API маршруты остаются без изменений ...

// Telegram Bot
let bot;
if (process.env.BOT_TOKEN) {
    try {
        bot = new TelegramBot(process.env.BOT_TOKEN, { polling: true });
        
        console.log('✅ Telegram Bot инициализирован');
        
        bot.onText(/\/start/, (msg) => {
            const chatId = msg.chat.id;
            const name = msg.from.first_name || 'Друг';
            const userId = msg.from.id;
            
            // Создаем или обновляем пользователя
            let user = db.users.find(u => u.user_id === userId);
            if (!user) {
                user = {
                    id: Date.now(),
                    user_id: userId,
                    tg_first_name: msg.from.first_name,
                    tg_username: msg.from.username,
                    sparks: 0,
                    level: 'Ученик',
                    is_registered: false,
                    class: null,
                    character_id: null,
                    character_name: null,
                    available_buttons: [],
                    registration_date: new Date().toISOString(),
                    last_active: new Date().toISOString()
                };
                db.users.push(user);
            } else {
                user.last_active = new Date().toISOString();
            }
            
            const welcomeText = `🎨 Привет, ${name}!

Добро пожаловать в **Мастерская Вдохновения**!

✨ Откройте личный кабинет чтобы:
• 🎯 Проходить квизы и получать искры
• 🏃‍♂️ Участвовать в марафонах
• 🖼️ Загружать свои работы
• 📊 Отслеживать свой прогресс
• 🛒 Покупать обучающие материалы

Нажмите кнопку ниже чтобы начать!`;
            
            const keyboard = {
                inline_keyboard: [[
                    {
                        text: "📱 Открыть Личный Кабинет",
                        web_app: { url: process.env.APP_URL || `https://your-domain.timeweb.cloud` }
                    }
                ]]
            };

            bot.sendMessage(chatId, welcomeText, {
                parse_mode: 'Markdown',
                reply_markup: keyboard
            });
        });

        bot.onText(/\/admin/, (msg) => {
            const chatId = msg.chat.id;
            const userId = msg.from.id;
            
            const admin = db.admins.find(a => a.user_id == userId);
            if (!admin) {
                bot.sendMessage(chatId, '❌ У вас нет прав доступа к админ панели.');
                return;
            }
            
            const adminUrl = `${process.env.APP_URL}/admin?userId=${userId}`;
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

        bot.onText(/\/debug/, (msg) => {
            const chatId = msg.chat.id;
            const debugUrl = `${process.env.APP_URL}/debug-paths`;
            bot.sendMessage(chatId, `🔍 Debug пути: ${debugUrl}`);
        });

        bot.onText(/\/stats/, (msg) => {
            const chatId = msg.chat.id;
            const userId = msg.from.id;
            
            const admin = db.admins.find(a => a.user_id == userId);
            if (!admin) {
                bot.sendMessage(chatId, '❌ У вас нет прав доступа.');
                return;
            }
            
            const stats = {
                totalUsers: db.users.length,
                registeredUsers: db.users.filter(u => u.is_registered).length,
                activeQuizzes: db.quizzes.filter(q => q.is_active).length,
                activeMarathons: db.marathons.filter(m => m.is_active).length,
                shopItems: db.shop_items.filter(i => i.is_active).length,
                totalSparks: db.users.reduce((sum, user) => sum + user.sparks, 0)
            };
            
            const statsText = `📊 Статистика бота:
            
👥 Пользователи: ${stats.totalUsers}
✅ Зарегистрировано: ${stats.registeredUsers}
🎯 Активных квизов: ${stats.activeQuizzes}
🏃‍♂️ Активных марафонов: ${stats.activeMarathons}
🛒 Товаров в магазине: ${stats.shopItems}
✨ Всего искр: ${stats.totalSparks.toFixed(1)}`;
            
            bot.sendMessage(chatId, statsText);
        });

    } catch (error) {
        console.error('❌ Ошибка инициализации бота:', error);
    }
}

const PORT = process.env.PORT || 3000;

function startServer(port) {
    const server = app.listen(port, '0.0.0.0', () => {
        console.log(`🚀 Сервер запущен на порту ${port}`);
        console.log(`📱 WebApp: ${process.env.APP_URL || `http://localhost:${port}`}`);
        console.log(`🔧 Admin: ${process.env.APP_URL || `http://localhost:${port}`}/admin`);
        console.log(`🔍 Debug: ${process.env.APP_URL || `http://localhost:${port}`}/debug-paths`);
        console.log(`🎯 Квизов: ${db.quizzes.length}`);
        console.log(`🏃‍♂️ Марафонов: ${db.marathons.length}`);
        console.log(`🛒 Товаров: ${db.shop_items.length}`);
        console.log(`👥 Пользователей: ${db.users.length}`);
        console.log('✅ Все системы работают!');
    });

    server.on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
            console.log(`⚠️ Порт ${port} занят, пробуем порт ${port + 1}`);
            startServer(port + 1);
        } else {
            console.error('❌ Ошибка сервера:', err);
        }
    });
}

startServer(PORT);
