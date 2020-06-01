<?php

/**
 * DataMiner class
 * @author Ville Ilkka
 */

class DataMiner{

    function __construct(){

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
    * Get latest road weather observations 
    * @return   data as php array
    *
    */

    public function roaddata($timestamp) {
        $url = "";
        $url .= "http://data.fmi.fi/fmi-apikey/f01a92b7-c23a-47b0-95d7-cbcb4a60898b/timeseries?";
        $url .= "&format=json";
        $url .= "&producer=road";
        $url .= "&keyword=road_weather_stations_master";
        $url .= "&precision=double";
        $url .= "&param=name%20as%20station,fmisid,utctime%20as%20time,lat,lon,visibility,vsaa%20as%20wawa,temperature,wg%20as%20wg_10min,ws%20as%20ws_10min,wd%20as%20wd_10min,pri%20as%20ri_10min";
        $url .= "&missingtext=nan";

        if($timestamp == "now") {
            // $url .= "&starttime=-1h";
        } else {
            date_default_timezone_set("UTC");
            $time = strtotime($timestamp);
            $starttime = date('Y-m-d\TH:i:s\Z',$time - 3600);
            $url .= "&starttime=${starttime}&endtime=${timestamp}";
        }
        $data = file_get_contents($url) or die("Unable to get data from {$url}");
        $data = json_decode($data, true);

        /* add datatype, station and epoch time information to each observation */
        $observationData = [];
        foreach ( $data as $key => $observation ) {

            $tmp = $observation;

            date_default_timezone_set("UTC");
            $time = strtotime($observation["time"]);
            $tmp["time"] = date('Y-m-d\TH:i:s\Z',$time);

            $tmp["type"] = "road";
            $tmp['n_man'] = null;
            
            $date = new DateTime($observation["time"]);
            $tmp["epoctime"] = intVal($date->format('U'));
            array_push($observationData,$tmp);

        }

        return $observationData;
    }

    /**
    *
    * Get latest synop observations 
    * @return   data as php array
    *
    */

    public function synopdata($timestamp) {
        $url = "";
        $url .= "http://data.fmi.fi/fmi-apikey/f01a92b7-c23a-47b0-95d7-cbcb4a60898b/timeseries?";
        $url .= "&format=json";
        $url .= "&producer=fmi";
        $url .= "&keyword=synop_fi";
        $url .= "&precision=double";
        $url .= "&param=stationname%20as%20station,fmisid,utctime%20as%20time,lat,lon,visibility,wawa,temperature,wg_10min,ws_10min,wd_10min,ri_10min,n_man";
        $url .= "&missingvtext=nan";

        if($timestamp == "now") {
            $url .= "&starttime=-1h";
        } else {
            date_default_timezone_set("UTC");
            $time = strtotime($timestamp);
            $starttime = date('Y-m-d\TH:i:s\Z',$time - 3600);
            $url .= "&starttime=${starttime}&endtime=${timestamp}";
        }
        $data = file_get_contents($url) or die("Unable to get data");
        $data = json_decode($data, true);

        /* add datatype, station and epoch time information to each observation */
        $observationData = [];
        foreach ( $data as $key => $observation ) {

            $tmp = $observation;

            date_default_timezone_set("UTC");
            $time = strtotime($observation["time"]);
            $tmp["time"] = date('Y-m-d\TH:i:s\Z',$time);

            $tmp["type"] = "synop";

            $date = new DateTime($observation["time"]);
            $tmp["epoctime"] = intVal($date->format('U'));
            array_push($observationData,$tmp);

        }

        return $observationData;
    }

    /**
    *
    * Opendata synop observations
    * @return   data as php array
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
        $final[$i]["ws_1h"] = $final[$i]["ws_10min"];
        $final[$i]["wg_1h"] = $final[$i]["wg_10min"];
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

        $ws_1h = -0.1;
        $wg_1h = -0.1;
        $wg_max_dir = "";
        $ws_max_dir = "";
        $r_1h = null;
        for ($i = 0; $i <= count($data)-2; $i++) {
            # check if fmisid value is the same as the next one (ie its the same station)
            if($data[$i]["fmisid"] === $data[$i+1]["fmisid"]) {
                # check if observations are valid
                if($data[$i]["ws_10min"] !== "nan") {
                    # check if observation values are greater that previous one
                    if($ws_1h < floatval($data[$i]["ws_10min"])) {
                        $ws_1h = $data[$i]["ws_10min"];
                        $ws_max_dir = $data[$i]["wd_10min"];
                    }
                }
                # check if observations are valid
                if($data[$i]["wg_10min"] !== "nan") {
                    # check if observation values are greater that previous one
                    if($wg_1h < floatval($data[$i]["wg_10min"])) {
                        $wg_1h = $data[$i]["wg_10min"];
                        $wg_max_dir = $data[$i]["wd_10min"];
                    }
                }
                # check if observations are valid
                if($data[$i]["r_1h"] !== null) {
                    # save observation values
                    $r_1h = $data[$i]["r_1h"];
                }
            } else {
                if($ws_1h === -0.1){ $ws_1h = "null"; }
                if($wg_1h === -0.1){ $wg_1h = "null"; }
                if($ws_max_dir === ""){ $ws_max_dir = "null"; }
                if($wg_max_dir === ""){ $wg_max_dir = "null"; }
                $data[$i]["ws_1h"] = $ws_1h;
                $data[$i]["wg_1h"] = $wg_1h;
                $data[$i]["wg_max_dir"] = $wg_max_dir;
                $data[$i]["ws_max_dir"] = $ws_max_dir;
                $data[$i]["rr_1h"] = $r_1h;
                array_push($outputArray, $data[$i]);
                $r_1h = null;
                $ws_1h = -0.1;
                $wg_1h = -0.1;
                $wg_max_dir = "";
                $ws_max_dir = "";
            }

        }
        return $outputArray;
    }
 
    /**
    *
    * Get road observation data from timeseries
    * @param    station fmisid 
    * @return   data as an array
    *
    */

    public function roadObservation($fmisid,$timestamp) {
        
        $url = "";
        $url .= "http://data.fmi.fi/fmi-apikey/f01a92b7-c23a-47b0-95d7-cbcb4a60898b/timeseries?";
        $url .= "&format=json";
        $url .= "&producer=road";
        $url .= "&fmisid={$fmisid}";
        $url .= "&precision=double";
        $url .= "&param=name,time,wg,ws,wd,rr1h,t2m";
        $url .= "&missingtext=null";
        $url .= "&maxlocations=1";

        if($timestamp == "now") {
            $url .= "&starttime=-18h";
        } else {
            date_default_timezone_set("UTC");
            $time = strtotime($timestamp);
            $starttime = date('Y-m-d\TH:i:s\Z',$time - 18*3600);
            $url .= "&starttime=${starttime}&endtime=${timestamp}";
        }
        $data = file_get_contents($url) or die('Unable to get data');
        $data = json_decode($data, true);

        /* add datatype, station and epoch time information to each observation */
        $observationData = [];
        foreach ( $data as $key => $observation ) {

            $tmp = $observation;
            $tmp["datatype"] = "observation";
            $tmp["station"] = "road";
            $date = new DateTime($observation["time"]);
            $tmp["epoch"] = 1000*intVal($date->format('U'));
            array_push($observationData,$tmp); 

        }
        return $observationData;
    }

    /**
    *
    * Get synop observation data from timeseries
    * @param    station fmisid 
    * @return   data as an array
    *
    */

    public function synopObservation($fmisid,$timestamp) {
        
        $url = "";
        $url .= "http://data.fmi.fi/fmi-apikey/f01a92b7-c23a-47b0-95d7-cbcb4a60898b/timeseries?";
        $url .= "&format=json";
        $url .= "&producer=fmi";
        $url .= "&fmisid={$fmisid}";
        $url .= "&precision=double";
        $url .= "&param=name,time,ws_10min,wg_10min,wd_10min,t2m,n_man,rr1h";
        $url .= "&missingtext=null";
        $url .= "&maxlocations=1";

        if($timestamp === "now") {
            $url .= "&starttime=-18h";
        } else {
            date_default_timezone_set("UTC");
            $time = strtotime($timestamp);
            $starttime = date('Y-m-d\TH:i:s\Z',$time - 18*3600);
            $url .= "&starttime=${starttime}&endtime=${timestamp}";
        }

        $data = file_get_contents($url) or die('Unable to get data');
        $data = json_decode($data, true);

        /* add datatype, station and epoch time information to each observation */
        /* parameter names must also be changed */
        $observationData = [];
        foreach ( $data as $key => $observation ) {

            $tmp = $observation;
            $tmp["datatype"] = "observation";
            $tmp["station"] = "synop";
            $tmp["ws"] = $observation['ws_10min'];
            $tmp["wg"] = $observation['wg_10min'];
            $tmp["wd"] = $observation['wd_10min'];
            unset($tmp["ws_10min"]);
            unset($tmp["wg_10min"]);
            unset($tmp["wd_10min"]);
            $date = new DateTime($observation["time"]);
            $tmp["epoch"] = 1000*intVal($date->format('U'));
            array_push($observationData,$tmp); 

        }
        return $observationData;
    }

    /**
    *
    * Combine array datasets as one array
    * @return   data as json string
    *
    */

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
