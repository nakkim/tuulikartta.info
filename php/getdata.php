<?php
require_once("dataMiner.php");
date_default_timezone_set('Europe/Helsinki');


$dataMiner = new DataMiner();

$synopdata = $dataMiner->synopdata();
$roaddata = $dataMiner->roaddata();

// change parameter names to ws_10min, wg_10min and wd_10min
foreach($roaddata as &$val){
    $val['ws_10min'] = $val['windspeedms'];
    $val['wd_10min'] = $val['winddirection'];
    $val['wg_10min'] = $val['WG'];
    unset($val['windspeedms']);
    unset($val['winddirection']);
    unset($val['WG']);
}

foreach($roaddata as $key => $data) {
	array_push($synopdata,$data);
}

print json_encode($synopdata);