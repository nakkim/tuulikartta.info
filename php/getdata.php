<?php
require_once("dataMiner.php");
date_default_timezone_set('Europe/Helsinki');


$dataMiner = new DataMiner();

$synopdata = $dataMiner->synopdata();
$roaddata = $dataMiner->roaddata();

foreach($roaddata as $key => $data) {
	array_push($synopdata,$data);
}

print json_encode($synopdata);