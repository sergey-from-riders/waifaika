-- +goose Up
INSERT INTO users (
    user_id,
    user_type,
    display_name,
    is_active,
    version,
    created_at,
    updated_at,
    last_seen_at
)
VALUES (
    '11111111-1111-1111-1111-111111111111',
    'email_linked',
    'Demo curator',
    TRUE,
    1,
    now(),
    now(),
    now()
)
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO users_versions (
    user_version_id,
    user_id,
    version,
    version_action,
    version_snapshot,
    version_created_at,
    version_created_by_user_id
)
VALUES (
    '11111111-1111-1111-1111-111111111112',
    '11111111-1111-1111-1111-111111111111',
    1,
    'insert',
    jsonb_build_object(
        'user_id', '11111111-1111-1111-1111-111111111111',
        'user_type', 'email_linked',
        'display_name', 'Demo curator',
        'is_active', true,
        'version', 1
    ),
    now(),
    NULL
)
ON CONFLICT (user_version_id) DO NOTHING;

INSERT INTO user_emails (
    user_email_id,
    user_id,
    email,
    is_primary,
    is_verified,
    verified_at,
    version,
    created_at,
    updated_at
)
VALUES (
    '11111111-1111-1111-1111-111111111113',
    '11111111-1111-1111-1111-111111111111',
    'demo@wifiyka.local',
    TRUE,
    TRUE,
    now(),
    1,
    now(),
    now()
)
ON CONFLICT (user_email_id) DO NOTHING;

INSERT INTO user_emails_versions (
    user_email_version_id,
    user_email_id,
    version,
    version_action,
    version_snapshot,
    version_created_at,
    version_created_by_user_id
)
VALUES (
    '11111111-1111-1111-1111-111111111114',
    '11111111-1111-1111-1111-111111111113',
    1,
    'insert',
    jsonb_build_object(
        'user_email_id', '11111111-1111-1111-1111-111111111113',
        'user_id', '11111111-1111-1111-1111-111111111111',
        'email', 'demo@wifiyka.local',
        'is_primary', true,
        'is_verified', true,
        'version', 1
    ),
    now(),
    '11111111-1111-1111-1111-111111111111'
)
ON CONFLICT (user_email_version_id) DO NOTHING;

INSERT INTO places (
    place_id,
    user_id,
    venue_type,
    place_name,
    wifi_name,
    description,
    promo_text,
    access_type,
    status,
    geom,
    works_count,
    not_works_count,
    last_verified_at,
    version,
    created_at,
    updated_at
)
VALUES
(
    '22222222-2222-2222-2222-222222222221',
    '11111111-1111-1111-1111-111111111111',
    'cafe',
    'Surf Coffee Морпорт',
    'SURF_PORT_FREE',
    'Кофейня у Морпорта Сочи с гостевым Wi-Fi и посадкой у окна.',
    'По будням до 11:00 действует утреннее меню.',
    'free',
    'active',
    ST_SetSRID(ST_MakePoint(39.7198372, 43.5818653), 4326)::geography,
    6,
    1,
    now(),
    1,
    now(),
    now()
),
(
    '22222222-2222-2222-2222-222222222222',
    '11111111-1111-1111-1111-111111111111',
    'park',
    'Парк «Ривьера»',
    'RIVIERA_FREE_WIFI',
    'Открытая зона рядом с центральной аллеей, удобно для короткой остановки.',
    'Летом часто проводят городские мероприятия и фестивали.',
    'free',
    'active',
    ST_SetSRID(ST_MakePoint(39.7158148, 43.5917340), 4326)::geography,
    3,
    0,
    now(),
    1,
    now(),
    now()
),
(
    '22222222-2222-2222-2222-222222222223',
    '11111111-1111-1111-1111-111111111111',
    'other',
    'Железнодорожный вокзал Сочи',
    'SOCHI_STATION_WIFI',
    'Точка внутри зоны ожидания у центрального входа.',
    'Подключение обычно доступно пассажирам и посетителям вокзала.',
    'customer_only',
    'active',
    ST_SetSRID(ST_MakePoint(39.7274077, 43.5914679), 4326)::geography,
    5,
    2,
    now(),
    1,
    now(),
    now()
)
ON CONFLICT (place_id) DO NOTHING;

INSERT INTO places_versions (
    place_version_id,
    place_id,
    version,
    version_action,
    version_snapshot,
    version_created_at,
    version_created_by_user_id
)
VALUES
(
    '22222222-2222-2222-2222-222222222231',
    '22222222-2222-2222-2222-222222222221',
    1,
    'insert',
    jsonb_build_object('place_id', '22222222-2222-2222-2222-222222222221', 'place_name', 'Surf Coffee Морпорт', 'wifi_name', 'SURF_PORT_FREE', 'access_type', 'free', 'status', 'active', 'version', 1),
    now(),
    '11111111-1111-1111-1111-111111111111'
),
(
    '22222222-2222-2222-2222-222222222232',
    '22222222-2222-2222-2222-222222222222',
    1,
    'insert',
    jsonb_build_object('place_id', '22222222-2222-2222-2222-222222222222', 'place_name', 'Парк «Ривьера»', 'wifi_name', 'RIVIERA_FREE_WIFI', 'access_type', 'free', 'status', 'active', 'version', 1),
    now(),
    '11111111-1111-1111-1111-111111111111'
),
(
    '22222222-2222-2222-2222-222222222233',
    '22222222-2222-2222-2222-222222222223',
    1,
    'insert',
    jsonb_build_object('place_id', '22222222-2222-2222-2222-222222222223', 'place_name', 'Железнодорожный вокзал Сочи', 'wifi_name', 'SOCHI_STATION_WIFI', 'access_type', 'customer_only', 'status', 'active', 'version', 1),
    now(),
    '11111111-1111-1111-1111-111111111111'
)
ON CONFLICT (place_version_id) DO NOTHING;

-- +goose Down
DELETE FROM places_versions WHERE place_version_id IN (
    '22222222-2222-2222-2222-222222222231',
    '22222222-2222-2222-2222-222222222232',
    '22222222-2222-2222-2222-222222222233'
);
DELETE FROM places WHERE place_id IN (
    '22222222-2222-2222-2222-222222222221',
    '22222222-2222-2222-2222-222222222222',
    '22222222-2222-2222-2222-222222222223'
);
DELETE FROM user_emails_versions WHERE user_email_version_id = '11111111-1111-1111-1111-111111111114';
DELETE FROM user_emails WHERE user_email_id = '11111111-1111-1111-1111-111111111113';
DELETE FROM users_versions WHERE user_version_id = '11111111-1111-1111-1111-111111111112';
DELETE FROM users WHERE user_id = '11111111-1111-1111-1111-111111111111';
