import * as JSZip from 'JSZip';

/**
 * Load all files from asset file and store in ram as base64ObjectURLs
 *
 * Supports: mp3, webp
 *
 * @author tknight-dev
 */

interface Asset {
	name: string;
	type: string;
}

export class AssetEngine {
	private static assets: { [key: string]: string } = {}; // { filename: base64ObjectURLs }
	private static initialized: boolean;

	public static async initialize(): Promise<void> {
		if (AssetEngine.initialized) {
			return;
		}
		AssetEngine.initialized = true;
	}

	public static async load(): Promise<number> {
		let accept: boolean,
			asset: Asset,
			assets: Asset[] = [],
			buffer: ArrayBuffer,
			buffers: Promise<ArrayBuffer>[] = [],
			timestamp: number = new Date().getTime(),
			zip: JSZip;

		// Load zip into unzipper
		zip = <JSZip>await JSZip.loadAsync(await (await fetch('./assets')).blob());
		Object.keys(zip.files).forEach(function (filename: string) {
			accept = false;
			if (filename.endsWith('.mp3')) {
				accept = true;
				assets.push({
					name: filename,
					type: 'audio/mp3',
				});
			} else if (filename.endsWith('.webp')) {
				accept = true;
				assets.push({
					name: filename,
					type: 'image/webp',
				});
			}

			if (accept) {
				buffers.push((<JSZip.JSZipObject>zip.file(filename)).async('arraybuffer'));
			}
		});

		// Hold until all files loaded
		await Promise.all(buffers);

		// Process the files
		for (let i = 0; i < assets.length; i++) {
			asset = assets[i];
			buffer = await buffers[i];

			AssetEngine.assets[asset.name] = 'data:' + asset.type + ';base64,' + btoa(String.fromCharCode(...new Uint8Array(buffer)));
		}

		return new Date().getTime() - timestamp;
	}

	public static getAsset(filename: string): string {
		return AssetEngine.assets[filename];
	}
}
