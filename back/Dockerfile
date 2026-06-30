FROM php:8.4-cli

# Dépendances système + extensions PHP (PostgreSQL, LDAP) + Python pour les scripts VTOM
RUN apt-get update && apt-get install -y --no-install-recommends \
        git curl libpq-dev libldap2-dev zip unzip python3 python3-pip \
    && docker-php-ext-configure ldap \
    && docker-php-ext-install pdo pdo_pgsql ldap \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# Composer
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

WORKDIR /var/www/html

# Dépendances Python des scripts d'extraction VTOM
COPY requirements.txt /tmp/requirements.txt
RUN pip3 install --break-system-packages -r /tmp/requirements.txt \
    && rm /tmp/requirements.txt

# Dépendances PHP — couche mise en cache tant que composer.json/lock ne changent pas
COPY composer.json composer.lock ./
RUN composer install --no-scripts --no-autoloader --prefer-dist --no-interaction

# Code applicatif
COPY . .
RUN composer dump-autoload --optimize --no-scripts \
    && mkdir -p storage/logs storage/framework/cache storage/framework/sessions storage/framework/views bootstrap/cache \
    && chmod -R 775 storage bootstrap/cache \
    && chmod +x docker-entrypoint.sh \
    && mv docker-entrypoint.sh /usr/local/bin/

EXPOSE 8000

ENTRYPOINT ["docker-entrypoint.sh"]
