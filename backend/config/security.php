<?php

return [
    'bcrypt_rounds' => (int)($_ENV['BCRYPT_ROUNDS'] ?? 12),
    'max_login_attempts' => (int)($_ENV['MAX_LOGIN_ATTEMPTS'] ?? 5),
    'lockout_time' => (int)($_ENV['LOCKOUT_TIME'] ?? 900),
    'rate_limit_per_minute' => (int)($_ENV['RATE_LIMIT_PER_MINUTE'] ?? 60),
    'cors' => [
        'allowed_origins' => explode(',', $_ENV['CORS_ALLOWED_ORIGINS'] ?? '*'),
        'allowed_methods' => explode(',', $_ENV['CORS_ALLOWED_METHODS'] ?? 'GET,POST,PUT,PATCH,DELETE,OPTIONS'),
        'allowed_headers' => explode(',', $_ENV['CORS_ALLOWED_HEADERS'] ?? 'Content-Type,Authorization,X-Requested-With'),
        'allow_credentials' => true,
        'max_age' => 86400,
    ],
    'upload' => [
        'max_size' => (int)($_ENV['MAX_UPLOAD_SIZE'] ?? 5242880),
        'allowed_extensions' => explode(',', $_ENV['ALLOWED_EXTENSIONS'] ?? 'jpg,jpeg,png,pdf'),
        'path' => $_ENV['UPLOAD_PATH'] ?? 'storage/uploads',
    ],
    'headers' => [
        'X-Frame-Options' => 'SAMEORIGIN',
        'X-Content-Type-Options' => 'nosniff',
        'X-XSS-Protection' => '1; mode=block',
        'Referrer-Policy' => 'strict-origin-when-cross-origin',
        'Permissions-Policy' => 'geolocation=(), microphone=(), camera=()',
    ],
];