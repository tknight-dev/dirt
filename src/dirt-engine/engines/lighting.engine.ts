import { AssetCache, AssetEngine } from './asset.engine';
import { AssetImage, AssetImageSrcResolution } from '../models/asset.model';
import { Grid, GridImageBlock } from '../models/grid.model';
import { Camera } from '../models/camera.model';
import { MapActive } from '../models/map.model';

/**
 * @author tknight-dev
 */

export class LightingEngine {
	private static cache: { [key: string]: ImageBitmap[] } = {}; // key is assetImageId
	private static cacheZoomed: { [key: string]: ImageBitmap[] } = {}; // key is assetImageId
	private static cacheZoomedValue: number;
	private static readonly hoursInDay: number = 24;
	private static mapActive: MapActive;
	private static resolution: AssetImageSrcResolution;

	private static buildBinaries(assetIds: string[]): { [key: string]: ImageBitmap } {
		let assetImage: AssetImage,
			assetImages: { [key: string]: AssetImage } = AssetEngine.getAssetManifestMaster().images,
			assets: { [key: string]: ImageBitmap } = {},
			resolution: AssetImageSrcResolution = LightingEngine.resolution;

		for (let i in assetIds) {
			assetImage = assetImages[assetIds[i]];

			if (!assetImage.srcs.length) {
				console.error("LightingEngine > buildBinaries: image asset '" + assetImage.id + "' missing a source");
				continue;
			}

			// Try to load target resolution
			for (let j in assetImage.srcs) {
				if (assetImage.srcs[j].resolution === resolution) {
					assets[assetImage.id] = <ImageBitmap>(
						(<AssetCache>AssetEngine.getAsset(assetImage.srcs[j].src)).imageBitmap
					);
					break;
				}
			}

			// If no target resolution then load the highest available
			if (!assets[assetImage.id]) {
				assets[assetImage.id] = <ImageBitmap>(
					(<AssetCache>AssetEngine.getAsset(assetImage.srcs[assetImage.srcs.length - 1].src)).imageBitmap
				);
			}
		}

		return assets;
	}

	private static async buildImages(assetImages: { [key: string]: ImageBitmap }): Promise<void> {
		let assetCache: AssetCache,
			canvas: OffscreenCanvas = new OffscreenCanvas(0, 0),
			ctx: OffscreenCanvasRenderingContext2D = <OffscreenCanvasRenderingContext2D>canvas.getContext('2d'),
			i: number,
			image: ImageBitmap,
			images: ImageBitmap[];

		for (let assetId in assetImages) {
			image = assetImages[assetId];
			images = new Array(LightingEngine.hoursInDay);

			for (i = 0; i < LightingEngine.hoursInDay; i++) {
				// Prepare Canvas
				canvas.height = image.height;
				canvas.width = image.width;

				// Draw source
				ctx.clearRect(0, 0, canvas.height, canvas.width);
				ctx.globalCompositeOperation = 'source-over';
				ctx.drawImage(image, 0, 0);

				// Darken
				ctx.globalCompositeOperation = 'darken';

				// Hue
				ctx.globalCompositeOperation = 'hue';

				// Lighten
				ctx.globalCompositeOperation = 'lighten';

				// Luminosity
				ctx.globalCompositeOperation = 'luminosity';

				// Saturation
				ctx.globalCompositeOperation = 'saturation';

				// Done
				images[i] = canvas.transferToImageBitmap();
			}

			LightingEngine.cache[assetId] = images;
		}
	}

	private static buildListOfRequiredAssets(): string[] {
		let assetIds: { [key: string]: null } = {},
			grid: Grid,
			grids: { [key: string]: Grid } = LightingEngine.mapActive.grids,
			processor = (imageBlocks: { [key: number]: GridImageBlock }) => {
				for (let i in imageBlocks) {
					assetIds[imageBlocks[i].assetId] = null;
				}
			};

		for (let i in grids) {
			grid = grids[i];

			processor(grid.imageBlocksBackground.hashes);
			processor(grid.imageBlocksForeground.hashes);
			processor(grid.imageBlocksPrimary.hashes);
		}

		return Object.keys(assetIds);
	}

	public static cacheAdd(assetImageId: string) {
		if (!LightingEngine.cache[assetImageId]) {
			// Build the cache(s)
			let assets: { [key: string]: ImageBitmap } = LightingEngine.buildBinaries([assetImageId]); // object value is base64 data
			LightingEngine.buildImages(assets);
			LightingEngine.updateZoom(assetImageId);
		}
	}

	public static cacheReset() {
		// Clear the cache(s)
		LightingEngine.cache = <any>new Object();
		LightingEngine.cacheZoomed = <any>new Object();

		// Build the cache(s)
		let assetIds: string[] = LightingEngine.buildListOfRequiredAssets(),
			assets: { [key: string]: ImageBitmap } = LightingEngine.buildBinaries(assetIds); // object value is base64 data
		LightingEngine.buildImages(assets);
		LightingEngine.updateZoom(undefined, true);
	}

	public static updateZoom(assetImageId?: string, force?: boolean): void {
		let camera: Camera = LightingEngine.mapActive.camera,
			zoom: number = camera.zoom;

		/**
		 * gInPh/gInPw +1 to fix the off by one pixel issue
		 */
		if (assetImageId || LightingEngine.cacheZoomedValue !== zoom || force) {
			let id: string,
				assetImageIds: string[] = assetImageId ? [assetImageId] : Object.keys(LightingEngine.cache),
				canvas: OffscreenCanvas = new OffscreenCanvas(camera.gInPw + 1, camera.gInPh + 1),
				ctx: OffscreenCanvasRenderingContext2D = <OffscreenCanvasRenderingContext2D>canvas.getContext('2d'),
				height: number = camera.gInPh + 1,
				images: ImageBitmap[],
				imagesZoomed: ImageBitmap[],
				width: number = camera.gInPw + 1;

			for (let i in assetImageIds) {
				id = assetImageIds[i];
				images = LightingEngine.cache[id];
				imagesZoomed = LightingEngine.cacheZoomed[id];

				if (!imagesZoomed) {
					LightingEngine.cacheZoomed[id] = new Array(LightingEngine.hoursInDay);
					imagesZoomed = LightingEngine.cacheZoomed[id];
				}

				for (let j = 0; j < LightingEngine.hoursInDay; j++) {
					ctx.clearRect(0, 0, width, height);
					ctx.drawImage(images[j], 0, 0, width, height);
					imagesZoomed[j] = canvas.transferToImageBitmap();
				}
			}

			LightingEngine.cacheZoomedValue = zoom;
		}
	}

	public static getAssetImage(assetImageId: string, hour: number): ImageBitmap {
		return LightingEngine.cacheZoomed[assetImageId][hour];
	}

	public static setMapActive(mapActive: MapActive) {
		LightingEngine.mapActive = mapActive;
	}

	public static setResolution(resolution: AssetImageSrcResolution) {
		LightingEngine.resolution = resolution;
	}
}
