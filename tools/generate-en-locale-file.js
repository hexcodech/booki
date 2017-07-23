const fs = require("fs");
const path = require("path");
const findInFiles = require("find-in-files");
const mappings = require("../locales/booki-en-US.json");

findInFiles
	.find(/__\(["'](.+)["']\)/, path.resolve(__dirname, "../src"))
	.then(results => {
		const json = {},
			mappingValues = Object.values(mappings),
			strings = [
				...new Set( //unique
					[].concat(
						//flatten
						...Object.values(results).map(result => {
							//only get strings
							return result.matches.map(match => {
								//only get the the substring
								return match.substring(4, match.length - 2);
							});
						}),
						mappingValues //add previous strings
					)
				)
			].sort(); //sort

		strings.forEach(string => {
			json[string] = string;
		});

		fs.writeFile(
			path.resolve(__dirname, "../locales/booki-en-US.json"),
			JSON.stringify(json),
			"utf8",
			() => {
				console.log(
					"Done writing " +
						strings.length +
						" strings in total (" +
						(strings.length - mappingValues.length) +
						" new, " +
						mappingValues.length +
						" old)"
				);
			}
		);
	});
