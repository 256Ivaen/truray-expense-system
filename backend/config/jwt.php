<?php

return [
    'secret' => $_ENV['JWT_SECRET'] ?? 'your-super-secret-jwt-key-change-this',
    'algorithm' => 'HS256',
    'expiration' => (int)($_ENV['JWT_EXPIRATION'] ?? 3600),
    'refresh_expiration' => (int)($_ENV['JWT_REFRESH_EXPIRATION'] ?? 604800),
    'issuer' => $_ENV['APP_URL'] ?? 'http://localhost',
    'audience' => $_ENV['APP_URL'] ?? 'http://localhost',
];