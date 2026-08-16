FROM php:7.4-apache

# 1. Installer mysqli + Xdebug (utile pour le pas-à-pas et les traces détaillées)
RUN docker-php-ext-install mysqli pdo pdo_mysql \
    && docker-php-ext-enable mysqli pdo_mysql \
    && pecl install xdebug-3.1.6 \
    && docker-php-ext-enable xdebug

# 2. Configuration PHP en mode développement / verbose
RUN mv "$PHP_INI_DIR/php.ini-development" "$PHP_INI_DIR/php.ini" \
    && echo "short_open_tag = On" >> "$PHP_INI_DIR/conf.d/docker-debug.ini" \
    && echo "display_errors = On" >> "$PHP_INI_DIR/conf.d/docker-debug.ini" \
    && echo "display_startup_errors = On" >> "$PHP_INI_DIR/conf.d/docker-debug.ini" \
    && echo "error_reporting = E_ALL" >> "$PHP_INI_DIR/conf.d/docker-debug.ini" \
    && echo "log_errors = On" >> "$PHP_INI_DIR/conf.d/docker-debug.ini" \
    && echo "error_log = /dev/stderr" >> "$PHP_INI_DIR/conf.d/docker-debug.ini"

# 3. Configuration Xdebug (mode debug + logs Xdebug)
#RUN echo "xdebug.mode = debug,develop,trace" >> "$PHP_INI_DIR/conf.d/docker-php-ext-xdebug.ini" \
#    && echo "xdebug.start_with_request = yes" >> "$PHP_INI_DIR/conf.d/docker-php-ext-xdebug.ini" \
#    && echo "xdebug.client_host = host.docker.internal" >> "$PHP_INI_DIR/conf.d/docker-php-ext-xdebug.ini" \
#    && echo "xdebug.log = /dev/stderr" >> "$PHP_INI_DIR/conf.d/docker-php-ext-xdebug.ini" \
#    && echo "xdebug.log_level = 7" >> "$PHP_INI_DIR/conf.d/docker-php-ext-xdebug.ini"

RUN echo "xdebug.mode = off" > /usr/local/etc/php/conf.d/docker-php-ext-xdebug.ini

# 4. Augmenter la verbosité des logs Apache (trace6 / debug)
RUN sed -i 's/LogLevel warn/LogLevel debug/g' /etc/apache2/apache2.conf \
    && sed -i 's/LogLevel warn/LogLevel debug/g' /etc/apache2/sites-available/000-default.conf

# 5. Copier le code source de l'application
COPY www/ /var/www/html/

# 6. Ajuster les permissions
RUN chown -R www-data:www-data /var/www/html/