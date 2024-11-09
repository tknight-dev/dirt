import { AssetCache, AssetEngine } from './asset.engine';
import { AssetMap } from '../models/asset.model';
import { Grid, GridConfig } from '../models/grid.model';
import { Map, MapActive, MapConfig } from '../models/map.model';
import { UtilEngine } from './util.engine';
import { MapEditEngine } from './map-edit.engine';

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
				audioBlocks: <any>{},
				audioTagTriggersEffect: <any>{},
				audioTagTriggersMusic: <any>{},
				audioTagTriggersMusicFade: <any>{},
				audioTagTriggersMusicPause: <any>{},
				audioTagTriggersMusicUnpause: <any>{},
				imageBlocksBackground: <any>{},
				imageBlocksForeground: <any>{},
				imageBlocksPrimary: <any>{},
				lights: <any>{},
			},
			gridConfig: GridConfig = {
				gHeight: 0, // calculated
				gHorizon: 0, // calculated
				gWidth: gridWidth,
				id: 'initial', // protectedId
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
				clockSpeedRelativeToEarth: 1440,
				gridConfigs: {}, // key is gridID
				grids: {}, // key is gridID
				hourOfDay: 12,
				name: 'new_map',
			};

		map.gridConfigs[gridConfig.id] = gridConfig;
		map.grids[gridConfig.id] = grid;

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
		let gridActiveId: string = 'initial',
			gridConfig: GridConfig,
			gridConfigs: { [key: string]: GridConfig } = map.gridConfigs,
			mapActive: MapActive = Object.assign(map, {
				clockTicker: 0,
				clockSpeedRelativeToEarth: map.clockSpeedRelativeToEarth,
				durationInMS: 0,
				gridActive: map.grids[gridActiveId],
				gridActiveId: gridActiveId,
				gridConfigActive: map.gridConfigs[gridActiveId],
				hourOfDayEff: map.hourOfDay,
				minuteOfHourEff: 0,
			});

		// Camera
		mapActive.camera.zoom = mapActive.gridConfigActive.zoomDefault;
		mapActive.camera.viewportGw = Math.round(mapActive.camera.viewportGw);
		mapActive.camera.viewportGh = Math.round((mapActive.camera.viewportGw * 9000) / 16) / 1000;

		// Clock
		mapActive.clockSpeedRelativeToEarth = Math.max(
			1,
			Math.min(86400, Math.round(mapActive.clockSpeedRelativeToEarth * 1000) / 1000),
		);
		mapActive.hourOfDay = Math.round(mapActive.hourOfDay);

		// Grids
		for (let i in gridConfigs) {
			gridConfig = gridConfigs[i];

			gridConfig.gWidth = Math.round(gridConfig.gWidth);
			gridConfig.gHeight = Math.round((gridConfig.gWidth * 9) / 16);

			gridConfig.gHorizon = Math.round(gridConfig.gHeight / 2);

			gridConfig.lightIntensityGlobal = Math.round(gridConfig.lightIntensityGlobal * 1000) / 1000;
		}

		// Inflate lookup tables
		MapEditEngine.gridBlockTableInflate(mapActive);

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
