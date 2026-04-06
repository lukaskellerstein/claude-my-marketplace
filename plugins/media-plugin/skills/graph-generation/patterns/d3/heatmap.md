# Heatmap

Place inside the `<script>` tag of the D3 HTML template from SKILL.md.

```javascript
const rows = ["Mon", "Tue", "Wed", "Thu", "Fri"];
const cols = ["9am", "10am", "11am", "12pm", "1pm", "2pm", "3pm", "4pm", "5pm"];
const data = [];
rows.forEach(row => cols.forEach(col => {
  data.push({ row, col, value: Math.random() * 100 });
}));

const width = 600, height = 350;
const margin = { top: 20, right: 20, bottom: 40, left: 60 };
const svg = d3.select("#chart").attr("width", width).attr("height", height);

const x = d3.scaleBand().domain(cols).range([margin.left, width - margin.right]).padding(0.05);
const y = d3.scaleBand().domain(rows).range([margin.top, height - margin.bottom]).padding(0.05);
const color = d3.scaleSequential(d3.interpolateYlOrRd).domain([0, 100]);

svg.selectAll("rect").data(data).join("rect")
  .attr("x", d => x(d.col)).attr("y", d => y(d.row))
  .attr("width", x.bandwidth()).attr("height", y.bandwidth())
  .attr("fill", d => color(d.value));

svg.append("g").attr("transform", `translate(0,${height - margin.bottom})`).call(d3.axisBottom(x));
svg.append("g").attr("transform", `translate(${margin.left},0)`).call(d3.axisLeft(y));
```
