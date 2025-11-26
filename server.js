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

// Конфигурация приложения
const APP_ROOT = process.cwd();
const PORT = process.env.PORT || 3000;

console.log('🎨 Мастерская Вдохновения - Запуск системы...');
console.log('📁 Текущая рабочая директория:', APP_ROOT);

// Полная база данных со всеми необходимыми таблицами
let database = {
    users: [
        {
            id: 1,
            user_id: 898508164,
            tg_first_name: 'Администратор',
            tg_username: 'admin',
            sparks: 250.0,
            level: 'Мастер',
            is_registered: true,
            class: 'Художники',
            character_id: 1,
            character_name: 'Лука Цветной',
            available_buttons: ['quiz', 'marathon', 'works', 'activities', 'posts', 'shop', 'invite', 'interactives', 'change_role', 'private_videos'],
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
            available_buttons: ['quiz', 'marathon', 'works', 'activities', 'posts', 'shop', 'invite', 'interactives', 'change_role', 'private_videos'],
            is_active: true,
            created_at: new Date().toISOString()
        },
        {
            id: 2,
            name: 'Стилисты',
            description: 'Мастера создания образов',
            icon: '👗',
            available_buttons: ['quiz', 'marathon', 'works', 'activities', 'posts', 'shop', 'invite', 'interactives', 'change_role', 'private_videos'],
            is_active: true,
            created_at: new Date().toISOString()
        },
        {
            id: 3,
            name: 'Мастера',
            description: 'Ремесленники прикладного искусства',
            icon: '🧵',
            available_buttons: ['quiz', 'marathon', 'works', 'activities', 'posts', 'shop', 'invite', 'interactives', 'change_role', 'private_videos'],
            is_active: true,
            created_at: new Date().toISOString()
        },
        {
            id: 4,
            name: 'Историки',
            description: 'Знатоки истории искусств',
            icon: '🏛️',
            available_buttons: ['quiz', 'marathon', 'works', 'activities', 'posts', 'shop', 'invite', 'interactives', 'change_role', 'private_videos'],
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
            content_text: "В этом уроке вы научитесь основам работы с акварелью, смешиванию цветов и созданию первых работ.",
            is_active: true,
            created_at: new Date().toISOString()
        },
        {
            id: 2,
            title: "📚 Основы композиции",
            description: "PDF руководство по основам композиции в живописи",
            type: "pdf",
            file_url: "https://example.com/composition-guide.pdf",
            preview_url: "https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?w=300&h=200&fit=crop",
            price: 10,
            content_text: "Подробное руководство по построению композиции в художественных работах.",
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
            role: 'admin', 
            created_at: new Date().toISOString() 
        }
    ],
    purchases: [],
    channel_posts: [
        {
            id: 1,
            post_id: "post_art_basics",
            title: "🎨 Основы композиции в живописи",
            content: "Сегодня поговорим о фундаментальных принципах построения композиции.",
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
            message_id: 123,
            title: "🎬 Профессиональный урок по акварели",
            description: "Полный урок по технике акварельной живописи от профессионального художника",
            duration: "45 минут",
            file_size: "1.2 GB",
            price: 25,
            tags: ["акварель", "урок", "профессиональный"],
            is_active: true,
            created_at: new Date().toISOString()
        }
    ],
    video_access: []
};

// Система начисления искр
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
function calculateUserLevel(sparks) {
    if (sparks >= 400) return 'Наставник';
    if (sparks >= 300) return 'Мастер';
    if (sparks >= 150) return 'Знаток';
    if (sparks >= 50) return 'Искатель';
    return 'Ученик';
}

function addUserSparks(userId, sparks, activityType, description) {
    const user = database.users.find(user => user.user_id == userId);
    if (user) {
        user.sparks = Math.max(0, user.sparks + sparks);
        user.level = calculateUserLevel(user.sparks);
        user.last_active = new Date().toISOString();
        
        const activity = {
            id: Date.now(),
            user_id: userId,
            activity_type: activityType,
            sparks_earned: sparks,
            description: description,
            created_at: new Date().toISOString()
        };
        
        database.activities.push(activity);
        return activity;
    }
    return null;
}

function getUserStatistics(userId) {
    const user = database.users.find(user => user.user_id == userId);
    if (!user) return null;
    
    const activities = database.activities.filter(activity => activity.user_id == userId);
    const purchases = database.purchases.filter(purchase => purchase.user_id == userId);
    const works = database.user_works.filter(work => work.user_id == userId);
    const quizCompletions = database.quiz_completions.filter(completion => completion.user_id == userId);
    const marathonCompletions = database.marathon_completions.filter(completion => completion.user_id == userId);
    const interactiveCompletions = database.interactive_completions.filter(completion => completion.user_id == userId);
    
    return {
        totalActivities: activities.length,
        totalPurchases: purchases.length,
        totalWorks: works.length,
        approvedWorks: works.filter(work => work.status === 'approved').length,
        totalQuizzesCompleted: quizCompletions.length,
        totalMarathonsCompleted: marathonCompletions.filter(completion => completion.completed).length,
        totalInteractivesCompleted: interactiveCompletions.length,
        totalSparksEarned: activities.reduce((sum, activity) => sum + activity.sparks_earned, 0)
    };
}

function getBonusDescription(character) {
    const bonuses = {
        'percent_bonus': `+${character.bonus_value}% к наградам`,
        'forgiveness': `${character.bonus_value} право на ошибку`,
        'random_gift': `Случайный подарок ${character.bonus_value} раз в день`,
        'secret_advice': `Секретные советы на ${character.bonus_value}`,
        'series_bonus': `+${character.bonus_value} к серийным наградам`
    };
    return bonuses[character.bonus_type] || 'Особый бонус';
}

function getPurchaseTypeName(type) {
    const typeNames = {
        'video': 'Видео',
        'image': 'Изображение',
        'audio': 'Аудио',
        'pdf': 'PDF документ',
        'text': 'Текст',
        'link': 'Ссылка',
        'embed': 'Встроенное видео',
        'course': 'Курс',
        'package': 'Пакет'
    };
    return typeNames[type] || type;
}

function getPurchaseTypeIcon(type) {
    const icons = {
        'video': '🎥',
        'image': '🖼️',
        'audio': '🎧',
        'pdf': '📚',
        'text': '📝',
        'link': '🔗',
        'embed': '🎬',
        'course': '🎓',
        'package': '📦'
    };
    return icons[type] || '📄';
}

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

// Статические файлы
app.use(express.static(join(APP_ROOT, 'public'), { maxAge: '1d' }));

// Middleware для проверки администратора
const requireAdminAuthentication = (request, response, next) => {
    const userId = request.query.userId || request.body.userId;
    
    console.log('🔐 Проверка административных прав для пользователя:', userId);
    
    if (!userId) {
        return response.status(401).json({ error: 'Требуется идентификатор пользователя' });
    }
    
    const admin = database.admins.find(admin => admin.user_id == userId);
    if (!admin) {
        console.log('⚠️ Пользователь не найден в списке администраторов');
        return response.status(403).json({ error: 'Доступ запрещен' });
    }
    
    request.admin = admin;
    next();
};

// Базовые маршруты
app.get('/health', (request, response) => {
    response.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        database: 'In-Memory',
        users: database.users.length,
        quizzes: database.quizzes.length,
        marathons: database.marathons.length,
        shop_items: database.shop_items.length,
        interactives: database.interactives.length
    });
});

// API для пользователей
app.get('/api/users/:userId', (request, response) => {
    const userId = parseInt(request.params.userId);
    console.log('👤 Запрос данных пользователя:', userId);
    
    const user = database.users.find(user => user.user_id === userId);
    
    if (user) {
        console.log('✅ Пользователь найден:', user.tg_first_name);
        response.json({ 
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
        database.users.push(newUser);
        response.json({ 
            exists: false, 
            user: newUser 
        });
    }
});

app.post('/api/users/register', (request, response) => {
    const { userId, firstName, roleId, characterId } = request.body;
    
    console.log('📝 Регистрация пользователя:', { userId, firstName, roleId, characterId });
    
    if (!userId || !firstName || !roleId) {
        return response.status(400).json({ error: 'Требуется идентификатор пользователя, имя и роль' });
    }
    
    let user = database.users.find(user => user.user_id == userId);
    const role = database.roles.find(role => role.id == roleId);
    const character = database.characters.find(character => character.id == characterId);
    
    if (!role) {
        return response.status(404).json({ error: 'Роль не найдена' });
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
        database.users.push(user);
    }
    
    user.tg_first_name = firstName;
    user.class = role.name;
    user.character_id = characterId;
    user.character_name = character ? character.name : null;
    user.is_registered = true;
    user.available_buttons = role.available_buttons || ['quiz', 'marathon', 'works', 'activities', 'posts', 'shop', 'invite', 'interactives', 'change_role', 'private_videos'];
    user.last_active = new Date().toISOString();
    
    let message = 'Регистрация успешна!';
    let sparksAdded = 0;
    
    if (isNewUser) {
        sparksAdded = SPARKS_SYSTEM.REGISTRATION_BONUS;
        addUserSparks(userId, sparksAdded, 'registration', 'Регистрация');
        message = `Регистрация успешна! +${sparksAdded}✨`;
    }
    
    console.log('✅ Успешная регистрация:', user);
    
    response.json({ 
        success: true, 
        message, 
        sparksAdded,
        user: user
    });
});

app.post('/api/users/change-role', (request, response) => {
    const { userId, roleId, characterId } = request.body;
    
    if (!userId || !roleId) {
        return response.status(400).json({ error: 'Требуется идентификатор пользователя и роль' });
    }
    
    const user = database.users.find(user => user.user_id == userId);
    const role = database.roles.find(role => role.id == roleId);
    const character = database.characters.find(character => character.id == characterId);
    
    if (!user || !role) {
        return response.status(404).json({ error: 'Пользователь или роль не найдены' });
    }
    
    if (!user.is_registered) {
        return response.status(400).json({ error: 'Пользователь не зарегистрирован' });
    }
    
    const oldRole = user.class;
    
    user.class = role.name;
    user.character_id = characterId;
    user.character_name = character ? character.name : null;
    user.available_buttons = role.available_buttons;
    user.last_active = new Date().toISOString();
    
    addUserSparks(userId, SPARKS_SYSTEM.ROLE_CHANGE, 'role_change', `Смена роли: ${oldRole} → ${role.name}`);
    
    response.json({ 
        success: true, 
        message: 'Роль успешно изменена!',
        user: user
    });
});

// API для ролей и персонажей
app.get('/api/webapp/roles', (request, response) => {
    try {
        console.log('📋 Запрос на получение ролей');
        const roles = database.roles.filter(role => role.is_active);
        console.log('✅ Найдено ролей:', roles.length);
        response.json(roles);
    } catch (error) {
        console.error('❌ Ошибка получения ролей:', error);
        response.status(500).json({ error: 'Ошибка загрузки ролей' });
    }
});

app.get('/api/webapp/characters/:roleId', (request, response) => {
    try {
        const roleId = parseInt(request.params.roleId);
        console.log('👥 Запрос персонажей для роли:', roleId);
        
        const characters = database.characters.filter(character => 
            character.role_id === roleId && character.is_active
        );
        
        console.log('✅ Найдено персонажей:', characters.length);
        response.json(characters);
    } catch (error) {
        console.error('❌ Ошибка получения персонажей:', error);
        response.status(500).json({ error: 'Ошибка загрузки персонажей' });
    }
});

// API для квизов
app.get('/api/webapp/quizzes', (request, response) => {
    const userId = parseInt(request.query.userId);
    const quizzes = database.quizzes.filter(quiz => quiz.is_active);
    
    const quizzesWithStatus = quizzes.map(quiz => {
        const completion = database.quiz_completions.find(
            completion => completion.user_id === userId && completion.quiz_id === quiz.id
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
    
    response.json(quizzesWithStatus);
});

app.post('/api/webapp/quizzes/:quizId/submit', (request, response) => {
    const quizId = parseInt(request.params.quizId);
    const { userId, answers } = request.body;
    
    if (!userId) {
        return response.status(400).json({ error: 'Требуется идентификатор пользователя' });
    }
    
    const quiz = database.quizzes.find(quiz => quiz.id === quizId);
    if (!quiz) {
        return response.status(404).json({ error: 'Квиз не найден' });
    }
    
    const existingCompletion = database.quiz_completions.find(
        completion => completion.user_id === userId && completion.quiz_id === quizId
    );
    
    if (existingCompletion && !quiz.allow_retake) {
        return response.status(400).json({ error: 'Этот квиз нельзя пройти повторно' });
    }
    
    if (existingCompletion && quiz.cooldown_hours > 0) {
        const lastCompletion = new Date(existingCompletion.completed_at);
        const now = new Date();
        const hoursSinceCompletion = (now - lastCompletion) / (1000 * 60 * 60);
        
        if (hoursSinceCompletion < quiz.cooldown_hours) {
            const hoursLeft = Math.ceil(quiz.cooldown_hours - hoursSinceCompletion);
            return response.status(400).json({ 
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
        database.quiz_completions.push({
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
        addUserSparks(userId, sparksEarned, 'quiz', `Квиз: ${quiz.title}`);
    }
    
    response.json({
        success: true,
        correctAnswers,
        totalQuestions: quiz.questions.length,
        sparksEarned,
        perfectScore,
        scorePercentage: Math.round((correctAnswers / quiz.questions.length) * 100),
        message: perfectScore ? 
            `Идеально! 🎉 +${sparksEarned}✨` : 
            `Правильно: ${correctAnswers}/${quiz.questions.length}. +${sparksEarned}✨`
    });
});

// API для марафонов
app.get('/api/webapp/marathons', (request, response) => {
    const userId = parseInt(request.query.userId);
    const marathons = database.marathons.filter(marathon => marathon.is_active);
    
    const marathonsWithStatus = marathons.map(marathon => {
        const completion = database.marathon_completions.find(
            completion => completion.user_id === userId && completion.marathon_id === marathon.id
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
    
    response.json(marathonsWithStatus);
});

// API для магазина
app.get('/api/webapp/shop/items', (request, response) => {
    const items = database.shop_items.filter(item => item.is_active);
    response.json(items);
});

app.post('/api/webapp/shop/purchase', (request, response) => {
    const { userId, itemId } = request.body;
    
    if (!userId || !itemId) {
        return response.status(400).json({ error: 'Требуется идентификатор пользователя и товара' });
    }
    
    const user = database.users.find(user => user.user_id == userId);
    const item = database.shop_items.find(item => item.id == itemId && item.is_active);
    
    if (!user) return response.status(404).json({ error: 'Пользователь не найден' });
    if (!item) return response.status(404).json({ error: 'Товар не найден' });
    
    const existingPurchase = database.purchases.find(
        purchase => purchase.user_id === userId && purchase.item_id === itemId
    );
    
    if (existingPurchase) {
        return response.status(400).json({ error: 'Вы уже купили этот товар' });
    }
    
    if (user.sparks < item.price) {
        return response.status(400).json({ error: 'Недостаточно искр' });
    }
    
    user.sparks -= item.price;
    
    const purchase = {
        id: Date.now(),
        user_id: userId,
        item_id: itemId,
        price_paid: item.price,
        purchased_at: new Date().toISOString()
    };
    
    database.purchases.push(purchase);
    
    addUserSparks(userId, -item.price, 'purchase', `Покупка: ${item.title}`);
    
    response.json({
        success: true,
        message: `Покупка успешна! Куплено: ${item.title}`,
        remainingSparks: user.sparks,
        purchase: purchase
    });
});

app.get('/api/webapp/users/:userId/purchases', (request, response) => {
    const userId = parseInt(request.params.userId);
    const userPurchases = database.purchases
        .filter(purchase => purchase.user_id === userId)
        .map(purchase => {
            const item = database.shop_items.find(item => item.id === purchase.item_id);
            return { 
                ...purchase, 
                title: item?.title,
                description: item?.description,
                type: item?.type,
                file_url: item?.file_url,
                content_text: item?.content_text,
                preview_url: item?.preview_url,
                embed_html: item?.embed_html
            };
        })
        .sort((a, b) => new Date(b.purchased_at) - new Date(a.purchased_at));
        
    response.json({ purchases: userPurchases });
});

// API для активностей
app.get('/api/webapp/users/:userId/activities', (request, response) => {
    const userId = parseInt(request.params.userId);
    const userActivities = database.activities
        .filter(activity => activity.user_id === userId)
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .slice(0, 50);
    response.json({ activities: userActivities });
});

// API для работ
app.post('/api/webapp/upload-work', (request, response) => {
    const { userId, title, description, imageUrl, type } = request.body;
    
    if (!userId || !title || !imageUrl) {
        return response.status(400).json({ error: 'Требуется идентификатор пользователя, название и изображение' });
    }
    
    const user = database.users.find(user => user.user_id == userId);
    if (!user) return response.status(404).json({ error: 'Пользователь не найден' });
    
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
    
    database.user_works.push(newWork);
    
    addUserSparks(userId, SPARKS_SYSTEM.UPLOAD_WORK, 'upload_work', `Загрузка работы: ${title}`);
    
    response.json({
        success: true,
        message: `Работа успешно загружена! Получено +${SPARKS_SYSTEM.UPLOAD_WORK}✨`,
        workId: newWork.id,
        work: newWork
    });
});

app.get('/api/webapp/users/:userId/works', (request, response) => {
    const userId = parseInt(request.params.userId);
    const userWorks = database.user_works
        .filter(work => work.user_id === userId)
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    response.json({ works: userWorks });
});

// API для постов
app.get('/api/webapp/channel-posts', (request, response) => {
    const posts = database.channel_posts
        .filter(post => post.is_active)
        .map(post => {
            const reviews = database.post_reviews.filter(review => review.post_id === post.post_id);
            return {
                ...post,
                reviews_count: reviews.length,
                average_rating: reviews.length > 0 ? 
                    reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length : 0
            };
        })
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        
    response.json({ posts: posts });
});

// API для интерактивов
app.get('/api/webapp/interactives', (request, response) => {
    const userId = parseInt(request.query.userId);
    const interactives = database.interactives.filter(interactive => interactive.is_active);
    
    const interactivesWithStatus = interactives.map(interactive => {
        const completion = database.interactive_completions.find(
            completion => completion.user_id === userId && completion.interactive_id === interactive.id
        );
        
        return {
            ...interactive,
            completed: !!completion,
            user_score: completion ? completion.score : 0,
            can_retake: interactive.allow_retake && !completion
        };
    });
    
    response.json(interactivesWithStatus);
});

// API для приватных видео
app.get('/api/webapp/private-videos', (request, response) => {
    const userId = parseInt(request.query.userId);
    const videos = database.private_channel_videos.filter(video => video.is_active);
    
    const videosWithAccess = videos.map(video => {
        const hasAccess = database.video_access.some(
            access => access.user_id === userId && access.video_id === video.id
        );
        
        return {
            ...video,
            has_access: hasAccess,
            can_purchase: !hasAccess
        };
    });
    
    response.json({ videos: videosWithAccess });
});

app.post('/api/webapp/private-videos/purchase', async (request, response) => {
    const { userId, videoId } = request.body;
    
    if (!userId || !videoId) {
        return response.status(400).json({ error: 'Требуется идентификатор пользователя и видео' });
    }
    
    const user = database.users.find(user => user.user_id == userId);
    const video = database.private_channel_videos.find(video => video.id == videoId && video.is_active);
    
    if (!user) return response.status(404).json({ error: 'Пользователь не найден' });
    if (!video) return response.status(404).json({ error: 'Видео не найдено' });
    
    const existingAccess = database.video_access.find(
        access => access.user_id === userId && access.video_id === videoId
    );
    
    if (existingAccess) {
        return response.status(400).json({ error: 'У вас уже есть доступ к этому видео' });
    }
    
    if (user.sparks < video.price) {
        return response.status(400).json({ error: 'Недостаточно искр' });
    }
    
    try {
        user.sparks -= video.price;
        
        const accessRecord = {
            id: Date.now(),
            user_id: userId,
            video_id: videoId,
            purchased_at: new Date().toISOString(),
            access_expires: null,
            telegram_message_id: null
        };
        
        database.video_access.push(accessRecord);
        
        addUserSparks(userId, -video.price, 'private_video_purchase', `Покупка доступа к видео: ${video.title}`);
        
        response.json({
            success: true,
            message: `Доступ к видео "${video.title}" предоставлен!`,
            remainingSparks: user.sparks,
            access: accessRecord
        });
        
    } catch (error) {
        console.error('Ошибка при покупке доступа к видео:', error);
        user.sparks += video.price;
        response.status(500).json({ error: 'Ошибка предоставления доступа' });
    }
});

// Админ API
app.get('/api/admin/stats', requireAdminAuthentication, (request, response) => {
    const stats = {
        totalUsers: database.users.length,
        registeredUsers: database.users.filter(user => user.is_registered).length,
        activeQuizzes: database.quizzes.filter(quiz => quiz.is_active).length,
        activeMarathons: database.marathons.filter(marathon => marathon.is_active).length,
        shopItems: database.shop_items.filter(item => item.is_active).length,
        totalSparks: database.users.reduce((sum, user) => sum + user.sparks, 0),
        totalAdmins: database.admins.length,
        pendingReviews: database.post_reviews.filter(review => review.status === 'pending').length,
        pendingWorks: database.user_works.filter(work => work.status === 'pending').length,
        totalPosts: database.channel_posts.filter(post => post.is_active).length,
        totalPurchases: database.purchases.length,
        totalActivities: database.activities.length,
        interactives: database.interactives.filter(interactive => interactive.is_active).length,
        privateVideos: database.private_channel_videos.filter(video => video.is_active).length
    };
    response.json(stats);
});

// Запуск сервера
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Сервер запущен на порту ${PORT}`);
    console.log(`📱 WebApp доступен по адресу: ${process.env.APP_URL || `http://localhost:${PORT}`}`);
    console.log(`🔧 Админ панель: ${process.env.APP_URL || `http://localhost:${PORT}`}/admin.html`);
    console.log(`🎯 Квизов: ${database.quizzes.length}`);
    console.log(`🏃‍♂️ Марафонов: ${database.marathons.length}`);
    console.log(`🎮 Интерактивов: ${database.interactives.length}`);
    console.log(`🛒 Товаров: ${database.shop_items.length}`);
    console.log(`🎬 Приватных видео: ${database.private_channel_videos.length}`);
    console.log(`👥 Пользователей: ${database.users.length}`);
    console.log('✅ Все системы работают корректно!');
});

// Инициализация Telegram бота
let telegramBot;
if (process.env.BOT_TOKEN) {
    try {
        telegramBot = new TelegramBot(process.env.BOT_TOKEN, { polling: true });
        
        console.log('✅ Telegram Bot инициализирован');

        telegramBot.onText(/\/start/, (message) => {
            const chatId = message.chat.id;
            const name = message.from.first_name || 'Друг';
            const userId = message.from.id;
            
            let user = database.users.find(user => user.user_id === userId);
            if (!user) {
                user = {
                    id: Date.now(),
                    user_id: userId,
                    tg_first_name: message.from.first_name,
                    tg_username: message.from.username,
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
                database.users.push(user);
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
                        web_app: { url: process.env.APP_URL || `http://localhost:${PORT}` }
                    }
                ]]
            };

            telegramBot.sendMessage(chatId, welcomeText, {
                parse_mode: 'Markdown',
                reply_markup: keyboard
            });
        });

        telegramBot.onText(/\/admin/, (message) => {
            const chatId = message.chat.id;
            const userId = message.from.id;
            
            const admin = database.admins.find(admin => admin.user_id == userId);
            if (!admin) {
                telegramBot.sendMessage(chatId, '❌ У вас нет прав доступа к админ панели.');
                return;
            }
            
            const baseUrl = process.env.APP_URL || `http://localhost:${PORT}`;
            const adminUrl = `${baseUrl}/admin.html?userId=${userId}`;
            
            const keyboard = {
                inline_keyboard: [[
                    {
                        text: "🔧 Открыть Админ Панель",
                        url: adminUrl
                    }
                ]]
            };
            
            telegramBot.sendMessage(chatId, `🔧 Панель администратора\n\nНажмите кнопку ниже чтобы открыть админ панель:`, {
                parse_mode: 'Markdown',
                reply_markup: keyboard
            });
        });

    } catch (error) {
        console.error('❌ Ошибка инициализации бота:', error);
    }
} else {
    console.log('⚠️ Telegram Bot не инициализирован (отсутствует BOT_TOKEN)');
}
