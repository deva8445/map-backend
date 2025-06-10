const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

const GOOGLE_API_KEY = 'AIzaSyBbQCdq4EUZhYu4gr_7BK94NqZG2e2liqI';

app.post('/api/directions/snap-to-roads', async (req, res) => {
  console.log("Snap to Roads API called");
  
  try {
    const path = req.body.path;
// const path = removeDuplicates(rawPath);
    console.log("Direction=====> ", path);
    if (!path || path.length < 2) {
      return res.status(400).json({ error: 'At least two coordinates required.' });
    }

    const origin = `${path[0].lat},${path[0].lng}`;
    const destination = `${path[path.length - 1].lat},${path[path.length - 1].lng}`;
    const waypoints = path.slice(1, -1).map(p => `${p.lat},${p.lng}`).join('|');
    
    const directionsUrl = `https://maps.googleapis.com/maps/api/directions/json?origin=${origin}&destination=${destination}&key=${GOOGLE_API_KEY}${waypoints ? `&waypoints=${waypoints}` : ''}`;

    const response = await axios.get(directionsUrl);

    if (!response.data.routes.length) {
      return res.status(500).json({ error: 'No route found.' });
    }

    const legs = response.data.routes[0].legs;
    const totalDistance = legs.reduce((sum, leg) => sum + leg.distance.value, 0);
    console.log(totalDistance,"=========================direction");
    

    res.json({ distance: (totalDistance / 1000).toFixed(2), from: "Direction API" });
  } catch (error) {
    console.error(error.response?.data || error.message);
    res.status(500).send('Error fetching route distance');
  }
});

app.post('/api/roads/snap-to-roads', async (req, res) => {
  try {
    const path = req.body.path;
    const points = path.map(p => `${p.lat},${p.lng}`).join('|');
    console.log("Road======> ",path);
    const snapUrl = `https://roads.googleapis.com/v1/snapToRoads?path=${points}&interpolate=true&key=${GOOGLE_API_KEY}`;
    const response = await axios.get(snapUrl);
    
    const snappedPoints = response.data.snappedPoints;

    let totalDistance = 0;
    for (let i = 1; i < snappedPoints.length; i++) {
      const prev = snappedPoints[i - 1].location;
      const curr = snappedPoints[i].location;
      totalDistance += haversineDistance(prev, curr);
    }

    console.log(totalDistance,"--------------------road");
    

    res.json({ distance: totalDistance.toFixed(2), from : "Road API" });
  } catch (error) {
    console.error(error.response?.data || error.message);
    res.status(500).send('Error processing GPS points');
  }
});

app.post('/api/manual/calculate-distance', (req, res) => {
  const path = req.body.path;

  if (!Array.isArray(path) || path.length < 2) {
    return res.status(400).json({ error: 'At least two GPS points are required.' });
  }

  let totalDistance = 0;
  for (let i = 0; i < path.length - 1; i++) {
    const prev = path[i];
    const curr = path[i + 1];
    totalDistance += haversineDistance({
      latitude: prev.lat,
      longitude: prev.lng
    }, {
      latitude: curr.lat,
      longitude: curr.lng
    });
  }

  console.log(totalDistance, "--------------------manual");

  res.json({ distance: totalDistance.toFixed(2), from: "Manual Haversine" });
});

function haversineDistance(p1, p2) {
  const toRad = deg => deg * Math.PI / 180;
  const R = 6371;

  const dLat = toRad(p2.latitude - p1.latitude);
  const dLng = toRad(p2.longitude - p1.longitude);

  const a = Math.sin(dLat / 2) ** 2 +
            Math.cos(toRad(p1.latitude)) * Math.cos(toRad(p2.latitude)) *
            Math.sin(dLng / 2) ** 2;

  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function removeDuplicates(path, threshold = 0.00001) {
  const cleaned = [];
  for (let i = 0; i < path.length; i++) {
    if (
      i === 0 ||
      Math.abs(path[i].lat - path[i - 1].lat) > threshold ||
      Math.abs(path[i].lng - path[i - 1].lng) > threshold
    ) {
      cleaned.push(path[i]);
    }
  }
  return cleaned;
}

app.listen(PORT, () => {
  console.log(`Server is running on port => ${PORT}`);
});
