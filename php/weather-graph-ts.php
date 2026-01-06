<?php
require_once("dataMiner.php");
header('Content-Type: application/json');

$latlon      = filter_input(INPUT_GET, 'latlon', FILTER_SANITIZE_FULL_SPECIAL_CHARS);
$fmisid      = filter_input(INPUT_GET, 'fmisid', FILTER_SANITIZE_FULL_SPECIAL_CHARS);
$type        = filter_input(INPUT_GET, 'type', FILTER_SANITIZE_FULL_SPECIAL_CHARS);
$timestamp   = filter_input(INPUT_GET, 'timestamp', FILTER_SANITIZE_FULL_SPECIAL_CHARS);

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
$winddirections = resolveWindDirection($combinedData);
print json_encode(formatHighChart($combinedData, $winddirections));



/**
 *
 * Calculate cumulative precipitation
 * @param    data as php aarray
 * @return   data as javascript array string×

 *
 */

function calcCumulativeSum($data) {
    $precSum = 0;
    $tmpData = [];
    foreach($data["obs"] as $observation) {
        $tmp = $observation;
        if(is_numeric($observation["r_1h"])) {
            $precSum = round($precSum + $observation["r_1h"],1);
        }
        $tmp["rr1h_calc"] = $precSum;
        array_push($tmpData,$tmp);
    }
    $data["obs"] = $tmpData;
    return $data;
}


function resolveWindDirection($data) {
  $dir = [
    "N",
    "NNE",
    "NE",
    "ENE",
    "E",
    "ESE",
    "SE",
    "SSE",
    "S",
    "SSW",
    "SW",
    "WSW",
    "W",
    "WNW",
    "NW",
    "NNW"
  ];

  $speed = [
    0 => ["Tyyntä", 0, "#ffffff"],
    1 => ["Heikkoa", 1, "#e6f7ff"],
    2 => ["Kohtalaista", 4, "#ccffcc"], 
    3 => ["Navakkaa", 7, "#ffff99"],
    4 => ["Kovaa", 14, "#ffcc00"],
    5 => ["Myrskyä", 21, "#ff3300"],
    6 => ["Kovaa myrskyä", 25, "#ff0066"],
    7 => ["Ankaraa myrskyä", 28, "#cc0099"],
    8 => ["Hirmymyrskyä", 32, "#6600cc"]
  ];

  $values = [];
  foreach($speed as $key => $value) {
    $values[$key] = [];
    $values[$key]['name'] = $speed[$key][0];
    $values[$key]['fillColor'] = $speed[$key][2];   
    $values[$key]['data'] = [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0];

  };

  // count valid wind observations
  $valid = 0;
  foreach($data['obs'] as $key => $observation) {
    if(is_numeric($observation['ws_10min'])) {
      $valid++;
    }
  }

  $x=1;  
  for($z=0; $z<9; $z++) {
    for($i=0; $i<16; $i++) {
      $k=0;
      foreach($data['obs'] as $key => $observation) {
        $dirIndex = (int)round($observation['wd_10min']/22.5) % 16;
        if($dir[$dirIndex] === $dir[$i] && ($observation['ws_10min'] > $speed[$x-1][1] && $observation['ws_10min'] <= $speed[$x][1]) ) {
          $k++;
        }
      }
      if($valid > 0) {
        $values[$z]['data'][$i] = round(100*($k/$valid),1);
      } else {
        $values[$z]['data'][$i] = 0;
      }
    }
    $x++;
  }

  return $values;
}

/**
 *
 * Format data as a javascript array
 * @param    data as php aarray
 * @return   data as javascript array string
 *
 */


function formatHighChart($data, $winddirections) {
    // print json_encode($data);

    $formattedData = [];
    $formattedData["obs"] = [];
    $formattedData["for"] = [];
    foreach($formattedData as $key => $array) {
      $formattedData[$key]["wind"] = [];
      $formattedData[$key]["windrose"] = [];
      $formattedData[$key]["dir"] = [];
      $formattedData[$key]["rr1h"] = [];
      $formattedData[$key]["vis"] = [];
      $formattedData[$key]["n_man"] = [];
      $formattedData[$key]["temp"] = [];
      $formattedData[$key]["rr1h_calc"] = [];
    }

    foreach($data as $key => $dataArray) {
      $i = 0;
      foreach($dataArray as $array) {
        // wind
        if(!empty($array['ws_10min'])) {
          $tmp = [];
          array_push($tmp, $array['epochtime']*1000);
          array_push($tmp, $array['ws_10min']);
          array_push($tmp, $array['wg_10min']);
          array_push($formattedData['obs']['wind'], $tmp);
        } else {
          $tmp = [];
          array_push($tmp, $array['epochtime']*1000);
          array_push($tmp, null);
          array_push($tmp, null);
          array_push($formattedData['obs']['wind'], $tmp);
        }

        // dir
        if(!empty($array['ws_10min']) && $i % 3 == 0) {
          $tmp = [];
          array_push($tmp, $array['epochtime']*1000);
          array_push($tmp, $array['ws_10min']);
          array_push($tmp, $array['wd_10min']);
          array_push($formattedData['obs']['dir'], $tmp);
        } else {
          $tmp = [];
          array_push($tmp, $array['epochtime']*1000);
          array_push($tmp, null);
          array_push($tmp, null);
          array_push($formattedData['obs']['dir'], $tmp);
        }

        // rr1h
        if(!empty($array['rr_1h'])) {
          $tmp = [];
          array_push($tmp, $array['epochtime']*1000);
          array_push($tmp, $array['rr_1h']);
          array_push($formattedData['obs']['rr1h'], $tmp);
        } else {
          $tmp = [];
          array_push($tmp, $array['epochtime']*1000);
          array_push($tmp, null);
          array_push($formattedData['obs']['rr1h'], $tmp);
        }

        // vis
        if(!empty($array['vis'])) {
          $tmp = [];
          array_push($tmp, $array['epochtime']*1000);
          array_push($tmp, $array['vis']);
          array_push($formattedData['obs']['vis'], $tmp);
        } else {
          $tmp = [];
          array_push($tmp, $array['epochtime']*1000);
          array_push($tmp, null);
          array_push($formattedData['obs']['vis'], $tmp);
        }

        // n_man
        if(!empty($array['n_man'])) {
          $tmp = [];
          array_push($tmp, $array['epochtime']*1000);
          array_push($tmp, $array['n_man']);
          array_push($formattedData['obs']['n_man'], $tmp);
        } else {
          $tmp = [];
          array_push($tmp, $array['epochtime']*1000);
          array_push($tmp, null);
          array_push($formattedData['obs']['n_man'], $tmp);
        }

        // temp
        if(!empty($array['t2m'])) {
          $tmp = [];
          array_push($tmp, $array['epochtime']*1000);
          array_push($tmp, $array['t2m']);
          array_push($formattedData['obs']['temp'], $tmp);
        } else {
          $tmp = [];
          array_push($tmp, $array['epochtime']*1000);
          array_push($tmp, null);
          array_push($formattedData['obs']['temp'], $tmp);
        }

        // rr1h_calc
        if(!empty($array['rr1h_calc'])) {
          $tmp = [];
          array_push($tmp, $array['epochtime']*1000);
          array_push($tmp, $array['rr1h_calc']);
          array_push($formattedData['obs']['rr1h_calc'], $tmp);
        } else {
          $tmp = [];
          array_push($tmp, $array['epochtime']*1000);
          array_push($tmp, null);
          array_push($formattedData['obs']['rr1h_calc'], $tmp);
        }

        $i++;
      }
    }

    $formattedData['obs']['windrose'] = $winddirections;

    return $formattedData;

}