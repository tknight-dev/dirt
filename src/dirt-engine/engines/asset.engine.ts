import * as JSZip from 'JSZip';
import { AssetCollection, AssetDeclarations } from '../models/asset.model';

/**
 * Loads shared assets first if another asset pack has the same file the other asset pack's file is ignored
 *
 * @author tknight-dev
 */

interface AssetTmp {
	name: string;
	original: boolean;
	dataURLType: string | null;
}

export interface Asset {
	data: string; // base64DataUrl
	original: boolean;
}

export class AssetEngine {
	private static assetDeclarations: AssetDeclarations;
	private static assetFilenameS: string = 'dirt-engine-assets-s';
	private static assetFilenameU: string = 'dirt-engine-assets-u';
	private static assetFilenameV: string = 'dirt-engine-assets-v';
	private static assets: { [key: string]: Asset } = {};
	private static collection: AssetCollection;
	private static initialized: boolean;
	private static loaded: boolean;

	/**
	 * Will always process the shared assets
	 */
	public static async initialize(assetDeclarations: AssetDeclarations, collection: AssetCollection): Promise<void> {
		if (AssetEngine.initialized) {
			return;
		} else if (collection === AssetCollection.SHARED) {
			console.error('AssetEngine > initialize: cannot use the SHARED collection');
			return;
		}
		AssetEngine.initialized = true;
		AssetEngine.assetDeclarations = assetDeclarations;
		AssetEngine.collection = collection;
	}

	public static async load(): Promise<number> {
		if (!AssetEngine.initialized) {
			console.error('AssetEngine > load: not initialized');
		} else if (AssetEngine.loaded) {
			console.error('AssetEngine > load: already loaded');
		}
		AssetEngine.loaded = true;
		let accept: boolean,
			asset: AssetTmp,
			assetDir: string = AssetEngine.assetDeclarations.dir || './',
			assets: AssetTmp[] = [],
			assetsCustomS: string[] | undefined = AssetEngine.assetDeclarations.customS,
			assetsCustomU: string[] | undefined = AssetEngine.assetDeclarations.customU,
			assetsCustomV: string[] | undefined = AssetEngine.assetDeclarations.customV,
			buffer: ArrayBuffer,
			buffers: Promise<ArrayBuffer>[] = [],
			dataURLType: string | null,
			filename: string,
			filenameOriginal: string,
			filenameOriginalShared: string,
			filenamesCustom: string[] = [],
			timestamp: number = Date.now(),
			zip: JSZip;

		// Load in shared
		filenameOriginalShared = assetDir + AssetEngine.assetFilenameS;
		if (assetsCustomS && Array.isArray(assetsCustomS)) {
			for (let i in assetsCustomS) {
				filenamesCustom.push(assetDir + assetsCustomS[i]);
			}
		}

		// Load in context specific asset pack
		switch (AssetEngine.collection) {
			case AssetCollection.UI:
				filenameOriginal = assetDir + AssetEngine.assetFilenameU;

				if (assetsCustomU && Array.isArray(assetsCustomU)) {
					for (let i in assetsCustomU) {
						filenamesCustom.push(assetDir + assetsCustomU[i]);
					}
				}
				break;
			case AssetCollection.VIDEO:
				filenameOriginal = assetDir + AssetEngine.assetFilenameV;

				if (assetsCustomV && Array.isArray(assetsCustomV)) {
					for (let i in assetsCustomV) {
						filenamesCustom.push(assetDir + assetsCustomV[i]);
					}
				}
				break;
			default:
				return -1;
		}

		// Set loader function
		let loader = (filename: string, original: boolean) => {
			if (AssetEngine.assets[filename] === undefined) {
				accept = true;

				switch (filename.substring(filename.lastIndexOf('.') + 1, filename.length)) {
					case 'map':
						dataURLType = null;
						break;
					case 'mp3':
						dataURLType = 'audio/mp3';
						break;
					case 'svg':
						dataURLType = 'image/svg+xml';
						break;
					case 'webp':
						dataURLType = 'image/webp';
						break;
					default:
						accept = false;
						break;
				}

				if (accept) {
					assets.push({
						name: filename,
						original: original,
						dataURLType: dataURLType,
					});
					buffers.push((<JSZip.JSZipObject>zip.file(filename)).async('arraybuffer'));
				}
			}
		};

		// Load in custom assets starting with Shared
		for (let i in filenamesCustom) {
			filename = filenamesCustom[i];

			zip = <JSZip>await JSZip.loadAsync(await (await fetch(filename)).blob());
			Object.keys(zip.files).forEach(function (filename: string) {
				loader(filename, false);
			});
		}

		// Load in original assets starting with Shared
		zip = <JSZip>await JSZip.loadAsync(await (await fetch(filenameOriginalShared)).blob());
		Object.keys(zip.files).forEach(function (filename: string) {
			loader(filename, true);
		});
		zip = <JSZip>await JSZip.loadAsync(await (await fetch(filenameOriginal)).blob());
		Object.keys(zip.files).forEach(function (filename: string) {
			loader(filename, true);
		});

		// Hold until all files loaded
		await Promise.all(buffers);

		// Process the files
		for (let i = 0; i < assets.length; i++) {
			asset = assets[i];
			buffer = await buffers[i];

			if (asset.dataURLType) {
				AssetEngine.assets[asset.name] = {
					data: 'data:' + asset.dataURLType + ';base64,' + btoa(String.fromCharCode(...new Uint8Array(buffer))),
					original: asset.original,
				};
			} else {
				AssetEngine.assets[asset.name] = {
					data: String.fromCharCode(...new Uint8Array(buffer)),
					original: asset.original,
				};
			}
		}

		return Date.now() - timestamp;
	}

	public static async verify(assetDeclarations: AssetDeclarations): Promise<boolean> {
		if (!assetDeclarations) {
			console.error('AssetEngine > verify: assetDeclarations is null or undefined');
			return false;
		}
		let dir: string = assetDeclarations.dir || './',
			filename,
			filenames: string[] = [],
			zip: JSZip;

		// Shared
		filenames.push(dir + AssetEngine.assetFilenameS);
		if (assetDeclarations.customS && Array.isArray(assetDeclarations.customS)) {
			for (let i in assetDeclarations.customS) {
				filenames.push(dir + assetDeclarations.customS[i]);
			}
		}

		// UI
		filenames.push(dir + AssetEngine.assetFilenameU);
		if (assetDeclarations.customU && Array.isArray(assetDeclarations.customU)) {
			for (let i in assetDeclarations.customU) {
				filenames.push(dir + assetDeclarations.customU[i]);
			}
		}

		// Video
		filenames.push(dir + AssetEngine.assetFilenameV);
		if (assetDeclarations.customV && Array.isArray(assetDeclarations.customV)) {
			for (let i in assetDeclarations.customV) {
				filenames.push(dir + assetDeclarations.customV[i]);
			}
		}

		// See if they can be loaded
		for (let i in filenames) {
			filename = filenames[i];

			try {
				zip = <JSZip>await JSZip.loadAsync(await (await fetch(filename)).blob());
			} catch (error: any) {
				console.error("AssetEngine > verify: assetDeclarations unable to load '" + filename + "'");
				return false;
			}
		}

		return true;
	}

	public static getAsset(filename: string): Asset | undefined {
		if (!AssetEngine.initialized) {
			console.error('AssetEngine > getAsset: not initialized');
		} else if (!AssetEngine.loaded) {
			console.error('AssetEngine > getAsset: not loaded');
		}
		return AssetEngine.assets[filename];
	}

	public static getAssetAndRemoveFromCache(filename: string): Asset | undefined {
		if (!AssetEngine.initialized) {
			console.error('AssetEngine > getAssetAndRemoveFromCache: not initialized');
		} else if (!AssetEngine.loaded) {
			console.error('AssetEngine > getAssetAndRemoveFromCache: not loaded');
		}
		let asset: Asset = AssetEngine.assets[filename];
		delete AssetEngine.assets[filename];
		return asset;
	}
}
