var fs = require("fs");
var webResourceInliner = require("web-resource-inliner");

// Read HTML file
var html = fs.readFileSync("./dist/working/connect.html", "utf8");
if(process.platform === "win32") {
	html = html.replace(/\r\n/g, "\n");
}

// Inline it
webResourceInliner.html({
	fileContent: html,
	relativeTo: "./dist/working",
}, function(error, results) {
	if(error) {
		throw new Error(error);
	}else {
		fs.writeFile('./dist/connect.html', results, function(error) {
		  if (error) {
			throw new Error(error);
		  }
		});
	}
});