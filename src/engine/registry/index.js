/**
 * Game Registry Module
 * Loads all JSON files and creates a registry array.
 * Executed only once during initialization.
 */

let _registry = null;
let _registryMap = null;

/**
 * Initialize the registry by loading all JSON, image, and sound assets.
 * This is executed only once when the module is first imported.
 * @returns {Array} The loaded registry items
 */
const initRegistry = () => {
    // If registry already exists, do nothing
    if (_registry) return _registry;

    console.time("Registry Load Time");

    try {
        // 1. Load JSON data
        const jsonContext = require.context('../../assets/json', true, /\.json$/);

        // 2. Load IMAGES
        const imageContext = require.context('../../assets/images', true, /\.(png|jpe?g|svg)$/);

        // 3. Load SOUNDS (non-fatal: if not supported or directory doesn't exist, continue without sounds)
        let soundContext = null;
        try {
            soundContext = require.context('../../assets/sound', true, /\.(mp3|wav|ogg|m4a|aac|flac|webm)$/);
        } catch (e) {
            // Sound context not available — not fatal
            soundContext = null;
        }

        // Check if sound context is available
        if (!soundContext) {
            console.warn('Sound context unavailable. Continuing without pre-resolved sound assets.');
        }

        // Helper function for path resolution
        const resolvePath = (rawPath) => {
            if (!rawPath) return null;
            try {
                // Convert JSON path to relative Webpack path
                // Example: "/assets/images/blocks/dirt.png" -> "./blocks/dirt.png"
                const cleanPath = rawPath.replace('/assets/images/', './').replace('src/assets/images/', './');
                const relativePath = cleanPath.startsWith('./') ? cleanPath : `./${cleanPath}`;

                const imageModule = imageContext(relativePath);
                return imageModule.default || imageModule;
            } catch (e) {
                console.warn(`Image not found: ${rawPath}`);
                return rawPath; // If not found, return original path
            }
        };

        let _warnedUnresolvedSound = false;
        const resolveSound = (rawPath) => {
            if (!rawPath) return null;
            // Normalize path for sound context
            const normalize = (p) => {
                let out = p;
                out = out.replace('/assets/sounds/', './').replace('src/assets/sounds/', './');
                out = out.replace('/assets/sound/', './').replace('src/assets/sound/', './');
                return out.startsWith('./') ? out : `./${out}`;
            };
            const rel = normalize(rawPath);
            // Try to resolve with sound context
            if (soundContext) {
                try {
                    const mod = soundContext(rel);
                    return mod.default || mod;
                } catch {}
            }
            // Unable to resolve in bundler — return original path to try loading via public URL
            if (!_warnedUnresolvedSound) {
                console.warn(`SFX not bundled: ${rawPath}. Will try loading via public URL. Place files under src/assets/sound, or copy to public/assets/sound.`);
                _warnedUnresolvedSound = true;
            }
            return rawPath;
        };

        const resolveSoundsMap = (sounds) => {
            if (!sounds || typeof sounds !== 'object') return sounds;
            const out = Array.isArray(sounds) ? [] : {};
            for (const [k, v] of Object.entries(sounds)) {
                if (typeof v === 'string') {
                    out[k] = resolveSound(v);
                } else if (v && typeof v === 'object') {
                    out[k] = resolveSoundsMap(v);
                } else {
                    out[k] = v;
                }
            }
            return out;
        };

        _registry = jsonContext.keys().map((key) => {
            const data = jsonContext(key);
            const item = data.default || data;

            // Apstrādājam vienu bildi (vecais variants)
            let resolvedTexture = resolvePath(item.texture);

            // Apstrādājam bilžu masīvu (jaunais variants animācijām)
            let resolvedTextures = [];
            if (item.textures && Array.isArray(item.textures)) {
                resolvedTextures = item.textures.map(path => resolvePath(path));
            }

            return {
                ...item,
                texture: resolvedTexture,     // Viena bilde (ja ir)
                textures: resolvedTextures,   // Masīvs (ja ir)
                // Skaņas ceļš (ja ir) — pārvērsts uz bundlera URL
                sfx: resolveSound(item.sfx || item.sfxResolved || null),
                sounds: resolveSoundsMap(item.sounds)
            };
        });

        // --- JAUNS: Pēcapstrāde (Linking & Merging) ---
        // Mēs ejam cauri visiem elementiem un meklējam tos, kuriem ir 'defaultAnimation'.
        // Ja atrodam, mēs kopējam vizuālos datus no animācijas uz galveno objektu.
        
        _registry.forEach(item => {
            if (item.defaultAnimation) {
                // Meklējam animācijas objektu pēc ID
                // Piezīme: Tavā piemērā player.json ir "player_default", bet failā id ir "player_default_100". 
                // Šeit mēs mēģinām atrast precīzu vai daļēju atbilstību, lai kods strādātu abos gadījumos.
                const animItem = _registry.find(r => r.id === item.defaultAnimation || r.id === item.defaultAnimation + "_100");
                
                if (animItem) {
                    // Kopējam vizuālos datus uz galveno 'player' objektu
                    if (!item.texture) item.texture = animItem.texture;
                    if (!item.textures || item.textures.length === 0) item.textures = animItem.textures;
                    if (!item.animationSpeed) item.animationSpeed = animItem.animationSpeed;
                    
                    // Iezīmējam animācijas objektu kā 'hidden', lai to nerādītu Editorā
                    animItem.isHiddenInEditor = true;
                }
                
                // Tāpat paslēpjam arī dead un target animācijas, ja tās eksistē kā atsevišķi itemi
                if (item.deadAnimation) {
                     const deadItem = _registry.find(r => r.id === item.deadAnimation);
                     if (deadItem) deadItem.isHiddenInEditor = true;
                }
                if (item.targetAnimation) {
                     const targetItem = _registry.find(r => r.id === item.targetAnimation || r.id === item.targetAnimation + "_100");
                     if (targetItem) targetItem.isHiddenInEditor = true;
                }
            }
        });

        _registryMap = new Map();
        _registry.forEach(item => {
            if (item && item.id) _registryMap.set(item.id, item);
        });
        _registry.__byId = _registryMap;

        console.log(`✅ Game Registry initialized. Loaded ${_registry.length} items.`);

    } catch (error) {
        console.error("❌ Failed to load Game Registry:", error);
        _registry = [];
    }

    console.timeEnd("Registry Load Time");
    return _registry;
};

// Automātiski inicializējam, kad šis fails tiek importēts pirmo reizi
initRegistry();

// Eksportējam funkciju, lai piekļūtu datiem (getter)
export const getRegistry = () => {
    return _registry;
};

// Eksportējam palīgfunkciju, lai meklētu pēc ID
export const findItemById = (id) => {
    if (!_registry) return null;
    if (_registryMap) return _registryMap.get(id) || null;
    return _registry.find(item => item.id === id);
};

export default _registry;
