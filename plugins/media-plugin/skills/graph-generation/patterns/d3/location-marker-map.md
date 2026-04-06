# Location Marker Map

Requires `topojson` CDN script in `<head>`. Place inside the `<script>` tag of the D3 HTML template from SKILL.md.

```javascript
const width = 960, height = 500;
const svg = d3.select("#chart").attr("width", width).attr("height", height);
const locations = [
  { name: "Prague HQ", lon: 14.42, lat: 50.08, color: "#3B82F6", radius: 8 },
  { name: "London", lon: -0.12, lat: 51.51, color: "#10B981", radius: 6 },
  { name: "Washington DC", lon: -77.04, lat: 38.91, color: "#8B5CF6", radius: 6 }
];
const projection = d3.geoNaturalEarth1().scale(153).translate([width / 2, height / 2]);
const path = d3.geoPath().projection(projection);

(async () => {
  const world = await d3.json("https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json");
  const countries = topojson.feature(world, world.objects.countries).features;
  svg.selectAll(".country").data(countries).join("path")
    .attr("d", path).attr("fill", "#e5e7eb").attr("stroke", "#fff").attr("stroke-width", 0.5);

  locations.forEach(loc => {
    const [x, y] = projection([loc.lon, loc.lat]);
    svg.append("circle").attr("cx", x).attr("cy", y).attr("r", loc.radius + 6)
      .attr("fill", loc.color).attr("opacity", 0.2);
    svg.append("circle").attr("cx", x).attr("cy", y).attr("r", loc.radius)
      .attr("fill", loc.color).attr("stroke", "white").attr("stroke-width", 2);
    svg.append("text").attr("x", x + loc.radius + 6).attr("y", y + 4)
      .attr("font-size", "12px").attr("font-weight", "600").attr("fill", "#333").text(loc.name);
  });
})();
```
