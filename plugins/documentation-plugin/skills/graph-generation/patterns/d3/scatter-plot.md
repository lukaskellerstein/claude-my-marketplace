# Scatter Plot

Place inside the `<script>` tag of the D3 HTML template from SKILL.md.

```javascript
const data = Array.from({ length: 50 }, () => ({
  x: Math.random() * 100, y: Math.random() * 100, r: Math.random() * 10 + 3
}));
const width = 600, height = 400;
const margin = { top: 20, right: 20, bottom: 40, left: 50 };
const svg = d3.select("#chart").attr("width", width).attr("height", height);

const x = d3.scaleLinear().domain([0, 100]).range([margin.left, width - margin.right]);
const y = d3.scaleLinear().domain([0, 100]).range([height - margin.bottom, margin.top]);

svg.selectAll("circle").data(data).join("circle")
  .attr("cx", d => x(d.x)).attr("cy", d => y(d.y)).attr("r", d => d.r)
  .attr("fill", "steelblue").attr("opacity", 0.6);

svg.append("g").attr("transform", `translate(0,${height - margin.bottom})`).call(d3.axisBottom(x));
svg.append("g").attr("transform", `translate(${margin.left},0)`).call(d3.axisLeft(y));
```
