# Stat Dashboard Infographic

Multi-metric cards with sparklines. Place inside the `<script>` tag of the D3 HTML template from SKILL.md.

```javascript
const stats = [
  { label: "Users", value: "12,400", trend: [30, 45, 38, 52, 60, 75, 90], color: "#3B82F6" },
  { label: "Revenue", value: "$2.4M", trend: [20, 25, 35, 30, 50, 55, 70], color: "#10B981" },
  { label: "Uptime", value: "99.97%", trend: [95, 99, 98, 100, 99, 100, 100], color: "#8B5CF6" },
  { label: "Latency", value: "42ms", trend: [80, 60, 55, 50, 45, 42, 40], color: "#F59E0B" }
];
const cardW = 200, cardH = 140, gap = 20, padding = 30;
const width = stats.length * cardW + (stats.length - 1) * gap + padding * 2;
const height = cardH + padding * 2;
const svg = d3.select("#chart").attr("width", width).attr("height", height);

stats.forEach((d, i) => {
  const g = svg.append("g").attr("transform", `translate(${padding + i * (cardW + gap)},${padding})`);
  g.append("rect").attr("width", cardW).attr("height", cardH)
    .attr("rx", 8).attr("fill", "#f9fafb").attr("stroke", "#e5e7eb");
  g.append("text").attr("x", 16).attr("y", 36)
    .attr("font-size", "24px").attr("font-weight", "bold").attr("fill", "#111").text(d.value);
  g.append("text").attr("x", 16).attr("y", 54)
    .attr("font-size", "13px").attr("fill", "#666").text(d.label);

  const sparkX = d3.scaleLinear().domain([0, d.trend.length - 1]).range([16, cardW - 16]);
  const sparkY = d3.scaleLinear().domain([d3.min(d.trend) * 0.8, d3.max(d.trend) * 1.1]).range([cardH - 16, 70]);
  g.append("path").datum(d.trend)
    .attr("d", d3.line().x((v, j) => sparkX(j)).y(v => sparkY(v)).curve(d3.curveMonotoneX))
    .attr("fill", "none").attr("stroke", d.color).attr("stroke-width", 2);
});
```
