/*
* Tuulikartta.info color scales
* Copyright (C) 2017 Ville Oravilkka
*
* Resolves observation parameter values (wind speed, temperature,
* precipitation, etc.) to display colors and, for wawa codes, translated text.
*/

var saa = saa || {};

(function (Tuulikartta, undefined) {
  'use strict'

  Tuulikartta.hexToRgbA = function (hex, opacity) {
    var c;
    if (/^#([A-Fa-f0-9]{3}){1,2}$/.test(hex)) {
      c = hex.substring(1).split('');
      if (c.length == 3) {
        c = [c[0], c[0], c[1], c[1], c[2], c[2]];
      }
      c = '0x' + c.join('');
      return 'rgba(' + [(c >> 16) & 255, (c >> 8) & 255, c & 255].join(',') + ',' + opacity + ')';
    }
  }

  Tuulikartta.resolveWindSpeed = function (windspeed) {
    windspeed = parseFloat(windspeed)
    if (windspeed < 1) { return { code: 'calm', hex: '#ffffff' } }
    else if (windspeed >= 1 && windspeed < 2) { return { code: 'light', hex: '#e6f7ff' } }
    else if (windspeed >= 2 && windspeed < 7) { return { code: 'moderate', hex: '#ccffcc' } }
    else if (windspeed >= 7 && windspeed < 14) { return { code: 'brisk', hex: '#ffff99' } }
    else if (windspeed >= 14 && windspeed < 21) { return { code: 'hard', hex: '#ffcc00' } }
    else if (windspeed >= 21 && windspeed < 25) { return { code: 'storm', hex: '#ff3300' } }
    else if (windspeed >= 25 && windspeed < 28) { return { code: 'severestorm', hex: '#ff0066' } }
    else if (windspeed >= 28 && windspeed < 32) { return { code: 'extremestorm', hex: '#cc0099' } }
    else if (windspeed >= 32) { return { code: 'hurricane', hex: '#6600cc' } }
    else { return 'calm' }
  }

  Tuulikartta.darkenHexColor = function (hex, factor) {
    var color = hex.replace('#', '')
    var darkenFactor = typeof factor === 'number' ? factor : 0.75

    if (color.length === 3) {
      color = color.split('').map(function (channel) {
        return channel + channel
      }).join('')
    }

    var red = Math.max(0, Math.min(255, Math.round(parseInt(color.substring(0, 2), 16) * darkenFactor)))
    var green = Math.max(0, Math.min(255, Math.round(parseInt(color.substring(2, 4), 16) * darkenFactor)))
    var blue = Math.max(0, Math.min(255, Math.round(parseInt(color.substring(4, 6), 16) * darkenFactor)))

    return '#' + [red, green, blue].map(function (channel) {
      return channel.toString(16).padStart(2, '0')
    }).join('')
  }

  Tuulikartta.buildVelocityColorScale = function () {
    var colorScale = []
    var minSpeed = 0
    var maxSpeed = 32
    var step = 0.5

    for (var speed = minSpeed; speed <= maxSpeed; speed += step) {
      colorScale.push(Tuulikartta.darkenHexColor(Tuulikartta.resolveWindSpeed(speed).hex, 0.55))
    }

    return colorScale
  }

  Tuulikartta.resolvePrecipitationAmount = function (rr_1h) {
    if (rr_1h > 0 && rr_1h <= 0.1) return "#fff7fb";
    if (rr_1h > 0.1 && rr_1h <= 0.2) return "#ece7f2";
    if (rr_1h > 0.2 && rr_1h <= 0.3) return "#d0d1e6";
    if (rr_1h > 0.3 && rr_1h <= 0.4) return "#a6bddb";
    if (rr_1h > 0.4 && rr_1h <= 0.5) return "#74a9cf";
    if (rr_1h > 0.5 && rr_1h <= 1.0) return "#3690c0";
    if (rr_1h > 1.0 && rr_1h <= 1.5) return "#0570b0";
    if (rr_1h > 1.5 && rr_1h <= 2.0) return "#045a8d";
    if (rr_1h > 2.0 && rr_1h <= 3.0) return "#4575b4";
    if (rr_1h > 3.0 && rr_1h <= 4.0) return "#91bfdb";
    if (rr_1h > 4.0 && rr_1h <= 5.0) return "#e0f3f8";
    if (rr_1h > 5.0 && rr_1h <= 10.0) return "#ffffbf";
    if (rr_1h > 10.0 && rr_1h <= 20.0) return "#fee090";
    if (rr_1h > 20.0 && rr_1h <= 30.0) return "#fc8d59";
    if (rr_1h > 30.0) return "#d73027";
  }

  Tuulikartta.resolveSnowDepth = function (snow) {
    if (snow > 0 && snow <= 10) return "#bfe6ff";
    if (snow > 10 && snow <= 20) return "#8dcdff";
    if (snow > 20 && snow <= 40) return "#3c9dde";
    if (snow > 40 && snow <= 60) return "#3972bf";
    if (snow > 60 && snow <= 80) return "#6185c0";
    if (snow > 80 && snow <= 100) return "#8898c2";
    if (snow > 100 && snow <= 125) return "#8e6bb0";
    if (snow > 125 && snow <= 150) return "#863e97";
    if (snow > 150 && snow <= 175) return "#7e117e";
    if (snow > 175 && snow <= 200) return "#5b106f";
    if (snow > 200) return "#ebdaf0";
  }

  Tuulikartta.resolveRelativeHumidity = function (rh) {
    if (rh >= 0 && rh < 50) return "#f7fbff";
    if (rh >= 50 && rh < 60) return "#deebf7";
    if (rh >= 60 && rh < 65) return "#c6dbef";
    if (rh >= 65 && rh < 70) return "#9ecae1";
    if (rh >= 70 && rh < 75) return "#6baed6";
    if (rh >= 75 && rh < 80) return "#4292c6";
    if (rh >= 80 && rh < 85) return "#2171b5";
    if (rh >= 85 && rh < 90) return "#08519c";
    if (rh >= 90) return "#08306b";
    //https://colorbrewer2.org/#type=sequential&scheme=GnBu&n=6
  }

  Tuulikartta.resolvePressure = function (p) {
    if (p < 980) return "#9e0142";
    if (p >= 985 && p < 990) return "#d53e4f";
    if (p >= 990 && p < 995) return "#f46d43";
    if (p >= 995 && p < 1000) return "#fdae61";
    if (p >= 1000 && p < 1005) return "#fee08b";
    if (p >= 1005 && p < 1010) return "#ffffbf";
    if (p >= 1010 && p < 1015) return "#e6f598";
    if (p >= 1015 && p < 1020) return "#abdda4";
    if (p >= 1020 && p < 1025) return "#66c2a5";
    if (p >= 1025 && p < 1030) return "#3288bd";
    if (p > 1030) return "#5e4fa2";
  }

  // Present weather (wawa) codes, WMO code table 4680. Long descriptions follow
  // the SYNOP column of Vaisala "SYNOP, METAR, and NWS codes for present weather":
  // https://docs.vaisala.com/r/M212222EN-J/en-US/GUID-A55D1079-C391-4865-B7A6-6E82F631EDFB
  var WAWA_STYLES = {
    clear: { class: 'textLabelclassGrey', hex: '#ffffff' },
    obscuration: { class: 'textLabelclassBlackBackgroundWhite', hex: '#ffffff' },
    precipitation: { class: 'textLabelclassBlackBackgroundWhite', hex: '#00b430' },
    rain: { class: 'textLabelclassBlackBackgroundGreen', hex: '#00b430' },
    drizzle: { class: 'textLabelclassBlackBackgroundYellow', hex: '#ffffb3' },
    freezing: { class: 'textLabelclassBlackBackgroundPurple', hex: '#ff80df' },
    sleet: { class: 'textLabelclassBlackBackgroundOrange', hex: '#ffbf80' },
    snow: { class: 'textLabelclassBlackBackgroundBlue', hex: '#9cc3fc' },
    rainShowers: { class: 'textLabelclassBlackBackgroundGreen', hex: '#6dff94' },
    snowShowers: { class: 'textLabelclassBlackBackgroundBlue', hex: '#3d8bff' },
    hail: { class: 'textLabelclassBlackBackgroundYellow', hex: '#ffffb3' }
  }

  var WAWA_CODES = {
    0: { style: 'clear', en: ['FairWeather', 'Clear'], fi: ['Poutaa', 'Selkeää'] },
    4: { style: 'obscuration', en: ['Haze', 'Haze or smoke, or dust in suspension in the air, visibility ≥ 1 km'], fi: ['Auer', 'Auerta, savua tai pölyä ilmassa, näkyvyys ≥ 1 km'] },
    5: { style: 'obscuration', en: ['Haze', 'Haze or smoke, or dust in suspension in the air, visibility < 1 km'], fi: ['Auer', 'Auerta, savua tai pölyä ilmassa, näkyvyys < 1 km'] },
    10: { style: 'obscuration', en: ['Mist', 'Mist'], fi: ['Utu', 'Utua'] },
    20: { style: 'obscuration', en: ['Fog', 'Fog'], fi: ['Sumu', 'Sumua'] },
    21: { style: 'rain', en: ['Rain', 'Precipitation, rain or snow during preceding hour'], fi: ['Sade', 'Sadetta (vettä tai lunta) edellisen tunnin aikana'] },
    22: { style: 'drizzle', en: ['Drizzle', 'Drizzle (not freezing) or snow grains'], fi: ['Tihku', 'Tihkua (ei jäätävää) tai lumijyväsiä'] },
    23: { style: 'rain', en: ['Rain', 'Rain (not freezing)'], fi: ['Vesisade', 'Vesisadetta (ei jäätävää)'] },
    24: { style: 'snow', en: ['Snow', 'Snow'], fi: ['Lumisade', 'Lumisadetta'] },
    25: { style: 'freezing', en: ['FreezingRain', 'Freezing rain or freezing drizzle'], fi: ['Jäätsade', 'Jäätävää sadetta tai jäätävää tihkua'] },
    30: { style: 'obscuration', en: ['Fog', 'Fog or ice fog'], fi: ['Sumu', 'Sumua tai jääsumua'] },
    31: { style: 'obscuration', en: ['Fog', 'Fog or ice fog, in patches'], fi: ['Sumu', 'Sumua tai jääsumua, paikoin'] },
    32: { style: 'obscuration', en: ['Fog', 'Fog or ice fog, has become thinner during past hour'], fi: ['Sumu', 'Sumua tai jääsumua, ohentunut edellisen tunnin aikana'] },
    33: { style: 'obscuration', en: ['Fog', 'Fog or ice fog, no appreciable change during past hour'], fi: ['Sumu', 'Sumua tai jääsumua, ei merkittävää muutosta edellisen tunnin aikana'] },
    34: { style: 'obscuration', en: ['Fog', 'Fog or ice fog, has begun or become thicker during past hour'], fi: ['Sumu', 'Sumua tai jääsumua, alkanut tai sakeutunut edellisen tunnin aikana'] },
    35: { style: 'obscuration', en: ['Fog', 'Fog, depositing rime (freezing fog)'], fi: ['Sumu', 'Kuuraa muodostavaa sumua (jäätävä sumu)'] },
    40: { style: 'precipitation', en: ['Precipitation', 'Precipitation'], fi: ['Sade', 'Sadetta'] },
    41: { style: 'precipitation', en: ['Precipitation', 'Precipitation, slight or moderate'], fi: ['Sade', 'Heikkoa tai kohtalaista sadetta'] },
    42: { style: 'precipitation', en: ['Precipitation', 'Precipitation, heavy'], fi: ['Sade', 'Voimakasta sadetta'] },
    50: { style: 'drizzle', en: ['Drizzle', 'Drizzle'], fi: ['Tihku', 'Tihkua'] },
    51: { style: 'drizzle', en: ['Drizzle', 'Drizzle, not freezing, slight'], fi: ['Tihku', 'Heikkoa tihkua, ei jäätävää'] },
    52: { style: 'drizzle', en: ['Drizzle', 'Drizzle, not freezing, moderate'], fi: ['Tihku', 'Kohtalaista tihkua, ei jäätävää'] },
    53: { style: 'drizzle', en: ['Drizzle', 'Drizzle, not freezing, heavy'], fi: ['Tihku', 'Voimakasta tihkua, ei jäätävää'] },
    54: { style: 'freezing', en: ['FreezingDrizzle', 'Drizzle, freezing, slight'], fi: ['Jäättihku', 'Heikkoa jäätävää tihkua'] },
    55: { style: 'freezing', en: ['FreezingDrizzle', 'Drizzle, freezing, moderate'], fi: ['Jäättihku', 'Kohtalaista jäätävää tihkua'] },
    56: { style: 'freezing', en: ['FreezingDrizzle', 'Drizzle, freezing, heavy'], fi: ['Jäättihku', 'Voimakasta jäätävää tihkua'] },
    57: { style: 'rain', en: ['Rain', 'Drizzle and rain, slight'], fi: ['Vesisade', 'Heikkoa tihkua ja vesisadetta'] },
    58: { style: 'rain', en: ['Rain', 'Drizzle and rain, moderate or heavy'], fi: ['Vesisade', 'Kohtalaista tai voimakasta tihkua ja vesisadetta'] },
    60: { style: 'rain', en: ['Rain', 'Rain'], fi: ['Vesisade', 'Vesisadetta'] },
    61: { style: 'rain', en: ['Rain', 'Rain, slight'], fi: ['Vesisade', 'Heikkoa vesisadetta'] },
    62: { style: 'rain', en: ['Rain', 'Rain, moderate'], fi: ['Vesisade', 'Kohtalaista vesisadetta'] },
    63: { style: 'rain', en: ['Rain', 'Rain, heavy'], fi: ['Vesisade', 'Voimakasta vesisadetta'] },
    64: { style: 'freezing', en: ['FreezingRain', 'Rain, freezing, slight'], fi: ['Jäätsade', 'Heikkoa jäätävää vesisadetta'] },
    65: { style: 'freezing', en: ['FreezingRain', 'Rain, freezing, moderate'], fi: ['Jäätsade', 'Kohtalaista jäätävää vesisadetta'] },
    66: { style: 'freezing', en: ['FreezingRain', 'Rain, freezing, heavy'], fi: ['Jäätsade', 'Voimakasta jäätävää vesisadetta'] },
    67: { style: 'sleet', en: ['Sleet', 'Rain (or drizzle) and snow, slight'], fi: ['Räntä', 'Heikkoa räntää (vettä tai tihkua ja lunta)'] },
    68: { style: 'sleet', en: ['Sleet', 'Rain (or drizzle) and snow, moderate or heavy'], fi: ['Räntä', 'Kohtalaista tai voimakasta räntää (vettä tai tihkua ja lunta)'] },
    70: { style: 'snow', en: ['Snow', 'Snow'], fi: ['Lumisade', 'Lumisadetta'] },
    71: { style: 'snow', en: ['Snow', 'Snow, slight'], fi: ['Lumisade', 'Heikkoa lumisadetta'] },
    72: { style: 'snow', en: ['Snow', 'Snow, moderate'], fi: ['Lumisade', 'Kohtalaista lumisadetta'] },
    73: { style: 'snow', en: ['Snow', 'Snow, heavy'], fi: ['Lumisade', 'Voimakasta lumisadetta'] },
    74: { style: 'snow', en: ['IcePellets', 'Ice pellets, slight'], fi: ['Jääjyväset', 'Heikkoa jääjyvässadetta'] },
    75: { style: 'snow', en: ['IcePellets', 'Ice pellets, moderate'], fi: ['Jääjyväset', 'Kohtalaista jääjyvässadetta'] },
    76: { style: 'snow', en: ['IcePellets', 'Ice pellets, heavy'], fi: ['Jääjyväset', 'Voimakasta jääjyvässadetta'] },
    77: { style: 'snow', en: ['SnowGrains', 'Snow grains'], fi: ['Lumijyväset', 'Lumijyväsiä'] },
    78: { style: 'snow', en: ['IceCrystals', 'Ice crystals'], fi: ['Jääkiteet', 'Jääkiteitä'] },
    80: { style: 'rainShowers', en: ['Showers', 'Intermittent precipitation'], fi: ['Sadekuuroja', 'Ajoittaista sadetta'] },
    81: { style: 'rainShowers', en: ['RainShowers', 'Intermittent rain, slight'], fi: ['Vesikuuroja', 'Ajoittaista heikkoa vesisadetta'] },
    82: { style: 'rainShowers', en: ['RainShowers', 'Intermittent rain, moderate'], fi: ['Vesikuuroja', 'Ajoittaista kohtalaista vesisadetta'] },
    83: { style: 'rainShowers', en: ['RainShowers', 'Intermittent rain, heavy'], fi: ['Vesikuuroja', 'Ajoittaista voimakasta vesisadetta'] },
    84: { style: 'snowShowers', en: ['SnowShowers', 'Intermittent snow, slight'], fi: ['Lumikuuroja', 'Ajoittaista heikkoa lumisadetta'] },
    85: { style: 'snowShowers', en: ['SnowShowers', 'Intermittent snow, moderate'], fi: ['Lumikuuroja', 'Ajoittaista kohtalaista lumisadetta'] },
    86: { style: 'snowShowers', en: ['SnowShowers', 'Intermittent snow, heavy'], fi: ['Lumikuuroja', 'Ajoittaista voimakasta lumisadetta'] },
    87: { style: 'snowShowers', en: ['SnowShowers', 'Intermittent snow'], fi: ['Lumikuuroja', 'Ajoittaista lumisadetta'] },
    88: { style: 'snowShowers', en: ['SnowPellets', 'Snow pellets'], fi: ['Lumirakeet', 'Lumirakeita'] },
    89: { style: 'hail', en: ['Hail', 'Hail'], fi: ['Raesadetta', 'Raesadetta'] }
  }

  Tuulikartta.resolveWawaCode = function (wawa) {
    var entry = WAWA_CODES[parseInt(wawa)]
    if (!entry) return null
    var text = selectedLanguage === 'en' ? entry.en : entry.fi
    var style = WAWA_STYLES[entry.style]
    return { short: text[0], long: text[1], class: style.class, hex: style.hex }
  }

  Tuulikartta.resolveTemperature = function (temperature) {
    temperature = parseFloat(temperature)
    if (temperature < -30) return '#8a79f7'
    if (temperature >= -30 && temperature < -28) return '#8a79f7'
    if (temperature >= -28 && temperature < -26) return '#6e70e7'
    if (temperature >= -26 && temperature < -24) return '#5268d8'
    if (temperature >= -24 && temperature < -22) return '#3760c9'
    if (temperature >= -22 && temperature < -20) return '#1b58ba'
    if (temperature >= -20 && temperature < -18) return '#0050ab'
    if (temperature >= -18 && temperature < -16) return '#196bbe'
    if (temperature >= -16 && temperature < -14) return '#3286d1'
    if (temperature >= -14 && temperature < -12) return '#4ba1e4'
    if (temperature >= -12 && temperature < -10) return '#65dbf7'
    if (temperature >= -10 && temperature < -8) return '#77c8f8'
    if (temperature >= -8 && temperature < -6) return '#8ad3f9'
    if (temperature >= -6 && temperature < -4) return '#9cdefb'
    if (temperature >= -4 && temperature < -2) return '#afe9fc'
    if (temperature >= -2 && temperature < -1) return '#c1f4fd'
    if (temperature >= -1 && temperature < 0) return '#d4ffff'
    if (temperature >= 0 && temperature < 1) return '#05b38a'
    if (temperature >= 1 && temperature < 2) return '#02d495'
    if (temperature >= 2 && temperature < 4) return '#8aedbb'
    if (temperature >= 4 && temperature < 6) return '#ccffd0'
    if (temperature >= 6 && temperature < 8) return '#ebfccf'
    if (temperature >= 8 && temperature < 10) return '#ebff7a'
    if (temperature >= 10 && temperature < 12) return '#ffea80'
    if (temperature >= 12 && temperature < 14) return '#f7d423'
    if (temperature >= 14 && temperature < 16) return '#f5b400'
    if (temperature >= 16 && temperature < 18) return '#f29500'
    if (temperature >= 18 && temperature < 20) return '#f07400'
    if (temperature >= 20 && temperature < 22) return '#ff5324'
    if (temperature >= 22 && temperature < 24) return '#f71707'
    if (temperature >= 24 && temperature < 26) return '#db0a07'
    if (temperature >= 26 && temperature < 28) return '#bd0404'
    if (temperature >= 28 && temperature < 30) return '#9e0101'
    if (temperature >= 30) return '#eb0052'
    return '#8aedbb'
  }

  Tuulikartta.resolveDewpointDiff = function (dewpoint) {
    dewpoint = parseFloat(dewpoint)
    if (dewpoint < -4) return '#053061'
    if (dewpoint >= -4 && dewpoint < -2) return '#2166ac'
    if (dewpoint >= -2 && dewpoint < -1) return '#4393c3'
    if (dewpoint >= -1 && dewpoint < -0.5) return '#92c5de'
    if (dewpoint >= -0.5 && dewpoint < 0) return '#d1e5f0'
    if (dewpoint >= 0 && dewpoint < 1) return '#f7f7f7'
    if (dewpoint >= 1 && dewpoint < 2) return '#fddbc7'
    if (dewpoint >= 2 && dewpoint < 4) return '#f4a582'
    if (dewpoint >= 4 && dewpoint < 8) return '#d6604d'
    if (dewpoint >= 8) return '#b2182b'
    return '#f7f7f7'
  }

  Tuulikartta.resolveWindDirection = function (winddirection) {
    var winddir = parseFloat(winddirection)
    return (winddir + 180) % 360
  }

  // wind barbs are drawn with the shaft pointing towards the direction the
  // wind blows FROM, so no 180 degree flip is needed as with the arrow icons
  Tuulikartta.resolveWindBarbRotation = function (winddirection) {
    return parseFloat(winddirection) % 360
  }

}(saa.Tuulikartta = saa.Tuulikartta || {}))
