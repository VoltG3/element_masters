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

REFAKTORĒŠANAS REZULTĀTS:
- PixiStage.jsx: 1380 rindas → 583 rindas (57% mazāks!)
- Kods sadalīts 7 loģiskos moduļos
- Katrs modulis ir testējams un uzturējams atsevišķi
- Struktūra līdzīga editor/ sadaļai
- Samazināta koda dublēšanās
- Labāka koda organizācija un lasāmība
