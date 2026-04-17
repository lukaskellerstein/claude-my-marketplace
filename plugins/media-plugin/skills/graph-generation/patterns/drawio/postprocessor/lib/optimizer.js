/**
 * Optimization passes for draw.io XML diagrams.
 */
var parser = require("./parser");
var geometry = require("./geometry");

// =================================================================
// Pass 1: Edge simplification — remove unnecessary waypoints
// =================================================================

function simplifyEdges(doc, model)
{
	var changes = 0;

	for (var edgeId in model.edges)
	{
		var edge = model.edges[edgeId];

		if (edge.waypoints.length === 0) continue;

		var source = model.vertices[edge.source];
		var target = model.vertices[edge.target];

		if (!source || !target || !source.absRect || !target.absRect) continue;

		var exit = geometry.computeExitPoint(edge, source.absRect, target.absRect);
		var entry = geometry.computeEntryPoint(edge, source.absRect, target.absRect);

		// Build full path: exit → waypoints → entry
		var points = [exit];

		for (var i = 0; i < edge.waypoints.length; i++)
		{
			points.push({ x: edge.waypoints[i].x, y: edge.waypoints[i].y, idx: i });
		}

		points.push(entry);

		// Mark waypoints to remove
		var toRemove = [];

		// Remove collinear waypoints
		for (var i = 1; i < points.length - 1; i++)
		{
			if (points[i].idx !== undefined &&
				geometry.areCollinear(points[i - 1], points[i], points[i + 1], 3))
			{
				toRemove.push(points[i].idx);
			}
		}

		// Remove backtrack waypoints: three consecutive points on same axis
		// where middle point overshoots beyond the range of the outer two
		// (e.g. path goes down to y=795 then back up to y=740)
		var AXIS_TOL = 3;

		for (var i = 1; i < points.length - 1; i++)
		{
			if (points[i].idx === undefined) continue;
			if (toRemove.indexOf(points[i].idx) >= 0) continue;

			var prev = points[i - 1];
			var curr = points[i];
			var next = points[i + 1];

			// Same x-axis: check for y backtrack
			if (Math.abs(prev.x - curr.x) < AXIS_TOL &&
				Math.abs(curr.x - next.x) < AXIS_TOL)
			{
				var minY = Math.min(prev.y, next.y);
				var maxY = Math.max(prev.y, next.y);

				if (curr.y < minY - AXIS_TOL || curr.y > maxY + AXIS_TOL)
				{
					toRemove.push(points[i].idx);
				}
			}

			// Same y-axis: check for x backtrack
			if (Math.abs(prev.y - curr.y) < AXIS_TOL &&
				Math.abs(curr.y - next.y) < AXIS_TOL)
			{
				var minX = Math.min(prev.x, next.x);
				var maxX = Math.max(prev.x, next.x);

				if (curr.x < minX - AXIS_TOL || curr.x > maxX + AXIS_TOL)
				{
					toRemove.push(points[i].idx);
				}
			}
		}

		// Remove trivial jogs (waypoints very close together on same axis)
		for (var i = 0; i < edge.waypoints.length - 1; i++)
		{
			if (toRemove.indexOf(i) >= 0 || toRemove.indexOf(i + 1) >= 0) continue;

			var wp1 = edge.waypoints[i];
			var wp2 = edge.waypoints[i + 1];
			var dist = Math.sqrt(
				(wp1.x - wp2.x) * (wp1.x - wp2.x) +
				(wp1.y - wp2.y) * (wp1.y - wp2.y)
			);

			if (dist < 8)
			{
				toRemove.push(i + 1);
			}
		}

		// Deduplicate and sort descending
		toRemove = toRemove.filter(function(val, idx, arr) { return arr.indexOf(val) === idx; });
		toRemove.sort(function(a, b) { return b - a; });

		for (var i = 0; i < toRemove.length; i++)
		{
			var idx = toRemove[i];
			var wp = edge.waypoints[idx];

			if (wp.element && wp.element.parentNode)
			{
				wp.element.parentNode.removeChild(wp.element);
				changes++;
			}
		}

		// Remove from model (reverse order)
		for (var i = 0; i < toRemove.length; i++)
		{
			edge.waypoints.splice(toRemove[i], 1);
		}

		// If all waypoints removed, clean up the Array element
		if (edge.waypoints.length === 0 && edge.waypointArray)
		{
			edge.waypointArray.parentNode.removeChild(edge.waypointArray);
			edge.waypointArray = null;
		}
	}

	return changes;
}

// =================================================================
// Pass 2: Collision fixing — reroute edges around vertices
// =================================================================

function fixCollisions(doc, model)
{
	var metrics = require("./metrics");
	var collisions = metrics.countIntersections(model);
	var changes = 0;

	if (collisions.length === 0) return 0;

	// Group collisions by edge
	var byEdge = {};

	for (var i = 0; i < collisions.length; i++)
	{
		var c = collisions[i];

		if (!byEdge[c.edgeId])
		{
			byEdge[c.edgeId] = [];
		}

		byEdge[c.edgeId].push(c);
	}

	for (var edgeId in byEdge)
	{
		var edge = model.edges[edgeId];
		var edgeCollisions = byEdge[edgeId];
		var source = model.vertices[edge.source];
		var target = model.vertices[edge.target];

		if (!source || !target || !source.absRect || !target.absRect) continue;

		var exit = geometry.computeExitPoint(edge, source.absRect, target.absRect);
		var entry = geometry.computeEntryPoint(edge, source.absRect, target.absRect);

		// Process one collision at a time, re-check after each fix
		for (var i = 0; i < edgeCollisions.length; i++)
		{
			var collision = edgeCollisions[i];
			var vertex = model.vertices[collision.vertexId];

			if (!vertex || !vertex.absRect) continue;

			var seg = collision.segment;
			var vRect = vertex.absRect;

			// Detect terminal segments (first/last) to preserve approach direction
			var terminalInfo = null;
			var isLast = Math.abs(seg.to.x - entry.x) < 2 && Math.abs(seg.to.y - entry.y) < 2;
			var isFirst = Math.abs(seg.from.x - exit.x) < 2 && Math.abs(seg.from.y - exit.y) < 2;

			if (isLast)
			{
				terminalInfo = { isLast: true, point: entry };
			}
			else if (isFirst)
			{
				terminalInfo = { isFirst: true, point: exit };
			}

			var fixed = rerouteAroundVertex(doc, edge, model, seg, vRect, collision.segmentIndex, terminalInfo);

			if (fixed)
			{
				changes++;

				// Verify fix didn't introduce new collisions for this edge
				var newCollisions = metrics.countIntersections(model);
				var edgeNew = newCollisions.filter(function(c) { return c.edgeId === edgeId; });

				if (edgeNew.length > edgeCollisions.length)
				{
					// Regression - revert would be complex, just note it
					// The validation pass below will catch remaining issues
				}
			}
		}
	}

	return changes;
}

function rerouteAroundVertex(doc, edge, model, segment, vRect, segIdx, terminalInfo)
{
	var isHorizontal = Math.abs(segment.from.y - segment.to.y) < 2;
	var isVertical = Math.abs(segment.from.x - segment.to.x) < 2;

	if (!isHorizontal && !isVertical)
	{
		// Diagonal segment: skip for now
		return false;
	}

	var clearance = geometry.PADDING + 5;

	if (isVertical)
	{
		var x = (segment.from.x + segment.to.x) / 2;
		var leftX = vRect.x - clearance;
		var rightX = vRect.x + vRect.w + clearance;
		var newX = (Math.abs(x - leftX) <= Math.abs(x - rightX)) ? leftX : rightX;

		// Check if segment endpoints are outside vertex y-range → compact 2-point detour
		var fromOutside = segment.from.y < vRect.y - clearance || segment.from.y > vRect.y + vRect.h + clearance;
		var toOutside = segment.to.y < vRect.y - clearance || segment.to.y > vRect.y + vRect.h + clearance;

		if (fromOutside && toOutside)
		{
			// Terminal segment: use 3-point detour to preserve approach direction
			if (terminalInfo && terminalInfo.isLast)
			{
				var termY = (terminalInfo.point.y < vRect.y + vRect.h / 2)
					? vRect.y - clearance
					: vRect.y + vRect.h + clearance;

				return insertDetourWaypoints(doc, edge, model, segIdx,
					[
						{ x: newX, y: segment.from.y },
						{ x: newX, y: termY },
						{ x: segment.to.x, y: termY }
					]);
			}

			if (terminalInfo && terminalInfo.isFirst)
			{
				var termY = (terminalInfo.point.y < vRect.y + vRect.h / 2)
					? vRect.y - clearance
					: vRect.y + vRect.h + clearance;

				return insertDetourWaypoints(doc, edge, model, segIdx,
					[
						{ x: segment.from.x, y: termY },
						{ x: newX, y: termY },
						{ x: newX, y: segment.to.y }
					]);
			}

			return insertDetourWaypoints(doc, edge, model, segIdx,
				[
					{ x: newX, y: segment.from.y },
					{ x: newX, y: segment.to.y }
				]);
		}

		// Full 4-point rectangular detour
		var goingDown = segment.from.y < segment.to.y;
		var approachY = vRect.y - clearance;
		var departY = vRect.y + vRect.h + clearance;

		if (!goingDown)
		{
			var tmp = approachY;
			approachY = departY;
			departY = tmp;
		}

		return insertDetourWaypoints(doc, edge, model, segIdx,
			[
				{ x: x, y: approachY },
				{ x: newX, y: approachY },
				{ x: newX, y: departY },
				{ x: x, y: departY }
			]);
	}
	else
	{
		var y = (segment.from.y + segment.to.y) / 2;
		var topY = vRect.y - clearance;
		var botY = vRect.y + vRect.h + clearance;
		var newY = (Math.abs(y - topY) <= Math.abs(y - botY)) ? topY : botY;

		// Check if segment endpoints are outside vertex x-range → compact 2-point detour
		var fromOutside = segment.from.x < vRect.x - clearance || segment.from.x > vRect.x + vRect.w + clearance;
		var toOutside = segment.to.x < vRect.x - clearance || segment.to.x > vRect.x + vRect.w + clearance;

		if (fromOutside && toOutside)
		{
			// Terminal segment: use 3-point detour to preserve approach direction
			if (terminalInfo && terminalInfo.isLast)
			{
				var termX = (terminalInfo.point.x < vRect.x + vRect.w / 2)
					? vRect.x - clearance
					: vRect.x + vRect.w + clearance;

				return insertDetourWaypoints(doc, edge, model, segIdx,
					[
						{ x: segment.from.x, y: newY },
						{ x: termX, y: newY },
						{ x: termX, y: segment.to.y }
					]);
			}

			if (terminalInfo && terminalInfo.isFirst)
			{
				var termX = (terminalInfo.point.x < vRect.x + vRect.w / 2)
					? vRect.x - clearance
					: vRect.x + vRect.w + clearance;

				return insertDetourWaypoints(doc, edge, model, segIdx,
					[
						{ x: termX, y: segment.from.y },
						{ x: termX, y: newY },
						{ x: segment.to.x, y: newY }
					]);
			}

			return insertDetourWaypoints(doc, edge, model, segIdx,
				[
					{ x: segment.from.x, y: newY },
					{ x: segment.to.x, y: newY }
				]);
		}

		// Full 4-point detour with correct approach/depart ordering
		var goingRight = segment.from.x < segment.to.x;
		var approachX, departX;

		if (goingRight)
		{
			approachX = vRect.x - clearance;
			departX = vRect.x + vRect.w + clearance;
		}
		else
		{
			approachX = vRect.x + vRect.w + clearance;
			departX = vRect.x - clearance;
		}

		return insertDetourWaypoints(doc, edge, model, segIdx,
			[
				{ x: approachX, y: y },
				{ x: approachX, y: newY },
				{ x: departX, y: newY },
				{ x: departX, y: y }
			]);
	}
}

function insertDetourWaypoints(doc, edge, model, segIdx, newPoints)
{
	var geoElement = edge.geoElement;

	if (!geoElement) return false;

	// Ensure Array element exists for waypoints
	var arrayEl = edge.waypointArray;

	if (!arrayEl)
	{
		arrayEl = doc.createElement("Array");
		arrayEl.setAttribute("as", "points");
		geoElement.appendChild(arrayEl);
		edge.waypointArray = arrayEl;
	}

	// Insertion position: before waypoint[segIdx] (or at end)
	var insertBeforeIdx = segIdx;
	var newWaypoints = [];

	for (var i = 0; i < newPoints.length; i++)
	{
		var pt = newPoints[i];
		var mxPoint = doc.createElement("mxPoint");
		mxPoint.setAttribute("x", String(Math.round(pt.x)));
		mxPoint.setAttribute("y", String(Math.round(pt.y)));

		if (insertBeforeIdx < edge.waypoints.length)
		{
			arrayEl.insertBefore(mxPoint, edge.waypoints[insertBeforeIdx].element);
		}
		else
		{
			arrayEl.appendChild(mxPoint);
		}

		newWaypoints.push({
			x: Math.round(pt.x),
			y: Math.round(pt.y),
			element: mxPoint
		});
	}

	// Update model waypoints array
	var args = [insertBeforeIdx, 0].concat(newWaypoints);
	Array.prototype.splice.apply(edge.waypoints, args);

	return true;
}

// =================================================================
// Pass 3: Straighten approach — ensure terminal segments are long
// enough that rounded corners don't visibly bend the arrow,
// and fix ellipse perimeter angle offsets
// =================================================================

function straightenApproach(doc, model)
{
	var MIN_APPROACH = 100; // Minimum straight distance before entry / after exit
	var MIN_PERPENDICULAR = 30; // Don't shrink perpendicular segment below this
	var changes = 0;

	for (var edgeId in model.edges)
	{
		var edge = model.edges[edgeId];

		if (edge.waypoints.length < 2) continue;

		var source = model.vertices[edge.source];
		var target = model.vertices[edge.target];

		if (!source || !target || !source.absRect || !target.absRect) continue;

		var exit = geometry.computeExitPoint(edge, source.absRect, target.absRect);
		var entry = geometry.computeEntryPoint(edge, source.absRect, target.absRect);

		// Check entry approach (last segment)
		changes += straightenTerminal(edge, entry,
			edge.waypoints.length - 1, edge.waypoints.length - 2,
			edge.waypoints.length >= 3 ? edge.waypoints[edge.waypoints.length - 3] : exit,
			MIN_APPROACH, MIN_PERPENDICULAR, model);

		// Check exit departure (first segment)
		changes += straightenTerminal(edge, exit,
			0, 1,
			edge.waypoints.length >= 3 ? edge.waypoints[2] : entry,
			MIN_APPROACH, MIN_PERPENDICULAR, model);

		// Fix ellipse perimeter angle: adjust last waypoint to match
		// actual perimeter y/x so approach is truly horizontal/vertical
		changes += fixEllipseApproach(edge, target, entry, true);
		changes += fixEllipseApproach(edge, source, exit, false);
	}

	return changes;
}

function straightenTerminal(edge, terminalPoint, wpIdx, adjIdx, refPoint, minApproach, minPerp, model)
{
	var wp = edge.waypoints[wpIdx];
	var adj = edge.waypoints[adjIdx];

	if (!wp || !adj) return 0;

	// Horizontal approach: wp and terminal have same y
	if (Math.abs(wp.y - terminalPoint.y) < 3)
	{
		var dist = Math.abs(wp.x - terminalPoint.x);

		if (dist >= minApproach || dist < 1) return 0;

		var direction = (terminalPoint.x > wp.x) ? 1 : -1;
		var newX = terminalPoint.x - direction * minApproach;

		// If adj forms a vertical corridor (same x), move both
		var moveAdj = Math.abs(adj.x - wp.x) < 3;

		if (moveAdj)
		{
			var newPerpDist = Math.abs(refPoint.x - newX);

			if (newPerpDist < minPerp) return 0;
		}

		// Check that new positions don't create vertex collisions
		var newAdjX = moveAdj ? newX : adj.x;
		var segments = [
			{ from: { x: refPoint.x, y: refPoint.y }, to: { x: newAdjX, y: adj.y } },
			{ from: { x: newAdjX, y: adj.y }, to: { x: newX, y: wp.y } },
			{ from: { x: newX, y: wp.y }, to: terminalPoint }
		];

		if (wouldCollide(segments, edge, model)) return 0;

		if (moveAdj)
		{
			adj.x = newX;
			adj.element.setAttribute("x", String(Math.round(newX)));
		}

		wp.x = newX;
		wp.element.setAttribute("x", String(Math.round(newX)));

		return 1;
	}

	// Vertical approach: wp and terminal have same x
	if (Math.abs(wp.x - terminalPoint.x) < 3)
	{
		var dist = Math.abs(wp.y - terminalPoint.y);

		if (dist >= minApproach || dist < 1) return 0;

		var direction = (terminalPoint.y > wp.y) ? 1 : -1;
		var newY = terminalPoint.y - direction * minApproach;

		var moveAdj = Math.abs(adj.y - wp.y) < 3;

		if (moveAdj)
		{
			var newPerpDist = Math.abs(refPoint.y - newY);

			if (newPerpDist < minPerp) return 0;
		}

		var newAdjY = moveAdj ? newY : adj.y;
		var segments = [
			{ from: { x: refPoint.x, y: refPoint.y }, to: { x: adj.x, y: newAdjY } },
			{ from: { x: adj.x, y: newAdjY }, to: { x: wp.x, y: newY } },
			{ from: { x: wp.x, y: newY }, to: terminalPoint }
		];

		if (wouldCollide(segments, edge, model)) return 0;

		if (moveAdj)
		{
			adj.y = newY;
			adj.element.setAttribute("y", String(Math.round(newY)));
		}

		wp.y = newY;
		wp.element.setAttribute("y", String(Math.round(newY)));

		return 1;
	}

	return 0;
}

function fixEllipseApproach(edge, vertex, connectionPoint, isEntry)
{
	if (!vertex || !vertex.absRect || !vertex.style) return 0;

	var perimeterPt = geometry.computeEllipsePerimeterPoint(
		vertex.style, vertex.absRect, connectionPoint.x, connectionPoint.y);

	if (!perimeterPt) return 0;

	var wpIdx = isEntry ? edge.waypoints.length - 1 : 0;
	var wp = edge.waypoints[wpIdx];

	if (!wp) return 0;

	// Horizontal approach: waypoint and connection point have same y
	if (Math.abs(wp.y - connectionPoint.y) < 3)
	{
		var yOffset = Math.abs(perimeterPt.y - connectionPoint.y);

		if (yOffset < 1) return 0; // Negligible

		wp.y = Math.round(perimeterPt.y);
		wp.element.setAttribute("y", String(wp.y));

		return 1;
	}

	// Vertical approach: waypoint and connection point have same x
	if (Math.abs(wp.x - connectionPoint.x) < 3)
	{
		var xOffset = Math.abs(perimeterPt.x - connectionPoint.x);

		if (xOffset < 1) return 0;

		wp.x = Math.round(perimeterPt.x);
		wp.element.setAttribute("x", String(wp.x));

		return 1;
	}

	return 0;
}

function wouldCollide(segments, edge, model)
{
	var topVertices = parser.getTopLevelVertices(model);

	for (var vId in topVertices)
	{
		if (vId === edge.source || vId === edge.target) continue;

		var v = topVertices[vId];

		if (!v.absRect) continue;

		for (var s = 0; s < segments.length; s++)
		{
			if (geometry.segmentIntersectsRect(segments[s], v.absRect, 0))
			{
				return true;
			}
		}
	}

	return false;
}

module.exports = {
	simplifyEdges: simplifyEdges,
	fixCollisions: fixCollisions,
	straightenApproach: straightenApproach
};
