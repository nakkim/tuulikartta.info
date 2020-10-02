<?php

$FILES = scandir("data");

$observations = [];

foreach ($FILES as $file) {
  if (preg_match("/.json/",$file)) {
    $observations[] = "data/".$file;
  }
}

header("Content-type: application/json");
header("Pragma: no-cache");
header("Cache-control: no-cache, must-revalidate");
header("Expires: Fri, 01 Jan 1990 00:00:00 GMT");
print json_encode($observations);