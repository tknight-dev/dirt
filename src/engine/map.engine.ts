import { AssetEngine } from './asset.engine';
import { Camera } from './models/camera.model';
import { Grid, GridBlock } from './models/grid.model';
import { Map, MapActive } from './models/map.model';
import { MapAsset } from './assets/map.asset';
import { UtilEngine } from './util.engine';

/**
 * @author tknight-dev
 */

export class MapEngine {
	private static initialized: boolean;

	public static default(): MapActive {
		if (!MapEngine.initialized) {
			console.error('MapEngine > default: not initialized');
		}
		let grid: Grid = {
				blocks: {}, // key is hash
				gHeight: 0, // calculated
				gWidth: 50,
				id: 'initial', // protectedId
				startGxCamera: 0,
				startGyCamera: 0,
				startGxPlayer: 0,
				startGyPlayer: 0,
				zoomDefault: 1,
			},
			map: Map = {
				camera: <any>{
					viewPortGw: 25,
					zoomDefault: 1,
				},
				grids: {}, // key is gridID
				name: 'new map',
			};

		map.grids[grid.id] = grid;

		return MapEngine.loadFromFile(map);
	}

	public static async initialize(): Promise<void> {
		if (MapEngine.initialized) {
			return;
		}
		MapEngine.initialized = true;
	}

	public static loadFromFile(map: Map): MapActive {
		if (!MapEngine.initialized) {
			console.error('MapEngine > loadFromFile: not initialized');
		}
		let grid: Grid,
			gridActiveId: string = 'initial',
			grids: { [key: string]: Grid } = map.grids,
			mapActive: MapActive = Object.assign(map, {
				gridActive: map.grids[gridActiveId],
				gridActiveId: gridActiveId,
			});

		// Camera
		map.camera.zoom = grids[gridActiveId].zoomDefault;
		map.camera.viewPortGw = Math.round(map.camera.viewPortGw);
		map.camera.viewPortGh = Math.round((map.camera.viewPortGw * 9000) / 16) / 1000;

		// Grids
		for (let i in grids) {
			grid = grids[i];
			grid.gWidth = Math.round(grid.gWidth);
			grid.gHeight = Math.round((grid.gWidth * 9) / 16);
		}

		return mapActive;
	}

	public static load(mapAsset: MapAsset): MapActive {
		if (!MapEngine.initialized) {
			console.error('MapEngine > load: not initialized');
		}
		return MapEngine.loadFromFile(UtilEngine.mapDecode(AssetEngine.getAsset(mapAsset.src)));
	}
}
