<?php
require_once("dataMiner.php");
date_default_timezone_set('Europe/Helsinki');

header('Content-Type: application/json');

$timestamp = $_GET["time"];

$dataMiner = new DataMiner();

// synop observations
$settings = array();
$settings["stationtype"]    = "synop";
$settings["parameters"]     = "ri_10min,ws_10min,wg_10min,wd_10min,vis,wawa,t2m,n_man,r_1h,snow_aws,pressure,rh,dewpoint";
$settings["storedquery_id"] = "fmi::observations::weather::multipointcoverage";
$settings["bbox"]           = "16.58,58.81,34.8,70.61,epsg::4326";
$settings["timestep"]       = "10";
$synopdata = $dataMiner->multipointcoverage($timestamp, $settings, false);

$synopdata = $dataMiner->serializeData($synopdata);
print json_encode($synopdata);