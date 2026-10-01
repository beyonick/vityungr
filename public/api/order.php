<?php
/* Приём заявок с формы /order.

   1. Проверяет поля, ловушку для ботов и частоту отправки с одного IP.
   2. Сохраняет заявку файлом на хостинге, в папке рядом с сайтом (не в public_html).
      Хостинг в России: так первая запись персональных данных делается в РФ, как требует
      152-ФЗ. Файлы старше года удаляются сами — этот срок записан в политике.
   3. Пересылает заявку в Telegram и на почту.

   Токена бота, чата и почты в репозитории нет: .github/deploy-hosting.sh пишет их
   из секретов GitHub в order-config.php рядом с этим файлом. Без него заявка только
   сохраняется на хостинге, а посетитель видит ошибку и адрес почты.

   Название и цену работы берём из works.json (собирается из каталога), а не из формы.
   С JS форма получает ответ в JSON; без JS — переход на /order/sent/ или обратно на /order/. */

declare(strict_types=1);

const KEEP_DAYS = 365; // сколько хранить заявки на хостинге
const RATE_LIMIT = 5; // заявок
const RATE_WINDOW = 3600; // за час с одного IP
const MIN_SECONDS = 3; // быстрее форму заполняют только боты

date_default_timezone_set('Europe/Podgorica');
header('X-Robots-Tag: noindex, nofollow');
header('Cache-Control: no-store');

$wantsJson = stripos((string) ($_SERVER['HTTP_ACCEPT'] ?? ''), 'application/json') !== false;

function respond(bool $ok, string $error = '', array $fields = []): void
{
    global $wantsJson;
    if (!$wantsJson) {
        // заявка с русской версии сайта — обратно на русские страницы
        $to = (($_POST['lang'] ?? '') === 'ru' ? '/ru' : '') . ($ok ? '/order/sent/' : '/order/?error=' . rawurlencode($error));
        if (!$ok && !empty($_POST['work']) && is_string($_POST['work'])) {
            $to .= '&work=' . rawurlencode($_POST['work']);
        }
        header('Location: ' . $to, true, 303);
        exit;
    }
    $status = ['' => 200, 'invalid' => 422, 'rate' => 429, 'method' => 405, 'delivery' => 502][$error] ?? 500;
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['ok' => $ok, 'error' => $error, 'fields' => $fields], JSON_UNESCAPED_UNICODE);
    exit;
}

function field(string $key, int $max): string
{
    $v = $_POST[$key] ?? '';
    if (!is_string($v)) {
        return '';
    }
    // управляющие символы убираем, переводы строк оставляем только в сообщении
    $v = preg_replace('/[\x00-\x09\x0B\x0C\x0E-\x1F\x7F]/u', ' ', $v) ?? '';
    if ($key !== 'message') {
        $v = preg_replace('/\s+/u', ' ', $v) ?? '';
    }
    return mb_substr(trim($v), 0, $max);
}

function esc(string $s): string
{
    return htmlspecialchars($s, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
}

function telegram(array $cfg, string $html): bool
{
    if (empty($cfg['telegram_token']) || empty($cfg['telegram_chat'])) {
        return false;
    }
    $url = 'https://api.telegram.org/bot' . $cfg['telegram_token'] . '/sendMessage';
    $body = http_build_query([
        'chat_id' => $cfg['telegram_chat'],
        'text' => $html,
        'parse_mode' => 'HTML',
        'disable_web_page_preview' => 'true',
    ]);
    if (function_exists('curl_init')) {
        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => $body,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_CONNECTTIMEOUT => 5,
            CURLOPT_TIMEOUT => 10,
        ]);
        $res = curl_exec($ch);
    } else {
        $res = @file_get_contents($url, false, stream_context_create(['http' => [
            'method' => 'POST',
            'header' => "Content-Type: application/x-www-form-urlencoded\r\n",
            'content' => $body,
            'timeout' => 10,
            'ignore_errors' => true,
        ]]));
    }
    $data = is_string($res) ? json_decode($res, true) : null;
    return is_array($data) && ($data['ok'] ?? false) === true;
}

function send_mail(array $cfg, string $host, string $subject, string $text, string $replyTo): bool
{
    if (empty($cfg['email'])) {
        return false;
    }
    $from = !empty($cfg['mail_from']) ? $cfg['mail_from'] : 'noreply@' . $host;
    $headers = implode("\r\n", [
        'From: Vityungr site <' . $from . '>',
        'Reply-To: ' . $replyTo,
        'MIME-Version: 1.0',
        'Content-Type: text/plain; charset=utf-8',
        'Content-Transfer-Encoding: 8bit',
    ]);
    $subject = '=?UTF-8?B?' . base64_encode($subject) . '?=';
    // -f (адрес отправителя для конверта) — только если он задан явно, иначе хостинг может отказать
    return !empty($cfg['mail_from'])
        ? @mail($cfg['email'], $subject, $text, $headers, '-f' . $cfg['mail_from'])
        : @mail($cfg['email'], $subject, $text, $headers);
}

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    header('Allow: POST');
    respond(false, 'method');
}

// Ловушка: поле скрыто от людей. Боту отвечаем «принято», ничего не отправляя.
if (field('website', 200) !== '') {
    respond(true);
}
$elapsed = field('dt', 12);
if ($elapsed !== '' && is_numeric($elapsed) && (float) $elapsed < MIN_SECONDS) {
    respond(true);
}

$cfg = is_file(__DIR__ . '/order-config.php') ? require __DIR__ . '/order-config.php' : [];
$cfg = is_array($cfg) ? $cfg : [];
$host = preg_replace('/^www\./', '', preg_replace('/[^a-z0-9.-]/i', '', (string) ($_SERVER['HTTP_HOST'] ?? '')) ?? '') ?: 'localhost';
$site = rtrim(!empty($cfg['site']) ? $cfg['site'] : 'https://' . $host, '/');

// Заявки лежат рядом с сайтом: <папка сайта>/orders, public_html — это dirname(__DIR__)
$dir = dirname(__DIR__, 2) . '/orders';
if (!is_dir($dir)) {
    @mkdir($dir, 0700, true);
}

// Частота с одного IP — файлом, базы на хостинге нет
$ip = (string) ($_SERVER['REMOTE_ADDR'] ?? '');
$rateFile = $dir . '/.rate-' . substr(hash('sha256', $ip), 0, 16);
$times = array_filter(
    (array) json_decode((string) @file_get_contents($rateFile), true),
    static fn($t) => is_int($t) && $t > time() - RATE_WINDOW
);
if (count($times) >= RATE_LIMIT) {
    respond(false, 'rate');
}

$works = json_decode((string) @file_get_contents(__DIR__ . '/works.json'), true);
$works = is_array($works) ? $works : [];

$in = [
    'work' => field('work', 120),
    'name' => field('name', 100),
    'email' => field('email', 200),
    'country' => field('country', 100),
    'contact' => field('contact', 200),
    'message' => field('message', 3000),
    'option' => field('option', 120), // размер или набор кадров у принта
];

$bad = [];
if ($in['work'] !== 'other' && !isset($works[$in['work']])) {
    $bad[] = 'work';
}
if ($in['name'] === '') {
    $bad[] = 'name';
}
if (!filter_var($in['email'], FILTER_VALIDATE_EMAIL)) {
    $bad[] = 'email';
}
if ($in['country'] === '') {
    $bad[] = 'country';
}
if ($in['work'] === 'other' && $in['message'] === '') {
    $bad[] = 'message';
}
// вариант должен быть из списка этого принта; у остальных вариантов нет
$option = null;
foreach ($works[$in['work']]['options'] ?? [] as $o) {
    if (($o['label'] ?? null) === $in['option']) {
        $option = $o;
    }
}
if ($in['option'] !== '' && !$option) {
    $bad[] = 'option';
}
if (($_POST['consent'] ?? '') !== 'yes') {
    $bad[] = 'consent';
}
if ($bad) {
    respond(false, 'invalid', $bad);
}

$work = $works[$in['work']] ?? null;
$workLine = $work
    ? trim($work['title'] . ' — ' . implode(', ', array_filter([
        $work['meta'] ?? '',
        $option ? ($work['optionName'] ?? 'Option') . ': ' . $option['label'] : '',
        $option['price'] ?? $work['price'] ?? '',
    ])))
    : 'Something else (see the message)';

$record = [
    'received' => date('c'),
    'work' => $in['work'],
    'work_title' => $workLine,
    'option' => $option['label'] ?? '',
    'name' => $in['name'],
    'email' => $in['email'],
    'country' => $in['country'],
    'contact' => $in['contact'],
    'message' => $in['message'],
    // чем подтверждается согласие: какая редакция документа, когда и откуда его дали
    'consent' => [
        'document' => $site . '/consent/',
        'version' => field('consent_version', 20),
        'ip' => $ip,
        'user_agent' => mb_substr((string) ($_SERVER['HTTP_USER_AGENT'] ?? ''), 0, 300),
    ],
];

$saved = is_dir($dir) && @file_put_contents(
    $dir . '/' . date('Y-m-d_His') . '_' . bin2hex(random_bytes(3)) . '.json',
    json_encode($record, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
    LOCK_EX
) !== false;

$times[] = time();
@file_put_contents($rateFile, json_encode(array_values($times)), LOCK_EX);

// Старые заявки и счётчики удаляем
foreach ([[$dir . '/*.json', KEEP_DAYS * 86400], [$dir . '/.rate-*', RATE_WINDOW]] as [$pattern, $maxAge]) {
    foreach (glob($pattern) ?: [] as $f) {
        if (is_file($f) && time() - (int) @filemtime($f) > $maxAge) {
            @unlink($f);
        }
    }
}

$lines = [
    ['Work', $workLine],
    // с русской версии сайта — отвечать по-русски
    ['Language', ($_POST['lang'] ?? '') === 'ru' ? 'Russian' : ''],
    ['Name', $in['name']],
    ['Email', $in['email']],
    ['Country', $in['country']],
    ['Other contact', $in['contact']],
];

$html = '<b>New request from the site</b>' . "\n\n";
foreach ($lines as [$k, $v]) {
    if ($v !== '') {
        $html .= '<b>' . esc($k) . ':</b> ' . esc($v) . "\n";
    }
}
if ($work) {
    $html .= esc($site . $work['href']) . "\n";
}
if ($in['message'] !== '') {
    $html .= "\n" . esc($in['message']) . "\n";
}
$html .= "\n" . '<i>Reply by email: ' . esc($in['email']) . '</i>';

$text = "New request from the site\n\n";
foreach ($lines as [$k, $v]) {
    if ($v !== '') {
        $text .= $k . ': ' . $v . "\n";
    }
}
if ($work) {
    $text .= $site . $work['href'] . "\n";
}
if ($in['message'] !== '') {
    $text .= "\n" . $in['message'] . "\n";
}
$text .= "\n—\nJust press Reply to answer " . $in['name'] . ".\n";
if (!$saved) {
    $text .= "(The copy on the hosting was not saved — check the orders folder permissions.)\n";
}

$subject = 'Request: ' . ($work ? $work['title'] : 'something else') . ' — ' . $in['name'];
$sentTelegram = telegram($cfg, $html);
$sentMail = send_mail($cfg, $host, $subject, $text, $in['email']);

respond($sentTelegram || $sentMail, $sentTelegram || $sentMail ? '' : 'delivery');
