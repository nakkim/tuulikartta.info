<?php
// Checks for request parameters, shared by the php/ endpoints

// "now" or a UTC time as sent by the client, e.g. 2026-10-22T10:10:00Z
// or 2026-10-22T10:10:00.000Z (moment toISOString)
function isValidTimestamp($value) {
  if ($value === 'now') {
    return true;
  }
  if (!is_string($value) || preg_match('/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d{1,3})?)?Z$/', $value) !== 1) {
    return false;
  }
  // the pattern also matches impossible dates such as month 13
  try {
    new DateTime($value);
    return true;
  } catch (Exception $e) {
    return false;
  }
}

function badRequest($message) {
  http_response_code(400);
  print json_encode(array('error' => $message));
  exit;
}
