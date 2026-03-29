# Treemap

Place inside the `<script>` tag of the D3 HTML template from SKILL.md.

```javascript
const data = {
  name: "root",
  children: [
    { name: "Frontend", value: 40 }, { name: "Backend", value: 35 },
    { name: "Database", value: 20 }, { name: "DevOps", value: 15 },
    { name: "Testing", value: 10 }
  ]
};
const width = 600, height = 400;
const svg = d3.select("#chart").attr("width", width).attr("height", height);
const color = d3.scaleOrdinal(d3.schemeTableau10);

const root = d3.hierarchy(data).sum(d => d.value);
d3.treemap().size([width, height]).padding(2)(root);

const nodes = svg.selectAll("g").data(root.leaves()).join("g")
  .attr("transform", d => `translate(${d.x0},${d.y0})`);
nodes.append("rect").attr("width", d => d.x1 - d.x0).attr("height", d => d.y1 - d.y0)
  .attr("fill", (d, i) => color(i));
nodes.append("text").attr("x", 5).attr("y", 20)
  .attr("font-size", "13px").attr("fill", "white").text(d => d.data.name);
```
