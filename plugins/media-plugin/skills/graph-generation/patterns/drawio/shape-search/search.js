#!/usr/bin/env node
/**
 * CLI: Search the draw.io shape library by keywords.
 *
 * Usage:
 *   node search.js "aws lambda"
 *   node search.js "cisco router" --limit 5
 *   node search.js "pid globe valve" --json
 *
 * Returns matching shapes as JSON with {style, w, h, title} — the style
 * string goes directly into an mxCell style attribute.
 *
 * Algorithm (ported from mcp-app-server/src/shared.js):
 *   1. Normalize query (split camelCase + digit boundaries)
 *   2. Try strict AND across all terms
 *   3. If AND empty, fall back to scored OR
 *   4. Rank by match score (exact tag +1.0, Soundex-only +0.5)
 */
var fs = require("fs");
var path = require("path");

var INDEX_PATH = path.join(__dirname, "search-index.json");

function soundex(name)
{
	if (name == null || name.length === 0) return "";

	var s = [];
	var si = 1;
	var mappings = "01230120022455012603010202";
	s[0] = name[0].toUpperCase();

	for (var i = 1, l = name.length; i < l; i++)
	{
		var c = name[i].toUpperCase().charCodeAt(0) - 65;

		if (c >= 0 && c <= 25)
		{
			if (mappings[c] !== "0")
			{
				if (mappings[c] !== s[si - 1])
				{
					s[si] = mappings[c];
					si++;
				}

				if (si > 3) break;
			}
		}
	}

	while (si <= 3) { s[si] = "0"; si++; }

	return s.join("");
}

function buildTagMap(shapeIndex)
{
	var tagMap = {};

	for (var i = 0; i < shapeIndex.length; i++)
	{
		var rawTags = shapeIndex[i].tags;
		if (!rawTags) continue;

		var tokens = rawTags.toLowerCase().replace(/[\/,()]/g, " ").split(" ");
		var seen = {};

		for (var j = 0; j < tokens.length; j++)
		{
			var token = tokens[j];
			if (token.length < 2 || seen[token]) continue;
			seen[token] = true;

			if (!tagMap[token]) tagMap[token] = new Set();
			tagMap[token].add(i);

			var sx = soundex(token.replace(/\.*\d*$/, ""));

			if (sx && sx !== token && !seen[sx])
			{
				seen[sx] = true;
				if (!tagMap[sx]) tagMap[sx] = new Set();
				tagMap[sx].add(i);
			}
		}
	}

	return tagMap;
}

function splitCompoundToken(token)
{
	var parts = token.replace(/([a-z])([A-Z])/g, "$1 $2")
	                 .replace(/([a-zA-Z])(\d)/g, "$1 $2")
	                 .replace(/(\d)([a-zA-Z])/g, "$1 $2")
	                 .toLowerCase()
	                 .split(/\s+/);

	return parts.filter(function(p) { return p.length >= 2; });
}

function matchTerm(tagMap, term)
{
	var exact = new Set();
	var phonetic = new Set();
	var exactHits = tagMap[term];

	if (exactHits) exactHits.forEach(function(idx) { exact.add(idx); });

	var sx = soundex(term.replace(/\.*\d*$/, ""));

	if (sx && sx !== term)
	{
		var phoneticHits = tagMap[sx];

		if (phoneticHits)
		{
			phoneticHits.forEach(function(idx)
			{
				if (!exact.has(idx)) phonetic.add(idx);
			});
		}
	}

	return { exact: exact, phonetic: phonetic };
}

function searchShapes(shapeIndex, tagMap, query, limit)
{
	if (!query || !shapeIndex || shapeIndex.length === 0) return [];

	var rawTerms = query.toLowerCase().split(/\s+/).filter(function(t) { return t.length > 0; });
	var terms = [];
	var seen = {};

	for (var i = 0; i < rawTerms.length; i++)
	{
		var subTokens = splitCompoundToken(rawTerms[i]);

		if (subTokens.length === 0 && rawTerms[i].length >= 2)
		{
			subTokens = [rawTerms[i]];
		}

		for (var j = 0; j < subTokens.length; j++)
		{
			if (!seen[subTokens[j]])
			{
				seen[subTokens[j]] = true;
				terms.push(subTokens[j]);
			}
		}
	}

	if (terms.length === 0) return [];

	var termMatches = [];

	for (var i = 0; i < terms.length; i++)
	{
		termMatches.push(matchTerm(tagMap, terms[i]));
	}

	var andSet = null;

	for (var i = 0; i < termMatches.length; i++)
	{
		var combined = new Set();

		termMatches[i].exact.forEach(function(idx) { combined.add(idx); });
		termMatches[i].phonetic.forEach(function(idx) { combined.add(idx); });

		if (andSet === null)
		{
			andSet = combined;
		}
		else
		{
			var intersection = new Set();

			andSet.forEach(function(idx)
			{
				if (combined.has(idx)) intersection.add(idx);
			});

			andSet = intersection;
		}

		if (andSet.size === 0) break;
	}

	var scores = {};

	if (andSet && andSet.size > 0)
	{
		andSet.forEach(function(idx) { scores[idx] = 0; });

		for (var i = 0; i < termMatches.length; i++)
		{
			var exactForTerm = new Set();

			termMatches[i].exact.forEach(function(idx)
			{
				if (scores[idx] !== undefined)
				{
					scores[idx] += 1.0;
					exactForTerm.add(idx);
				}
			});

			termMatches[i].phonetic.forEach(function(idx)
			{
				if (scores[idx] !== undefined && !exactForTerm.has(idx))
				{
					scores[idx] += 0.5;
				}
			});
		}
	}
	else
	{
		for (var i = 0; i < termMatches.length; i++)
		{
			var exactForTerm = new Set();

			termMatches[i].exact.forEach(function(idx)
			{
				if (scores[idx] === undefined) scores[idx] = 0;
				scores[idx] += 1.0;
				exactForTerm.add(idx);
			});

			termMatches[i].phonetic.forEach(function(idx)
			{
				if (!exactForTerm.has(idx))
				{
					if (scores[idx] === undefined) scores[idx] = 0;
					scores[idx] += 0.5;
				}
			});
		}
	}

	var candidates = Object.keys(scores).map(function(idx)
	{
		return { idx: parseInt(idx, 10), score: scores[idx] };
	});

	candidates.sort(function(a, b)
	{
		if (b.score !== a.score) return b.score - a.score;
		var titleA = shapeIndex[a.idx].title || "";
		var titleB = shapeIndex[b.idx].title || "";
		return titleA.localeCompare(titleB);
	});

	var results = [];

	for (var i = 0; i < candidates.length && results.length < limit; i++)
	{
		var shape = shapeIndex[candidates[i].idx];

		results.push({
			style: shape.style,
			w: shape.w,
			h: shape.h,
			title: shape.title
		});
	}

	return results;
}

function main()
{
	var args = process.argv.slice(2);

	if (args.length === 0 || args.indexOf("--help") >= 0 || args.indexOf("-h") >= 0)
	{
		console.error("Usage: node search.js <query> [--limit N] [--json]");
		console.error("");
		console.error("Examples:");
		console.error("  node search.js \"aws lambda\"");
		console.error("  node search.js \"cisco router\" --limit 5");
		console.error("  node search.js \"pid globe valve\" --json");
		process.exit(args.length === 0 ? 1 : 0);
	}

	var limit = 10;
	var jsonOutput = false;
	var queryParts = [];

	for (var i = 0; i < args.length; i++)
	{
		if (args[i] === "--limit" && i + 1 < args.length)
		{
			limit = Math.min(parseInt(args[i + 1], 10) || 10, 50);
			i++;
		}
		else if (args[i] === "--json")
		{
			jsonOutput = true;
		}
		else
		{
			queryParts.push(args[i]);
		}
	}

	var query = queryParts.join(" ");

	if (!fs.existsSync(INDEX_PATH))
	{
		console.error("Error: search-index.json not found at " + INDEX_PATH);
		process.exit(1);
	}

	var shapeIndex = JSON.parse(fs.readFileSync(INDEX_PATH, "utf-8"));
	var tagMap = buildTagMap(shapeIndex);
	var results = searchShapes(shapeIndex, tagMap, query, limit);

	if (jsonOutput)
	{
		process.stdout.write(JSON.stringify(results, null, 2) + "\n");
		return;
	}

	if (results.length === 0)
	{
		console.error("No shapes found for query: " + query);
		process.exit(2);
	}

	for (var i = 0; i < results.length; i++)
	{
		var r = results[i];
		console.log((i + 1) + ". " + r.title + "  (" + r.w + "x" + r.h + ")");
		console.log("   style: " + r.style);
	}
}

module.exports = {
	searchShapes: searchShapes,
	buildTagMap: buildTagMap
};

if (require.main === module) main();
