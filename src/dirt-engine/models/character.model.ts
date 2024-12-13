/**
 * @author tknight-dev
 */

export interface Characters {
	characters: { [key: string]: Character }; // string is id
	charactersByGyByGxByGridId: { [key: string]: { [key: number]: { [key: number]: Character[] } } };
	cameraLockedToId?: string;
}

export interface Character {
	gridId: string;
	gx: number; // Precision 3
	gy: number; // Precision 3
	healthPercentage: number; // 0 - 1
	healthMax: number; // Precision 0
	id: string;
	metaState: { [key: string]: CharacterMetaState }; // string is CharacterMetaState
	staminaPercentage: number; // 0 - 1
	staminaMax: number; // Precision 0
	velX: number; // kph (Precision 3)
	velY: number; // kph (Precision 3)
	weight: number; // kg (Precision 3)
}

export interface CharacterMetaState {
	action: CharacterStateAction;
	assetId: string;
	assetIdAudioEffectStart?: string;
	assetIdAudioEffectStop?: string;
	velMax: number; // kph (Precision 3)
}

export enum CharacterStateAction {
	CROUCH,
	FALL,
	HIT,
	HIT_AIR,
	KNOCKED_DOWN,
	JUMP,
	RUN,
	RUN_CROUCH,
	SLIDE,
	STAND,
	WALK,
	WALK_CROUCH,
}
