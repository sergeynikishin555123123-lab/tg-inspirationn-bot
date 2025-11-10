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

// In-memory база данных
let db = {
    users: [
        {
            id: 1,
            user_id: 12345,
            tg_first_name: 'Тестовый Пользователь',
            sparks: 25.5,
            level: 'Ученик',
            is_registered: true,
            class: 'Художники',
            character_id: 1,
            character_name: 'Лука Цветной',
            available_buttons: ['quiz', 'shop', 'activities', 'invite']
        }
    ],
    characters: [
        { id: 1, class: 'Художники', character_name: 'Лука Цветной', description: 'Рисует с детства, любит эксперименты с цветом', bonus_type: 'percent_bonus', bonus_value: '10', is_active: true },
        { id: 2, class: 'Художники', character_name: 'Марина Кисть', description: 'Строгая преподавательница академической живописи', bonus_type: 'forgiveness', bonus_value: '1', is_active: true },
        { id: 3, class: 'Художники', character_name: 'Феликс Штрих', description: 'Экспериментатор, мастер зарисовок', bonus_type: 'random_gift', bonus_value: '1-3', is_active: true },
        { id: 4, class: 'Стилисты', character_name: 'Эстелла Моде', description: 'Бывший стилист, обучает восприятию образа', bonus_type: 'percent_bonus', bonus_value: '5', is_active: true },
        { id: 5, class: 'Стилисты', character_name: 'Роза Ателье', description: 'Мастер практического шитья', bonus_type: 'secret_advice', bonus_value: '2weeks', is_active: true },
        { id: 6, class: 'Стилисты', character_name: 'Гертруда Линия', description: 'Ценит детали и аксессуары', bonus_type: 'series_bonus', bonus_value: '1', is_active: true },
        { id: 7, class: 'Мастера', character_name: 'Тихон Творец', description: 'Ремесленник, любит простые техники', bonus_type: 'photo_bonus', bonus_value: '1', is_active: true },
        { id: 8, class: 'Мастера', character_name: 'Агата Узор', description: 'Любит неожиданные материалы', bonus_type: 'weekly_surprise', bonus_value: '6', is_active: true },
        { id: 9, class: 'Мастера', character_name: 'Борис Клей', description: 'Весёлый мастер импровизаций', bonus_type: 'mini_quest', bonus_value: '2', is_active: true },
        { id: 10, class: 'Историки', character_name: 'Профессор Артёмий', description: 'Любитель архивов и фактов', bonus_type: 'quiz_hint', bonus_value: '1', is_active: true },
        { id: 11, class: 'Историки', character_name: 'Соня Гравюра', description: 'Рассказывает истории картин', bonus_type: 'fact_star', bonus_value: '1', is_active: true },
        { id: 12, class: 'Историки', character_name: 'Михаил Эпоха', description: 'Любит хронологию и эпохи', bonus_type: 'streak_multiplier', bonus_value: '2', is_active: true }
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
            sparks_reward: 2,
            is_active: true
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
            content_text: "В этом уроке вы научитесь основам работы с акварелью, смешиванию цветов и созданию первых работ. Продолжительность: 45 минут.",
            is_active: true
        },
        {
            id: 2,
            title: "📚 Гайд по композиции",
            description: "PDF руководство по построению гармоничной композиции",
            type: "pdf",
            file_url: "https://example.com/composition-guide.pdf",
            preview_url: "https://via.placeholder.com/300x200/48bb78/ffffff?text=Композиция",
            price: 10,
            content_text: null,
            is_active: true
        }
    ],
    activities: [],
    admins: [
        { id: 1, user_id: 898508164, username: 'admin', role: 'superadmin' }
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
            is_active: true
        }
    ],
    post_reviews: []
};

app.use(express.json({ limit: '50mb' }));
app.use(cors());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(join(__dirname, 'public')));
app.use('/admin', express.static(join(__dirname, 'admin')));

console.log('🎨 Мастерская Вдохновения - Запуск...');

// Система начисления искр
const SPARKS_SYSTEM = {
    QUIZ_PER_CORRECT_ANSWER: 1,
    QUIZ_PERFECT_BONUS: 5,
    DAILY_COMMENT: 1,
    INVITE_FRIEND: 10,
    WRITE_REVIEW: 3
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
        db.activities.push({
            id: Date.now(),
            user_id: userId,
            activity_type: activityType,
            sparks_earned: sparks,
            description: description,
            created_at: new Date().toISOString()
        });
        return true;
    }
    return false;
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
        database: 'In-Memory'
    });
});

// WebApp API
app.get('/api/users/:userId', (req, res) => {
    const userId = parseInt(req.params.userId);
    const user = db.users.find(u => u.user_id === userId);
    
    if (user) {
        user.level = calculateLevel(user.sparks);
        user.available_buttons = user.available_buttons || [];
        res.json({ exists: true, user });
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
            available_buttons: []
        };
        db.users.push(newUser);
        res.json({ exists: false, user: newUser });
    }
});

app.post('/api/users/register', (req, res) => {
    const { userId, userClass, characterId, tgUsername, tgFirstName } = req.body;
    
    if (!userId || !userClass || !characterId) {
        return res.status(400).json({ error: 'User ID, class and character are required' });
    }
    
    const user = db.users.find(u => u.user_id == userId);
    const character = db.characters.find(c => c.id == characterId);
    
    if (!user || !character) {
        return res.status(404).json({ error: 'User or character not found' });
    }
    
    const isNewUser = !user.is_registered;
    
    user.tg_username = tgUsername;
    user.tg_first_name = tgFirstName;
    user.class = userClass;
    user.character_id = characterId;
    user.character_name = character.character_name;
    user.is_registered = true;
    user.available_buttons = ['quiz', 'shop', 'activities', 'invite'];
    
    let message = 'Регистрация успешна!';
    let sparksAdded = 0;
    
    if (isNewUser) {
        sparksAdded = 5;
        addSparks(userId, sparksAdded, 'registration', 'Регистрация');
        message = 'Регистрация успешна! +5✨';
    }
    
    res.json({ success: true, message, sparksAdded });
});

app.get('/api/webapp/classes', (req, res) => {
    const classes = [
        { id: 'Художники', name: '🎨 Художники', description: 'Творцы изобразительного искусства', icon: '🎨' },
        { id: 'Стилисты', name: '👗 Стилисты', description: 'Мастера создания образов', icon: '👗' },
        { id: 'Мастера', name: '🧵 Мастера', description: 'Ремесленники прикладного искусства', icon: '🧵' },
        { id: 'Историки', name: '🏛️ Историки искусства', description: 'Знатоки истории искусств', icon: '🏛️' }
    ];
    res.json(classes);
});

app.get('/api/webapp/characters', (req, res) => {
    const grouped = {};
    db.characters
        .filter(char => char.is_active)
        .forEach(char => {
            if (!grouped[char.class]) grouped[char.class] = [];
            grouped[char.class].push(char);
        });
    res.json(grouped);
});

app.get('/api/webapp/quizzes', (req, res) => {
    const quizzes = db.quizzes.filter(q => q.is_active);
    const quizzesWithStatus = quizzes.map(quiz => ({
        ...quiz,
        completed: false,
        can_retake: true
    }));
    res.json(quizzesWithStatus);
});

app.post('/api/webapp/quizzes/:quizId/submit', (req, res) => {
    const quizId = parseInt(req.params.quizId);
    const { userId, answers } = req.body;
    
    if (!userId) {
        return res.status(400).json({ error: 'User ID is required' });
    }
    
    const quiz = db.quizzes.find(q => q.id === quizId);
    if (!quiz) {
        return res.status(404).json({ error: 'Quiz not found' });
    }
    
    let correctAnswers = 0;
    quiz.questions.forEach((question, index) => {
        if (answers[index] === question.correctAnswer) {
            correctAnswers++;
        }
    });
    
    let sparksEarned = 0;
    const perfectScore = correctAnswers === quiz.questions.length;
    
    sparksEarned += correctAnswers * SPARKS_SYSTEM.QUIZ_PER_CORRECT_ANSWER;
    
    if (perfectScore) {
        sparksEarned += SPARKS_SYSTEM.QUIZ_PERFECT_BONUS;
    }
    
    if (sparksEarned > 0) {
        addSparks(userId, sparksEarned, 'quiz', `Квиз: ${quiz.title}`);
    }
    
    res.json({
        success: true,
        correctAnswers,
        totalQuestions: quiz.questions.length,
        sparksEarned,
        perfectScore,
        message: perfectScore ? 
            `Идеально! 🎉 +${sparksEarned}✨` : 
            `Правильно: ${correctAnswers}/${quiz.questions.length}. +${sparksEarned}✨`
    });
});

app.get('/api/webapp/shop/items', (req, res) => {
    const items = db.shop_items.filter(item => item.is_active);
    res.json(items);
});

app.post('/api/webapp/shop/purchase', (req, res) => {
    const { userId, itemId } = req.body;
    
    if (!userId || !itemId) {
        return res.status(400).json({ error: 'User ID and item ID are required' });
    }
    
    const user = db.users.find(u => u.user_id == userId);
    const item = db.shop_items.find(i => i.id == itemId && i.is_active);
    
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (!item) return res.status(404).json({ error: 'Item not found' });
    if (user.sparks < item.price) return res.status(400).json({ error: 'Недостаточно искр' });
    
    user.sparks -= item.price;
    
    db.purchases.push({
        id: Date.now(),
        user_id: userId,
        item_id: itemId,
        price_paid: item.price,
        purchased_at: new Date().toISOString()
    });
    
    db.activities.push({
        id: Date.now(),
        user_id: userId,
        activity_type: 'purchase',
        sparks_earned: -item.price,
        description: `Покупка: ${item.title}`,
        created_at: new Date().toISOString()
    });
    
    res.json({
        success: true,
        message: `Покупка успешна! Куплено: ${item.title}`,
        remainingSparks: user.sparks
    });
});

app.get('/api/webapp/users/:userId/purchases', (req, res) => {
    const userId = parseInt(req.params.userId);
    const userPurchases = db.purchases
        .filter(p => p.user_id === userId)
        .map(purchase => {
            const item = db.shop_items.find(i => i.id === purchase.item_id);
            return { ...purchase, ...item };
        });
    res.json({ purchases: userPurchases });
});

app.get('/api/webapp/users/:userId/activities', (req, res) => {
    const userId = parseInt(req.params.userId);
    const userActivities = db.activities
        .filter(a => a.user_id === userId)
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .slice(0, 20);
    res.json({ activities: userActivities });
});

// Admin API
app.get('/api/admin/stats', requireAdmin, (req, res) => {
    const stats = {
        totalUsers: db.users.length,
        activeQuizzes: db.quizzes.filter(q => q.is_active).length,
        activeCharacters: db.characters.filter(c => c.is_active).length,
        shopItems: db.shop_items.filter(i => i.is_active).length,
        totalSparks: db.users.reduce((sum, user) => sum + user.sparks, 0),
        totalAdmins: db.admins.length
    };
    res.json(stats);
});

app.get('/api/admin/shop/items', requireAdmin, (req, res) => {
    res.json(db.shop_items);
});

app.post('/api/admin/shop/items', requireAdmin, (req, res) => {
    const { title, description, type, file_url, preview_url, price, content_text } = req.body;
    
    if (!title || !price) {
        return res.status(400).json({ error: 'Title and price are required' });
    }
    
    const newItem = {
        id: Date.now(),
        title,
        description: description || '',
        type: type || 'video',
        file_url: file_url || '',
        preview_url: preview_url || '',
        price: parseFloat(price),
        content_text: content_text || '',
        is_active: true
    };
    
    db.shop_items.push(newItem);
    
    res.json({ success: true, message: 'Товар успешно создан', itemId: newItem.id });
});

// Telegram Bot
let bot;
if (process.env.BOT_TOKEN) {
    try {
        bot = new TelegramBot(process.env.BOT_TOKEN, { polling: true });
        
        console.log('✅ Telegram Bot инициализирован');
        
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
            
            const adminUrl = `${process.env.APP_URL || 'https://your-domain.timeweb.cloud'}/admin?userId=${userId}`;
            bot.sendMessage(chatId, `🔧 Панель администратора\n\n${adminUrl}`);
        });

    } catch (error) {
        console.error('❌ Ошибка инициализации бота:', error);
    }
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Сервер запущен на порту ${PORT}`);
    console.log(`📱 WebApp: http://localhost:${PORT}`);
    console.log(`🔧 Admin: http://localhost:${PORT}/admin`);
    console.log('✅ Все системы работают!');
});
