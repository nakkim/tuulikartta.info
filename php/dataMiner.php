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

    public function roaddata() {
        $settings = array();
        $settings['parameter']      = 'windspeedms,winddirection,WG,PRI';
        $settings['timestep']       = '10';
        $settings['apikey']         = 'd6985c41-bfc2-4afa-95a7-72cd2acb604c';
        $settings['storedQueryId']  = 'livi::observations::road::default::timevaluepair';
        $settings['bbox']           = '17.91,58.71,32.61,70.59';

        $timeOffset = $this->getTimezoneDifference();
        
        $starttime = date("Y-m-d\TH:i:s", time()-$timeOffset*60*60-14*60);
        $endtime = date("Y-m-d\TH:i:s", time()-$timeOffset*60*60-4*60);

        $url = "http://data.fmi.fi/fmi-apikey/{$settings['apikey']}/wfs?request=getFeature&storedquery_id={$settings['storedQueryId']}&timestep={$settings['timestep']}&parameters={$settings['parameter']}&endtime={$endtime}&starttime={$starttime}&bbox={$settings['bbox']},epsg::4326&";        
        
        $xmlData = file_get_contents($url);
        $resultString = simplexml_load_string($xmlData);

        $valuesArray = array();
        $dataArray = array();
        $x = 0;
        if(!$resultString){
            print "Something went wrong, no data to return";
        } else {
            $data = $resultString->children('wfs', true);

            $params = explode(',', $settings['parameter']);

            foreach($data->member as $key => $parameterValue){
                $dataValues = $parameterValue ->children('omso', true)->PointTimeSeriesObservation->children('om', true)->result->children('wml2', true)->MeasurementTimeseries;
                foreach($dataValues->point as $key => $datavalue){

                    $time = (string)$datavalue->MeasurementTVP->time;
                    $epoctime = strtotime($time);
                    $value = (string)$datavalue->MeasurementTVP->value;
                    $valuesArray["fmisid"] = (string)$parameterValue       -> children('omso', true)  ->
                                            PointTimeSeriesObservation     -> children('om', true)    ->
                                            featureOfInterest              -> children('sams', true)  ->
                                            SF_SpatialSamplingFeature      -> children('sam', true)   ->
                                            sampledFeature                 -> children('target', true)->
                                                                            children('target', true)->
                                                                            children('target', true)->
                                                                            children('gml', true)   ->identifier;

                    $valuesArray["station"] = (string)$parameterValue  -> children('omso', true) ->
                                            PointTimeSeriesObservation -> children('om', true)   ->
                                            featureOfInterest          -> children('sams', true) ->
                                            SF_SpatialSamplingFeature  -> children('sams', true) -> 
                                            shape                      -> children('gml', true)  ->
                                            Point                      -> children('gml', true)  -> name;

                    $latlon = (string)$parameterValue->children('omso', true)->PointTimeSeriesObservation->children('om', true)->featureOfInterest->children('sams', true)->SF_SpatialSamplingFeature->children('sams', true)->shape->children('gml', true)->Point->children('gml', true)->pos;
                    $latlont = explode(' ',$latlon);

                    $valuesArray["lat"] = $latlont[0];
                    $valuesArray["lon"] = $latlont[1];

                    $valuesArray["time"] = $time;
                    $valuesArray["epoctime"] = $epoctime;
                    $valuesArray["type"] = 'road';

                    if($x>=count($params)-1){
                        $valuesArray[$params[$x]] = $value;
                        array_push($dataArray,$valuesArray);
                        $x = 0;
                    } else {
                        $valuesArray[$params[$x]] = $value;
                        $x++;
                    }
                }
            }
        }
        return $dataArray;
    }



    /**
    *
    * Get latest synop observations 
    * @return   data as php array
    *
    */

    public function synopdata() {
        $settings = array();
        $settings['parameter']      = 'ws_10min,wg_10min,wd_10min,r_1h,ri_10min';
        $settings['timestep']       = '10';
        $settings['apikey']         = 'd6985c41-bfc2-4afa-95a7-72cd2acb604c';
        $settings['storedQueryId']  = 'fmi::observations::weather::timevaluepair';
        $settings['bbox']           = '17.91,58.71,32.61,70.59';

        $starttime = date("Y-m-d\TH:i:s", time()-3*60*60-14*60);
        $endtime = date("Y-m-d\TH:i:s", time()-3*60*60-4*60);

        $url = "http://data.fmi.fi/fmi-apikey/{$settings['apikey']}/wfs?request=getFeature&storedquery_id={$settings['storedQueryId']}&timestep={$settings['timestep']}&parameters={$settings['parameter']}&endtime={$endtime}&starttime={$starttime}&bbox={$settings['bbox']},epsg::4326&";

        $xmlData = file_get_contents($url);
        $resultString = simplexml_load_string($xmlData);

        $valuesArray = array();
        $dataArray = array();
        $x = 0;
        if(!$resultString){
            print "Something went wrong, no data to return";
        } else {
            $data = $resultString->children('wfs', true);

            $params = explode(',', $settings['parameter']);

            foreach($data->member as $key => $parameterValue){
                $dataValues = $parameterValue ->children('omso', true)->PointTimeSeriesObservation->children('om', true)->result->children('wml2', true)->MeasurementTimeseries;
                foreach($dataValues->point as $key => $datavalue){

                    $time = (string)$datavalue->MeasurementTVP->time;
                    $epoctime = strtotime($time);
                    $value = (string)$datavalue->MeasurementTVP->value;
                    $valuesArray["fmisid"] = (string)$parameterValue       -> children('omso', true)  ->
                                            PointTimeSeriesObservation     -> children('om', true)    ->
                                            featureOfInterest              -> children('sams', true)  ->
                                            SF_SpatialSamplingFeature      -> children('sam', true)   ->
                                            sampledFeature                 -> children('target', true)->
                                                                            children('target', true)->
                                                                            children('target', true)->
                                                                            children('gml', true)   ->identifier;

                    $valuesArray["station"] = (string)$parameterValue   -> children('omso', true) ->
                                            PointTimeSeriesObservation -> children('om', true)   ->
                                            featureOfInterest          -> children('sams', true) ->
                                            SF_SpatialSamplingFeature  -> children('sams', true) ->
                                            shape                      -> children('gml', true)  ->
                                            Point                      -> children('gml', true)  -> name;

                    $latlon = (string)$parameterValue->children('omso', true)->PointTimeSeriesObservation->children('om', true)->featureOfInterest->children('sams', true)->SF_SpatialSamplingFeature->children('sams', true)->shape->children('gml', true)->Point->children('gml', true)->pos;
                    $latlont = explode(' ',$latlon);

                    $valuesArray["lat"] = $latlont[0];
                    $valuesArray["lon"] = $latlont[1];
                    $valuesArray["type"] = "synop";
                    $valuesArray["time"] = $time;
                    $valuesArray["epoctime"] = $epoctime;

                    if($x>=count($params)-1){
                        $valuesArray[$params[$x]] = $value;
                        array_push($dataArray,$valuesArray);
                        $x = 0;
                    } else {
                        $valuesArray[$params[$x]] = $value;
                        $x++;
                    }
                }
            }
        }
        return $dataArray;
    }



    /**
    *
    * Get Harmonie forecast data from timeseries
    * @param    lat,lon coordinates 
    * @return   data as json string
    *
    */

    // public function HarmonieForecast($latlon) {

    //     $date = new DateTime();
    //     $starttime = ($date->format('Y-m-d\TH:i:m'));
        
    //     $url = "";
    //     $url .= "http://data.fmi.fi/fmi-apikey/f01a92b7-c23a-47b0-95d7-cbcb4a60898b/timeseries?";
    //     $url .= "&format=json";
    //     $url .= "&producer=harmonie_skandinavia_pinta";
    //     $url .= "&latlon={$latlon}";
    //     $url .= "&precision=double";
    //     $url .= "&param=name,epochtime,temperature,weathersymbol3,smartsymboltext,precipitation1h,dark";
    //     $url .= "&missingtext=-";
    //     $url .= "&timestep=60";
    //     $url .= "&starttime={$starttime}";
    //     $url .= "&endtimetime=6h";
    //     $url .= "&maxlocations=1";

    //     $data = file_get_contents($url) or die('Unable to get data from {$url}');
    //     $data = json_decode($data, true);
        
    //     return json_encode($data);
    // }



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