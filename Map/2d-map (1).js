// ==========================================
// 1. INITIALIZE LEAFLET MAP
// Matching: var map = L.map('map').setView([51.505, -0.09], 13);
// ==========================================
var map = L.map('map', {
  zoomControl: false
}).setView([51.505, -0.09], 6);

L.control.zoom({ position: 'bottomright' }).addTo(map);

// ==========================================
// 2. TILE LAYERS: ONLY STREET & SATELLITE (100% ENGLISH LABELS WORLDWIDE)
// ==========================================
var tileLayers = {
  street: L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}', {
    attribution: 'Tiles &copy; Esri &mdash; World Street Map (English)',
    maxZoom: 19
  }),
  satellite: L.layerGroup([
    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
      attribution: 'Tiles &copy; Esri World Imagery',
      maxZoom: 19
    }),
    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}', {
      attribution: 'Labels &copy; Esri English Places & Borders',
      maxZoom: 19
    })
  ])
};

// Start with Street (English) mode by default
var currentLayer = tileLayers.street.addTo(map);

function switchLayer(name) {
  map.removeLayer(currentLayer);
  currentLayer = tileLayers[name].addTo(map);

  document.getElementById('layerStreet').classList.toggle('active', name === 'street');
  document.getElementById('layerSatellite').classList.toggle('active', name === 'satellite');
}

document.getElementById('layerStreet').addEventListener('click', () => switchLayer('street'));
document.getElementById('layerSatellite').addEventListener('click', () => switchLayer('satellite'));

// ==========================================
// 3. CITIES DATA & ROUTE STATE (LINKED WITH 3D)
// ==========================================
var CITIES = window.LANDMARK_CITIES || [
  { id: "london", name: "London", state: "England", country: "United Kingdom", region: "Europe", lat: 51.505, lng: -0.09, landmark: "Big Ben & Westminster", quote: "When a man is tired of London, he is tired of life.", image: "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=600&auto=format&fit=crop&q=80" },
  { id: "paris", name: "Paris", state: "Île-de-France", country: "France", region: "Europe", lat: 48.8566, lng: 2.3522, landmark: "Eiffel Tower", quote: "Paris is always a good idea.", image: "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=600&auto=format&fit=crop&q=80" }
];

// Read URL query parameters to synchronize with 3D Globe
var urlParams = new URLSearchParams(window.location.search);
var qStart = urlParams.get('start');
var qDest = urlParams.get('dest');

var startCity = (qStart && CITIES.find(c => c.id === qStart)) || CITIES[0];
var destCity = (qDest && CITIES.find(c => c.id === qDest)) || CITIES[1];

var routePolyline = null;
var markersLayer = L.layerGroup().addTo(map);

// Update 3D Link URL with current selection
function update3DLink() {
  var linkBtn = document.getElementById('linkTo3D');
  if (linkBtn && startCity && destCity) {
    linkBtn.href = `3d-map.html?start=${startCity.id}&dest=${destCity.id}`;
  }
}

// Custom Pin Icon for Leaflet
function createCustomIcon(role) {
  var cls = role === 'origin' ? 'origin' : (role === 'dest' ? 'dest' : 'landmark');
  var symbol = role === 'origin' ? 'A' : (role === 'dest' ? 'B' : '📍');
  return L.divIcon({
    className: '',
    html: `
      <div class="custom-pin-wrap">
        <div class="pin-circle ${cls}">${symbol}</div>
        <div class="pin-pointer ${cls}"></div>
      </div>
    `,
    iconSize: [32, 40],
    iconAnchor: [16, 40],
    popupAnchor: [0, -42]
  });
}

// Pretty Customizable CSS popup HTML
// Implements: .bindPopup('A pretty CSS popup.<br> Easily customizable.')
function createPopupContent(city, role) {
  var badgeClass = role === 'origin' ? 'origin' : (role === 'dest' ? 'dest' : 'regular');
  var badgeText = role === 'origin' ? 'ORIGIN' : (role === 'dest' ? 'DESTINATION' : (city.region || 'LANDMARK').toUpperCase());
  var imgUrl = city.image || 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=600&auto=format&fit=crop&q=80';

  return `
    <div>
      <img class="popup-card-img" src="${imgUrl}" alt="${city.name}" />
      <div class="popup-card-body">
        <div class="popup-card-header">
          <h3 class="popup-card-title">${city.name}</h3>
          <span class="popup-card-badge ${badgeClass}">${badgeText}</span>
        </div>
        <div class="popup-card-location">
          <span>📍 ${city.state ? city.state + ', ' : ''}${city.country}</span>
        </div>
        <div class="popup-card-quote">${city.quote || 'A pretty CSS popup.<br> Easily customizable.'}</div>
        <div class="popup-card-coords">Lat: ${city.lat.toFixed(4)}° | Lng: ${city.lng.toFixed(4)}°</div>
      </div>
    </div>
  `;
}

// ==========================================
// 4. UPDATE ROUTE & MARKERS
// ==========================================
function updateRouteAndMarkers() {
  markersLayer.clearLayers();

  // 1. Update trip photos bar in sidebar
  document.getElementById('barOriginImg').src = startCity.image || '';
  document.getElementById('barOriginCity').innerText = startCity.name;
  document.getElementById('barOriginSub').innerText = `${startCity.state || ''}, ${startCity.country}`;

  document.getElementById('barDestImg').src = destCity.image || '';
  document.getElementById('barDestCity').innerText = destCity.name;
  document.getElementById('barDestSub').innerText = `${destCity.state || ''}, ${destCity.country}`;

  // 2. Add Start Marker (Origin)
  var startMarker = L.marker([startCity.lat, startCity.lng], {
    icon: createCustomIcon('origin')
  }).bindPopup(createPopupContent(startCity, 'origin'));
  markersLayer.addLayer(startMarker);

  // 3. Add Destination Marker (Destination)
  var destMarker = L.marker([destCity.lat, destCity.lng], {
    icon: createCustomIcon('dest')
  }).bindPopup(createPopupContent(destCity, 'dest'));
  markersLayer.addLayer(destMarker);

  // 4. Add other Landmark Cities markers
  CITIES.forEach(c => {
    if (c.id !== startCity.id && c.id !== destCity.id) {
      var marker = L.marker([c.lat, c.lng], {
        icon: createCustomIcon('landmark')
      }).bindPopup(createPopupContent(c, 'landmark'));
      markersLayer.addLayer(marker);
    }
  });

  // 5. Draw bold, crisp Route Line
  if (routePolyline) {
    map.removeLayer(routePolyline);
  }

  var latlngs = [
    [startCity.lat, startCity.lng],
    [destCity.lat, destCity.lng]
  ];

  routePolyline = L.polyline(latlngs, {
    color: '#38bdf8',
    weight: 5,
    opacity: 0.9,
    lineCap: 'round'
  }).addTo(map);

  // 6. Update Telemetry
  updateTelemetry();

  // 7. Update link to 3D globe with the new route
  update3DLink();
}

// Distance calculation
function getDistanceKm(lat1, lon1, lat2, lon2) {
  var R = 6371;
  var dLat = (lat2 - lat1) * Math.PI / 180;
  var dLon = (lon2 - lon1) * Math.PI / 180;
  var a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

function updateTelemetry() {
  var dist = getDistanceKm(startCity.lat, startCity.lng, destCity.lat, destCity.lng);
  document.getElementById('hudDistance').innerText = `${dist.toLocaleString()} km (${Math.round(dist * 0.621371).toLocaleString()} mi)`;
  var hours = (dist / 850 + 0.5).toFixed(1);
  document.getElementById('hudFlightTime').innerText = `~${hours} hrs`;
  document.getElementById('hudOriginName').innerText = `${startCity.name}, ${startCity.country}`;
  document.getElementById('hudDestName').innerText = `${destCity.name}, ${destCity.country}`;
}

function fitRoute() {
  if (routePolyline) {
    map.fitBounds(routePolyline.getBounds(), { padding: [100, 100], maxZoom: 10 });
  }
}

document.getElementById('btnFrameRoute').addEventListener('click', fitRoute);

// ==========================================
// 5. DROPDOWNS & SEARCH
// ==========================================
var startSelect = document.getElementById('startSelect');
var destSelect = document.getElementById('destSelect');
var citySearch = document.getElementById('citySearch');

function populateDropdowns(filterQuery = '') {
  var currentStart = startSelect.value || startCity.id;
  var currentDest = destSelect.value || destCity.id;

  startSelect.innerHTML = '';
  destSelect.innerHTML = '';

  var regions = ['Europe', 'Asia', 'Americas', 'Africa', 'Oceania'];
  var q = filterQuery.toLowerCase();

  var filtered = CITIES.filter(c =>
    c.name.toLowerCase().includes(q) ||
    (c.state && c.state.toLowerCase().includes(q)) ||
    c.country.toLowerCase().includes(q) ||
    c.region.toLowerCase().includes(q)
  );

  regions.forEach(region => {
    var inRegion = filtered.filter(c => c.region === region);
    if (inRegion.length === 0) return;

    var groupStart = document.createElement('optgroup');
    groupStart.label = `📍 ${region}`;
    var groupDest = document.createElement('optgroup');
    groupDest.label = `📍 ${region}`;

    inRegion.forEach(c => {
      var text = `${c.name}, ${c.state || ''}, ${c.country}`;
      groupStart.appendChild(new Option(text, c.id));
      groupDest.appendChild(new Option(text, c.id));
    });

    startSelect.appendChild(groupStart);
    destSelect.appendChild(groupDest);
  });

  if (CITIES.some(c => c.id === currentStart)) startSelect.value = currentStart;
  if (CITIES.some(c => c.id === currentDest)) destSelect.value = currentDest;
}

citySearch.addEventListener('input', e => {
  populateDropdowns(e.target.value);
});

startSelect.addEventListener('change', () => {
  startCity = CITIES.find(c => c.id === startSelect.value) || startCity;
  if (startCity.id === destCity.id) {
    destCity = CITIES.find(c => c.id !== startCity.id) || destCity;
    destSelect.value = destCity.id;
  }
  updateRouteAndMarkers();
  map.flyTo([startCity.lat, startCity.lng], 8);
});

destSelect.addEventListener('change', () => {
  destCity = CITIES.find(c => c.id === destSelect.value) || destCity;
  if (destCity.id === startCity.id) {
    startCity = CITIES.find(c => c.id !== destCity.id) || startCity;
    startSelect.value = startCity.id;
  }
  updateRouteAndMarkers();
  map.flyTo([destCity.lat, destCity.lng], 8);
});

// Demo popup button: L.marker([51.5, -0.09]).addTo(map).bindPopup('A pretty CSS popup.<br> Easily customizable.').openPopup();
document.getElementById('btnDemoPopup').addEventListener('click', () => {
  map.flyTo([51.5, -0.09], 13);
  setTimeout(() => {
    L.popup()
      .setLatLng([51.5, -0.09])
      .setContent(`
        <div style="padding: 16px; text-align: center;">
          <h3 style="margin: 0 0 8px 0; color: #38bdf8; font-size: 16px;">✨ London Marker</h3>
          <p style="margin: 0; color: #e2e8f0; font-size: 13px; line-height: 1.5;">A pretty CSS popup.<br> Easily customizable.</p>
        </div>
      `)
      .openOn(map);
  }, 1000);
});

// Locate button
document.getElementById('btnLocate').addEventListener('click', () => {
  map.locate({ setView: true, maxZoom: 12 });
});

map.on('locationfound', e => {
  L.circle(e.latlng, { radius: e.accuracy, color: '#38bdf8' }).addTo(map);
  L.marker(e.latlng).addTo(map)
    .bindPopup('You are here! (Within ' + Math.round(e.accuracy) + ' meters)')
    .openPopup();
});

// ==========================================
// 6. INITIAL BOOT
// ==========================================
populateDropdowns();
updateRouteAndMarkers();
fitRoute();
lucide.createIcons();
update3DLink();

// User requested initial marker and popup
var initialMarker = L.marker([51.5, -0.09]).addTo(map)
  .bindPopup(`
    <div style="padding: 16px; text-align: center;">
      <h3 style="margin: 0 0 6px 0; color: #38bdf8; font-size: 16px;">📍 London [51.5, -0.09]</h3>
      <p style="margin: 0; color: #e2e8f0; font-size: 13px; line-height: 1.5;">A pretty CSS popup.<br> Easily customizable.</p>
    </div>
  `)
  .openPopup();
