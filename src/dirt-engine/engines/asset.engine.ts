import * as JSZip from 'JSZip';
import { dirtEngineDefaultAudioManifest } from '../assets/audio.default.asset';
import { dirtEngineDefaultImageManifest } from '../assets/image.default.asset';
import { dirtEngineDefaultMapManifest } from '../assets/map.default.asset';
import {
	Asset,
	AssetAudio,
	AssetCollection,
	AssetDeclarations,
	AssetImage,
	AssetImageSrc,
	AssetMap,
	AssetManifest,
	AssetManifestMaster,
} from '../models/asset.model';

/**
 * Loads shared assets first if another asset pack has the same file the other asset pack's file is ignored
 *
 * @author tknight-dev
 */

interface AssetTmp {
	filename: string;
	image: boolean;
	original: boolean;
	dataURLType: string | null;
}

export interface AssetCache {
	data: string; // base64DataUrl
	imageBitmap?: ImageBitmap;
	original: boolean;
}

export class AssetEngine {
	private static assetDeclarations: AssetDeclarations;
	private static assetManifestMaster: AssetManifestMaster;
	private static assetFilenameS: string = 'dirt-engine-assets-s';
	private static assetFilenameU: string = 'dirt-engine-assets-u';
	private static assetFilenameV: string = 'dirt-engine-assets-v';
	private static assets: { [key: string]: AssetCache } = {};
	private static collection: AssetCollection;
	private static initialized: boolean;
	private static loaded: boolean;

	public static compileMasterManifest(assetManifestDeclared: AssetManifest): AssetManifestMaster {
		if (AssetEngine.assetManifestMaster) {
			return AssetEngine.assetManifestMaster;
		}

		let asset: Asset,
			assetImage: AssetImage,
			audio: { [key: string]: Asset } = {},
			images: { [key: string]: Asset } = {},
			maps: { [key: string]: Asset } = {};

		// Process declared first
		if (assetManifestDeclared.audio) {
			for (let i in assetManifestDeclared.audio) {
				asset = assetManifestDeclared.audio[i];
				asset.id = asset.id.toLowerCase();
				if (audio[asset.id] === undefined) {
					audio[asset.id] = asset;
				} else {
					console.warn("AssetEngine > compileMasterManifest: declared audio asset id '" + asset.id + "' already exists");
				}
			}
		}
		if (assetManifestDeclared.images) {
			for (let i in assetManifestDeclared.images) {
				assetImage = assetManifestDeclared.images[i];
				assetImage.id = assetImage.id.toLowerCase();
				if (images[assetImage.id] === undefined) {
					images[assetImage.id] = assetImage;

					assetImage.srcs = assetImage.srcs.sort((a: AssetImageSrc, b: AssetImageSrc) => {
						return a.resolution - b.resolution;
					});
				} else {
					console.warn("AssetEngine > compileMasterManifest: declared image asset id '" + assetImage.id + "' already exists");
				}
			}
		}
		if (assetManifestDeclared.maps) {
			for (let i in assetManifestDeclared.maps) {
				asset = assetManifestDeclared.maps[i];
				asset.id = asset.id.toLowerCase();
				if (maps[asset.id] === undefined) {
					maps[asset.id] = asset;
				} else {
					console.warn("AssetEngine > compileMasterManifest: declared map asset id '" + asset.id + "' already exists");
				}
			}
		}

		// Process defaults second
		for (let i in dirtEngineDefaultAudioManifest) {
			asset = dirtEngineDefaultAudioManifest[i];
			asset.id = asset.id.toLowerCase();
			if (audio[asset.id] === undefined) {
				audio[asset.id] = asset;
			}
		}
		for (let i in dirtEngineDefaultImageManifest) {
			assetImage = dirtEngineDefaultImageManifest[i];
			assetImage.id = assetImage.id.toLowerCase();
			if (images[assetImage.id] === undefined) {
				images[assetImage.id] = assetImage;

				assetImage.srcs = assetImage.srcs.sort((a: AssetImageSrc, b: AssetImageSrc) => {
					return a.resolution - b.resolution;
				});
			}
		}
		for (let i in dirtEngineDefaultMapManifest) {
			asset = dirtEngineDefaultMapManifest[i];
			asset.id = asset.id.toLowerCase();
			if (maps[asset.id] === undefined) {
				maps[asset.id] = asset;
			}
		}

		AssetEngine.assetManifestMaster = {
			audio: <any>audio,
			images: <any>images,
			maps: <any>maps,
		};
		return AssetEngine.assetManifestMaster;
	}

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

		AssetEngine.compileMasterManifest(assetDeclarations.manifest || {});
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
			assetCache: AssetCache,
			assetDirCustom: string = AssetEngine.assetDeclarations.dirCustom || './',
			assetDirDefault: string = AssetEngine.assetDeclarations.dirDefault || './',
			assetImageSrc: AssetImageSrc,
			assets: { [key: string]: AssetTmp } = {}, // key is fileName
			assetsCustomS: string | undefined = AssetEngine.assetDeclarations.customS,
			assetsCustomU: string | undefined = AssetEngine.assetDeclarations.customU,
			assetsCustomV: string | undefined = AssetEngine.assetDeclarations.customV,
			buffer: ArrayBuffer,
			buffers: { [key: string]: Promise<ArrayBuffer> } = {}, // key is filename
			collection: AssetCollection = AssetEngine.collection,
			dataURLType: string | null,
			filename: string,
			filenameOriginal: string,
			filenameOriginalShared: string,
			filenamesCustom: string[] = [],
			image: boolean,
			textDecoder: TextDecoder = new TextDecoder('ISO-8859-1'),
			timestamp: number = Date.now(),
			zip: JSZip;

		// Load in shared
		filenameOriginalShared = assetDirDefault + AssetEngine.assetFilenameS;
		if (assetsCustomS) {
			filenamesCustom.push(assetDirCustom + assetsCustomS);
		}

		// Load in context specific asset pack
		switch (AssetEngine.collection) {
			case AssetCollection.UI:
				filenameOriginal = assetDirDefault + AssetEngine.assetFilenameU;

				if (assetsCustomU) {
					filenamesCustom.push(assetDirCustom + assetsCustomU);
				}
				break;
			case AssetCollection.VIDEO:
				filenameOriginal = assetDirDefault + AssetEngine.assetFilenameV;

				if (assetsCustomV && Array.isArray(assetsCustomV)) {
					filenamesCustom.push(assetDirCustom + assetsCustomV);
				}
				break;
			default:
				return -1;
		}

		// Set loader function
		let loader = (filename: string, original: boolean) => {
			if (assets[filename] === undefined) {
				accept = true;

				switch (filename.substring(filename.lastIndexOf('.') + 1, filename.length)) {
					case 'map':
						dataURLType = null;
						image = false;
						break;
					case 'mp3':
						dataURLType = 'audio/mp3';
						image = false;
						break;
					case 'svg':
						if (collection === AssetCollection.VIDEO) {
							console.error('AssetEngine > load: SVG image asset "' + filename + "' ignored in video collection");
						} else {
							dataURLType = 'image/svg+xml';
							image = true;
						}
						break;
					case 'webp':
						dataURLType = 'image/webp';
						image = true;
						break;
					default:
						accept = false;
						image = false;
						break;
				}

				if (accept) {
					assets[filename] = {
						filename: filename,
						image: image,
						original: original,
						dataURLType: dataURLType,
					};
					buffers[filename] = (<JSZip.JSZipObject>zip.file(filename)).async('arraybuffer');
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
		await Promise.all(Object.values(buffers));

		// Process the files
		for (let i in assets) {
			asset = assets[i];
			buffer = await buffers[i];

			if (asset.dataURLType) {
				AssetEngine.assets[asset.filename] = {
					data:
						'data:' +
						asset.dataURLType +
						';base64,' +
						btoa(new Uint8Array(buffer).reduce((acc, i) => (acc += String.fromCharCode.apply(null, [i])), '')),
					original: asset.original,
				};
			} else {
				AssetEngine.assets[asset.filename] = {
					data: new Uint8Array(buffer).reduce((acc, i) => (acc += String.fromCharCode.apply(null, [i])), ''),
					original: asset.original,
				};
			}

			// Detect image dimensions
			if (asset.image && asset.dataURLType) {
				if (!asset.dataURLType.includes('svg')) {
					assetCache = AssetEngine.assets[asset.filename];
					assetCache.imageBitmap = await createImageBitmap(await (await fetch(assetCache.data)).blob());
				}
			}
		}

		return Date.now() - timestamp;
	}

	public static async verify(assetDeclarations: AssetDeclarations): Promise<boolean> {
		if (!assetDeclarations) {
			console.error('AssetEngine > verify: assetDeclarations is null or undefined');
			return false;
		}
		let dirCustom: string = assetDeclarations.dirCustom || './',
			dirDefault: string = assetDeclarations.dirDefault || './',
			filename,
			filenames: string[] = [],
			zip: JSZip;

		// Shared
		filenames.push(dirDefault + AssetEngine.assetFilenameS);
		if (assetDeclarations.customS && Array.isArray(assetDeclarations.customS)) {
			for (let i in assetDeclarations.customS) {
				filenames.push(dirCustom + assetDeclarations.customS[i]);
			}
		}

		// UI
		filenames.push(dirDefault + AssetEngine.assetFilenameU);
		if (assetDeclarations.customU && Array.isArray(assetDeclarations.customU)) {
			for (let i in assetDeclarations.customU) {
				filenames.push(dirCustom + assetDeclarations.customU[i]);
			}
		}

		// Video
		filenames.push(dirDefault + AssetEngine.assetFilenameV);
		if (assetDeclarations.customV && Array.isArray(assetDeclarations.customV)) {
			for (let i in assetDeclarations.customV) {
				filenames.push(dirCustom + assetDeclarations.customV[i]);
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

	public static getAsset(filename: string): AssetCache | undefined {
		if (!AssetEngine.initialized) {
			console.error('AssetEngine > getAsset: not initialized');
		} else if (!AssetEngine.loaded) {
			console.error('AssetEngine > getAsset: not loaded');
		}
		return AssetEngine.assets[filename];
	}

	public static getAssetAndRemoveFromCache(filename: string): AssetCache | undefined {
		if (!AssetEngine.initialized) {
			console.error('AssetEngine > getAssetAndRemoveFromCache: not initialized');
		} else if (!AssetEngine.loaded) {
			console.error('AssetEngine > getAssetAndRemoveFromCache: not loaded');
		}
		let asset: AssetCache = AssetEngine.assets[filename];
		delete AssetEngine.assets[filename];
		return asset;
	}

	public static getAssetManifestMaster(): AssetManifestMaster {
		return AssetEngine.assetManifestMaster;
	}
}
