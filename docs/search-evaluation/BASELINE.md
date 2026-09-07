Recorded 2026-09-07, code baseline `00bf60f2ad2c5cf55906259cf61e8b6eba1492d0`.
See README.md for scope and limitations. No production measurements.

# Offline search baseline

Synthetic fixtures; actual ListingsService with in-memory query execution. Not a live PostgreSQL/Meili or UX benchmark.

```json
{
  "development": {
    "queries": 48,
    "ndcg10": 0.6252823692176884,
    "recall20": 0.6428571428571429,
    "emptyResults": 21,
    "forbiddenQueries": 9,
    "negativeFailures": 0
  },
  "holdout": {
    "queries": 12,
    "ndcg10": 0.5833333333333334,
    "recall20": 0.5833333333333334,
    "emptyResults": 5,
    "forbiddenQueries": 5,
    "negativeFailures": 0
  }
}
```

| Query | Expected | Returned top 5 | Forbidden |
|---|---|---|---|
| iphone 14 pro | iphone14 | case14, iphone14, iphone140 | case14, iphone140 |
| айфон 14 pro | iphone14 | case14, iphone14, iphone140 | case14, iphone140 |
| айфно 14 pro | iphone14 | (empty) |  |
| samsung s24 | s24 | s24, s240 | s240 |
| самсунг s24 | s24 | s24, s240 | s240 |
| samsun s24 | s24 | s24, s240 | s240 |
| sony ps5 | ps5 | ps5, ps50 | ps50 |
| пс5 | ps5 | ps5, ps50 | ps50 |
| soni ps5 | ps5 | (empty) |  |
| macbook air m2 | macbook | macbook, m20 | m20 |
| макбук air m2 | macbook | macbook, m20 | m20 |
| macbok air m2 | macbook | (empty) |  |
| ipda air | ipad | (empty) |  |
| веласипед stels | bike | (empty) |  |
| диван для маленькой комнаты | sofa | (empty) |  |
| деван | sofa | (empty) |  |
| экскаватор в аренду | excavator | (empty) |  |
| аренда экскаватра | excavator | (empty) |  |
| двухкомнатная квартира | flat | (empty) |  |
| продажа квартры | flat | (empty) |  |
| шуруповёрт makita | drill | (empty) |  |
| makta ddf484 | drill | (empty) |  |
| каляска прогулочная | stroller | (empty) |  |
| yamha f310 | guitar | (empty) |  |
| canon r6 | camera | camera, r60 | r60 |
| фотоаппарат canon | camera | camera, r60 | r60 |
| cannon r6 | camera | (empty) |  |
| автокран 80 | crane | crane, crane800 | crane800 |
| кран 80 тонн | crane | crane, crane800 | crane800 |
| автокарн 80 | crane | (empty) |  |
| шины 205 55 r16 | tyres | tyres, r160 | r160 |
| зимняя резина 205 55 r16 | tyres | (empty) |  |
| шыны 205 55 r16 | tyres | (empty) |  |
| ninebt g30 | scooter | (empty) |  |
