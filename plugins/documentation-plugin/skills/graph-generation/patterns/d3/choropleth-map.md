# Choropleth Map (World)

Requires `topojson` CDN script in `<head>`. Place inside the `<script>` tag of the D3 HTML template from SKILL.md.

```javascript
const width = 960, height = 500;
const svg = d3.select("#chart").attr("width", width).attr("height", height);
const projection = d3.geoNaturalEarth1().scale(153).translate([width / 2, height / 2]);
const path = d3.geoPath().projection(projection);
const color = d3.scaleSequential(d3.interpolateBlues).domain([0, 100]);

d3.json("https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json").then(world => {
  const countries = topojson.feature(world, world.objects.countries).features;
  svg.selectAll("path").data(countries).join("path")
    .attr("d", path).attr("fill", () => color(Math.random() * 100))
    .attr("stroke", "#ccc").attr("stroke-width", 0.5);
});
```

**Map projections available:** `geoMercator`, `geoNaturalEarth1`, `geoOrthographic` (globe), `geoAlbersUsa` (US), `geoEquirectangular`, `geoStereographic`.
