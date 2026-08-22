/*
* Tuulikartta.info observation table
* Copyright (C) 2017 Ville Oravilkka
*
* Builds the wind-parameter dropdown menu and the Tabulator table
* listing all current station observations.
*/

var saa = saa || {};

(function (Tuulikartta, undefined) {
  'use strict'

  Tuulikartta.buildObservationMenu = function () {
    $('#main-navbar-param').html("")
    var html = '<select id="select-wind-parameter" class="select-style" style="height:26px;">'
    html = html + '<optgroup label="' + translations[selectedLanguage]["currentObs"] + '">'
    html = html + '<option value="ws_10min">' + translations[selectedLanguage]["ws_10min"] + '</option>'
    html = html + '<option value="wg_10min">' + translations[selectedLanguage]["wg_10min"] + '</option>'
    html = html + '<option value="ri_10min">' + translations[selectedLanguage]["ri_10min"] + '</option>'
    html = html + '<option value="rr_1h">' + translations[selectedLanguage]["rr_1h"] + '</option>'
    html = html + '<option value="t2m">' + translations[selectedLanguage]["t2m"] + '</option>'
    html = html + '<option value="t2mdewpoint">' + translations[selectedLanguage]["t2mdewpoint"] + '</option>'
    html = html + '<option value="dewpoint">' + translations[selectedLanguage]["dewpoint"] + '</option>'
    html = html + '<option value="vis">' + translations[selectedLanguage]["vis"] + '</option>'
    html = html + '<option value="wawa">' + translations[selectedLanguage]["wawa"] + '</option>'
    html = html + '<option value="smartsymbol">' + translations[selectedLanguage]["smartsymbol"] + '</option>'
    html = html + '<option value="n_man">' + translations[selectedLanguage]["n_man"] + '</option>'
    html = html + '<option value="snow_aws">' + translations[selectedLanguage]["snow_aws"] + '</option>'
    html = html + '<option value="pressure">' + translations[selectedLanguage]["pressure"] + '</option>'
    html = html + '<option value="rh">' + translations[selectedLanguage]["rh"] + '</option>'
    html = html + '<optgroup label="' + translations[selectedLanguage]["dailyObs"] + '">'
    html = html + '<option value="ws_1d">' + translations[selectedLanguage]["ws_1d"] + '</option>'
    html = html + '<option value="wg_1d">' + translations[selectedLanguage]["wg_1d"] + '</option>'
    html = html + '<option value="rr_1d">' + translations[selectedLanguage]["rr_1d"] + '</option>'
    html = html + '<option value="tmax">' + translations[selectedLanguage]["tmax"] + '</option>'
    html = html + '<option value="tmin">' + translations[selectedLanguage]["tmin"] + '</option>'

    html = html + '</select>'
    $('#main-navbar-param').html(html)
  }

  Tuulikartta.populateObservationTable = function () {
    try {
      if (selectedLanguage === 'en')
        document.getElementById('observation-table-header').innerHTML = 'Weather observations'

      var columnConfigs = [
        {
          title: translations[selectedLanguage]['observationStation'],
          field: 'station',
          width: 200,
          widthShrink: 1
        },
        {
          title: translations[selectedLanguage]['observationTime'],
          field: 'time',
          hozAlign: "center",
          formatter: function (cell) {
            try {
              var code = cell.getValue()
              if (code !== null) {
                var date = moment(code);
                return date.format('DD.MM.YYYY HH:mm')
              }
              return null
            } catch (e) {
              console.error('Error formatting observationTime:', e)
              return null
            }
          }
        },
        {
          title: translations[selectedLanguage]['wd_10min'],
          field: 'wd_10min',
          hozAlign: "center",
          formatter: function (cell) {
            try {
              var value = cell.getValue();
              if (value !== null) {
                return `<img src="symbols/wind.svg" width="15" heigh="15" style="transform:rotate(${value}deg)"/> ${value}°`;
              }
              return value;
            } catch (e) {
              console.error('Error formatting wd_10min:', e)
              return null
            }
          }
        },
        {
          title: translations[selectedLanguage]['n_man'],
          field: 'n_man',
          hozAlign: "center",
          formatter: function (cell) {
            try {
              var value = cell.getValue();
              if (value !== null) {
                return `<img src="symbols/nn/${value}.svg" width="15" heigh="15";/>`;
              }
              return value;
            } catch (e) {
              console.error('Error formatting n_man:', e)
              return null
            }
          }
        }
      ];

      var windSpeedFields = ['ws_10min', 'wg_10min', 'ws_1d', 'wg_1d'];
      var temperatureFields = ['t2m', 'tmax', 'tmin', 'dewpoint'];
      var precipitationFields = ['ri_10min', 'rr_1h', 'rr_1d'];
      var otherNumericFields = {
        'vis': {
          resolver: null,
          validator: function (value) { return value !== null; },
          colorizer: function (value) {
            if (value > 1000 && value <= 2000) {
              return 'rgba(1,1,1,0.15)';
            } else if (value < 1000) {
              return 'rgba(224,7,0,0.4)';
            }
            return 'rgba(1,1,1,0)';
          },
          formatter: function (value) { return value; }
        },
        'wawa': {
          resolver: Tuulikartta.resolveWawaCode,
          validator: function (code) { return code !== null; },
          colorizer: function (code) {
            if (code.short === 'Utu' || code.short === 'Sumu' || code.short === 'Haze' || code.short === 'Fog') {
              return 'rgba(1,1,1,0.15)';
            }
            return Tuulikartta.hexToRgbA(code.hex, 0.4);
          },
          formatter: function (code) { return code.short; }
        },
        'rh': {
          resolver: null,
          validator: function (value) { return value !== null; },
          colorizer: function (value) { return Tuulikartta.hexToRgbA(Tuulikartta.resolveRelativeHumidity(value), 0.4); },
          formatter: function (value) { return (value).toFixed(1); }
        },
        'snow_aws': {
          resolver: null,
          validator: function (value) { return value !== null && value > -1; },
          colorizer: function (value) { return Tuulikartta.hexToRgbA(Tuulikartta.resolveSnowDepth(value), 0.4); },
          formatter: function (value) { return value; }
        },
        'pressure': {
          resolver: null,
          validator: function (value) { return value !== null; },
          colorizer: function (value) { return Tuulikartta.hexToRgbA(Tuulikartta.resolvePressure(value), 0.4); },
          formatter: function (value) { return (value).toFixed(1); }
        }
      };

      var createWindSpeedColumn = function (field) {
        return {
          title: translations[selectedLanguage][field],
          field: field,
          hozAlign: "center",
          formatter: function (cell) {
            try {
              var code = Tuulikartta.resolveWindSpeed(cell.getValue())
              if (code !== null) {
                cell.getElement().style.backgroundColor = Tuulikartta.hexToRgbA(code.hex, 0.7);
                return cell.getValue()
              }
              return null
            } catch (e) {
              console.error('Error formatting wind speed field ' + field + ':', e)
              return null
            }
          }
        };
      };

      var createTemperatureColumn = function (field) {
        return {
          title: translations[selectedLanguage][field],
          field: field,
          hozAlign: "center",
          formatter: function (cell) {
            try {
              var value = cell.getValue()
              if (value !== null) {
                if (field !== 't2m' && Math.abs(value) >= 100) {
                  cell.getElement().style.backgroundColor = 'rgba(1,1,1,0)'
                  return null
                }
                cell.getElement().style.backgroundColor = Tuulikartta.hexToRgbA(Tuulikartta.resolveTemperature(value), 0.4);
                return value
              }
              cell.getElement().style.backgroundColor = 'rgba(1,1,1,0)'
              return null
            } catch (e) {
              console.error('Error formatting temperature field ' + field + ':', e)
              return null
            }
          }
        };
      };

      var createPrecipitationColumn = function (field) {
        return {
          title: translations[selectedLanguage][field],
          field: field,
          hozAlign: "center",
          formatter: function (cell) {
            try {
              if (cell.getValue() !== null) {
                cell.getElement().style.backgroundColor = Tuulikartta.hexToRgbA(Tuulikartta.resolvePrecipitationAmount(cell.getValue()), 0.4);
                return cell.getValue()
              }
              cell.getElement().style.backgroundColor = 'rgba(1,1,1,0)'
              return null
            } catch (e) {
              console.error('Error formatting precipitation field ' + field + ':', e)
              return null
            }
          }
        };
      };

      var createSpecialColumn = function (field, config) {
        return {
          title: translations[selectedLanguage][field],
          field: field,
          hozAlign: "center",
          formatter: function (cell) {
            try {
              var value = cell.getValue()
              var resolvedValue = config.resolver ? config.resolver(value) : value

              if (config.validator(resolvedValue)) {
                cell.getElement().style.backgroundColor = config.colorizer(resolvedValue);
                return config.formatter(resolvedValue)
              }
              cell.getElement().style.backgroundColor = 'rgba(1,1,1,0)'
              return null
            } catch (e) {
              console.error('Error formatting special field ' + field + ':', e)
              return null
            }
          }
        };
      };

      columnConfigs = columnConfigs.concat(windSpeedFields.map(createWindSpeedColumn));
      columnConfigs = columnConfigs.concat(temperatureFields.map(createTemperatureColumn));
      columnConfigs = columnConfigs.concat(precipitationFields.map(createPrecipitationColumn));
      Object.keys(otherNumericFields).forEach(function (field) {
        columnConfigs.push(createSpecialColumn(field, otherNumericFields[field]));
      });

      var table = new Tabulator("#observation-table", {
        layout: "fitDataStretch",
        columns: columnConfigs
      });
      table.setData(saa.Tuulikartta.data)
    } catch (e) {
      console.error('Error in populateObservationTable:', e)
    }
  }

}(saa.Tuulikartta = saa.Tuulikartta || {}))
