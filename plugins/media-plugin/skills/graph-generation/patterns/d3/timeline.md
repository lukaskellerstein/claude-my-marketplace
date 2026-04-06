# Timeline Infographic

Place inside the `<script>` tag of the D3 HTML template from SKILL.md.

```javascript
const events = [
  { year: "2020", title: "Founded", desc: "Company established in Prague" },
  { year: "2021", title: "First Product", desc: "Launched beta version" },
  { year: "2022", title: "Series A", desc: "Raised $10M funding" },
  { year: "2023", title: "EU Contract", desc: "First government deployment" },
  { year: "2024", title: "Scale", desc: "500+ enterprise clients" }
];
const width = 900, height = 250, margin = { left: 60, right: 60 };
const svg = d3.select("#chart").attr("width", width).attr("height", height);
const x = d3.scalePoint().domain(events.map(d => d.year))
  .range([margin.left, width - margin.right]);

svg.append("line").attr("x1", margin.left).attr("x2", width - margin.right)
  .attr("y1", height / 2).attr("y2", height / 2)
  .attr("stroke", "#d1d5db").attr("stroke-width", 2);

events.forEach((d, i) => {
  const cx = x(d.year), above = i % 2 === 0;
  svg.append("circle").attr("cx", cx).attr("cy", height / 2)
    .attr("r", 8).attr("fill", "#3B82F6");
  svg.append("line").attr("x1", cx).attr("x2", cx)
    .attr("y1", height / 2 + (above ? -12 : 12))
    .attr("y2", height / 2 + (above ? -50 : 50))
    .attr("stroke", "#93c5fd").attr("stroke-width", 1);

  const textY = above ? height / 2 - 60 : height / 2 + 65;
  svg.append("text").attr("x", cx).attr("y", textY)
    .attr("text-anchor", "middle").attr("font-size", "18px")
    .attr("font-weight", "bold").attr("fill", "#111").text(d.year);
  svg.append("text").attr("x", cx).attr("y", textY + 18)
    .attr("text-anchor", "middle").attr("font-size", "13px")
    .attr("font-weight", "600").attr("fill", "#3B82F6").text(d.title);
  svg.append("text").attr("x", cx).attr("y", textY + 34)
    .attr("text-anchor", "middle").attr("font-size", "11px")
    .attr("fill", "#666").text(d.desc);
});
```
