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
        $url .= "&keyword=tiesääasemat";
        $url .= "&precision=double";
        $url .= "&param=name%20as%20station,fmisid,utctime%20as%20time,lat,lon,visibility,vsaa%20as%20wawa,temperature,wg%20as%20wg_10min,ws%20as%20ws_10min,wd%20as%20wd_10min,pri%20as%20ri_10min,sum_t(pri:60m:60m)%20as%20ri_1h";
        $url .= "&missingtext=nan";
        $url .= "&maxlocations=1";

        if($timestamp == "now") {
            $url .= "&endtime=now";
        } else {
            $url .= "&starttime={$timestamp}&endtime={$timestamp}&timestep=10";
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
        $url .= "&param=name%20as%20station,fmisid,utctime%20as%20time,lat,lon,visibility,wawa,temperature,wg_10min,ws_10min,wd_10min,ri_10min,sum_t(ri_10min:1h:0)%20as%20ri_1h";
        $url .= "&missingvtext=nan";
        $url .= "&maxlocations=1";

        if($timestamp == "now") {
            $url .= "&endtime=now";
        } else {
            $url .= "&starttime=${timestamp}&endtime=${timestamp}&timestep=10";
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

            $tmp["type"] = "synop";

            $date = new DateTime($observation["time"]);
            $tmp["epoctime"] = intVal($date->format('U'));
            array_push($observationData,$tmp);

        }

        return $observationData;
    }

    /**
    *
    * Get road observation data from timeseries
    * @param    station fmisid 
    * @return   data as an array
    *
    */

    public function roadObservation($fmisid) {
        
        $url = "";
        $url .= "http://data.fmi.fi/fmi-apikey/f01a92b7-c23a-47b0-95d7-cbcb4a60898b/timeseries?";
        $url .= "&format=json";
        $url .= "&producer=road";
        $url .= "&fmisid={$fmisid}";
        $url .= "&precision=double";
        $url .= "&param=name,time,wg,ws,wd";
        $url .= "&missingtext=-";
        $url .= "&starttime=-12h";
        $url .= "&maxlocations=1";
        
        $data = file_get_contents($url) or die('Unable to get data from {$url}');
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

    public function synopObservation($fmisid) {
        
        $url = "";
        $url .= "http://data.fmi.fi/fmi-apikey/f01a92b7-c23a-47b0-95d7-cbcb4a60898b/timeseries?";
        $url .= "&format=json";
        $url .= "&producer=fmi";
        $url .= "&fmisid={$fmisid}";
        $url .= "&precision=double";
        $url .= "&param=name,time,ws_10min,wg_10min,wd_10min";
        $url .= "&missingtext=-";
        $url .= "&starttime=-12h";
        $url .= "&maxlocations=1";

        $data = file_get_contents($url) or die('Unable to get data from {$url}');
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
    * Get Harmonie forecast data from timeseries
    * @param    lat,lon coordinates 
    * @return   data as an array
    *
    */

    public function HarmonieForecast($latlon) {

        $date = new DateTime();
        $starttime = ($date->format('Y-m-d\TH:i:m'));
        $endtime = $date->add(new DateInterval('PT12H'));
        $endtime = ($endtime->format('Y-m-d\TH:i:m'));

        $url = "";
        $url .= "http://data.fmi.fi/fmi-apikey/f01a92b7-c23a-47b0-95d7-cbcb4a60898b/timeseries?";
        $url .= "&format=json";
        $url .= "&producer=harmonie_skandinavia_pinta";
        $url .= "&latlon={$latlon}";
        $url .= "&precision=double";
        $url .= "&param=name,time,windspeedms,winddirection,windgust";
        $url .= "&missingtext=-";
        $url .= "&timestep=10";
        $url .= "&starttime={$starttime}";
        $url .= "&endtime={$endtime}";
        $url .= "&maxlocations=1";

        $data = file_get_contents($url) or die("Unable to get data from {$url}");
        $data = json_decode($data, true);

        /* add datatype, station and epoch time information to each observation */
        /* parameter names must also be changed */
        $forecastData = [];
        foreach ( $data as $key => $forecast ) {

            $tmp = $forecast;
            $tmp["datatype"] = "forecast";
            $tmp["ws"] = $forecast['windspeedms'];
            $tmp["wg"] = $forecast['windgust'];
            $tmp["wd"] = $forecast['winddirection'];
            unset($tmp["windspeedms"]);
            unset($tmp["windgust"]);
            unset($tmp["winddirection"]);
            $date = new DateTime($forecast["time"]);
            $tmp["epoch"] = 1000*intVal($date->format('U'));
            array_push($forecastData,$tmp);

        }
        return $forecastData;
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