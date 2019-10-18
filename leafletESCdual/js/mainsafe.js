$(document).ready(function() {
    var propgroup = L.layerGroup();
    var mapboxAccessToken = 'sk.eyJ1Ijoic2Rhc2hlciIsImEiOiJjazFqZmFnejQxNnVqM25zMGZseGFwdGo4In0.6LXSluy1n9ScFxU2ydBK_Q';
    var map = L.map('map', {
      center: [31.25, -100],
      zoom: 5.5,
      layers: [propgroup]
    });

    var tilelayer1 = L.tileLayer('https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token=' + mapboxAccessToken, {
      maxZoom: 18,
      attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, ' +
        '<a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, ' +
        'Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
      id: 'mapbox.light'
    }).addTo(map);
    //



    $.getJSON("/data/convertedregionsfinal.geojson")
      .done(function(data) {

        var info = processData(data);
        //console.log(info);
        var markers = createPropSymbols(info.timestamps, data);
        createLegend(info.min, info.max);
        createSliderUI(info.timestamps);

      })
      .fail(function() {
        alert("There has been a problem loading the data.")
      });


    function processData(data) {
      var timestamps = [];
      var min = Infinity;
      var max = -Infinity;

      for (var feature in data.features) {

        var properties = data.features[feature].properties;

        for (var attribute in properties) {

          if (attribute != 'regionname' &&
            attribute != 'totalenrolled' &&
            attribute != 'id') {
            if ($.inArray(attribute, timestamps) === -1) {
              timestamps.push(attribute);
            }
            if (properties[attribute] < min) {
              min = properties[attribute];
            }
            if (properties[attribute] > max) {
              max = properties[attribute];
            }

          }
        }
      }

      return {
        timestamps: timestamps,
        min: min,
        max: max
      }
    }




    function createPropSymbols(timestamps, data) {
      regions = L.geoJson(data, {

        pointToLayer: function(feature, coordinates) {
          //console.log(feature, coordinates);
          return L.circleMarker(coordinates, {
            fillColor: "#708598",
            color: "#537898",
            weight: 1,
            fillOpacity: 0.6
          }).on({

            mouseover: function(e) {
              this.openPopup();
              this.setStyle({
                color: 'yellow'
              });
            },
            mouseout: function(e) {
              this.closePopup();
              this.setStyle({
                color: '#537898'
              });

            }
          });
        }
      }).addTo(propgroup);

      updatePropSymbols(timestamps[0]);

    }

    function updatePropSymbols(timestamp) {

      regions.eachLayer(function(layer) {

        var props = layer.feature.properties;
        var radius = calcPropRadius(props[timestamp]);
        var percent = Math.round(props[timestamp] * 1000) / 10;
        var popupContent = "<b>" + "Region " + props.id + ": " + props.regionname +
          "</b><br>" + String(percent) + "%  qualified for Special Education in " +
          timestamp;

        layer.setRadius(radius);
        layer.bindPopup(popupContent, {
          offset: new L.Point(0, -radius)
        });
      });
    }

    function calcPropRadius(attributeValue) {
      var scaleFactor = 3000;
      var scaledValue = attributeValue - .06;
      var area = scaledValue * scaleFactor;
      return Math.sqrt(area / Math.PI) * 2;

    }

    function createLegend(min, max) {
      if (min < .01) {
        min = .01;
      }

      function roundNumber(inNumber) {
        return (Math.round(inNumber * 100) / 100);
        //return (Math.round(inNumber/10) * 10);
      }
      var legend = L.control({
        position: 'bottomright'
      });
      legend.onAdd = function(map) {
        var legendContainer = L.DomUtil.create("div", "legend");
        var symbolsContainer = L.DomUtil.create("div", "symbolsContainer");
        var classes = [.08, .12, .17];
        var legendCircle;
        var lastRadius = 0;
        var currentRadius;
        var margin;

        L.DomEvent.addListener(legendContainer, 'mousedown', function(e) {
          L.DomEvent.stopPropagation(e);
        });

        $(legendContainer).append("<h2 id='legendTitle'>% in special ed</h2>");

        for (var i = 0; i <= classes.length - 1; i++) {
          legendCircle = L.DomUtil.create("div", "legendCircle");
          currentRadius = calcPropRadius(classes[i]);
          margin = -currentRadius - lastRadius - 2;
          $(legendCircle).attr("style", "width: " + currentRadius * 2 +
            "px; height: " + currentRadius * 2 +
            "px; margin-left: " + margin + "px");
          $(legendCircle).append("<span class='legendValue'>" + Math.round(classes[i] * 1000) / 10 + "%</span>");
          $(symbolsContainer).append(legendCircle);
          lastRadius = currentRadius;
        }
        $(legendContainer).append(symbolsContainer);
        return legendContainer;
      };

      legend.addTo(map);


    } // end createLegend();

    function createSliderUI(timestamps) {

      var sliderControl = L.control({
        position: 'bottomleft'
      });

      sliderControl.onAdd = function(map) {
        var slider = L.DomUtil.create("input", "range-slider");

        L.DomEvent.addListener(slider, 'mouseover', function() {
          L.DomEvent.stopPropagation(ev);
          addEventListener(slider, 'mouseover', function () {
             map.dragging.disable();
          });
             addEventListener(slider, 'mouseout', function () {
                 map.dragging.enable();
               });
        });


;
        $(slider)
          .attr({
            'type': 'range',
            'min': timestamps[0],
            'max': timestamps[timestamps.length - 1],
            'step': 1,
            'value': String(timestamps[0])
          })

    .on('input change', function() {
      updatePropSymbols($(this).val().toString());
      $(".temporal-legend").text(this.value);
    });
    return slider;

  }

  sliderControl.addTo(map);
  // Disable dragging when user's cursor enters the element


   createTemporalLegend(timestamps[0]);




}

function createTemporalLegend(startTimestamp) {

  var temporalLegend = L.control({
    position: 'bottomleft'
  });

  temporalLegend.onAdd = function(map) {
    var output = L.DomUtil.create("output", "temporal-legend");

    $(output).text(startTimestamp)

    return output;
  }

  temporalLegend.addTo(map);
}
var boundarygroup = L.layerGroup();
L.geoJSON(boundaries, {
  style: style
}).addTo(boundarygroup);

function style(feature) {
  return {
    weight: 2,
    opacity: 1,
    color: 'purple',
    dashArray: '3',
  };
}
var overlayMaps = {
  "Show Circles": propgroup,
  "Show Boundaries": boundarygroup

};

L.control.layers(null, overlayMaps).addTo(map);

})
