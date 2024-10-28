/**
 * @author tknight-dev
 */

export enum AssetCollection {
	UI,
	VIDEO,
}

export interface AssetDeclarations {
	customU: string[] | undefined;
	customV: string[] | undefined;
	dir: string | undefined; // defaults to current directory
}
