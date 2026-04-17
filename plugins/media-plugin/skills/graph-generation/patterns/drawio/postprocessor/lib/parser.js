/**
 * Parse draw.io XML into a structured model of vertices and edges.
 */
var { DOMParser, XMLSerializer } = require("@xmldom/xmldom");

function parseStyle(styleStr)
{
	if (!styleStr) return {};
	var result = {};
	var parts = styleStr.split(";");

	for (var i = 0; i < parts.length; i++)
	{
		var part = parts[i].trim();

		if (part === "") continue;

		var eq = part.indexOf("=");

		if (eq >= 0)
		{
			result[part.substring(0, eq)] = part.substring(eq + 1);
		}
		else
		{
			result[part] = true;
		}
	}

	return result;
}

function serializeStyle(styleObj)
{
	var parts = [];

	for (var key in styleObj)
	{
		if (styleObj[key] === true)
		{
			parts.push(key);
		}
		else
		{
			parts.push(key + "=" + styleObj[key]);
		}
	}

	return parts.join(";") + ";";
}

function parseXml(xmlString)
{
	var doc = new DOMParser().parseFromString(xmlString, "text/xml");
	var cells = doc.getElementsByTagName("mxCell");
	var cellMap = {};
	var vertices = {};
	var edges = {};

	// First pass: index all cells
	for (var i = 0; i < cells.length; i++)
	{
		var cell = cells[i];
		var id = cell.getAttribute("id");

		if (!id) continue;

		var geo = cell.getElementsByTagName("mxGeometry")[0];
		var style = parseStyle(cell.getAttribute("style") || "");
		var parent = cell.getAttribute("parent") || "0";

		cellMap[id] = {
			id: id,
			element: cell,
			parent: parent,
			style: style,
			value: cell.getAttribute("value") || "",
			isVertex: cell.getAttribute("vertex") === "1",
			isEdge: cell.getAttribute("edge") === "1",
			geometry: null,
			source: cell.getAttribute("source"),
			target: cell.getAttribute("target")
		};

		if (geo)
		{
			cellMap[id].geometry = {
				x: parseFloat(geo.getAttribute("x")) || 0,
				y: parseFloat(geo.getAttribute("y")) || 0,
				width: parseFloat(geo.getAttribute("width")) || 0,
				height: parseFloat(geo.getAttribute("height")) || 0,
				relative: geo.getAttribute("relative") === "1"
			};

			// Parse waypoints
			var arrays = geo.getElementsByTagName("Array");

			for (var j = 0; j < arrays.length; j++)
			{
				if (arrays[j].getAttribute("as") === "points")
				{
					var points = arrays[j].getElementsByTagName("mxPoint");
					var waypoints = [];

					for (var k = 0; k < points.length; k++)
					{
						waypoints.push({
							x: parseFloat(points[k].getAttribute("x")) || 0,
							y: parseFloat(points[k].getAttribute("y")) || 0,
							element: points[k]
						});
					}

					cellMap[id].waypoints = waypoints;
					cellMap[id].waypointArray = arrays[j];
				}
			}

			cellMap[id].geoElement = geo;
		}
	}

	// Second pass: compute absolute positions and classify
	for (var id in cellMap)
	{
		var cell = cellMap[id];

		if (cell.isVertex && cell.geometry && !cell.geometry.relative)
		{
			cell.absRect = computeAbsoluteRect(cell, cellMap);
			vertices[id] = cell;
		}
		else if (cell.isEdge)
		{
			if (!cell.waypoints) cell.waypoints = [];
			edges[id] = cell;
		}
	}

	return {
		doc: doc,
		cellMap: cellMap,
		vertices: vertices,
		edges: edges
	};
}

function computeAbsoluteRect(cell, cellMap)
{
	var x = cell.geometry.x;
	var y = cell.geometry.y;
	var w = cell.geometry.width;
	var h = cell.geometry.height;
	var parentId = cell.parent;

	while (parentId && parentId !== "0" && parentId !== "1")
	{
		var parentCell = cellMap[parentId];

		if (parentCell && parentCell.geometry && !parentCell.geometry.relative)
		{
			x += parentCell.geometry.x;
			y += parentCell.geometry.y;
		}

		parentId = parentCell ? parentCell.parent : null;
	}

	return { x: x, y: y, w: w, h: h };
}

/**
 * Returns top-level vertices only (those with parent "1" or whose parent
 * is the root). These are the shapes we check for collisions against.
 * Child rows inside tables, text inside swimlanes, etc. are excluded.
 */
function getTopLevelVertices(model)
{
	var result = {};

	for (var id in model.vertices)
	{
		var v = model.vertices[id];

		if (v.parent === "1")
		{
			result[id] = v;
		}
	}

	return result;
}

/**
 * Returns container vertices (swimlanes, tables) — those that have
 * children with vertex=1.
 */
function getContainerVertices(model)
{
	var containers = {};
	var childParents = {};

	for (var id in model.vertices)
	{
		var v = model.vertices[id];

		if (v.parent !== "0" && v.parent !== "1")
		{
			childParents[v.parent] = true;
		}
	}

	for (var id in model.vertices)
	{
		if (childParents[id])
		{
			containers[id] = model.vertices[id];
		}
	}

	return containers;
}

function serializeXml(doc)
{
	return new XMLSerializer().serializeToString(doc);
}

module.exports = {
	parseXml: parseXml,
	parseStyle: parseStyle,
	serializeStyle: serializeStyle,
	serializeXml: serializeXml,
	getTopLevelVertices: getTopLevelVertices,
	getContainerVertices: getContainerVertices,
	computeAbsoluteRect: computeAbsoluteRect
};
