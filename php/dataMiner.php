<?php
ini_set('memory_limit', '-1');

/**
 * DataMiner class
 * @author Ville Ilkka
 */

class DataMiner{

    function __construct(){

    }

    private function setTime($timestamp) {
      $url = "";
      if ( $timestamp === "now" ) {
        $start  = new DateTime('', new DateTimezone('Europe/Helsinki'));
        $start->setTime(0,0);
        $start->setTimezone(new DateTimeZone('UTC'));
        $start  = $start->format('Y-m-d\TH:i:s\Z');
        $url    = "&starttime=${start}";
      } else {
        $start  = new DateTime(substr($timestamp,0,-1), new DateTimezone('Europe/Helsinki'));
        $start->setTime(0,0);
        $start->setTimezone(new DateTimeZone('UTC'));
        $start  = $start->format('Y-m-d\TH:i:s\Z');
        $endtime = new DateTime($timestamp, new DateTimeZone('UTC'));
        $end     = $endtime->format('Y-m-d\TH:i:s\Z');
        $url     = "&starttime=${start}&endtime=${end}";
      }
      return $url;
    }

    /**
    *
    * Calculate time zone difference between UTC0 and local time in Helsinki 
    * @return time zone dirrerence as integer
    *
    */

    public function getTimezoneDifference() {

        $dateTimeZoneHelsinki = new DateTimeZone("Europe/Helsinki");
        $dateTimeZoneLondon = new DateTimeZone("Europe/London");

        $dateTimeHelsinki = new DateTime("now", $dateTimeZoneHelsinki);
        $dateTimeLondon = new DateTime("now", $dateTimeZoneLondon);
        
        $timeOffset = $dateTimeZoneHelsinki->getOffset($dateTimeLondon);

        $timeOffset = $timeOffset/3600;
        return $timeOffset;
        
    }

    /**
    *
    * Parse observation data from WFS multipointcoverage
    * @param    timestamp timestamp or now if latest observations
    * @param    settings array that contains required query parameters
    * @return   graph true if graph dat request
    *
    */

    public function multipointcoverage($timestamp,$settings,$graph) {
        date_default_timezone_set("UTC");

        $url = "";
        $url .= "http://opendata.fmi.fi/wfs?request=getFeature";
        $url .= "&storedquery_id={$settings["storedQueryId"]}";
        $url .= "&parameters={$settings["parameter"]}";
        if(isset($settings['fmisid'])) {
            $url .= "&fmisid={$settings["fmisid"]}";
        } else {
            $url .= "&bbox={$settings["bbox"]},epsg::4326";
        }

        if(isset($settings['timestep']))
        $url .= "&timestep={$settings['timestep']}";

        if($timestamp == "now") {
            if($graph) {
                $endtime = new DateTime();
                $end     = $endtime->format('Y-m-d\TH:i:s\Z');
                $start   = $endtime->sub(new DateInterval('PT18H'));
                $start   = $start->format('Y-m-d\TH:i:s\Z');
                $url .= "&starttime=${start}&endtime=${end}";
            } else {
                $endtime = new DateTime();
                $end     = $endtime->format('Y-m-d\TH:i:s\Z');
                $start   = $endtime->sub(new DateInterval('PT1H'));
                $start   = $start->format('Y-m-d\TH:i:s\Z');
                $url .= "&starttime=${start}&endtime=${end}";
            }
        } else {
            if($graph) {
                $endtime = new DateTime($timestamp);
                $end     = $endtime->format('Y-m-d\TH:i:s\Z');
                $start   = $endtime->sub(new DateInterval('PT18H'));
                $start   = $start->format('Y-m-d\TH:i:s\Z');
                $url .= "&starttime=${start}&endtime=${end}";
            } else {
                $endtime = new DateTime($timestamp);
                $end     = $endtime->format('Y-m-d\TH:i:s\Z');
                $start   = $endtime->sub(new DateInterval('PT1H'));
                $start   = $start->format('Y-m-d\TH:i:s\Z');
                $url .= "&starttime=${start}&endtime=${end}";
            }
        }

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
            
            // station names and fmisid's
            $stations = $locations
                    -> children("omso", true)->GridSeriesObservation
                    -> children("om", true)->featureOfInterest
                    -> children("sams", true)->SF_SpatialSamplingFeature
                    -> children("sam", true)->sampledFeature
                    -> children("target", true)->LocationCollection->member;

            foreach ($stations as $station) {
                $tmp = [];
                $name = $station -> children ("target", true)->Location
                                -> children ("gml", true)->name;
                $fmisid = $station -> children ("target", true)->Location
                                -> children ("gml", true)->identifier;

                $tmp["station"] = (string)$name;
                $tmp["fmisid"] = (int)$fmisid;
                array_push($result1,$tmp);
            }

            // station names and coordinates
            $stations = $locations
                    -> children("omso", true)->GridSeriesObservation
                    -> children("om", true)->featureOfInterest
                    -> children("sams", true)->SF_SpatialSamplingFeature
                    -> children("sams", true)->shape
                    -> children("gml", true)->MultiPoint;

            foreach ($stations->pointMember as $station) {
                $tmp = [];
                $name = $station -> children ("gml", true)->Point
                                -> children ("gml", true)->name;
                $pos = $station  -> children ("gml", true)->Point
                                -> children ("gml", true)->pos;

                $tmp["station"] = (string)$name;
                $tmp["pos"] = (string)$pos;
                array_push($result2,$tmp);
            }
            
            // merge station arrays
            $stations = [];
            foreach($result1 as $key => $station) {
                $stations[$key] = array_merge($result1[$key],$result2[$key]);
            }

            // station coordinates and timestamps
            $latlons = $locations
                    -> children("omso", true)->GridSeriesObservation
                    -> children("om", true)->result
                    -> children("gmlcov", true)->MultiPointCoverage
                    -> children("gml", true)->domainSet
                    -> children("gmlcov", true)->SimpleMultiPoint
                    -> children("gmlcov", true)->positions;

            $latlons = explode("                ",(string)$latlons);
            $numberOfStations = count($latlons);
            $i = 0;
            $timestamps = [];
            foreach ($latlons as $latlon) {
                $tmp = [];
                if($i>0 && $i<($numberOfStations-1)) {
                    $latlon = explode(" ",(string)$latlon);
                    $tmp["lat"] = floatval($latlon[0]);
                    $tmp["lon"] = floatval($latlon[1]);
                    $epoch = str_replace("\n", "", $latlon[3]);
                    $tmp["epoctime"] = floatval($epoch);

                    // convert UNIX timestamp to time
                    $tmp["time"] = date("Y-m-d\TH:i:s\Z", intval($latlon[3]));
                    $tmp["type"] = $settings["stationtype"];
                    array_push($timestamps,$tmp);
                }
                $i++;
            }

            // combine station arrays as one
            $i = 0;
            $result = [];
            foreach($timestamps as $measurement) {
                $posstring = sprintf("%0.5f",$measurement["lat"])." ".sprintf("%0.5f",$measurement["lon"]). " ";
                if($posstring == $stations[$i]["pos"]) {
                    array_push($result,array_merge($stations[$i],$measurement));
                } else {
                    $i++;
                    array_push($result,array_merge($stations[$i],$measurement));
                }
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
            
            $observations = explode("                ",(string)$observations);

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

            // merge station data and observation arrays
            foreach($observations as $key => $observation) {
                array_push($final,array_merge($result[$key],$observations[$key]));
            }

        }
        return $final;
    }

    /**
    *
    * Get observation data from timeseries
    * @param    timestamp timestamp or now if latest observations
    * @param    settings array that contains required query parameters
    * @return   graph true if graph dat request
    *
    */

    public function timeseries($timestamp,$settings) {
      $url =  "http://opendata.fmi.fi/timeseries?";
      $url .= "format=json";
      $url .= "&producer=".$settings['producer'];
      $url .= "&keyword=".$settings['keyword'];
      $url .= "&precision=double";
      // $url .= "&missingtext=null";
      $url .= "&tz=utc";      
      $url .= "&timeformat=xml";
      // $url .= "&timestep=10";
      $url .= "&param=".$settings['parameters'];
      $url .= $this->setTime($timestamp);
      $data = file_get_contents($url);
      return json_decode($data, true);
    }


    /**
    * Get observation data from SMHI open data
    * @param    data observation data 
    * @return   data as an array
    *
    */

    public function smhiOpenData() {
        date_default_timezone_set('GMT');
        $parameters = ["vis"=>12,"t2m"=>1,"wd_10min"=>3,"ws_10min"=>4,"wg_10min"=>21,"rh"=>6,"rr_1h"=>7,"n_man"=>16];

        $result = [];

        foreach($parameters as $keyvalue => $parameter) {
        $url = "https://opendata-download-metobs.smhi.se/api/version/latest/parameter/${parameter}/station-set/all/period/latest-hour/data.xml";

        $xmlData = file_get_contents($url);
        $data = simplexml_load_string($xmlData);

        foreach ($data->station as $key) {
            $tmp = [];
            $tmp["key"] = (int)$key->key;
            $tmp["lat"] = (float)$key->latitude;
            $tmp["lon"] = (float)$key->longitude;
            $tmp["station"] = (string)$key->name;
            $tmp["type"] = "synop";

            if(isset($key->value)) {
            if($keyvalue === "n_man")
            $tmp["${keyvalue}"] = round(8*((float)$key->value->value / 100));
            else
            $tmp["${keyvalue}"] = (float)$key->value->value;
            
            $tmp["time"] = (string)$key->value->date;

            } else {
            $tmp["${keyvalue}"] = null;
            $tmp["time"] = (string)$key->to;
            }

            if(array_key_exists($tmp["key"], $result)) {
            $result[(string)$key->key][$keyvalue] = $tmp["${keyvalue}"];
            } else {
            $result[(string)$key->key] = $tmp;
            }

        }
        }

        $final = [];
        foreach($result as $result) {
        foreach($parameters as $keyvalue => $parameter){
            if(array_key_exists($keyvalue,$result) === false) {
            $result[$keyvalue] = null;
            }
        }
        array_push($final,$result);
        }

        for($i=0; $i<count($final); $i++) {
        $final[$i]["ws_1d"] = $final[$i]["ws_10min"];
        $final[$i]["wg_1d"] = $final[$i]["wg_10min"];
        $final[$i]["ws_max_dir"] = $final[$i]["wd_10min"];
        $final[$i]["wg_max_dir"] = $final[$i]["wd_10min"];
        }

        return $final;
    }


    /**
    *
    * @param    data observation data 
    * @return   data as an array
    *
    */

    public function serializeData($data) {

        $outputArray = array();
        $tmp = array();

        $ws_1d = -0.1;
        $wg_1d = -0.1;
        $wg_max_dir = "";
        $ws_max_dir = "";
        $r_1h = null;
        $r_1d = 0;
        $tmin = 999;
        $tmax = -999;
        for ($i = 0; $i <= count($data)-2; $i++) {
            # check if fmisid value is the same as the next one (ie its the same station)
            if($data[$i]["fmisid"] === $data[$i+1]["fmisid"]) {
                # check if observations are valid
                if($data[$i]["ws_10min"] !== "nan") {
                    # check if observation values are greater that previous one
                    if($ws_1d < floatval($data[$i]["ws_10min"])) {
                        $ws_1d = $data[$i]["ws_10min"];
                        $ws_max_dir = $data[$i]["wd_10min"];
                    }
                }
                # check if observations are valid
                if($data[$i]["wg_10min"] !== "nan") {
                    # check if observation values are greater that previous one
                    if($wg_1d < floatval($data[$i]["wg_10min"])) {
                        $wg_1d = $data[$i]["wg_10min"];
                        $wg_max_dir = $data[$i]["wd_10min"];
                    }
                }
                # check if observations are valid
                if($data[$i]["r_1h"] !== null) {
                    # save observation values
                    $r_1h = $data[$i]["r_1h"];
                    $r_1d = $r_1d + floatVal($data[$i]["r_1h"]);
                }
                # check if observations are valid
                if($data[$i]["t2m"] !== null) {
                  # save observation values
                  if($data[$i]["t2m"] < $tmin) {$tmin = $data[$i]["t2m"];}
                  if($data[$i]["t2m"] > $tmax) {$tmax = $data[$i]["t2m"];}
              }
            } else {
                if($ws_1d === -0.1){ $ws_1d = null; }
                if($wg_1d === -0.1){ $wg_1d = null; }
                if($ws_max_dir === ""){ $ws_max_dir = null; }
                if($wg_max_dir === ""){ $wg_max_dir = null; }
                $data[$i]["ws_1d"] = $ws_1d;
                $data[$i]["wg_1d"] = $wg_1d;
                $data[$i]["wg_max_dir"] = $wg_max_dir;
                $data[$i]["ws_max_dir"] = $ws_max_dir;
                $data[$i]["tmax"] = $tmax;
                $data[$i]["tmin"] = $tmin;
                $data[$i]["rr_1h"] = $r_1h;
                $data[$i]["rr_1d"] = round($r_1d,1);
                array_push($outputArray, $data[$i]);
                $r_1h = null;
                $r_1d = 0;
                $ws_1d = -0.1;
                $wg_1d = -0.1;
                $tmin = 999;
                $tmax = -999;
                $wg_max_dir = "";
                $ws_max_dir = "";
            }

        }
        return $outputArray;
    }
 

    public function combineData($observation, $forecast) {

        $data = [];
        foreach ( $observation as $dataArray ) {
            array_push($data,$dataArray);
        }
        foreach ( $forecast as $dataArray ) {
            array_push($data,$dataArray);
        }

        // return json_encode($data);
        return $data;     
    }

    // end of class

}


?>
