src/sections/chapters/game/
├── index.jsx              # Galvenais Game komponents (~370 rindas)
├── GameHeader.jsx         # Spēles header ar veselību un info
├── GameSettings.jsx       # Spēles iestatījumu panelis
├── GameTerminal.jsx       # Komandu terminālis
├── MapSelector.jsx        # Kartes izvēles modal komponents (~43 rindas)
├── styledComponents.js    # Styled components definīcijas (~138 rindas)
└── PixiStage/
    ├── index.jsx          # Galvenais PixiJS stage komponents (583 rindas) ⭐
    ├── helpers.js         # Utilītu funkcijas (~95 rindas)
    ├── liquidRendering.js # Šķidrumu proceduāla renderēšana (~98 rindas)
    ├── layerBuilder.js    # Slāņu izveidošana un rendering (~146 rindas)
    ├── parallaxManager.js # Parallax fona pārvaldība (~58 rindas)
    ├── playerManager.js   # Spēlētāja sprite pārvaldība (~113 rindas)
    └── projectileManager.js # Projektilu sprite pārvaldība (~80 rindas)

PixiStage slāņu konteineri un secība (no aizmugures uz priekšu):
1) parallaxLayer
2) bg
3) bgAnim
4) roomBg
5) liquidBgLayer
6) objBehind
7) roomObjBehind
8) secretBelowLayer
9) playerLayer
10) entitiesLayer
11) projLayer
12) objFront
13) roomObjFront
14) secretAboveLayer
15) weatherLayer
16) fogLayer
17) liquidLayer
18) liquidFxLayer
19) vignetteLayer
20) overlayLayer
21) floatingLayer

REFAKTORĒŠANAS REZULTĀTS:
- PixiStage.jsx: 1380 rindas → 583 rindas (57% mazāks!)
- Kods sadalīts 7 loģiskos moduļos
- Katrs modulis ir testējams un uzturējams atsevišķi
- Struktūra līdzīga editor/ sadaļai
- Samazināta koda dublēšanās
- Labāka koda organizācija un lasāmība
