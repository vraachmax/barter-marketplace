/** Curated starter model selector. Append-only IDs; completeness is NOT claimed.
 * More models must come from licensed, verified vendor/catalog data.
 */
export const ELECTRONICS_MODELS:Readonly<Record<string,Readonly<Record<string,readonly string[]>>>>={
  "electronics-phones": {
    "apple": [
      "iPhone SE 2020",
      "iPhone SE 2022",
      "iPhone 11",
      "iPhone 11 Pro",
      "iPhone 12",
      "iPhone 12 Pro",
      "iPhone 13",
      "iPhone 13 mini",
      "iPhone 13 Pro",
      "iPhone 14",
      "iPhone 14 Pro",
      "iPhone 15",
      "iPhone 15 Pro",
      "iPhone 16",
      "iPhone 16 Pro",
      "iPhone 16 Pro Max",
      "iPhone 17"
    ],
    "samsung": [
      "Galaxy S21",
      "Galaxy S22",
      "Galaxy S22 Ultra",
      "Galaxy S23",
      "Galaxy S23 Ultra",
      "Galaxy S24",
      "Galaxy S24 Ultra",
      "Galaxy S25",
      "Galaxy A52",
      "Galaxy A53",
      "Galaxy A54",
      "Galaxy A55",
      "Galaxy A56",
      "Galaxy Z Fold5",
      "Galaxy Z Flip5",
      "Galaxy Z Fold6",
      "Galaxy Z Flip6"
    ],
    "xiaomi": [
      "Xiaomi 12",
      "Xiaomi 13",
      "Xiaomi 14",
      "Xiaomi 15",
      "Redmi Note 11",
      "Redmi Note 12",
      "Redmi Note 13",
      "Redmi Note 14",
      "POCO X5",
      "POCO X6",
      "POCO F5",
      "POCO F6"
    ],
    "google": [
      "Pixel 6",
      "Pixel 7",
      "Pixel 7 Pro",
      "Pixel 8",
      "Pixel 8 Pro",
      "Pixel 9",
      "Pixel 9 Pro"
    ],
    "honor": [
      "Honor 90",
      "Honor 200",
      "Magic5 Pro",
      "Magic6 Pro"
    ],
    "huawei": [
      "P40",
      "P50 Pro",
      "P60 Pro",
      "Mate 50",
      "Mate 60 Pro"
    ],
    "oneplus": [
      "OnePlus 10 Pro",
      "OnePlus 11",
      "OnePlus 12",
      "OnePlus 13",
      "Nord 3"
    ],
    "realme": [
      "realme 10",
      "realme 11 Pro",
      "realme 12 Pro",
      "realme GT 6"
    ],
    "oppo": [
      "OPPO Reno10",
      "OPPO Reno11",
      "OPPO Find X6",
      "OPPO Find X7"
    ],
    "vivo": [
      "vivo V29",
      "vivo V30",
      "vivo X90",
      "vivo X100"
    ]
  },
  "electronics-computers": {
    "apple": [
      "MacBook Air M1",
      "MacBook Air M2",
      "MacBook Air M3",
      "MacBook Air M4",
      "MacBook Pro 13 M1",
      "MacBook Pro 14 M1",
      "MacBook Pro 14 M2",
      "MacBook Pro 14 M3",
      "MacBook Pro 14 M4",
      "MacBook Pro 16 M1",
      "MacBook Pro 16 M2",
      "MacBook Pro 16 M3",
      "Mac mini M2",
      "iMac 24 M3"
    ],
    "lenovo": [
      "ThinkPad X1 Carbon",
      "ThinkPad T14",
      "ThinkPad E14",
      "Legion 5",
      "IdeaPad 3",
      "Yoga Slim 7"
    ],
    "asus": [
      "ROG Zephyrus G14",
      "ROG Strix G15",
      "Vivobook 15",
      "Zenbook 14",
      "TUF Gaming F15"
    ],
    "hp": [
      "Pavilion 15",
      "EliteBook 840",
      "ProBook 450",
      "OMEN 16"
    ],
    "dell": [
      "XPS 13",
      "XPS 15",
      "Inspiron 15",
      "Latitude 5420",
      "Precision 5570"
    ],
    "acer": [
      "Aspire 5",
      "Swift 3",
      "Nitro 5",
      "Predator Helios 300"
    ],
    "msi": [
      "Katana 15",
      "Stealth 14",
      "Raider GE78"
    ]
  },
  "electronics-tablets": {
    "apple": [
      "iPad 9",
      "iPad 10",
      "iPad Air 4",
      "iPad Air 5",
      "iPad Air M2",
      "iPad Pro 11 M1",
      "iPad Pro 11 M2",
      "iPad Pro 11 M4",
      "iPad Pro 12.9 M2",
      "iPad mini 6"
    ],
    "samsung": [
      "Galaxy Tab S7",
      "Galaxy Tab S8",
      "Galaxy Tab S9",
      "Galaxy Tab S9 Ultra",
      "Galaxy Tab A9"
    ],
    "xiaomi": [
      "Xiaomi Pad 5",
      "Xiaomi Pad 6",
      "Redmi Pad"
    ],
    "huawei": [
      "MatePad 11",
      "MatePad Pro 12.6"
    ]
  },
  "electronics-gaming": {
    "sony": [
      "PlayStation 4",
      "PlayStation 4 Pro",
      "PlayStation 5 Digital",
      "PlayStation 5 Disc",
      "PlayStation 5 Slim",
      "PlayStation 5 Pro",
      "PlayStation Portal"
    ],
    "microsoft": [
      "Xbox One",
      "Xbox One S",
      "Xbox One X",
      "Xbox Series S",
      "Xbox Series X"
    ],
    "nintendo": [
      "Nintendo Switch",
      "Nintendo Switch Lite",
      "Nintendo Switch OLED",
      "Nintendo Switch 2"
    ],
    "valve": [
      "Steam Deck LCD",
      "Steam Deck OLED"
    ]
  },
  "electronics-tv-audio": {
    "samsung": [
      "The Frame",
      "Q60",
      "Q70",
      "QN90",
      "S90 OLED"
    ],
    "lg": [
      "OLED C2",
      "OLED C3",
      "OLED C4",
      "OLED G3",
      "QNED80"
    ],
    "sony": [
      "Bravia X80",
      "Bravia X90",
      "Bravia A80",
      "Bravia 7"
    ],
    "xiaomi": [
      "TV A2",
      "TV A Pro",
      "TV S Mini LED"
    ],
    "tcl": [
      "C645",
      "C745",
      "C805",
      "C855"
    ],
    "hisense": [
      "U7K",
      "U8K",
      "A6K"
    ]
  }
} as const;
export const ELECTRONICS_BRAND_LABELS:Readonly<Record<string,string>>={
  "apple": "Apple",
  "samsung": "Samsung",
  "xiaomi": "Xiaomi",
  "google": "Google",
  "honor": "Honor",
  "huawei": "Huawei",
  "oneplus": "OnePlus",
  "realme": "realme",
  "oppo": "OPPO",
  "vivo": "vivo",
  "lenovo": "Lenovo",
  "asus": "ASUS",
  "hp": "HP",
  "dell": "Dell",
  "acer": "Acer",
  "msi": "MSI",
  "sony": "Sony",
  "microsoft": "Microsoft",
  "nintendo": "Nintendo",
  "valve": "Valve",
  "lg": "LG",
  "tcl": "TCL",
  "hisense": "Hisense"
} as const;
export function electronicModelId(brand:string,model:string):string {
  const code=model.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
  if(!code)throw new Error('Invalid electronic model');
  return brand+'/'+code;
}
export function validateElectronicsCatalog() {
  for(const [group,brands] of Object.entries(ELECTRONICS_MODELS)) {
    if(!group.startsWith('electronics-'))throw new Error('Invalid group');
    for(const [brand,models] of Object.entries(brands)) {
      if(!ELECTRONICS_BRAND_LABELS[brand])throw new Error('Unknown brand: '+brand);
      if(new Set(models.map(model=>electronicModelId(brand,model))).size!==models.length)
        throw new Error('Duplicate brand model: '+brand);
    }
  }
}
validateElectronicsCatalog();
