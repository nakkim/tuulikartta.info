FROM php:8.2.35-apache

# Install Node.js and npm, and the PostgreSQL client library needed to
# build the pdo_pgsql extension (used by php/dataMiner.php for notifications)
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
  apt-get install -y nodejs libpq-dev && \
  docker-php-ext-install pdo_pgsql pgsql && \
  apt-get clean && \
  rm -rf /var/lib/apt/lists/*

WORKDIR /var/www/html/

# Enable required Apache modules
RUN a2enmod rewrite headers

# Never display PHP warnings or errors to clients; log them instead
RUN printf '%s\n' \
  'display_errors = Off' \
  'display_startup_errors = Off' \
  'html_errors = Off' \
  'log_errors = On' \
  'error_log = /dev/stderr' \
  > /usr/local/etc/php/conf.d/zz-errors.ini

# Interim mitigations for CVE-2026-109618 and CVE-2026-109619 until a
# php:8.2-apache image with PHP 8.2.35 is available. php_admin_* values
# cannot be overridden by .htaccess or ini_set(). See
# https://www.php.net/archive/2026.php#2026-10-21-5
# - memory_limit=-1 avoids the OOM corruption path; the container memory
#   limit in docker-compose.yml is the availability boundary instead
# - the app accepts no uploads, so request bodies are kept small
# - upload progress tracking is disabled (stale global state RCE)
RUN printf '%s\n' \
  '<IfModule php_module>' \
  '  php_admin_value memory_limit -1' \
  '  php_admin_value post_max_size 8M' \
  '  php_admin_flag file_uploads Off' \
  '  php_admin_value upload_max_filesize 2M' \
  '  php_admin_flag session.upload_progress.enabled Off' \
  '</IfModule>' \
  > /etc/apache2/conf-available/php-cve-mitigations.conf && \
  a2enconf php-cve-mitigations && \
  printf '%s\n' \
  'session.upload_progress.enabled = Off' \
  'post_max_size = 8M' \
  'upload_max_filesize = 2M' \
  > /usr/local/etc/php/conf.d/zz-cve-mitigations.ini

# Copy package files first for better caching
COPY package*.json ./

# Install npm dependencies as root
RUN npm ci --omit=dev

# Copy application files
COPY . ./

# Create data directory with proper permissions
RUN mkdir -p ./data && \
  chown -R www-data:www-data /var/www/html && \
  chmod -R 755 /var/www/html && \
  chmod -R 775 ./data

# Switch to non-root user
USER www-data