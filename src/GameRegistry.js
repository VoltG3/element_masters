let _registry = null;

/**
 * Ielasa visus JSON failus un izveido masīvu.
 * Tiek izpildīts tikai vienu reizi.
 */
const initRegistry = () => {
    // Ja reģistrs jau eksistē, neko nedarām
    if (_registry) return _registry;

    console.time("Registry Load Time");

    try {
        // 1. Ielādējam JSON datus
        const jsonContext = require.context('./assets/json', true, /\.json$/);

        // 2. Ielādējam BILDES
        const imageContext = require.context('./assets/images', true, /\.(png|jpe?g|svg)$/);
        // 3. Ielādējam SKAŅAS (ne-fatāls: ja nav atbalsta vai mapes, turpinām bez skaņām)
        let soundContext = null;
        try {
            soundContext = require.context('./assets/sounds', true, /\.(mp3|wav|ogg)$/);
        } catch (e) {
            // Turpinām bez skaņām; tas nedrīkst izjaukt reģistra ielādi
            console.warn('Sound context unavailable. Continuing without pre-resolved sound assets.');
            soundContext = null;
        }

        // Palīgfunkcija ceļu apstrādei
        const resolvePath = (rawPath) => {
            if (!rawPath) return null;
            try {
                // Pārveidojam JSON ceļu uz relatīvu Webpack ceļu
                // Piemēram: "/assets/images/blocks/dirt.png" -> "./blocks/dirt.png"
                const cleanPath = rawPath.replace('/assets/images/', './').replace('src/assets/images/', './');
                const relativePath = cleanPath.startsWith('./') ? cleanPath : `./${cleanPath}`;
                
                const imageModule = imageContext(relativePath);
                return imageModule.default || imageModule;
            } catch (e) {
                console.warn(`Image not found: ${rawPath}`);
                return rawPath; // Ja neatrod, atgriežam oriģinālo ceļu
            }
        };

        const resolveSound = (rawPath) => {
            if (!rawPath) return null;
            // Ja nav soundContext, atgriežam neapstrādātu ceļu (Audio var mēģināt ielādēt; kļūmes ir nekaitīgas)
            if (!soundContext) return rawPath;
            try {
                // "/assets/sounds/sfx/file.ogg" -> "./sfx/file.ogg"
                const cleanPath = rawPath.replace('/assets/sounds/', './').replace('src/assets/sounds/', './');
                const relativePath = cleanPath.startsWith('./') ? cleanPath : `./${cleanPath}`;
                const mod = soundContext(relativePath);
                return mod.default || mod;
            } catch (e) {
                console.warn(`Sound not found: ${rawPath}`);
                return rawPath;
            }
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
                sfx: resolveSound(item.sfx || item.sfxResolved || null)
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
    return _registry ? _registry.find(item => item.id === id) : null;
};

export default _registry;