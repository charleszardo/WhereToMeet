let markerArray = [],
    directionsService = new google.maps.DirectionsService;


function initMap() {
    let map = new google.maps.Map(document.getElementById('map'), {
        zoom: 5,
        center: {lat: 40.771, lng: -73.974}
      }),
      directionsDisplay = new google.maps.DirectionsRenderer({ map: map }),
      stepDisplay = new google.maps.InfoWindow;

  function onChangeHandler() {
    calculateAndDisplayRoute(
      directionsDisplay, stepDisplay, map);
  }

  document.getElementById('search-button')
    .addEventListener('click', onChangeHandler);
}

function handleSuccess(response, directionsDisplay, stepDisplay, map) {
  let warningMarkup =
  document.getElementById('warnings-panel').innerHTML =
    `<b>${response.routes[0].warnings}</b>`;
  directionsDisplay.setDirections(response);

  let allRoutes = response.routes,
      viableRoutes = getViableRoutes(allRoutes);

  viableRoutes.forEach(route => {
    let polyline = createPolyline(route, map),
        totals = getTotalDistAndTime(route, polyline, map);

    p(getDistMidPoint(totals.dist, polyline));

  });

  showSteps(response, stepDisplay, map);
}

function calculateAndDisplayRoute(directionsDisplay, stepDisplay, map) {
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
      handleSuccess(response, directionsDisplay, stepDisplay, map);
    } else {
      window.alert('Directions request failed due to ' + status);
    }
  });
}

function getRouteDuration(route) {
  return route.legs[0].duration.value;
}

function getViableRoutes(_routes) {
  var routes = _routes.slice(0),
      viableRoutes = [routes.shift()],
      baseTime = getRouteDuration(viableRoutes[0]);

  // for testing:
  // viableRoutes.forEach(route => {
  //   p("ROUTE:");
  //   p(route.legs[0]);
  //   p(route.legs[0].steps.forEach(step => p(step.instructions)));
  // });
  // routes are viable if within a certain duration of the shortest route
  // 1.1 is currently being used, could be turned into a UI component
  routes.forEach(function(route) {
    if (getRouteDuration(route) < (baseTime * 1.1)) {
      viableRoutes.push(route);
    }
  });

  return viableRoutes;
}

function getTotalDistAndTime(route, map) {
  var totalDist = 0,
      totalTime = 0,
      legs = route.legs,
      routeLegsLength = legs.length,
      i;

  for (i = 0; i < routeLegsLength; i++) {
    totalDist += legs[i].distance.value;
    totalTime += legs[i].duration.value;
  }

  // putMarkerOnRoute(50, totalDist, totalTime, polyline, map);
  return { dist: totalDist, time: totalTime };
}

function getDistMidPoint(totalDist, polyline) {
  return polyline.GetPointAtDistance(0.5 * totalDist);
}

function getTimeMidPoint(totalTime, dist, polyline) {
  let time = (0.5 * totalTime / 60).toFixed(2),
      distMid = dist / 2;

  // TODO: current plan - binary search.  issue: too many calls to directionsService

  // directionsService.route({
  //   origin: document.getElementById('start').value,
  //   destination: document.getElementById('end').value,
  //   travelMode: document.getElementById('transit-type').value,
  //   provideRouteAlternatives: true
  // }, function(response, status) {
  //   // Route the directions and pass the response to a function to create
  //   // markers for each step.
  //   if (status === 'OK') {
  //     handleSuccess(response, directionsDisplay, stepDisplay, map);
  //   } else {
  //     window.alert('Directions request failed due to ' + status);
  //   }
  // });
  //
  // p(polyline.getPath());

  // polyline.GetPointAtDistance(time);
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

function createPolyline(route, map) {
  var polyline = new google.maps.Polyline({ path: [] }),
      path = route.overview_path,
      legs = route.legs,
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

function showSteps(directionResult, stepDisplay, map) {
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

initMap();
