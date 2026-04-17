#!/usr/bin/env node
/**
 * CLI: Post-process a single draw.io XML file.
 * Usage: node postprocess.js <input.drawio> [output.drawio]
 */
var fs = require("fs");
var path = require("path");
var parser = require("./lib/parser");
var metrics = require("./lib/metrics");
var optimizer = require("./lib/optimizer");

function postprocess(xmlString)
{
	var model = parser.parseXml(xmlString);

	// Compute before metrics
	var before = metrics.computeAllMetrics(model);

	// Run optimization passes in order
	var simplifyChanges = optimizer.simplifyEdges(model.doc, model);
	var collisionChanges = optimizer.fixCollisions(model.doc, model);

	// Second simplification pass: clean up waypoints added by collision fixes
	var simplifyChanges2 = optimizer.simplifyEdges(model.doc, model);
	simplifyChanges += simplifyChanges2;

	// Straighten approach: ensure terminal segments are long enough
	var straightenChanges = optimizer.straightenApproach(model.doc, model);

	// Reparse after modifications to get accurate after metrics
	var outputXml = parser.serializeXml(model.doc);
	var afterModel = parser.parseXml(outputXml);
	var after = metrics.computeAllMetrics(afterModel);

	// Guard: revert if post-processing made things worse
	// (e.g. collision fixer adding detours that create new intersections
	// in sequence diagrams where edges naturally cross participant boxes)
	if (before.intersections > 0 && after.intersections >= before.intersections)
	{
		return {
			xml: xmlString,
			before: before,
			after: before,
			changes: { simplified: 0, collisionsFixed: 0, straightened: 0 }
		};
	}

	return {
		xml: outputXml,
		before: before,
		after: after,
		changes: {
			simplified: simplifyChanges,
			collisionsFixed: collisionChanges,
			straightened: straightenChanges
		}
	};
}

function main()
{
	var args = process.argv.slice(2);

	if (args.length === 0)
	{
		console.error("Usage: node postprocess.js <input.drawio> [output.drawio]");
		process.exit(1);
	}

	var inputPath = path.resolve(args[0]);
	var outputPath = args[1] ? path.resolve(args[1]) : null;

	var xmlString = fs.readFileSync(inputPath, "utf-8");
	var result = postprocess(xmlString);

	console.log("\n=== Post-Processing Report ===");
	console.log("File: " + path.basename(inputPath));
	console.log("");
	console.log("Before:");
	console.log("  Intersections:         " + result.before.intersections);
	console.log("  Waypoints:             " + result.before.waypoints);
	console.log("  Segments:              " + result.before.segments);
	console.log("  Alignment near-misses: " + result.before.alignmentNearMisses);
	console.log("  Unnecessary waypoints: " + result.before.unnecessaryWaypoints);
	console.log("");
	console.log("Changes applied:");
	console.log("  Waypoints simplified:  " + result.changes.simplified);
	console.log("  Collisions fixed:      " + result.changes.collisionsFixed);
	console.log("  Approaches straightened: " + result.changes.straightened);
	console.log("");
	console.log("After:");
	console.log("  Intersections:         " + result.after.intersections);
	console.log("  Waypoints:             " + result.after.waypoints);
	console.log("  Segments:              " + result.after.segments);
	console.log("  Alignment near-misses: " + result.after.alignmentNearMisses);
	console.log("  Unnecessary waypoints: " + result.after.unnecessaryWaypoints);

	if (outputPath)
	{
		fs.writeFileSync(outputPath, result.xml, "utf-8");
		console.log("\nOutput written to: " + outputPath);
	}
	else
	{
		// Write to stdout
		process.stdout.write(result.xml);
	}
}

module.exports = { postprocess: postprocess };

if (require.main === module)
{
	main();
}
