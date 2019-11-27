<?php
require_once("dataMiner.php");
header('Content-Type: application/json');

$latlon      = filter_input(INPUT_GET, 'latlon', FILTER_SANITIZE_STRING);
$fmisid      = filter_input(INPUT_GET, 'fmisid', FILTER_SANITIZE_STRING);
$type        = filter_input(INPUT_GET, 'type', FILTER_SANITIZE_STRING);
$timestamp   = filter_input(INPUT_GET, 'timestamp', FILTER_SANITIZE_STRING);

$dataMiner = new DataMiner();
$data = [];
if ($type == 'road') {
    $settings = array();
    $settings["stationtype"]    = "road";
    $settings["parameter"]      = "ws,wg,wd,vis,prst1,ta,pri";
    $settings["storedQueryId"]  = "livi::observations::road::default::multipointcoverage";
    $settings["fmisid"]         = $fmisid;

    
    $obs = $dataMiner->multipointcoverage($timestamp,$settings,true);
    $observationData = [];
    foreach ( $obs as $key => $observation ) {

        $tmp = $observation;
        $tmp["datatype"] = "observation";
        $tmp["station"] = "synop";
        $tmp["ws_10min"] = $observation['ws'];
        $tmp["wg_10min"] = $observation['wg'];
        $tmp["wd_10min"] = $observation['wd'];
        $tmp["t2m"] = $observation['ta'];
        unset($tmp["ws"]);
        unset($tmp["wg"]);
        unset($tmp["wd"]);
        unset($tmp["ta"]);
        array_push($observationData,$tmp);
    }

    $obs = $observationData;

}
if ($type == 'synop') {

    $settings = array();
    $settings["stationtype"]    = "synop";
    $settings["parameter"]      = "ws_10min,wg_10min,wd_10min,t2m,n_man,r_1h";
    $settings["storedQueryId"]  = "fmi::observations::weather::multipointcoverage";
    $settings["fmisid"]         = $fmisid;
    $settings["timestep"]       = "10";
    
    $obs = $dataMiner->multipointcoverage($timestamp,$settings,true);
}

$combinedData = [];
$combinedData["obs"] = $obs;
$combinedData["for"] = [];

print formatWindData($combinedData);




/**
 *
 * Format data as a javascript array
 * @param    data as php aarray
 * @return   data as javascript array string
 *
 */


function formatWindData($data) {
    // print json_encode($data);
    $formattedData = "{";
    foreach($data as $key => $dataArray){
        $wind = "";
        $dir  = "";
        $temp = "";
        $rr1h = "";
        
        $i = 0;
        foreach($dataArray as $array) {
            $tmp = $array;
            if(empty($tmp["t2m"])) {$tmp["t2m"] = "null";}
            if(empty($tmp['r_1h'])) {$tmp['r_1h'] = "null";}
            if(empty($tmp['ws_10min'])) {$tmp['ws_10min'] = "null";}
            if(empty($tmp['wg_10min'])) {$tmp['wg_10min'] = "null";}
            if(empty($tmp['wd_10min'])) {$tmp['wd_10min'] = "null";}

            $tmp["epoctime"] = intval($tmp["epoctime"]*1000);

            $temp .= "[".$tmp["epoctime"].",".$tmp["t2m"]."],";
            $rr1h .= "[".$tmp["epoctime"].",".$tmp["r_1h"]."],";
            $wind .= "[".$tmp["epoctime"].",".$tmp["ws_10min"].",".$tmp["wg_10min"]."],";
            if ($i % 3 == 0) {
                if (floatval($tmp["ws_10min"]) >= 1.0) {
                    $dir  .= "[".$tmp["epoctime"].",".$tmp["ws_10min"].",".$tmp["wd_10min"]."],";
                } else {
                    $dir  .= "[".$tmp["epoctime"].",null,".$tmp["wd_10min"]."],";
                }

            } else {
                $dir  .= "[".$tmp["epoctime"].",null,null],";
            }
            $i++;
        }

        // remove last comma and add closing bracket
        
        $wind = substr($wind, 0, -1);
        $dir  = substr($dir, 0, -1);
        $temp = substr($temp, 0, -1);
        $rr1h = substr($rr1h, 0, -1);
    
        $formattedData .= "\"{$key}\":{\"wind\":[".$wind."],\"dir\":[".$dir."],\"rr1h\":[".$rr1h."],\"temp\":[".$temp."]},";
        
    }
    $formattedData = substr($formattedData, 0, -1);
    $formattedData .= "}";
    return $formattedData;
    
}