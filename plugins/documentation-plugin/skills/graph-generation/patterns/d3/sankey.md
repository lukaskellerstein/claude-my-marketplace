# Sankey Diagram

Requires `d3-sankey` CDN script in `<head>`. Place inside the `<script>` tag of the D3 HTML template from SKILL.md.

```javascript
const width = 700, height = 400;
const svg = d3.select("#chart").attr("width", width).attr("height", height);

const data = {
  nodes: [
    { name: "Source A" }, { name: "Source B" },
    { name: "Process 1" }, { name: "Process 2" },
    { name: "Output X" }, { name: "Output Y" }
  ],
  links: [
    { source: 0, target: 2, value: 20 }, { source: 0, target: 3, value: 10 },
    { source: 1, target: 2, value: 15 }, { source: 1, target: 3, value: 25 },
    { source: 2, target: 4, value: 30 }, { source: 3, target: 4, value: 10 },
    { source: 3, target: 5, value: 25 }
  ]
};

const sankey = d3.sankey().nodeWidth(20).nodePadding(10)
  .extent([[10, 10], [width - 10, height - 10]]);
const { nodes, links } = sankey(data);
const color = d3.scaleOrdinal(d3.schemeTableau10);

svg.selectAll("rect").data(nodes).join("rect")
  .attr("x", d => d.x0).attr("y", d => d.y0)
  .attr("width", d => d.x1 - d.x0).attr("height", d => d.y1 - d.y0)
  .attr("fill", (d, i) => color(i));

svg.selectAll(".link").data(links).join("path")
  .attr("d", d3.sankeyLinkHorizontal()).attr("fill", "none")
  .attr("stroke", d => color(d.source.index))
  .attr("stroke-width", d => d.width).attr("stroke-opacity", 0.4);

svg.selectAll("text").data(nodes).join("text")
  .attr("x", d => d.x0 < width / 2 ? d.x1 + 6 : d.x0 - 6)
  .attr("y", d => (d.y0 + d.y1) / 2).attr("dy", "0.35em")
  .attr("text-anchor", d => d.x0 < width / 2 ? "start" : "end")
  .attr("font-size", "12px").text(d => d.name);
```
