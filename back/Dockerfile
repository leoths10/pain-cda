FROM localhost/pain-back-base

WORKDIR /var/www/html
COPY . .

RUN composer dump-autoload --optimize --no-scripts \
    && mkdir -p storage/logs storage/framework/cache storage/framework/sessions storage/framework/views bootstrap/cache \
    && chmod -R 775 storage bootstrap/cache \
    && chmod +x docker-entrypoint.sh \
    && mv docker-entrypoint.sh /usr/local/bin/

EXPOSE 8000

ENTRYPOINT ["docker-entrypoint.sh"]
