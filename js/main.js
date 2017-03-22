let markerArray = [],
    map,
    directionsService,
    placesService;

function init() {
    map = new google.maps.Map(document.getElementById('map'), {
      zoom: 5,
      center: {lat: 40.771, lng: -73.974}
    });

    resetServices();

    let directionsDisplay = new google.maps.DirectionsRenderer({ map: map }),
        stepDisplay = new google.maps.InfoWindow;

  function onChangeHandler() {
    resetServices();
    calculateAndDisplayRoute(directionsDisplay, stepDisplay);
  }

  document.getElementById('search-button').addEventListener('click', onChangeHandler);
}

function resetServices() {
  directionsService = new google.maps.DirectionsService;
  placesService = new google.maps.places.PlacesService(map);
}

function calculateAndDisplayRoute(directionsDisplay, stepDisplay) {
  removeCurrentMarkers();

  // retrieve the start and end locations and create a DirectionsRequest
  directionsService.route({
    origin: document.getElementById('start').value,
    destination: document.getElementById('end').value,
    travelMode: document.getElementById('transit-type').value,
    provideRouteAlternatives: true
  }, callback);

  function callback(response, status) {
    // Route the directions and pass the response to a function to create
    // markers for each step.
    if (status === 'OK') {
      handleSuccess(response, directionsDisplay, stepDisplay);
    } else {
      window.alert('Directions request failed due to ' + status);
    }
  }
}

function removeCurrentMarkers() {
  // removes any existing markers from the map
  let len = markerArray.length,
      i;

  for (i = 0; i < len; i++) {
    markerArray[i].setMap(null);
  }
}

function handleSuccess(response, directionsDisplay, stepDisplay) {
  // let warningMarkup =
  // document.getElementById('warnings-panel').innerHTML =
  //   `<b>${response.routes[0].warnings}</b>`,

  // NOTE only use best route for time being
  let allRoutes = response.routes,
      viableRoutes = getViableRoutes(allRoutes);

  directionsDisplay.setDirections(response);

  viableRoutes.forEach(route => {
    let polyline = createPolyline(route),
        totals = getTotalDistAndTime(route, polyline),
        midPoint = getDistMidPoint(totals.dist, polyline);

    putMarkerOnRoute(50, totals.dist, totals.time, polyline);
    getPlacesForCoords(midPoint.lat(), midPoint.lng());
  });

  // showSteps(response.routes[0], stepDisplay);
}

function getViableRoutes(_routes) {
  // TODO include multiple viable routes (when applicable)
  let routes = _routes.slice(0),
      viableRoutes = [routes.shift()],
      baseTime = getRouteDuration(viableRoutes[0]);

  // routes are viable if within a certain duration of the shortest route
  // 1.1 is currently being used, could be turned into a UI component
  // routes.forEach(function(route) {
  //   if (getRouteDuration(route) < (baseTime * 1.1)) {
  //     viableRoutes.push(route);
  //   }
  // });

  // viableRoutes is only first route for time being
  return viableRoutes;
}

function createPolyline(route) {
  let polyline = new google.maps.Polyline({ path: [] }),
      path = route.overview_path,
      legs = route.legs,
      legsLen = legs.length,
      i, j;

  for (i=0; i < legsLen; i++) {
    let steps = legs[i].steps,
        stepsLen = steps.length;

    for (j=0; j < stepsLen; j++) {
      let nextSegment = steps[j].path,
          nextSegmentLen = nextSegment.length,
          k;

      for (k=0; k< nextSegmentLen; k++) {
        polyline.getPath().push(nextSegment[k]);
      }
    }
  }

  return polyline;
}

function getTotalDistAndTime(route) {
  let totalDist = 0,
      totalTime = 0,
      legs = route.legs,
      routeLegsLength = legs.length,
      i;

  for (i = 0; i < routeLegsLength; i++) {
    totalDist += legs[i].distance.value;
    totalTime += legs[i].duration.value;
  }

  return { dist: totalDist, time: totalTime };
}

function getDistMidPoint(totalDist, polyline) {
  return polyline.GetPointAtDistance(0.5 * totalDist);
}

function getTimeMidPoint(totalTime, dist, polyline) {
  // TODO current plan - binary search.  issue: too many calls to directionsService

  let time = (0.5 * totalTime / 60).toFixed(2),
      distMid = dist / 2;

  // directionsService.route({
  //   origin: document.getElementById('start').value,
  //   destination: document.getElementById('end').value,
  //   travelMode: document.getElementById('transit-type').value,
  //   provideRouteAlternatives: true
  // }, function(response, status) {
  //   // Route the directions and pass the response to a function to create
  //   // markers for each step.
  //   if (status === 'OK') {
  //     handleSuccess(response, directionsDisplay, stepDisplay);
  //   } else {
  //     window.alert('Directions request failed due to ' + status);
  //   }
  // });
  //
  // p(polyline.getPath());

  // polyline.GetPointAtDistance(time);
}

function getPlacesForCoords(lat, long) {
  let loc = new google.maps.LatLng(lat, long),
      request = {
        location: loc,
        radius: '500',
        query: 'restaurant',
        openNow: true,
        rankBy: 'PROMINENCE'
      };

  placesService.textSearch(request, function(results, status) {
    console.log(results);
  });
}

function showSteps(_route, stepDisplay) {
  // For each step, place a marker and add the text to the marker's infowindow.
  // Also attach the marker to an array so we can keep track of it and remove it
  // when calculating new routes.
  let i;
  const route = _route.legs[0],
        steps = route.steps,
        routeStepsLen = steps.length;

  for (i = 0; i < routeStepsLen; i++) {
    let marker = markerArray[i] = markerArray[i] || new google.maps.Marker;
    marker.setMap(map);
    marker.setPosition(steps[i].start_location);
    attachInstructionText(stepDisplay, marker, steps[i].instructions);
  }
}

function getRouteDuration(route) {
  return route.legs[0].duration.value;
}

function putMarkerOnRoute(percentage, totalDist, totalTime, polyline) {
  const distance = percentage / 100 * totalDist,
        time = (percentage / 100 * totalTime / 60).toFixed(2);

  createMarker(polyline.GetPointAtDistance(distance),"time: "+time,"marker");
}

function attachInstructionText(stepDisplay, marker, text) {
  // Open an info window when the marker is clicked on, containing the text
  // of the step.
  google.maps.event.addListener(marker, 'click', function() {
    stepDisplay.setContent(text);
    stepDisplay.open(map, marker);
  });
}

function createMarker(latlng, label, html) {
  let contentString =  `<b>${label}</b><br>${html}`,
      marker = new google.maps.Marker({
        position: latlng,
        map: map,
        title: label,
        myName: label,
        zIndex: Math.round(latlng.lat()*-100000)<<5
      }),
      infowindow = new google.maps.InfoWindow;

  google.maps.event.addListener(marker, 'click', () => {
      infowindow.setContent(`${contentString}<br>${marker.getPosition().toUrlValue(6)}`);
      infowindow.open(map, marker);
  });

  return marker;
}

function p(x) {
  console.log(x);
}

init();
