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
        }
    ],
    characters: [
        { id: 1, role_id: 1, name: 'Лука Цветной', description: 'Рисует с детства, любит эксперименты с цветом', bonus_type: 'percent_bonus', bonus_value: '10', is_active: true }
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
                }
            ],
            sparks_reward: 5,
            cooldown_hours: 24,
            is_active: true,
            created_at: new Date().toISOString()
        }
    ],
    admins: [
        { id: 1, user_id: 898508164, username: 'admin', role: 'superadmin', created_at: new Date().toISOString() }
    ]
};

app.use(express.json({ limit: '50mb' }));
app.use(cors());
app.use(bodyParser.urlencoded({ extended: true }));

// === ИСПРАВЛЕННЫЕ СТАТИЧЕСКИЕ ПУТИ ===
app.use(express.static(join(__dirname, 'public')));
app.use('/admin', express.static(join(__dirname, 'admin'), { 
    index: 'index.html',
    extensions: ['html']
}));

// Основной маршрут
app.get('/', (req, res) => {
    res.sendFile(join(__dirname, 'public', 'index.html'));
});

// Админ панель
app.get('/admin', (req, res) => {
    res.sendFile(join(__dirname, 'admin', 'index.html'));
});

// Все остальные маршруты для админки
app.get('/admin/*', (req, res) => {
    res.sendFile(join(__dirname, 'admin', 'index.html'));
});

// Health check
app.get('/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        adminPath: join(__dirname, 'admin'),
        publicPath: join(__dirname, 'public')
    });
});

// Debug маршрут для проверки путей
app.get('/debug-paths', (req, res) => {
    const fs = require('fs');
    
    const paths = {
        __dirname: __dirname,
        adminPath: join(__dirname, 'admin'),
        publicPath: join(__dirname, 'public'),
        adminIndexExists: fs.existsSync(join(__dirname, 'admin', 'index.html')),
        publicIndexExists: fs.existsSync(join(__dirname, 'public', 'index.html')),
        filesInAdmin: fs.readdirSync(join(__dirname, 'admin')),
        filesInPublic: fs.readdirSync(join(__dirname, 'public'))
    };
    
    res.json(paths);
});

// Basic API routes
app.get('/api/users/:userId', (req, res) => {
    const userId = parseInt(req.params.userId);
    const user = db.users.find(u => u.user_id === userId);
    
    if (user) {
        res.json({ exists: true, user });
    } else {
        res.json({ exists: false });
    }
});

// Telegram Bot
if (process.env.BOT_TOKEN) {
    try {
        const bot = new TelegramBot(process.env.BOT_TOKEN, { polling: true });
        
        bot.onText(/\/start/, (msg) => {
            const chatId = msg.chat.id;
            const name = msg.from.first_name;
            
            const keyboard = {
                inline_keyboard: [[
                    {
                        text: "📱 Открыть Личный Кабинет",
                        web_app: { url: process.env.APP_URL }
                    }
                ]]
            };

            bot.sendMessage(chatId, `🎨 Привет, ${name}!\n\nОткройте личный кабинет:`, {
                reply_markup: keyboard
            });
        });

        bot.onText(/\/admin/, (msg) => {
            const chatId = msg.chat.id;
            const userId = msg.from.id;
            
            const adminUrl = `${process.env.APP_URL}/admin?userId=${userId}`;
            const keyboard = {
                inline_keyboard: [[
                    {
                        text: "🔧 Открыть Админ Панель",
                        url: adminUrl
                    }
                ]]
            };
            
            bot.sendMessage(chatId, `Админ панель:`, {
                reply_markup: keyboard
            });
        });

        console.log('✅ Telegram Bot инициализирован');
    } catch (error) {
        console.error('❌ Ошибка бота:', error);
    }
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Сервер запущен на порту ${PORT}`);
    console.log(`📱 WebApp: ${process.env.APP_URL}`);
    console.log(`🔧 Admin: ${process.env.APP_URL}/admin`);
    console.log(`🔍 Debug: ${process.env.APP_URL}/debug-paths`);
});
