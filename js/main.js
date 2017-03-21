function initMap() {
  let markerArray = [],
      directionsService = new google.maps.DirectionsService,
      map = new google.maps.Map(document.getElementById('map'), {
        zoom: 5,
        center: {lat: 40.771, lng: -73.974}
      }),
      directionsDisplay = new google.maps.DirectionsRenderer({ map: map }),
      stepDisplay = new google.maps.InfoWindow;

  function onChangeHandler() {
    calculateAndDisplayRoute(
      directionsDisplay, directionsService, markerArray, stepDisplay, map);
  }

  document.getElementById('search-button')
    .addEventListener('click', onChangeHandler);
}

function calculateAndDisplayRoute(directionsDisplay, directionsService, markerArray, stepDisplay, map) {
  // remove any existing markers from the map
  for (var i = 0; i < markerArray.length; i++) {
    markerArray[i].setMap(null);
  }

  // retrieve the start and end locations and create a DirectionsRequest
  directionsService.route({
    origin: document.getElementById('start').value,
    destination: document.getElementById('end').value,
    travelMode: document.getElementById('transit-type').value,
    provideRouteAlternatives: true
  }, function(response, status) {
    // Route the directions and pass the response to a function to create
    // markers for each step.
    if (status === 'OK') {
      document.getElementById('warnings-panel').innerHTML =
          '<b>' + response.routes[0].warnings + '</b>';
      directionsDisplay.setDirections(response);

      var polyline = createPolyline(response, map);
      computeTotalDistance(response, polyline, map);
      showSteps(response, markerArray, stepDisplay, map);
    } else {
      window.alert('Directions request failed due to ' + status);
    }
  });
}

function getRouteDuration(route) {
  return route.legs[0].duration.value;
}

function getViableRoutes(result) {
  var viableRoutes = [result.routes.shift()],
      baseTime = getRouteDuration(viableRoutes[0]);

  // routes are viable if within a certain duration of the shortest route
  // 1.1 is currently being used, could be turned into a UI component
  result.routes.forEach(function(route) {
    if (getRouteDuration(route) < (baseTime * 1.1)) {
      viableRoutes.push(route);
    }
  });

  return viableRoutes;
}

function computeTotalDistance(result, polyline, map) {
  var totalDist = 0,
      totalTime = 0,
      myRoute = result.routes[0],
      myRouteLegsLength = myRoute.legs.length,
      i;

  for (i = 0; i < myRouteLegsLength; i++) {
    totalDist += myRoute.legs[i].distance.value;
    totalTime += myRoute.legs[i].duration.value;
  }

  putMarkerOnRoute(50, totalDist, totalTime, polyline, map);
}

function putMarkerOnRoute(percentage, totalDist, totalTime, polyline, map) {
  var distance = percentage / 100 * totalDist,
      time = (percentage / 100 * totalTime / 60).toFixed(2);

  createMarker(polyline.GetPointAtDistance(distance),"time: "+time,"marker", map);
}

function createMarker(latlng, label, html, map) {
  var contentString = '<b>'+label+'</b><br>'+html;
var marker = new google.maps.Marker({
    position: latlng,
    map: map,
    title: label,
    zIndex: Math.round(latlng.lat()*-100000)<<5
    });
    marker.myname = label;
var infowindow = new google.maps.InfoWindow;

google.maps.event.addListener(marker, 'click', function() {
    infowindow.setContent(contentString+"<br>"+marker.getPosition().toUrlValue(6));
    infowindow.open(map,marker);
    });
return marker;
}

function p(x) {
  console.log(x);
}

function createPolyline(directionResult, map) {
  var polyline = new google.maps.Polyline({ path: [] }),
      route = directionResult.routes[0],
      path = directionResult.routes[0].overview_path,
      legs = directionResult.routes[0].legs,
      i, j;

  for (i=0; i < legs.length; i++) {
    var steps = legs[i].steps;
    for (j=0; j < steps.length; j++) {
      var nextSegment = steps[j].path,
          k;
      for (k=0;k<nextSegment.length;k++) {
        polyline.getPath().push(nextSegment[k]);
      }
    }
  }

  // polyline.setMap(map);

  return polyline;
}

function showSteps(directionResult, markerArray, stepDisplay, map) {
  // For each step, place a marker, and add the text to the marker's infowindow.
  // Also attach the marker to an array so we can keep track of it and remove it
  // when calculating new routes.
  var myRoute = directionResult.routes[0].legs[0];

  for (var i = 0; i < myRoute.steps.length; i++) {
    var marker = markerArray[i] = markerArray[i] || new google.maps.Marker;
    marker.setMap(map);
    marker.setPosition(myRoute.steps[i].start_location);
    attachInstructionText(
        stepDisplay, marker, myRoute.steps[i].instructions, map);
  }
}

function attachInstructionText(stepDisplay, marker, text, map) {
  google.maps.event.addListener(marker, 'click', function() {
    // Open an info window when the marker is clicked on, containing the text
    // of the step.
    stepDisplay.setContent(text);
    stepDisplay.open(map, marker);
  });
}
