<?php
header('Content-Type: application/json');
if ($_SERVER['REQUEST_METHOD'] !== 'POST') die(json_encode(['error' => 'Invalid method']));

$file = $_FILES['file'];
if (!$file || $file['error']) die(json_encode(['error' => 'File upload error']));

$ext = pathinfo($file['name'], PATHINFO_EXTENSION);
if ($ext !== 'csv' && $ext !== 'json') die(json_encode(['error' => 'Invalid file type']));

$data = [];
if ($ext === 'csv') {
    $handle = fopen($file['tmp_name'], 'r');
    $headers = fgetcsv($handle);
    $row = 1;
    while (($line = fgetcsv($handle)) !== false) {
        $row++;
        $item = array_combine($headers, $line);
        if (!$item || !validateItem($item, $row)) continue;
        $data[] = $item;
    }
    fclose($handle);
} else {
    $content = file_get_contents($file['tmp_name']);
    $data = json_decode($content, true);
    if (json_last_error() !== JSON_ERROR_NONE) die(json_encode(['error' => 'Invalid JSON']));
    foreach ($data as $i => $item) {
        if (!validateItem($item, $i + 1)) die(json_encode(['error' => "Invalid item at index $i"]));
    }
}

$jsonOptions = JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE;
file_put_contents(__DIR__ . '/../data/products.json', json_encode($data, $jsonOptions));

echo json_encode(['success' => true]);

function validateItem($item, $row) {
    $required = ['id', 'name', 'category', 'price', 'stock', 'rating', 'created_at'];
    foreach ($required as $key) {
        if (!isset($item[$key])) {
            echo json_encode(['error' => "Missing $key at row $row"]);
            return false;
        }
    }
    if (!is_numeric($item['id']) || !is_numeric($item['price']) || !is_numeric($item['stock']) || !is_numeric($item['rating'])) {
        echo json_encode(['error' => "Invalid numeric at row $row"]);
        return false;
    }
    if (strtotime($item['created_at']) === false) {
        echo json_encode(['error' => "Invalid date at row $row"]);
        return false;
    }
    return true;
}