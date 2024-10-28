const archiver = require('archiver'),
	fs = require('fs');

let archive,
	archives = [],
	cmd = String(process.argv[3] || '')
		.trim()
		.toLowerCase(),
	dir = String(process.argv[2]).trim().toLowerCase(),
	outputSource,
	outputSources = [],
	outputStream,
	outputStreams = [];

if (!cmd || cmd === 'shared') {
	archives.push(
		archiver('zip', {
			zlib: { level: 9 }, // Sets the compression level. (9 is best)
		}),
	);
	outputSources.push(__dirname + '/../assets/shared');
	outputStreams.push(fs.createWriteStream(__dirname + '/../../../' + dir + '/dirt-engine-assets-s'));
}
if (!cmd || cmd === 'ui') {
	archives.push(
		archiver('zip', {
			zlib: { level: 9 }, // Sets the compression level. (9 is best)
		}),
	);
	outputSources.push(__dirname + '/../assets/ui');
	outputStreams.push(fs.createWriteStream(__dirname + '/../../../' + dir + '/dirt-engine-assets-u'));
}
if (!cmd || cmd === 'video') {
	archives.push(
		archiver('zip', {
			zlib: { level: 9 }, // Sets the compression level. (9 is best)
		}),
	);
	outputSources.push(__dirname + '/../assets/video');
	outputStreams.push(fs.createWriteStream(__dirname + '/../../../' + dir + '/dirt-engine-assets-v'));
}

for (let i = 0; i < outputStreams.length; i++) {
	archive = archives[i];
	outputSource = outputSources[i];
	outputStream = outputStreams[i];

	archive.on('error', function (err) {
		console.error('error', err);
		throw err;
	});
	archive.on('warning', function (err) {
		if (err.code === 'ENOENT') {
			// log warning
			console.warn('warning', err);
		} else {
			// throw error
			console.error('warning-err', err);
			throw err;
		}
	});

	archive.pipe(outputStream);
	archive.directory(outputSource, false);
	archive.finalize();
}
