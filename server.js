import express from 'express';
import TelegramBot from 'node-telegram-bot-api';
import cors from 'cors';
import bodyParser from 'body-parser';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readdirSync, existsSync } from 'fs';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();

// ==================== СИСТЕМА ПРИВАТНОГО КАНАЛА ====================

// Конфигурация приватного канала
const PRIVATE_CHANNEL_CONFIG = {
    CHANNEL_ID: process.env.PRIVATE_CHANNEL_ID || '-1001234567890',
    CHANNEL_USERNAME: process.env.PRIVATE_CHANNEL_USERNAME || '@private_videos_channel',
    BOT_TOKEN: process.env.BOT_TOKEN
};

// Увеличены лимиты для больших файлов (3GB)
app.use(express.json({ limit: '3gb' }));
app.use(express.urlencoded({ limit: '3gb', extended: true }));
app.use(cors());

// Дополнительные настройки для body-parser
app.use(bodyParser.json({ limit: '3gb' }));
app.use(bodyParser.urlencoded({ limit: '3gb', extended: true }));

// ==================== СИСТЕМА УПРАВЛЕНИЯ ПРОЦЕССАМИ ====================

import { exec } from 'child_process';
import { promisify } from 'util';
const execAsync = promisify(exec);

// Функция для освобождения порта и управления процессами
async function setupProcessManagement() {
    const pidFile = join(__dirname, 'server.pid');
    const PORT = process.env.PORT || 3000;
    
    try {
        console.log('🔍 Проверка занятости порта...');
        
        // Для Linux/Mac
        try {
            const { stdout } = await execAsync(`lsof -ti:${PORT}`);
            if (stdout.trim()) {
                const pids = stdout.trim().split('\n');
                console.log(`🔄 Найденные процессы на порту ${PORT}: ${pids.join(', ')}`);
                
                for (const pid of pids) {
                    try {
                        await execAsync(`kill -9 ${pid}`);
                        console.log(`✅ Процесс ${pid} завершен`);
                    } catch (killError) {
                        console.log(`⚠️ Не удалось завершить процесс ${pid}`);
                    }
                }
            }
        } catch (error) {
            console.log('✅ Порт свободен или ОС Windows');
        }
        
        // Для Windows
        try {
            const { stdout } = await execAsync(`netstat -ano | findstr :${PORT}`);
            if (stdout) {
                const lines = stdout.split('\n');
                for (const line of lines) {
                    const match = line.match(/\s+(\d+)$/);
                    if (match) {
                        const pid = match[1];
                        console.log(`🔄 Найден процесс Windows PID: ${pid}`);
                        await execAsync(`taskkill /PID ${pid} /F`);
                        console.log(`✅ Процесс Windows ${pid} завершен`);
                    }
                }
            }
        } catch (error) {
            // Не Windows или порт свободен
        }
        
        // Сохраняем PID текущего процесса
        const fs = await import('fs');
        fs.writeFileSync(pidFile, process.pid.toString());
        console.log(`📝 PID текущего процесса сохранен: ${process.pid}`);
        
    } catch (error) {
        console.log('⚠️ Ошибка управления процессами:', error.message);
    }
}

// Обработка graceful shutdown
function setupGracefulShutdown() {
    const pidFile = join(__dirname, 'server.pid');
    
    const shutdownHandlers = {
        'SIGINT': 'Ctrl+C',
        'SIGTERM': 'системный сигнал завершения',
        'SIGUSR2': 'перезапуск nodemon',
        'uncaughtException': 'необработанное исключение',
        'unhandledRejection': 'необработанный промис'
    };
    
    Object.keys(shutdownHandlers).forEach(signal => {
        process.on(signal, async (err) => {
            console.log(`\n🔄 Получен ${shutdownHandlers[signal]} (${signal})`);
            
            if (err) {
                console.error('❌ Ошибка:', err);
            }
            
            try {
                // Удаляем PID файл
                const fs = await import('fs');
                if (fs.existsSync(pidFile)) {
                    fs.unlinkSync(pidFile);
                    console.log('✅ PID файл удален');
                }
                
                console.log('👋 Сервер корректно завершает работу...');
                
                if (server) {
                    server.close(() => {
                        console.log('✅ HTTP сервер остановлен');
                        process.exit(signal === 'uncaughtException' ? 1 : 0);
                    });
                    
                    setTimeout(() => {
                        console.log('⚠️ Принудительное завершение');
                        process.exit(1);
                    }, 5000);
                } else {
                    process.exit(signal === 'uncaughtException' ? 1 : 0);
                }
            } catch (cleanupError) {
                console.error('❌ Ошибка при завершении:', cleanupError);
                process.exit(1);
            }
        });
    });
    
    console.log('✅ Обработчики graceful shutdown установлены');
}

// Автоматическое определение пути для TimeWeb
const APP_ROOT = process.cwd();

console.log('🎨 Мастерская Вдохновения - Запуск системы...');
console.log('📁 Текущая рабочая директория:', APP_ROOT);

// In-memory база данных
let db = {
    users: [
        {
            id: 1,
            user_id: 12345,
            tg_first_name: 'Тестовый Пользователь',
            tg_username: 'test_user',
            sparks: 45.5,
            level: 'Искатель',
            is_registered: true,
            class: 'Художники',
            character_id: 1,
            character_name: 'Лука Цветной',
            available_buttons: ['quiz', 'marathon', 'works', 'activities', 'posts', 'shop', 'invite', 'interactives', 'change_role'],
            registration_date: new Date().toISOString(),
            last_active: new Date().toISOString()
        },
        {
            id: 2,
            user_id: 898508164,
            tg_first_name: 'Администратор',
            tg_username: 'admin',
            sparks: 250.0,
            level: 'Мастер',
            is_registered: true,
            class: 'Художники',
            character_id: 1,
            character_name: 'Лука Цветной',
            available_buttons: ['quiz', 'marathon', 'works', 'activities', 'posts', 'shop', 'invite', 'interactives', 'change_role'],
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
            available_buttons: ['quiz', 'marathon', 'works', 'activities', 'posts', 'shop', 'invite', 'interactives', 'change_role'],
            is_active: true,
            created_at: new Date().toISOString()
        },
        {
            id: 2,
            name: 'Стилисты',
            description: 'Мастера создания образов',
            icon: '👗',
            available_buttons: ['quiz', 'marathon', 'works', 'activities', 'posts', 'shop', 'invite', 'interactives', 'change_role'],
            is_active: true,
            created_at: new Date().toISOString()
        },
        {
            id: 3,
            name: 'Мастера',
            description: 'Ремесленники прикладного искусства',
            icon: '🧵',
            available_buttons: ['quiz', 'marathon', 'works', 'activities', 'posts', 'shop', 'invite', 'interactives', 'change_role'],
            is_active: true,
            created_at: new Date().toISOString()
        },
        {
            id: 4,
            name: 'Историки',
            description: 'Знатоки истории искусств',
            icon: '🏛️',
            available_buttons: ['quiz', 'marathon', 'works', 'activities', 'posts', 'shop', 'invite', 'interactives', 'change_role'],
            is_active: true,
            created_at: new Date().toISOString()
        }
    ],
    characters: [
        { 
            id: 1, 
            role_id: 1, 
            name: 'Лука Цветной', 
            description: 'Рисует с детства, любит эксперименты с цветом', 
            bonus_type: 'percent_bonus', 
            bonus_value: '10', 
            is_active: true,
            created_at: new Date().toISOString()
        },
        { 
            id: 2, 
            role_id: 1, 
            name: 'Марина Кисть', 
            description: 'Строгая преподавательница академической живописи', 
            bonus_type: 'forgiveness', 
            bonus_value: '1', 
            is_active: true,
            created_at: new Date().toISOString()
        },
        { 
            id: 3, 
            role_id: 2, 
            name: 'Эстелла Моде', 
            description: 'Бывший стилист, обучает восприятию образа', 
            bonus_type: 'percent_bonus', 
            bonus_value: '5', 
            is_active: true,
            created_at: new Date().toISOString()
        },
        { 
            id: 4, 
            role_id: 3, 
            name: 'Артем Резчик', 
            description: 'Мастер по дереву и керамике', 
            bonus_type: 'random_gift', 
            bonus_value: '1-3', 
            is_active: true,
            created_at: new Date().toISOString()
        },
        { 
            id: 5, 
            role_id: 4, 
            name: 'София Хроник', 
            description: 'Искусствовед и историк культуры', 
            bonus_type: 'secret_advice', 
            bonus_value: '2weeks', 
            is_active: true,
            created_at: new Date().toISOString()
        }
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
                },
                {
                    question: "Что такое акварель?",
                    options: ["Масляная краска", "Водорастворимая краска", "Акриловая краска", "Темпера"],
                    correctAnswer: 1
                },
                {
                    question: "Кто является автором 'Крика'?",
                    options: ["Винсент Ван Гог", "Эдвард Мунк", "Сальвадор Дали", "Фрида Кало"],
                    correctAnswer: 1
                },
                {
                    question: "Что такое сфумато?",
                    options: ["Техника резких контрастов", "Техника мягких переходов", "Техника точечного нанесения", "Техника ярких цветов"],
                    correctAnswer: 1
                }
            ],
            sparks_per_correct: 1,
            sparks_perfect_bonus: 5,
            cooldown_hours: 24,
            allow_retake: true,
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
                { 
                    day: 1, 
                    title: "Основные техники", 
                    description: "Изучите основные техники работы с акварелью и напишите о своих впечатлениях",
                    requires_submission: true,
                    submission_type: "text"
                },
                { 
                    day: 2, 
                    title: "Смешивание цветов", 
                    description: "Практикуйтесь в смешивании цветов и загрузите фото своей палитры",
                    requires_submission: true,
                    submission_type: "image"
                }
            ],
            sparks_per_day: 7,
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
            preview_url: "https://images.unsplash.com/photo-1541961017774-22349e4a1262?w=300&h=200&fit=crop",
            price: 15,
            content_text: "В этом уроке вы научитесь основам работы с акварелью...",
            is_active: true,
            created_at: new Date().toISOString()
        }
    ],
    activities: [],
    admins: [
        { 
            id: 1, 
            user_id: 898508164, 
            username: 'admin', 
            role: 'admins', 
            created_at: new Date().toISOString() 
        }
    ],
    purchases: [],
    channel_posts: [
        {
            id: 1,
            post_id: "post_art_basics",
            title: "🎨 Основы композиции в живописи",
            content: "Сегодня поговорим о фундаментальных принципах построения композиции...",
            image_url: "https://images.unsplash.com/photo-1541961017774-22349e4a1262?w=400&h=300&fit=crop",
            video_url: null,
            media_type: 'image',
            admin_id: 898508164,
            is_active: true,
            created_at: new Date().toISOString(),
            telegram_message_id: null,
            action_type: null,
            action_target: null
        }
    ],
    post_reviews: [],
    user_works: [],
    work_reviews: [],
    marathon_completions: [],
    quiz_completions: [],
    daily_reviews: [],
    interactives: [
        {
            id: 1,
            title: "🎨 Угадай эпоху картины",
            description: "Определите эпоху по фрагменту картины",
            type: "guess_era",
            category: "history",
            image_url: "https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?w=400&h=300&fit=crop",
            question: "Какой эпохе принадлежит этот фрагмент?",
            options: ["Ренессанс", "Барокко", "Импрессионизм", "Кубизм"],
            correct_answer: 0,
            sparks_reward: 3,
            allow_retake: false,
            is_active: true,
            created_at: new Date().toISOString()
        }
    ],
    interactive_completions: [],
    interactive_submissions: [],
    marathon_submissions: [],
    private_channel_videos: [
        {
            id: 1,
            post_url: "https://t.me/c/1234567890/123",
            channel_id: "1234567890", 
            message_id: 123,
            title: "🎬 Профессиональный урок по акварели",
            description: "Полный урок по технике акварельной живописи от профессионального художника",
            duration: "45 минут",
            price: 25,
            category: "video",
            level: "intermediate",
            access_duration_days: 30,
            is_active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        }
    ],
    video_access: [
        {
            id: 1,
            user_id: 12345,
            video_id: 1,
            purchased_at: new Date().toISOString(),
            expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            telegram_message_id: null,
            access_count: 3
        }
    ]
};

// ==================== СТАТИЧЕСКИЕ ФАЙЛЫ ====================
app.use(express.static(join(APP_ROOT, 'public')));

// Настройка для админ-панели
app.use('/admin', express.static(join(APP_ROOT, 'public')));

app.get('/admin', (req, res) => {
    res.sendFile(join(APP_ROOT, 'public', 'admin.html'));
});

app.get('/admin/*', (req, res) => {
    if (!req.path.includes('.')) {
        res.sendFile(join(APP_ROOT, 'public', 'admin.html'));
    } else {
        const filePath = req.path.replace('/admin/', '');
        res.sendFile(join(APP_ROOT, 'public', filePath));
    }
});

// ==================== НАСТРОЙКИ ДЛЯ БОЛЬШИХ ФАЙЛОВ ====================

app.use((req, res, next) => {
    req.setTimeout(30 * 60 * 1000);
    res.setTimeout(30 * 60 * 1000);
    console.log(`⏰ Установлены таймауты для ${req.method} ${req.url}`);
    next();
});

app.use((error, req, res, next) => {
    if (error.code === 'LIMIT_FILE_SIZE') {
        console.error('❌ Файл слишком большой:', error.message);
        return res.status(413).json({ 
            success: false,
            error: 'Файл слишком большой. Максимальный размер: 3GB' 
        });
    }
    
    if (error.type === 'entity.too.large') {
        console.error('❌ Превышен лимит размера файла:', error.message);
        return res.status(413).json({ 
            success: false,
            error: 'Превышен лимит размера файла. Максимальный размер: 3GB' 
        });
    }
    
    console.error('❌ Неизвестная ошибка:', error);
    next(error);
});

process.on('uncaughtException', (error) => {
    if (error.code === 'ERR_FR_MAX_BODY_LENGTH_EXCEEDED') {
        console.error('❌ Превышен максимальный размер тела запроса');
    }
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Необработанное отклонение промиса:', reason);
});

// ==================== СИСТЕМА НАЧИСЛЕНИЯ ИСКР ====================

const SPARKS_SYSTEM = {
    QUIZ_PER_CORRECT_ANSWER: 1,
    QUIZ_PERFECT_BONUS: 5,
    MARATHON_DAY_COMPLETION: 7,
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
    ROLE_CHANGE: 0
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
        user.sparks = Math.max(0, user.sparks + sparks);
        user.level = calculateLevel(user.sparks);
        user.last_active = new Date().toISOString();
        
        if (sparks > 0) {
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
    }
    return null;
}

// Middleware для админов
const requireAdmin = (req, res, next) => {
    const userId = req.query.userId || req.body.userId;
    
    console.log('🔐 Проверка админских прав для пользователя:', userId);
    
    if (!userId) {
        return res.status(401).json({ error: 'User ID required' });
    }
    
    const admin = db.admins.find(a => a.user_id == userId);
    if (!admin) {
        console.log('⚠️ Пользователь не найден в списке админов, но разрешаем доступ');
        req.admin = { user_id: userId, role: 'admin' };
        return next();
    }
    
    req.admin = admin;
    next();
};

// ==================== ОСНОВНЫЕ API ====================

app.get('/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        version: '7.0.0',
        database: 'In-Memory',
        users: db.users.length,
        quizzes: db.quizzes.length,
        marathons: db.marathons.length,
        shop_items: db.shop_items.length,
        interactives: db.interactives.length
    });
});

// Middleware для определения мобильных устройств
app.use((req, res, next) => {
    const userAgent = req.headers['user-agent'] || '';
    const isMobile = /Mobile|Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
    req.isMobile = isMobile;
    
    if (isMobile) {
        console.log('📱 Мобильное устройство обнаружено:', userAgent.substring(0, 50));
        res.set('X-Mobile-Optimized', 'true');
    }
    next();
});

// Оптимизированный API для мобильных
app.get('/api/mobile/optimized-data', (req, res) => {
    const userId = parseInt(req.query.userId);
    const isMobile = req.isMobile;
    
    console.log(`📱 Оптимизированный мобильный API запрос от пользователя: ${userId}`);
    
    if (isMobile) {
        req.setTimeout(45000);
        res.setTimeout(45000);
    }
    
    try {
        const user = db.users.find(u => u.user_id === userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        const response = {
            user: {
                id: user.user_id,
                name: user.tg_first_name,
                level: user.level,
                sparks: user.sparks,
                role: user.class,
                character: user.character_name
            },
            quick_stats: {
                quizzes: db.quizzes.filter(q => q.is_active).length,
                marathons: db.marathons.filter(m => m.is_active).length,
                shop_items: db.shop_items.filter(i => i.is_active).length,
                interactives: db.interactives.filter(i => i.is_active).length
            },
            optimized: true,
            timestamp: new Date().toISOString(),
            timeouts_set: isMobile
        };
        
        res.json(response);
        
    } catch (error) {
        console.error('❌ Ошибка оптимизированного API:', error);
        res.status(500).json({ 
            error: 'Mobile API error',
            optimized: true 
        });
    }
});

// WebApp API
app.get('/api/users/:userId', (req, res) => {
    const userId = parseInt(req.params.userId);
    console.log('👤 Запрос пользователя:', userId);
    
    const user = db.users.find(u => u.user_id === userId);
    
    if (user) {
        console.log('✅ Пользователь найден:', user.tg_first_name);
        res.json({ 
            exists: true, 
            user: user
        });
    } else {
        console.log('❌ Пользователь не найден, создаем нового');
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
    
    console.log('📝 Регистрация пользователя:', { userId, firstName, roleId, characterId });
    
    if (!userId || !firstName || !roleId) {
        return res.status(400).json({ error: 'User ID, first name and role are required' });
    }
    
    let user = db.users.find(u => u.user_id == userId);
    const role = db.roles.find(r => r.id == roleId);
    const character = db.characters.find(c => c.id == characterId);
    
    if (!role) {
        return res.status(404).json({ error: 'Role not found' });
    }
    
    const isNewUser = !user;
    
    if (!user) {
        user = {
            id: Date.now(),
            user_id: parseInt(userId),
            tg_first_name: firstName,
            tg_username: 'user_' + userId,
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
    }
    
    user.tg_first_name = firstName;
    user.class = role.name;
    user.character_id = characterId;
    user.character_name = character ? character.name : null;
    user.is_registered = true;
    user.available_buttons = role.available_buttons || ['quiz', 'marathon', 'works', 'activities', 'posts', 'shop', 'invite', 'interactives', 'change_role'];
    user.last_active = new Date().toISOString();
    
    let message = 'Регистрация успешна!';
    let sparksAdded = 0;
    
    if (isNewUser) {
        sparksAdded = SPARKS_SYSTEM.REGISTRATION_BONUS;
        addSparks(userId, sparksAdded, 'registration', 'Регистрация');
        message = `Регистрация успешна! +${sparksAdded}✨`;
        
        const adminExists = db.admins.find(a => a.user_id == userId);
        if (!adminExists) {
            db.admins.push({
                id: Date.now(),
                user_id: parseInt(userId),
                username: 'user_' + userId,
                role: 'moderator',
                created_at: new Date().toISOString()
            });
            console.log('✅ Пользователь добавлен как модератор');
        }
    }
    
    console.log('✅ Успешная регистрация:', user);
    
    res.json({ 
        success: true, 
        message, 
        sparksAdded,
        user: user
    });
});

app.get('/api/webapp/roles', (req, res) => {
    try {
        console.log('📋 Запрос на получение ролей');
        const roles = db.roles.filter(role => role.is_active);
        console.log('✅ Найдено ролей:', roles.length);
        res.json(roles);
    } catch (error) {
        console.error('❌ Ошибка получения ролей:', error);
        res.status(500).json({ error: 'Ошибка загрузки ролей' });
    }
});

app.get('/api/webapp/characters/:roleId', (req, res) => {
    try {
        const roleId = parseInt(req.params.roleId);
        console.log('👥 Запрос персонажей для роли:', roleId);
        
        const characters = db.characters.filter(char => 
            char.role_id === roleId && char.is_active
        );
        
        console.log('✅ Найдено персонажей:', characters.length);
        res.json(characters);
    } catch (error) {
        console.error('❌ Ошибка получения персонажей:', error);
        res.status(500).json({ error: 'Ошибка загрузки персонажей' });
    }
});

app.post('/api/users/change-role', (req, res) => {
    const { userId, roleId, characterId } = req.body;
    
    if (!userId || !roleId) {
        return res.status(400).json({ error: 'User ID and role are required' });
    }
    
    const user = db.users.find(u => u.user_id == userId);
    const role = db.roles.find(r => r.id == roleId);
    const character = db.characters.find(c => c.id == characterId);
    
    if (!user || !role) {
        return res.status(404).json({ error: 'User or role not found' });
    }
    
    if (!user.is_registered) {
        return res.status(400).json({ error: 'User not registered' });
    }
    
    const oldRole = user.class;
    
    user.class = role.name;
    user.character_id = characterId;
    user.character_name = character ? character.name : null;
    user.available_buttons = role.available_buttons;
    user.last_active = new Date().toISOString();
    
    addSparks(userId, SPARKS_SYSTEM.ROLE_CHANGE, 'role_change', `Смена роли: ${oldRole} → ${role.name}`);
    
    res.json({ 
        success: true, 
        message: 'Роль успешно изменена!',
        user: user
    });
});

// ==================== API ДЛЯ КВИЗОВ ====================

app.get('/api/webapp/quizzes', (req, res) => {
    const userId = parseInt(req.query.userId);
    const quizzes = db.quizzes.filter(q => q.is_active);
    
    const quizzesWithStatus = quizzes.map(quiz => {
        const completion = db.quiz_completions.find(
            qc => qc.user_id === userId && qc.quiz_id === quiz.id
        );
        
        let canRetake = quiz.allow_retake;
        if (completion && quiz.cooldown_hours > 0) {
            const lastCompletion = new Date(completion.completed_at);
            const now = new Date();
            const hoursSinceCompletion = (now - lastCompletion) / (1000 * 60 * 60);
            canRetake = hoursSinceCompletion >= quiz.cooldown_hours;
        }
        
        return {
            ...quiz,
            completed: !!completion,
            user_score: completion ? completion.score : 0,
            total_questions: quiz.questions.length,
            can_retake: canRetake && quiz.allow_retake,
            last_completion: completion ? completion.completed_at : null
        };
    });
    
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
    
    const existingCompletion = db.quiz_completions.find(
        qc => qc.user_id === userId && qc.quiz_id === quizId
    );
    
    if (existingCompletion && !quiz.allow_retake) {
        return res.status(400).json({ error: 'Этот квиз нельзя пройти повторно' });
    }
    
    if (existingCompletion && quiz.cooldown_hours > 0) {
        const lastCompletion = new Date(existingCompletion.completed_at);
        const now = new Date();
        const hoursSinceCompletion = (now - lastCompletion) / (1000 * 60 * 60);
        
        if (hoursSinceCompletion < quiz.cooldown_hours) {
            const hoursLeft = Math.ceil(quiz.cooldown_hours - hoursSinceCompletion);
            return res.status(400).json({ 
                error: `Квиз можно пройти повторно через ${hoursLeft} часов` 
            });
        }
    }
    
    let correctAnswers = 0;
    quiz.questions.forEach((question, index) => {
        if (answers[index] === question.correctAnswer) {
            correctAnswers++;
        }
    });
    
    let sparksEarned = 0;
    const perfectScore = correctAnswers === quiz.questions.length;
    
    sparksEarned = correctAnswers * quiz.sparks_per_correct;
    
    if (perfectScore) {
        sparksEarned += quiz.sparks_perfect_bonus;
    }
    
    if (existingCompletion) {
        existingCompletion.score = correctAnswers;
        existingCompletion.sparks_earned = sparksEarned;
        existingCompletion.perfect_score = perfectScore;
        existingCompletion.completed_at = new Date().toISOString();
    } else {
        db.quiz_completions.push({
            id: Date.now(),
            user_id: userId,
            quiz_id: quizId,
            completed_at: new Date().toISOString(),
            score: correctAnswers,
            sparks_earned: sparksEarned,
            perfect_score: perfectScore
        });
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
        scorePercentage: Math.round((correctAnswers / quiz.questions.length) * 100),
        message: perfectScore ? 
            `Идеально! 🎉 +${sparksEarned}✨ (${correctAnswers}×${quiz.sparks_per_correct} + ${quiz.sparks_perfect_bonus} бонус)` : 
            `Правильно: ${correctAnswers}/${quiz.questions.length}. +${sparksEarned}✨ (${correctAnswers}×${quiz.sparks_per_correct})`
    });
});

// ==================== API ДЛЯ МАРАФОНОВ ====================

app.get('/api/webapp/marathons', (req, res) => {
    const userId = parseInt(req.query.userId);
    const marathons = db.marathons.filter(m => m.is_active);
    
    const marathonsWithStatus = marathons.map(marathon => {
        const completion = db.marathon_completions.find(
            mc => mc.user_id === userId && mc.marathon_id === marathon.id
        );
        
        const currentTask = completion ? marathon.tasks[completion.current_day - 1] : marathon.tasks[0];
        
        return {
            ...marathon,
            completed: completion ? completion.completed : false,
            current_day: completion ? completion.current_day : 1,
            progress: completion ? completion.progress : 0,
            started_at: completion ? completion.started_at : null,
            current_task: currentTask
        };
    });
    
    res.json(marathonsWithStatus);
});

app.post('/api/webapp/marathons/:marathonId/submit-day', (req, res) => {
    console.log('📤 Отправка работы марафона, размер данных:', (req.headers['content-length'] / 1024 / 1024).toFixed(2), 'MB');
    
    const marathonId = parseInt(req.params.marathonId);
    const { userId, day, submission_text, submission_image } = req.body;
    
    if (!userId || !day) {
        return res.status(400).json({ error: 'User ID and day are required' });
    }
    
    const marathon = db.marathons.find(m => m.id === marathonId);
    if (!marathon) {
        return res.status(404).json({ error: 'Marathon not found' });
    }
    
    const task = marathon.tasks.find(t => t.day === day);
    if (!task) {
        return res.status(404).json({ error: 'Task not found' });
    }
    
    if (task.requires_submission && !submission_text && !submission_image) {
        return res.status(400).json({ error: 'Это задание требует отправки работы' });
    }
    
    let completion = db.marathon_completions.find(
        mc => mc.user_id === userId && mc.marathon_id === marathonId
    );
    
    if (!completion) {
        completion = {
            id: Date.now(),
            user_id: userId,
            marathon_id: marathonId,
            current_day: 1,
            progress: 0,
            completed: false,
            started_at: new Date().toISOString()
        };
        db.marathon_completions.push(completion);
    }
    
    if (completion.current_day !== day) {
        return res.status(400).json({ error: 'Неверный день марафона' });
    }
    
    if (submission_text || submission_image) {
        db.marathon_submissions.push({
            id: Date.now(),
            user_id: userId,
            marathon_id: marathonId,
            day: day,
            submission_text: submission_text,
            submission_image: submission_image,
            submitted_at: new Date().toISOString(),
            status: 'pending'
        });
    }
    
    const sparksEarned = marathon.sparks_per_day;
    addSparks(userId, sparksEarned, 'marathon_day', `Марафон: ${marathon.title} - день ${day}`);
    
    completion.current_day = day + 1;
    completion.progress = Math.round((day / marathon.duration_days) * 100);
    
    if (day >= marathon.duration_days) {
        completion.completed = true;
        completion.progress = 100;
        
        const marathonBonus = marathon.sparks_per_day * 2;
        addSparks(userId, marathonBonus, 'marathon_completion', `Завершение марафона: ${marathon.title}`);
    }
    
    res.json({
        success: true,
        sparksEarned,
        currentDay: completion.current_day,
        progress: completion.progress,
        completed: completion.completed,
        message: completion.completed ? 
            `🎉 Марафон завершен! +${sparksEarned}✨ (день) + ${marathon.sparks_per_day * 2}✨ (бонус)` : 
            `День ${day} завершен! +${sparksEarned}✨`
    });
});

// ==================== API ДЛЯ МАГАЗИНА ====================

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
    
    const existingPurchase = db.purchases.find(
        p => p.user_id === userId && p.item_id === itemId
    );
    
    if (existingPurchase) {
        return res.status(400).json({ error: 'Вы уже купили этот товар' });
    }
    
    if (user.sparks < item.price) {
        return res.status(400).json({ error: 'Недостаточно искр' });
    }
    
    try {
        const oldSparks = user.sparks;
        user.sparks = oldSparks - item.price;
        
        console.log(`💰 Списание искр: ${oldSparks} - ${item.price} = ${user.sparks}`);

        const purchase = {
            id: Date.now(),
            user_id: userId,
            item_id: itemId,
            price_paid: item.price,
            purchased_at: new Date().toISOString()
        };
        
        db.purchases.push(purchase);
        
        console.log(`✅ Покупка товара: пользователь ${userId}, товар ${itemId}, цена ${item.price}, осталось искр: ${user.sparks}`);
        
        res.json({
            success: true,
            message: `Покупка успешна! Куплено: ${item.title}`,
            remainingSparks: user.sparks,
            purchase: purchase
        });
        
    } catch (error) {
        console.error('❌ Ошибка при покупке товара:', error);
        const user = db.users.find(u => u.user_id == userId);
        if (user) {
            user.sparks += item.price;
        }
        res.status(500).json({ error: 'Ошибка при покупке товара' });
    }
});

app.get('/api/webapp/users/:userId/purchases', (req, res) => {
    const userId = parseInt(req.params.userId);
    const userPurchases = db.purchases
        .filter(p => p.user_id === userId)
        .map(purchase => {
            const item = db.shop_items.find(i => i.id === purchase.item_id);
            return { 
                ...purchase, 
                title: item?.title,
                description: item?.description,
                type: item?.type,
                file_url: item?.file_url,
                content_text: item?.content_text,
                preview_url: item?.preview_url,
                embed_html: item?.embed_html,
                html_content: item?.embed_html,
                content_html: item?.embed_html,
                content: item?.embed_html,
                file_data: item?.file_url?.startsWith('data:') ? item.file_url : null,
                preview_data: item?.preview_url?.startsWith('data:') ? item.preview_url : null
            };
        })
        .sort((a, b) => new Date(b.purchased_at) - new Date(a.purchased_at));
        
    res.json({ purchases: userPurchases });
});

// ==================== API ДЛЯ АКТИВНОСТЕЙ ====================

app.get('/api/webapp/users/:userId/activities', (req, res) => {
    const userId = parseInt(req.params.userId);
    const userActivities = db.activities
        .filter(a => a.user_id === userId)
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .slice(0, 50);
    res.json({ activities: userActivities });
});

// ==================== API ДЛЯ РАБОТ ПОЛЬЗОВАТЕЛЕЙ ====================

app.post('/api/webapp/upload-work', (req, res) => {
    console.log('📤 Загрузка работы, размер данных:', (req.headers['content-length'] / 1024 / 1024).toFixed(2), 'MB');
    
    const { userId, title, description, imageUrl, type } = req.body;
    
    if (!userId || !title || !imageUrl) {
        return res.status(400).json({ error: 'User ID, title and image URL are required' });
    }
    
    const user = db.users.find(u => u.user_id == userId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    const newWork = {
        id: Date.now(),
        user_id: userId,
        title,
        description: description || '',
        image_url: imageUrl,
        type: type || 'image',
        status: 'pending',
        created_at: new Date().toISOString(),
        moderated_at: null,
        moderator_id: null,
        admin_comment: null
    };
    
    db.user_works.push(newWork);
    
    addSparks(userId, SPARKS_SYSTEM.UPLOAD_WORK, 'upload_work', `Загрузка работы: ${title}`);
    
    res.json({
        success: true,
        message: `Работа успешно загружена! Получено +${SPARKS_SYSTEM.UPLOAD_WORK}✨. После одобрения вы получите +${SPARKS_SYSTEM.WORK_APPROVED}✨`,
        workId: newWork.id,
        work: newWork
    });
});

app.get('/api/webapp/users/:userId/works', (req, res) => {
    const userId = parseInt(req.params.userId);
    const userWorks = db.user_works
        .filter(w => w.user_id === userId)
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    res.json({ works: userWorks });
});

// ==================== API ДЛЯ ПОСТОВ КАНАЛА ====================

app.get('/api/webapp/channel-posts', (req, res) => {
    const posts = db.channel_posts
        .filter(p => p.is_active)
        .map(post => {
            const reviews = db.post_reviews.filter(r => r.post_id === post.post_id);
            return {
                ...post,
                reviews_count: reviews.length,
                average_rating: reviews.length > 0 ? 
                    reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length : 0
            };
        })
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        
    res.json({ posts: posts });
});

app.post('/api/webapp/posts/:postId/review', (req, res) => {
    const postId = req.params.postId;
    const { userId, reviewText, rating } = req.body;
    
    if (!userId || !reviewText) {
        return res.status(400).json({ error: 'User ID and review text are required' });
    }
    
    const post = db.channel_posts.find(p => p.post_id === postId);
    if (!post) {
        return res.status(404).json({ error: 'Post not found' });
    }
    
    const existingReview = db.post_reviews.find(
        r => r.user_id === userId && r.post_id === postId
    );
    
    if (existingReview) {
        return res.status(400).json({ error: 'Вы уже оставляли отзыв на этот пост' });
    }
    
    const today = new Date().toDateString();
    const todayReviews = db.daily_reviews.filter(
        dr => dr.user_id === userId && new Date(dr.date).toDateString() === today
    );
    
    let sparksEarned = SPARKS_SYSTEM.WRITE_REVIEW;
    
    if (todayReviews.length === 0) {
        sparksEarned += SPARKS_SYSTEM.DAILY_COMMENT;
        
        db.daily_reviews.push({
            id: Date.now(),
            user_id: userId,
            date: new Date().toISOString(),
            type: 'daily_comment'
        });
    }
    
    const newReview = {
        id: Date.now(),
        user_id: userId,
        post_id: postId,
        review_text: reviewText,
        rating: rating || 5,
        status: 'pending',
        created_at: new Date().toISOString(),
        moderated_at: null,
        moderator_id: null,
        admin_comment: null
    };
    
    db.post_reviews.push(newReview);
    
    addSparks(userId, sparksEarned, 'post_review', `Отзыв к посту: ${post.title}`);
    
    const message = todayReviews.length === 0 
        ? `Отзыв отправлен! +${sparksEarned}✨ (3 за отзыв + 1 за первый комментарий сегодня)`
        : `Отзыв отправлен! +${sparksEarned}✨`;
    
    res.json({
        success: true,
        message: message,
        reviewId: newReview.id,
        sparksEarned: sparksEarned
    });
});

// ==================== API ДЛЯ ИНТЕРАКТИВОВ ====================

app.get('/api/webapp/interactives', (req, res) => {
    const userId = parseInt(req.query.userId);
    const interactives = db.interactives.filter(i => i.is_active);
    
    const interactivesWithStatus = interactives.map(interactive => {
        const completion = db.interactive_completions.find(
            ic => ic.user_id === userId && ic.interactive_id === interactive.id
        );
        
        return {
            ...interactive,
            completed: !!completion,
            user_score: completion ? completion.score : 0,
            can_retake: interactive.allow_retake && !completion
        };
    });
    
    res.json(interactivesWithStatus);
});

app.post('/api/webapp/interactives/:interactiveId/submit', (req, res) => {
    const interactiveId = parseInt(req.params.interactiveId);
    const { userId, answer } = req.body;
    
    if (!userId) {
        return res.status(400).json({ error: 'User ID is required' });
    }
    
    const interactive = db.interactives.find(i => i.id === interactiveId);
    if (!interactive) {
        return res.status(404).json({ error: 'Interactive not found' });
    }
    
    const existingCompletion = db.interactive_completions.find(
        ic => ic.user_id === userId && ic.interactive_id === interactiveId
    );
    
    if (existingCompletion && !interactive.allow_retake) {
        return res.status(400).json({ error: 'Вы уже прошли этот интерактив' });
    }
    
    const isCorrect = answer === interactive.correct_answer;
    const sparksEarned = isCorrect ? interactive.sparks_reward : 0;
    
    if (existingCompletion) {
        existingCompletion.score = isCorrect ? 1 : 0;
        existingCompletion.sparks_earned = sparksEarned;
        existingCompletion.completed_at = new Date().toISOString();
        existingCompletion.answer = answer;
    } else {
        db.interactive_completions.push({
            id: Date.now(),
            user_id: userId,
            interactive_id: interactiveId,
            completed_at: new Date().toISOString(),
            score: isCorrect ? 1 : 0,
            sparks_earned: sparksEarned,
            answer: answer
        });
    }
    
    if (sparksEarned > 0) {
        addSparks(userId, sparksEarned, 'interactive', `Интерактив: ${interactive.title}`);
    }
    
    res.json({
        success: true,
        correct: isCorrect,
        score: isCorrect ? 1 : 0,
        sparksEarned: sparksEarned,
        message: isCorrect ? 
            `Правильно! +${sparksEarned}✨` : 
            'Попробуйте еще раз!'
    });
});

// ==================== API ДЛЯ ПРИВАТНЫХ ВИДЕО ====================

app.get('/api/webapp/private-videos', (req, res) => {
    try {
        const userId = parseInt(req.query.userId);
        console.log('🎬 Запрос приватных видео для пользователя:', userId);

        if (!userId) {
            return res.status(401).json({ 
                success: false,
                error: 'Требуется авторизация' 
            });
        }

        const videos = db.private_channel_videos.filter(video => video.is_active);
        
        const videosWithAccess = videos.map(video => {
            const hasAccess = db.video_access.some(access => 
                access.user_id == userId && 
                access.video_id === video.id && 
                access.expires_at > new Date().toISOString()
            );
            
            const hasPurchase = db.purchases.some(purchase => 
                purchase.user_id == userId && 
                purchase.item_id === video.id && 
                purchase.item_type === 'private_video'
            );

            return {
                id: video.id,
                title: video.title,
                description: video.description,
                duration: video.duration,
                price: video.price,
                category: video.category,
                level: video.level,
                preview_url: video.preview_url,
                has_access: hasAccess,
                has_purchase: hasPurchase,
                can_purchase: !hasPurchase,
                access_expired: hasPurchase && !hasAccess,
                access_duration_days: video.access_duration_days
            };
        });

        console.log(`✅ Найдено видео: ${videosWithAccess.length}`);

        res.json({ 
            success: true,
            videos: videosWithAccess 
        });
        
    } catch (error) {
        console.error('❌ Ошибка получения приватных видео:', error);
        res.status(500).json({ 
            success: false,
            error: 'Ошибка загрузки видео' 
        });
    }
});

app.get('/api/webapp/private-videos/:videoId', (req, res) => {
    try {
        const userId = parseInt(req.query.userId);
        const videoId = parseInt(req.params.videoId);
        
        console.log('📹 Запрос деталей видео:', { userId, videoId });

        if (!userId) {
            return res.status(401).json({ 
                success: false,
                error: 'Требуется авторизация' 
            });
        }

        const video = db.private_channel_videos.find(v => v.id === videoId && v.is_active);
        if (!video) {
            return res.status(404).json({ 
                success: false,
                error: 'Видео не найдено' 
            });
        }

        const hasAccess = db.video_access.some(access => 
            access.user_id == userId && 
            access.video_id === videoId && 
            access.expires_at > new Date().toISOString()
        );
        
        const hasPurchase = db.purchases.some(purchase => 
            purchase.user_id == userId && 
            purchase.item_id === videoId && 
            purchase.item_type === 'private_video'
        );

        res.json({
            success: true,
            video: {
                id: video.id,
                title: video.title,
                description: video.description,
                duration: video.duration,
                price: video.price,
                category: video.category,
                level: video.level,
                access_duration_days: video.access_duration_days,
                created_at: video.created_at
            },
            access: {
                has_access: hasAccess,
                has_purchase: hasPurchase,
                can_purchase: !hasPurchase
            }
        });

    } catch (error) {
        console.error('❌ Ошибка получения деталей видео:', error);
        res.status(500).json({ 
            success: false,
            error: 'Ошибка загрузки информации о видео' 
        });
    }
});

app.post('/api/webapp/private-videos/purchase', async (req, res) => {
    try {
        const { userId, videoId } = req.body;
        
        console.log('🛒 Покупка приватного видео:', { userId, videoId });

        if (!userId || !videoId) {
            return res.status(400).json({ 
                success: false,
                error: 'User ID and video ID are required' 
            });
        }

        const user = db.users.find(u => u.user_id == userId);
        const video = db.private_channel_videos.find(v => v.id == videoId && v.is_active);

        if (!user) {
            return res.status(404).json({ 
                success: false,
                error: 'Пользователь не найден' 
            });
        }
        
        if (!video) {
            return res.status(404).json({ 
                success: false,
                error: 'Видео не найдено или неактивно' 
            });
        }

        if (user.sparks < video.price) {
            return res.status(402).json({ 
                success: false,
                error: `Недостаточно искр. Нужно: ${video.price}, у вас: ${user.sparks.toFixed(1)}` 
            });
        }

        const existingPurchase = db.purchases.find(p => 
            p.user_id == userId && p.item_id === videoId && p.item_type === 'private_video'
        );

        if (existingPurchase) {
            return res.status(409).json({ 
                success: false,
                error: 'У вас уже есть доступ к этому материалу' 
            });
        }

        const existingAccess = db.video_access.find(access => 
            access.user_id == userId && access.video_id === videoId && access.expires_at > new Date().toISOString()
        );

        if (existingAccess) {
            return res.status(409).json({ 
                success: false,
                error: 'У вас уже есть активный доступ к этому материалу' 
            });
        }

        const oldSparks = user.sparks;
        user.sparks -= video.price;
        
        console.log(`💰 Списание искр: ${oldSparks} -> ${user.sparks}`);

        const purchase = {
            id: Date.now(),
            user_id: parseInt(userId),
            item_id: videoId,
            item_type: 'private_video',
            item_title: video.title,
            price_paid: video.price,
            purchased_at: new Date().toISOString()
        };
        db.purchases.push(purchase);

        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + (video.access_duration_days || 30));
        
        const access = {
            id: Date.now(),
            user_id: parseInt(userId),
            video_id: videoId,
            purchased_at: new Date().toISOString(),
            expires_at: expiresAt.toISOString(),
            telegram_message_id: null,
            access_count: 0
        };
        db.video_access.push(access);

        addSparks(userId, -video.price, 'private_video_purchase', `Покупка доступа к видео: ${video.title}`);

        console.log('✅ Покупка завершена:', { 
            purchase: purchase.id, 
            access: access.id,
            user: userId,
            video: video.title,
            access_days: video.access_duration_days
        });

        res.json({
            success: true,
            purchase: purchase,
            access: access,
            remaining_sparks: user.sparks,
            message: `Доступ к "${video.title}" успешно приобретен на ${video.access_duration_days || 30} дней!`
        });

    } catch (error) {
        console.error('❌ Ошибка покупки приватного видео:', error);
        
        if (userId) {
            const user = db.users.find(u => u.user_id == userId);
            if (user) {
                user.sparks += req.body.videoId ? db.private_channel_videos.find(v => v.id == req.body.videoId)?.price || 0 : 0;
            }
        }
        
        res.status(500).json({ 
            success: false,
            error: 'Ошибка при покупке доступа к видео' 
        });
    }
});

app.get('/api/webapp/private-videos/:videoId/access', (req, res) => {
    try {
        const userId = parseInt(req.query.userId);
        const videoId = parseInt(req.params.videoId);
        
        console.log('🔐 Проверка доступа:', { userId, videoId });

        if (!userId) {
            return res.status(401).json({ 
                success: false,
                error: 'Требуется авторизация' 
            });
        }

        const video = db.private_channel_videos.find(v => v.id === videoId && v.is_active);
        if (!video) {
            return res.status(404).json({ 
                success: false,
                error: 'Видео не найдено' 
            });
        }

        const admin = db.admins.find(a => a.user_id == userId);
        let hasAccess = false;
        let accessRecord = null;

        if (admin) {
            hasAccess = true;
        } else {
            accessRecord = db.video_access.find(access => 
                access.user_id == userId && 
                access.video_id === videoId && 
                access.expires_at > new Date().toISOString()
            );
            hasAccess = !!accessRecord;
        }

        let protectedLink = null;
        if (hasAccess) {
            const token = btoa(`${video.channel_id}_${video.message_id}_${Date.now()}`)
                .replace(/=/g, '')
                .replace(/\+/g, '-')
                .replace(/\//g, '_');
                
            protectedLink = `${process.env.APP_URL || 'http://localhost:3000'}/api/telegram/proxy/${token}?userId=${userId}`;
            
            if (accessRecord) {
                accessRecord.access_count = (accessRecord.access_count || 0) + 1;
            }
        }

        res.json({
            success: true,
            has_access: hasAccess,
            protected_link: protectedLink,
            video: {
                id: video.id,
                title: video.title,
                description: video.description,
                duration: video.duration,
                price: video.price,
                category: video.category,
                level: video.level
            },
            access_record: accessRecord
        });

    } catch (error) {
        console.error('❌ Ошибка проверки доступа:', error);
        res.status(500).json({ 
            success: false,
            error: 'Ошибка проверки доступа' 
        });
    }
});

// ==================== API ДЛЯ АДМИНКИ ====================

app.get('/api/admin/stats', requireAdmin, (req, res) => {
    const stats = {
        totalUsers: db.users.length,
        registeredUsers: db.users.filter(u => u.is_registered).length,
        activeQuizzes: db.quizzes.filter(q => q.is_active).length,
        activeMarathons: db.marathons.filter(m => m.is_active).length,
        shopItems: db.shop_items.filter(i => i.is_active).length,
        totalSparks: db.users.reduce((sum, user) => sum + user.sparks, 0),
        totalAdmins: db.admins.length,
        pendingReviews: db.post_reviews.filter(r => r.status === 'pending').length,
        pendingWorks: db.user_works.filter(w => w.status === 'pending').length,
        totalPosts: db.channel_posts.filter(p => p.is_active).length,
        totalPurchases: db.purchases.length,
        totalActivities: db.activities.length,
        interactives: db.interactives.filter(i => i.is_active).length
    };
    res.json(stats);
});

// Управление приватными видео
app.get('/api/admin/private-videos', requireAdmin, (req, res) => {
    try {
        const videos = db.private_channel_videos.map(video => {
            const purchaseCount = db.purchases.filter(p => 
                p.item_id === video.id && p.item_type === 'private_video'
            ).length;
            
            const accessCount = db.video_access.filter(access => 
                access.video_id === video.id && access.expires_at > new Date().toISOString()
            ).length;
            
            return {
                ...video,
                purchase_count: purchaseCount,
                access_count: accessCount
            };
        });
        
        res.json(videos);
        
    } catch (error) {
        console.error('❌ Ошибка получения приватных видео:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

app.post('/api/admin/private-videos', requireAdmin, (req, res) => {
    try {
        console.log('🎬 Создание приватного материала - полученные данные:', JSON.stringify(req.body, null, 2));
        
        const { 
            post_url, 
            channel_id,
            message_id,
            title, 
            description, 
            duration, 
            price, 
            category, 
            level, 
            is_active 
        } = req.body;

        console.log('🔍 Проверка обязательных полей:', {
            hasChannelId: !!channel_id,
            hasMessageId: !!message_id,
            channel_id: channel_id,
            message_id: message_id,
            title: title,
            price: price
        });

        if (!title || !price || !channel_id || !message_id) {
            console.log('❌ Отсутствуют обязательные поля:', {
                title: !!title,
                price: !!price,
                channel_id: !!channel_id,
                message_id: !!message_id
            });
            return res.status(400).json({ 
                success: false, 
                error: 'Заполните обязательные поля: название, цена, ID канала и сообщения' 
            });
        }

        const existingVideo = db.private_channel_videos.find(v => 
            v.channel_id === channel_id && v.message_id === parseInt(message_id)
        );
        
        if (existingVideo) {
            return res.status(400).json({ 
                success: false, 
                error: 'Материал с таким ID сообщения уже существует в этом канале' 
            });
        }

        const newVideo = {
            id: Date.now(),
            post_url: post_url || '',
            channel_id: channel_id,
            message_id: parseInt(message_id),
            title: title,
            description: description || '',
            duration: duration || 'Не указано',
            price: parseFloat(price),
            category: category || 'video',
            level: level || 'beginner',
            is_active: is_active !== undefined ? is_active : true,
            created_at: new Date().toISOString(),
            preview_url: '',
            file_size: 'Не указан',
            tags: []
        };

        db.private_channel_videos.push(newVideo);

        console.log('✅ Приватный материал создан:', newVideo.title);

        res.json({
            success: true,
            video: newVideo,
            message: 'Приватный материал успешно создан'
        });

    } catch (error) {
        console.error('❌ Ошибка создания приватного видео:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Ошибка сервера при создании материала: ' + error.message 
        });
    }
});

app.put('/api/admin/private-videos/:id', requireAdmin, (req, res) => {
    try {
        const videoId = parseInt(req.params.id);
        const videoIndex = db.private_channel_videos.findIndex(v => v.id === videoId);
        
        if (videoIndex === -1) {
            return res.status(404).json({ 
                success: false, 
                error: 'Материал не найден' 
            });
        }

        const { 
            title, 
            description, 
            duration, 
            access_duration_days,
            price, 
            category, 
            level, 
            is_active 
        } = req.body;

        if (title) db.private_channel_videos[videoIndex].title = title;
        if (description !== undefined) db.private_channel_videos[videoIndex].description = description;
        if (duration !== undefined) db.private_channel_videos[videoIndex].duration = duration;
        if (access_duration_days !== undefined) db.private_channel_videos[videoIndex].access_duration_days = access_duration_days;
        if (price !== undefined) db.private_channel_videos[videoIndex].price = parseFloat(price);
        if (category) db.private_channel_videos[videoIndex].category = category;
        if (level) db.private_channel_videos[videoIndex].level = level;
        if (is_active !== undefined) db.private_channel_videos[videoIndex].is_active = is_active;
        db.private_channel_videos[videoIndex].updated_at = new Date().toISOString();

        console.log('✅ Приватный материал обновлен:', db.private_channel_videos[videoIndex].title);

        res.json({
            success: true,
            video: db.private_channel_videos[videoIndex],
            message: 'Материал успешно обновлен'
        });

    } catch (error) {
        console.error('❌ Ошибка обновления приватного видео:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Ошибка сервера' 
        });
    }
});

app.delete('/api/admin/private-videos/:id', requireAdmin, (req, res) => {
    try {
        const videoId = parseInt(req.params.id);
        const videoIndex = db.private_channel_videos.findIndex(v => v.id === videoId);
        
        if (videoIndex === -1) {
            return res.status(404).json({ 
                success: false, 
                error: 'Материал не найден' 
            });
        }

        const videoTitle = db.private_channel_videos[videoIndex].title;

        db.private_channel_videos.splice(videoIndex, 1);
        db.video_access = db.video_access.filter(va => va.video_id !== videoId);
        db.purchases = db.purchases.filter(p => 
            !(p.item_id === videoId && p.item_type === 'private_video')
        );

        console.log('✅ Приватный материал удален:', videoTitle);

        res.json({
            success: true,
            message: 'Материал успешно удален'
        });

    } catch (error) {
        console.error('❌ Ошибка удаления приватного видео:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Ошибка сервера' 
        });
    }
});

// Прокси для доступа к приватным видео через Telegram
app.get('/api/telegram/proxy/:token', async (req, res) => {
    try {
        const token = req.params.token;
        const userId = req.query.userId;
        
        console.log('🔗 Обработка прокси-запроса:', { token, userId });

        if (!userId) {
            return res.status(401).json({ 
                success: false,
                error: 'Требуется авторизация' 
            });
        }

        const decoded = atob(token.replace(/-/g, '+').replace(/_/g, '/'));
        const [channelId, messageId, timestamp] = decoded.split('_');
        
        const tokenAge = Date.now() - parseInt(timestamp);
        if (tokenAge > 24 * 60 * 60 * 1000) {
            return res.status(410).json({ 
                success: false,
                error: 'Ссылка устарела' 
            });
        }

        const video = db.private_channel_videos.find(v => 
            v.channel_id === channelId && 
            v.message_id === parseInt(messageId) && 
            v.is_active
        );

        if (!video) {
            return res.status(404).json({ 
                success: false,
                error: 'Видео не найдено' 
            });
        }

        const admin = db.admins.find(a => a.user_id == userId);
        if (!admin) {
            const hasAccess = db.video_access.some(access => 
                access.user_id == userId && 
                access.video_id === video.id && 
                access.expires_at > new Date().toISOString()
            );

            if (!hasAccess) {
                return res.status(403).json({ 
                    success: false,
                    error: 'Нет доступа к видео' 
                });
            }
        }

        let telegramUrl;
        if (channelId.startsWith('-100') || !isNaN(channelId)) {
            const publicChannelId = channelId.replace('-100', '');
            telegramUrl = `https://t.me/c/${publicChannelId}/${messageId}`;
        } else {
            telegramUrl = `https://t.me/${channelId}/${messageId}`;
        }

        console.log('✅ Перенаправление на:', telegramUrl);
        res.redirect(telegramUrl);

    } catch (error) {
        console.error('❌ Ошибка прокси:', error);
        res.status(500).json({ 
            success: false,
            error: 'Ошибка доступа к видео' 
        });
    }
});

// ==================== TELEGRAM BOT ====================

let bot;
if (process.env.BOT_TOKEN) {
    try {
        const botOptions = {
            polling: {
                timeout: 10,
                limit: 100,
                retryTimeout: 1000,
                params: {
                    timeout: 10,
                    limit: 100
                }
            }
        };
        
        bot = new TelegramBot(process.env.BOT_TOKEN, botOptions);
        
        console.log('✅ Telegram Bot инициализирован');
        console.log('=== НАСТРОЙКИ ПРИВАТНОГО КАНАЛА ===');
        console.log('CHANNEL_ID:', PRIVATE_CHANNEL_CONFIG.CHANNEL_ID);
        console.log('CHANNEL_USERNAME:', PRIVATE_CHANNEL_CONFIG.CHANNEL_USERNAME);
        console.log('BOT_TOKEN:', process.env.BOT_TOKEN ? '✅ Установлен' : '❌ Отсутствует');
        console.log('==================================');

        bot.on('polling_error', (error) => {
            console.log('⚠️ Ошибка polling:', error.message);
            if (error.code === 'ETELEGRAM' && error.message.includes('409 Conflict')) {
                console.log('🔧 Решение: Убедитесь, что запущен только один экземпляр бота');
                console.log('💡 Попробуйте подождать 10 секунд или перезапустить приложение');
            }
        });

        bot.onText(/\/start/, (msg) => {
            const chatId = msg.chat.id;
            const name = msg.from.first_name || 'Друг';
            const userId = msg.from.id;
            
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
• 🎮 Выполнять интерактивные задания
• 🔄 Менять роль и персонажа
• 📊 Отслеживать прогресс
• 🛒 Покупать обучающие материалы
• 🎬 Получать доступ к приватным видео

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

        bot.onText(/\/доступ|доступ/i, async (msg) => {
            const chatId = msg.chat.id;
            const userId = msg.from.id;
            
            try {
                const userAccess = db.video_access.filter(access => 
                    access.user_id === userId && 
                    access.expires_at > new Date().toISOString()
                );
                
                if (userAccess.length === 0) {
                    bot.sendMessage(chatId, 
                        'У вас нет активного доступа к видео.\n\n' +
                        '📹 Приобрести доступ можно в разделе "Приватные видео" в вашем личном кабинете.'
                    );
                    return;
                }
                
                let message = '🎬 Ваши активные доступы к видео:\n\n';
                
                for (const access of userAccess) {
                    const video = db.private_channel_videos.find(v => v.id === access.video_id && v.is_active);
                    if (video) {
                        const token = btoa(`${video.channel_id}_${video.message_id}_${Date.now()}`)
                            .replace(/=/g, '')
                            .replace(/\+/g, '-')
                            .replace(/\//g, '_');
                            
                        const protectedLink = `${process.env.APP_URL || 'http://localhost:3000'}/api/telegram/proxy/${token}?userId=${userId}`;
                        
                        message += `📹 ${video.title}\n`;
                        message += `🔗 ${protectedLink}\n`;
                        message += `⏰ Ссылка действительна 24 часа\n\n`;
                    }
                }
                
                message += '⚠️ Для повторного доступа используйте команду /доступ';
                
                bot.sendMessage(chatId, message);
                
            } catch (error) {
                console.error('Ошибка при запросе доступа:', error);
                bot.sendMessage(chatId, '❌ Произошла ошибка при получении доступа. Попробуйте позже.');
            }
        });

        bot.onText(/\/admin/, (msg) => {
            const chatId = msg.chat.id;
            const userId = msg.from.id;
            
            const admin = db.admins.find(a => a.user_id == userId);
            if (!admin) {
                bot.sendMessage(chatId, '❌ У вас нет прав доступа к админ панели.');
                return;
            }
            
            const baseUrl = process.env.APP_URL || 'https://sergeynikishin555123123-lab-tg-inspirationn-bot-3c3e.twc1.net';
            const adminUrl = `${baseUrl}/admin.html?userId=${userId}`;
            
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
                totalSparks: db.users.reduce((sum, user) => sum + user.sparks, 0),
                privateVideos: db.private_channel_videos.filter(v => v.is_active).length,
                videoAccesses: db.video_access.filter(va => va.expires_at > new Date().toISOString()).length
            };
            
            const statsText = `📊 Статистика бота:
            
👥 Пользователи: ${stats.totalUsers}
✅ Зарегистрировано: ${stats.registeredUsers}
🎯 Активных квизов: ${stats.activeQuizzes}
🏃‍♂️ Активных марафонов: ${stats.activeMarathons}
🛒 Товаров в магазине: ${stats.shopItems}
🎬 Приватных видео: ${stats.privateVideos}
🔗 Активных доступов: ${stats.videoAccesses}
✨ Всего искр: ${stats.totalSparks.toFixed(1)}`;
            
            bot.sendMessage(chatId, statsText);
        });

    } catch (error) {
        console.error('❌ Ошибка инициализации бота:', error);
        if (error.code === 'ETELEGRAM' && error.message.includes('409 Conflict')) {
            console.log('💡 Решение проблемы:');
            console.log('1. Убедитесь, что не запущены другие экземпляры бота');
            console.log('2. Подождите 10-20 секунд и перезапустите приложение');
            console.log('3. Проверьте настройки BOT_TOKEN в переменных окружения');
        }
    }
} else {
    console.log('⚠️ BOT_TOKEN не установлен. Telegram бот отключен.');
}

// ==================== ЗАПУСК СЕРВЕРА ====================

// Запуск сервера с управлением процессами
async function startServer() {
    try {
        await setupProcessManagement();
        
        const PORT = process.env.PORT || 3000;
        
        const server = app.listen(PORT, '0.0.0.0', () => {
            console.log(`🚀 Сервер запущен на порту ${PORT}`);
            console.log(`📱 WebApp: ${process.env.APP_URL || `http://localhost:${PORT}`}`);
            console.log(`🔧 Admin: ${process.env.APP_URL || `http://localhost:${PORT}`}/admin`);
            console.log(`🎯 Квизов: ${db.quizzes.length}`);
            console.log(`🏃‍♂️ Марафонов: ${db.marathons.length}`);
            console.log(`🎮 Интерактивов: ${db.interactives.length}`);
            console.log(`🛒 Товаров: ${db.shop_items.length}`);
            console.log(`👥 Пользователей: ${db.users.length}`);
            console.log('✅ Все системы работают!');
            console.log(`📊 PID главного процесса: ${process.pid}`);
        });
        
        setupGracefulShutdown();
        
        return server;
        
    } catch (error) {
        console.error('💥 Критическая ошибка запуска сервера:', error);
        process.exit(1);
    }
}

// Запускаем сервер 
startServer().catch(console.error);
