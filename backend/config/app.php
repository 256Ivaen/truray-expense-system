<?php

return [
    'name' => $_ENV['APP_NAME'] ?? 'TekJuice CMS',
    'env' => $_ENV['APP_ENV'] ?? 'production',
    'debug' => filter_var($_ENV['APP_DEBUG'] ?? false, FILTER_VALIDATE_BOOLEAN),
    'url' => $_ENV['APP_URL'] ?? 'http://localhost',
    'timezone' => $_ENV['APP_TIMEZONE'] ?? 'Africa/Kampala',
    'charset' => 'UTF-8',
    'locale' => 'en',
];