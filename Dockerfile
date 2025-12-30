FROM php:8.2-apache

# Install Node.js and npm
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
    apt-get install -y nodejs && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /var/www/html/

# Enable required Apache modules
RUN a2enmod rewrite headers

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