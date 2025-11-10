// Тестовые данные для админ-панели
export const adminData = {
    // Данные для дашборда
    dashboard: {
        totalUsers: 156,
        activeUsers: 23,
        totalWorks: 89,
        pendingWorks: 12,
        totalQuizzes: 45,
        totalSparks: 1250,
        activityData: [
            { date: '01.12', value: 15 },
            { date: '02.12', value: 23 },
            { date: '03.12', value: 18 },
            { date: '04.12', value: 27 },
            { date: '05.12', value: 32 },
            { date: '06.12', value: 19 },
            { date: '07.12', value: 25 }
        ],
        rolesData: [
            { name: 'Художник', count: 67 },
            { name: 'Писатель', count: 45 },
            { name: 'Музыкант', count: 32 },
            { name: 'Фотограф', count: 12 }
        ],
        worksStatusData: [
            { status: 'approved', count: 65 },
            { status: 'pending', count: 12 },
            { status: 'rejected', count: 12 }
        ]
    },

    // Данные пользователей
    users: [
        {
            id: 898508164,
            tg_first_name: "Сергей",
            tg_username: "sergey_nikishin",
            class: "Художник",
            level: 5,
            sparks: 125.5,
            last_activity: "2024-12-07T10:30:00Z",
            is_active: true,
            character_name: "Творец"
        },
        {
            id: 123456789,
            tg_first_name: "Анна",
            tg_username: "anna_artist",
            class: "Художник", 
            level: 3,
            sparks: 67.0,
            last_activity: "2024-12-06T15:20:00Z",
            is_active: true,
            character_name: "Вдохновитель"
        },
        {
            id: 987654321,
            tg_first_name: "Михаил",
            tg_username: "mike_writer",
            class: "Писатель",
            level: 4,
            sparks: 89.5,
            last_activity: "2024-12-05T09:15:00Z",
            is_active: false,
            character_name: "Сказочник"
        }
    ],

    // Данные работ
    works: [
        {
            id: 1,
            title: "Закат в горах",
            description: "Акварельный пейзаж",
            image_url: "/api/placeholder/300/200",
            user_id: 898508164,
            user_name: "Сергей",
            status: "approved",
            created_at: "2024-12-07T10:00:00Z",
            moderated_by: "Админ",
            admin_comment: ""
        },
        {
            id: 2,
            title: "Утренний этюд",
            description: "Масляная живопись",
            image_url: "/api/placeholder/300/200",
            user_id: 123456789,
            user_name: "Анна",
            status: "pending",
            created_at: "2024-12-07T09:30:00Z",
            moderated_by: null,
            admin_comment: ""
        },
        {
            id: 3,
            title: "Городские огни",
            description: "Цифровая живопись",
            image_url: "/api/placeholder/300/200",
            user_id: 987654321,
            user_name: "Михаил", 
            status: "rejected",
            created_at: "2024-12-06T14:20:00Z",
            moderated_by: "Админ",
            admin_comment: "Низкое качество изображения"
        }
    ],

    // Данные квизов
    quizzes: [
        {
            id: 1,
            title: "Основы композиции",
            description: "Тест по основам композиции в искусстве",
            questions_count: 5,
            sparks_reward: 10,
            status: "active",
            completions: 23,
            created_at: "2024-11-15T00:00:00Z"
        },
        {
            id: 2,
            title: "История искусства",
            description: "Проверка знаний по истории искусства",
            questions_count: 8,
            sparks_reward: 15,
            status: "active",
            completions: 15,
            created_at: "2024-11-20T00:00:00Z"
        }
    ],

    // Данные марафонов
    marathons: [
        {
            id: 1,
            title: "Рисуем каждый день",
            description: "30-дневный марафон по рисованию",
            duration_days: 30,
            sparks_reward: 100,
            participants: 45,
            status: "active",
            created_at: "2024-11-10T00:00:00Z"
        }
    ],

    // Данные магазина
    shopItems: [
        {
            id: 1,
            title: "Продвинутый курс рисования",
            description: "Полный курс по цифровой живописи",
            price: 200,
            type: "course",
            sold_count: 12,
            revenue: 2400,
            status: "active"
        },
        {
            id: 2,
            title: "Набор кистей",
            description: "Профессиональный набор кистей для Photoshop",
            price: 50,
            type: "digital",
            sold_count: 23,
            revenue: 1150,
            status: "active"
        }
    ],

    // Роли
    roles: [
        {
            id: 1,
            name: "Художник",
            icon: "🎨",
            description: "Создавайте визуальные произведения искусства",
            user_count: 67
        },
        {
            id: 2, 
            name: "Писатель",
            icon: "📝",
            description: "Создавайте литературные произведения",
            user_count: 45
        },
        {
            id: 3,
            name: "Музыкант",
            icon: "🎵", 
            description: "Создавайте музыкальные композиции",
            user_count: 32
        }
    ],

    // Персонажи
    characters: [
        {
            id: 1,
            name: "Творец",
            role_id: 1,
            role_name: "Художник",
            description: "Создает уникальные визуальные образы",
            bonus_type: "percent_bonus",
            bonus_value: 10,
            user_count: 25
        },
        {
            id: 2,
            name: "Вдохновитель", 
            role_id: 1,
            role_name: "Художник",
            description: "Вдохновляет других своим творчеством",
            bonus_type: "random_gift",
            bonus_value: 1,
            user_count: 18
        }
    ]
};
