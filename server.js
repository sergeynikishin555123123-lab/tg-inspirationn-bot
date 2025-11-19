import express from 'express';
import TelegramBot from 'node-telegram-bot-api';
import cors from 'cors';
import bodyParser from 'body-parser';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readdirSync, existsSync } from 'fs';
import dotenv from 'dotenv';
import { google } from 'googleapis';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();

// Автоматическое определение пути для TimeWeb
const APP_ROOT = process.cwd();

console.log('🎨 Мастерская Вдохновения - Запуск системы...');
console.log('📁 Текущая рабочая директория:', APP_ROOT);

// In-memory база данных с улучшенной структурой
let db = {
    users: [
        {
            id: 2,
            user_id: 898508164,
            tg_first_name: 'Администратор',
            tg_username: 'admin',
            sparks: 0,
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
        },
        {
            id: 2,
            title: "🏛️ История искусства",
            description: "Тест по истории мирового искусства",
            questions: [
                {
                    question: "В какой стране возникло искусство эпохи Возрождения?",
                    options: ["Франция", "Италия", "Испания", "Германия"],
                    correctAnswer: 1
                },
                {
                    question: "Кто является автором фрески 'Тайная вечеря'?",
                    options: ["Микеланджело", "Рафаэль", "Леонардо да Винчи", "Боттичелли"],
                    correctAnswer: 2
                },
                {
                    question: "Какой стиль характеризуется асимметрией и изогнутыми линиями?",
                    options: ["Ренессанс", "Барокко", "Готика", "Классицизм"],
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
                },
                { 
                    day: 3, 
                    title: "Работа с светом", 
                    description: "Научитесь передавать свет и тень в акварели",
                    requires_submission: true,
                    submission_type: "text"
                },
                { 
                    day: 4, 
                    title: "Пейзаж акварелью", 
                    description: "Нарисуйте свой первый пейзаж и загрузите фото работы",
                    requires_submission: true,
                    submission_type: "image"
                },
                { 
                    day: 5, 
                    title: "Портрет акварелью", 
                    description: "Освойте технику портрета акварелью",
                    requires_submission: true,
                    submission_type: "text"
                },
                { 
                    day: 6, 
                    title: "Натюрморт", 
                    description: "Создайте композицию с натуры и загрузите фото",
                    requires_submission: true,
                    submission_type: "image"
                },
                { 
                    day: 7, 
                    title: "Финальная работа", 
                    description: "Завершите марафон итоговой работой и поделитесь впечатлениями",
                    requires_submission: true,
                    submission_type: "text"
                }
            ],
            sparks_per_day: 7,
            is_active: true,
            created_at: new Date().toISOString()
        },
        {
            id: 2,
            title: "👗 Марафон стиля",
            description: "5-дневный марафон по созданию гармоничного образа",
            duration_days: 5,
            tasks: [
                { 
                    day: 1, 
                    title: "Анализ цветотипа", 
                    description: "Определите свой цветотип и опишите результаты",
                    requires_submission: true,
                    submission_type: "text"
                },
                { 
                    day: 2, 
                    title: "Базовая капсула", 
                    description: "Создайте базовый гардероб и загрузите фото своих вещей",
                    requires_submission: true,
                    submission_type: "image"
                },
                { 
                    day: 3, 
                    title: "Акценты и аксессуары", 
                    description: "Научитесь дополнять образ аксессуарами",
                    requires_submission: true,
                    submission_type: "text"
                },
                { 
                    day: 4, 
                    title: "Стилизация", 
                    description: "Создайте несколько образов и загрузите фото",
                    requires_submission: true,
                    submission_type: "image"
                },
                { 
                    day: 5, 
                    title: "Итоговый образ", 
                    description: "Подберите идеальный образ для мероприятия и опишите его",
                    requires_submission: true,
                    submission_type: "text"
                }
            ],
            sparks_per_day: 5,
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
            content_text: "В этом уроке вы научитесь основам работы с акварелью, смешиванию цветов и созданию первых работ. Материал подойдет для начинающих художников.\n\nСодержание:\n- Подготовка материалов\n- Основные техники\n- Смешивание цветов\n- Создание простых работ\n- Советы по улучшению",
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
            content_text: "Подробное руководство по построению композиции в художественных работах. Золотое сечение, правило третей, баланс и ритм.\n\nТемы:\n- Золотое сечение\n- Правило третей\n- Баланс и симметрия\n- Создание глубины\n- Работа с цветом",
            is_active: true,
            created_at: new Date().toISOString()
        },
        {
            id: 3,
            title: "👗 Гид по стилю",
            description: "Полное руководство по созданию гармоничного образа",
            type: "text",
            file_url: "",
            preview_url: "https://images.unsplash.com/photo-1445205170230-053b83016050?w=300&h=200&fit=crop",
            price: 12,
            content_text: "Как определить свой цветотип, подобрать базовый гардероб, сочетать цвета и аксессуары. Практические советы от стилиста.\n\nРазделы:\n- Определение цветотипа\n- Базовый гардероб\n- Сочетание цветов\n- Выбор аксессуаров\n- Создание образов",
            is_active: true,
            created_at: new Date().toISOString()
        },
        {
            id: 4,
            title: "🧵 Основы вышивки",
            description: "Видеокурс по основам вышивки для начинающих",
            type: "video",
            file_url: "https://example.com/embroidery-course.mp4",
            preview_url: "https://images.unsplash.com/photo-1576588676125-c6d68cf48b5c?w=300&h=200&fit=crop",
            price: 18,
            content_text: "Полный курс по основам вышивки. От простых стежков до сложных техник.\n\nСодержание:\n- Необходимые материалы\n- Основные стежки\n- Техники вышивки\n- Создание узоров\n- Завершение работы",
            is_active: true,
            created_at: new Date().toISOString()
        }
    ],
    activities: [],
admins: [
    { 
        id: 1, 
        user_id: 898508164,       // 👈 ВАШ ID КАК АДМИН
        username: 'admin', 
        role: 'superadmin', 
        created_at: new Date().toISOString() 
    }
],                                // ← 👈 ЗАПЯТАЯ ОСТАЕТСЯ ЗДЕСЬ
purchases: [],
    channel_posts: [
        {
            id: 1,
            post_id: "post_art_basics",
            title: "🎨 Основы композиции в живописи",
            content: "Сегодня поговорим о фундаментальных принципах построения композиции. Золотое сечение, правило третей и многое другое! Композиция - это основа любого художественного произведения, которая помогает направлять взгляд зрителя и создавать гармоничное изображение.\n\n💡 Практический совет: Попробуйте использовать правило третей в своей следующей работе - разделите холст на 9 равных частей и размещайте ключевые элементы на пересечениях линий.",
            image_url: "https://images.unsplash.com/photo-1541961017774-22349e4a1262?w=400&h=300&fit=crop",
            video_url: null,
            media_type: 'image',
            admin_id: 898508164,
            is_active: true,
            created_at: new Date().toISOString(),
            telegram_message_id: null,
            action_type: null,
            action_target: null
        },
        {
            id: 2,
            post_id: "post_style_tips",
            title: "👗 5 советов по созданию стильного образа",
            content: "1. Определите свой цветотип\n2. Создайте базовую капсулу\n3. Не бойтесь аксессуаров\n4. Учитывайте мероприятие\n5. Будьте уверены в себе!\n\n✨ Помните: Стиль - это не следование трендам, а умение выражать свою индивидуальность через одежду.",
            image_url: "https://images.unsplash.com/photo-1445205170230-053b83016050?w=400&h=300&fit=crop",
            video_url: null,
            media_type: 'image',
            admin_id: 898508164,
            is_active: true,
            created_at: new Date().toISOString(),
            telegram_message_id: null,
            action_type: null,
            action_target: null
        },
        {
            id: 3,
            post_id: "post_history_art",
            title: "🏛️ Интересные факты о Ренессансе",
            content: "Эпоха Возрождения подарила миру множество шедевров. Знаете ли вы, что:\n\n• Леонардо да Винчи был вегетарианцем\n• Микеланджело считал себя в первую очередь скульптором\n• Рафаэль умер в день своего рождения\n• Боттичелли сжег многие свои работы\n\n🎯 Интересный факт: Картины того времени часто содержали скрытые символы и послания.",
            image_url: "https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?w=400&h=300&fit=crop",
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
        },
        {
            id: 2,
            title: "👗 Подбери образ для мероприятия",
            description: "Создай гармоничный образ для конкретного события",
            type: "style_match",
            category: "style",
            image_url: "https://images.unsplash.com/photo-1445205170230-053b83016050?w=400&h=300&fit=crop",
            question: "Какое сочетание цветов подойдет для деловой встречи?",
            options: ["Черный + белый + красный акцент", "Ярко-красный + зеленый", "Фиолетовый + оранжевый", "Розовый + голубой"],
            correct_answer: 0,
            sparks_reward: 2,
            allow_retake: true,
            is_active: true,
            created_at: new Date().toISOString()
        },
        {
            id: 3,
            title: "✏️ Продолжи рисунок",
            description: "Дорисуйте предложенный контур и создайте свою работу",
            type: "drawing_challenge",
            category: "art",
            image_url: "https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=400&h=300&fit=crop",
            question: "Дорисуйте этот контур и создайте свою уникальную работу",
            options: [],
            correct_answer: null,
            sparks_reward: 5,
            allow_retake: true,
            is_active: true,
            created_at: new Date().toISOString()
        },
        {
            id: 4,
            title: "🔍 Найди отличия",
            description: "Найдите все отличия между двумя изображениями",
            type: "find_difference",
            category: "art",
            image_url: "https://images.unsplash.com/photo-1541961017774-22349e4a1262?w=400&h=300&fit=crop",
            question: "Сколько отличий вы нашли между изображениями?",
            options: ["2 отличия", "3 отличия", "4 отличия", "5 отличий"],
            correct_answer: 2,
            sparks_reward: 3,
            allow_retake: false,
            is_active: true,
            created_at: new Date().toISOString()
        },
        {
            id: 5,
            title: "🧩 Исторический пазл",
            description: "Соберите пазл из фрагментов известной картины",
            type: "puzzle",
            category: "history",
            image_url: "https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?w=400&h=300&fit=crop",
            question: "Из скольких фрагментов состоит этот пазл?",
            options: ["6 фрагментов", "9 фрагментов", "12 фрагментов", "16 фрагментов"],
            correct_answer: 1,
            sparks_reward: 2,
            allow_retake: true,
            is_active: true,
            created_at: new Date().toISOString()
        },
        {
            id: 6,
            title: "🎭 Определи стиль художника",
            description: "По фрагменту картины определите авторский стиль",
            type: "guess_era",
            category: "history",
            image_url: "https://images.unsplash.com/photo-1578301978693-85fa9c0320b9?w=400&h=300&fit=crop",
            question: "Какому художнику принадлежит этот стиль?",
            options: ["Ван Гог", "Моне", "Пикассо", "Дали"],
            correct_answer: 0,
            sparks_reward: 4,
            allow_retake: false,
            is_active: true,
            created_at: new Date().toISOString()
        }
    ],
    interactive_completions: [],
    interactive_submissions: [],
        marathon_submissions: []
};

// ==================== GOOGLE SHEETS ИНТЕГРАЦИЯ ====================
// Конфигурация Google Sheets
const SPREADSHEET_ID = '13ejLNfIpsW71iR08uirh3TbdcBCWpK3bt_NLeqkRa5c'; // Замените на реальный ID из URL таблицы
const SHEET_NAME = 'Данные пользователей';

// Функция для инициализации Google Sheets API
async function initializeSheets() {
    try {
        const auth = new google.auth.GoogleAuth({
            keyFile: './google-sheets-credentials.json',
            scopes: ['https://www.googleapis.com/auth/spreadsheets'],
        });

        const client = await auth.getClient();
        const sheets = google.sheets({ version: 'v4', auth: client });
        
        console.log('✅ Google Sheets API инициализирован');
        return sheets;
    } catch (error) {
        console.error('❌ Ошибка инициализации Google Sheets:', error);
        return null;
    }
}

// Функция для подготовки данных пользователей
function prepareUserDataForSheets() {
    return db.users.filter(user => user.is_registered).map(user => {
        const stats = getUserStats(user.user_id);
        const works = db.user_works.filter(w => w.user_id === user.user_id);
        const quizCompletions = db.quiz_completions.filter(q => q.user_id === user.user_id);
        const marathonCompletions = db.marathon_completions.filter(m => m.user_id === user.user_id && m.completed);
        const purchases = db.purchases.filter(p => p.user_id === user.user_id);
        const activities = db.activities.filter(a => a.user_id === user.user_id);
        
        const totalActivities = 
            quizCompletions.length + 
            marathonCompletions.length + 
            works.length + 
            activities.filter(a => a.activity_type === 'post_review').length;

        const totalSparksEarned = activities.reduce((sum, a) => sum + a.sparks_earned, 0);

        return [
            user.user_id.toString(),
            user.tg_first_name || '',
            user.tg_username || '',
            user.class || '',
            user.character_name || '',
            user.level || '',
            user.sparks.toFixed(1),
            new Date(user.registration_date).toLocaleDateString('ru-RU'),
            new Date(user.last_active).toLocaleDateString('ru-RU'),
            quizCompletions.length.toString(),
            marathonCompletions.length.toString(),
            works.length.toString(),
            works.filter(w => w.status === 'approved').length.toString(),
            purchases.length.toString(),
            totalActivities.toString(),
            totalSparksEarned.toFixed(1)
        ];
    });
}

// Функция для экспорта данных в Google Sheets
async function exportUsersToSheets(sheets) {
    try {
        if (!sheets) {
            console.log('❌ Google Sheets не инициализирован');
            return false;
        }

        const userData = prepareUserDataForSheets();
        
        // Заголовки столбцов
        const headers = [
            ['ID пользователя', 'Имя', 'Username', 'Роль', 'Персонаж', 'Уровень', 'Искры', 
             'Зарегистрирован', 'Последняя активность', 'Пройдено квизов', 'Завершено марафонов',
             'Загружено работ', 'Одобрено работ', 'Покупок', 'Всего активностей', 'Всего искр']
        ];

        // Очищаем лист и записываем новые данные
        await sheets.spreadsheets.values.clear({
            spreadsheetId: SPREADSHEET_ID,
            range: `${SHEET_NAME}!A:Z`,
        });

        await sheets.spreadsheets.values.update({
            spreadsheetId: SPREADSHEET_ID,
            range: `${SHEET_NAME}!A1`,
            valueInputOption: 'RAW',
            resource: {
                values: [...headers, ...userData]
            }
        });

        console.log(`✅ Данные ${userData.length} пользователей экспортированы в Google Sheets`);
        return true;
    } catch (error) {
        console.error('❌ Ошибка экспорта в Google Sheets:', error);
        return false;
    }
}
// ==================== КОНЕЦ GOOGLE SHEETS ИНТЕГРАЦИИ ====================

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
        user.sparks = Math.max(0, user.sparks + sparks); // Защита от отрицательных значений
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
    const interactiveCompletions = db.interactive_completions.filter(i => i.user_id == userId);
    
    return {
        totalActivities: activities.length,
        totalPurchases: purchases.length,
        totalWorks: works.length,
        approvedWorks: works.filter(w => w.status === 'approved').length,
        totalQuizzesCompleted: quizCompletions.length,
        totalMarathonsCompleted: marathonCompletions.filter(m => m.completed).length,
        totalInteractivesCompleted: interactiveCompletions.length,
        totalSparksEarned: activities.reduce((sum, a) => sum + a.sparks_earned, 0)
    };
}

// ИСПРАВЛЕННАЯ ПРОВЕРКА АДМИНА
const requireAdmin = (req, res, next) => {
    const userId = req.query.userId || req.body.userId;
    
    console.log('🔐 Проверка прав админа для userId:', userId);
    
    if (!userId) {
        console.log('❌ User ID не указан');
        return res.status(401).json({ error: 'User ID required' });
    }
    
    const admin = db.admins.find(a => a.user_id == userId);
    if (!admin) {
        console.log('❌ Пользователь не является админом:', userId);
        return res.status(403).json({ error: 'Admin access required' });
    }
    
    console.log('✅ Админ подтвержден:', admin);
    req.admin = admin;
    next();
};

// Basic routes
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

// WebApp API
// ИСПРАВЛЕННОЕ СОЗДАНИЕ ПОЛЬЗОВАТЕЛЯ
app.get('/api/users/:userId', (req, res) => {
    const userId = parseInt(req.params.userId);
    console.log('👤 Запрос пользователя:', userId);
    
    let user = db.users.find(u => u.user_id === userId);
    
    if (user) {
        console.log('✅ Пользователь найден:', user.tg_first_name);
        const stats = getUserStats(userId);
        res.json({ 
            exists: true, 
            user: {
                ...user,
                stats: stats
            }
        });
    } else {
        console.log('🆕 Создание нового пользователя:', userId);
        const newUser = {
            id: Date.now(),
            user_id: userId,
            tg_first_name: 'Новый пользователь',
            tg_username: null,
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
        
        console.log('✅ Новый пользователь создан:', newUser);
        res.json({ 
            exists: false, 
            user: newUser 
        });
    }
});

// ДОБАВЬТЕ ЭТОТ МЕТОД ДЛЯ ДОБАВЛЕНИЯ АДМИНОВ
app.post('/api/admin/add-admin', requireAdmin, (req, res) => {
    const { targetUserId, username, role } = req.body;
    
    if (!targetUserId) {
        return res.status(400).json({ error: 'User ID is required' });
    }
    
    // Проверяем, не является ли пользователь уже админом
    const existingAdmin = db.admins.find(a => a.user_id == targetUserId);
    if (existingAdmin) {
        return res.status(400).json({ error: 'User is already an admin' });
    }
    
    // Проверяем, существует ли пользователь
    const user = db.users.find(u => u.user_id == targetUserId);
    if (!user) {
        return res.status(404).json({ error: 'User not found' });
    }
    
    const newAdmin = {
        id: Date.now(),
        user_id: parseInt(targetUserId),
        username: username || user.tg_username || '',
        role: role || 'moderator',
        created_at: new Date().toISOString()
    };
    
    db.admins.push(newAdmin);
    
    console.log('✅ Новый админ добавлен:', newAdmin);
    
    res.json({ 
        success: true, 
        message: 'Администратор успешно добавлен',
        admin: newAdmin
    });
});

// НОВЫЙ МЕТОД ДЛЯ СМЕНЫ РОЛИ
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
    
    // Сохраняем старую роль для лога
    const oldRole = user.class;
    
    user.class = role.name;
    user.character_id = characterId;
    user.character_name = character ? character.name : null;
    user.available_buttons = role.available_buttons;
    user.last_active = new Date().toISOString();
    
    // Логируем смену роли (0 искр)
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

// ИСПРАВЛЕННОЕ ОТПРАВЛЕНИЕ РЕЗУЛЬТАТОВ КВИЗА
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
    
    // ИСПРАВЛЕННОЕ НАЧИСЛЕНИЕ ИСКР
    let sparksEarned = 0;
    const perfectScore = correctAnswers === quiz.questions.length;
    
    // Начисляем искры за правильные ответы
    sparksEarned = correctAnswers * quiz.sparks_per_correct;
    
    // Добавляем бонус за идеальный результат
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

// НОВЫЙ МЕТОД ДЛЯ ОТПРАВКИ РАБОТЫ В МАРАФОНЕ
app.post('/api/webapp/marathons/:marathonId/submit-day', (req, res) => {
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
    
    // Проверяем требования к заданию
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
    
    // Сохраняем работу пользователя
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
    
    // Начисляем искры только после отправки работы
    const sparksEarned = marathon.sparks_per_day;
    addSparks(userId, sparksEarned, 'marathon_day', `Марафон: ${marathon.title} - день ${day}`);
    
    completion.current_day = day + 1;
    completion.progress = Math.round((day / marathon.duration_days) * 100);
    
    if (day >= marathon.duration_days) {
        completion.completed = true;
        completion.progress = 100;
        
        // Дополнительная награда за завершение марафона
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

app.get('/api/webapp/shop/items', (req, res) => {
    const items = db.shop_items.filter(item => item.is_active);
    res.json(items);
});

// ИСПРАВЛЕННАЯ ПОКУПКА ТОВАРА
app.post('/api/webapp/shop/purchase', (req, res) => {
    const { userId, itemId } = req.body;
    
    if (!userId || !itemId) {
        return res.status(400).json({ error: 'User ID and item ID are required' });
    }
    
    const user = db.users.find(u => u.user_id == userId);
    const item = db.shop_items.find(i => i.id == itemId && i.is_active);
    
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (!item) return res.status(404).json({ error: 'Item not found' });
    
    // Проверяем, не куплен ли уже товар
    const existingPurchase = db.purchases.find(
        p => p.user_id === userId && p.item_id === itemId
    );
    
    if (existingPurchase) {
        return res.status(400).json({ error: 'Вы уже купили этот товар' });
    }
    
    if (user.sparks < item.price) {
        return res.status(400).json({ error: 'Недостаточно искр' });
    }
    
    // Списание искр
    user.sparks -= item.price;
    
    const purchase = {
        id: Date.now(),
        user_id: userId,
        item_id: itemId,
        price_paid: item.price,
        purchased_at: new Date().toISOString()
    };
    
    db.purchases.push(purchase);
    
    addSparks(userId, -item.price, 'purchase', `Покупка: ${item.title}`);
    
    res.json({
        success: true,
        message: `Покупка успешна! Куплено: ${item.title}`,
        remainingSparks: user.sparks,
        purchase: purchase
    });
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
                // ДОБАВЛЯЕМ ВСЕ ДАННЫЕ ДЛЯ ОТОБРАЖЕНИЯ
                file_data: item?.file_url?.startsWith('data:') ? item.file_url : null,
                preview_data: item?.preview_url?.startsWith('data:') ? item.preview_url : null
            };
        })
        .sort((a, b) => new Date(b.purchased_at) - new Date(a.purchased_at));
        
    res.json({ purchases: userPurchases });
});

app.get('/api/webapp/users/:userId/activities', (req, res) => {
    const userId = parseInt(req.params.userId);
    const userActivities = db.activities
        .filter(a => a.user_id === userId)
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .slice(0, 50);
    res.json({ activities: userActivities });
});

// Работы пользователя
app.post('/api/webapp/upload-work', (req, res) => {
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

// Посты канала
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

// API ДЛЯ ИНТЕРАКТИВОВ
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

// ДОБАВЬТЕ ЭТОТ МЕТОД ДЛЯ ЗАГРУЗКИ ОТЗЫВОВ
app.get('/api/admin/reviews', requireAdmin, (req, res) => {
    const { status = 'pending' } = req.query;
    
    console.log('📥 Загрузка отзывов со статусом:', status);
    
    const reviews = db.post_reviews
        .filter(r => r.status === status)
        .map(review => {
            const user = db.users.find(u => u.user_id === review.user_id);
            const post = db.channel_posts.find(p => p.post_id === review.post_id);
            const moderator = db.admins.find(a => a.user_id === review.moderator_id);
            
            return {
                ...review,
                tg_first_name: user?.tg_first_name || 'Неизвестно',
                tg_username: user?.tg_username,
                post_title: post?.title || 'Пост не найден',
                moderator_username: moderator?.username
            };
        })
        .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    
    res.json({ reviews });
});

// Admin API
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

// Управление интерактивами
app.get('/api/admin/interactives', requireAdmin, (req, res) => {
    const interactives = db.interactives.map(interactive => {
        const completions = db.interactive_completions.filter(ic => ic.interactive_id === interactive.id);
        
        return {
            ...interactive,
            completions_count: completions.length,
            average_score: completions.length > 0 ? 
                completions.reduce((sum, ic) => sum + ic.score, 0) / completions.length : 0
        };
    });
    res.json(interactives);
});

app.post('/api/admin/interactives', requireAdmin, (req, res) => {
    const { title, description, type, category, image_url, question, options, correct_answer, sparks_reward, allow_retake } = req.body;
    
    if (!title || !type || !category) {
        return res.status(400).json({ error: 'Title, type and category are required' });
    }
    
    const newInteractive = {
        id: Date.now(),
        title,
        description: description || '',
        type,
        category,
        image_url: image_url || '',
        question: question || '',
        options: options || [],
        correct_answer: correct_answer || 0,
        sparks_reward: sparks_reward || SPARKS_SYSTEM.INTERACTIVE_COMPLETION,
        allow_retake: allow_retake || false,
        is_active: true,
        created_at: new Date().toISOString()
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
    const { title, description, type, category, image_url, question, options, correct_answer, sparks_reward, allow_retake, is_active } = req.body;
    
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
    res.json(db.roles);
});

app.post('/api/admin/roles', requireAdmin, (req, res) => {
    const { name, description, icon, available_buttons } = req.body;
    
    if (!name || !description) {
        return res.status(400).json({ error: 'Name and description are required' });
    }
    
    const newRole = {
        id: Date.now(),
        name,
        description,
        icon: icon || '🎨',
        available_buttons: available_buttons || ['quiz', 'marathon', 'works', 'activities', 'posts', 'shop', 'invite', 'interactives', 'change_role'],
        is_active: true,
        created_at: new Date().toISOString()
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
    const { name, description, icon, available_buttons, is_active } = req.body;
    
    const role = db.roles.find(r => r.id === roleId);
    if (!role) {
        return res.status(404).json({ error: 'Role not found' });
    }
    
    if (name) role.name = name;
    if (description) role.description = description;
    if (icon) role.icon = icon;
    if (available_buttons) role.available_buttons = available_buttons;
    if (is_active !== undefined) role.is_active = is_active;
    
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
        return {
            ...character,
            role_name: role?.name
        };
    });
    res.json(characters);
});

app.post('/api/admin/characters', requireAdmin, (req, res) => {
    const { role_id, name, description, bonus_type, bonus_value } = req.body;
    
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
    const { name, description, bonus_type, bonus_value, is_active } = req.body;
    
    const character = db.characters.find(c => c.id === characterId);
    if (!character) {
        return res.status(404).json({ error: 'Character not found' });
    }
    
    if (name) character.name = name;
    if (description) character.description = description;
    if (bonus_type) character.bonus_type = bonus_type;
    if (bonus_value) character.bonus_value = bonus_value;
    if (is_active !== undefined) character.is_active = is_active;
    
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
    res.json(db.shop_items);
});

app.post('/api/admin/shop/items', requireAdmin, (req, res) => {
    const { title, description, type, file_url, preview_url, price, content_text, file_data, preview_data } = req.body;
    
    if (!title || !price) {
        return res.status(400).json({ error: 'Title and price are required' });
    }
    
    const newItem = {
        id: Date.now(),
        title,
        description: description || '',
        type: type || 'video',
        file_url: file_url || file_data || '', // Поддержка base64 данных
        preview_url: preview_url || preview_data || '', // Поддержка base64 данных
        price: parseFloat(price),
        content_text: content_text || '',
        is_active: true,
        created_at: new Date().toISOString()
    };
    
    db.shop_items.push(newItem);
    
    res.json({ 
        success: true, 
        message: 'Товар успешно создан', 
        itemId: newItem.id,
        item: newItem
    });
});

app.put('/api/admin/shop/items/:itemId', requireAdmin, (req, res) => {
    const itemId = parseInt(req.params.itemId);
    const { title, description, type, file_url, preview_url, price, content_text, is_active, file_data, preview_data } = req.body;
    
    const item = db.shop_items.find(i => i.id === itemId);
    if (!item) {
        return res.status(404).json({ error: 'Item not found' });
    }
    
    if (title) item.title = title;
    if (description) item.description = description;
    if (type) item.type = type;
    if (file_url !== undefined) item.file_url = file_url;
    if (file_data !== undefined) item.file_url = file_data; // Обновляем base64 данные
    if (preview_url !== undefined) item.preview_url = preview_url;
    if (preview_data !== undefined) item.preview_url = preview_data; // Обновляем base64 данные
    if (price) item.price = parseFloat(price);
    if (content_text) item.content_text = content_text;
    if (is_active !== undefined) item.is_active = is_active;
    
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
        return {
            ...quiz,
            completions_count: completions.length,
            average_score: completions.length > 0 ? 
                completions.reduce((sum, qc) => sum + qc.score, 0) / completions.length : 0
        };
    });
    res.json(quizzes);
});

app.post('/api/admin/quizzes', requireAdmin, (req, res) => {
    const { title, description, questions, sparks_per_correct, sparks_perfect_bonus, cooldown_hours, allow_retake } = req.body;
    
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
        is_active: true,
        created_at: new Date().toISOString()
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
    const { title, description, questions, sparks_per_correct, sparks_perfect_bonus, cooldown_hours, allow_retake, is_active } = req.body;
    
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
        return {
            ...marathon,
            completions_count: completions.length,
            active_users: completions.filter(mc => !mc.completed).length
        };
    });
    res.json(marathons);
});

app.post('/api/admin/marathons', requireAdmin, (req, res) => {
    const { title, description, duration_days, tasks, sparks_per_day } = req.body;
    
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
        is_active: true,
        created_at: new Date().toISOString()
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
    const { title, description, duration_days, tasks, sparks_per_day, is_active } = req.body;
    
    const marathon = db.marathons.find(m => m.id === marathonId);
    if (!marathon) {
        return res.status(404).json({ error: 'Marathon not found' });
    }
    
    if (title) marathon.title = title;
    if (description) marathon.description = description;
    if (duration_days) marathon.duration_days = parseInt(duration_days);
    if (tasks) marathon.tasks = tasks;
    if (sparks_per_day !== undefined) marathon.sparks_per_day = sparks_per_day;
    if (is_active !== undefined) marathon.is_active = is_active;
    
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

app.post('/api/admin/user-works/:workId/moderate', requireAdmin, (req, res) => {
    // ... существующий код модерации работ ...
});

// ДОБАВЬТЕ ЭТОТ МЕТОД ДЛЯ МОДЕРАЦИИ ОТЗЫВОВ
app.post('/api/admin/reviews/:reviewId/moderate', requireAdmin, (req, res) => {
    const reviewId = parseInt(req.params.reviewId);
    const { status, admin_comment } = req.body;
    
    console.log('🔄 Модерация отзыва:', { reviewId, status });
    
    const review = db.post_reviews.find(r => r.id === reviewId);
    if (!review) {
        return res.status(404).json({ error: 'Review not found' });
    }
    
    review.status = status;
    review.moderated_at = new Date().toISOString();
    review.moderator_id = req.admin.user_id;
    review.admin_comment = admin_comment || null;
    
    res.json({ 
        success: true, 
        message: `Отзыв ${status === 'approved' ? 'одобрен' : 'отклонен'}`,
        review: review
    });
});

// ДОБАВЬТЕ ЭТОТ МЕТОД ДЛЯ РАБОТ ПОЛЬЗОВАТЕЛЕЙ
app.get('/api/admin/user-works', requireAdmin, (req, res) => {
    const { status = 'pending' } = req.query;
    
    console.log('📥 Загрузка работ со статусом:', status);
    
    const works = db.user_works
        .filter(w => w.status === status)
        .map(work => {
            const user = db.users.find(u => u.user_id === work.user_id);
            return {
                ...work,
                user_name: user?.tg_first_name || 'Неизвестно',
                user_username: user?.tg_username
            };
        })
        .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    
    res.json({ works });
});

// ДОБАВЬТЕ ЭТОТ МЕТОД ДЛЯ МОДЕРАЦИИ РАБОТ
app.post('/api/admin/user-works/:workId/moderate', requireAdmin, (req, res) => {
    const workId = parseInt(req.params.workId);
    const { status, admin_comment } = req.body;
    const adminId = req.admin.user_id;
    
    console.log('🔄 Модерация работы:', { workId, status });
    
    const work = db.user_works.find(w => w.id === workId);
    if (!work) {
        return res.status(404).json({ error: 'Work not found' });
    }
    
    work.status = status;
    work.moderated_at = new Date().toISOString();
    work.moderator_id = adminId;
    work.admin_comment = admin_comment || null;
    
    if (status === 'approved') {
        addSparks(work.user_id, SPARKS_SYSTEM.WORK_APPROVED, 'work_approved', `Работа одобрена: ${work.title}`);
    }
    
    res.json({ 
        success: true, 
        message: `Работа ${status === 'approved' ? 'одобрена' : 'отклонена'}`,
        work: work
    });
});

// Управление постами
app.get('/api/admin/channel-posts', requireAdmin, (req, res) => {
    const { status = 'pending' } = req.query;
    
    const works = db.user_works
        .filter(w => w.status === status)
        .map(work => {
            const user = db.users.find(u => u.user_id === work.user_id);
            return {
                ...work,
                user_name: user?.tg_first_name || 'Неизвестно',
                user_username: user?.tg_username
            };
        })
        .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    
    res.json({ works });
});

app.post('/api/admin/user-works/:workId/moderate', requireAdmin, (req, res) => {
    const workId = parseInt(req.params.workId);
    const { status, admin_comment } = req.body;
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
        addSparks(work.user_id, SPARKS_SYSTEM.WORK_APPROVED, 'work_approved', `Работа одобрена: ${work.title}`);
    }
    
    res.json({ 
        success: true, 
        message: `Работа ${status === 'approved' ? 'одобрена' : 'отклонена'}`,
        work: work
    });
});

// Управление постами
app.get('/api/admin/channel-posts', requireAdmin, (req, res) => {
    const posts = db.channel_posts.map(post => {
        const admin = db.admins.find(a => a.user_id === post.admin_id);
        const reviews = db.post_reviews.filter(r => r.post_id === post.post_id);
        return {
            ...post,
            admin_username: admin?.username,
            reviews_count: reviews.length
        };
    }).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    
    res.json({ posts });
});

app.post('/api/admin/channel-posts', requireAdmin, (req, res) => {
    const { post_id, title, content, image_url, video_url, media_type, action_type, action_target } = req.body;
    
    if (!post_id || !title) {
        return res.status(400).json({ error: 'Post ID and title are required' });
    }
    
    const existingPost = db.channel_posts.find(p => p.post_id === post_id);
    if (existingPost) {
        return res.status(400).json({ error: 'Post with this ID already exists' });
    }
    
    const newPost = {
        id: Date.now(),
        post_id,
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
        action_target: action_target || null
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
    const { title, content, image_url, video_url, media_type, is_active, action_type, action_target } = req.body;
    
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

// ДОБАВЬТЕ ЭТОТ МЕТОД ДЛЯ УДАЛЕНИЯ ПОСТОВ
app.delete('/api/admin/channel-posts/:postId', requireAdmin, (req, res) => {
    const postId = parseInt(req.params.postId);
    
    console.log('🗑️ Удаление поста:', postId);
    
    const postIndex = db.channel_posts.findIndex(p => p.id === postId);
    if (postIndex === -1) {
        return res.status(404).json({ error: 'Post not found' });
    }
    
    db.channel_posts.splice(postIndex, 1);
    
    console.log('✅ Пост удален');
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
    
    const review = db.post_reviews.find(r => r.id === reviewId);
    if (!review) {
        return res.status(404).json({ error: 'Review not found' });
    }
    
    review.status = status;
    review.moderated_at = new Date().toISOString();
    review.moderator_id = req.admin.user_id;
    review.admin_comment = admin_comment || null;
    
    res.json({ 
        success: true, 
        message: `Отзыв ${status === 'approved' ? 'одобрен' : 'отклонен'}`,
        review: review
    });
});

// ДОБАВЬТЕ ЭТОТ МЕТОД ДЛЯ ЗАГРУЗКИ ОТЗЫВОВ
app.get('/api/admin/reviews', requireAdmin, (req, res) => {
    const { status = 'pending' } = req.query;
    
    console.log('📥 Загрузка отзывов со статусом:', status);
    
    const reviews = db.post_reviews
        .filter(r => r.status === status)
        .map(review => {
            const user = db.users.find(u => u.user_id === review.user_id);
            const post = db.channel_posts.find(p => p.post_id === review.post_id);
            const moderator = db.admins.find(a => a.user_id === review.moderator_id);
            
            return {
                ...review,
                tg_first_name: user?.tg_first_name || 'Неизвестно',
                tg_username: user?.tg_username,
                post_title: post?.title || 'Пост не найден',
                moderator_username: moderator?.username
            };
        })
        .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    
    res.json({ reviews });
});

// ДОБАВЬТЕ ЭТОТ МЕТОД ДЛЯ МОДЕРАЦИИ ОТЗЫВОВ
app.post('/api/admin/reviews/:reviewId/moderate', requireAdmin, (req, res) => {
    const reviewId = parseInt(req.params.reviewId);
    const { status, admin_comment } = req.body;
    
    console.log('🔄 Модерация отзыва:', { reviewId, status });
    
    const review = db.post_reviews.find(r => r.id === reviewId);
    if (!review) {
        return res.status(404).json({ error: 'Review not found' });
    }
    
    review.status = status;
    review.moderated_at = new Date().toISOString();
    review.moderator_id = req.admin.user_id;
    review.admin_comment = admin_comment || null;
    
    res.json({ 
        success: true, 
        message: `Отзыв ${status === 'approved' ? 'одобрен' : 'отклонен'}`,
        review: review
    });
});

// Управление администраторами - ИСПРАВЛЕННАЯ ВЕРСИЯ
app.get('/api/admin/admins', requireAdmin, (req, res) => {
    console.log('📥 Загрузка списка администраторов');
    
    const admins = db.admins.map(admin => {
        const user = db.users.find(u => u.user_id === admin.user_id);
        return {
            ...admin,
            user_name: user?.tg_first_name || 'Неизвестно',
            user_username: user?.tg_username
        };
    });
    
    console.log('✅ Админы загружены:', admins.length);
    res.json(admins);
});

// ДОБАВЬТЕ ЭТОТ МЕТОД ДЛЯ УДАЛЕНИЯ АДМИНОВ
app.delete('/api/admin/admins/:userId', requireAdmin, (req, res) => {
    const userId = parseInt(req.params.userId);
    
    console.log('🗑️ Удаление админа:', userId);
    
    if (userId === req.admin.user_id) {
        return res.status(400).json({ error: 'Нельзя удалить самого себя' });
    }
    
    const adminIndex = db.admins.findIndex(a => a.user_id === userId);
    if (adminIndex === -1) {
        return res.status(404).json({ error: 'Админ не найден' });
    }
    
    db.admins.splice(adminIndex, 1);
    
    console.log('✅ Админ удален');
    res.json({ success: true, message: 'Администратор удален' });
});

app.post('/api/admin/admins', requireAdmin, (req, res) => {
    const { user_id, username, role } = req.body;
    
    if (!user_id) {
        return res.status(400).json({ error: 'User ID is required' });
    }
    
    const existingAdmin = db.admins.find(a => a.user_id == user_id);
    if (existingAdmin) {
        return res.status(400).json({ error: 'Admin already exists' });
    }
    
    const newAdmin = {
        id: Date.now(),
        user_id: parseInt(user_id),
        username: username || '',
        role: role || 'moderator',
        created_at: new Date().toISOString()
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
                total_activities: totalActivities,
                registration_date: user.registration_date,
                last_active: user.last_active
            };
        })
        .sort((a, b) => b.total_activities - a.total_activities);
    
    res.json({ users });
});

// ==================== GOOGLE SHEETS ЭКСПОРТ ====================

// Ручка для ручного экспорта данных в Google Sheets
app.post('/api/admin/export-to-sheets', requireAdmin, async (req, res) => {
    try {
        console.log('📤 Запрос на экспорт данных в Google Sheets...');
        
        const sheets = await initializeSheets();
        const success = await exportUsersToSheets(sheets);
        
        if (success) {
            res.json({ 
                success: true, 
                message: 'Данные успешно экспортированы в Google Sheets' 
            });
        } else {
            res.status(500).json({ 
                success: false, 
                error: 'Ошибка экспорта в Google Sheets' 
            });
        }
    } catch (error) {
        console.error('❌ Ошибка экспорта:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Внутренняя ошибка сервера при экспорте' 
        });
    }
});

// Ручка для проверки статуса Google Sheets
app.get('/api/admin/sheets-status', requireAdmin, async (req, res) => {
    try {
        const sheets = await initializeSheets();
        
        if (!sheets) {
            return res.json({ 
                connected: false,
                message: 'Google Sheets не подключен' 
            });
        }

        // Проверяем доступ к таблице
        const response = await sheets.spreadsheets.get({
            spreadsheetId: SPREADSHEET_ID,
        });

        res.json({ 
            connected: true,
            message: 'Google Sheets подключен',
            spreadsheetTitle: response.data.properties.title,
            totalUsers: db.users.filter(u => u.is_registered).length
        });
    } catch (error) {
        res.json({ 
            connected: false,
            message: `Ошибка подключения: ${error.message}` 
        });
    }
});

// Автоматический экспорт при изменении данных (опционально)
function scheduleAutoExport() {
    // Экспорт каждые 6 часов
    setInterval(async () => {
        try {
            const sheets = await initializeSheets();
            if (sheets) {
                await exportUsersToSheets(sheets);
                console.log('✅ Автоматический экспорт данных выполнен');
            }
        } catch (error) {
            console.error('❌ Ошибка автоматического экспорта:', error);
        }
    }, 6 * 60 * 60 * 1000); // 6 часов
}

// Запускаем автоматический экспорт при старте сервера
scheduleAutoExport();

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
            }).length
        },
        content: {
            quizzes: db.quizzes.length,
            marathons: db.marathons.length,
            shop_items: db.shop_items.length,
            posts: db.channel_posts.length,
            interactives: db.interactives.length
        },
        activities: {
            total_sparks: db.users.reduce((sum, user) => sum + user.sparks, 0),
            total_purchases: db.purchases.length,
            total_works: db.user_works.length,
            pending_moderation: {
                works: db.user_works.filter(w => w.status === 'pending').length,
                reviews: db.post_reviews.filter(r => r.status === 'pending').length
            }
        },
        completions: {
            quizzes: db.quiz_completions.length,
            marathons: db.marathon_completions.filter(m => m.completed).length,
            interactives: db.interactive_completions.length
        }
    };
    
    res.json(stats);
});

// Telegram Bot
let bot;
if (process.env.BOT_TOKEN) {
    try {
        bot = new TelegramBot(process.env.BOT_TOKEN, { polling: true });
        
        console.log('✅ Telegram Bot инициализирован');
        console.log('=== НАСТРОЙКИ БОТА ===');
        console.log('CHANNEL_ID:', process.env.CHANNEL_ID);
        console.log('GROUP_ID:', process.env.GROUP_ID);
        console.log('====================');
        
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
    
    // ДИНАМИЧЕСКАЯ ССЫЛКА С .html
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
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Сервер запущен на порту ${PORT}`);
    console.log(`📱 WebApp: ${process.env.APP_URL || `http://localhost:${PORT}`}`);
    console.log(`🔧 Admin: ${process.env.APP_URL || `http://localhost:${PORT}`}/admin`);
    console.log(`🎯 Квизов: ${db.quizzes.length}`);
    console.log(`🏃‍♂️ Марафонов: ${db.marathons.length}`);
    console.log(`🎮 Интерактивов: ${db.interactives.length}`);
    console.log(`🛒 Товаров: ${db.shop_items.length}`);
    console.log(`👥 Пользователей: ${db.users.length}`);
    console.log('✅ Все системы работают!');
});
