#!/bin/sh
set -e

export TZ=Europe/Paris
echo "Starting Pain API..."

# Permissions storage (sécurité en cas de mount volume)
mkdir -p storage/logs storage/framework/cache storage/framework/sessions storage/framework/views bootstrap/cache
chmod -R 777 storage bootstrap/cache 2>/dev/null || true

# Attend la base de données (max 30 s)
echo "Waiting for database..."
timeout=30
until php -r "new PDO('pgsql:host=${DB_HOST:-pain-db};dbname=${DB_DATABASE:-pain}', '${DB_USERNAME:-pain}', '${DB_PASSWORD:-pain}');" 2>/dev/null || [ $timeout -eq 0 ]; do
    timeout=$((timeout - 1))
    sleep 1
done

[ $timeout -eq 0 ] && echo "Database connection timeout, continuing anyway..."

# Génère la clé applicative si absente
if grep -q "^APP_KEY=$" .env 2>/dev/null; then
    echo "Generating application key..."
    php artisan key:generate --force
fi

# Migrations en arrière-plan pour ne pas bloquer le démarrage
(sleep 5 && php artisan migrate --force 2>/dev/null) &

echo "Server ready on port 8000"
exec php artisan serve --host=0.0.0.0 --port=8000
