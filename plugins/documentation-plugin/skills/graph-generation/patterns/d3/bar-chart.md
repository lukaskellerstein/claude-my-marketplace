# Bar Chart

Place inside the `<script>` tag of the D3 HTML template from SKILL.md.

```javascript
const data = [
  { label: "A", value: 30 }, { label: "B", value: 80 },
  { label: "C", value: 45 }, { label: "D", value: 60 }, { label: "E", value: 20 }
];

const width = 600, height = 400;
const margin = { top: 20, right: 20, bottom: 40, left: 50 };
const svg = d3.select("#chart").attr("width", width).attr("height", height);

const x = d3.scaleBand().domain(data.map(d => d.label))
  .range([margin.left, width - margin.right]).padding(0.2);
const y = d3.scaleLinear().domain([0, d3.max(data, d => d.value)]).nice()
  .range([height - margin.bottom, margin.top]);

svg.selectAll("rect").data(data).join("rect")
  .attr("x", d => x(d.label)).attr("y", d => y(d.value))
  .attr("width", x.bandwidth()).attr("height", d => y(0) - y(d.value))
  .attr("fill", "steelblue");

svg.append("g").attr("transform", `translate(0,${height - margin.bottom})`).call(d3.axisBottom(x));
svg.append("g").attr("transform", `translate(${margin.left},0)`).call(d3.axisLeft(y));
```
