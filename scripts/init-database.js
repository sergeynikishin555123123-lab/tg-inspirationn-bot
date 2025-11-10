import pkg from 'pg';
const { Client } = pkg;
import dotenv from 'dotenv';

dotenv.config();

const db = new Client({
    host: process.env.DB_HOST || '789badf9748826d5c6ffd045.twc1.net',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'default_db',
    user: process.env.DB_USER || 'gen_user',
    password: process.env.DB_PASSWORD,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function initializeDatabase() {
    try {
        console.log('🔗 Подключение к базе данных...');
        await db.connect();
        console.log('✅ Подключение к PostgreSQL установлено');

        // Создание таблиц
        console.log('📊 Создание таблиц...');
        
        await db.query(`
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

        await db.query(`
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

        await db.query(`
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

        await db.query(`
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

        await db.query(`
            CREATE TABLE IF NOT EXISTS activities (
                id SERIAL PRIMARY KEY,
                user_id BIGINT NOT NULL,
                activity_type TEXT NOT NULL,
                sparks_earned REAL NOT NULL,
                description TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        await db.query(`
            CREATE TABLE IF NOT EXISTS admins (
                id SERIAL PRIMARY KEY,
                user_id BIGINT UNIQUE NOT NULL,
                username TEXT,
                role TEXT DEFAULT 'moderator',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        await db.query(`
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

        await db.query(`
            CREATE TABLE IF NOT EXISTS purchases (
                id SERIAL PRIMARY KEY,
                user_id BIGINT NOT NULL,
                item_id INTEGER NOT NULL,
                price_paid REAL NOT NULL,
                purchased_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                content_delivered BOOLEAN DEFAULT FALSE
            )
        `);

        await db.query(`
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

        await db.query(`
            CREATE TABLE IF NOT EXISTS post_reviews (
                id SERIAL PRIMARY KEY,
                user_id BIGINT NOT NULL,
                post_id TEXT NOT NULL,
                review_text TEXT NOT NULL,
                rating INTEGER DEFAULT 5,
                status TEXT DEFAULT 'pending',
                admin_comment TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                moderated_at TIMESTAMP,
                moderator_id BIGINT
            )
        `);

        // Заполняем персонажей
        console.log('👥 Добавление персонажей...');
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
            await db.query(
                `INSERT INTO characters (class, character_name, description, bonus_type, bonus_value) 
                 VALUES ($1, $2, $3, $4, $5) 
                 ON CONFLICT DO NOTHING`,
                char
            );
        }

        // Добавляем тестового пользователя
        console.log('👤 Добавление тестового пользователя...');
        await db.query(
            `INSERT INTO users (user_id, tg_first_name, sparks, level, is_registered, class, character_id) 
             VALUES ($1, $2, $3, $4, $5, $6, $7) 
             ON CONFLICT (user_id) DO NOTHING`,
            [12345, 'Тестовый Пользователь', 25.5, 'Ученик', true, 'Художники', 1]
        );

        // Добавляем админа
        console.log('🔧 Добавление администратора...');
        if (process.env.ADMIN_ID) {
            await db.query(
                `INSERT INTO admins (user_id, username, role) 
                 VALUES ($1, $2, $3) 
                 ON CONFLICT (user_id) DO NOTHING`,
                [process.env.ADMIN_ID, 'admin', 'superadmin']
            );
            console.log('✅ Админ добавлен:', process.env.ADMIN_ID);
        }

        // Добавляем тестовые квизы
        console.log('🎯 Добавление тестовых квизов...');
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
            },
            {
                title: "👗 История моды",
                description: "Тест по истории моды и стиля",
                questions: JSON.stringify([
                    {
                        question: "В каком веке появился первый кринолин?",
                        options: ["16 век", "17 век", "18 век", "19 век"],
                        correctAnswer: 2
                    },
                    {
                        question: "Кто считается основателем модного дома Chanel?",
                        options: ["Коко Шанель", "Кристиан Диор", "Ив Сен-Лоран", "Живанши"],
                        correctAnswer: 0
                    }
                ]),
                sparks_reward: 2
            }
        ];

        for (const quiz of testQuizzes) {
            await db.query(
                `INSERT INTO quizzes (title, description, questions, sparks_reward) 
                 VALUES ($1, $2, $3, $4) 
                 ON CONFLICT DO NOTHING`,
                [quiz.title, quiz.description, quiz.questions, quiz.sparks_reward]
            );
        }

        // Добавляем тестовые товары в магазин
        console.log('🛒 Добавление тестовых товаров...');
        const shopItems = [
            {
                title: "🎨 Урок акварели для начинающих",
                description: "Полный видеоурок по основам акварельной живописи",
                type: "video",
                file_url: "https://example.com/watercolor-course.mp4",
                preview_url: "https://example.com/watercolor-preview.jpg",
                price: 15,
                content_text: "В этом уроке вы научитесь основам работы с акварелью, смешиванию цветов и созданию первых работ."
            },
            {
                title: "📚 Гайд по композиции",
                description: "PDF руководство по построению гармоничной композиции",
                type: "pdf",
                file_url: "https://example.com/composition-guide.pdf",
                preview_url: "https://example.com/composition-preview.jpg",
                price: 10,
                content_text: null
            },
            {
                title: "💡 Секреты цветовых сочетаний",
                description: "Текстовый материал о психологии цвета и гармоничных сочетаниях",
                type: "text",
                file_url: null,
                preview_url: "https://example.com/color-preview.jpg",
                price: 8,
                content_text: "Цвет - это мощный инструмент в руках художника. В этом материале вы узнаете о психологическом воздействии цветов и научитесь создавать гармоничные палитры. Основные принципы: контраст, нюанс, тёплые и холодные тона."
            }
        ];

        for (const item of shopItems) {
            await db.query(
                `INSERT INTO shop_items (title, description, type, file_url, preview_url, price, content_text) 
                 VALUES ($1, $2, $3, $4, $5, $6, $7) 
                 ON CONFLICT DO NOTHING`,
                [item.title, item.description, item.type, item.file_url, item.preview_url, item.price, item.content_text]
            );
        }

        // Добавляем тестовые посты
        console.log('📰 Добавление тестовых постов...');
        const posts = [
            {
                post_id: "post_art_basics",
                title: "🎨 Основы композиции в живописи",
                content: "Сегодня поговорим о фундаментальных принципах построения композиции. Золотое сечение, правило третей и многое другое!",
                image_url: "https://example.com/composition-post.jpg",
                admin_id: process.env.ADMIN_ID || 898508164
            },
            {
                post_id: "post_color_psychology", 
                title: "🌈 Психология цвета в искусстве",
                content: "Как цвета влияют на восприятие artwork? Красный - страсть, синий - спокойствие, жёлтый - энергия. Узнайте больше!",
                image_url: "https://example.com/color-psychology.jpg",
                admin_id: process.env.ADMIN_ID || 898508164
            }
        ];

        for (const post of posts) {
            await db.query(
                `INSERT INTO channel_posts (post_id, title, content, image_url, admin_id) 
                 VALUES ($1, $2, $3, $4, $5) 
                 ON CONFLICT (post_id) DO NOTHING`,
                [post.post_id, post.title, post.content, post.image_url, post.admin_id]
            );
        }

        console.log('✅ База данных успешно инициализирована!');
        console.log('📊 Созданы таблицы:');
        console.log('   👥 12 персонажей');
        console.log('   🎯 2 квиза');
        console.log('   🛒 3 товара в магазине');
        console.log('   📰 2 поста канала');
        console.log('   👤 Тестовый пользователь (ID: 12345)');
        console.log('   🔧 Администратор');

    } catch (error) {
        console.error('❌ Ошибка инициализации базы данных:', error);
    } finally {
        await db.end();
    }
}

initializeDatabase();
