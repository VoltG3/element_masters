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
        let soundContextAlt = null; // atbalstam arī singular "sound" mapi
        try {
            soundContext = require.context('./assets/sounds', true, /\.(mp3|wav|ogg|m4a|aac|flac|webm)$/);
        } catch (e) {
            // primārais konteksts nav pieejams — nav fatāli
            soundContext = null;
        }
        try {
            // alternatīvais ceļš: projekts var lietot ./assets/sound (singular)
            soundContextAlt = require.context('./assets/sound', true, /\.(mp3|wav|ogg|m4a|aac|flac|webm)$/);
        } catch (e) {
            soundContextAlt = null;
        }
        if (!soundContext && !soundContextAlt) {
            console.warn('Sound context unavailable. Continuing without pre-resolved sound assets.');
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

        let _warnedUnresolvedSound = false;
        const resolveSound = (rawPath) => {
            if (!rawPath) return null;
            // mēģinām atrisināt, ja ir kāds no kontekstiem; atbalstām gan "sounds/", gan "sound/"
            const normalize = (p) => {
                let out = p;
                out = out.replace('/assets/sounds/', './').replace('src/assets/sounds/', './');
                out = out.replace('/assets/sound/', './').replace('src/assets/sound/', './');
                return out.startsWith('./') ? out : `./${out}`;
            };
            const rel = normalize(rawPath);
            // Primārais: plural
            if (soundContext) {
                try {
                    const mod = soundContext(rel);
                    return mod.default || mod;
                } catch {}
            }
            // Alternatīvais: singular
            if (soundContextAlt) {
                try {
                    const mod = soundContextAlt(rel);
                    return mod.default || mod;
                } catch {}
            }
            // Nav atrisināms bundlerī — atgriežam izejas ceļu, lai mēģina public ceļu
            if (!_warnedUnresolvedSound) {
                console.warn(`SFX not bundled: ${rawPath}. Will try loading via public URL. Place files under src/assets/sounds or src/assets/sound, or copy to public/assets/sounds.`);
                _warnedUnresolvedSound = true;
            }
            return rawPath;
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