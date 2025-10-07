<?php
header('Content-Type: application/json');
$file = __DIR__ . '/../data/products.json';
if (!file_exists($file)) die(json_encode(['error' => 'No data']));

$data = json_decode(file_get_contents($file), true);
$categories = [];
$total = count($data);
$inStock = 0;

foreach ($data as $item) {
    $cat= $item['category'];
    $categories[$cat]['count'] = ($categories[$cat]['count'] ?? 0) + 1;
    $categories[$cat]['prices'][] = $item['price'];
    if ($item['stock'] > 0) $inStock++;
}

foreach ($categories as $cat => &$stats) {
    sort($stats['prices']);
    $n = count($stats['prices']);
    if ($n === 0) {
        $stats['median'] = 0;
        $stats['average'] = 0;
    } else {
        $middle = (int) floor($n / 2);
        if ($n % 2) {
            $stats['median'] = $stats['prices'][$middle];
        } else {
            $stats['median'] = ($stats['prices'][$middle - 1] + $stats['prices'][$middle]) / 2;
        }
        $stats['average'] = array_sum($stats['prices']) / $n;
    }
    unset($stats['prices']);
}

echo json_encode([
    'categories' => $categories,
    'inStockPercent' => round(($inStock / $total) * 100, 2)
]);