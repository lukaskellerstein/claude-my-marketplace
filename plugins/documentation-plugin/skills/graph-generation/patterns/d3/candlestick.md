# Candlestick / OHLC (Financial)

Place inside the `<script>` tag of the D3 HTML template from SKILL.md.

```javascript
const data = [
  { date: "2024-01-02", open: 100, high: 110, low: 95, close: 108 },
  { date: "2024-01-03", open: 108, high: 115, low: 105, close: 103 },
  { date: "2024-01-04", open: 103, high: 112, low: 100, close: 110 },
  { date: "2024-01-05", open: 110, high: 118, low: 108, close: 115 },
  { date: "2024-01-08", open: 115, high: 120, low: 107, close: 109 },
  { date: "2024-01-09", open: 109, high: 114, low: 106, close: 113 },
  { date: "2024-01-10", open: 113, high: 119, low: 112, close: 117 }
];
const parseDate = d3.timeParse("%Y-%m-%d");
data.forEach(d => d.date = parseDate(d.date));

const width = 700, height = 400;
const margin = { top: 20, right: 20, bottom: 40, left: 60 };
const svg = d3.select("#chart").attr("width", width).attr("height", height);

const x = d3.scaleBand().domain(data.map(d => d.date))
  .range([margin.left, width - margin.right]).padding(0.3);
const y = d3.scaleLinear()
  .domain([d3.min(data, d => d.low) - 5, d3.max(data, d => d.high) + 5])
  .range([height - margin.bottom, margin.top]);

// Wicks
svg.selectAll(".wick").data(data).join("line")
  .attr("x1", d => x(d.date) + x.bandwidth() / 2)
  .attr("x2", d => x(d.date) + x.bandwidth() / 2)
  .attr("y1", d => y(d.high)).attr("y2", d => y(d.low))
  .attr("stroke", d => d.close >= d.open ? "#26a69a" : "#ef5350");

// Bodies
svg.selectAll(".body").data(data).join("rect")
  .attr("x", d => x(d.date)).attr("y", d => y(Math.max(d.open, d.close)))
  .attr("width", x.bandwidth())
  .attr("height", d => Math.max(1, Math.abs(y(d.open) - y(d.close))))
  .attr("fill", d => d.close >= d.open ? "#26a69a" : "#ef5350");

svg.append("g").attr("transform", `translate(0,${height - margin.bottom})`)
  .call(d3.axisBottom(x).tickFormat(d3.timeFormat("%b %d")));
svg.append("g").attr("transform", `translate(${margin.left},0)`).call(d3.axisLeft(y));
```
