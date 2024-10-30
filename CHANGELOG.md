# 0.1.0

	-	Asset Service
		-	Load compressed asset file, break out individual assets, encode in base64Urls, cache encoded files
			-	Supports: mp3, webp
	-	Audio Service
		-	Adjustable effect buffer/stack size for parallel effect sounds
			-	Stack: panning
		-	Convert assets into html audio elements
		-	Fader control for music files
		-	Mute control
		-	Live permissions monitoring
		-	Volume control for master and derivate effect/music volumes
	-	Keyboard Service
		-	Debounce keys
	-	Video Service
		-	Maintains the communication bus between the primary UI thread and the Video thread
		-	Spawns thread (WebWorker) for graphical processing (Video thread)
		-	Supports high DPI screens