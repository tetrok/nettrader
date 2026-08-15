FROM php:7.4-apache

# Installer l'extension mysqli
RUN docker-php-ext-install mysqli && docker-php-ext-enable mysqli

# Activer les short open tags
RUN echo "short_open_tag = On" > /usr/local/etc/php/conf.d/short-open-tag.ini

# Copier le code source de l'application
COPY www/ /var/www/html/

# Ajuster les permissions
RUN chown -R www-data:www-data /var/www/html/
