<?php

function generateRandomData($size) {
	$chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789~!@#$%^&*()_+`-=[]\\{}|;':,./<>?";
	$randomString = '';
	while (strlen($randomString) < (int)$size) {
		$randomString .= str_shuffle($chars);
	}
	return substr($randomString, 0, $size);
}

header('Content-Type: application/json');

if (empty($_POST)) {
	$t = microtime(true);
	echo json_encode([
		'data'=> generateRandomData($_GET['size']),
		'ownTime' => microtime(true) - $t
	]);
} else {
	echo json_encode([]);
}
