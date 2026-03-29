# Radial / Gauge Chart

Place inside the `<script>` tag of the D3 HTML template from SKILL.md.

```javascript
const data = [
  { label: "Performance", value: 78, max: 100, color: "#3B82F6" },
  { label: "Reliability", value: 92, max: 100, color: "#10B981" },
  { label: "Coverage", value: 65, max: 100, color: "#8B5CF6" }
];
const width = 600, height = 300;
const svg = d3.select("#chart").attr("width", width).attr("height", height);

data.forEach((d, i) => {
  const cx = (width / (data.length + 1)) * (i + 1);
  const radius = 80, arcWidth = 12;
  const g = svg.append("g").attr("transform", `translate(${cx},${height / 2})`);

  const arc = d3.arc().innerRadius(radius - arcWidth).outerRadius(radius)
    .startAngle(-Math.PI * 0.75).cornerRadius(6);

  g.append("path").attr("d", arc.endAngle(Math.PI * 0.75)()).attr("fill", "#e5e7eb");

  const scale = d3.scaleLinear().domain([0, d.max]).range([-Math.PI * 0.75, Math.PI * 0.75]);
  g.append("path").attr("d", arc.endAngle(scale(d.value))()).attr("fill", d.color);

  g.append("text").attr("text-anchor", "middle").attr("dy", "0.1em")
    .attr("font-size", "28px").attr("font-weight", "bold").attr("fill", "#111")
    .text(d.value + "%");
  g.append("text").attr("text-anchor", "middle").attr("dy", "1.8em")
    .attr("font-size", "14px").attr("fill", "#666").text(d.label);
});
```
