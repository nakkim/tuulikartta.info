<?php
require_once("dataMiner.php");
date_default_timezone_set('Europe/Helsinki');

$timestamp = $_GET["time"];

$dataMiner = new DataMiner();

$synopdata = $dataMiner->synopdata($timestamp);
$roaddata = $dataMiner->roaddata($timestamp);


foreach($roaddata as $key => $data) {
	array_push($synopdata,$data);
}

$synopdata = $dataMiner->serializeData($synopdata);
print json_encode($synopdata);