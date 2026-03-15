-- +goose Up
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
('ea5f8a19-10da-552c-b17a-dd669473e63f', '11111111-1111-1111-1111-111111111111', 'cafe', 'Coffee break', 'Гостевой Wi-Fi', 'Известное кафе с Wi-Fi в районе «Центральный район», адрес: Навагинская, 9Д. Координаты определены через Nominatim.', 'Wi-Fi указан в открытой карточке заведения.', 'customer_only', 'active', ST_SetSRID(ST_MakePoint(39.7238635, 43.5881032), 4326)::geography, 0, 0, NULL, 1, now(), now()),
('dde556bd-17ef-5ee0-a428-8d5a7dba81b3', '11111111-1111-1111-1111-111111111111', 'cafe', 'Frida', 'Гостевой Wi-Fi', 'Известное кафе с Wi-Fi в районе «Центральный район», адрес: Войкова, 1/1. Координаты определены через Nominatim.', 'Wi-Fi указан в открытой карточке заведения.', 'customer_only', 'active', ST_SetSRID(ST_MakePoint(39.719694, 43.5804728), 4326)::geography, 0, 0, NULL, 1, now(), now()),
('df64a794-13e7-57b0-a430-197d8b05ca92', '11111111-1111-1111-1111-111111111111', 'cafe', 'Surf Coffee x Lights', 'Гостевой Wi-Fi', 'Известное кафе с Wi-Fi в районе «Центральный район», адрес: Дагомысский переулок, 18 к2. Координаты определены через Nominatim.', 'Wi-Fi указан в открытой карточке заведения.', 'customer_only', 'active', ST_SetSRID(ST_MakePoint(39.7358577, 43.6004654), 4326)::geography, 0, 0, NULL, 1, now(), now()),
('e0c20fef-fc30-52ec-a33e-21ab89a2dfe7', '11111111-1111-1111-1111-111111111111', 'cafe', 'Surf Coffee x Alexandria', 'Гостевой Wi-Fi', 'Известное кафе с Wi-Fi в районе «Центральный район», адрес: Московская, 22Б. Координаты определены через Nominatim.', 'Wi-Fi указан в открытой карточке заведения.', 'customer_only', 'active', ST_SetSRID(ST_MakePoint(39.723401, 43.5940301), 4326)::geography, 0, 0, NULL, 1, now(), now()),
('c1759e5d-c341-521b-8099-39920e1545ba', '11111111-1111-1111-1111-111111111111', 'cafe', 'КозLove', 'Гостевой Wi-Fi', 'Известное кафе с Wi-Fi в районе «Центральный район», адрес: Роз, 115. Координаты определены через Nominatim.', 'Wi-Fi указан в открытой карточке заведения.', 'customer_only', 'active', ST_SetSRID(ST_MakePoint(39.7269593, 43.5936266), 4326)::geography, 0, 0, NULL, 1, now(), now()),
('71e08658-55e8-5229-8d40-23c1dde23b67', '11111111-1111-1111-1111-111111111111', 'cafe', 'Зацепи', 'Гостевой Wi-Fi', 'Известное кафе с Wi-Fi в районе «Центральный район», адрес: Горького, 85/1. Координаты определены через Nominatim.', 'Wi-Fi указан в открытой карточке заведения.', 'customer_only', 'active', ST_SetSRID(ST_MakePoint(39.7278376, 43.5939027), 4326)::geography, 0, 0, NULL, 1, now(), now());

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
('3c529ac5-6d9a-5325-8caf-40df3065657e', 'ea5f8a19-10da-552c-b17a-dd669473e63f', 1, 'insert', jsonb_build_object('place_id', 'ea5f8a19-10da-552c-b17a-dd669473e63f', 'user_id', '11111111-1111-1111-1111-111111111111', 'venue_type', 'cafe', 'place_name', 'Coffee break', 'wifi_name', 'Гостевой Wi-Fi', 'description', 'Известное кафе с Wi-Fi в районе «Центральный район», адрес: Навагинская, 9Д. Координаты определены через Nominatim.', 'promo_text', 'Wi-Fi указан в открытой карточке заведения.', 'access_type', 'customer_only', 'status', 'active', 'lat', 43.5881032, 'lng', 39.7238635, 'works_count', 0, 'not_works_count', 0, 'last_verified_at', NULL, 'version', 1), now(), '11111111-1111-1111-1111-111111111111'),
('83088128-78aa-502e-8ade-d5afe3101dd8', 'dde556bd-17ef-5ee0-a428-8d5a7dba81b3', 1, 'insert', jsonb_build_object('place_id', 'dde556bd-17ef-5ee0-a428-8d5a7dba81b3', 'user_id', '11111111-1111-1111-1111-111111111111', 'venue_type', 'cafe', 'place_name', 'Frida', 'wifi_name', 'Гостевой Wi-Fi', 'description', 'Известное кафе с Wi-Fi в районе «Центральный район», адрес: Войкова, 1/1. Координаты определены через Nominatim.', 'promo_text', 'Wi-Fi указан в открытой карточке заведения.', 'access_type', 'customer_only', 'status', 'active', 'lat', 43.5804728, 'lng', 39.719694, 'works_count', 0, 'not_works_count', 0, 'last_verified_at', NULL, 'version', 1), now(), '11111111-1111-1111-1111-111111111111'),
('3f5eb9c7-05c9-52c2-9ebb-1ff3bb013b48', 'df64a794-13e7-57b0-a430-197d8b05ca92', 1, 'insert', jsonb_build_object('place_id', 'df64a794-13e7-57b0-a430-197d8b05ca92', 'user_id', '11111111-1111-1111-1111-111111111111', 'venue_type', 'cafe', 'place_name', 'Surf Coffee x Lights', 'wifi_name', 'Гостевой Wi-Fi', 'description', 'Известное кафе с Wi-Fi в районе «Центральный район», адрес: Дагомысский переулок, 18 к2. Координаты определены через Nominatim.', 'promo_text', 'Wi-Fi указан в открытой карточке заведения.', 'access_type', 'customer_only', 'status', 'active', 'lat', 43.6004654, 'lng', 39.7358577, 'works_count', 0, 'not_works_count', 0, 'last_verified_at', NULL, 'version', 1), now(), '11111111-1111-1111-1111-111111111111'),
('497d533e-4aeb-58d2-91f0-0f22ab627f50', 'e0c20fef-fc30-52ec-a33e-21ab89a2dfe7', 1, 'insert', jsonb_build_object('place_id', 'e0c20fef-fc30-52ec-a33e-21ab89a2dfe7', 'user_id', '11111111-1111-1111-1111-111111111111', 'venue_type', 'cafe', 'place_name', 'Surf Coffee x Alexandria', 'wifi_name', 'Гостевой Wi-Fi', 'description', 'Известное кафе с Wi-Fi в районе «Центральный район», адрес: Московская, 22Б. Координаты определены через Nominatim.', 'promo_text', 'Wi-Fi указан в открытой карточке заведения.', 'access_type', 'customer_only', 'status', 'active', 'lat', 43.5940301, 'lng', 39.723401, 'works_count', 0, 'not_works_count', 0, 'last_verified_at', NULL, 'version', 1), now(), '11111111-1111-1111-1111-111111111111'),
('e68f7257-3724-5ec4-8487-cbf0673a79a2', 'c1759e5d-c341-521b-8099-39920e1545ba', 1, 'insert', jsonb_build_object('place_id', 'c1759e5d-c341-521b-8099-39920e1545ba', 'user_id', '11111111-1111-1111-1111-111111111111', 'venue_type', 'cafe', 'place_name', 'КозLove', 'wifi_name', 'Гостевой Wi-Fi', 'description', 'Известное кафе с Wi-Fi в районе «Центральный район», адрес: Роз, 115. Координаты определены через Nominatim.', 'promo_text', 'Wi-Fi указан в открытой карточке заведения.', 'access_type', 'customer_only', 'status', 'active', 'lat', 43.5936266, 'lng', 39.7269593, 'works_count', 0, 'not_works_count', 0, 'last_verified_at', NULL, 'version', 1), now(), '11111111-1111-1111-1111-111111111111'),
('3f403ff1-73f1-5f27-a06f-d3f5997a55af', '71e08658-55e8-5229-8d40-23c1dde23b67', 1, 'insert', jsonb_build_object('place_id', '71e08658-55e8-5229-8d40-23c1dde23b67', 'user_id', '11111111-1111-1111-1111-111111111111', 'venue_type', 'cafe', 'place_name', 'Зацепи', 'wifi_name', 'Гостевой Wi-Fi', 'description', 'Известное кафе с Wi-Fi в районе «Центральный район», адрес: Горького, 85/1. Координаты определены через Nominatim.', 'promo_text', 'Wi-Fi указан в открытой карточке заведения.', 'access_type', 'customer_only', 'status', 'active', 'lat', 43.5939027, 'lng', 39.7278376, 'works_count', 0, 'not_works_count', 0, 'last_verified_at', NULL, 'version', 1), now(), '11111111-1111-1111-1111-111111111111');

-- +goose Down
DELETE FROM place_votes_versions
WHERE place_vote_id IN (
    SELECT place_vote_id FROM place_votes WHERE place_id IN (
        'ea5f8a19-10da-552c-b17a-dd669473e63f',
        'dde556bd-17ef-5ee0-a428-8d5a7dba81b3',
        'df64a794-13e7-57b0-a430-197d8b05ca92',
        'e0c20fef-fc30-52ec-a33e-21ab89a2dfe7',
        'c1759e5d-c341-521b-8099-39920e1545ba',
        '71e08658-55e8-5229-8d40-23c1dde23b67'
    )
);

DELETE FROM place_reports WHERE place_id IN (
    'ea5f8a19-10da-552c-b17a-dd669473e63f',
    'dde556bd-17ef-5ee0-a428-8d5a7dba81b3',
    'df64a794-13e7-57b0-a430-197d8b05ca92',
    'e0c20fef-fc30-52ec-a33e-21ab89a2dfe7',
    'c1759e5d-c341-521b-8099-39920e1545ba',
    '71e08658-55e8-5229-8d40-23c1dde23b67'
);

DELETE FROM place_votes WHERE place_id IN (
    'ea5f8a19-10da-552c-b17a-dd669473e63f',
    'dde556bd-17ef-5ee0-a428-8d5a7dba81b3',
    'df64a794-13e7-57b0-a430-197d8b05ca92',
    'e0c20fef-fc30-52ec-a33e-21ab89a2dfe7',
    'c1759e5d-c341-521b-8099-39920e1545ba',
    '71e08658-55e8-5229-8d40-23c1dde23b67'
);

DELETE FROM places_versions WHERE place_id IN (
    'ea5f8a19-10da-552c-b17a-dd669473e63f',
    'dde556bd-17ef-5ee0-a428-8d5a7dba81b3',
    'df64a794-13e7-57b0-a430-197d8b05ca92',
    'e0c20fef-fc30-52ec-a33e-21ab89a2dfe7',
    'c1759e5d-c341-521b-8099-39920e1545ba',
    '71e08658-55e8-5229-8d40-23c1dde23b67'
);

DELETE FROM places WHERE place_id IN (
    'ea5f8a19-10da-552c-b17a-dd669473e63f',
    'dde556bd-17ef-5ee0-a428-8d5a7dba81b3',
    'df64a794-13e7-57b0-a430-197d8b05ca92',
    'e0c20fef-fc30-52ec-a33e-21ab89a2dfe7',
    'c1759e5d-c341-521b-8099-39920e1545ba',
    '71e08658-55e8-5229-8d40-23c1dde23b67'
);
