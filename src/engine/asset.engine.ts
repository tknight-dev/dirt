const JSZip = require('JSZip');

/**
 * Load all files from asset file and store in ram as base64ObjectURLs
 *
 * Supports: mp3
 *
 * @author tknight-dev
 */

export class AssetEngine {
	private static assets: { [key: string]: string } = {}; // { filename: base64ObjectURLs }
	private static initialized: boolean;

	public static async initialize(): Promise<void> {
		if (AssetEngine.initialized) {
			return;
		}
	}

	public static async load(): Promise<number> {
		let buffer: ArrayBuffer,
			buffers: ArrayBuffer[] = [],
			contents: any,
			file: any,
			files: any[] = [],
			timestamp: number = new Date().getTime(),
			zip: ReturnType<typeof JSZip> = new JSZip();

		// Load zip into unzipper
		contents = await zip.loadAsync(await (await fetch('./assets.zip')).blob());
		Object.keys(contents.files).forEach(function (filename: string) {
			if (filename.includes('.mp3')) {
				buffers.push(zip.file(filename).async('arraybuffer'));
				files.push({
					name: filename,
					type: 'audio/mp3',
				});
			}
		});

		// Hold until all files loaded
		await Promise.all(buffers);

		// Process the files
		for (let i = 0; i < files.length; i++) {
			buffer = await buffers[i];
			file = files[i];

			AssetEngine.assets[file.name] = 'data:' + file.type + ';base64,' + btoa(String.fromCharCode(...new Uint8Array(buffer)));
		}

		return new Date().getTime() - timestamp;
	}

	public static getAsset(filename: string): string {
		return AssetEngine.assets[filename];
	}
}
