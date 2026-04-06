# Pie / Donut Chart

Place inside the `<script>` tag of the D3 HTML template from SKILL.md.

```javascript
const data = [
  { label: "Category A", value: 30 }, { label: "Category B", value: 50 },
  { label: "Category C", value: 20 }, { label: "Category D", value: 40 }
];
const width = 500, height = 500, radius = 200;
const innerRadius = 0; // Set > 0 for donut (e.g., 100)

const svg = d3.select("#chart").attr("width", width).attr("height", height)
  .append("g").attr("transform", `translate(${width/2},${height/2})`);

const color = d3.scaleOrdinal(d3.schemeTableau10);
const pie = d3.pie().value(d => d.value);
const arc = d3.arc().innerRadius(innerRadius).outerRadius(radius);

svg.selectAll("path").data(pie(data)).join("path")
  .attr("d", arc).attr("fill", (d, i) => color(i))
  .attr("stroke", "white").attr("stroke-width", 2);

svg.selectAll("text").data(pie(data)).join("text")
  .attr("transform", d => `translate(${arc.centroid(d)})`)
  .attr("text-anchor", "middle").attr("font-size", "12px")
  .text(d => d.data.label);
```
