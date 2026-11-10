-- +goose Up
ALTER TABLE sync_operations ADD COLUMN request_fingerprint text;

-- +goose Down
ALTER TABLE sync_operations DROP COLUMN request_fingerprint;
