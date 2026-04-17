/**
 * Geometric computations for edge path analysis and collision detection.
 */

var PADDING = 15; // Minimum clearance around vertices

/**
 * Compute the exit point of an edge from its source vertex.
 */
function computeExitPoint(edge, sourceRect, targetRect)
{
	var style = edge.style;

	if (style.exitX !== undefined && style.exitY !== undefined)
	{
		return {
			x: sourceRect.x + parseFloat(style.exitX) * sourceRect.w,
			y: sourceRect.y + parseFloat(style.exitY) * sourceRect.h
		};
	}

	// Default: choose side based on relative position of target
	return computeDefaultConnectionPoint(sourceRect, targetRect, true);
}

/**
 * Compute the entry point of an edge into its target vertex.
 */
function computeEntryPoint(edge, sourceRect, targetRect)
{
	var style = edge.style;

	if (style.entryX !== undefined && style.entryY !== undefined)
	{
		return {
			x: targetRect.x + parseFloat(style.entryX) * targetRect.w,
			y: targetRect.y + parseFloat(style.entryY) * targetRect.h
		};
	}

	// Default: choose side based on relative position of source
	return computeDefaultConnectionPoint(targetRect, sourceRect, false);
}

/**
 * Compute default connection point on shapeRect facing otherRect.
 * isExit=true for exit points, false for entry points.
 */
function computeDefaultConnectionPoint(shapeRect, otherRect, isExit)
{
	var srcCx = shapeRect.x + shapeRect.w / 2;
	var srcCy = shapeRect.y + shapeRect.h / 2;
	var tgtCx = otherRect.x + otherRect.w / 2;
	var tgtCy = otherRect.y + otherRect.h / 2;

	var dx = tgtCx - srcCx;
	var dy = tgtCy - srcCy;

	// Determine dominant direction
	if (Math.abs(dy) >= Math.abs(dx))
	{
		if ((isExit && dy > 0) || (!isExit && dy < 0))
		{
			// Connect from bottom
			return { x: srcCx, y: shapeRect.y + shapeRect.h };
		}
		else
		{
			// Connect from top
			return { x: srcCx, y: shapeRect.y };
		}
	}
	else
	{
		if ((isExit && dx > 0) || (!isExit && dx < 0))
		{
			// Connect from right
			return { x: shapeRect.x + shapeRect.w, y: srcCy };
		}
		else
		{
			// Connect from left
			return { x: shapeRect.x, y: srcCy };
		}
	}
}

/**
 * Compute the path segments for an edge.
 * Returns array of segments: [{from: {x,y}, to: {x,y}}, ...]
 */
function computeEdgeSegments(edge, vertices)
{
	var sourceId = edge.source;
	var targetId = edge.target;

	if (!sourceId || !targetId) return [];

	var source = vertices[sourceId];
	var target = vertices[targetId];

	if (!source || !target || !source.absRect || !target.absRect) return [];

	var edgeStyle = edge.style.edgeStyle || "";

	// Skip non-orthogonal edges (curved, entityRelation, straight)
	if (edgeStyle === "entityRelationEdgeStyle") return [];
	if (edge.style.curved === "1") return [];

	// For straight edges (no edgeStyle), compute direct line
	if (!edgeStyle || edgeStyle === "")
	{
		var exit = computeExitPoint(edge, source.absRect, target.absRect);
		var entry = computeEntryPoint(edge, source.absRect, target.absRect);
		return [{ from: exit, to: entry }];
	}

	// Orthogonal edges
	var exit = computeExitPoint(edge, source.absRect, target.absRect);
	var entry = computeEntryPoint(edge, source.absRect, target.absRect);
	var waypoints = edge.waypoints || [];

	// Build point sequence: exit → waypoints → entry
	var points = [exit];

	for (var i = 0; i < waypoints.length; i++)
	{
		points.push({ x: waypoints[i].x, y: waypoints[i].y });
	}

	points.push(entry);

	// Generate segments between consecutive points
	var segments = [];

	for (var i = 0; i < points.length - 1; i++)
	{
		segments.push({ from: points[i], to: points[i + 1] });
	}

	return segments;
}

/**
 * Check if a line segment intersects a rectangle (with padding).
 * Returns true if the segment passes through the rect interior.
 */
function segmentIntersectsRect(seg, rect, padding)
{
	if (padding === undefined) padding = 0;

	var rx = rect.x - padding;
	var ry = rect.y - padding;
	var rw = rect.w + padding * 2;
	var rh = rect.h + padding * 2;

	var x1 = seg.from.x, y1 = seg.from.y;
	var x2 = seg.to.x, y2 = seg.to.y;

	// Check if segment is approximately horizontal
	if (Math.abs(y1 - y2) < 2)
	{
		var y = (y1 + y2) / 2;
		var minX = Math.min(x1, x2);
		var maxX = Math.max(x1, x2);

		return y > ry && y < ry + rh &&
			maxX > rx && minX < rx + rw;
	}

	// Check if segment is approximately vertical
	if (Math.abs(x1 - x2) < 2)
	{
		var x = (x1 + x2) / 2;
		var minY = Math.min(y1, y2);
		var maxY = Math.max(y1, y2);

		return x > rx && x < rx + rw &&
			maxY > ry && minY < ry + rh;
	}

	// Diagonal segment: use parametric line-rectangle intersection
	return diagonalIntersectsRect(x1, y1, x2, y2, rx, ry, rw, rh);
}

function diagonalIntersectsRect(x1, y1, x2, y2, rx, ry, rw, rh)
{
	// Cohen-Sutherland style: check if line segment passes through rectangle
	var dx = x2 - x1;
	var dy = y2 - y1;

	var tMin = 0, tMax = 1;

	// Check against each edge of the rectangle
	var checks = [
		{ p: -dx, q: x1 - rx },
		{ p: dx, q: rx + rw - x1 },
		{ p: -dy, q: y1 - ry },
		{ p: dy, q: ry + rh - y1 }
	];

	for (var i = 0; i < checks.length; i++)
	{
		var p = checks[i].p, q = checks[i].q;

		if (Math.abs(p) < 0.001)
		{
			if (q < 0) return false;
		}
		else
		{
			var t = q / p;

			if (p < 0)
			{
				tMin = Math.max(tMin, t);
			}
			else
			{
				tMax = Math.min(tMax, t);
			}

			if (tMin > tMax) return false;
		}
	}

	return tMin <= tMax;
}

/**
 * Check if a point is inside a rectangle.
 */
function pointInRect(px, py, rect)
{
	return px >= rect.x && px <= rect.x + rect.w &&
		py >= rect.y && py <= rect.y + rect.h;
}

/**
 * Distance from point to line segment.
 */
function pointToSegmentDistance(px, py, x1, y1, x2, y2)
{
	var dx = x2 - x1, dy = y2 - y1;
	var lenSq = dx * dx + dy * dy;

	if (lenSq === 0) return Math.sqrt((px - x1) * (px - x1) + (py - y1) * (py - y1));

	var t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / lenSq));
	var projX = x1 + t * dx;
	var projY = y1 + t * dy;

	return Math.sqrt((px - projX) * (px - projX) + (py - projY) * (py - projY));
}

/**
 * Check if three points are approximately collinear.
 */
function areCollinear(p1, p2, p3, tolerance)
{
	if (tolerance === undefined) tolerance = 3;

	return pointToSegmentDistance(p2.x, p2.y, p1.x, p1.y, p3.x, p3.y) < tolerance;
}

/**
 * Compute the actual perimeter point for an ellipse shape.
 * Draw.io projects from center through the constraint point to the ellipse.
 * Returns null if the shape is not an ellipse.
 */
function computeEllipsePerimeterPoint(vertexStyle, rect, constraintX, constraintY)
{
	if (!vertexStyle.ellipse) return null;

	var cx = rect.x + rect.w / 2;
	var cy = rect.y + rect.h / 2;
	var a = rect.w / 2;
	var b = rect.h / 2;

	var dx = constraintX - cx;
	var dy = constraintY - cy;

	if (Math.abs(dx) < 0.01 && Math.abs(dy) < 0.01) return null;

	var t = 1 / Math.sqrt((dx / a) * (dx / a) + (dy / b) * (dy / b));

	return {
		x: cx + t * dx,
		y: cy + t * dy
	};
}

module.exports = {
	PADDING: PADDING,
	computeExitPoint: computeExitPoint,
	computeEntryPoint: computeEntryPoint,
	computeEdgeSegments: computeEdgeSegments,
	segmentIntersectsRect: segmentIntersectsRect,
	pointInRect: pointInRect,
	areCollinear: areCollinear,
	pointToSegmentDistance: pointToSegmentDistance,
	computeEllipsePerimeterPoint: computeEllipsePerimeterPoint
};
