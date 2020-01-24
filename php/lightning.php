<?php
// error_reporting(0);
require_once("dataMiner.php");
date_default_timezone_set('Europe/Helsinki');

header('Content-Type: application/json');

$timestamp = $_GET["time"];
$timestep  = $_GET["interval"];

$endtime = new DateTime($timestamp);
$starttime = new DateTime($timestamp);

// create a new start time for data query
if($timestep === '5') $starttime->sub(new DateInterval('PT5M'));
if($timestep === '15') $starttime->sub(new DateInterval('PT15M'));
if($timestep === '30') $starttime->sub(new DateInterval('PT30M'));
if($timestep === '60') $starttime->sub(new DateInterval('PT60M'));

$starttime = $starttime->format('Y-m-d\TH:i:s\Z');
$endtime   = $endtime->format('Y-m-d\TH:i:s\Z');

$lightningData = getLightningData($starttime,$endtime);
print createGeoJSON($lightningData);



/**
 *
 * create geojson string
 *
 * @param array $data
 * @return string geojson string
 * 
 */

function createGeoJSON ($data) {
  $i = 0;
  
  $str = "[";

  for($x=0; $x<2; $x++) {
    $str .= '{ "type": "FeatureCollection",';
    $str .= '"features": [';

    foreach ($data as $key => $val) {

      if((int)$val['cloud_indicator'] == $x) {

        $str .= '{ "type": "Feature",';
        $str .= '"geometry": {"type": "Point", "coordinates": ['.$val['lon'].', '.$val['lat'].']},';
        $str .= '"properties": {';
        $str .= '"cloud_indicator": "'.$val['cloud_indicator'].'"';
        $str .= '}';
        $str .= '},';
      }
    }
    $i=0;
    // remove last comma
    $str = rtrim($str,',');
    $str .= ']},';
  }
  $str = rtrim($str,',');
  $str .= ']';
  return $str;
}


/**
 *
 * Create data array from timestring
 *
 * @param array $data
 * @return string geojson string
 * 
 */

function formatDataToTimes( $timestring ) {

  $timeValues = [];

  $timestamp = explode("/",$timestring);
  $starttime = new DateTime($timestamp[0]);
  $endtime = new DateTime($timestamp[1]);
  $timestep = $timestamp[2];

  array_push($timeValues, $starttime->format('Y-m-d\TH:i:s\Z'));
  $addMoreValues = true;

  while($addMoreValues == true) {

    if($timestep == "PT5M") $starttime->modify('+5 minutes');
    else $starttime->modify('+15 minutes');

    if ($starttime == $endtime) {
      array_push($timeValues, $starttime->format('Y-m-d\TH:i:s\Z'));
      $addMoreValues = false;
    } else {
      array_push($timeValues, $starttime->format('Y-m-d\TH:i:s\Z'));
    }
  }

  return $timeValues;
}


/**
 *
 * cut lightning data into intervals
 *
 * @param array $lightningData
 * @param array $timeValues
 * @return array data array
 * 
 */

function resolveTimeIntervals ( $lightningData, $timeValues ) {
  $result = [];
  $i = 0;
  foreach($timeValues as $time) {
    $result[$time] = [];
    while($i < count($lightningData)-1) {
      if( new DateTime($lightningData[$i]['time']) < new DateTime($time) ) {
        array_push($result[$time], $lightningData[$i]);
        $i++;
      } else {
        $i++;
        break;
      }
    }
  }
  return $result;
}


function getLightningData($starttime,$endtime) {
  date_default_timezone_set("UTC");
    
  $settings = array();
  $settings["parameter"]      = "cloud_indicator";
  $settings["storedQueryId"]  = "fmi::observations::lightning::multipointcoverage";
  $settings["bbox"]           = "16.58,58.81,34.8,70.61";

  $url = "";
  $url .= "http://opendata.fmi.fi/wfs?request=getFeature";
  $url .= "&storedquery_id={$settings["storedQueryId"]}";
  $url .= "&parameters={$settings["parameter"]}";
  $url .= "&starttime={$starttime}";
  $url .= "&endtime={$endtime}";
  $url .= "&bbox={$settings["bbox"]},epsg::4326&";

  $xmlData = file_get_contents($url);
  if($xmlData == false) {
    return [];
  }
  if($xmlData == "") {
    return [];
  }

  $resultString = simplexml_load_string($xmlData);

  $result = array();
  $tmp = array();
  $final = [];

  $data = $resultString->children("wfs", true);
  $params = explode(",", $settings["parameter"]);

  $result1 = [];
  $result2 = [];
  foreach ($data->member as $key => $locations) {            
      // coordinates and timestamps
      $latlons = $locations
            -> children("omso", true)->GridSeriesObservation
            -> children("om", true)->result
            -> children("gmlcov", true)->MultiPointCoverage
            -> children("gml", true)->domainSet
            -> children("gmlcov", true)->SimpleMultiPoint
            -> children("gmlcov", true)->positions;

      $latlons = explode("\n",(string)$latlons);
      $numberOfStations = count($latlons);
      $i = 0;
      $timestamps = [];
      foreach ($latlons as $latlon) {
        $tmp = [];
        if($i>0 && $i<($numberOfStations-1)) {
          $latlon = explode(" ",trim((string)$latlon));
          $tmp["lat"] = floatval($latlon[0]);
          $tmp["lon"] = floatval($latlon[1]);
          $tmp["epoctime"] = floatval($latlon[2]);

          // convert UNIX timestamp to time
          $tmp["time"] = date("Y-m-d\TH:i:s\Z", $tmp["epoctime"]);
          array_push($timestamps,$tmp);
        }
        $i++;
      }

      // actual observations
      $parameters = explode(",",$settings["parameter"]);
      $observations = $locations
              -> children("omso", true)->GridSeriesObservation
              -> children("om", true)->result
              -> children("gmlcov", true)->MultiPointCoverage
              -> children("gml", true)->rangeSet
              -> children("gml", true)->DataBlock
              -> children("gml", true)->doubleOrNilReasonTupleList;
      $observations = explode("\n",trim((string)$observations));

      $tmp = [];
      foreach($observations as $key => $observation) {
        if($key > 0 and $key < (count($observations)-1))
        $tmp[$key] = explode(" ",$observation);
      }

      $observations = [];
      foreach($tmp as $observation) {
        for($x=0; $x<count($parameters); $x++) {
          if(is_numeric($observation[$x]) === true) {
              $tmp2[$parameters[$x]] = floatval($observation[$x]);
          } else {
              $tmp2[$parameters[$x]] = null;
          }

          }
        array_push($observations,$tmp2);
      }
      // merge arrays
      foreach($observations as $key => $observation) {
        array_push($final,array_merge($timestamps[$key],$observations[$key]));
      }
  }
  return $final;
}
