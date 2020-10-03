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
    $settings["parameters"]     = "ws,wg,wd,vis,prst1,ta,pri";
    $settings["storedquery_id"] = "livi::observations::road::default::multipointcoverage";
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
    $settings["parameters"]     = "ws_10min,wg_10min,wd_10min,t2m,n_man,r_1h,vis";
    $settings["storedquery_id"] = "fmi::observations::weather::multipointcoverage";
    $settings["timestep"]       = "10";
    $settings["fmisid"]         = $fmisid;

    $obs = $dataMiner->multipointcoverage($timestamp,$settings,true);
}

$combinedData = [];
$combinedData["obs"] = $obs;
$combinedData["for"] = [];

$combinedData = calcCumulativeSum($combinedData);
print formatWindData($combinedData);



/**
 *
 * Calculate cumulative precipitation
 * @param    data as php aarray
 * @return   data as javascript array string
 *
 */


function calcCumulativeSum($data) {
    $precSum = 0;
    $tmpData = [];
    foreach($data["obs"] as $observation) {
        $tmp = $observation;
        if(is_numeric($observation["r_1h"])) {
            $precSum = $precSum + (float)$observation["r_1h"];
        }
        $tmp["calc_rr_1h"] = $precSum;
        array_push($tmpData,$tmp);
    }
    $data["obs"] = $tmpData;
    return $data;
}



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
        $calc = "";
        $vis  = "";
        $nn   = "";

        $i = 0;
        foreach($dataArray as $array) {
            $tmp = $array;
            if(!is_numeric($tmp["t2m"])) {$tmp["t2m"] = "null";}
            if(empty($tmp['r_1h'])) {$tmp['r_1h'] = "null";}
            if(empty($tmp['calc_rr_1h'])) {$tmp['calc_rr_1h'] = "null";}
            if(empty($tmp['ws_10min'])) {$tmp['ws_10min'] = "null";}
            if(empty($tmp['wg_10min'])) {$tmp['wg_10min'] = "null";}
            if(empty($tmp['wd_10min'])) {$tmp['wd_10min'] = "null";}
            if(empty($tmp['vis'])) {$tmp['vis'] = "null";}
            if(!is_numeric($tmp['n_man'])) {$tmp['n_man'] = "null";}

            $tmp["epochtime"] = intval($tmp["epochtime"]*1000);

            $temp .= "[".$tmp["epochtime"].",".$tmp["t2m"]."],";
            $rr1h .= "[".$tmp["epochtime"].",".$tmp["r_1h"]."],";
            $vis  .= "[".$tmp["epochtime"].",".round(floatVal($tmp["vis"])/1000,2)."],";
            $nn   .= "[".$tmp["epochtime"].",".$tmp["n_man"]."],";
            $wind .= "[".$tmp["epochtime"].",".$tmp["ws_10min"].",".$tmp["wg_10min"]."],";
            if ($i % 3 == 0) {
                if (floatval($tmp["ws_10min"]) >= 1.0) {
                    $dir  .= "[".$tmp["epochtime"].",".$tmp["ws_10min"].",".$tmp["wd_10min"]."],";
                } else {
                    $dir  .= "[".$tmp["epochtime"].",null,".$tmp["wd_10min"]."],";
                }

            } else {
                $dir  .= "[".$tmp["epochtime"].",null,null],";
            }
            $calc .= "[".$tmp["epochtime"].",".$tmp["calc_rr_1h"]."],";
            $i++;
        }

        // remove last comma and add closing bracket

        $wind = substr($wind, 0, -1);
        $dir  = substr($dir, 0, -1);
        $temp = substr($temp, 0, -1);
        $rr1h = substr($rr1h, 0, -1);
        $calc = substr($calc, 0, -1);
        $nn   = substr($nn  , 0, -1);
        $vis  = substr($vis , 0, -1);

        $formattedData .= "\"{$key}\":{\"wind\":[".$wind."],\"rr1h_calc\":[".$calc."],\"dir\":[".$dir."],\"rr1h\":[".$rr1h."],\"vis\":[".$vis."],\"n_man\":[".$nn."],\"temp\":[".$temp."]},";

    }
    $formattedData = substr($formattedData, 0, -1);
    $formattedData .= "}";
    return $formattedData;

}