function createMap() {
  //create the map
  var map = L.map('map', {
    center: [31.25, -100],
    zoom: 5.5,
    layer:tilegroup
  });

  //create layer group for imagery tiles
  var tilegroup = L.layerGroup();

  //create feature group for overlay



  var mapboxAccessToken = 'sk.eyJ1Ijoic2Rhc2hlciIsImEiOiJjazFqZmFnejQxNnVqM25zMGZseGFwdGo4In0.6LXSluy1n9ScFxU2ydBK_Q';
  var tilelayer = L.tileLayer('https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token=' + mapboxAccessToken, {
    maxZoom: 18,
    attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, ' +
      '<a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, ' +
      'Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
    id: 'mapbox.light'
  }).addTo(map);

  //add base maps to tile layer group
  var baseMaps = {
    "Base Map": tilegroup
  };
  var boundarygroup = L.featureGroup();
  L.geoJson(boundaries,{
        style: style,
    }).addTo(boundarygroup);
  var overlayMaps = {
    "Region Boundaries": boundarygroup
  };

  function style(feature){
  console.log(feature.properties.totalenrolled);
      return{
          weight: 1,
          opacity: .6,
          color: 'gray',
          dashArray: '3',
          fillOpacity: 0.3,
          fillColor: 'gray'
      };
  }
  //add control layers
  L.control.layers(null, overlayMaps, {
    collapsed: false
  }).addTo(map);

  //call getData function
  getData(map);
};

//calculate radius for proportional symbols
function calcPropRadius(attValue) {
  //scale factor to adjust symbol size evenly
  var scaleFactor = 700000;
  //area based on attribute value and scale factor
  var area = Math.pow(attValue, 3) * scaleFactor;
  //radius calculated based on area
  var radius = Math.sqrt(area / Math.PI);

  return radius;
};

//create popup for point layer
function createPopup(properties, attribute, layer, radius) {
  this.properties = properties;
  this.attribute = attribute;
  this.layer = layer;
  var percent = Math.round(this.properties[attribute] *1000)/10;
  this.content = "<b>" + this.properties.regionname + "</b><p>"+ percent + "% SPED in " + this.attribute + "</p>";
  this.bindToLayer = function() {
    this.layer.bindPopup(this.content, {
      offset: new L.Point(0, -radius)
    });
  };
};

//function to convert markers to circle markers
function pointToLayer(feature, coordinates, attributes) {

  var attribute = attributes[0];

  //create marker options
  var options = {
    fillColor: "#8B008B",
    color: "#000",
    weight: 1,
    opacity: .8,
    fillOpacity: 0.8
  };

  //For each feature, determine its value for the selected attribute
  var attValue = Number(feature.properties[attribute]);

  //Give each feature's circle marker a radius based on its attribute value
  options.radius = calcPropRadius(attValue);

  //create circle marker layer
  var layer = L.circleMarker(coordinates, options);

  var popup = new createPopup(feature.properties, attribute, layer, options.radius);

  popup.bindToLayer();

  layer.on({
    mouseover: function() {
      this.openPopup();
    },
    mouseout: function() {
      this.closePopup();
    }
  });

  //return the circle marker to the L.geoJson pointToLayer option
  return layer;
};

function processData(data) {
  //empty array to hold attributes
  var attributes = [];

  //properties of the first feature in the dataset
  var properties = data.features[0].properties;

  //push each attribute name into attributes array
  for (var attribute in properties) {
    //only take attributes with population values
    if (attribute != 'regionname' &&
      attribute != 'totalenrolled' &&
      attribute != 'id') {
      attributes.push(attribute);
    };
  };

  //check result
  console.log(attributes);

  return attributes;
};

function createPropSymbols(data, map, attributes) {

  //create a Leaflet GeoJSON layer and add it to the map
  L.geoJson(data, {
    pointToLayer: function(feature, coordinates) {
      return pointToLayer(feature, coordinates, attributes);
    }
  }).addTo(map);
};


//update proportional symbols based on data
function updatePropSymbols(map, attribute) {
  map.eachLayer(function(layer) {
    if (layer.feature && layer.feature.properties[attribute]) {
      //access feature properties
      var props = layer.feature.properties;

      //update each feature's radius based on new attribute values
      var radius = calcPropRadius(props[attribute]);
      layer.setRadius(radius);

      //Example 1.3 line 6...in UpdatePropSymbols()
      var popup = new createPopup(props, attribute, layer, radius);

      //add popup to circle marker
      popup.bindToLayer();
    };
  });

  updateLegend(map, attribute);
};

//create legend from data
function createLegend(map, attributes) {
  var LegendControl = L.Control.extend({
    options: {
      position: 'bottomright'
    },

    onAdd: function(map) {
      // create the control container with a particular class name
      var container = L.DomUtil.create('div', 'legend-control-container');

      //add temporal legend div to container
      $(container).append('<div id="temporal-legend">')

      //Example 3.5 line 15...Step 1: start attribute legend svg string
      var svg = '<svg id="attribute-legend" width="160px" height="100px">';

      // //array of circle names to base loop on
      // var circles = ["max", "mean", "min"];

      //object to base loop on...replaces Example 3.10 line 1
      var circles = {
        max: 20,
        mean: 40,
        min: 60
      };


      //loop to add each circle and text to svg string
      for (var circle in circles) {
        //circle string
        svg += '<circle class="legend-circle" id="' + circle + '" fill="#8B008B" fill-opacity="0.8" stroke="#000000" cx="50"/>';

        //text string
        svg += '<text id="' + circle + '-text" x="85" y="' + circles[circle] + '"></text>';
      };

      //close svg string
      svg += "</svg>";
      console.log(svg);

      //add attribute legend svg to container
      $(container).append(svg);

      return container;
    }
  });

  map.addControl(new LegendControl());

  updateLegend(map, attributes[0]);
};

//Calculate the max, mean, and min values for a given attribute
function getCircleValues(map, attribute) {
  //start with min at highest possible and max at lowest possible number
  var min = Infinity,
    max = -Infinity;

  map.eachLayer(function(layer) {
    //get the attribute value
    if (layer.feature) {
      var attributeValue = Number(layer.feature.properties[attribute]);
      console.log(attributeValue);
      //test for min
      if (attributeValue < min) {
        min = attributeValue;
      };

      //test for max
      if (attributeValue > max) {
        max = attributeValue;
      };
    };
  });

  //set mean
  var mean = (max + min) / 2;

  //return values as an object
  return {
    max: max,
    mean: mean,
    min: min
  };
};

function updateLegend(map, attribute) {
  //create content for legend
  var content = "% Students in <br> Special Ed in " + attribute;

  //replace legend content
  $('#temporal-legend').html(content);

  //get the max, mean, and min values as an object
  var circleValues = getCircleValues(map, attribute);

  for (var key in circleValues) {
    //get the radius
    var radius = calcPropRadius(circleValues[key]);

    //Step 3: assign the cy and r attributes
    $('#' + key).attr({
      cy: 60 - radius,
      r: radius
    });

    //Step 4: add legend text
    $('#' + key + '-text').text(Math.round(circleValues[key] * 1000) / 10 + "%");
  };
};

//create sequence control
function createSequenceControls(map, attributes) {
  var SequenceControl = L.Control.extend({
    options: {
      position: 'bottomleft'
    },

    onAdd: function(map) {
      var container = L.DomUtil.create('div', 'sequence-control-container');

      $(container).append('<input class="range-slider" type="range">');

      $(container).append('<button class="skip" id="reverse" title="Reverse">Reverse</button>');
      $(container).append('<button class="skip" id="forward" title="Forward">Skip</button>');

      L.DomEvent.disableClickPropagation(container);

      return container;
    }
  });

  map.addControl(new SequenceControl());

  //set slider attributes
  $('.range-slider').attr({
    max: 8,
    min: 0,
    value: 0,
    step: 1
  });
  $('#forward').html('<span class="fas fa-arrow-right"></span>');
  $('#reverse').html('<span class="fas fa-arrow-left"></span>');


  //click listener for buttons
  $('.skip').click(function() {

    //get the old index value
    var index = $('.range-slider').val();

    //increment or decriment depending on button clicked
    if ($(this).attr('id') == 'forward') {
      index++;
      //if past the last attribute, wrap around to first attribute
      index = index > 8 ? 0 : index;
    } else if ($(this).attr('id') == 'reverse') {
      index--;
      //if past the first attribute, wrap around to last attribute
      index = index < 0 ? 8 : index;
    };

    //update slider
    $('.range-slider').val(index);

    //pass new attribute to update symbols
    updatePropSymbols(map, attributes[index]);
  });

  //input listener for slider
  $('.range-slider').on('input', function() {
    //get the new index value
    var index = $(this).val();

    //pass new attribute to update symbols
    updatePropSymbols(map, attributes[index]);
  });


};


//Step 2: Import GeoJSON data
function getData(map) {
  //load the data
  $.ajax("https://sdasher.github.io/leafletworking/data/convertedregionsfinal.geojson", {
    dataType: "json",
    success: function(response) {
      var attributes = processData(response);
      createPropSymbols(response, map, attributes);
      createSequenceControls(map, attributes);
      createLegend(map, attributes);
    }
  });


};


$(document).ready(createMap);
