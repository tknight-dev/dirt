import { AssetCache, AssetEngine } from './asset.engine';
import { AssetMap } from '../models/asset.model';
import { Grid } from '../models/grid.model';
import { Map, MapActive } from '../models/map.model';
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
		let gridWidth: number = 50,
			grid: Grid = {
				audio: {}, // key is hash
				blocks: {}, // key is hash
				gHeight: 0, // calculated
				gHorizon: 0, // calculated
				gWidth: gridWidth,
				id: 'initial', // protectedId
				lights: {}, // key is hash
				lightIntensityGlobal: 1,
				outside: true,
				startGxCamera: Math.round(gridWidth / 2),
				startGyCamera: Math.round((gridWidth * 9) / 32),
				startGxPlayer: Math.round(gridWidth / 2),
				startGyPlayer: Math.round((gridWidth * 9) / 32),
				zoomDefault: 1,
			},
			map: Map = {
				camera: <any>{
					viewportGw: Math.round(gridWidth / 2),
					zoomDefault: 1,
				},
				clockSpeedRelativeToEarth: 1,
				grids: {}, // key is gridID
				hourOfDay: 12,
				name: 'new_map',
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
				hourOfDayEff: map.hourOfDay,
			});

		// Camera
		map.camera.zoom = grids[gridActiveId].zoomDefault;
		map.camera.viewportGw = Math.round(map.camera.viewportGw);
		map.camera.viewportGh = Math.round((map.camera.viewportGw * 9000) / 16) / 1000;

		// Clock
		map.clockSpeedRelativeToEarth = Math.max(
			1,
			Math.min(5760, Math.round(map.clockSpeedRelativeToEarth * 1000) / 1000),
		);
		map.hourOfDay = Math.round(map.hourOfDay);

		// Grids
		for (let i in grids) {
			grid = grids[i];
			grid.gWidth = Math.round(grid.gWidth);
			grid.gHeight = Math.round((grid.gWidth * 9) / 16);

			grid.gHorizon = Math.round(grid.gHeight / 2);
			grid.lightIntensityGlobal = Math.round(grid.lightIntensityGlobal * 1000) / 1000;
		}

		return mapActive;
	}

	public static load(assetMap: AssetMap): MapActive | undefined {
		if (!MapEngine.initialized) {
			console.error('MapEngine > load: not initialized');
		}
		let asset: AssetCache | undefined = AssetEngine.getAsset(assetMap.src);

		if (asset) {
			return MapEngine.loadFromFile(UtilEngine.mapDecode(asset.data));
		} else {
			console.error("MapEngine > load: assetMap '" + assetMap.id + "' failed to load");
			return undefined;
		}
	}
}
