# Force-Directed Network Graph

Place inside the `<script>` tag of the D3 HTML template from SKILL.md.

```javascript
const nodes = [
  { id: "API Gateway" }, { id: "Auth Service" }, { id: "User Service" },
  { id: "Order Service" }, { id: "Payment Service" }, { id: "Database" },
  { id: "Cache" }, { id: "Queue" }
];
const links = [
  { source: "API Gateway", target: "Auth Service" },
  { source: "API Gateway", target: "User Service" },
  { source: "API Gateway", target: "Order Service" },
  { source: "Order Service", target: "Payment Service" },
  { source: "Order Service", target: "Database" },
  { source: "User Service", target: "Database" },
  { source: "User Service", target: "Cache" },
  { source: "Order Service", target: "Queue" }
];

const width = 600, height = 500;
const svg = d3.select("#chart").attr("width", width).attr("height", height);
const color = d3.scaleOrdinal(d3.schemeTableau10);

const simulation = d3.forceSimulation(nodes)
  .force("link", d3.forceLink(links).id(d => d.id).distance(100))
  .force("charge", d3.forceManyBody().strength(-300))
  .force("center", d3.forceCenter(width / 2, height / 2));

const link = svg.selectAll("line").data(links).join("line")
  .attr("stroke", "#999").attr("stroke-width", 2);
const node = svg.selectAll("circle").data(nodes).join("circle")
  .attr("r", 20).attr("fill", (d, i) => color(i));
const label = svg.selectAll("text").data(nodes).join("text")
  .attr("text-anchor", "middle").attr("dy", 35).attr("font-size", "11px").text(d => d.id);

// Run simulation synchronously for static output
simulation.tick(300);
link.attr("x1", d => d.source.x).attr("y1", d => d.source.y)
    .attr("x2", d => d.target.x).attr("y2", d => d.target.y);
node.attr("cx", d => d.x).attr("cy", d => d.y);
label.attr("x", d => d.x).attr("y", d => d.y);
```

**Important:** For static image output, run the simulation synchronously with `simulation.tick(300)` so the layout is fully resolved before screenshot.
