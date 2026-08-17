FROM php:7.4-apache

# 1. Dépendances système + msmtp pour l'envoi d'e-mails
RUN apt-get update && apt-get install -y --no-install-recommends \
    msmtp \
    msmtp-mta \
    && rm -rf /var/lib/apt/lists/*

# 2. Configuration msmtp vers le conteneur Mailpit
RUN printf "defaults\n\
auth off\n\
tls off\n\
\n\
account default\n\
host mailpit\n\
port 1025\n\
from app@localhost\n" > /etc/msmtprc && \
    chmod 644 /etc/msmtprc

# 3. Installer mysqli + pdo + Xdebug
RUN docker-php-ext-install mysqli pdo pdo_mysql \
    && docker-php-ext-enable mysqli pdo_mysql \
    && pecl install xdebug-3.1.6 \
    && docker-php-ext-enable xdebug

# 4. Configuration PHP en mode développement / verbose + directive sendmail
RUN mv "$PHP_INI_DIR/php.ini-development" "$PHP_INI_DIR/php.ini" \
    && echo "short_open_tag = On" >> "$PHP_INI_DIR/conf.d/docker-debug.ini" \
    && echo "display_errors = On" >> "$PHP_INI_DIR/conf.d/docker-debug.ini" \
    && echo "display_startup_errors = On" >> "$PHP_INI_DIR/conf.d/docker-debug.ini" \
    && echo "error_reporting = E_ALL" >> "$PHP_INI_DIR/conf.d/docker-debug.ini" \
    && echo "log_errors = On" >> "$PHP_INI_DIR/conf.d/docker-debug.ini" \
    && echo "error_log = /dev/stderr" >> "$PHP_INI_DIR/conf.d/docker-debug.ini" \
    && echo "sendmail_path = /usr/bin/msmtp -t" >> "$PHP_INI_DIR/conf.d/docker-debug.ini"

# 5. Configuration Xdebug (désactivé par défaut)
RUN echo "xdebug.mode = off" > "$PHP_INI_DIR/conf.d/docker-php-ext-xdebug.ini"

# 6. Configuration Apache (Suppression warning FQDN + niveau de log debug)
RUN echo "ServerName localhost" >> /etc/apache2/apache2.conf \
    && sed -i 's/LogLevel warn/LogLevel debug/g' /etc/apache2/apache2.conf \
    && sed -i 's/LogLevel warn/LogLevel debug/g' /etc/apache2/sites-available/000-default.conf

# 7. Copier le code source de l'application
COPY www/ /var/www/html/

# 8. Ajuster les permissions
RUN chown -R www-data:www-data /var/www/html/