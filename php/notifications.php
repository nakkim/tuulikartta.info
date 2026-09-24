<?php
require_once("dataMiner.php");
date_default_timezone_set('Europe/Helsinki');

header('Content-Type: application/json');

$dataMiner = new DataMiner();
$notifications = $dataMiner->getActiveNotifications();

if ($notifications === null) {
    // database unreachable/query failed - let the client know via a
    // non-2xx status rather than silently returning null, so it can tell
    // "no active notification" apart from "backend is down"
    http_response_code(503);
    print json_encode(["error" => "Notifications are temporarily unavailable"]);
    exit;
}

// only the single most relevant notification is ever shown - null when
// there is currently none active
print json_encode(count($notifications) > 0 ? $notifications[0] : null);
