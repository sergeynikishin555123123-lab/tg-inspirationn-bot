// server.js - Полная исправленная версия сервера Мастерской Вдохновения v9.0
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

// Автоматическое определение пути для TimeWeb
const APP_ROOT = process.cwd();

console.log('🎨 Мастерская Вдохновения - Запуск системы v9.0...');
console.log('📁 Текущая рабочая директория:', APP_ROOT);

// Расширенная in-memory база данных с полным набором данных
let db = {
    users: [
        {
            id: 1,
            user_id: 12345,
            tg_first_name: 'Тестовый Пользователь',
            tg_username: 'test_user',
            sparks: 145.5,
            level: 'Знаток',
            is_registered: true,
            class: 'Художники',
            character_id: 1,
            character_name: 'Лука Цветной',
            available_buttons: ['quiz', 'marathon', 'works', 'activities', 'posts', 'shop', 'invite', 'interactives', 'change_role'],
            registration_date: new Date().toISOString(),
            last_active: new Date().toISOString(),
            total_activities: 23,
            completed_quizzes: 5,
            completed_marathons: 2,
            uploaded_works: 3,
            email: null,
            phone: null,
            bio: '',
            avatar_url: null,
            is_premium: false,
            premium_until: null,
            notifications_enabled: true,
            email_notifications: false
        },
        {
            id: 2,
            user_id: 898508164,
            tg_first_name: 'Администратор',
            tg_username: 'admin',
            sparks: 1250.0,
            level: 'Мастер',
            is_registered: true,
            class: 'Художники',
            character_id: 1,
            character_name: 'Лука Цветной',
            available_buttons: ['quiz', 'marathon', 'works', 'activities', 'posts', 'shop', 'invite', 'interactives', 'change_role'],
            registration_date: new Date().toISOString(),
            last_active: new Date().toISOString(),
            total_activities: 156,
            completed_quizzes: 12,
            completed_marathons: 8,
            uploaded_works: 15,
            email: 'admin@inspiration.ru',
            phone: null,
            bio: 'Главный администратор системы',
            avatar_url: null,
            is_premium: true,
            premium_until: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
            notifications_enabled: true,
            email_notifications: true
        }
    ],
    roles: [
        {
            id: 1,
            name: 'Художники',
            description: 'Творцы изобразительного искусства. Создают картины, иллюстрации, работают с цветом и композицией.',
            icon: '🎨',
            available_buttons: ['quiz', 'marathon', 'works', 'activities', 'posts', 'shop', 'invite', 'interactives', 'change_role'],
            is_active: true,
            created_at: new Date().toISOString(),
            color: '#FF6B6B',
            requirements: 'Любовь к визуальному искусству',
            level_requirements: {
                'Ученик': 0,
                'Искатель': 50,
                'Знаток': 150,
                'Мастер': 300,
                'Наставник': 500,
                'Легенда': 1000
            },
            permissions: {
                can_upload_works: true,
                can_participate_marathons: true,
                can_take_quizzes: true,
                can_use_shop: true,
                can_invite_friends: true,
                max_works_per_day: 5,
                max_quiz_attempts: 3
            }
        },
        {
            id: 2,
            name: 'Стилисты',
            description: 'Мастера создания образов и стилей. Работают с модой, внешностью и гардеробом.',
            icon: '👗',
            available_buttons: ['quiz', 'marathon', 'works', 'activities', 'posts', 'shop', 'invite', 'interactives', 'change_role'],
            is_active: true,
            created_at: new Date().toISOString(),
            color: '#4ECDC4',
            requirements: 'Чувство стиля и вкуса',
            level_requirements: {
                'Ученик': 0,
                'Искатель': 50,
                'Знаток': 150,
                'Мастер': 300,
                'Наставник': 500,
                'Легенда': 1000
            },
            permissions: {
                can_upload_works: true,
                can_participate_marathons: true,
                can_take_quizzes: true,
                can_use_shop: true,
                can_invite_friends: true,
                max_works_per_day: 5,
                max_quiz_attempts: 3
            }
        },
        {
            id: 3,
            name: 'Фотографы',
            description: 'Мастера запечатления моментов. Работают со светом, композицией и техникой фотографии.',
            icon: '📷',
            available_buttons: ['quiz', 'marathon', 'works', 'activities', 'posts', 'shop', 'invite', 'interactives', 'change_role'],
            is_active: true,
            created_at: new Date().toISOString(),
            color: '#45B7D1',
            requirements: 'Любовь к фотографии и визуальному повествованию',
            level_requirements: {
                'Ученик': 0,
                'Искатель': 50,
                'Знаток': 150,
                'Мастер': 300,
                'Наставник': 500,
                'Легенда': 1000
            },
            permissions: {
                can_upload_works: true,
                can_participate_marathons: true,
                can_take_quizzes: true,
                can_use_shop: true,
                can_invite_friends: true,
                max_works_per_day: 5,
                max_quiz_attempts: 3
            }
        }
    ],
    characters: [
        { 
            id: 1, 
            role_id: 1, 
            name: 'Лука Цветной', 
            description: 'Эксперт по цвету и композиции. Помогает понять гармонию оттенков и создавать выразительные работы.', 
            bonus_type: 'percent_bonus', 
            bonus_value: '10',
            bonus_description: '+10% к искрам за квизы',
            is_active: true,
            created_at: new Date().toISOString(),
            avatar: '🎨',
            personality: 'Энергичный и вдохновляющий',
            quote: 'Цвет - это голос души художника',
            level_requirement: 0,
            rarity: 'common'
        },
        { 
            id: 2, 
            role_id: 2, 
            name: 'Стелла Элеганс', 
            description: 'Мастер стиля и элегантности. Помогает создавать гармоничные образы и развивать чувство вкуса.', 
            bonus_type: 'forgiveness', 
            bonus_value: '1',
            bonus_description: '1 прощение ошибки в квизах в день',
            is_active: true,
            created_at: new Date().toISOString(),
            avatar: '👗',
            personality: 'Утонченная и внимательная к деталям',
            quote: 'Стиль - это способ сказать, кто ты, не произнося ни слова',
            level_requirement: 0,
            rarity: 'common'
        }
    ],
    quizzes: [
        {
            id: 1,
            title: "🎨 Основы живописи",
            description: "Проверьте свои знания основ живописи: цвета, композиция, техники",
            questions: [
                {
                    id: 1,
                    question: "Кто написал знаменитую картину 'Мона Лиза'?",
                    options: ["Винсент Ван Гог", "Леонардо да Винчи", "Пабло Пикассо", "Клод Моне"],
                    correctAnswer: 1,
                    explanation: "Мона Лиза была написана Леонардо да Винчи в период 1503-1506 годов.",
                    image_url: null,
                    points: 1,
                    time_limit: 30
                },
                {
                    id: 2,
                    question: "Какие три цвета являются основными в живописи?",
                    options: ["Красный, синий, зеленый", "Красный, желтый, синий", "Фиолетовый, оранжевый, зеленый", "Черный, белый, серый"],
                    correctAnswer: 1,
                    explanation: "Основные цвета - красный, желтый и синий. Из них можно получить все остальные цвета.",
                    image_url: null,
                    points: 1,
                    time_limit: 30
                },
                {
                    id: 3,
                    question: "Что такое композиция в живописи?",
                    options: ["Тип краски", "Расположение элементов на картине", "Стиль рисования", "Размер холста"],
                    correctAnswer: 1,
                    explanation: "Композиция - это расположение и взаимосвязь элементов произведения искусства.",
                    image_url: null,
                    points: 1,
                    time_limit: 30
                }
            ],
            sparks_per_correct: 2,
            sparks_perfect_bonus: 10,
            cooldown_hours: 24,
            allow_retake: true,
            is_active: true,
            difficulty: 'beginner',
            category: 'painting',
            duration_minutes: 10,
            created_at: new Date().toISOString(),
            attempts_count: 156,
            average_score: 3.8,
            tags: ['живопись', 'основы', 'цвета', 'композиция'],
            requirements: {
                min_level: 'Ученик',
                required_roles: [1],
                max_attempts_per_day: 3
            },
            cover_image: null,
            instructor: 'Лука Цветной',
            rating: 4.5,
            featured: true
        },
        {
            id: 2,
            title: "👗 История моды XX века",
            description: "Узнайте о ключевых тенденциях и дизайнерах, определивших моду прошлого века",
            questions: [
                {
                    id: 1,
                    question: "Кто считается создателем маленького черного платья?",
                    options: ["Коко Шанель", "Кристиан Диор", "Ив Сен-Лоран", "Джорджио Армани"],
                    correctAnswer: 0,
                    explanation: "Коко Шанель популяризировала маленькое черное платье в 1920-х годах.",
                    image_url: null,
                    points: 1,
                    time_limit: 30
                }
            ],
            sparks_per_correct: 3,
            sparks_perfect_bonus: 15,
            cooldown_hours: 24,
            allow_retake: true,
            is_active: true,
            difficulty: 'intermediate',
            category: 'fashion',
            duration_minutes: 15,
            created_at: new Date().toISOString(),
            attempts_count: 89,
            average_score: 4.2,
            tags: ['мода', 'история', 'стиль', 'дизайнеры'],
            requirements: {
                min_level: 'Искатель',
                required_roles: [2],
                max_attempts_per_day: 2
            },
            cover_image: null,
            instructor: 'Стелла Элеганс',
            rating: 4.7,
            featured: false
        }
    ],
    marathons: [
        {
            id: 1,
            title: "🏃‍♂️ Марафон акварели для начинающих",
            description: "7-дневный интенсив по основам акварельной живописи. Научитесь работать с цветом и водой.",
            duration_days: 7,
            tasks: [
                { 
                    day: 1, 
                    title: "Основные техники акварели", 
                    description: "Изучите основные техники работы с акварелью: заливка, лессировка, работа по-мокрому",
                    requires_submission: true,
                    submission_type: "image",
                    instructions: "Создайте небольшую работу, демонстрирующую три основные техники акварели",
                    tips: ["Используйте качественную бумагу", "Экспериментируйте с количеством воды", "Не бойтесь ошибок"],
                    resources: [
                        {
                            type: 'video',
                            title: 'Техники акварели для начинающих',
                            url: 'https://example.com/video1',
                            duration: '15 мин'
                        },
                        {
                            type: 'article',
                            title: 'Основы работы с акварелью',
                            url: 'https://example.com/article1'
                        }
                    ],
                    sparks_reward: 10,
                    max_points: 10
                },
                { 
                    day: 2, 
                    title: "Цветовой круг и смешивание", 
                    description: "Освойте основы цветоведения и научитесь смешивать цвета",
                    requires_submission: true,
                    submission_type: "image",
                    instructions: "Создайте цветовой круг и покажите 3 примера смешивания цветов",
                    tips: ["Начните с основных цветов", "Экспериментируйте с пропорциями", "Записывайте успешные комбинации"],
                    resources: [
                        {
                            type: 'video',
                            title: 'Смешивание цветов в акварели',
                            url: 'https://example.com/video2',
                            duration: '12 мин'
                        }
                    ],
                    sparks_reward: 10,
                    max_points: 10
                }
            ],
            sparks_per_day: 10,
            sparks_completion_bonus: 50,
            is_active: true,
            difficulty: 'beginner',
            category: 'painting',
            participants_count: 234,
            completion_rate: 68,
            created_at: new Date().toISOString(),
            cover_image: '',
            requirements: "Наличие базовых акварельных красок, кистей и бумаги",
            tags: ['акварель', 'живопись', 'для начинающих', '7 дней'],
            instructor: 'Лука Цветной',
            level_requirement: 'Ученик',
            featured: true,
            start_date: new Date().toISOString(),
            end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            status: 'active'
        }
    ],
    shop_items: [
        {
            id: 1,
            title: "🎨 Полный курс акварели для начинающих",
            description: "15 подробных видеоуроков по основам акварельной живописи. От базовых техник до сложных работ.",
            type: "video_course",
            file_url: "data:application/pdf;base64,JVBERi0xLjcKJeLjz9MKMiAwIG9iago8PC9MZW5ndGggMzAgMCBSL0ZpbHRlci9GbGF0ZURlY29kZT4+CnN0cmVhbQp4nC3LMQ6AIAwF0D1",
            preview_url: "",
            price: 45,
            content_text: "В этом курсе вы научитесь: основным техникам акварели, смешиванию цветов, созданию композиции, работе со светом и тенью, рисованию пейзажей и портретов.",
            is_active: true,
            category: "painting",
            difficulty: "beginner",
            duration: "15 уроков",
            instructor: "Лука Цветной",
            rating: 4.8,
            students_count: 567,
            created_at: new Date().toISOString(),
            features: ["Пожизненный доступ", "Поддержка преподавателя", "Домашние задания", "Сертификат о завершении"],
            tags: ['акварель', 'курс', 'видео', 'для начинающих'],
            requirements: "Базовые художественные материалы",
            what_you_learn: [
                "Основные техники акварели",
                "Смешивание цветов",
                "Композиция и перспектива",
                "Работа со светом и тенью"
            ],
            featured: true,
            discount_percent: 0,
            original_price: 45
        },
        {
            id: 2,
            title: "📚 Энциклопедия современного искусства",
            description: "Полное руководство по современному искусству с анализом ключевых работ и художников.",
            type: "ebook",
            file_url: "data:application/pdf;base64,JVBERi0xLjcKJeLjz9MKMiAwIG9iago8PC9MZW5ndGggMzAgMCBSL0ZpbHRlci9GbGF0ZURlY29kZT4+CnN0cmVhbQp4nC3LMQ6AIAwF0D1",
            preview_url: "",
            price: 25,
            content_text: "Подробный анализ современных художественных течений, биографии ключевых художников, разбор знаковых произведений.",
            is_active: true,
            category: "art_history",
            difficulty: "intermediate",
            duration: "300 страниц",
            instructor: "Профессор Искусствовед",
            rating: 4.6,
            students_count: 234,
            created_at: new Date().toISOString(),
            features: ["PDF формат", "Иллюстрации высокого качества", "Интерактивное оглавление"],
            tags: ['искусство', 'книга', 'образование', 'современное искусство'],
            requirements: "Базовые знания истории искусства",
            what_you_learn: [
                "Основные течения современного искусства",
                "Анализ художественных произведений",
                "Биографии ключевых художников",
                "Критическое мышление в искусстве"
            ],
            featured: false,
            discount_percent: 20,
            original_price: 30
        }
    ],
    activities: [],
    admins: [
        { 
            id: 1, 
            user_id: 898508164, 
            username: 'admin', 
            role: 'superadmin', 
            permissions: ['all'],
            created_at: new Date().toISOString(),
            last_login: new Date().toISOString(),
            is_active: true,
            email: 'admin@inspiration.ru',
            phone: null
        }
    ],
    purchases: [],
    channel_posts: [
        {
            id: 1,
            post_id: 'post_1',
            title: '🎉 Добро пожаловать в Мастерскую Вдохновения!',
            content: 'Мы рады приветствовать вас в нашем творческом сообществе! Здесь вы найдете единомышленников, сможете развивать свои навыки и участвовать в увлекательных активностях.',
            image_url: '',
            video_url: '',
            media_type: 'text',
            admin_id: 898508164,
            created_at: new Date().toISOString(),
            is_active: true,
            telegram_message_id: null,
            action_type: 'welcome',
            action_target: null,
            likes_count: 45,
            comments_count: 12,
            views_count: 156,
            tags: ['новости', 'приветствие', 'сообщество'],
            featured: true,
            publish_date: new Date().toISOString(),
            excerpt: 'Приветственное сообщение для новых участников сообщества'
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
            description: "Определите художественную эпоху по фрагменту известной картины",
            type: "guess_era",
            category: "art_history",
            image_url: "",
            question: "Какой эпохе принадлежит этот фрагмент?",
            options: ["Ренессанс", "Барокко", "Импрессионизм", "Кубизм"],
            correct_answer: 0,
            sparks_reward: 5,
            allow_retake: false,
            is_active: true,
            difficulty: 'intermediate',
            created_at: new Date().toISOString(),
            attempts_count: 134,
            success_rate: 62,
            tags: ['искусство', 'история', 'викторина'],
            time_limit: 60,
            hints: [
                "Обратите внимание на технику исполнения",
                "Рассмотрите цветовую палитру",
                "Проанализируйте композицию"
            ],
            explanation: "Ренессанс характеризуется гармоничной композицией, реалистичным изображением и вниманием к анатомии человека.",
            featured: true,
            level_requirement: 'Искатель'
        }
    ],
    interactive_completions: [],
    interactive_submissions: [],
    marathon_submissions: [],
    user_sessions: [],
    notifications: [
        {
            id: 1,
            user_id: 898508164,
            title: "👋 Добро пожаловать!",
            message: "Вы успешно зарегистрировались в Мастерской Вдохновения! Начните с прохождения первого квиза.",
            type: "welcome",
            is_read: false,
            created_at: new Date().toISOString(),
            action_url: "/quizzes",
            action_text: "Начать квиз",
            priority: "high",
            expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
        }
    ],
    achievements: [
        {
            id: 1,
            title: "Первый шаг",
            description: "Зарегистрироваться в системе",
            icon: "👣",
            sparks_reward: 10,
            condition_type: "registration",
            condition_value: "1",
            is_active: true,
            category: "general",
            rarity: "common",
            points: 10,
            hidden: false
        },
        {
            id: 2,
            title: "Любознательный",
            description: "Пройдите свой первый квиз",
            icon: "🎯",
            sparks_reward: 15,
            condition_type: "quiz_completion",
            condition_value: "1",
            is_active: true,
            category: "quizzes",
            rarity: "common",
            points: 15,
            hidden: false
        },
        {
            id: 3,
            title: "Перфекционист",
            description: "Пройдите квиз с идеальным результатом",
            icon: "⭐",
            sparks_reward: 25,
            condition_type: "perfect_quiz",
            condition_value: "1",
            is_active: true,
            category: "quizzes",
            rarity: "rare",
            points: 25,
            hidden: false
        }
    ],
    user_achievements: [],
    settings: [
        {
            key: "app_name",
            value: "Мастерская Вдохновения",
            description: "Название приложения"
        },
        {
            key: "app_version",
            value: "9.0.0",
            description: "Версия приложения"
        },
        {
            key: "maintenance_mode",
            value: "false",
            description: "Режим технического обслуживания"
        },
        {
            key: "registration_enabled",
            value: "true",
            description: "Разрешена ли регистрация новых пользователей"
        },
        {
            key: "max_upload_size",
            value: "10",
            description: "Максимальный размер загружаемого файла (МБ)"
        },
        {
            key: "default_sparks",
            value: "10",
            description: "Количество искр при регистрации"
        },
        {
            key: "contact_email",
            value: "support@inspiration.ru",
            description: "Контактный email"
        }
    ],
    user_invites: [],
    coupons: [],
    user_friends: [],
    user_follows: [],
    reports: [],
    feedback: [],
    system_logs: []
};

app.use(express.json({ limit: '50mb' }));
app.use(cors());
app.use(bodyParser.urlencoded({ extended: true }));

// ==================== СТАТИЧЕСКИЕ ФАЙЛЫ ====================
app.use(express.static(join(APP_ROOT, 'public')));
app.use('/admin', express.static(join(APP_ROOT, 'admin')));

app.get('/admin', (req, res) => {
    res.sendFile(join(APP_ROOT, 'admin', 'index.html'));
});

app.get('/admin/*', (req, res) => {
    res.sendFile(join(APP_ROOT, 'admin', 'index.html'));
});

console.log('🎨 Система инициализирована успешно!');

// УЛУЧШЕННАЯ СИСТЕМА НАЧИСЛЕНИЯ ИСКР
const SPARKS_SYSTEM = {
    QUIZ_PER_CORRECT_ANSWER: 2,
    QUIZ_PERFECT_BONUS: 10,
    MARATHON_DAY_COMPLETION: 7,
    MARATHON_COMPLETION_BONUS: 50,
    INVITE_FRIEND: 10,
    WRITE_REVIEW: 3,
    DAILY_COMMENT: 1,
    UPLOAD_WORK: 5,
    WORK_APPROVED: 15,
    REGISTRATION_BONUS: 10,
    PARTICIPATE_POLL: 2,
    INTERACTIVE_COMPLETION: 5,
    INTERACTIVE_SUBMISSION: 2,
    COMPLIMENT_CHALLENGE: 0.5,
    MARATHON_SUBMISSION: 5,
    ROLE_CHANGE: 0,
    ACHIEVEMENT_REWARD: 25,
    DAILY_LOGIN: 1,
    PROFILE_COMPLETION: 5,
    SOCIAL_SHARE: 3,
    PREMIUM_BONUS: 2
};

// Вспомогательные функции
function calculateLevel(sparks) {
    if (sparks >= 1000) return 'Легенда';
    if (sparks >= 500) return 'Наставник';
    if (sparks >= 300) return 'Мастер';
    if (sparks >= 150) return 'Знаток';
    if (sparks >= 50) return 'Искатель';
    return 'Ученик';
}

// УЛУЧШЕННАЯ СИСТЕМА НАЧИСЛЕНИЯ ИСКР
function addSparks(userId, sparks, activityType, description, metadata = {}) {
    const user = db.users.find(u => u.user_id == userId);
    if (user) {
        user.sparks = Math.max(0, user.sparks + sparks);
        user.level = calculateLevel(user.sparks);
        user.last_active = new Date().toISOString();
        
        // Обновляем статистику пользователя
        user.total_activities = (user.total_activities || 0) + 1;
        
        const activity = {
            id: Date.now(),
            user_id: userId,
            activity_type: activityType,
            sparks_earned: sparks,
            description: description,
            created_at: new Date().toISOString(),
            metadata: metadata
        };
        
        db.activities.push(activity);
        
        // Проверяем достижения
        checkAchievements(userId);
        
        console.log(`✨ Начислено ${sparks} искр пользователю ${userId} за ${activityType}`);
        return activity;
    }
    return null;
}

function checkAchievements(userId) {
    const user = db.users.find(u => u.user_id == userId);
    if (!user) return;

    const userActivities = db.activities.filter(a => a.user_id == userId);
    const userAchievements = db.user_achievements.filter(ua => ua.user_id == userId);
    const quizCompletions = db.quiz_completions.filter(qc => qc.user_id == userId);
    const works = db.user_works.filter(w => w.user_id == userId);
    const marathonCompletions = db.marathon_completions.filter(mc => mc.user_id == userId && mc.completed);
    const interactiveCompletions = db.interactive_completions.filter(ic => ic.user_id == userId);

    db.achievements.forEach(achievement => {
        const hasAchievement = userAchievements.some(ua => ua.achievement_id == achievement.id);
        if (hasAchievement) return;

        let conditionMet = false;

        switch (achievement.condition_type) {
            case 'registration':
                conditionMet = user.is_registered;
                break;
            case 'quiz_completion':
                conditionMet = quizCompletions.length >= parseInt(achievement.condition_value);
                break;
            case 'work_upload':
                conditionMet = works.length >= parseInt(achievement.condition_value);
                break;
            case 'sparks_total':
                conditionMet = user.sparks >= parseInt(achievement.condition_value);
                break;
            case 'marathon_completion':
                conditionMet = marathonCompletions.length >= parseInt(achievement.condition_value);
                break;
            case 'perfect_quiz':
                conditionMet = quizCompletions.filter(qc => qc.perfect_score).length >= parseInt(achievement.condition_value);
                break;
            case 'interactive_completion':
                conditionMet = interactiveCompletions.length >= parseInt(achievement.condition_value);
                break;
            case 'level_reached':
                conditionMet = user.level === achievement.condition_value;
                break;
        }

        if (conditionMet) {
            const userAchievement = {
                id: Date.now(),
                user_id: userId,
                achievement_id: achievement.id,
                earned_at: new Date().toISOString(),
                sparks_claimed: false
            };
            
            db.user_achievements.push(userAchievement);
            
            const notification = {
                id: Date.now(),
                user_id: userId,
                title: "🏆 Новое достижение!",
                message: `Вы получили достижение "${achievement.title}"!`,
                type: "achievement",
                is_read: false,
                created_at: new Date().toISOString(),
                action_url: "/achievements",
                action_text: "Посмотреть достижения",
                priority: "medium"
            };
            
            db.notifications.push(notification);
        }
    });
}

function validateUserData(userData) {
    const errors = [];
    
    if (!userData.user_id || userData.user_id < 1) {
        errors.push('Invalid user ID');
    }
    
    if (!userData.tg_first_name || userData.tg_first_name.length < 2) {
        errors.push('First name must be at least 2 characters');
    }
    
    if (userData.sparks < 0) {
        errors.push('Sparks cannot be negative');
    }
    
    return errors;
}

function validateQuizData(quizData) {
    const errors = [];
    
    if (!quizData.title || quizData.title.length < 5) {
        errors.push('Quiz title must be at least 5 characters');
    }
    
    if (!quizData.questions || !Array.isArray(quizData.questions) || quizData.questions.length === 0) {
        errors.push('Quiz must have at least one question');
    }
    
    quizData.questions.forEach((question, index) => {
        if (!question.question || question.question.length < 10) {
            errors.push(`Question ${index + 1} must be at least 10 characters`);
        }
        
        if (!question.options || !Array.isArray(question.options) || question.options.length < 2) {
            errors.push(`Question ${index + 1} must have at least 2 options`);
        }
        
        if (question.correctAnswer === undefined || question.correctAnswer < 0) {
            errors.push(`Question ${index + 1} must have a correct answer`);
        }
    });
    
    return errors;
}

function getUserStats(userId) {
    const user = db.users.find(u => u.user_id == userId);
    if (!user) return null;
    
    const activities = db.activities.filter(a => a.user_id == userId);
    const purchases = db.purchases.filter(p => p.user_id == userId);
    const works = db.user_works.filter(w => w.user_id == userId);
    const quizCompletions = db.quiz_completions.filter(q => q.user_id == userId);
    const marathonCompletions = db.marathon_completions.filter(m => m.user_id == userId);
    const interactiveCompletions = db.interactive_completions.filter(i => i.user_id == userId);
    const userAchievements = db.user_achievements.filter(ua => ua.user_id == userId);
    
    const today = new Date().toDateString();
    const todayActivities = activities.filter(a => 
        new Date(a.created_at).toDateString() === today
    );
    
    return {
        totalActivities: activities.length,
        todayActivities: todayActivities.length,
        totalPurchases: purchases.length,
        totalWorks: works.length,
        approvedWorks: works.filter(w => w.status === 'approved').length,
        totalQuizzesCompleted: quizCompletions.length,
        totalMarathonsCompleted: marathonCompletions.filter(m => m.completed).length,
        totalInteractivesCompleted: interactiveCompletions.length,
        totalSparksEarned: activities.reduce((sum, a) => sum + a.sparks_earned, 0),
        totalAchievements: userAchievements.length,
        registrationDate: user.registration_date,
        lastActive: user.last_active,
        streak: calculateStreak(userId),
        levelProgress: calculateLevelProgress(user.sparks)
    };
}

function calculateStreak(userId) {
    const activities = db.activities
        .filter(a => a.user_id == userId)
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    
    if (activities.length === 0) return 0;
    
    let streak = 0;
    let currentDate = new Date();
    
    // Проверяем активность за сегодня
    const today = currentDate.toDateString();
    const hasActivityToday = activities.some(a => 
        new Date(a.created_at).toDateString() === today
    );
    
    if (!hasActivityToday) return 0;
    
    streak = 1;
    currentDate.setDate(currentDate.getDate() - 1);
    
    // Проверяем предыдущие дни
    while (true) {
        const dateStr = currentDate.toDateString();
        const hasActivity = activities.some(a => 
            new Date(a.created_at).toDateString() === dateStr
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

function calculateLevelProgress(sparks) {
    const levels = {
        'Ученик': 0,
        'Искатель': 50,
        'Знаток': 150,
        'Мастер': 300,
        'Наставник': 500,
        'Легенда': 1000
    };
    
    const currentLevel = calculateLevel(sparks);
    const levelKeys = Object.keys(levels);
    const currentIndex = levelKeys.indexOf(currentLevel);
    
    if (currentIndex === levelKeys.length - 1) {
        return 100; // Максимальный уровень
    }
    
    const currentLevelMin = levels[currentLevel];
    const nextLevelMin = levels[levelKeys[currentIndex + 1]];
    const progress = ((sparks - currentLevelMin) / (nextLevelMin - currentLevelMin)) * 100;
    
    return Math.min(Math.max(progress, 0), 100);
}

const rateLimit = new Map();

function checkRateLimit(userId, action, limit = 10, windowMs = 60000) {
    const key = `${userId}_${action}`;
    const now = Date.now();
    const windowStart = now - windowMs;
    
    if (!rateLimit.has(key)) {
        rateLimit.set(key, []);
    }
    
    const requests = rateLimit.get(key).filter(time => time > windowStart);
    rateLimit.set(key, requests);
    
    if (requests.length >= limit) {
        return false;
    }
    
    requests.push(now);
    return true;
}

// Middleware для rate limiting
const requireRateLimit = (action, limit = 10, windowMs = 60000) => {
    return (req, res, next) => {
        const userId = req.query.userId || req.body.userId;
        
        if (!userId) {
            return res.status(400).json({ error: 'User ID required for rate limiting' });
        }
        
        if (!checkRateLimit(userId, action, limit, windowMs)) {
            return res.status(429).json({ 
                error: `Too many requests. Please try again in ${Math.ceil(windowMs/1000/60)} minutes.` 
            });
        }
        
        next();
    };
};

function findUserDuplicate(userId, username) {
    return db.users.find(u => 
        u.user_id === userId || 
        (username && u.tg_username === username)
    );
}

function findQuizDuplicate(title) {
    return db.quizzes.find(q => 
        q.title.toLowerCase() === title.toLowerCase() && q.is_active
    );
}

function findShopItemDuplicate(title) {
    return db.shop_items.find(i => 
        i.title.toLowerCase() === title.toLowerCase() && i.is_active
    );
}

function findMarathonDuplicate(title) {
    return db.marathons.find(m => 
        m.title.toLowerCase() === title.toLowerCase() && m.is_active
    );
}

// Middleware
const requireAdmin = (req, res, next) => {
    const userId = req.query.userId || req.body.userId;
    
    if (!userId) {
        return res.status(401).json({ error: 'User ID required' });
    }
    
    const admin = db.admins.find(a => a.user_id == userId && a.is_active);
    if (!admin) {
        return res.status(403).json({ error: 'Admin access required' });
    }
    
    req.admin = admin;
    next();
};

const requireAuth = (req, res, next) => {
    const userId = req.query.userId || req.body.userId;
    
    if (!userId) {
        return res.status(401).json({ error: 'User ID required' });
    }
    
    const user = db.users.find(u => u.user_id == userId);
    if (!user) {
        return res.status(404).json({ error: 'User not found' });
    }
    
    req.user = user;
    next();
};

// Basic routes
app.get('/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        version: '9.0.0',
        database: 'In-Memory',
        users: db.users.length,
        quizzes: db.quizzes.length,
        marathons: db.marathons.length,
        shop_items: db.shop_items.length,
        interactives: db.interactives.length,
        posts: db.channel_posts.length,
        uptime: process.uptime()
    });
});

// WebApp API
app.get('/api/users/:userId', requireAuth, (req, res) => {
    const userId = parseInt(req.params.userId);
    const user = db.users.find(u => u.user_id === userId);
    
    if (user) {
        const stats = getUserStats(userId);
        const userAchievements = db.user_achievements
            .filter(ua => ua.user_id === userId)
            .map(ua => {
                const achievement = db.achievements.find(a => a.id === ua.achievement_id);
                return {
                    ...ua,
                    title: achievement?.title,
                    description: achievement?.description,
                    icon: achievement?.icon,
                    sparks_reward: achievement?.sparks_reward,
                    category: achievement?.category,
                    rarity: achievement?.rarity
                };
            });
        
        const notifications = db.notifications
            .filter(n => n.user_id === userId && !n.is_read)
            .slice(0, 10);
            
        res.json({ 
            exists: true, 
            user: {
                ...user,
                stats: stats,
                achievements: userAchievements,
                unread_notifications: notifications.length
            }
        });
    } else {
        res.status(404).json({ error: 'User not found' });
    }
});

// НОВЫЙ МЕТОД ДЛЯ СМЕНЫ РОЛИ
app.post('/api/users/change-role', requireAuth, (req, res) => {
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

app.post('/api/users/register', (req, res) => {
    const { userId, firstName, roleId, characterId } = req.body;
    
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
            tg_username: req.body.username || null,
            sparks: SPARKS_SYSTEM.REGISTRATION_BONUS,
            level: 'Ученик',
            is_registered: true,
            class: role.name,
            character_id: characterId,
            character_name: character ? character.name : null,
            available_buttons: role.available_buttons,
            registration_date: new Date().toISOString(),
            last_active: new Date().toISOString(),
            total_activities: 0,
            completed_quizzes: 0,
            completed_marathons: 0,
            uploaded_works: 0,
            email: null,
            phone: null,
            bio: '',
            avatar_url: null,
            is_premium: false,
            premium_until: null,
            notifications_enabled: true,
            email_notifications: false
        };
        db.users.push(user);
    } else {
        user.tg_first_name = firstName;
        user.class = role.name;
        user.character_id = characterId;
        user.character_name = character ? character.name : null;
        user.is_registered = true;
        user.available_buttons = role.available_buttons;
        user.last_active = new Date().toISOString();
    }
    
    let message = 'Регистрация успешна!';
    let sparksAdded = SPARKS_SYSTEM.REGISTRATION_BONUS;
    
    if (isNewUser) {
        addSparks(userId, sparksAdded, 'registration', 'Регистрация');
        message = `Регистрация успешна! +${sparksAdded}✨`;
        
        const notification = {
            id: Date.now(),
            user_id: userId,
            title: "🎉 Добро пожаловать!",
            message: "Вы успешно зарегистрировались в Мастерской Вдохновения! Начните с прохождения первого квиза.",
            type: "welcome",
            is_read: false,
            created_at: new Date().toISOString(),
            action_url: "/quizzes",
            action_text: "Начать квиз",
            priority: "high"
        };
        db.notifications.push(notification);
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

app.get('/api/webapp/quizzes', requireAuth, (req, res) => {
    const userId = parseInt(req.user.user_id);
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
        
        // Проверяем ограничения по попыткам в день
        const today = new Date().toDateString();
        const todayAttempts = db.quiz_completions.filter(
            qc => qc.user_id === userId && 
                  qc.quiz_id === quiz.id &&
                  new Date(qc.completed_at).toDateString() === today
        ).length;
        
        const maxAttempts = quiz.requirements?.max_attempts_per_day || 3;
        const attemptsLeft = maxAttempts - todayAttempts;
        
        return {
            ...quiz,
            completed: !!completion,
            user_score: completion ? completion.score : 0,
            total_questions: quiz.questions.length,
            can_retake: canRetake && quiz.allow_retake && attemptsLeft > 0,
            last_completion: completion ? completion.completed_at : null,
            user_perfect_score: completion ? completion.perfect_score : false,
            attempts_today: todayAttempts,
            attempts_left: attemptsLeft,
            user_best_score: completion ? completion.score : 0
        };
    });
    
    res.json(quizzesWithStatus);
});

app.get('/api/webapp/quizzes/:quizId/results', requireAuth, (req, res) => {
    const quizId = parseInt(req.params.quizId);
    const userId = parseInt(req.user.user_id);
    
    const quiz = db.quizzes.find(q => q.id === quizId);
    const completion = db.quiz_completions.find(qc => qc.user_id === userId && qc.quiz_id === quizId);
    
    if (!quiz) {
        return res.status(404).json({ error: 'Quiz not found' });
    }
    
    if (!completion) {
        return res.status(404).json({ error: 'Quiz results not found' });
    }
    
    // Формируем детальные результаты
    const detailedResults = completion.results.map((result, index) => {
        const question = quiz.questions.find(q => q.id === result.questionId);
        return {
            question: result.question,
            userAnswer: result.userAnswer,
            correctAnswer: result.correctAnswer,
            isCorrect: result.isCorrect,
            userAnswerText: question ? question.options[result.userAnswer] : 'Unknown',
            correctAnswerText: question ? question.options[result.correctAnswer] : 'Unknown',
            explanation: result.explanation,
            points: result.points
        };
    });
    
    const results = {
        quizId: quizId,
        quizTitle: quiz.title,
        correctAnswers: completion.score,
        totalQuestions: completion.total_questions,
        scorePercentage: Math.round((completion.score / completion.total_questions) * 100),
        sparksEarned: completion.sparks_earned,
        perfectScore: completion.perfect_score,
        timeSpent: completion.time_spent,
        completedAt: completion.completed_at,
        detailedResults: detailedResults,
        character_bonus: req.user.character_id ? 
            db.characters.find(c => c.id == req.user.character_id)?.bonus_description : null
    };
    
    res.json({
        success: true,
        results: results
    });
});

app.get('/api/webapp/quizzes/:quizId', requireAuth, (req, res) => {
    const quizId = parseInt(req.params.quizId);
    const userId = parseInt(req.user.user_id);
    
    const quiz = db.quizzes.find(q => q.id === quizId && q.is_active);
    
    if (!quiz) {
        return res.status(404).json({ error: 'Quiz not found' });
    }
    
    // Не показываем правильные ответы в деталях
    const quizDetails = {
        ...quiz,
        questions: quiz.questions.map(q => ({
            id: q.id,
            question: q.question,
            options: q.options,
            points: q.points,
            time_limit: q.time_limit,
            image_url: q.image_url
            // Не включаем correctAnswer и explanation
        }))
    };
    
    res.json(quizDetails);
});

// ИСПРАВИТЬ функцию submitQuiz в server.js
app.post('/api/webapp/quizzes/:quizId/submit', requireAuth, (req, res) => {
    const quizId = parseInt(req.params.quizId);
    const { userId, answers, timeSpent } = req.body;
    
    if (!userId) {
        return res.status(400).json({ error: 'User ID is required' });
    }
    
    const quiz = db.quizzes.find(q => q.id === quizId);
    if (!quiz) {
        return res.status(404).json({ error: 'Quiz not found' });
    }
    
    // Проверяем ограничения по попыткам
    const today = new Date().toDateString();
    const todayAttempts = db.quiz_completions.filter(
        qc => qc.user_id === userId && 
              qc.quiz_id === quizId &&
              new Date(qc.completed_at).toDateString() === today
    ).length;
    
    const maxAttempts = quiz.requirements?.max_attempts_per_day || 3;
    if (todayAttempts >= maxAttempts) {
        return res.status(400).json({ 
            error: `Превышено максимальное количество попыток на сегодня (${maxAttempts})` 
        });
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
    const results = quiz.questions.map((question, index) => {
        const isCorrect = answers[index] === question.correctAnswer;
        if (isCorrect) correctAnswers++;
        return {
            questionId: question.id,
            question: question.question,
            userAnswer: answers[index],
            correctAnswer: question.correctAnswer,
            isCorrect: isCorrect,
            explanation: question.explanation,
            points: isCorrect ? question.points : 0
        };
    });
    
    let sparksEarned = 0;
    const perfectScore = correctAnswers === quiz.questions.length;
    
    // ПРАВИЛЬНОЕ начисление искр
    sparksEarned = correctAnswers * quiz.sparks_per_correct;
    
    if (perfectScore) {
        sparksEarned += quiz.sparks_perfect_bonus;
    }
    
    // Применяем бонус персонажа
    const user = db.users.find(u => u.user_id == userId);
    if (user && user.character_id) {
        const character = db.characters.find(c => c.id == user.character_id);
        if (character && character.bonus_type === 'percent_bonus') {
            const bonus = parseInt(character.bonus_value);
            const bonusAmount = Math.floor(sparksEarned * (bonus / 100));
            sparksEarned += bonusAmount;
            console.log(`🎁 Применен бонус персонажа: +${bonusAmount} искр`);
        }
    }
    
    const completionData = {
        id: Date.now(),
        user_id: userId,
        quiz_id: quizId,
        completed_at: new Date().toISOString(),
        score: correctAnswers,
        total_questions: quiz.questions.length,
        sparks_earned: sparksEarned,
        perfect_score: perfectScore,
        time_spent: timeSpent || 0,
        answers: answers,
        results: results
    };
    
    if (existingCompletion) {
        Object.assign(existingCompletion, completionData);
    } else {
        db.quiz_completions.push(completionData);
    }
    
    if (sparksEarned > 0) {
        addSparks(userId, sparksEarned, 'quiz', `Квиз: ${quiz.title}`, {
            quiz_id: quizId,
            score: correctAnswers,
            total_questions: quiz.questions.length,
            perfect_score: perfectScore
        });
    }
    
    if (user) {
        user.completed_quizzes = db.quiz_completions.filter(qc => qc.user_id === userId).length;
        user.last_active = new Date().toISOString();
    }
    
    // Обновляем статистику квиза
    quiz.attempts_count = (quiz.attempts_count || 0) + 1;
    quiz.average_score = ((quiz.average_score || 0) * (quiz.attempts_count - 1) + correctAnswers) / quiz.attempts_count;
    
    res.json({
        success: true,
        correctAnswers,
        totalQuestions: quiz.questions.length,
        sparksEarned,
        perfectScore,
        scorePercentage: Math.round((correctAnswers / quiz.questions.length) * 100),
        results: results,
        character_bonus: user && user.character_id ? db.characters.find(c => c.id == user.character_id)?.bonus_description : null,
        attempts_left: maxAttempts - todayAttempts - 1,
        message: perfectScore ? 
            `Идеально! 🎉 +${sparksEarned}✨ (${correctAnswers}×${quiz.sparks_per_correct} + ${quiz.sparks_perfect_bonus} бонус)` : 
            `Правильно: ${correctAnswers}/${quiz.questions.length}. +${sparksEarned}✨ (${correctAnswers}×${quiz.sparks_per_correct})`
    });
});

app.get('/api/webapp/marathons', requireAuth, (req, res) => {
    const userId = parseInt(req.user.user_id);
    const marathons = db.marathons.filter(m => m.is_active);
    
    const marathonsWithStatus = marathons.map(marathon => {
        const completion = db.marathon_completions.find(
            mc => mc.user_id === userId && mc.marathon_id === marathon.id
        );
        
        const currentTask = completion ? marathon.tasks[completion.current_day - 1] : marathon.tasks[0];
        const submissions = db.marathon_submissions.filter(
            ms => ms.user_id === userId && ms.marathon_id === marathon.id
        );
        
        const progress = completion ? completion.progress : 0;
        const daysCompleted = completion ? completion.current_day - 1 : 0;
        
        return {
            ...marathon,
            completed: completion ? completion.completed : false,
            current_day: completion ? completion.current_day : 1,
            progress: progress,
            started_at: completion ? completion.started_at : null,
            current_task: currentTask,
            submissions: submissions,
            can_continue: completion && !completion.completed,
            days_completed: daysCompleted,
            days_remaining: marathon.duration_days - daysCompleted,
            can_start: !completion
        };
    });
    
    res.json(marathonsWithStatus);
});

app.get('/api/webapp/marathons/:marathonId', requireAuth, (req, res) => {
    const marathonId = parseInt(req.params.marathonId);
    const userId = parseInt(req.user.user_id);
    
    const marathon = db.marathons.find(m => m.id === marathonId && m.is_active);
    
    if (!marathon) {
        return res.status(404).json({ error: 'Marathon not found' });
    }
    
    const completion = db.marathon_completions.find(
        mc => mc.user_id === userId && mc.marathon_id === marathonId
    );
    
    const submissions = db.marathon_submissions.filter(
        ms => ms.user_id === userId && ms.marathon_id === marathonId
    );
    
    const marathonWithStatus = {
        ...marathon,
        completed: completion ? completion.completed : false,
        current_day: completion ? completion.current_day : 1,
        progress: completion ? completion.progress : 0,
        started_at: completion ? completion.started_at : null,
        completed_at: completion ? completion.completed_at : null,
        submissions: submissions,
        total_sparks_earned: completion ? completion.total_sparks_earned : 0
    };
    
    res.json(marathonWithStatus);
});

// НОВЫЙ МЕТОД ДЛЯ ОТПРАВКИ РАБОТЫ В МАРАФОНЕ
app.post('/api/webapp/marathons/:marathonId/submit-day', requireAuth, (req, res) => {
    const marathonId = parseInt(req.params.marathonId);
    const { userId, day, submission_text, submission_image, submission_data } = req.body;
    
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
    
    if (task.requires_submission && !submission_text && !submission_image && !submission_data) {
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
            started_at: new Date().toISOString(),
            last_activity: new Date().toISOString(),
            total_sparks_earned: 0
        };
        db.marathon_completions.push(completion);
    }
    
    if (completion.current_day !== day) {
        return res.status(400).json({ error: 'Неверный день марафона' });
    }
    
    if (submission_text || submission_image || submission_data) {
        const existingSubmission = db.marathon_submissions.find(
            ms => ms.user_id === userId && ms.marathon_id === marathonId && ms.day === day
        );
        
        if (!existingSubmission) {
            db.marathon_submissions.push({
                id: Date.now(),
                user_id: userId,
                marathon_id: marathonId,
                day: day,
                submission_text: submission_text,
                submission_image: submission_image,
                submission_data: submission_data,
                submitted_at: new Date().toISOString(),
                status: 'pending',
                reviewed_at: null,
                reviewer_id: null,
                feedback: null,
                points_earned: 0
            });
        }
    }
    
    const sparksEarned = task.sparks_reward || marathon.sparks_per_day;
    addSparks(userId, sparksEarned, 'marathon_day', `Марафон: ${marathon.title} - день ${day}`, {
        marathon_id: marathonId,
        day: day,
        task_title: task.title
    });
    
    completion.current_day = day + 1;
    completion.progress = Math.round((day / marathon.duration_days) * 100);
    completion.last_activity = new Date().toISOString();
    completion.total_sparks_earned = (completion.total_sparks_earned || 0) + sparksEarned;
    
    if (day >= marathon.duration_days) {
        completion.completed = true;
        completion.progress = 100;
        completion.completed_at = new Date().toISOString();
        
        const marathonBonus = marathon.sparks_completion_bonus;
        addSparks(userId, marathonBonus, 'marathon_completion', `Завершение марафона: ${marathon.title}`, {
            marathon_id: marathonId,
            total_days: marathon.duration_days
        });
        
        completion.total_sparks_earned += marathonBonus;
        
        const user = db.users.find(u => u.user_id == userId);
        if (user) {
            user.completed_marathons = db.marathon_completions.filter(mc => mc.user_id === userId && mc.completed).length;
        }
        
        // Обновляем статистику марафона
        marathon.participants_count = (marathon.participants_count || 0) + 1;
        const completions = db.marathon_completions.filter(mc => mc.marathon_id === marathonId && mc.completed).length;
        marathon.completion_rate = Math.round((completions / marathon.participants_count) * 100);
    }
    
    res.json({
        success: true,
        sparksEarned,
        currentDay: completion.current_day,
        progress: completion.progress,
        completed: completion.completed,
        completionBonus: completion.completed ? marathon.sparks_completion_bonus : 0,
        totalSparksEarned: completion.total_sparks_earned,
        message: completion.completed ? 
            `🎉 Марафон завершен! +${sparksEarned}✨ (день) + ${marathon.sparks_completion_bonus}✨ (бонус)` : 
            `День ${day} завершен! +${sparksEarned}✨`
    });
});

app.get('/api/webapp/shop/items', (req, res) => {
    const items = db.shop_items.filter(item => item.is_active);
    res.json(items);
});

// ИСПРАВЛЕННАЯ ПОКУПКА ТОВАРА
app.post('/api/webapp/shop/purchase', requireAuth, (req, res) => {
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
    
    // Применяем скидку если есть
    const finalPrice = item.discount_percent > 0 ? 
        Math.round(item.price * (1 - item.discount_percent / 100)) : 
        item.price;
    
    if (user.sparks < finalPrice) {
        return res.status(400).json({ error: 'Недостаточно искр' });
    }
    
    user.sparks -= finalPrice;
    
    const purchase = {
        id: Date.now(),
        user_id: userId,
        item_id: itemId,
        price_paid: finalPrice,
        original_price: item.price,
        discount_percent: item.discount_percent,
        purchased_at: new Date().toISOString(),
        status: 'completed',
        download_count: 0
    };
    
    db.purchases.push(purchase);
    
    addSparks(userId, -finalPrice, 'purchase', `Покупка: ${item.title}`, {
        item_id: itemId,
        item_type: item.type,
        price_paid: finalPrice
    });
    
    const notification = {
        id: Date.now(),
        user_id: userId,
        title: "🛒 Покупка совершена!",
        message: `Вы приобрели "${item.title}" за ${finalPrice}✨`,
        type: "purchase",
        is_read: false,
        created_at: new Date().toISOString(),
        action_url: "/purchases",
        action_text: "Мои покупки",
        priority: "medium"
    };
    db.notifications.push(notification);
    
    // Обновляем статистику товара
    item.students_count = (item.students_count || 0) + 1;
    
    res.json({
        success: true,
        message: `Покупка успешна! Куплено: ${item.title}`,
        remainingSparks: user.sparks,
        purchase: {
            ...purchase,
            title: item.title,
            description: item.description,
            type: item.type,
            file_url: item.file_url,
            content_text: item.content_text
        }
    });
});

app.get('/api/webapp/users/:userId/purchases', requireAuth, (req, res) => {
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
                file_data: item?.file_url?.startsWith('data:') ? item.file_url : null,
                preview_data: item?.preview_url?.startsWith('data:') ? item.preview_url : null,
                instructor: item?.instructor,
                duration: item?.duration,
                features: item?.features
            };
        })
        .sort((a, b) => new Date(b.purchased_at) - new Date(a.purchased_at));
        
    res.json({ purchases: userPurchases });
});

app.get('/api/webapp/shop/items/:itemId', (req, res) => {
    const itemId = parseInt(req.params.itemId);
    const item = db.shop_items.find(i => i.id === itemId && i.is_active);
    
    if (!item) {
        return res.status(404).json({ error: 'Item not found' });
    }
    
    res.json(item);
});

app.get('/api/webapp/purchases/:purchaseId/download', requireAuth, (req, res) => {
    const purchaseId = parseInt(req.params.purchaseId);
    const userId = parseInt(req.user.user_id);
    
    const purchase = db.purchases.find(p => p.id === purchaseId && p.user_id === userId);
    
    if (!purchase) {
        return res.status(404).json({ error: 'Purchase not found' });
    }
    
    const item = db.shop_items.find(i => i.id === purchase.item_id);
    
    if (!item) {
        return res.status(404).json({ error: 'Item not found' });
    }
    
    // Увеличиваем счетчик скачиваний
    purchase.download_count = (purchase.download_count || 0) + 1;
    
    res.json({
        success: true,
        download_url: item.file_url,
        filename: `${item.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.${item.type === 'ebook' ? 'pdf' : 'zip'}`,
        message: 'Download prepared successfully'
    });
});

app.get('/api/webapp/purchases/:purchaseId/content', requireAuth, (req, res) => {
    const purchaseId = parseInt(req.params.purchaseId);
    const userId = parseInt(req.user.user_id);
    
    const purchase = db.purchases.find(p => p.id === purchaseId && p.user_id === userId);
    
    if (!purchase) {
        return res.status(404).json({ error: 'Purchase not found' });
    }
    
    const item = db.shop_items.find(i => i.id === purchase.item_id);
    
    if (!item) {
        return res.status(404).json({ error: 'Item not found' });
    }
    
    const purchaseWithContent = {
        ...purchase,
        title: item.title,
        description: item.description,
        type: item.type,
        content_text: item.content_text,
        file_url: item.file_url,
        instructor: item.instructor,
        duration: item.duration,
        features: item.features
    };
    
    res.json({
        success: true,
        purchase: purchaseWithContent
    });
});

app.get('/api/webapp/users/:userId/activities', requireAuth, (req, res) => {
    const userId = parseInt(req.params.userId);
    const { limit = 50, offset = 0 } = req.query;
    
    const userActivities = db.activities
        .filter(a => a.user_id === userId)
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .slice(parseInt(offset), parseInt(offset) + parseInt(limit));
        
    res.json({ 
        activities: userActivities,
        total: db.activities.filter(a => a.user_id === userId).length,
        limit: parseInt(limit),
        offset: parseInt(offset)
    });
});

// Работы пользователя
app.post('/api/webapp/upload-work', requireAuth, (req, res) => {
    const { userId, title, description, imageUrl, type, category, tags, metadata } = req.body;
    
    if (!userId || !title || !imageUrl) {
        return res.status(400).json({ error: 'User ID, title and image URL are required' });
    }
    
    const user = db.users.find(u => u.user_id == userId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    // Проверяем ограничение на количество работ в день
    const today = new Date().toDateString();
    const todayWorks = db.user_works.filter(w => 
        w.user_id === userId && 
        new Date(w.created_at).toDateString() === today
    ).length;
    
    const maxWorksPerDay = 5; // Можно вынести в настройки роли
    if (todayWorks >= maxWorksPerDay) {
        return res.status(400).json({ error: `Превышено максимальное количество работ в день (${maxWorksPerDay})` });
    }
    
    const newWork = {
        id: Date.now(),
        user_id: userId,
        title,
        description: description || '',
        image_url: imageUrl,
        type: type || 'image',
        category: category || 'other',
        tags: tags || [],
        status: 'pending',
        created_at: new Date().toISOString(),
        moderated_at: null,
        moderator_id: null,
        admin_comment: null,
        likes_count: 0,
        comments_count: 0,
        views_count: 0,
        metadata: metadata || {},
        featured: false,
        allow_comments: true
    };
    
    db.user_works.push(newWork);
    
    user.uploaded_works = db.user_works.filter(w => w.user_id === userId).length;
    
    addSparks(userId, SPARKS_SYSTEM.UPLOAD_WORK, 'upload_work', `Загрузка работы: ${title}`, {
        work_id: newWork.id,
        category: category
    });
    
    res.json({
        success: true,
        message: `Работа успешно загружена! Получено +${SPARKS_SYSTEM.UPLOAD_WORK}✨. После одобрения вы получите +${SPARKS_SYSTEM.WORK_APPROVED}✨`,
        workId: newWork.id,
        work: newWork
    });
});

app.get('/api/webapp/users/:userId/works', requireAuth, (req, res) => {
    const userId = parseInt(req.params.userId);
    const { status, category, limit = 20, offset = 0 } = req.query;
    
    let userWorks = db.user_works.filter(w => w.user_id === userId);
    
    if (status) {
        userWorks = userWorks.filter(w => w.status === status);
    }
    
    if (category) {
        userWorks = userWorks.filter(w => w.category === category);
    }
    
    userWorks = userWorks
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .slice(parseInt(offset), parseInt(offset) + parseInt(limit));
        
    res.json({ 
        works: userWorks,
        total: db.user_works.filter(w => w.user_id === userId).length,
        limit: parseInt(limit),
        offset: parseInt(offset)
    });
});

// Посты канала
app.get('/api/webapp/channel-posts', (req, res) => {
    const { limit = 20, offset = 0, featured } = req.query;
    
    let posts = db.channel_posts.filter(p => p.is_active);
    
    if (featured === 'true') {
        posts = posts.filter(p => p.featured);
    }
    
    const postsWithReviews = posts
        .map(post => {
            const reviews = db.post_reviews.filter(r => r.post_id === post.post_id);
            const userReviews = req.query.userId ? 
                db.post_reviews.filter(r => r.user_id === parseInt(req.query.userId) && r.post_id === post.post_id) : [];
            
            return {
                ...post,
                reviews_count: reviews.length,
                average_rating: reviews.length > 0 ? 
                    reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length : 0,
                user_review: userReviews.length > 0 ? userReviews[0] : null
            };
        })
        .sort((a, b) => new Date(b.publish_date || b.created_at) - new Date(a.publish_date || a.created_at))
        .slice(parseInt(offset), parseInt(offset) + parseInt(limit));
        
    res.json({ 
        posts: postsWithReviews,
        total: posts.length,
        limit: parseInt(limit),
        offset: parseInt(offset)
    });
});

app.get('/api/webapp/channel-posts/:postId', (req, res) => {
    const postId = req.params.postId;
    const userId = req.query.userId ? parseInt(req.query.userId) : null;
    
    const post = db.channel_posts.find(p => (p.id == postId || p.post_id === postId) && p.is_active);
    
    if (!post) {
        return res.status(404).json({ error: 'Post not found' });
    }
    
    const reviews = db.post_reviews.filter(r => r.post_id === post.post_id);
    const userReview = userId ? 
        db.post_reviews.find(r => r.user_id === userId && r.post_id === post.post_id) : null;
    
    const postWithReviews = {
        ...post,
        reviews_count: reviews.length,
        average_rating: reviews.length > 0 ? 
            reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length : 0,
        user_review: userReview
    };
    
    res.json(postWithReviews);
});

app.post('/api/webapp/posts/:postId/review', requireAuth, (req, res) => {
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
    
    addSparks(userId, sparksEarned, 'post_review', `Отзыв к посту: ${post.title}`, {
        post_id: postId,
        rating: rating
    });
    
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

// API ДЛЯ ИНТЕРАКТИВОВ
app.get('/api/webapp/interactives', requireAuth, (req, res) => {
    const userId = parseInt(req.user.user_id);
    const interactives = db.interactives.filter(i => i.is_active);
    
    const interactivesWithStatus = interactives.map(interactive => {
        const completion = db.interactive_completions.find(
            ic => ic.user_id === userId && ic.interactive_id === interactive.id
        );
        
        return {
            ...interactive,
            completed: !!completion,
            user_score: completion ? completion.score : 0,
            can_retake: interactive.allow_retake && (!completion || interactive.allow_retake)
        };
    });
    
    res.json(interactivesWithStatus);
});

app.post('/api/webapp/interactives/:interactiveId/submit', requireAuth, (req, res) => {
    const interactiveId = parseInt(req.params.interactiveId);
    const { userId, answer, timeSpent } = req.body;
    
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
    
    const completionData = {
        id: Date.now(),
        user_id: userId,
        interactive_id: interactiveId,
        completed_at: new Date().toISOString(),
        score: isCorrect ? 1 : 0,
        sparks_earned: sparksEarned,
        answer: answer,
        time_spent: timeSpent || 0,
        correct: isCorrect
    };
    
    if (existingCompletion) {
        Object.assign(existingCompletion, completionData);
    } else {
        db.interactive_completions.push(completionData);
    }
    
    if (sparksEarned > 0) {
        addSparks(userId, sparksEarned, 'interactive', `Интерактив: ${interactive.title}`, {
            interactive_id: interactiveId,
            correct: isCorrect
        });
    }
    
    // Обновляем статистику интерактива
    interactive.attempts_count = (interactive.attempts_count || 0) + 1;
    if (isCorrect) {
        const successCount = db.interactive_completions.filter(ic => ic.interactive_id === interactiveId && ic.correct).length;
        interactive.success_rate = Math.round((successCount / interactive.attempts_count) * 100);
    }
    
    res.json({
        success: true,
        correct: isCorrect,
        score: isCorrect ? 1 : 0,
        sparksEarned: sparksEarned,
        explanation: interactive.explanation,
        message: isCorrect ? 
            `Правильно! +${sparksEarned}✨` : 
            'Попробуйте еще раз!'
    });
});

// API для достижений
app.get('/api/webapp/users/:userId/achievements', requireAuth, (req, res) => {
    const userId = parseInt(req.params.userId);
    
    const userAchievements = db.user_achievements
        .filter(ua => ua.user_id === userId)
        .map(ua => {
            const achievement = db.achievements.find(a => a.id === ua.achievement_id);
            return {
                ...ua,
                title: achievement?.title,
                description: achievement?.description,
                icon: achievement?.icon,
                sparks_reward: achievement?.sparks_reward,
                category: achievement?.category,
                rarity: achievement?.rarity,
                points: achievement?.points
            };
        })
        .sort((a, b) => new Date(b.earned_at) - new Date(a.earned_at));
    
    const availableAchievements = db.achievements
        .filter(a => a.is_active && !a.hidden)
        .map(achievement => {
            const userAchievement = userAchievements.find(ua => ua.achievement_id === achievement.id);
            return {
                ...achievement,
                earned: !!userAchievement,
                earned_at: userAchievement ? userAchievement.earned_at : null,
                sparks_claimed: userAchievement ? userAchievement.sparks_claimed : false
            };
        });
    
    res.json({
        earned: userAchievements,
        available: availableAchievements,
        total_earned: userAchievements.length,
        total_available: availableAchievements.length,
        total_sparks_earned: userAchievements.reduce((sum, ua) => sum + (ua.sparks_claimed ? ua.sparks_reward : 0), 0),
        total_sparks_available: userAchievements.reduce((sum, ua) => sum + (!ua.sparks_claimed ? ua.sparks_reward : 0), 0)
    });
});

app.post('/api/webapp/achievements/:achievementId/claim', requireAuth, (req, res) => {
    const achievementId = parseInt(req.params.achievementId);
    const { userId } = req.body;
    
    if (!userId) {
        return res.status(400).json({ error: 'User ID is required' });
    }
    
    const userAchievement = db.user_achievements.find(
        ua => ua.user_id === userId && ua.achievement_id === achievementId
    );
    
    if (!userAchievement) {
        return res.status(404).json({ error: 'Достижение не найдено' });
    }
    
    if (userAchievement.sparks_claimed) {
        return res.status(400).json({ error: 'Награда уже получена' });
    }
    
    const achievement = db.achievements.find(a => a.id === achievementId);
    if (!achievement) {
        return res.status(404).json({ error: 'Достижение не найдено' });
    }
    
    addSparks(userId, achievement.sparks_reward, 'achievement', `Достижение: ${achievement.title}`, {
        achievement_id: achievementId,
        achievement_title: achievement.title
    });
    
    userAchievement.sparks_claimed = true;
    
    res.json({
        success: true,
        message: `Получено ${achievement.sparks_reward}✨ за достижение "${achievement.title}"`,
        sparksEarned: achievement.sparks_reward
    });
});

// API для уведомлений
app.get('/api/webapp/users/:userId/notifications', requireAuth, (req, res) => {
    const userId = parseInt(req.params.userId);
    const { unread_only, limit = 20, offset = 0 } = req.query;
    
    let notifications = db.notifications.filter(n => n.user_id === userId);
    
    if (unread_only === 'true') {
        notifications = notifications.filter(n => !n.is_read);
    }
    
    notifications = notifications
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .slice(parseInt(offset), parseInt(offset) + parseInt(limit));
    
    res.json({ 
        notifications,
        total: db.notifications.filter(n => n.user_id === userId).length,
        unread_count: db.notifications.filter(n => n.user_id === userId && !n.is_read).length,
        limit: parseInt(limit),
        offset: parseInt(offset)
    });
});

app.post('/api/webapp/notifications/:notificationId/read', requireAuth, (req, res) => {
    const notificationId = parseInt(req.params.notificationId);
    const { userId } = req.body;
    
    const notification = db.notifications.find(
        n => n.id === notificationId && n.user_id === userId
    );
    
    if (!notification) {
        return res.status(404).json({ error: 'Уведомление не найдено' });
    }
    
    notification.is_read = true;
    
    res.json({ success: true, message: 'Уведомление отмечено как прочитанное' });
});

app.post('/api/webapp/notifications/mark-all-read', requireAuth, (req, res) => {
    const { userId } = req.body;
    
    const userNotifications = db.notifications.filter(n => n.user_id === userId && !n.is_read);
    userNotifications.forEach(notification => {
        notification.is_read = true;
    });
    
    res.json({ 
        success: true, 
        message: `Все уведомления отмечены как прочитанные`,
        marked_count: userNotifications.length 
    });
});

// Admin API
app.get('/api/admin/stats', requireAdmin, (req, res) => {
    const stats = {
        totalUsers: db.users.length,
        registeredUsers: db.users.filter(u => u.is_registered).length,
        activeUsers: db.users.filter(u => {
            const lastActive = new Date(u.last_active);
            const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
            return lastActive > thirtyDaysAgo;
        }).length,
        newUsersToday: db.users.filter(u => {
            const today = new Date().toDateString();
            return new Date(u.registration_date).toDateString() === today;
        }).length,
        activeQuizzes: db.quizzes.filter(q => q.is_active).length,
        activeMarathons: db.marathons.filter(m => m.is_active).length,
        shopItems: db.shop_items.filter(i => i.is_active).length,
        totalSparks: db.users.reduce((sum, user) => sum + user.sparks, 0),
        totalAdmins: db.admins.filter(a => a.is_active).length,
        pendingReviews: db.post_reviews.filter(r => r.status === 'pending').length,
        pendingWorks: db.user_works.filter(w => w.status === 'pending').length,
        totalPosts: db.channel_posts.filter(p => p.is_active).length,
        totalPurchases: db.purchases.length,
        totalActivities: db.activities.length,
        interactives: db.interactives.filter(i => i.is_active).length,
        totalEarnedSparks: db.activities.reduce((sum, a) => sum + a.sparks_earned, 0),
        totalSpentSparks: db.purchases.reduce((sum, p) => sum + p.price_paid, 0),
        premiumUsers: db.users.filter(u => u.is_premium).length
    };
    res.json(stats);
});

// Управление интерактивами
app.get('/api/admin/interactives', requireAdmin, (req, res) => {
    const interactives = db.interactives.map(interactive => {
        const completions = db.interactive_completions.filter(ic => ic.interactive_id === interactive.id);
        
        return {
            ...interactive,
            completions_count: completions.length,
            average_score: completions.length > 0 ? 
                completions.reduce((sum, ic) => sum + ic.score, 0) / completions.length : 0,
            success_rate: completions.length > 0 ? 
                (completions.filter(ic => ic.score > 0).length / completions.length) * 100 : 0
        };
    });
    res.json(interactives);
});

app.post('/api/admin/interactives', requireAdmin, (req, res) => {
    const { title, description, type, category, image_url, question, options, correct_answer, sparks_reward, allow_retake, difficulty, tags, time_limit, hints, explanation, level_requirement } = req.body;
    
    if (!title || !type || !category || !question) {
        return res.status(400).json({ error: 'Title, type, category and question are required' });
    }
    
    const newInteractive = {
        id: Date.now(),
        title,
        description: description || '',
        type,
        category,
        image_url: image_url || '',
        question: question,
        options: options || [],
        correct_answer: correct_answer || 0,
        sparks_reward: sparks_reward || SPARKS_SYSTEM.INTERACTIVE_COMPLETION,
        allow_retake: allow_retake || false,
        difficulty: difficulty || 'beginner',
        is_active: true,
        created_at: new Date().toISOString(),
        attempts_count: 0,
        success_rate: 0,
        tags: tags || [],
        time_limit: time_limit || 60,
        hints: hints || [],
        explanation: explanation || '',
        level_requirement: level_requirement || 'Ученик',
        featured: false
    };
    
    db.interactives.push(newInteractive);
    
    res.json({ 
        success: true, 
        message: 'Интерактив успешно создан', 
        interactiveId: newInteractive.id,
        interactive: newInteractive
    });
});

app.put('/api/admin/interactives/:interactiveId', requireAdmin, (req, res) => {
    const interactiveId = parseInt(req.params.interactiveId);
    const { title, description, type, category, image_url, question, options, correct_answer, sparks_reward, allow_retake, is_active, difficulty, tags, time_limit, hints, explanation, level_requirement, featured } = req.body;
    
    const interactive = db.interactives.find(i => i.id === interactiveId);
    if (!interactive) {
        return res.status(404).json({ error: 'Interactive not found' });
    }
    
    if (title) interactive.title = title;
    if (description) interactive.description = description;
    if (type) interactive.type = type;
    if (category) interactive.category = category;
    if (image_url) interactive.image_url = image_url;
    if (question) interactive.question = question;
    if (options) interactive.options = options;
    if (correct_answer !== undefined) interactive.correct_answer = correct_answer;
    if (sparks_reward !== undefined) interactive.sparks_reward = sparks_reward;
    if (allow_retake !== undefined) interactive.allow_retake = allow_retake;
    if (is_active !== undefined) interactive.is_active = is_active;
    if (difficulty) interactive.difficulty = difficulty;
    if (tags) interactive.tags = tags;
    if (time_limit) interactive.time_limit = time_limit;
    if (hints) interactive.hints = hints;
    if (explanation) interactive.explanation = explanation;
    if (level_requirement) interactive.level_requirement = level_requirement;
    if (featured !== undefined) interactive.featured = featured;
    
    res.json({ 
        success: true, 
        message: 'Интерактив успешно обновлен',
        interactive: interactive
    });
});

app.delete('/api/admin/interactives/:interactiveId', requireAdmin, (req, res) => {
    const interactiveId = parseInt(req.params.interactiveId);
    const interactiveIndex = db.interactives.findIndex(i => i.id === interactiveId);
    
    if (interactiveIndex === -1) {
        return res.status(404).json({ error: 'Interactive not found' });
    }
    
    db.interactives.splice(interactiveIndex, 1);
    res.json({ success: true, message: 'Интерактив удален' });
});

// Управление ролями
app.get('/api/admin/roles', requireAdmin, (req, res) => {
    const roles = db.roles.map(role => {
        const usersCount = db.users.filter(u => u.class === role.name).length;
        return {
            ...role,
            users_count: usersCount
        };
    });
    res.json(roles);
});

app.post('/api/admin/roles', requireAdmin, (req, res) => {
    const { name, description, icon, available_buttons, color, requirements, level_requirements, permissions } = req.body;
    
    if (!name || !description) {
        return res.status(400).json({ error: 'Name and description are required' });
    }
    
    const newRole = {
        id: Date.now(),
        name,
        description,
        icon: icon || '🎨',
        available_buttons: available_buttons || ['quiz', 'marathon', 'works', 'activities', 'posts', 'shop', 'invite', 'interactives', 'change_role'],
        color: color || '#667eea',
        requirements: requirements || '',
        is_active: true,
        created_at: new Date().toISOString(),
        level_requirements: level_requirements || {
            'Ученик': 0,
            'Искатель': 50,
            'Знаток': 150,
            'Мастер': 300,
            'Наставник': 500,
            'Легенда': 1000
        },
        permissions: permissions || {
            can_upload_works: true,
            can_participate_marathons: true,
            can_take_quizzes: true,
            can_use_shop: true,
            can_invite_friends: true,
            max_works_per_day: 5,
            max_quiz_attempts: 3
        }
    };
    
    db.roles.push(newRole);
    
    res.json({ 
        success: true, 
        message: 'Роль успешно создана', 
        role: newRole
    });
});

app.put('/api/admin/roles/:roleId', requireAdmin, (req, res) => {
    const roleId = parseInt(req.params.roleId);
    const { name, description, icon, available_buttons, is_active, color, requirements, level_requirements, permissions } = req.body;
    
    const role = db.roles.find(r => r.id === roleId);
    if (!role) {
        return res.status(404).json({ error: 'Role not found' });
    }
    
    if (name) role.name = name;
    if (description) role.description = description;
    if (icon) role.icon = icon;
    if (available_buttons) role.available_buttons = available_buttons;
    if (is_active !== undefined) role.is_active = is_active;
    if (color) role.color = color;
    if (requirements) role.requirements = requirements;
    if (level_requirements) role.level_requirements = level_requirements;
    if (permissions) role.permissions = permissions;
    
    res.json({ 
        success: true, 
        message: 'Роль успешно обновлена',
        role: role
    });
});

app.delete('/api/admin/roles/:roleId', requireAdmin, (req, res) => {
    const roleId = parseInt(req.params.roleId);
    const roleIndex = db.roles.findIndex(r => r.id === roleId);
    
    if (roleIndex === -1) {
        return res.status(404).json({ error: 'Role not found' });
    }
    
    const usersWithRole = db.users.filter(u => u.class === db.roles[roleIndex].name);
    if (usersWithRole.length > 0) {
        return res.status(400).json({ error: 'Нельзя удалить роль, у которой есть пользователи' });
    }
    
    db.roles.splice(roleIndex, 1);
    res.json({ success: true, message: 'Роль удалена' });
});

// Управление персонажами
app.get('/api/admin/characters', requireAdmin, (req, res) => {
    const characters = db.characters.map(character => {
        const role = db.roles.find(r => r.id === character.role_id);
        const usersCount = db.users.filter(u => u.character_id === character.id).length;
        return {
            ...character,
            role_name: role?.name,
            users_count: usersCount
        };
    });
    res.json(characters);
});

app.post('/api/admin/characters', requireAdmin, (req, res) => {
    const { role_id, name, description, bonus_type, bonus_value, bonus_description, avatar, personality, quote, level_requirement, rarity } = req.body;
    
    if (!role_id || !name || !bonus_type || !bonus_value) {
        return res.status(400).json({ error: 'Role ID, name, bonus type and value are required' });
    }
    
    const newCharacter = {
        id: Date.now(),
        role_id: parseInt(role_id),
        name,
        description: description || '',
        bonus_type,
        bonus_value,
        bonus_description: bonus_description || '',
        avatar: avatar || '👤',
        personality: personality || '',
        quote: quote || '',
        level_requirement: level_requirement || 0,
        rarity: rarity || 'common',
        is_active: true,
        created_at: new Date().toISOString()
    };
    
    db.characters.push(newCharacter);
    
    res.json({ 
        success: true, 
        message: 'Персонаж успешно создан', 
        character: newCharacter
    });
});

app.put('/api/admin/characters/:characterId', requireAdmin, (req, res) => {
    const characterId = parseInt(req.params.characterId);
    const { name, description, bonus_type, bonus_value, bonus_description, is_active, avatar, personality, quote, level_requirement, rarity } = req.body;
    
    const character = db.characters.find(c => c.id === characterId);
    if (!character) {
        return res.status(404).json({ error: 'Character not found' });
    }
    
    if (name) character.name = name;
    if (description) character.description = description;
    if (bonus_type) character.bonus_type = bonus_type;
    if (bonus_value) character.bonus_value = bonus_value;
    if (bonus_description) character.bonus_description = bonus_description;
    if (is_active !== undefined) character.is_active = is_active;
    if (avatar) character.avatar = avatar;
    if (personality) character.personality = personality;
    if (quote) character.quote = quote;
    if (level_requirement) character.level_requirement = level_requirement;
    if (rarity) character.rarity = rarity;
    
    res.json({ 
        success: true, 
        message: 'Персонаж успешно обновлен',
        character: character
    });
});

app.delete('/api/admin/characters/:characterId', requireAdmin, (req, res) => {
    const characterId = parseInt(req.params.characterId);
    const characterIndex = db.characters.findIndex(c => c.id === characterId);
    
    if (characterIndex === -1) {
        return res.status(404).json({ error: 'Character not found' });
    }
    
    const usersWithCharacter = db.users.filter(u => u.character_id === characterId);
    if (usersWithCharacter.length > 0) {
        return res.status(400).json({ error: 'Нельзя удалить персонажа, у которого есть пользователи' });
    }
    
    db.characters.splice(characterIndex, 1);
    res.json({ success: true, message: 'Персонаж удален' });
});

// Управление магазином
app.get('/api/admin/shop/items', requireAdmin, (req, res) => {
    const items = db.shop_items.map(item => {
        const purchasesCount = db.purchases.filter(p => p.item_id === item.id).length;
        const totalRevenue = db.purchases
            .filter(p => p.item_id === item.id)
            .reduce((sum, p) => sum + p.price_paid, 0);
            
        return {
            ...item,
            purchases_count: purchasesCount,
            total_revenue: totalRevenue
        };
    });
    res.json(items);
});

app.post('/api/admin/shop/items', requireAdmin, (req, res) => {
    const { title, description, type, file_url, preview_url, price, content_text, category, difficulty, duration, instructor, features, tags, requirements, what_you_learn, discount_percent, original_price } = req.body;
    
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
        category: category || 'general',
        difficulty: difficulty || 'beginner',
        duration: duration || '',
        instructor: instructor || '',
        features: features || [],
        tags: tags || [],
        requirements: requirements || '',
        what_you_learn: what_you_learn || [],
        discount_percent: discount_percent || 0,
        original_price: original_price || parseFloat(price),
        is_active: true,
        created_at: new Date().toISOString(),
        rating: 0,
        students_count: 0,
        featured: false
    };
    
    db.shop_items.push(newItem);
    
    res.json({ 
        success: true, 
        message: 'Товар успешно создан', 
        itemId: newItem.id,
        item: newItem
    });
});

// Создание новой роли
app.post('/api/admin/roles', requireAdmin, (req, res) => {
    const { name, description, icon, available_buttons, color, requirements, level_requirements, permissions } = req.body;
    
    const errors = [];
    if (!name || name.length < 3) errors.push('Role name must be at least 3 characters');
    if (!description || description.length < 10) errors.push('Description must be at least 10 characters');
    
    if (errors.length > 0) {
        return res.status(400).json({ error: errors.join(', ') });
    }
    
    // Проверяем дубликат
    const existingRole = db.roles.find(r => r.name.toLowerCase() === name.toLowerCase());
    if (existingRole) {
        return res.status(400).json({ error: 'Role with this name already exists' });
    }
    
    const newRole = {
        id: Date.now(),
        name,
        description,
        icon: icon || '🎨',
        available_buttons: available_buttons || ['quiz', 'marathon', 'works', 'activities', 'posts', 'shop', 'invite', 'interactives', 'change_role'],
        color: color || '#667eea',
        requirements: requirements || '',
        is_active: true,
        created_at: new Date().toISOString(),
        level_requirements: level_requirements || {
            'Ученик': 0,
            'Искатель': 50,
            'Знаток': 150,
            'Мастер': 300,
            'Наставник': 500,
            'Легенда': 1000
        },
        permissions: permissions || {
            can_upload_works: true,
            can_participate_marathons: true,
            can_take_quizzes: true,
            can_use_shop: true,
            can_invite_friends: true,
            max_works_per_day: 5,
            max_quiz_attempts: 3
        }
    };
    
    db.roles.push(newRole);
    
    res.json({
        success: true,
        message: 'Role created successfully',
        role: newRole
    });
});

// Создание нового персонажа
app.post('/api/admin/characters', requireAdmin, (req, res) => {
    const { role_id, name, description, bonus_type, bonus_value, bonus_description, avatar, personality, quote, level_requirement, rarity } = req.body;
    
    const errors = [];
    if (!role_id) errors.push('Role ID is required');
    if (!name || name.length < 2) errors.push('Character name must be at least 2 characters');
    if (!bonus_type) errors.push('Bonus type is required');
    if (!bonus_value) errors.push('Bonus value is required');
    
    if (errors.length > 0) {
        return res.status(400).json({ error: errors.join(', ') });
    }
    
    // Проверяем существование роли
    const role = db.roles.find(r => r.id == role_id);
    if (!role) {
        return res.status(404).json({ error: 'Role not found' });
    }
    
    const newCharacter = {
        id: Date.now(),
        role_id: parseInt(role_id),
        name,
        description: description || '',
        bonus_type,
        bonus_value,
        bonus_description: bonus_description || '',
        avatar: avatar || '👤',
        personality: personality || '',
        quote: quote || '',
        level_requirement: level_requirement || 0,
        rarity: rarity || 'common',
        is_active: true,
        created_at: new Date().toISOString()
    };
    
    db.characters.push(newCharacter);
    
    res.json({
        success: true,
        message: 'Character created successfully',
        character: newCharacter
    });
});

// Создание нового достижения
app.post('/api/admin/achievements', requireAdmin, (req, res) => {
    const { title, description, icon, sparks_reward, condition_type, condition_value, category, rarity, points, hidden } = req.body;
    
    const errors = [];
    if (!title || title.length < 3) errors.push('Achievement title must be at least 3 characters');
    if (!description || description.length < 10) errors.push('Description must be at least 10 characters');
    if (!condition_type) errors.push('Condition type is required');
    if (!condition_value) errors.push('Condition value is required');
    
    if (errors.length > 0) {
        return res.status(400).json({ error: errors.join(', ') });
    }
    
    const newAchievement = {
        id: Date.now(),
        title,
        description,
        icon: icon || '🏆',
        sparks_reward: sparks_reward || 10,
        condition_type,
        condition_value,
        is_active: true,
        category: category || 'general',
        rarity: rarity || 'common',
        points: points || 10,
        hidden: hidden || false,
        created_at: new Date().toISOString()
    };
    
    db.achievements.push(newAchievement);
    
    res.json({
        success: true,
        message: 'Achievement created successfully',
        achievement: newAchievement
    });
});

// Получение работ для модерации
app.get('/api/admin/moderation/works', requireAdmin, (req, res) => {
    const { status = 'pending', limit = 50, offset = 0 } = req.query;
    
    let works = db.user_works.filter(w => w.status === status);
    
    // Добавляем информацию о пользователе
    works = works.map(work => {
        const user = db.users.find(u => u.user_id === work.user_id);
        return {
            ...work,
            user_name: user?.tg_first_name || 'Unknown',
            user_username: user?.tg_username,
            user_level: user?.level
        };
    });
    
    // Сортировка и пагинация
    works = works
        .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
        .slice(parseInt(offset), parseInt(offset) + parseInt(limit));
    
    res.json({
        works: works,
        total: db.user_works.filter(w => w.status === status).length,
        pending_count: db.user_works.filter(w => w.status === 'pending').length,
        approved_count: db.user_works.filter(w => w.status === 'approved').length,
        rejected_count: db.user_works.filter(w => w.status === 'rejected').length
    });
});

// Получение отзывов для модерации
app.get('/api/admin/moderation/reviews', requireAdmin, (req, res) => {
    const { status = 'pending', limit = 50, offset = 0 } = req.query;
    
    let reviews = db.post_reviews.filter(r => r.status === status);
    
    // Добавляем информацию о пользователе и посте
    reviews = reviews.map(review => {
        const user = db.users.find(u => u.user_id === review.user_id);
        const post = db.channel_posts.find(p => p.post_id === review.post_id);
        return {
            ...review,
            user_name: user?.tg_first_name || 'Unknown',
            user_username: user?.tg_username,
            post_title: post?.title || 'Unknown Post'
        };
    });
    
    // Сортировка и пагинация
    reviews = reviews
        .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
        .slice(parseInt(offset), parseInt(offset) + parseInt(limit));
    
    res.json({
        reviews: reviews,
        total: db.post_reviews.filter(r => r.status === status).length,
        pending_count: db.post_reviews.filter(r => r.status === 'pending').length,
        approved_count: db.post_reviews.filter(r => r.status === 'approved').length,
        rejected_count: db.post_reviews.filter(r => r.status === 'rejected').length
    });
});

// Массовая модерация работ
app.post('/api/admin/moderation/works/batch', requireAdmin, (req, res) => {
    const { work_ids, status, admin_comment } = req.body;
    
    if (!work_ids || !Array.isArray(work_ids) || work_ids.length === 0) {
        return res.status(400).json({ error: 'Work IDs array is required' });
    }
    
    const results = [];
    
    work_ids.forEach(workId => {
        const work = db.user_works.find(w => w.id === workId);
        if (work) {
            work.status = status;
            work.moderated_at = new Date().toISOString();
            work.moderator_id = req.admin.user_id;
            work.admin_comment = admin_comment || null;
            
            if (status === 'approved') {
                const sparksEarned = 15; // Базовое количество искр за одобрение
                addSparks(work.user_id, sparksEarned, 'work_approved', `Работа одобрена: ${work.title}`, {
                    work_id: workId,
                    points_earned: sparksEarned
                });
            }
            
            results.push({
                work_id: workId,
                success: true,
                status: status
            });
        } else {
            results.push({
                work_id: workId,
                success: false,
                error: 'Work not found'
            });
        }
    });
    
    res.json({
        success: true,
        message: `Processed ${results.filter(r => r.success).length} works`,
        results: results
    });
});

app.put('/api/admin/shop/items/:itemId', requireAdmin, (req, res) => {
    const itemId = parseInt(req.params.itemId);
    const { title, description, type, file_url, preview_url, price, content_text, is_active, category, difficulty, duration, instructor, features, tags, requirements, what_you_learn, discount_percent, original_price, featured } = req.body;
    
    const item = db.shop_items.find(i => i.id === itemId);
    if (!item) {
        return res.status(404).json({ error: 'Item not found' });
    }
    
    if (title) item.title = title;
    if (description) item.description = description;
    if (type) item.type = type;
    if (file_url !== undefined) item.file_url = file_url;
    if (preview_url !== undefined) item.preview_url = preview_url;
    if (price) item.price = parseFloat(price);
    if (content_text) item.content_text = content_text;
    if (is_active !== undefined) item.is_active = is_active;
    if (category) item.category = category;
    if (difficulty) item.difficulty = difficulty;
    if (duration) item.duration = duration;
    if (instructor) item.instructor = instructor;
    if (features) item.features = features;
    if (tags) item.tags = tags;
    if (requirements) item.requirements = requirements;
    if (what_you_learn) item.what_you_learn = what_you_learn;
    if (discount_percent !== undefined) item.discount_percent = discount_percent;
    if (original_price !== undefined) item.original_price = original_price;
    if (featured !== undefined) item.featured = featured;
    
    res.json({ 
        success: true, 
        message: 'Товар успешно обновлен',
        item: item
    });
});

app.delete('/api/admin/shop/items/:itemId', requireAdmin, (req, res) => {
    const itemId = parseInt(req.params.itemId);
    const itemIndex = db.shop_items.findIndex(i => i.id === itemId);
    
    if (itemIndex === -1) {
        return res.status(404).json({ error: 'Item not found' });
    }
    
    db.shop_items.splice(itemIndex, 1);
    res.json({ success: true, message: 'Товар удален' });
});

// Управление квизами
app.get('/api/admin/quizzes', requireAdmin, (req, res) => {
    const quizzes = db.quizzes.map(quiz => {
        const completions = db.quiz_completions.filter(qc => qc.quiz_id === quiz.id);
        const perfectCompletions = completions.filter(qc => qc.perfect_score).length;
        
        return {
            ...quiz,
            completions_count: completions.length,
            average_score: completions.length > 0 ? 
                completions.reduce((sum, qc) => sum + qc.score, 0) / completions.length : 0,
            perfect_completions: perfectCompletions,
            success_rate: completions.length > 0 ? 
                (completions.filter(qc => qc.score >= quiz.questions.length / 2).length / completions.length) * 100 : 0
        };
    });
    res.json(quizzes);
});

app.post('/api/admin/quizzes', requireAdmin, (req, res) => {
    const { title, description, questions, sparks_per_correct, sparks_perfect_bonus, cooldown_hours, allow_retake, difficulty, category, duration_minutes, tags, requirements, cover_image, instructor, featured } = req.body;
    
    if (!title || !questions || !Array.isArray(questions)) {
        return res.status(400).json({ error: 'Title and questions array are required' });
    }
    
    const newQuiz = {
        id: Date.now(),
        title,
        description: description || '',
        questions: questions,
        sparks_per_correct: sparks_per_correct || SPARKS_SYSTEM.QUIZ_PER_CORRECT_ANSWER,
        sparks_perfect_bonus: sparks_perfect_bonus || SPARKS_SYSTEM.QUIZ_PERFECT_BONUS,
        cooldown_hours: cooldown_hours || 24,
        allow_retake: allow_retake || true,
        difficulty: difficulty || 'beginner',
        category: category || 'general',
        duration_minutes: duration_minutes || 10,
        is_active: true,
        created_at: new Date().toISOString(),
        attempts_count: 0,
        average_score: 0,
        tags: tags || [],
        requirements: requirements || {
            min_level: 'Ученик',
            required_roles: [],
            max_attempts_per_day: 3
        },
        cover_image: cover_image || '',
        instructor: instructor || '',
        rating: 0,
        featured: featured || false
    };
    
    db.quizzes.push(newQuiz);
    
    res.json({ 
        success: true, 
        message: 'Квиз успешно создан', 
        quizId: newQuiz.id,
        quiz: newQuiz
    });
});

app.put('/api/admin/quizzes/:quizId', requireAdmin, (req, res) => {
    const quizId = parseInt(req.params.quizId);
    const { title, description, questions, sparks_per_correct, sparks_perfect_bonus, cooldown_hours, allow_retake, is_active, difficulty, category, duration_minutes, tags, requirements, cover_image, instructor, featured } = req.body;
    
    const quiz = db.quizzes.find(q => q.id === quizId);
    if (!quiz) {
        return res.status(404).json({ error: 'Quiz not found' });
    }
    
    if (title) quiz.title = title;
    if (description) quiz.description = description;
    if (questions) quiz.questions = questions;
    if (sparks_per_correct !== undefined) quiz.sparks_per_correct = sparks_per_correct;
    if (sparks_perfect_bonus !== undefined) quiz.sparks_perfect_bonus = sparks_perfect_bonus;
    if (cooldown_hours !== undefined) quiz.cooldown_hours = cooldown_hours;
    if (allow_retake !== undefined) quiz.allow_retake = allow_retake;
    if (is_active !== undefined) quiz.is_active = is_active;
    if (difficulty) quiz.difficulty = difficulty;
    if (category) quiz.category = category;
    if (duration_minutes) quiz.duration_minutes = duration_minutes;
    if (tags) quiz.tags = tags;
    if (requirements) quiz.requirements = requirements;
    if (cover_image) quiz.cover_image = cover_image;
    if (instructor) quiz.instructor = instructor;
    if (featured !== undefined) quiz.featured = featured;
    
    res.json({ 
        success: true, 
        message: 'Квиз успешно обновлен',
        quiz: quiz
    });
});

app.delete('/api/admin/quizzes/:quizId', requireAdmin, (req, res) => {
    const quizId = parseInt(req.params.quizId);
    const quizIndex = db.quizzes.findIndex(q => q.id === quizId);
    
    if (quizIndex === -1) {
        return res.status(404).json({ error: 'Quiz not found' });
    }
    
    db.quizzes.splice(quizIndex, 1);
    res.json({ success: true, message: 'Квиз удален' });
});

// Управление марафонами
app.get('/api/admin/marathons', requireAdmin, (req, res) => {
    const marathons = db.marathons.map(marathon => {
        const completions = db.marathon_completions.filter(mc => mc.marathon_id === marathon.id);
        const activeParticipants = completions.filter(mc => !mc.completed).length;
        const completedParticipants = completions.filter(mc => mc.completed).length;
        
        return {
            ...marathon,
            completions_count: completions.length,
            active_participants: activeParticipants,
            completed_participants: completedParticipants,
            completion_rate: completions.length > 0 ? 
                (completedParticipants / completions.length) * 100 : 0
        };
    });
    res.json(marathons);
});

app.post('/api/admin/marathons', requireAdmin, (req, res) => {
    const { title, description, duration_days, tasks, sparks_per_day, sparks_completion_bonus, difficulty, category, requirements, cover_image, tags, instructor, level_requirement, featured, start_date, end_date } = req.body;
    
    if (!title || !duration_days || !tasks || !Array.isArray(tasks)) {
        return res.status(400).json({ error: 'Title, duration and tasks array are required' });
    }
    
    const newMarathon = {
        id: Date.now(),
        title,
        description: description || '',
        duration_days: parseInt(duration_days),
        tasks: tasks,
        sparks_per_day: sparks_per_day || SPARKS_SYSTEM.MARATHON_DAY_COMPLETION,
        sparks_completion_bonus: sparks_completion_bonus || SPARKS_SYSTEM.MARATHON_COMPLETION_BONUS,
        difficulty: difficulty || 'beginner',
        category: category || 'general',
        requirements: requirements || '',
        cover_image: cover_image || '',
        tags: tags || [],
        instructor: instructor || '',
        level_requirement: level_requirement || 'Ученик',
        featured: featured || false,
        start_date: start_date || new Date().toISOString(),
        end_date: end_date || new Date(Date.now() + parseInt(duration_days) * 24 * 60 * 60 * 1000).toISOString(),
        is_active: true,
        created_at: new Date().toISOString(),
        participants_count: 0,
        completion_rate: 0,
        status: 'active'
    };
    
    db.marathons.push(newMarathon);
    
    res.json({ 
        success: true, 
        message: 'Марафон успешно создан', 
        marathonId: newMarathon.id,
        marathon: newMarathon
    });
});

app.put('/api/admin/marathons/:marathonId', requireAdmin, (req, res) => {
    const marathonId = parseInt(req.params.marathonId);
    const { title, description, duration_days, tasks, sparks_per_day, sparks_completion_bonus, is_active, difficulty, category, requirements, cover_image, tags, instructor, level_requirement, featured, start_date, end_date, status } = req.body;
    
    const marathon = db.marathons.find(m => m.id === marathonId);
    if (!marathon) {
        return res.status(404).json({ error: 'Marathon not found' });
    }
    
    if (title) marathon.title = title;
    if (description) marathon.description = description;
    if (duration_days) marathon.duration_days = parseInt(duration_days);
    if (tasks) marathon.tasks = tasks;
    if (sparks_per_day !== undefined) marathon.sparks_per_day = sparks_per_day;
    if (sparks_completion_bonus !== undefined) marathon.sparks_completion_bonus = sparks_completion_bonus;
    if (is_active !== undefined) marathon.is_active = is_active;
    if (difficulty) marathon.difficulty = difficulty;
    if (category) marathon.category = category;
    if (requirements) marathon.requirements = requirements;
    if (cover_image) marathon.cover_image = cover_image;
    if (tags) marathon.tags = tags;
    if (instructor) marathon.instructor = instructor;
    if (level_requirement) marathon.level_requirement = level_requirement;
    if (featured !== undefined) marathon.featured = featured;
    if (start_date) marathon.start_date = start_date;
    if (end_date) marathon.end_date = end_date;
    if (status) marathon.status = status;
    
    res.json({ 
        success: true, 
        message: 'Марафон успешно обновлен',
        marathon: marathon
    });
});

app.delete('/api/admin/marathons/:marathonId', requireAdmin, (req, res) => {
    const marathonId = parseInt(req.params.marathonId);
    const marathonIndex = db.marathons.findIndex(m => m.id === marathonId);
    
    if (marathonIndex === -1) {
        return res.status(404).json({ error: 'Marathon not found' });
    }
    
    db.marathons.splice(marathonIndex, 1);
    res.json({ success: true, message: 'Марафон удален' });
});

// Управление работами пользователей
app.get('/api/admin/user-works', requireAdmin, (req, res) => {
    const { status = 'pending' } = req.query;
    
    const works = db.user_works
        .filter(w => w.status === status)
        .map(work => {
            const user = db.users.find(u => u.user_id === work.user_id);
            return {
                ...work,
                user_name: user?.tg_first_name || 'Неизвестно',
                user_username: user?.tg_username,
                user_level: user?.level
            };
        })
        .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    
    res.json({ works });
});

app.post('/api/admin/user-works/:workId/moderate', requireAdmin, (req, res) => {
    const workId = parseInt(req.params.workId);
    const { status, admin_comment, points_earned } = req.body;
    const adminId = req.admin.user_id;
    
    const work = db.user_works.find(w => w.id === workId);
    if (!work) {
        return res.status(404).json({ error: 'Work not found' });
    }
    
    work.status = status;
    work.moderated_at = new Date().toISOString();
    work.moderator_id = adminId;
    work.admin_comment = admin_comment || null;
    
    if (status === 'approved') {
        const sparksEarned = points_earned || SPARKS_SYSTEM.WORK_APPROVED;
        addSparks(work.user_id, sparksEarned, 'work_approved', `Работа одобрена: ${work.title}`, {
            work_id: workId,
            points_earned: sparksEarned
        });
        
        const notification = {
            id: Date.now(),
            user_id: work.user_id,
            title: "✨ Работа одобрена!",
            message: `Ваша работа "${work.title}" была одобрена модератором. Вы получили ${sparksEarned}✨`,
            type: "work_approved",
            is_read: false,
            created_at: new Date().toISOString(),
            action_url: "/works",
            action_text: "Мои работы",
            priority: "medium"
        };
        db.notifications.push(notification);
    } else if (status === 'rejected') {
        const notification = {
            id: Date.now(),
            user_id: work.user_id,
            title: "❌ Работа отклонена",
            message: `Ваша работа "${work.title}" была отклонена модератором.${admin_comment ? ` Причина: ${admin_comment}` : ''}`,
            type: "work_rejected",
            is_read: false,
            created_at: new Date().toISOString(),
            action_url: "/works",
            action_text: "Мои работы",
            priority: "medium"
        };
        db.notifications.push(notification);
    }
    
    res.json({ 
        success: true, 
        message: `Работа ${status === 'approved' ? 'одобрена' : 'отклонена'}`,
        work: work
    });
});

// Управление постами - ИСПРАВЛЕННАЯ ВЕРСИЯ
app.get('/api/admin/channel-posts', requireAdmin, (req, res) => {
    const posts = db.channel_posts.map(post => {
        const admin = db.admins.find(a => a.user_id === post.admin_id);
        const reviews = db.post_reviews.filter(r => r.post_id === post.post_id);
        return {
            ...post,
            admin_username: admin?.username,
            reviews_count: reviews.length,
            average_rating: reviews.length > 0 ? 
                reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length : 0
        };
    }).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    
    res.json({ posts });
});

app.post('/api/admin/channel-posts', requireAdmin, (req, res) => {
    const { post_id, title, content, image_url, video_url, media_type, action_type, action_target, tags, featured, excerpt } = req.body;
    
    if (!title) {
        return res.status(400).json({ error: 'Title is required' });
    }
    
    const newPost = {
        id: Date.now(),
        post_id: post_id || `post_${Date.now()}`,
        title,
        content: content || '',
        image_url: image_url || '',
        video_url: video_url || '',
        media_type: media_type || 'text',
        admin_id: req.admin.user_id,
        created_at: new Date().toISOString(),
        is_active: true,
        telegram_message_id: null,
        action_type: action_type || null,
        action_target: action_target || null,
        likes_count: 0,
        comments_count: 0,
        views_count: 0,
        tags: tags || [],
        featured: featured || false,
        publish_date: new Date().toISOString(),
        excerpt: excerpt || content?.substring(0, 150) + '...' || ''
    };
    
    db.channel_posts.push(newPost);
    
    res.json({ 
        success: true, 
        message: 'Пост успешно создан', 
        postId: newPost.id,
        post: newPost
    });
});

app.put('/api/admin/channel-posts/:postId', requireAdmin, (req, res) => {
    const postId = parseInt(req.params.postId);
    const { title, content, image_url, video_url, media_type, is_active, action_type, action_target, tags, featured, excerpt } = req.body;
    
    const post = db.channel_posts.find(p => p.id === postId);
    if (!post) {
        return res.status(404).json({ error: 'Post not found' });
    }
    
    if (title) post.title = title;
    if (content) post.content = content;
    if (image_url) post.image_url = image_url;
    if (video_url) post.video_url = video_url;
    if (media_type) post.media_type = media_type;
    if (is_active !== undefined) post.is_active = is_active;
    if (action_type !== undefined) post.action_type = action_type;
    if (action_target !== undefined) post.action_target = action_target;
    if (tags) post.tags = tags;
    if (featured !== undefined) post.featured = featured;
    if (excerpt) post.excerpt = excerpt;
    
    res.json({ 
        success: true, 
        message: 'Пост успешно обновлен',
        post: post
    });
});

app.delete('/api/admin/channel-posts/:postId', requireAdmin, (req, res) => {
    const postId = parseInt(req.params.postId);
    const postIndex = db.channel_posts.findIndex(p => p.id === postId);
    
    if (postIndex === -1) {
        return res.status(404).json({ error: 'Post not found' });
    }
    
    db.channel_posts.splice(postIndex, 1);
    res.json({ success: true, message: 'Пост удален' });
});

// Управление отзывами
app.get('/api/admin/reviews', requireAdmin, (req, res) => {
    const { status = 'pending' } = req.query;
    
    const reviews = db.post_reviews
        .filter(r => r.status === status)
        .map(review => {
            const user = db.users.find(u => u.user_id === review.user_id);
            const post = db.channel_posts.find(p => p.post_id === review.post_id);
            const moderator = db.admins.find(a => a.user_id === review.moderator_id);
            return {
                ...review,
                tg_first_name: user?.tg_first_name,
                tg_username: user?.tg_username,
                post_title: post?.title,
                moderator_username: moderator?.username
            };
        })
        .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    
    res.json({ reviews });
});

app.post('/api/admin/reviews/:reviewId/moderate', requireAdmin, (req, res) => {
    const reviewId = parseInt(req.params.reviewId);
    const { status, admin_comment } = req.body;
    const adminId = req.admin.user_id;
    
    const review = db.post_reviews.find(r => r.id === reviewId);
    if (!review) {
        return res.status(404).json({ error: 'Review not found' });
    }
    
    review.status = status;
    review.moderated_at = new Date().toISOString();
    review.moderator_id = adminId;
    review.admin_comment = admin_comment || null;
    
    res.json({ 
        success: true, 
        message: `Отзыв ${status === 'approved' ? 'одобрен' : 'отклонен'}`,
        review: review
    });
});

// Получение детальной статистики квиза
app.get('/api/admin/quizzes/:quizId/stats', requireAdmin, (req, res) => {
    const quizId = parseInt(req.params.quizId);
    
    const quiz = db.quizzes.find(q => q.id === quizId);
    if (!quiz) {
        return res.status(404).json({ error: 'Quiz not found' });
    }
    
    const completions = db.quiz_completions.filter(qc => qc.quiz_id === quizId);
    const perfectCompletions = completions.filter(qc => qc.perfect_score);
    
    const stats = {
        quiz: {
            id: quiz.id,
            title: quiz.title,
            questions_count: quiz.questions.length,
            difficulty: quiz.difficulty,
            created_at: quiz.created_at
        },
        completions: {
            total: completions.length,
            perfect: perfectCompletions.length,
            average_score: completions.length > 0 ? 
                completions.reduce((sum, qc) => sum + qc.score, 0) / completions.length : 0,
            average_time: completions.length > 0 ? 
                completions.reduce((sum, qc) => sum + qc.time_spent, 0) / completions.length : 0,
            success_rate: completions.length > 0 ? 
                (completions.filter(qc => qc.score >= quiz.questions.length / 2).length / completions.length) * 100 : 0
        },
        question_stats: quiz.questions.map(question => {
            const correctAnswers = completions.filter(qc => 
                qc.answers && qc.answers[quiz.questions.indexOf(question)] === question.correctAnswer
            ).length;
            
            return {
                question: question.question,
                correct_answers: correctAnswers,
                success_rate: completions.length > 0 ? (correctAnswers / completions.length) * 100 : 0
            };
        })
    };
    
    res.json(stats);
});

// Управление статусом квиза
app.put('/api/admin/quizzes/:quizId/status', requireAdmin, (req, res) => {
    const quizId = parseInt(req.params.quizId);
    const { is_active } = req.body;
    
    const quiz = db.quizzes.find(q => q.id === quizId);
    if (!quiz) {
        return res.status(404).json({ error: 'Quiz not found' });
    }
    
    quiz.is_active = is_active;
    
    res.json({
        success: true,
        message: `Quiz ${is_active ? 'activated' : 'deactivated'} successfully`,
        quiz: quiz
    });
});

// Получение участников марафона
app.get('/api/admin/marathons/:marathonId/participants', requireAdmin, (req, res) => {
    const marathonId = parseInt(req.params.marathonId);
    
    const completions = db.marathon_completions.filter(mc => mc.marathon_id === marathonId);
    
    const participants = completions.map(completion => {
        const user = db.users.find(u => u.user_id === completion.user_id);
        const submissions = db.marathon_submissions.filter(
            ms => ms.user_id === completion.user_id && ms.marathon_id === marathonId
        );
        
        return {
            user_id: user.user_id,
            user_name: user.tg_first_name,
            user_username: user.tg_username,
            current_day: completion.current_day,
            progress: completion.progress,
            completed: completion.completed,
            started_at: completion.started_at,
            completed_at: completion.completed_at,
            submissions_count: submissions.length,
            total_sparks_earned: completion.total_sparks_earned
        };
    });
    
    res.json({
        participants: participants,
        total: participants.length,
        active: participants.filter(p => !p.completed).length,
        completed: participants.filter(p => p.completed).length
    });
});

// Управление статусом интерактива
app.put('/api/admin/interactives/:interactiveId/status', requireAdmin, (req, res) => {
    const interactiveId = parseInt(req.params.interactiveId);
    const { is_active } = req.body;
    
    const interactive = db.interactives.find(i => i.id === interactiveId);
    if (!interactive) {
        return res.status(404).json({ error: 'Interactive not found' });
    }
    
    interactive.is_active = is_active;
    
    res.json({
        success: true,
        message: `Interactive ${is_active ? 'activated' : 'deactivated'} successfully`,
        interactive: interactive
    });
});

// Получение постов для админки
app.get('/api/admin/posts', requireAdmin, (req, res) => {
    const posts = db.channel_posts.map(post => {
        const admin = db.admins.find(a => a.user_id === post.admin_id);
        const reviews = db.post_reviews.filter(r => r.post_id === post.post_id);
        
        return {
            ...post,
            admin_username: admin?.username,
            reviews_count: reviews.length,
            average_rating: reviews.length > 0 ? 
                reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length : 0
        };
    }).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    
    res.json({ posts });
});

// Создание нового поста
app.post('/api/admin/posts', requireAdmin, (req, res) => {
    const { title, content, image_url, video_url, media_type, action_type, action_target, tags, featured, excerpt } = req.body;
    
    const errors = [];
    if (!title || title.length < 5) errors.push('Title must be at least 5 characters');
    if (!content || content.length < 10) errors.push('Content must be at least 10 characters');
    
    if (errors.length > 0) {
        return res.status(400).json({ error: errors.join(', ') });
    }
    
    const newPost = {
        id: Date.now(),
        post_id: `post_${Date.now()}`,
        title,
        content,
        image_url: image_url || '',
        video_url: video_url || '',
        media_type: media_type || 'text',
        admin_id: req.admin.user_id,
        created_at: new Date().toISOString(),
        is_active: true,
        telegram_message_id: null,
        action_type: action_type || null,
        action_target: action_target || null,
        likes_count: 0,
        comments_count: 0,
        views_count: 0,
        tags: tags || [],
        featured: featured || false,
        publish_date: new Date().toISOString(),
        excerpt: excerpt || content.substring(0, 150) + '...'
    };
    
    db.channel_posts.push(newPost);
    
    res.json({
        success: true,
        message: 'Post created successfully',
        post: newPost
    });
});

// Получение товаров для админки
app.get('/api/admin/shop/items', requireAdmin, (req, res) => {
    const items = db.shop_items.map(item => {
        const purchasesCount = db.purchases.filter(p => p.item_id === item.id).length;
        const totalRevenue = db.purchases
            .filter(p => p.item_id === item.id)
            .reduce((sum, p) => sum + p.price_paid, 0);
            
        return {
            ...item,
            purchases_count: purchasesCount,
            total_revenue: totalRevenue
        };
    });
    
    res.json(items);
});

// Создание товара
app.post('/api/admin/shop/items', requireAdmin, (req, res) => {
    const { title, description, type, file_url, preview_url, price, content_text, category, difficulty, duration, instructor, features, tags, requirements, what_you_learn, discount_percent, original_price } = req.body;
    
    const errors = [];
    if (!title || title.length < 5) errors.push('Title must be at least 5 characters');
    if (!description || description.length < 10) errors.push('Description must be at least 10 characters');
    if (!price || price < 0) errors.push('Price must be positive');
    
    if (errors.length > 0) {
        return res.status(400).json({ error: errors.join(', ') });
    }
    
    const newItem = {
        id: Date.now(),
        title,
        description,
        type: type || 'video_course',
        file_url: file_url || '',
        preview_url: preview_url || '',
        price: parseFloat(price),
        content_text: content_text || '',
        category: category || 'general',
        difficulty: difficulty || 'beginner',
        duration: duration || '',
        instructor: instructor || '',
        features: features || [],
        tags: tags || [],
        requirements: requirements || '',
        what_you_learn: what_you_learn || [],
        discount_percent: discount_percent || 0,
        original_price: original_price || parseFloat(price),
        is_active: true,
        created_at: new Date().toISOString(),
        rating: 0,
        students_count: 0,
        featured: false
    };
    
    db.shop_items.push(newItem);
    
    res.json({
        success: true,
        message: 'Item created successfully',
        item: newItem
    });
});

// Управление админами - ИСПРАВЛЕННАЯ ВЕРСИЯ
app.get('/api/admin/admins', requireAdmin, (req, res) => {
    const admins = db.admins.map(admin => {
        const user = db.users.find(u => u.user_id === admin.user_id);
        return {
            ...admin,
            tg_first_name: user?.tg_first_name,
            tg_username: user?.tg_username
        };
    });
    res.json(admins);
});

app.post('/api/admin/admins', requireAdmin, (req, res) => {
    const { user_id, username, role, permissions } = req.body;
    
    if (!user_id) {
        return res.status(400).json({ error: 'User ID is required' });
    }
    
    const existingAdmin = db.admins.find(a => a.user_id == user_id);
    if (existingAdmin) {
        return res.status(400).json({ error: 'Admin already exists' });
    }
    
    const user = db.users.find(u => u.user_id == user_id);
    if (!user) {
        // Создаем пользователя если не существует
        const newUser = {
            id: Date.now(),
            user_id: parseInt(user_id),
            tg_first_name: username || 'Администратор',
            tg_username: username,
            sparks: 0,
            level: 'Ученик',
            is_registered: true,
            class: 'Администраторы',
            character_id: null,
            character_name: null,
            available_buttons: [],
            registration_date: new Date().toISOString(),
            last_active: new Date().toISOString(),
            total_activities: 0,
            completed_quizzes: 0,
            completed_marathons: 0,
            uploaded_works: 0,
            email: null,
            phone: null,
            bio: '',
            avatar_url: null,
            is_premium: true,
            premium_until: null,
            notifications_enabled: true,
            email_notifications: false
        };
        db.users.push(newUser);
    }
    
    const newAdmin = {
        id: Date.now(),
        user_id: parseInt(user_id),
        username: username || 'admin',
        role: role || 'moderator',
        permissions: permissions || ['users', 'content', 'moderation'],
        created_at: new Date().toISOString(),
        last_login: new Date().toISOString(),
        is_active: true,
        email: null,
        phone: null
    };
    
    db.admins.push(newAdmin);
    
    res.json({ 
        success: true, 
        message: 'Админ успешно добавлен',
        admin: newAdmin
    });
});

app.delete('/api/admin/admins/:userId', requireAdmin, (req, res) => {
    const userId = parseInt(req.params.userId);
    
    if (userId === req.admin.user_id) {
        return res.status(400).json({ error: 'Cannot remove yourself' });
    }
    
    const adminIndex = db.admins.findIndex(a => a.user_id === userId);
    if (adminIndex === -1) {
        return res.status(404).json({ error: 'Admin not found' });
    }
    
    db.admins.splice(adminIndex, 1);
    res.json({ success: true, message: 'Админ удален' });
});

// Отчет по пользователям
app.get('/api/admin/users-report', requireAdmin, (req, res) => {
    const users = db.users
        .filter(u => u.is_registered)
        .map(user => {
            const stats = getUserStats(user.user_id);
            const works = db.user_works.filter(w => w.user_id === user.user_id);
            const quizCompletions = db.quiz_completions.filter(q => q.user_id === user.user_id);
            const marathonCompletions = db.marathon_completions.filter(m => m.user_id === user.user_id);
            const interactiveCompletions = db.interactive_completions.filter(i => i.user_id === user.user_id);
            const purchases = db.purchases.filter(p => p.user_id === user.user_id);
            
            const totalActivities = 
                quizCompletions.length + 
                marathonCompletions.filter(m => m.completed).length + 
                interactiveCompletions.length + 
                works.length;
            
            return {
                id: user.user_id,
                name: user.tg_first_name,
                username: user.tg_username,
                role: user.class,
                character: user.character_name,
                sparks: user.sparks,
                level: user.level,
                total_quizzes: quizCompletions.length,
                total_marathons: marathonCompletions.filter(m => m.completed).length,
                total_interactives: interactiveCompletions.length,
                total_works: works.length,
                approved_works: works.filter(w => w.status === 'approved').length,
                total_purchases: purchases.length,
                total_spent: purchases.reduce((sum, p) => sum + p.price_paid, 0),
                total_activities: totalActivities,
                registration_date: user.registration_date,
                last_active: user.last_active,
                is_premium: user.is_premium,
                streak: stats.streak
            };
        })
        .sort((a, b) => b.total_activities - a.total_activities);
    
    res.json({ users });
});

// Полная статистика
app.get('/api/admin/full-stats', requireAdmin, (req, res) => {
    const stats = {
        users: {
            total: db.users.length,
            registered: db.users.filter(u => u.is_registered).length,
            by_role: db.roles.map(role => ({
                role: role.name,
                count: db.users.filter(u => u.class === role.name).length
            })),
            active_today: db.users.filter(u => {
                const today = new Date();
                const lastActive = new Date(u.last_active);
                return lastActive.toDateString() === today.toDateString();
            }).length,
            active_week: db.users.filter(u => {
                const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
                const lastActive = new Date(u.last_active);
                return lastActive > weekAgo;
            }).length,
            new_today: db.users.filter(u => {
                const today = new Date().toDateString();
                return new Date(u.registration_date).toDateString() === today;
            }).length,
            premium: db.users.filter(u => u.is_premium).length
        },
        content: {
            quizzes: db.quizzes.length,
            active_quizzes: db.quizzes.filter(q => q.is_active).length,
            marathons: db.marathons.length,
            active_marathons: db.marathons.filter(m => m.is_active).length,
            shop_items: db.shop_items.length,
            active_shop_items: db.shop_items.filter(i => i.is_active).length,
            posts: db.channel_posts.length,
            active_posts: db.channel_posts.filter(p => p.is_active).length,
            interactives: db.interactives.length,
            active_interactives: db.interactives.filter(i => i.is_active).length
        },
        activities: {
            total_sparks: db.users.reduce((sum, user) => sum + user.sparks, 0),
            earned_sparks: db.activities.reduce((sum, a) => sum + a.sparks_earned, 0),
            spent_sparks: db.purchases.reduce((sum, p) => sum + p.price_paid, 0),
            total_purchases: db.purchases.length,
            total_works: db.user_works.length,
            pending_moderation: {
                works: db.user_works.filter(w => w.status === 'pending').length,
                reviews: db.post_reviews.filter(r => r.status === 'pending').length
            },
            total_activities: db.activities.length
        },
        completions: {
            quizzes: db.quiz_completions.length,
            marathons: db.marathon_completions.filter(m => m.completed).length,
            interactives: db.interactive_completions.length
        },
        revenue: {
            total: db.purchases.reduce((sum, p) => sum + p.price_paid, 0),
            by_item: db.shop_items.map(item => {
                const itemPurchases = db.purchases.filter(p => p.item_id === item.id);
                return {
                    item: item.title,
                    purchases: itemPurchases.length,
                    revenue: itemPurchases.reduce((sum, p) => sum + p.price_paid, 0)
                };
            }).filter(item => item.purchases > 0)
        }
    };
    
    res.json(stats);
});

// Настройки системы
app.get('/api/admin/settings', requireAdmin, (req, res) => {
    res.json(db.settings);
});

app.put('/api/admin/settings', requireAdmin, (req, res) => {
    const { settings } = req.body;
    
    if (!settings || !Array.isArray(settings)) {
        return res.status(400).json({ error: 'Settings array is required' });
    }
    
    settings.forEach(setting => {
        const existingSetting = db.settings.find(s => s.key === setting.key);
        if (existingSetting) {
            existingSetting.value = setting.value;
        } else {
            db.settings.push(setting);
        }
    });
    
    res.json({ success: true, message: 'Настройки обновлены' });
});

// Обновление настроек системы
app.post('/api/admin/settings/update', requireAdmin, (req, res) => {
    const { settings } = req.body;
    
    if (!settings || !Array.isArray(settings)) {
        return res.status(400).json({ error: 'Settings array is required' });
    }
    
    const results = [];
    
    settings.forEach(setting => {
        const existingSetting = db.settings.find(s => s.key === setting.key);
        if (existingSetting) {
            existingSetting.value = setting.value;
            if (setting.description) {
                existingSetting.description = setting.description;
            }
            results.push({
                key: setting.key,
                success: true,
                action: 'updated'
            });
        } else {
            db.settings.push({
                key: setting.key,
                value: setting.value,
                description: setting.description || `Setting for ${setting.key}`
            });
            results.push({
                key: setting.key,
                success: true,
                action: 'created'
            });
        }
    });
    
    res.json({
        success: true,
        message: `Updated ${results.length} settings`,
        results: results
    });
});

// Сброс системы (только для суперадминов)
app.post('/api/admin/system/reset', requireAdmin, (req, res) => {
    // Проверяем, что пользователь суперадмин
    if (req.admin.role !== 'superadmin') {
        return res.status(403).json({ error: 'Only superadmins can reset the system' });
    }
    
    const { reset_type, confirmation } = req.body;
    
    if (confirmation !== 'I understand this will delete all data') {
        return res.status(400).json({ error: 'Confirmation phrase is required' });
    }
    
    let resetData = {};
    
    switch (reset_type) {
        case 'activities':
            db.activities = [];
            resetData.activities = 'All activities cleared';
            break;
            
        case 'users':
            // Сохраняем только админов
            const admins = db.admins;
            db.users = db.users.filter(u => admins.some(a => a.user_id === u.user_id));
            db.activities = [];
            db.quiz_completions = [];
            db.marathon_completions = [];
            db.user_works = [];
            resetData.users = 'All user data cleared (admins preserved)';
            break;
            
        case 'content':
            db.quizzes = db.quizzes.filter(q => q.id <= 2); // Сохраняем базовые квизы
            db.marathons = db.marathons.filter(m => m.id <= 1); // Сохраняем базовые марафоны
            db.interactives = db.interactives.filter(i => i.id <= 1); // Сохраняем базовые интерактивы
            db.channel_posts = db.channel_posts.filter(p => p.id <= 1); // Сохраняем базовые посты
            resetData.content = 'All content reset to default';
            break;
            
        default:
            return res.status(400).json({ error: 'Invalid reset type' });
    }
    
    res.json({
        success: true,
        message: `System reset completed: ${reset_type}`,
        reset_data: resetData
    });
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
                    last_active: new Date().toISOString(),
                    total_activities: 0,
                    completed_quizzes: 0,
                    completed_marathons: 0,
                    uploaded_works: 0,
                    email: null,
                    phone: null,
                    bio: '',
                    avatar_url: null,
                    is_premium: false,
                    premium_until: null,
                    notifications_enabled: true,
                    email_notifications: false
                };
                db.users.push(user);
            } else {
                user.last_active = new Date().toISOString();
            }

            const welcomeText = `🎨 Привет, ${name}!

Добро пожаловать в **Мастерскую Вдохновения** v9.0!

✨ Откройте личный кабинет чтобы:
• 🎯 Проходить квизы и получать искры
• 🏃‍♂️ Участвовать в марафонах  
• 🖼️ Загружать свои работы
• 🎮 Выполнять интерактивные задания
• 🔄 Менять роль и персонажа
• 📊 Отслеживать прогресс
• 🛒 Покупать обучающие материалы
• 🏆 Получать достижения

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
            
            const admin = db.admins.find(a => a.user_id == userId && a.is_active);
            if (!admin) {
                bot.sendMessage(chatId, '❌ У вас нет прав доступа к админ панели.');
                return;
            }
            
            const baseUrl = process.env.APP_URL || 'https://your-domain.timeweb.cloud';
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

        bot.onText(/\/stats/, (msg) => {
            const chatId = msg.chat.id;
            const userId = msg.from.id;
            
            const admin = db.admins.find(a => a.user_id == userId && a.is_active);
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
            
            const statsText = `📊 Статистика бота v9.0:
            
👥 Пользователи: ${stats.totalUsers}
✅ Зарегистрировано: ${stats.registeredUsers}
🎯 Активных квизов: ${stats.activeQuizzes}
🏃‍♂️ Активных марафонов: ${stats.activeMarathons}
🛒 Товаров в магазине: ${stats.shopItems}
✨ Всего искр: ${stats.totalSparks.toFixed(1)}`;
            
            bot.sendMessage(chatId, statsText);
        });

        // Команда для проверки достижений
        bot.onText(/\/achievements/, (msg) => {
            const chatId = msg.chat.id;
            const userId = msg.from.id;
            
            const user = db.users.find(u => u.user_id === userId);
            if (!user) {
                bot.sendMessage(chatId, 'Сначала зайдите в личный кабинет через кнопку ниже.');
                return;
            }
            
            const userAchievements = db.user_achievements
                .filter(ua => ua.user_id === userId)
                .map(ua => {
                    const achievement = db.achievements.find(a => a.id === ua.achievement_id);
                    return achievement;
                })
                .filter(a => a);
            
            if (userAchievements.length === 0) {
                bot.sendMessage(chatId, 'У вас пока нет достижений. Активнее участвуйте в жизни сообщества!');
                return;
            }
            
            let achievementsText = `🏆 Ваши достижения (${userAchievements.length}):\n\n`;
            userAchievements.forEach((achievement, index) => {
                achievementsText += `${achievement.icon} ${achievement.title}\n${achievement.description}\n\n`;
            });
            
            bot.sendMessage(chatId, achievementsText);
        });

    } catch (error) {
        console.error('❌ Ошибка инициализации бота:', error);
    }
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Сервер запущен на порту ${PORT}`);
    console.log(`📱 WebApp: ${process.env.APP_URL || `http://localhost:${PORT}`}`);
    console.log(`🔧 Admin: ${process.env.APP_URL || `http://localhost:${PORT}`}/admin`);
    console.log(`🎯 Квизов: ${db.quizzes.length}`);
    console.log(`🏃‍♂️ Марафонов: ${db.marathons.length}`);
    console.log(`🎮 Интерактивов: ${db.interactives.length}`);
    console.log(`🛒 Товаров: ${db.shop_items.length}`);
    console.log(`👥 Пользователей: ${db.users.length}`);
    console.log(`🔧 Админов: ${db.admins.length}`);
    console.log('✅ Все системы работают!');
});
