<?php
require_once("dataMiner.php");
date_default_timezone_set('Europe/Helsinki');

header('Content-Type: application/json');

$timestamp = $_GET["time"];

$dataMiner = new DataMiner();

// synop observations
$settings = array();
$settings["stationtype"]    = "synop";
$settings["parameter"]      = "ri_10min,ws_10min,wg_10min,wd_10min,vis,wawa,t2m,n_man,r_1h";
$settings["storedQueryId"]  = "fmi::observations::weather::multipointcoverage";
$settings["bbox"]           = "16.58,58.81,34.8,70.61";
$synopdata = $dataMiner->multipointcoverage($timestamp,$settings);

// synop observations
$settings = array();
$settings["stationtype"]    = "road";
$settings["parameter"]      = "ws,wg,wd,vis,prst1,ta,pri";
$settings["storedQueryId"]  = "livi::observations::road::default::multipointcoverage";
$settings["bbox"]           = "16.58,58.81,34.8,70.61";
$roaddata = $dataMiner->multipointcoverage($timestamp,$settings);

foreach($roaddata as $key => $data) {
	$tmp = $data;
	$tmp["ri_10min"] = $tmp["pri"];
	$tmp["ws_10min"] = $tmp["ws"];
	$tmp["wd_10min"] = $tmp["wd"];
	$tmp["wg_10min"] = $tmp["wg"];
	$tmp["visibility"] = $tmp["vis"];
	$tmp["t2m"] = $tmp["ta"];
	$tmp["wava"] = $tmp["prst1"];
	$tmp["n_man"] = null;
	$tmp["r_1h"] = null;
	array_push($synopdata,$tmp);
}

// $synopdata = $dataMiner->synopdata($timestamp);
// $roaddata = $dataMiner->roaddata($timestamp);

$synopdata = $dataMiner->serializeData($synopdata);
print json_encode($synopdata);