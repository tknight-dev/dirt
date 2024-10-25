import * as JSZip from 'JSZip';
import { AssetCollection } from './models/asset.model';

/**
 * Load all files from asset file and store in ram as base64ObjectURLs
 *
 * Supports: mp3, webp
 *
 * @author tknight-dev
 */

interface Asset {
	name: string;
	type: string | null;
}

export class AssetEngine {
	private static assets: { [key: string]: string } = {}; // { filename: base64ObjectURLs }
	private static collection: AssetCollection;
	private static initialized: boolean;

	public static async initialize(collection: AssetCollection): Promise<void> {
		if (AssetEngine.initialized) {
			return;
		}
		AssetEngine.initialized = true;
		AssetEngine.collection = collection;
	}

	public static async load(): Promise<number> {
		let accept: boolean,
			asset: Asset,
			assetURL: string,
			assets: Asset[] = [],
			buffer: ArrayBuffer,
			buffers: Promise<ArrayBuffer>[] = [],
			timestamp: number = Date.now(),
			zip: JSZip;

		switch (AssetEngine.collection) {
			case AssetCollection.UI:
				assetURL = './assetsU';
				break;
			case AssetCollection.VIDEO:
				assetURL = './assetsV';
				break;
		}

		// Load zip into unzipper
		zip = <JSZip>await JSZip.loadAsync(await (await fetch(assetURL)).blob());
		Object.keys(zip.files).forEach(function (filename: string) {
			// console.log('filename', filename, AssetCollection[AssetEngine.collection]);
			accept = false;
			if (filename.endsWith('.map')) {
				accept = true;
				assets.push({
					name: filename,
					type: null,
				});
			} else if (filename.endsWith('.mp3')) {
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

			if (asset.type) {
				AssetEngine.assets[asset.name] = 'data:' + asset.type + ';base64,' + btoa(String.fromCharCode(...new Uint8Array(buffer)));
			} else {
				AssetEngine.assets[asset.name] = String.fromCharCode(...new Uint8Array(buffer));
			}
		}

		return Date.now() - timestamp;
	}

	public static getAsset(filename: string): string {
		return AssetEngine.assets[filename];
	}
}
