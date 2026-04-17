/**
 * Compute quality metrics for draw.io XML diagrams.
 */
var parser = require("./parser");
var geometry = require("./geometry");

/**
 * Count edge-vertex intersections (edge segments passing through
 * non-source/non-target vertices).
 */
function countIntersections(model)
{
	var collisions = [];
	var topVertices = parser.getTopLevelVertices(model);
	var containers = parser.getContainerVertices(model);

	// Merge: check collisions against top-level + container vertices
	var checkVertices = {};

	for (var id in topVertices)
	{
		checkVertices[id] = topVertices[id];
	}

	for (var id in containers)
	{
		checkVertices[id] = containers[id];
	}

	for (var edgeId in model.edges)
	{
		var edge = model.edges[edgeId];
		var segments = geometry.computeEdgeSegments(edge, model.vertices);

		for (var i = 0; i < segments.length; i++)
		{
			for (var vId in checkVertices)
			{
				// Skip source and target vertices
				if (vId === edge.source || vId === edge.target) continue;

				// Skip vertices that are parents of source/target
				// (containers around the connected shapes)
				var sourceCell = model.cellMap[edge.source];
				var targetCell = model.cellMap[edge.target];

				if (sourceCell && sourceCell.parent === vId) continue;
				if (targetCell && targetCell.parent === vId) continue;

				var vertex = checkVertices[vId];

				if (!vertex.absRect) continue;

				if (geometry.segmentIntersectsRect(segments[i], vertex.absRect, 0))
				{
					collisions.push({
						edgeId: edgeId,
						edgeLabel: edge.value || "",
						vertexId: vId,
						vertexLabel: vertex.value || "",
						segmentIndex: i,
						segment: segments[i]
					});
				}
			}
		}
	}

	return collisions;
}

/**
 * Count total waypoints across all edges.
 */
function countWaypoints(model)
{
	var total = 0;

	for (var edgeId in model.edges)
	{
		total += model.edges[edgeId].waypoints.length;
	}

	return total;
}

/**
 * Count total edge segments.
 */
function countSegments(model)
{
	var total = 0;

	for (var edgeId in model.edges)
	{
		var segments = geometry.computeEdgeSegments(model.edges[edgeId], model.vertices);
		total += segments.length;
	}

	return total;
}

/**
 * Measure alignment quality. Returns number of "near-miss" alignments:
 * pairs of top-level vertices that are within tolerance but not exactly
 * aligned on X or Y center.
 */
function measureAlignment(model)
{
	var TOLERANCE = 15;
	var topVertices = parser.getTopLevelVertices(model);
	var ids = Object.keys(topVertices);
	var nearMisses = 0;

	for (var i = 0; i < ids.length; i++)
	{
		for (var j = i + 1; j < ids.length; j++)
		{
			var a = topVertices[ids[i]].absRect;
			var b = topVertices[ids[j]].absRect;

			if (!a || !b) continue;

			// Check X center alignment
			var aCx = a.x + a.w / 2;
			var bCx = b.x + b.w / 2;
			var dx = Math.abs(aCx - bCx);

			if (dx > 0.5 && dx < TOLERANCE) nearMisses++;

			// Check left edge alignment
			var dLeft = Math.abs(a.x - b.x);

			if (dLeft > 0.5 && dLeft < TOLERANCE) nearMisses++;

			// Check Y center alignment
			var aCy = a.y + a.h / 2;
			var bCy = b.y + b.h / 2;
			var dy = Math.abs(aCy - bCy);

			if (dy > 0.5 && dy < TOLERANCE) nearMisses++;
		}
	}

	return nearMisses;
}

/**
 * Count unnecessary waypoints: points that are collinear with their
 * neighbors and could be removed without changing the path.
 */
function countUnnecessaryWaypoints(model)
{
	var count = 0;

	for (var edgeId in model.edges)
	{
		var edge = model.edges[edgeId];

		if (edge.waypoints.length < 2) continue;

		var source = model.vertices[edge.source];
		var target = model.vertices[edge.target];

		if (!source || !target || !source.absRect || !target.absRect) continue;

		var exit = geometry.computeExitPoint(edge, source.absRect, target.absRect);
		var entry = geometry.computeEntryPoint(edge, source.absRect, target.absRect);

		// Build full point sequence
		var points = [exit];

		for (var i = 0; i < edge.waypoints.length; i++)
		{
			points.push({ x: edge.waypoints[i].x, y: edge.waypoints[i].y });
		}

		points.push(entry);

		// Check each interior waypoint for collinearity
		for (var i = 1; i < points.length - 1; i++)
		{
			if (geometry.areCollinear(points[i - 1], points[i], points[i + 1], 5))
			{
				count++;
			}
		}

		// Check for trivial jogs: waypoints that are very close to each other
		for (var i = 0; i < edge.waypoints.length - 1; i++)
		{
			var wp1 = edge.waypoints[i];
			var wp2 = edge.waypoints[i + 1];
			var dist = Math.sqrt(
				(wp1.x - wp2.x) * (wp1.x - wp2.x) +
				(wp1.y - wp2.y) * (wp1.y - wp2.y)
			);

			if (dist < 10) count++;
		}
	}

	return count;
}

/**
 * Compute all metrics for a model.
 */
function computeAllMetrics(model)
{
	var collisions = countIntersections(model);

	return {
		intersections: collisions.length,
		collisionDetails: collisions,
		waypoints: countWaypoints(model),
		segments: countSegments(model),
		alignmentNearMisses: measureAlignment(model),
		unnecessaryWaypoints: countUnnecessaryWaypoints(model)
	};
}

module.exports = {
	countIntersections: countIntersections,
	countWaypoints: countWaypoints,
	countSegments: countSegments,
	measureAlignment: measureAlignment,
	countUnnecessaryWaypoints: countUnnecessaryWaypoints,
	computeAllMetrics: computeAllMetrics
};
