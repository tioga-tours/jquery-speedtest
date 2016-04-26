<?php

// Disable encoding
header("Content-Encoding: none");

function generateRandomData($size) {
	$chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789~!@#$%^&*()_+`-=[]\\{}|;':,./<>?";
	$randomString = '';
	while (strlen($randomString) < (int)$size) {
		$randomString .= str_shuffle($chars);
	}
	return substr($randomString, 0, $size);
}

header('Content-Type: application/json');

// Get method is download
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
	$t = microtime(true);
	echo json_encode([
		'data'=> generateRandomData($_GET['size']),
		'ownTime' => microtime(true) - $t
	]);
} else {
	echo json_encode([]);
}
