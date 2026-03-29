# Line Chart

Place inside the `<script>` tag of the D3 HTML template from SKILL.md.

```javascript
const data = [
  { date: "2024-01", value: 100 }, { date: "2024-02", value: 130 },
  { date: "2024-03", value: 120 }, { date: "2024-04", value: 170 },
  { date: "2024-05", value: 150 }, { date: "2024-06", value: 200 }
];
const parseDate = d3.timeParse("%Y-%m");
data.forEach(d => d.date = parseDate(d.date));

const width = 600, height = 400;
const margin = { top: 20, right: 20, bottom: 40, left: 50 };
const svg = d3.select("#chart").attr("width", width).attr("height", height);

const x = d3.scaleTime().domain(d3.extent(data, d => d.date))
  .range([margin.left, width - margin.right]);
const y = d3.scaleLinear().domain([0, d3.max(data, d => d.value)]).nice()
  .range([height - margin.bottom, margin.top]);

svg.append("path").datum(data)
  .attr("fill", "none").attr("stroke", "steelblue").attr("stroke-width", 2)
  .attr("d", d3.line().x(d => x(d.date)).y(d => y(d.value)));

svg.append("g").attr("transform", `translate(0,${height - margin.bottom})`).call(d3.axisBottom(x).ticks(6));
svg.append("g").attr("transform", `translate(${margin.left},0)`).call(d3.axisLeft(y));
```
